export enum TopupStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum TopupType {
  LOCAL = 'LOCAL',
  INTERNATIONAL = 'INTERNATIONAL',
}

export interface ITopupOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  topupType: TopupType;
  countryCode: string;
  countryName: string;
  phoneNumber: string;
  operator: string;
  amount: number;
  currency: string;
  exchangeRate?: number;
  serviceFee: number;
  totalAmount: number;
  status: TopupStatus;
  providerReference?: string;
  failureReason?: string;
  completedAt?: Date;
  createdAt: Date;
}

export interface ITopupProvider {
  id: string;
  name: string;
  code: string;
  countries: string[];
  isActive: boolean;
  apiEndpoint: string;
}
