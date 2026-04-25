import { apiClient } from '@/lib/apiClient';
import type { ExtraServiceLoadType } from '@/lib/extraServices';

export type ConverterMoveType = 'household' | 'partial_load';
export type ConverterPropertyType = 'studio' | '1+1' | '2+1' | '3+1' | '4+1_plus' | 'unknown';

export interface ConverterEstimateItemInput {
  itemCode: string;
  quantity: number;
}

export interface CreateConverterSessionResponse {
  sessionId: string;
  status: 'draft' | 'estimated' | 'applied';
  createdAt?: string;
}

export interface EstimateConverterRequest {
  moveType: ConverterMoveType;
  propertyType: ConverterPropertyType;
  loadType?: ExtraServiceLoadType;
  items: ConverterEstimateItemInput[];
  originFloor: number;
  destinationFloor: number;
  buildingElevator: boolean;
  externalLift: boolean;
  specialItems?: string[];
}

export interface EstimateConverterResponse {
  estimatedVolumeMin: number;
  estimatedVolumeMax: number;
  recommendedVehicle: 'panelvan' | 'short_chassis_van' | 'long_chassis_van' | 'small_truck' | 'large_truck';
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
  summaryText: string;
  manualReviewRecommended: boolean;
  suggestedExtraServiceIds: string[];
}

const parseApiJson = async (response: Response): Promise<any> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

export async function createConverterSession(): Promise<CreateConverterSessionResponse> {
  const response = await apiClient('/converter/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flowType: 'household' }),
  });

  const json = await parseApiJson(response);
  if (!response.ok || !json?.success || !json?.data?.sessionId) {
    throw new Error(json?.message || 'Converter oturumu başlatılamadı.');
  }

  return json.data as CreateConverterSessionResponse;
}

export async function estimateConverter(
  sessionId: string,
  payload: EstimateConverterRequest,
): Promise<EstimateConverterResponse> {
  const response = await apiClient(`/converter/sessions/${sessionId}/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = await parseApiJson(response);
  if (!response.ok || !json?.success || !json?.data) {
    throw new Error(json?.message || 'Converter tahmini alınamadı.');
  }

  return json.data as EstimateConverterResponse;
}
