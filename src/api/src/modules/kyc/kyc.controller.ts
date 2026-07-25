import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators';
import { KycService } from './kyc.service';

/**
 * PT-069 — Endpoints de KYC de cara al usuario (vendedor).
 * El envío crea una submission PENDING; la aprobación la hace un admin (módulo admin).
 */
@ApiTags('kyc')
@Controller('kyc')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post()
  @ApiOperation({ summary: 'Submit KYC documents (creates a PENDING submission)' })
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Record<string, string>,
  ): Promise<{ id: string; status: string }> {
    const submission = await this.kycService.submit(user.id, body || {});
    return { id: submission.id, status: submission.status };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my latest KYC status' })
  async myStatus(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ status: string | null; approved: boolean }> {
    const status = await this.kycService.getUserKycStatus(user.id);
    return { status, approved: this.kycService.isApproved(status) };
  }
}
