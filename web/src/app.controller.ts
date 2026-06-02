import { Controller, Get, Render, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { RequireAuth } from './common/guards/require-auth.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Render('pages/home')
  root() {
    return { message: 'Welcome to Iron Loot' };
  }

  @Get('dashboard')
  @UseGuards(RequireAuth)
  @Render('pages/dashboard')
  dashboard() {
    return { title: 'Dashboard' };
  }

  @Get('profile')
  @UseGuards(RequireAuth)
  @Render('pages/profile')
  profile() {
    return { title: 'Mi Perfil' };
  }

  @Get('my-bids')
  @UseGuards(RequireAuth)
  @Render('pages/bids/my')
  myBids() {
    return { title: 'Mis Pujas' };
  }

  @Get('notifications')
  @UseGuards(RequireAuth)
  @Render('pages/notifications/list')
  notifications() {
    return { title: 'Notificaciones' };
  }

  @Get('payments')
  @UseGuards(RequireAuth)
  @Render('pages/payments')
  payments() {
    return { title: 'Mis Pagos' };
  }

  @Get('reputation')
  @UseGuards(RequireAuth)
  @Render('pages/reputation')
  reputation() {
    return { title: 'Mi Reputación' };
  }

  @Get('settings')
  @UseGuards(RequireAuth)
  @Render('pages/settings')
  settings() {
    return { title: 'Configuración' };
  }

  @Get('about')
  @Render('pages/static/about')
  about() {
    return { title: 'Sobre Nosotros' };
  }

  @Get('terms')
  @Render('pages/static/terms')
  terms() {
    return { title: 'Términos y Condiciones' };
  }

  @Get('privacy')
  @Render('pages/static/privacy')
  privacy() {
    return { title: 'Política de Privacidad' };
  }
}
