export enum SimStatus {
  PENDING = 'PENDING',
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum SimType {
  PREPAID = 'PREPAID',
  DATA_ONLY = 'DATA_ONLY',
  VOICE_DATA = 'VOICE_DATA',
}

export enum SimCarrier {
  SKT = 'SKT',
  KT = 'KT',
  LG_UPLUS = 'LG_UPLUS',
  MVNO = 'MVNO',
}

export interface ISimNumber {
  id: string;
  fullNumber: string;
  maskedNumber: string;
  lastFourDigits: string;
  carrier: SimCarrier;
  simType: SimType;
  price: number;
  status: SimStatus;
  activationRequired: boolean;
  requiresIdVerification: boolean;
}

export interface ISimOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  simNumberId: string;
  simNumber: ISimNumber;
  status: SimStatus;
  idDocumentUrl?: string;
  idDocumentType?: string;
  deliveryAddress?: object;
  reservedAt?: Date;
  confirmedAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
}
