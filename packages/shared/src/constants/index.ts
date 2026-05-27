export const APP_NAME = 'AM Mart';
export const APP_VERSION = '1.0.0';

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

export const COMMISSION = {
  DEFAULT_RATE: 10,
  MIN_RATE: 0,
  MAX_RATE: 50,
};

export const SIM_RESERVATION_TIMEOUT_MINUTES = 15;

export const DELIVERY_FEE = {
  BASE: 3000,
  PER_KM: 500,
  FREE_THRESHOLD: 50000,
};

export const WALLET = {
  MIN_TOPUP: 10000,
  MAX_TOPUP: 1000000,
  MIN_WITHDRAWAL: 50000,
};

export const OTP = {
  EXPIRY_MINUTES: 10,
  LENGTH: 6,
  MAX_ATTEMPTS: 3,
};

export const CARRIERS_KR = ['SKT', 'KT', 'LG U+', 'MVNO'];

export const COUNTRIES_TOPUP = [
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', currency: 'KRW' },
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', currency: 'PHP' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', currency: 'VND' },
  { code: 'CN', name: 'China', flag: '🇨🇳', currency: 'CNY' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', currency: 'BDT' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', currency: 'PKR' },
  { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', currency: 'MXN' },
];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Order Placed',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  PICKED_UP: 'Picked Up',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};
