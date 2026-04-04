export interface User {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  pictureUrl?: string | null;
  city: string;
  password?: string;
  type: 'customer' | 'carrier';
  createdAt: Date;
  profileCompletion?: number;
}

export interface Vehicle {
  id: string;
  type: 'kamyonet' | 'kamyon' | 'tir' | 'panelvan';
  capacity: number; // in kg
  licensePlate: string;
  photo?: string;
  year?: number;
  brand?: string;
  model?: string;
  documents?: string[];
}

export interface Carrier extends User {
  vehicle: Vehicle;
  serviceAreas: string[];
  loadTypes: LoadType[];
  // Hangi kapsamda hizmet verir: sehirici, sehirlerarasi
  scopes?: Array<'sehirici' | 'sehirlerarasi'>;
  // Sektöre başlangıç yılı (deneyim otomatik hesaplanır)
  startYear?: number;
  documents: {
    license: string;
    src: string;
    kBelgesi: string;
  };
  rating: number;
  reviewCount: number;
  isApproved: boolean;
  baseFee: number; // Base fee in TL
  profilePhoto?: string;
  description?: string;
  experience?: number;
  badges?: string[];
  iban?: string;
}

export interface CarrierSearchItem {
  id: string;
  companyName: string;
  city: string | null;
  rating: number;
  reviewCount: number;
  vehicleSummary: string | null;
  serviceAreas: string[];
  startingPrice: number | null;
  experienceYears: number | null;
  profileCompletion: number | null;
  pictureUrl: string | null;
}

export interface CarrierDetailProfile {
  overallPercentage: number;
  companyInfoCompleted: boolean;
  activityInfoCompleted: boolean;
  documentsCompleted: boolean;
  earningsCompleted: boolean;
}

export interface CarrierDetailRating {
  average: number;
  count: number;
}

export interface CarrierDetailVehicle {
  id: string;
  typeName: string;
  capacityKg: number | null;
}

export interface CarrierDetailDocument {
  id: string;
  type: string;
  status: string;
  isRequired: boolean;
  isApproved: boolean;
}

export interface CarrierDetailStats {
  completedShipments: number;
  cancelledShipments: number;
  successRate: number;
  totalOffers: number;
}

export interface CarrierDetailReview {
  id: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface CarrierDetail {
  id: string;
  companyName: string;
  pictureUrl: string | null;
  phone: string | null;
  email: string | null;
  taxNumber: string;
  city: string | null;
  district: string | null;
  address: string | null;
  foundedYear: number | null;
  experienceYears: number | null;
  serviceAreas: string[];
  vehicles: CarrierDetailVehicle[];
  profile: CarrierDetailProfile;
  rating: CarrierDetailRating;
  stats: CarrierDetailStats;
  startingPrice: number | null;
  documents: CarrierDetailDocument[];
  documentsApproved: boolean;
  recentReviews: CarrierDetailReview[];
}

export interface Customer extends User {
  type: 'customer';
}

export type LoadType = 'ev-esyasi' | 'beyaz-esya' | 'mobilya' | 'makina' | 'hassas-yuk' | 'gida' | 'tekstil';

export interface ShipmentRequest {
  id: string;
  customerId: string;
  origin: Location;
  destination: Location;
  loadType: LoadType;
  weight: number; // in kg
  date: Date;
  requestedDate?: Date;
  distance?: number;
  description?: string;
  specialRequirements?: string[];
  estimatedDuration?: number;
  status: 'pending' | 'offer_received' | 'matched' | 'in_transit' | 'completed' | 'cancelled' | 'delivered';
  price?: number;
  carrierId?: string;
  createdAt: Date;
}

export interface Location {
  address: string;
  city?: string;
  lat: number;
  lng: number;
}

export interface Offer {
  id: string;
  shipmentId: string;
  carrierId: string;
  carrier?: Carrier;
  price: number;
  message?: string;
  estimatedDuration?: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  validUntil?: Date;
}

export interface Review {
  id: string;
  shipmentId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
  helpful?: number;
  categories?: {
    punctuality: number;
    communication: number;
    carefulHandling: number;
    professionalism: number;
  };
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'offer_received' | 'offer_accepted' | 'shipment_completed' | 'rating_received' | 'document_approved';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  relatedId?: string;
  actionUrl?: string;
}

export interface PricingFactors {
  baseRate: number;
  distanceMultiplier: number;
  weightMultiplier: number;
  demandMultiplier: number;
  trafficMultiplier: number;
  urgencyMultiplier: number;
  seasonalMultiplier: number;
}

// Alias for compatibility
export type Shipment = ShipmentRequest;

export const VEHICLE_CAPACITIES = {
  kamyonet: 3500, // 3.5 ton
  panelvan: 1500, // 1.5 ton
  kamyon: 15000, // 15 ton
  tir: 40000, // 40 ton
};

export const LOAD_TYPES = {
  'ev-esyasi': 'Ev Eşyası',
  'beyaz-esya': 'Beyaz Eşya',
  'mobilya': 'Mobilya',
  'makina': 'Makina',
  'hassas-yuk': 'Hassas Yük',
  'gida': 'Gıda',
  'tekstil': 'Tekstil',
};

export const VEHICLE_TYPES = {
  kamyonet: { name: 'Kamyonet', maxCapacity: 3500 },
  panelvan: { name: 'Panelvan', maxCapacity: 1500 },
  kamyon: { name: 'Kamyon', maxCapacity: 15000 },
  tir: { name: 'Tır', maxCapacity: 40000 },
};