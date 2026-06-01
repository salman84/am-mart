import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return this.prisma.category.findMany({
      where: { ...where, parentId: null },
      include: {
        children: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id }, include: { children: true } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async create(dto: any) {
    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: any) {
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.prisma.category.update({ where: { id }, data: { isActive: false } });
    return { message: 'Category deactivated' };
  }

  /** Returns every category flat (all levels) — used by admin icons page */
  async findAllFlat() {
    return this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }
}
