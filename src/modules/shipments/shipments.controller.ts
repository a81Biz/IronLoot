import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Shipment } from '@prisma/client';
import { JwtAuthGuard } from '../../modules/auth/guards'; // Adjust path if needed
import { CurrentUser, AuthenticatedUser } from '../../modules/auth/decorators'; // Adjust path if needed
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto, UpdateShipmentStatusDto } from './dto';

@ApiTags('shipments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a shipment for an order' })
  @ApiResponse({ status: 201, description: 'Shipment created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or order not paid' })
  @ApiResponse({ status: 403, description: 'Only seller can create shipment' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateShipmentDto,
  ): Promise<Shipment> {
    return this.shipmentsService.create(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shipment details' })
  @ApiResponse({ status: 200, description: 'Return shipment details' })
  @ApiResponse({ status: 403, description: 'Unauthorized access' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Shipment> {
    return this.shipmentsService.findOne(user.id, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update shipment status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 403, description: 'Only seller can update status' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShipmentStatusDto,
  ): Promise<Shipment> {
    return this.shipmentsService.updateStatus(user.id, id, dto);
  }
}
