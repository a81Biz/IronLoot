import { Controller, Get, Render, UseGuards, Param, ParseUUIDPipe } from '@nestjs/common';
import { RequireAuth } from '../../common/guards/require-auth.guard';

@Controller('disputes')
@UseGuards(RequireAuth)
export class DisputesPageController {
  @Get()
  @Render('pages/disputes/list')
  disputesList() {
    return { title: 'Disputas' };
  }

  @Get('new')
  @Render('pages/disputes/create')
  createDispute() {
    return { title: 'Nueva Disputa' };
  }

  @Get(':id')
  @Render('pages/disputes/detail')
  disputeDetail(@Param('id', ParseUUIDPipe) id: string) {
    return { title: 'Detalle de Disputa' };
  }
}
