import { Controller, Get, Put, Post, Delete, Body, Param, Query, UseGuards, Req, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Users')
@Controller({ path: 'users', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me') getProfile(@Req() req: any) { return this.usersService.getProfile(req.user.id); }
  @Put('me') updateProfile(@Req() req: any, @Body() dto: any) { return this.usersService.updateProfile(req.user.id, dto); }
  @Put('me/fcm-token') updateFcm(@Req() req: any, @Body('fcmToken') t: string) { return this.usersService.updateFcmToken(req.user.id, t); }

  @Get('me/addresses') getAddresses(@Req() req: any) { return this.usersService.getAddresses(req.user.id); }
  @Post('me/addresses') addAddress(@Req() req: any, @Body() dto: any) { return this.usersService.addAddress(req.user.id, dto); }
  @Put('me/addresses/:id') updateAddress(@Req() req: any, @Param('id') id: string, @Body() dto: any) { return this.usersService.updateAddress(req.user.id, id, dto); }
  @Delete('me/addresses/:id') deleteAddress(@Req() req: any, @Param('id') id: string) { return this.usersService.deleteAddress(req.user.id, id); }

  @Get()
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  getAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) { return this.usersService.getAllUsers(page, limit, role, search); }

  @Post()
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  create(@Body() dto: any) {
    return this.usersService.createUser(dto);
  }

  @Put(':id/status')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  updateStatus(@Param('id') id: string, @Body('status') status: UserStatus) {
    return this.usersService.updateUserStatus(id, status);
  }
}
