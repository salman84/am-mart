import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsEnum } from 'class-validator';

export class CreateProviderDto {
  @IsString()
  companyName: string;

  @IsString()
  slug: string;

  @IsOptional() @IsString()
  logoUrl?: string;

  @IsOptional() @IsString()
  country?: string;

  @IsOptional() @IsString()
  officialWebsite?: string;

  @IsOptional() @IsString()
  appDeepLink?: string;

  @IsOptional() @IsArray()
  supportedSendCurrencies?: string[];

  @IsOptional() @IsArray()
  supportedRecvCurrencies?: string[];

  @IsOptional() @IsEnum(['ACTIVE', 'INACTIVE', 'SUSPENDED'])
  status?: string;

  @IsOptional() @IsEnum(['MANUAL', 'FOREX_API', 'WISE_API', 'HTML_SCRAPER', 'BROWSER_SCRAPER'])
  fetchMethod?: string;

  @IsOptional() @IsString()
  scraperKey?: string;

  @IsOptional() @IsString()
  sourceUrl?: string;

  @IsOptional() @IsBoolean()
  isVerified?: boolean;

  @IsOptional() @IsBoolean()
  isFeatured?: boolean;

  @IsOptional() @IsNumber()
  priority?: number;

  @IsOptional() @IsString()
  transferTime?: string;

  @IsOptional() @IsNumber()
  minAmount?: number;

  @IsOptional() @IsNumber()
  maxAmount?: number;

  @IsOptional() @IsString()
  notes?: string;
}

export class UpdateProviderDto extends CreateProviderDto {}

export class ManualRateDto {
  @IsString()
  sendCurrency: string;

  @IsString()
  recvCurrency: string;

  @IsNumber()
  rate: number;

  @IsOptional() @IsNumber()
  transferFee?: number;
}
