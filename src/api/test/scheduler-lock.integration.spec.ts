import { DistributedLockService } from '../src/common/redis/distributed-lock.service';
import Redis from 'ioredis';

/**
 * Integration test: Verify that in a multi-instance deployment,
 * only one instance executes a critical cron job per interval.
 *
 * Test strategy:
 * - Simulate two instances acquiring locks in parallel
 * - Verify only one succeeds
 * - Verify lock release allows next execution
 * - Verify lock expiry allows recovery
 */
describe('Scheduler Distributed Lock (Integration)', () => {
  let lockService1: DistributedLockService;
  let lockService2: DistributedLockService;
  let redis: Redis;

  beforeAll(async () => {
    // Initialize real Redis connection (requires Redis running on localhost:6379)
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 1, // Use separate DB for tests
    });

    // Verify Redis connectivity
    try {
      await redis.ping();
    } catch (error) {
      console.warn('Redis not available for integration tests, skipping...');
      return;
    }

    // Create two lock service instances (simulating two API instances)
    lockService1 = new DistributedLockService();
    lockService2 = new DistributedLockService();
  });

  afterAll(async () => {
    // Cleanup
    if (redis) {
      await redis.del('lock:auction-close');
      await redis.quit();
    }
  });

  afterEach(async () => {
    // Clean locks between tests
    if (redis) {
      await redis.del('lock:auction-close');
    }
  });

  it('should allow only one instance to acquire lock concurrently', async () => {
    const lockKey = 'lock:auction-close';

    // Instance 1 acquires lock
    const lock1 = await lockService1.acquireLock(lockKey, 10);
    expect(lock1).not.toBeNull();

    // Instance 2 tries to acquire same lock (should fail)
    const lock2 = await lockService2.acquireLock(lockKey, 10);
    expect(lock2).toBeNull();

    // Instance 1 can release successfully
    const released = await lockService1.releaseLock(lockKey, lock1!);
    expect(released).toBe(true);

    // Now Instance 2 can acquire
    const lock2Retry = await lockService2.acquireLock(lockKey, 10);
    expect(lock2Retry).not.toBeNull();
  });

  it('should prevent cross-instance lock release with wrong lock value', async () => {
    const lockKey = 'lock:auction-close';

    // Instance 1 acquires
    const lock1 = await lockService1.acquireLock(lockKey, 10);

    // Instance 2 tries to release with wrong value
    const released = await lockService2.releaseLock(lockKey, 'wrong-uuid');
    expect(released).toBe(false);

    // Lock should still be held by Instance 1
    const isLocked = await lockService1.isLocked(lockKey);
    expect(isLocked).toBe(true);

    // Instance 1 can still release with correct value
    const correctRelease = await lockService1.releaseLock(lockKey, lock1!);
    expect(correctRelease).toBe(true);
  });

  it('should detect stale lock after TTL expiry', async () => {
    const lockKey = 'lock:auction-close';
    const shortTtl = 1; // 1 second TTL

    // Instance 1 acquires with short TTL
    const lock1 = await lockService1.acquireLock(lockKey, shortTtl);
    expect(lock1).not.toBeNull();

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Instance 2 should now be able to acquire (lock expired)
    const lock2 = await lockService2.acquireLock(lockKey, 10);
    expect(lock2).not.toBeNull();

    // Lock is now held by Instance 2, Instance 1 cannot release
    const released = await lockService1.releaseLock(lockKey, lock1!);
    expect(released).toBe(false); // Value mismatch (lock reacquired)
  });

  it('should support parallel lock acquisition attempts', async () => {
    const lockKey = 'lock:auction-close';
    const results: (string | null)[] = [];

    // Simulate 3 instances trying to acquire simultaneously
    const attempts = [
      lockService1.acquireLock(lockKey, 10),
      lockService2.acquireLock(lockKey, 10),
      // Third instance (reusing lockService1 to avoid too many instances)
      lockService1.acquireLock(lockKey, 10),
    ];

    const acquireResults = await Promise.all(attempts);
    results.push(...acquireResults);

    // Exactly one should succeed
    const successCount = results.filter((r) => r !== null).length;
    expect(successCount).toBe(1);

    // Two should fail
    const failCount = results.filter((r) => r === null).length;
    expect(failCount).toBe(2);
  });

  it('should maintain lock across multiple cron cycles', async () => {
    const lockKey = 'lock:auction-close';
    const cycleDuration = 60; // Simulate 60-second cron cycle

    // Cycle 1: Instance 1 acquires and processes
    const lock1Cycle1 = await lockService1.acquireLock(lockKey, cycleDuration);
    expect(lock1Cycle1).not.toBeNull();

    // Instance 2 cannot acquire during processing
    const lock2Cycle1 = await lockService2.acquireLock(lockKey, cycleDuration);
    expect(lock2Cycle1).toBeNull();

    // Instance 1 releases after processing
    const released1 = await lockService1.releaseLock(lockKey, lock1Cycle1!);
    expect(released1).toBe(true);

    // Cycle 2: Instance 2 can now acquire
    const lock2Cycle2 = await lockService2.acquireLock(lockKey, cycleDuration);
    expect(lock2Cycle2).not.toBeNull();

    // Instance 1 cannot acquire (Instance 2 processing)
    const lock1Cycle2 = await lockService1.acquireLock(lockKey, cycleDuration);
    expect(lock1Cycle2).toBeNull();

    // Cleanup
    await lockService2.releaseLock(lockKey, lock2Cycle2!);
  });

  describe('lock contention under load', () => {
    it('should handle rapid acquisition/release cycles', async () => {
      const lockKey = 'lock:contention-test';
      const cycles = 5;

      for (let i = 0; i < cycles; i++) {
        const lock1 = await lockService1.acquireLock(lockKey, 5);
        expect(lock1).not.toBeNull();

        // Brief processing simulation
        await new Promise((resolve) => setTimeout(resolve, 100));

        const released = await lockService1.releaseLock(lockKey, lock1!);
        expect(released).toBe(true);
      }
    });

    it('should log lock operations appropriately', async () => {
      const lockKey = 'lock:logging-test';

      // These should log without errors
      const lock = await lockService1.acquireLock(lockKey, 5);
      expect(lock).not.toBeNull();

      const released = await lockService1.releaseLock(lockKey, lock!);
      expect(released).toBe(true);

      const isLocked = await lockService1.isLocked(lockKey);
      expect(isLocked).toBe(false);
    });
  });
});
