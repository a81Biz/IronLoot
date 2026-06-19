import { Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AdminAuthGuard } from '../../auth/auth.guard';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users')
  @UseGuards(AdminAuthGuard)
  async users(
    @Req() req,
    @Res() res,
    @Query('page') page = '1',
    @Query('q') q?: string,
  ) {
    const result = await this.usersService.getUsers(Number(page), 20, q);
    return res.render('pages/users', {
      title: 'Usuarios',
      result,
      q,
      adminUser: req.session.adminUser,
      activePage: 'users',
    });
  }

  @Get('users/:id')
  @UseGuards(AdminAuthGuard)
  async userDetail(@Param('id') id: string, @Req() req, @Res() res) {
    const user = await this.usersService.getUser(id);
    return res.render('pages/user-detail', {
      title: 'Detalle de usuario',
      user,
      adminUser: req.session.adminUser,
      activePage: 'users',
    });
  }

  @Post('users/:id/suspend')
  @UseGuards(AdminAuthGuard)
  async suspendUser(@Param('id') id: string, @Req() req, @Res() res) {
    await this.usersService.updateUser(id, { state: 'SUSPENDED' });
    return res.redirect(`/users/${id}`);
  }

  @Post('users/:id/ban')
  @UseGuards(AdminAuthGuard)
  async banUser(@Param('id') id: string, @Req() req, @Res() res) {
    await this.usersService.updateUser(id, { state: 'BANNED' });
    return res.redirect('/users');
  }

  @Post('users/:id/unban')
  @UseGuards(AdminAuthGuard)
  async unbanUser(@Param('id') id: string, @Req() req, @Res() res) {
    await this.usersService.updateUser(id, { state: 'ACTIVE' });
    return res.redirect('/users');
  }

  @Post('users/:id/enable-seller')
  @UseGuards(AdminAuthGuard)
  async enableSeller(@Param('id') id: string, @Req() req, @Res() res) {
    await this.usersService.updateUser(id, { isSeller: true });
    return res.redirect(`/users/${id}`);
  }

  @Post('users/:id/disable-seller')
  @UseGuards(AdminAuthGuard)
  async disableSeller(@Param('id') id: string, @Req() req, @Res() res) {
    await this.usersService.updateUser(id, { isSeller: false });
    return res.redirect(`/users/${id}`);
  }
}
