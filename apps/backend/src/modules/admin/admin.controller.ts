import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Admin')
@Controller({ path: 'admin', version: '1' })
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  // Public — mobile app fetches app name/logo without auth
  @Get('public-settings') getPublicSettings() { return this.adminService.getPublicSettings(); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('dashboard') getDashboard() { return this.adminService.getDashboardStats(); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('settings') getSettings() { return this.adminService.getSettings(); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Put('settings') updateSetting(@Body('key') key: string, @Body('value') value: string, @Req() req: any) { return this.adminService.updateSetting(key, value, req.user.id); }

  @Get('logs')
  getLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) { return this.adminService.getActivityLogs(page, limit); }

  @Get('reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getReports(@Query('period') period: string) {
    return this.adminService.getReports((period as any) || 'weekly');
  }

  @Post('backup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  exportBackup() {
    return this.adminService.exportBackup();
  }

  // ─── Delivery Zones ───────────────────────────────────────────────────────

  @Get('delivery-zones')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getDeliveryZones() { return this.adminService.getDeliveryZones(); }

  @Post('delivery-zones')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  createDeliveryZone(@Body() body: any) { return this.adminService.createDeliveryZone(body); }

  @Put('delivery-zones/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateDeliveryZone(@Param('id') id: string, @Body() body: any) { return this.adminService.updateDeliveryZone(id, body); }

  @Delete('delivery-zones/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  deleteDeliveryZone(@Param('id') id: string) { return this.adminService.deleteDeliveryZone(id); }

  // ─── Password Reset Requests ─────────────────────────────────────────────────

  @Get('password-reset-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getPasswordResetRequests(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.adminService.getPasswordResetRequests(page, limit, status);
  }

  @Post('password-reset-requests/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  approvePasswordResetRequest(@Param('id') id: string, @Req() req: any, @Body('adminNote') adminNote?: string) {
    return this.adminService.approvePasswordResetRequest(id, req.user.id, adminNote);
  }

  @Post('password-reset-requests/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  rejectPasswordResetRequest(@Param('id') id: string, @Req() req: any, @Body('adminNote') adminNote?: string) {
    return this.adminService.rejectPasswordResetRequest(id, req.user.id, adminNote);
  }
}
