import { Test, TestingModule } from '@nestjs/testing';
import { DistributedLockService } from './distributed-lock.service';

// Mock Redis client — match the named export pattern used in the service
jest.mock('ioredis', () => ({
  Redis: jest.fn(() => ({
    set: jest.fn(),
    eval: jest.fn(),
    exists: jest.fn(),
  })),
}));

describe('DistributedLockService', () => {
  let service: DistributedLockService;
  let mockRedis: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DistributedLockService],
    }).compile();

    service = module.get<DistributedLockService>(DistributedLockService);

    // Access the mocked Redis instance
    mockRedis = (service as any).redis;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('acquireLock', () => {
    it('should acquire lock successfully when key does not exist', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const lockValue = await service.acquireLock('test-lock', 30);

      expect(lockValue).not.toBeNull();
      expect(typeof lockValue).toBe('string');
      expect(mockRedis.set).toHaveBeenCalledWith('test-lock', lockValue, 'EX', 30, 'NX');
    });

    it('should return null when lock is already held', async () => {
      mockRedis.set.mockResolvedValue(null);

      const lockValue = await service.acquireLock('test-lock', 30);

      expect(lockValue).toBeNull();
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should throw error on Redis failure', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis connection failed'));

      await expect(service.acquireLock('test-lock', 30)).rejects.toThrow('Redis connection failed');
    });
  });

  describe('releaseLock', () => {
    it('should release lock successfully with correct lock value', async () => {
      mockRedis.eval.mockResolvedValue(1);

      const released = await service.releaseLock('test-lock', 'valid-uuid');

      expect(released).toBe(true);
      expect(mockRedis.eval).toHaveBeenCalled();
    });

    it('should return false when lock value does not match', async () => {
      mockRedis.eval.mockResolvedValue(0);

      const released = await service.releaseLock('test-lock', 'wrong-uuid');

      expect(released).toBe(false);
    });

    it('should throw error on Redis failure', async () => {
      mockRedis.eval.mockRejectedValue(new Error('Redis Lua script failed'));

      await expect(service.releaseLock('test-lock', 'uuid')).rejects.toThrow(
        'Redis Lua script failed',
      );
    });
  });

  describe('isLocked', () => {
    it('should return true when lock exists', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const locked = await service.isLocked('test-lock');

      expect(locked).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('test-lock');
    });

    it('should return false when lock does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const locked = await service.isLocked('test-lock');

      expect(locked).toBe(false);
    });

    it('should return false on Redis failure', async () => {
      mockRedis.exists.mockRejectedValue(new Error('Redis connection failed'));

      const locked = await service.isLocked('test-lock');

      expect(locked).toBe(false);
    });
  });

  describe('distributed lock behavior', () => {
    it('should acquire and release lock in sequence', async () => {
      // Acquire lock
      mockRedis.set.mockResolvedValue('OK');
      const lockValue = await service.acquireLock('seq-lock', 30);
      expect(lockValue).not.toBeNull();

      // Release lock
      mockRedis.eval.mockResolvedValue(1);
      const released = await service.releaseLock('seq-lock', lockValue!);
      expect(released).toBe(true);

      // Try to acquire again (should succeed on fresh instance)
      mockRedis.set.mockResolvedValue('OK');
      const lockValue2 = await service.acquireLock('seq-lock', 30);
      expect(lockValue2).not.toBeNull();
      expect(lockValue2).not.toEqual(lockValue); // Different UUIDs
    });

    it('should prevent acquisition while lock is held', async () => {
      // First instance acquires
      mockRedis.set.mockResolvedValue('OK');
      const lockValue = await service.acquireLock('contention-lock', 30);

      // Second instance tries to acquire (fails)
      mockRedis.set.mockResolvedValue(null);
      const lockValue2 = await service.acquireLock('contention-lock', 30);

      expect(lockValue).not.toBeNull();
      expect(lockValue2).toBeNull();
    });
  });
});
