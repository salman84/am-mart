export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  SELLER = 'SELLER',
  RIDER = 'RIDER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export enum SellerStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export enum RiderStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
}

export interface IUser {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
}

export interface ISeller extends IUser {
  storeName: string;
  storeDescription?: string;
  storeLogo?: string;
  businessRegNumber?: string;
  commissionRate: number;
  sellerStatus: SellerStatus;
  totalEarnings: number;
  pendingPayout: number;
}

export interface IRider extends IUser {
  vehicleType: string;
  vehicleNumber: string;
  licenseNumber: string;
  riderStatus: RiderStatus;
  currentLat?: number;
  currentLng?: number;
  totalDeliveries: number;
  totalEarnings: number;
  rating: number;
}
