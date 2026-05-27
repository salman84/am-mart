export enum DeliveryStatus {
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  HEADING_TO_PICKUP = 'HEADING_TO_PICKUP',
  PICKED_UP = 'PICKED_UP',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export interface IDeliveryAssignment {
  id: string;
  orderId: string;
  riderId: string;
  status: DeliveryStatus;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffAddress: string;
  estimatedPickup?: Date;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  deliveryProofUrl?: string;
  deliveryOtp?: string;
  createdAt: Date;
}

export interface IDeliveryTracking {
  id: string;
  assignmentId: string;
  riderId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  recordedAt: Date;
}
