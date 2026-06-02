import {
  Controller,
  Get,
  Patch,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';
import { Public } from '../auth/decorators';

@ApiTags('admin')
@ApiSecurity('x-admin-key')
@UseGuards(AdminApiKeyGuard)
@Public()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Dashboard statistics' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'List users' })
  getUsers(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('q') q?: string,
  ) {
    return this.adminService.getUsers(page, limit, q);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user state' })
  updateUser(@Param('id') id: string, @Body() data: { state?: string; isSeller?: boolean }) {
    return this.adminService.updateUser(id, data);
  }

  @Get('auctions')
  @ApiOperation({ summary: 'List auctions' })
  getAuctions(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAuctions(page, 20, status);
  }

  @Patch('auctions/:id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel auction' })
  cancelAuction(@Param('id') id: string) {
    return this.adminService.cancelAuction(id);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List orders' })
  getOrders(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('status') status?: string,
  ) {
    return this.adminService.getOrders(page, 20, status);
  }

  @Get('payments')
  @ApiOperation({ summary: 'List payments' })
  getPayments(@Query('page', new ParseIntPipe({ optional: true })) page = 1) {
    return this.adminService.getPayments(page);
  }

  @Get('disputes')
  @ApiOperation({ summary: 'List disputes' })
  getDisputes(@Query('page', new ParseIntPipe({ optional: true })) page = 1) {
    return this.adminService.getDisputes(page);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Audit log' })
  getAuditLogs(@Query('page', new ParseIntPipe({ optional: true })) page = 1) {
    return this.adminService.getAuditLogs(page);
  }

  @Get('system/payment-config')
  @ApiOperation({ summary: 'Get payment provider configuration' })
  getPaymentConfig() {
    return this.adminService.getPaymentConfig();
  }

  @Put('system/payment-config')
  @ApiOperation({ summary: 'Update payment provider configuration' })
  updatePaymentConfig(
    @Body() body: { providers: string[]; primaryCardProvider: string },
  ) {
    return this.adminService.updatePaymentConfig(body.providers, body.primaryCardProvider);
  }
}
