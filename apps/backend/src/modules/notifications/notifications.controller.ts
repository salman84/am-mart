import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Notifications')
@Controller({ path: 'notifications', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  getMyNotifications(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.notificationsService.getUserNotifications(req.user.id, page, limit);
  }

  @Post('read-all')
  markAllRead(@Req() req: any) {
    return this.notificationsService.markRead(req.user.id);
  }

  @Post(':id/read')
  markOneRead(@Req() req: any, @Param('id') id: string) {
    return this.notificationsService.markRead(req.user.id, id);
  }

  @Post('send-all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: '[Admin] Send notification to all users' })
  sendToAll(@Body() body: { title: string; body: string; data?: any }) {
    return this.notificationsService.sendPushToRole('CUSTOMER' as any, body);
  }

  @Post('send-role')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: '[Admin] Send notification to a specific role' })
  sendToRole(@Body() body: { role: string; title: string; body: string; data?: any }) {
    return this.notificationsService.sendPushToRole(body.role as any, {
      title: body.title,
      body: body.body,
      data: body.data,
    });
  }

  @Post('send-user')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: '[Admin] Send notification to a specific user' })
  sendToUser(@Body() body: { userId: string; title: string; body: string; data?: any }) {
    return this.notificationsService.sendPushToUser(body.userId, {
      title: body.title,
      body: body.body,
      data: body.data,
    });
  }
}
