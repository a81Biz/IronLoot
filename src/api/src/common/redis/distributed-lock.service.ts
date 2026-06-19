import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { v4 as uuid } from 'uuid';

@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);
  private redis: Redis;

  constructor() {
    // Initialize Redis client (should be injected in real implementation)
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
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
