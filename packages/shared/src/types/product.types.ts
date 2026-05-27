export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  DELETED = 'DELETED',
}

export interface ICategory {
  id: string;
  name: string;
  nameKr?: string;
  slug: string;
  icon?: string;
  image?: string;
  parentId?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface IProduct {
  id: string;
  sellerId: string;
  categoryId: string;
  name: string;
  nameKr?: string;
  description: string;
  price: number;
  discountPrice?: number;
  stock: number;
  unit: string;
  images: string[];
  status: ProductStatus;
  rating: number;
  reviewCount: number;
  isDeliveryAvailable: boolean;
  deliveryFee: number;
  minOrderQty: number;
  maxOrderQty?: number;
  tags: string[];
  createdAt: Date;
}
