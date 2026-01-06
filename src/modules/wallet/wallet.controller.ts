import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DepositDto, WithdrawDto } from './dto/wallet.dto';
import { PrismaService } from '../../database/prisma.service';

interface AuthenticatedRequest {
  user: {
    id: string;
  };
}

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get current wallet balance' })
  async getBalance(@Request() req: AuthenticatedRequest): Promise<any> {
    return this.walletService.getBalance(req.user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get wallet transaction history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getHistory(
    @Request() req: AuthenticatedRequest,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<any> {
    const wallet = await this.walletService.getWallet(req.user.id);

    // Quick access via Prisma directly for list queries (Service handles complex writes)
    const history = await this.prisma.ledger.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: limit || 20,
    });

    return {
      walletId: wallet.id,
      count: history.length,
      history,
    };
  }

  @Post('deposit')
  @ApiOperation({ summary: 'Deposit funds' })
  async deposit(@Request() req: AuthenticatedRequest, @Body() dto: DepositDto): Promise<any> {
    return this.walletService.deposit(req.user.id, dto.amount, dto.referenceId);
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Withdraw funds' })
  async withdraw(@Request() req: AuthenticatedRequest, @Body() dto: WithdrawDto): Promise<any> {
    return this.walletService.withdraw(req.user.id, dto.amount, dto.referenceId);
  }
}
