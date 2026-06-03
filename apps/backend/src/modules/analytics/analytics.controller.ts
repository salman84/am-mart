import {
  Controller, Get, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Analytics & Monitoring')
@Controller({ path: 'analytics', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('parcel-overview')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Parcel delivery overview dashboard' })
  getOverview() {
    return this.analyticsService.getParcelOverview();
  }

  @Get('package-status')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Package status breakdown' })
  getStatusBreakdown() {
    return this.analyticsService.getPackageStatusBreakdown();
  }

  @Get('driver-performance')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Driver performance metrics' })
  getDriverPerformance(
    @Query('period') period?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getDriverPerformance({
      period, limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('warehouse-performance')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Warehouse performance metrics' })
  getWarehousePerformance() {
    return this.analyticsService.getWarehousePerformance();
  }

  @Get('failed-deliveries')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Failed delivery analysis by reason' })
  getFailedDeliveries(@Query('period') period?: string) {
    return this.analyticsService.getFailedDeliveryAnalysis({ period });
  }

  @Get('returns')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Return analytics' })
  getReturnAnalytics() {
    return this.analyticsService.getReturnAnalytics();
  }

  @Get('settlements')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Settlement summary' })
  getSettlementSummary() {
    return this.analyticsService.getSettlementSummary();
  }
}
