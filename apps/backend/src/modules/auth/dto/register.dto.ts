import { IsArray, IsBoolean, IsObject, IsOptional, IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: '+821012345678' })
  @IsString()
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: ['CUSTOMER', 'SELLER', 'RIDER'] })
  @IsOptional()
  @IsEnum(['CUSTOMER', 'SELLER', 'RIDER'])
  role?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storeDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessRegNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  detailAddress?: string;

  @ApiPropertyOptional({ enum: ['LOCAL', 'GLOBAL'] })
  @IsOptional()
  @IsEnum(['LOCAL', 'GLOBAL'])
  sellerScope?: any;

  @ApiPropertyOptional({ enum: ['INDIVIDUAL', 'BUSINESS', 'COMPANY', 'GLOBAL'] })
  @IsOptional()
  @IsEnum(['INDIVIDUAL', 'BUSINESS', 'COMPANY', 'GLOBAL'])
  sellerAccountType?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryOfResidence?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  representativeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  passportNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessCategory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mailOrderSalesReportNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxInvoiceEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vatStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessOpeningDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  globalBusinessLicenseNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryOfIncorporation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountHolderName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  swiftCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  settlementCurrency?: string;

  @ApiPropertyOptional({ enum: ['WEEKLY', 'MONTHLY', 'CUSTOM'] })
  @IsOptional()
  @IsEnum(['WEEKLY', 'MONTHLY', 'CUSTOM'])
  settlementCycle?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  agreements?: Record<string, boolean>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  privacyDocumentConsent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  documentUploads?: Array<{
    requirementId?: string;
    documentType: string;
    fileUrl: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
  }>;
}
