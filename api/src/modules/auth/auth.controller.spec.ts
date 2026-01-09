import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';
import { Request } from 'express';
import { JwtAuthGuard, RecaptchaGuard } from './guards';
import { TwoFactorAuthService } from './two-factor-auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  // let service: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    verifyEmail: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
  };

  const mockTwoFactorAuthService = {
    generateSecret: jest.fn(),
    verifyAndEnable: jest.fn(),
    disable: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: TwoFactorAuthService,
          useValue: mockTwoFactorAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RecaptchaGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const dto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
      };
      // AuthResponseDto structure
      const result = {
        user: {
          id: '1',
          email: dto.email,
          username: dto.username,
          state: 'ACTIVE',
          emailVerified: false,
          isSeller: false,
          createdAt: new Date(),
        },
        tokens: {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresIn: 3600,
        },
      };

      mockAuthService.register.mockResolvedValue(result);

      expect(await controller.register(dto)).toBe(result);
      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should login a user', async () => {
      const dto: LoginDto = { email: 'test@example.com', password: 'password123' };
      const req = {
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'Jest',
        },
        socket: {
          remoteAddress: '127.0.0.1',
        },
      } as unknown as Request;

      // AuthResponseDto structure
      const result = {
        user: {
          id: '1',
          email: dto.email,
          username: 'testuser',
          state: 'ACTIVE',
          emailVerified: true,
          isSeller: false,
          createdAt: new Date(),
        },
        tokens: {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresIn: 3600,
        },
      };

      mockAuthService.login.mockResolvedValue(result);

      expect(await controller.login(dto, req)).toBe(result);
      expect(mockAuthService.login).toHaveBeenCalledWith(dto, '127.0.0.1', 'Jest');
    });
  });
});
