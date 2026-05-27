import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BannersService {
  constructor(private prisma: PrismaService) {}

  async getActive() {
    return this.prisma.banner.findMany({
      where: { isActive: true, OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(dto: any) { return this.prisma.banner.create({ data: dto }); }
  async findAll() { return this.prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } }); }
  async update(id: string, dto: any) { return this.prisma.banner.update({ where: { id }, data: dto }); }
  async delete(id: string) { return this.prisma.banner.delete({ where: { id } }); }
}
