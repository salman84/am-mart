import {
  Controller, Get, Post, Put, Body, Param, Query,
  UseGuards, Req, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Orders & Cart')
@Controller({ path: 'orders', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  // Cart
  @Get('cart')
  getCart(@Req() req: any) {
    return this.ordersService.getCart(req.user.id);
  }

  @Post('cart/add')
  addToCart(@Req() req: any, @Body('productId') productId: string, @Body('quantity') quantity: number) {
    return this.ordersService.addToCart(req.user.id, productId, quantity || 1);
  }

  @Put('cart/:itemId')
  updateCartItem(@Req() req: any, @Param('itemId') itemId: string, @Body('quantity') quantity: number) {
    return this.ordersService.updateCartItem(req.user.id, itemId, quantity);
  }

  @Post('cart/clear')
  clearCart(@Req() req: any) {
    return this.ordersService.clearCart(req.user.id);
  }

  // Orders
  @Post()
  @Roles('CUSTOMER')
  createOrder(@Req() req: any, @Body() dto: any) {
    return this.ordersService.createOrder(req.user.id, dto);
  }

  @Get('my')
  getMyOrders(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.ordersService.getCustomerOrders(req.user.id, page, limit, status);
  }

  @Get(':id')
  getOrder(@Param('id') id: string, @Req() req: any) {
    const userId = ['ADMIN', 'SUPER_ADMIN', 'RIDER'].includes(req.user.role) ? undefined : req.user.id;
    return this.ordersService.getOrderById(id, userId);
  }

  @Post(':id/cancel')
  cancelOrder(@Param('id') id: string, @Req() req: any, @Body('reason') reason?: string) {
    return this.ordersService.cancelOrder(id, req.user.id, reason);
  }

  // Admin
  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: '[Admin] Get all orders' })
  getAllOrders(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.ordersService.getAllOrders(page, limit, status, search);
  }

  @Post(':id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('notes') notes: string,
    @Req() req: any,
  ) {
    return this.ordersService.updateOrderStatus(id, status, req.user.id, notes);
  }
}
