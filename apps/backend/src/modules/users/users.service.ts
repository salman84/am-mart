import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        customer: { include: { addresses: true } },
        wallet: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async updateProfile(userId: string, dto: any) {
    const { fullName, avatar, email } = dto;
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { fullName, avatar, email },
    });
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { fcmToken } });
  }

  async getAddresses(userId: string) {
    const customer = await this.prisma.customer.findFirst({ where: { userId }, include: { addresses: true } });
    return { addresses: customer?.addresses || [] };
  }

  async addAddress(userId: string, dto: any) {
    const customer = await this.prisma.customer.findFirst({ where: { userId } });
    if (!customer) throw new NotFoundException('Customer not found');

    if (dto.isDefault) {
      await this.prisma.address.updateMany({ where: { customerId: customer.id }, data: { isDefault: false } });
    }

    return this.prisma.address.create({ data: { customerId: customer.id, ...dto } });
  }

  async updateAddress(userId: string, addressId: string, dto: any) {
    const customer = await this.prisma.customer.findFirst({ where: { userId } });
    const address = await this.prisma.address.findFirst({ where: { id: addressId, customerId: customer?.id } });
    if (!address) throw new NotFoundException('Address not found');
    return this.prisma.address.update({ where: { id: addressId }, data: dto });
  }

  async deleteAddress(userId: string, addressId: string) {
    const customer = await this.prisma.customer.findFirst({ where: { userId } });
    await this.prisma.address.deleteMany({ where: { id: addressId, customerId: customer?.id } });
    return { message: 'Address deleted' };
  }

  async getAllUsers(page = 1, limit = 20, role?: string, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (role) where.role = role;
    if (search) where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ];

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where, skip, take: limit,
        select: { id: true, fullName: true, phone: true, email: true, role: true, status: true, createdAt: true, avatar: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { total, page, limit, users };
  }

  async createUser(dto: any) {
    const role = dto.role as UserRole;
    if (!Object.values(UserRole).includes(role)) {
      throw new BadRequestException('Invalid role');
    }

    const username = String(dto.username || '').trim();
    const password = String(dto.password || '');
    if (!username) throw new BadRequestException('Username is required');
    if (password.length < 8) throw new BadRequestException('Password must be at least 8 characters');

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { fullName: { equals: username, mode: 'insensitive' } },
          dto.email ? { email: dto.email } : undefined,
        ].filter(Boolean) as any,
      },
    });
    if (existing) throw new BadRequestException('Username or email already exists');

    const passwordHash = await bcrypt.hash(password, 12);
    const phone = `internal-${role.toLowerCase()}-${Date.now()}`;

    const user = await this.prisma.user.create({
      data: {
        fullName: username,
        email: dto.email || null,
        phone,
        passwordHash,
        role,
        status: 'ACTIVE',
        isPhoneVerified: true,
        customer: role === UserRole.CUSTOMER ? { create: {} } : undefined,
      },
      select: { id: true, fullName: true, email: true, phone: true, role: true, status: true, createdAt: true },
    });

    return user;
  }

  async updateUserStatus(userId: string, status: UserStatus) {
    return this.prisma.user.update({ where: { id: userId }, data: { status } });
  }
}
