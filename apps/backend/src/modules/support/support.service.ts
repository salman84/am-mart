import { Injectable, NotFoundException } from '@nestjs/common';
import { TicketStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async createTicket(userId: string, dto: any) {
    return this.prisma.supportTicket.create({ data: { userId, ...dto } });
  }

  async getUserTickets(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [total, tickets] = await Promise.all([
      this.prisma.supportTicket.count({ where: { userId } }),
      this.prisma.supportTicket.findMany({ where: { userId }, skip, take: limit, include: { replies: true }, orderBy: { createdAt: 'desc' } }),
    ]);
    return { total, page, limit, tickets };
  }

  async replyToTicket(ticketId: string, userId: string, message: string, isAdmin = false) {
    return this.prisma.ticketReply.create({ data: { ticketId, userId, message, isAdmin } });
  }

  async getAllTickets(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    const [total, tickets] = await Promise.all([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.findMany({
        where, skip, take: limit,
        include: { user: { select: { fullName: true, phone: true } }, replies: { orderBy: { createdAt: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { total, page, limit, tickets };
  }

  async updateTicketStatus(ticketId: string, status: TicketStatus) {
    return this.prisma.supportTicket.update({ where: { id: ticketId }, data: { status, resolvedAt: status === TicketStatus.RESOLVED ? new Date() : undefined } });
  }
}
