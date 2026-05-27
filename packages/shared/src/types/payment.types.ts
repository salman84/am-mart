export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSED = 'PROCESSED',
}

export enum PayoutStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface IPayment {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  status: string;
  transactionId?: string;
  gatewayResponse?: object;
  paidAt?: Date;
  createdAt: Date;
}

export interface IRefund {
  id: string;
  orderId: string;
  paymentId: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  processedAt?: Date;
  createdAt: Date;
}

export interface ISellerPayout {
  id: string;
  sellerId: string;
  amount: number;
  commission: number;
  netAmount: number;
  bankName: string;
  accountNumber: string;
  status: PayoutStatus;
  processedAt?: Date;
  createdAt: Date;
}
