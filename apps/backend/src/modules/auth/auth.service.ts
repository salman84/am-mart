import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpService } from './otp.service';
import { CouponsService } from '../coupons/coupons.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private otp: OtpService,
    private coupons: CouponsService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException('Phone number already registered');

    if (dto.email) {
      const emailExisting = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (emailExisting) throw new ConflictException('Email already registered');
    }

    if (dto.role === UserRole.SELLER || dto.role === 'SELLER') {
      const businessNumber = dto.businessRegNumber?.trim();
      if (businessNumber) {
        const existingBusiness = await this.prisma.seller.findFirst({ where: { businessRegNumber: businessNumber } });
        if (existingBusiness) throw new ConflictException('Business registration number already registered');
      }
    }

    // Generate unique referral code
    const referralCode = await this.generateReferralCode();

    const hash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        email: dto.email,
        fullName: dto.fullName,
        passwordHash: hash,
        role: dto.role || UserRole.CUSTOMER,
        referralCode,
        referredBy: (dto as any).referredBy || null,
        customer:
          dto.role === UserRole.CUSTOMER || !dto.role
            ? { create: {} }
            : undefined,
      },
      include: { customer: true },
    });

    if ((dto.role === UserRole.SELLER || dto.role === 'SELLER') && dto.storeName) {
      const slug = dto.storeName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        + '-' + Date.now();

      const seller = await this.prisma.seller.create({
        data: {
          userId: user.id,
          storeName: dto.storeName,
          storeSlug: slug,
          storeDescription: dto.storeDescription,
          businessRegNumber: dto.businessRegNumber,
          address: dto.address,
          detailAddress: dto.detailAddress,
          sellerStatus: 'PENDING',
        },
      });

      const db = this.prisma as any;
      const application = await db.sellerApplication.create({
        data: {
          userId: user.id,
          sellerId: seller.id,
          sellerScope: dto.sellerScope || 'LOCAL',
          sellerAccountType: dto.sellerAccountType || (dto.sellerScope === 'GLOBAL' ? 'GLOBAL' : 'BUSINESS'),
          status: 'SUBMITTED',
          preferredLanguage: dto.preferredLanguage,
          countryOfResidence: dto.countryOfResidence,
          nationality: dto.nationality,
          submittedAt: new Date(),
          payload: {
            representativeName: dto.representativeName,
            dateOfBirth: dto.dateOfBirth,
            passportNumber: dto.passportNumber,
            contactAddress: dto.contactAddress,
            emergencyContact: dto.emergencyContact,
            agreements: dto.agreements,
            privacyDocumentConsent: dto.privacyDocumentConsent,
          },
        },
      });

      await db.sellerBusinessInformation.create({
        data: {
          sellerId: seller.id,
          applicationId: application.id,
          sellerScope: dto.sellerScope || 'LOCAL',
          businessRegistrationNumber: dto.businessRegNumber,
          businessName: dto.businessName,
          businessType: dto.businessType,
          businessCategory: dto.businessCategory,
          representativeName: dto.representativeName,
          businessAddress: dto.address || dto.contactAddress,
          businessPhone: dto.businessPhone,
          businessEmail: dto.businessEmail,
          mailOrderSalesReportNumber: dto.mailOrderSalesReportNumber,
          taxInvoiceEmail: dto.taxInvoiceEmail,
          vatStatus: dto.vatStatus,
          businessOpeningDate: dto.businessOpeningDate ? new Date(dto.businessOpeningDate) : null,
          globalBusinessLicenseNumber: dto.globalBusinessLicenseNumber,
          countryOfIncorporation: dto.countryOfIncorporation,
        },
      });

      if (dto.bankName || dto.accountNumber || dto.accountHolderName) {
        await db.sellerBankAccount.create({
          data: {
            sellerId: seller.id,
            applicationId: application.id,
            bankCountry: dto.bankCountry || (dto.sellerScope === 'GLOBAL' ? '' : 'KR'),
            bankName: dto.bankName || '',
            accountHolderName: dto.accountHolderName || '',
            accountNumber: dto.accountNumber || '',
            swiftCode: dto.swiftCode,
            bankAddress: dto.bankAddress,
            settlementCurrency: dto.settlementCurrency || 'KRW',
            settlementCycle: dto.settlementCycle || 'MONTHLY',
          },
        });
      }

      if (Array.isArray(dto.documentUploads) && dto.documentUploads.length > 0) {
        await db.sellerDocument.createMany({
          data: dto.documentUploads.map((document: any) => ({
            sellerId: seller.id,
            applicationId: application.id,
            requirementId: document.requirementId || null,
            documentType: document.documentType || 'OTHER',
            fileUrl: document.fileUrl,
            originalFileName: document.originalFileName,
            mimeType: document.mimeType,
            fileSize: Number(document.fileSize || 0),
            uploadedBy: user.id,
          })),
        });
      }

      await db.sellerApplicationReview.create({
        data: {
          applicationId: application.id,
          reviewerId: user.id,
          action: 'SUBMIT',
          toStatus: 'SUBMITTED',
          note: 'Seller submitted registration form',
        },
      });

      const admins = await this.prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } });
      if (admins.length > 0) {
        await this.prisma.notification.createMany({
          data: admins.map(admin => ({
            userId: admin.id,
            title: 'New Seller Application',
            body: `${dto.storeName} has applied to become a seller`,
            type: 'SYSTEM' as any,
          })),
        });
      }
    }

    const { devCode } = await this.otp.sendOtp(user.id, dto.phone, 'PHONE_VERIFICATION');
    const isDev = process.env.NODE_ENV !== 'production';
    return {
      message: dto.role === 'SELLER'
        ? 'Seller registration submitted. Your account is under review.'
        : 'Registration successful. OTP sent to your phone.',
      userId: user.id,
      // Only expose devCode in non-production environments
      ...(devCode && isDev ? { devCode } : {}),
    };
  }

  async verifyPhone(dto: VerifyOtpDto) {
    const verified = await this.otp.verifyOtp(dto.userId, dto.otp, 'PHONE_VERIFICATION');
    if (!verified) throw new BadRequestException('Invalid or expired OTP');

    await this.prisma.user.update({
      where: { id: dto.userId },
      data: { isPhoneVerified: true, status: 'ACTIVE' },
    });

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });

    // Auto-assign welcome + first-purchase coupons (fire-and-forget — never block login)
    this.coupons.assignWelcomeCoupons(dto.userId).catch(() => {});

    // Process referral rewards if user was referred
    if (user?.referredBy) {
      this.coupons.processReferralSignup(dto.userId, user.referredBy).catch(() => {});
    }

    return this.generateTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: dto.identifier },
          { email: dto.identifier },
          { fullName: { equals: dto.identifier, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.status === 'SUSPENDED') throw new UnauthorizedException('Account suspended');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isPhoneVerified) {
      const { devCode } = await this.otp.sendOtp(user.id, user.phone, 'PHONE_VERIFICATION');
      throw new BadRequestException(
        devCode ? `Phone not verified. OTP: ${devCode}` : 'Phone not verified. OTP sent.',
      );
    }

    // Seller approval gate — only APPROVED sellers may sign in
    if (user.role === UserRole.SELLER || (user.role as string) === 'SELLER') {
      const seller = await this.prisma.seller.findUnique({ where: { userId: user.id } });
      if (!seller) {
        throw new ForbiddenException('Seller profile not found. Please register first.');
      }
      if (seller.sellerStatus === 'PENDING') {
        throw new ForbiddenException('Your account is under review. You will be notified once approved by our team.');
      }
      if (seller.sellerStatus === 'REJECTED') {
        const reason = seller.rejectionReason ? `: ${seller.rejectionReason}` : '.';
        throw new ForbiddenException(`Your seller application was rejected${reason} Please contact support.`);
      }
      if (seller.sellerStatus === 'SUSPENDED') {
        throw new ForbiddenException('Your seller account has been suspended. Please contact support.');
      }
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens(user);
  }

  async sendLoginOtp(phone: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) throw new NotFoundException('No account found with this phone');
    const { devCode } = await this.otp.sendOtp(user.id, phone, 'LOGIN');
    const isDev = process.env.NODE_ENV !== 'production';
    return {
      message: 'OTP sent',
      userId: user.id,
      ...(devCode && isDev ? { devCode } : {}),
    };
  }

  async loginWithOtp(dto: VerifyOtpDto) {
    const verified = await this.otp.verifyOtp(dto.userId, dto.otp, 'LOGIN');
    if (!verified) throw new BadRequestException('Invalid or expired OTP');

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new BadRequestException('User not found');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens(user);
  }

  async refreshToken(token: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } });

    return this.generateTokens(user);
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    return { message: 'Logged out' };
  }

  async forgotPassword(phone: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) throw new NotFoundException('No account found');
    const { devCode } = await this.otp.sendOtp(user.id, phone, 'PASSWORD_RESET');
    const isDev = process.env.NODE_ENV !== 'production';
    return {
      message: 'OTP sent',
      userId: user.id,
      ...(devCode && isDev ? { devCode } : {}),
    };
  }

  async resetPassword(userId: string, otp: string, newPassword: string) {
    const verified = await this.otp.verifyOtp(userId, otp, 'PASSWORD_RESET');
    if (!verified) throw new BadRequestException('Invalid or expired OTP');

    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    return { message: 'Password reset successful' };
  }

  private async generateReferralCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const exists = await (this.prisma as any).user.findFirst({ where: { referralCode: code } });
      if (!exists) return code;
    }
    return `REF${Date.now().toString(36).toUpperCase()}`;
  }

  private async generateTokens(user: any) {
    const payload = { sub: user.id, role: user.role, phone: user.phone };
    const accessToken = this.jwt.sign(payload);
    const refreshTokenStr = require('crypto').randomBytes(40).toString('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenStr,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days — users stay logged in
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenStr,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
      },
    };
  }
}
