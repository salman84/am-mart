import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BannersService } from './banners.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Banners')
@Controller({ path: 'banners', version: '1' })
export class BannersController {
  constructor(private bannersService: BannersService) {}

  @Get() getActive() { return this.bannersService.getActive(); }
  @Get('all') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN') @ApiBearerAuth() findAll() { return this.bannersService.findAll(); }
  @Post() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN') @ApiBearerAuth() create(@Body() dto: any) { return this.bannersService.create(dto); }
  @Put(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN') @ApiBearerAuth() update(@Param('id') id: string, @Body() dto: any) { return this.bannersService.update(id, dto); }
  @Delete(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN') @ApiBearerAuth() delete(@Param('id') id: string) { return this.bannersService.delete(id); }
}
