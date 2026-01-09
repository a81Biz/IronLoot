import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { TwoFactorAuthService } from './two-factor-auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  AuthResponseDto,
  AuthTokensResponseDto,
  UserResponseDto,
  MessageResponseDto,
} from './dto';
import { Public, CurrentUser, AuthenticatedUser } from './decorators';
import { JwtAuthGuard, RecaptchaGuard } from './guards';
import { Log, AuditedAction } from '../../common/observability/decorators';
import { AuditEventType, EntityType } from '../../common/observability/constants';

const THROTTLE_LIMIT = process.env.NODE_ENV === 'production' ? 5 : 60;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorAuthService: TwoFactorAuthService,
  ) {}

  // ===========================================
  // REGISTER
  // ===========================================

  @Post('register')
  @Public()
  @UseGuards(RecaptchaGuard)
  @Throttle({ default: { limit: THROTTLE_LIMIT, ttl: 60000 } }) // Dynamic limit based on env
  @ApiOperation({
    summary: 'Register new user',
    description:
      'Creates a new user account. Email verification is required to activate the account.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  @Log()
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  // ===========================================
  // LOGIN
  // ===========================================

  @Post('login')
  @Public()
  @Throttle({ default: { limit: THROTTLE_LIMIT, ttl: 60000 } }) // Dynamic limit based on env
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticates user and returns JWT tokens. The access token contains the full user profile (UserResponseDto structure).',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account not verified, suspended or banned' })
  @Log()
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(dto, ipAddress, userAgent);
  }

  // ===========================================
  // REFRESH TOKEN
  // ===========================================

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Uses refresh token to obtain new access token. The new access token contains the updated full user profile.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: AuthTokensResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokensResponseDto> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  // ===========================================
  // LOGOUT
  // ===========================================

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'User logout',
    description: 'Revokes current session or all sessions',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          description:
            'Optional: specific refresh token to revoke. If not provided, all sessions are revoked.',
        },
      },
    },
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body('refreshToken') refreshToken?: string,
  ): Promise<MessageResponseDto> {
    await this.authService.logout(user.id, refreshToken);
    return { message: 'Logged out successfully' };
  }

  // ===========================================
  // VERIFY EMAIL
  // ===========================================

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email address',
    description: 'Verifies user email using the token sent via email',
  })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<UserResponseDto> {
    return this.authService.verifyEmail(dto.token);
  }

  // ===========================================
  // FORGOT PASSWORD
  // ===========================================

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Sends password reset email if user exists. Always returns success to prevent email enumeration.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'If email exists, reset instructions have been sent',
    type: MessageResponseDto,
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    await this.authService.forgotPassword(dto.email);
    return { message: 'If the email exists, reset instructions have been sent' };
  }

  // ===========================================
  // RESET PASSWORD
  // ===========================================

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password',
    description: 'Resets password using the token sent via email. All sessions are revoked.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponseDto> {
    await this.authService.resetPassword(dto.token, dto.password);
    return { message: 'Password reset successfully. Please login with your new password.' };
  }

  // ===========================================
  // CHANGE PASSWORD
  // ===========================================

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change password',
    description: 'Changes password for authenticated user',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid current password' })
  @AuditedAction(AuditEventType.USER_PASSWORD_CHANGED, EntityType.USER, (args) => args[0].id)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<MessageResponseDto> {
    await this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
    return { message: 'Password changed successfully' };
  }

  // ===========================================
  // GET CURRENT USER
  // ===========================================

  // ===========================================
  // 2FA
  // ===========================================

  @Post('2fa/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate 2FA secret and QR code' })
  @ApiResponse({ status: 200, description: 'QR code URL generated' })
  async generateTwoFactorSecret(@CurrentUser() user: AuthenticatedUser) {
    const { qrCodeUrl } = await this.twoFactorAuthService.generateSecret(user.id, user.email);
    return { qrCodeUrl };
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify and enable 2FA' })
  @ApiBody({
    schema: { type: 'object', properties: { token: { type: 'string' } }, required: ['token'] },
  })
  @ApiResponse({ status: 200, description: '2FA enabled successfully' })
  async enableTwoFactorAuth(@CurrentUser() user: AuthenticatedUser, @Body('token') token: string) {
    const verified = await this.twoFactorAuthService.verifyAndEnable(user.id, token);
    if (!verified) {
      throw new BadRequestException('Invalid token');
    }
    return { message: '2FA enabled successfully' };
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiBody({
    schema: { type: 'object', properties: { token: { type: 'string' } }, required: ['token'] },
  })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  async disableTwoFactorAuth(@CurrentUser() user: AuthenticatedUser, @Body('token') token: string) {
    const disabled = await this.twoFactorAuthService.disable(user.id, token);
    if (!disabled) {
      throw new BadRequestException('Invalid token');
    }
    return { message: '2FA disabled successfully' };
  }

  // ===========================================
  // GET CURRENT USER
  // ===========================================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get current user',
    description: 'Returns current authenticated user info',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user info',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.authService.getMe(user.id);
  }
}
