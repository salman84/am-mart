import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Req,
  UseInterceptors, UploadedFile, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { SimService } from './sim.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('SIM Cards')
@Controller({ path: 'sim', version: '1' })
export class SimController {
  constructor(private simService: SimService) {}

  // Customer endpoints
  @Get('search')
  @ApiOperation({ summary: 'Search SIM numbers by last 4 digits' })
  @ApiQuery({ name: 'lastFour', required: true })
  @ApiQuery({ name: 'carrier', required: false })
  @ApiQuery({ name: 'simType', required: false })
  search(
    @Query('lastFour') lastFour: string,
    @Query('carrier') carrier?: string,
    @Query('simType') simType?: string,
  ) {
    return this.simService.searchByLastFour(lastFour, carrier, simType);
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available SIM numbers' })
  getAvailable(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('carrier') carrier?: string,
    @Query('simType') simType?: string,
  ) {
    return this.simService.getAvailableNumbers(page, limit, carrier, simType);
  }

  @Post(':id/reserve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reserve a SIM number (15-min hold)' })
  reserve(
    @Param('id') id: string,
    @Body('chosenLastFour') chosenLastFour: string,
    @Req() req: any,
  ) {
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    return this.simService.reserveSimNumber(id, req.user.id, isAdmin, chosenLastFour);
  }

  @Post('orders/:id/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit SIM order with documents' })
  submitOrder(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.simService.submitSimOrder(id, req.user.id, body);
  }

  @Get('orders/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customer SIM orders' })
  myOrders(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.simService.getCustomerSimOrders(req.user.id, page, limit);
  }

  @Get('orders/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getOrder(@Param('id') id: string, @Req() req: any) {
    const customerId = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role) ? undefined : req.user.id;
    return this.simService.getSimOrderById(id, customerId);
  }

  // Admin endpoints
  @Post('admin/numbers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Add a SIM number' })
  addNumber(@Body() body: any, @Req() req: any) {
    return this.simService.addSimNumber({ ...body, addedBy: req.user.id });
  }

  @Post('admin/numbers/bulk-upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '[Admin] Bulk upload SIM numbers via Excel/CSV' })
  bulkUpload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    return this.simService.bulkUploadSimNumbers(file.buffer, req.user.id);
  }

  @Get('admin/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Get all SIM orders' })
  adminOrders(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.simService.getAllSimOrders(page, limit, status);
  }

  @Post('admin/orders/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Update SIM order status' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('notes') notes: string,
    @Req() req: any,
  ) {
    return this.simService.adminUpdateSimOrderStatus(id, status, req.user.id, notes);
  }

  // ── SIM Numbers Inventory ──────────────────────────────────────────────────

  @Get('admin/numbers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] List all SIM numbers in inventory' })
  listNumbers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('type') type?: 'full' | 'prefix',
    @Query('carrier') carrier?: string,
  ) {
    return this.simService.getAllSimNumbers(page, limit, type, carrier);
  }

  @Put('admin/numbers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Edit a SIM number' })
  editNumber(@Param('id') id: string, @Body() body: any) {
    return this.simService.editSimNumber(id, body);
  }

  @Delete('admin/numbers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Delete a SIM number' })
  deleteNumber(@Param('id') id: string) {
    return this.simService.deleteSimNumber(id);
  }

  @Patch('admin/numbers/:id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Toggle SIM number hide/unhide' })
  toggleNumber(@Param('id') id: string) {
    return this.simService.toggleSimNumberVisibility(id);
  }
}
