import {
  Controller, Get, Post, Body, Param, Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FulfillmentService } from './fulfillment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Fulfillment Automation')
@Controller({ path: 'fulfillment', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FulfillmentController {
  constructor(private fulfillmentService: FulfillmentService) {}

  @Post('process-order/:orderId')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Process order for warehouse fulfillment' })
  processOrder(@Param('orderId') orderId: string) {
    return this.fulfillmentService.processOrderForFulfillment(orderId);
  }

  @Post('auto-assign-driver/:routeId')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Auto-assign best available driver to route' })
  autoAssignDriver(@Param('routeId') routeId: string) {
    return this.fulfillmentService.autoAssignDriver(routeId);
  }

  @Post('auto-create-route')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Auto-create route from ready packages' })
  autoCreateRoute(
    @Body('centerId') centerId: string,
    @Body('plannedDate') plannedDate: string,
  ) {
    return this.fulfillmentService.autoCreateRouteFromPackages(centerId, plannedDate);
  }

  @Post('cancel-order/:orderId')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Handle order cancellation (release inventory)' })
  cancelOrder(@Param('orderId') orderId: string) {
    return this.fulfillmentService.handleOrderCancellation(orderId);
  }

  @Post('delivery-complete/:orderId')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Handle delivery completion (deduct inventory)' })
  deliveryComplete(@Param('orderId') orderId: string) {
    return this.fulfillmentService.handleDeliveryCompletion(orderId);
  }

  @Post('return-to-warehouse/:orderId')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Handle return to warehouse (restore inventory)' })
  returnToWarehouse(@Param('orderId') orderId: string) {
    return this.fulfillmentService.handleReturnToWarehouse(orderId);
  }

  @Post('damaged-inventory')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF')
  @ApiOperation({ summary: 'Mark inventory as damaged' })
  damagedInventory(
    @Body('centerId') centerId: string,
    @Body('productId') productId: string,
    @Body('quantity') quantity: number,
  ) {
    return this.fulfillmentService.handleDamagedInventory(centerId, productId, quantity);
  }

  @Get('pipeline')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Get fulfillment pipeline counts' })
  getPipeline(@Query('centerId') centerId?: string) {
    return this.fulfillmentService.getFulfillmentPipeline(centerId);
  }

  @Post('recalculate-rank/:riderId')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Recalculate driver rank based on performance' })
  recalculateRank(@Param('riderId') riderId: string) {
    return this.fulfillmentService.recalculateDriverRank(riderId);
  }
}
