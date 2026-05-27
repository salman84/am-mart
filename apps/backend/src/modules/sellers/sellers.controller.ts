import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SellersService } from './sellers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Sellers')
@Controller({ path: 'sellers', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SellersController {
  constructor(private sellersService: SellersService) {}

  @Public()
  @Get('check-store-name')
  checkStoreName(@Query('name') name: string) {
    return this.sellersService.checkStoreName(name);
  }

  @Post('apply') apply(@Req() req: any, @Body() dto: any) { return this.sellersService.applyAsSeller(req.user.id, dto); }
  @Get('profile') getProfile(@Req() req: any) { return this.sellersService.getSellerProfile(req.user.id); }
  @Put('profile') updateProfile(@Req() req: any, @Body() dto: any) { return this.sellersService.updateSellerProfile(req.user.id, dto); }
  @Get('dashboard') getDashboard(@Req() req: any) { return this.sellersService.getSellerDashboard(req.user.id); }

  @Get('orders')
  getOrders(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) { return this.sellersService.getSellerOrders(req.user.id, page, limit, status); }

  @Get('admin')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  getAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) { return this.sellersService.getAllSellers(page, limit, status); }

  @Post(':id/status')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  updateStatus(@Param('id') id: string, @Body('status') status: string, @Body('reason') reason: string, @Req() req: any) {
    return this.sellersService.adminUpdateSellerStatus(id, status, req.user.id, reason);
  }
}
