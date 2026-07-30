import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { randomUUID as uuid } from 'node:crypto';
import { redisUrlObligatoria } from '../config/redis-url';

@Injectable()
export class DistributedLockService implements OnModuleDestroy {
  private readonly logger = new Logger(DistributedLockService.name);
  private redis: Redis;

  /**
   * PT-185 (H-035) — **Aquí había la reserva que RULE-17 prohíbe.**
   *
   * ```ts
   * // Initialize Redis client (should be injected in real implementation)
   * const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
   * ```
   *
   * Es literalmente el defecto que PT-137 corrigió: el cliente de al lado —el del rate limiting— lleva escrito
   * *«PT-137 — Mismo defecto que las colas: reserva a `localhost`»*. **Ése se corrigió; éste se quedó**, y
   * sobrevivió a PT-137, a PT-147 y a todas las corridas de la suite porque la guarda de RULE-17 comprobaba que
   * las variables estuvieran **declaradas**, no que no tuvieran **reserva** — que es la mitad que la propia
   * regla llama, en negrita, el problema.
   *
   * Lo que costaba: este servicio es lo que impide que dos instancias procesen el mismo cierre de subasta. Con
   * la reserva puesta, un despliegue sin `REDIS_URL` **arranca** y apunta a un `localhost` que dentro del
   * contenedor no es nadie; `acquireLock` relanza, el cron propaga y **ninguna subasta se cierra** — desde
   * fuera, subastas que nunca terminan.
   *
   * Y el comentario que estaba aquí —*«should be injected in real implementation»*— describía la corrección
   * desde el principio. Ahora está hecha.
   */
  constructor(config: ConfigService) {
    this.redis = new Redis(redisUrlObligatoria(config.get<string>('REDIS_URL')));
  }

  /**
   * PT-128 (PTSA H-015) — Cerrar la conexion al apagar.
   *
   * Sin esto, `app.close()` devuelve pero el socket de ioredis y su temporizador de reconexion
   * siguen vivos: el proceso no termina. Es una de las dos razones por las que la suite e2e no
   * salia sin `--forceExit`, y por las que el job «Integration Tests» no podia terminar en verde.
   *
   * No es solo cosa de tests: en un apagado ordenado (SIGTERM en un contenedor) esta conexion
   * tampoco se cerraba. `app.close()` no liberaba todo lo que decia liberar.
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (e) {
      // `quit()` puede fallar si la conexion ya cayo. Se fuerza el cierre y NO se propaga: un
      // fallo al cerrar no debe impedir el apagado.
      //
      // Pero se registra. La primera version era un `catch` mudo y el checkpoint D3 lo canto en el
      // acto (27 silencios contra una linea base de 25). Un cierre que falla en silencio es como se
      // pierde un diagnostico de apagado.
      this.logger.warn(
        `No se pudo cerrar limpiamente la conexion Redis del cerrojo: ${(e as Error).message}. ` +
          'Se fuerza la desconexion.',
      );
      this.redis.disconnect();
    }
  }

  /**
   * Acquire a distributed lock using Redis SETNX (atomic set-if-not-exists).
   * Returns a unique lock value for safe release.
   *
   * @param key Lock key (e.g., 'lock:auction-close')
   * @param ttlSeconds Time-to-live for the lock (auto-release on expiry)
   * @returns Lock value (UUID) if acquired, null if lock already held
   */
  async acquireLock(key: string, ttlSeconds: number): Promise<string | null> {
    const lockValue = uuid();
    try {
      // Use SET with NX (only if not exists) and EX (expiry)
      // Returns 'OK' if set, null if not set
      const result = await this.redis.set(key, lockValue, 'EX', ttlSeconds, 'NX');

      if (result === 'OK') {
        this.logger.debug(`Lock acquired: ${key} (TTL: ${ttlSeconds}s)`);
        return lockValue;
      } else {
        this.logger.debug(`Lock already held: ${key}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Failed to acquire lock ${key}`, error);
      throw error;
    }
  }

  /**
   * Release a distributed lock safely by comparing lock value.
   * Only deletes the key if the stored value matches the provided lockValue.
   * This prevents accidental release of locks held by other instances.
   *
   * @param key Lock key (e.g., 'lock:auction-close')
   * @param lockValue UUID returned by acquireLock()
   * @returns true if lock was released, false if lock value didn't match
   */
  async releaseLock(key: string, lockValue: string): Promise<boolean> {
    try {
      // Use Lua script for atomic compare-and-delete
      // Prevents race condition where lock expires and another instance acquires it
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.redis.eval(script, 1, key, lockValue);

      if (result === 1) {
        this.logger.debug(`Lock released: ${key}`);
        return true;
      } else {
        this.logger.warn(
          `Lock value mismatch for ${key} - likely expired and reacquired by another instance`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to release lock ${key}`, error);
      throw error;
    }
  }

  /**
   * Check if a lock is currently held (read-only, no side effects).
   * Useful for monitoring and debugging.
   *
   * @param key Lock key
   * @returns true if lock exists, false otherwise
   */
  async isLocked(key: string): Promise<boolean> {
    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      this.logger.error(`Failed to check lock status ${key}`, error);
      return false;
    }
  }
}
