import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserState } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from '@modules/auth/auth.service';
import { PrismaService } from '@/database/prisma.service';
import {
  StructuredLogger,
  RequestContextService,
  MetricsService,
  InvalidCredentialsException,
  EmailAlreadyExistsException,
} from '@common/observability';
import { AuditPersistenceService } from '@modules/audit/audit-persistence.service';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: '$2b$12$hashedpassword',
    displayName: 'Test User',
    avatarUrl: null,
    state: UserState.ACTIVE,
    isSeller: false,
    sellerEnabledAt: null,
    suspendedReason: null,
    bannedReason: null,
    emailVerifiedAt: new Date(),
    emailVerificationToken: null,
    emailVerificationExpiresAt: null,
    passwordResetToken: null,
    passwordResetExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLogger = {
    child: jest.fn().mockReturnThis(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  const mockCtx = {
    getTraceId: jest.fn().mockReturnValue('trace-123'),
    setUser: jest.fn(),
  };

  const mockMetrics = {
    increment: jest.fn(),
  };

  const mockAudit = {
    recordAudit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            session: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                JWT_ACCESS_EXPIRY: '15m',
                JWT_REFRESH_EXPIRY: '7d',
                JWT_SECRET: 'test-secret',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: StructuredLogger,
          useValue: mockLogger,
        },
        {
          provide: RequestContextService,
          useValue: mockCtx,
        },
        {
          provide: MetricsService,
          useValue: mockMetrics,
        },
        {
          provide: AuditPersistenceService,
          useValue: mockAudit,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      username: 'newuser',
      password: 'Password123!',
      displayName: 'New User',
    };

    it('should register a new user successfully', async () => {
      const newUser = {
        ...mockUser,
        id: 'new-user-id',
        email: registerDto.email,
        username: registerDto.username,
        state: UserState.PENDING_VERIFICATION,
      };

      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce(null); // username check
      (prismaService.user.create as jest.Mock).mockResolvedValue(newUser);
      (prismaService.session.create as jest.Mock).mockResolvedValue({
        id: 'session-id',
        refreshToken: 'refresh-token',
      });

      const result = await service.register(registerDto);

      expect(result.user.email).toBe(registerDto.email);
      expect(result.user.username).toBe(registerDto.username);
      expect(result.tokens.accessToken).toBeDefined();
      expect(prismaService.user.create).toHaveBeenCalled();
    });

    it('should throw EmailAlreadyExistsException if email exists', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(EmailAlreadyExistsException);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should login successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash(loginDto.password, 12);
      const userWithHash = { ...mockUser, passwordHash: hashedPassword };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(userWithHash);
      (prismaService.session.create as jest.Mock).mockResolvedValue({
        id: 'session-id',
        refreshToken: 'refresh-token',
      });

      const result = await service.login(loginDto);

      expect(result.user.email).toBe(loginDto.email);
      expect(result.tokens.accessToken).toBeDefined();
    });

    it('should throw InvalidCredentialsException if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(InvalidCredentialsException);
    });

    it('should throw InvalidCredentialsException if password is wrong', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(InvalidCredentialsException);
    });
  });

  describe('validateUser', () => {
    it('should return user for valid payload', async () => {
      const payload = {
        sub: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        state: mockUser.state,
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.validateUser(payload);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        state: mockUser.state,
      });
    });

    it('should return null for banned user', async () => {
      const payload = {
        sub: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        state: UserState.BANNED,
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        state: UserState.BANNED,
      });

      const result = await service.validateUser(payload);

      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('should revoke specific session when refreshToken provided', async () => {
      (prismaService.session.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.logout(mockUser.id, 'refresh-token');

      expect(prismaService.session.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id, refreshToken: 'refresh-token' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should revoke all sessions when no refreshToken provided', async () => {
      (prismaService.session.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      await service.logout(mockUser.id);

      expect(prismaService.session.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
