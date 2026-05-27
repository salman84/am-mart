import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TopupService } from './topup.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Mobile Top-Up')
@Controller({ path: 'topup', version: '1' })
export class TopupController {
  constructor(private topupService: TopupService) {}

  @Get('countries')
  getCountries() { return this.topupService.getCountries(); }

  @Get('amounts')
  getAmounts(@Query('country') country: string, @Query('operator') operator: string) {
    return this.topupService.getAmounts(country, operator);
  }

  @Post('order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  createOrder(@Body() dto: any, @Req() req: any) {
    return this.topupService.createTopupOrder(req.user.id, dto);
  }

  @Post('order/:id/process')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  processOrder(@Param('id') id: string) {
    return this.topupService.processTopup(id);
  }

  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  myOrders(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.topupService.getCustomerTopupOrders(req.user.id, page, limit);
  }

  @Get('admin/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  adminOrders(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.topupService.getAllTopupOrders(page, limit, status);
  }
}
