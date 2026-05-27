import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, Req, ParseIntPipe, DefaultValuePipe, ParseBoolPipe, ParseFloatPipe, Optional,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Products')
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Get products with filters' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('categoryId') categoryId?: string,
    @Query('sellerId') sellerId?: string,
    @Query('search') search?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('featured') featured?: string,
  ) {
    return this.productsService.findAll({
      page, limit, categoryId, sellerId, search,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      sortBy, sortOrder,
      featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
    });
  }

  @Get('featured')
  getFeatured(@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number) {
    return this.productsService.getFeaturedProducts(limit);
  }

  @Get('popular')
  getPopular(@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number) {
    return this.productsService.getPopularProducts(limit);
  }

  @Get('wishlist')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getWishlist(@Req() req: any) {
    return this.productsService.getWishlist(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  create(@Body() dto: any, @Req() req: any) {
    return this.productsService.createProduct(req.user.id, dto, req.user.role);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.productsService.updateProduct(id, req.user.id, dto, req.user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  remove(@Param('id') id: string, @Req() req: any) {
    return this.productsService.deleteProduct(id, req.user.id, req.user.role);
  }

  @Post(':id/wishlist')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @ApiBearerAuth()
  toggleWishlist(@Param('id') id: string, @Req() req: any) {
    return this.productsService.toggleWishlist(req.user.id, id);
  }

  @Put(':id/admin-visibility')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  setAdminVisibility(
    @Param('id') id: string,
    @Body('visible') visible: boolean,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.productsService.setAdminVisibility(id, visible, reason, req.user.id);
  }
}
