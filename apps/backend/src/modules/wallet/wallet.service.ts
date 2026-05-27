import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) wallet = await this.prisma.wallet.create({ data: { userId } });
    return wallet;
  }

  async getBalance(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    return { balance: wallet.balance, currency: wallet.currency };
  }

  async getTransactions(userId: string, page = 1, limit = 20) {
    const wallet = await this.getOrCreateWallet(userId);
    const skip = (page - 1) * limit;
    const [total, transactions] = await Promise.all([
      this.prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
      this.prisma.walletTransaction.findMany({ where: { walletId: wallet.id }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    ]);
    return { balance: wallet.balance, total, page, limit, transactions };
  }

  async credit(userId: string, amount: number, description: string, reference?: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const newBalance = wallet.balance + amount;

    await this.prisma.$transaction([
      this.prisma.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } }),
      this.prisma.walletTransaction.create({ data: { walletId: wallet.id, type: 'CREDIT', amount, balance: newBalance, description, reference } }),
    ]);

    return { balance: newBalance };
  }

  async debit(userId: string, amount: number, description: string, reference?: string) {
    const wallet = await this.getOrCreateWallet(userId);
    if (wallet.balance < amount) throw new BadRequestException('Insufficient wallet balance');

    const newBalance = wallet.balance - amount;
    await this.prisma.$transaction([
      this.prisma.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } }),
      this.prisma.walletTransaction.create({ data: { walletId: wallet.id, type: 'DEBIT', amount, balance: newBalance, description, reference } }),
    ]);

    return { balance: newBalance };
  }
}
