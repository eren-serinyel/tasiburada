import { ExtraServiceLoadType } from '../../domain/entities/ExtraServiceLoadType';

/**
 * DTO: Carrier's load type capability
 */
export interface CarrierLoadTypeCapabilityDTO {
  id: string;
  carrierId: string;
  loadType: ExtraServiceLoadType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO: Carrier's extra service capability
 */
export interface CarrierExtraServiceCapabilityDTO {
  id: string;
  carrierId: string;
  extraServiceId: string;
  extraServiceName: string;
  loadType: ExtraServiceLoadType;
  isActive: boolean;
  priceMode: 'NONE' | 'FIXED' | 'QUOTE';
  basePrice?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO: Complete carrier capability profile (read)
 */
export interface CarrierCapabilityProfileDTO {
  carrierId: string;
  loadTypes: CarrierLoadTypeCapabilityDTO[];
  extraServices: CarrierExtraServiceCapabilityDTO[];
  canHandleAllLoadTypes: boolean;
  activeExtraServicesCount: number;
}

/**
 * Payload: Update carrier capabilities (write)
 */
export interface UpdateCarrierCapabilityPayload {
  action: 'add_load_type' | 'remove_load_type' | 'add_extra_service' | 'remove_extra_service' | 'toggle_active';
  loadType?: ExtraServiceLoadType;
  extraServiceId?: string;
  isActive?: boolean;
  priceMode?: 'NONE' | 'FIXED' | 'QUOTE';
  basePrice?: number;
  notes?: string;
}

/**
 * Response: Capability update result
 */
export interface UpdateCapabilityResultDTO {
  success: boolean;
  message: string;
  data?: CarrierCapabilityProfileDTO;
  error?: {
    code: string;
    details: string;
  };
}
