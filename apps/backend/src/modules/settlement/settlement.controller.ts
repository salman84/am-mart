import {
  Controller, Get, Post, Body, Param, Query, Req,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettlementService } from './settlement.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Settlement & Finance')
@Controller({ path: 'settlements', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SettlementController {
  constructor(private settlementService: SettlementService) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'List driver settlements' })
  getAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('riderId') riderId?: string,
  ) {
    return this.settlementService.getAllSettlements({ page, limit, status, riderId });
  }

  @Get('stats')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Get settlement dashboard stats' })
  getStats() {
    return this.settlementService.getSettlementStats();
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER', 'RIDER')
  @ApiOperation({ summary: 'Get settlement details' })
  getOne(@Param('id') id: string) {
    return this.settlementService.getSettlement(id);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Create settlement' })
  create(@Body() body: any) {
    return this.settlementService.createSettlement(body);
  }

  @Post('calculate')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Calculate settlement for a rider' })
  calculate(
    @Body('riderId') riderId: string,
    @Body('periodStart') periodStart: string,
    @Body('periodEnd') periodEnd: string,
  ) {
    return this.settlementService.calculateSettlement(riderId, periodStart, periodEnd);
  }

  @Post(':id/status')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Update settlement status' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Req() req: any,
  ) {
    return this.settlementService.updateSettlementStatus(id, status, req.user.id);
  }

  @Post('rating')
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Submit delivery rating' })
  submitRating(@Body() body: any, @Req() req: any) {
    return this.settlementService.submitDeliveryRating({ ...body, customerId: req.user.id });
  }
}
