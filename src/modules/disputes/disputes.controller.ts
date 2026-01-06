import { Controller, Get, Post, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards';
import { CurrentUser, AuthenticatedUser } from '../../modules/auth/decorators';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto';
import { Dispute } from '@prisma/client';
import { Log, AuditedAction } from '../../common/observability/decorators';
import { AuditEventType, EntityType } from '../../common/observability/constants';

@ApiTags('disputes')
@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new dispute' })
  @ApiResponse({ status: 201, description: 'Dispute created successfully' })
  @AuditedAction(AuditEventType.DISPUTE_OPENED, EntityType.DISPUTE, (args, result) => result.id, [
    'reason',
  ])
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDisputeDto): Promise<Dispute> {
    return this.disputesService.create(user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List my disputes' })
  @ApiResponse({ status: 200, description: 'List of disputes' })
  @Log()
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<Dispute[]> {
    return this.disputesService.findAllByUser(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get details of a dispute' })
  @ApiResponse({ status: 200, description: 'Dispute details' })
  @Log()
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Dispute> {
    return this.disputesService.findOne(user.id, id);
  }
}
