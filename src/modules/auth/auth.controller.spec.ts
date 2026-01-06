import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';
import { Request } from 'express';
import { JwtAuthGuard } from './guards';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    // service = module.get<AuthService>(AuthService);
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
        // firstName: 'Test', // Removed as per DTO definition
        // lastName: 'User', // Removed as per DTO definition
      };
      const result = { message: 'User registered successfully' };

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

      const result = { accessToken: 'token', refreshToken: 'refresh' };

      mockAuthService.login.mockResolvedValue(result);

      expect(await controller.login(dto, req)).toBe(result);
      expect(mockAuthService.login).toHaveBeenCalledWith(dto, '127.0.0.1', 'Jest');
    });
  });
});
