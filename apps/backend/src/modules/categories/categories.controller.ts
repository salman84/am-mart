import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Categories')
@Controller({ path: 'categories', version: '1' })
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get() findAll(@Query('includeInactive') inc?: string) {
    return this.categoriesService.findAll(inc === 'true');
  }

  @Get(':id') findOne(@Param('id') id: string) { return this.categoriesService.findOne(id); }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN') @ApiBearerAuth()
  create(@Body() dto: any) { return this.categoriesService.create(dto); }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN') @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: any) { return this.categoriesService.update(id, dto); }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN') @ApiBearerAuth()
  remove(@Param('id') id: string) { return this.categoriesService.delete(id); }
}
