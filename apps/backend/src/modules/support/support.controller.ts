import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TicketStatus } from '@prisma/client';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Support')
@Controller({ path: 'support', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SupportController {
  constructor(private supportService: SupportService) {}

  @Post('tickets') createTicket(@Req() req: any, @Body() dto: any) { return this.supportService.createTicket(req.user.id, dto); }
  @Get('tickets/my') getMyTickets(@Req() req: any, @Query('page', new DefaultValuePipe(1), ParseIntPipe) p: number) { return this.supportService.getUserTickets(req.user.id, p); }
  @Post('tickets/:id/reply') reply(@Param('id') id: string, @Body('message') msg: string, @Req() req: any) { return this.supportService.replyToTicket(id, req.user.id, msg, false); }

  @Get('tickets')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  getAll(@Query('page', new DefaultValuePipe(1), ParseIntPipe) p: number, @Query('status') status?: string) { return this.supportService.getAllTickets(p, 20, status); }

  @Post('tickets/:id/reply-admin')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  adminReply(@Param('id') id: string, @Body('message') msg: string, @Req() req: any) { return this.supportService.replyToTicket(id, req.user.id, msg, true); }

  @Put('tickets/:id/status')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  updateStatus(@Param('id') id: string, @Body('status') status: TicketStatus) { return this.supportService.updateTicketStatus(id, status); }
}
