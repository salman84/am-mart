import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RidersService } from './riders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Riders')
@Controller({ path: 'riders', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RidersController {
  constructor(private ridersService: RidersService) {}

  @Post('register') register(@Req() req: any, @Body() dto: any) { return this.ridersService.registerAsRider(req.user.id, dto); }

  @Get('profile')
  @UseGuards(RolesGuard) @Roles('RIDER', 'ADMIN', 'SUPER_ADMIN')
  getProfile(@Req() req: any) { return this.ridersService.getRiderProfile(req.user.id); }

  @Put('online-status')
  @UseGuards(RolesGuard) @Roles('RIDER', 'ADMIN', 'SUPER_ADMIN')
  updateOnlineStatus(@Req() req: any, @Body('isOnline') isOnline: boolean, @Body('lat') lat?: number, @Body('lng') lng?: number) {
    return this.ridersService.updateOnlineStatus(req.user.id, isOnline, lat, lng);
  }

  @Put('fcm-token')
  @UseGuards(RolesGuard) @Roles('RIDER', 'ADMIN', 'SUPER_ADMIN')
  updateFcmToken(@Req() req: any, @Body('fcmToken') fcmToken: string) {
    return this.ridersService.updateFcmToken(req.user.id, fcmToken);
  }

  @Get()
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  getAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) { return this.ridersService.getAllRiders(page, limit, status); }
}
