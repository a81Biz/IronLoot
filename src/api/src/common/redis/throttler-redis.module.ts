import { Injectable, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { redisUrlObligatoria } from '../config/redis-url';

/**
 * PT-128 (PTSA H-015) — El cliente Redis del limitador de peticiones, con ciclo de vida.
 *
 * Antes se creaba **suelto**, dentro de la fabrica de `ThrottlerModule.forRootAsync`:
 *
 *     storage: new ThrottlerStorageRedisService(new Redis({ ... }))
 *
 * Nest no conoce ese objeto, asi que `app.close()` no lo cierra. El socket de ioredis y su
 * temporizador de reconexion sobreviven al cierre de la aplicacion, y el proceso no termina.
 *
 * Esa era una de las dos razones por las que la suite e2e no salia sin `--forceExit`, y por las
 * que el job «Integration Tests» no podia terminar en verde (H-015). La otra era la misma fuga en
 * `DistributedLockService`.
 *
 * **No es solo cosa de tests.** En un apagado ordenado —SIGTERM a un contenedor— esta conexion
 * tampoco se cerraba: `app.close()` no liberaba todo lo que decia liberar.
 *
 * Envolverlo en un servicio inyectable es lo que le da a Nest el gancho que necesita.
 */
@Injectable()
export class ThrottlerRedisService implements OnModuleDestroy {
  private readonly logger = new Logger(ThrottlerRedisService.name);
  readonly client: Redis;

  constructor(config: ConfigService) {
    // PT-137 — Mismo defecto que las colas: reserva a `localhost`. Aqui el precio de fallar en
    // silencio es mayor, porque este cliente sostiene el rate limiting de los endpoints de
    // autenticacion: apuntando a ninguna parte, la defensa desaparece sin que nada lo diga.
    this.client = new Redis(redisUrlObligatoria(config.get<string>('REDIS_URL')));
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch (e) {
      // `quit()` puede fallar si la conexion ya cayo. Se fuerza el cierre y NO se propaga: un
      // fallo al cerrar no debe impedir el apagado.
      //
      // Pero se registra. La primera version de esto era un `catch` mudo, y el checkpoint D3
      // (`audit:observability`) lo canto en el acto: 27 silencios contra una linea base de 25.
      // Un cierre que falla en silencio es como se pierde un diagnostico de apagado.
      this.logger.warn(
        `No se pudo cerrar limpiamente la conexion Redis del limitador: ${(e as Error).message}. ` +
          'Se fuerza la desconexion.',
      );
      this.client.disconnect();
    }
  }
}

@Module({
  imports: [ConfigModule],
  providers: [ThrottlerRedisService],
  exports: [ThrottlerRedisService],
})
export class ThrottlerRedisModule {}
