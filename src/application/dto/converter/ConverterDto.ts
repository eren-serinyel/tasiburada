export type ConverterFlowTypeDto = 'household';

export type ConverterMoveTypeDto = 'household' | 'partial_load';

export type ConverterPropertyTypeDto = 'studio' | '1+1' | '2+1' | '3+1' | '4+1_plus' | 'unknown';

export type ConverterConfidenceDto = 'high' | 'medium' | 'low';

export type ConverterRecommendedVehicleDto =
  | 'panelvan'
  | 'short_chassis_van'
  | 'long_chassis_van'
  | 'small_truck'
  | 'large_truck';

export interface ConverterItemInputDto {
  itemCode: string;
  quantity: number;
}

export interface CreateConverterSessionRequestDto {
  flowType: ConverterFlowTypeDto;
}

export interface EstimateConverterRequestDto {
  moveType: ConverterMoveTypeDto;
  propertyType: ConverterPropertyTypeDto;
  items: ConverterItemInputDto[];
  originFloor: number;
  destinationFloor: number;
  buildingElevator: boolean;
  externalLift: boolean;
  specialItems?: string[];
}

export interface EstimateConverterResponseDto {
  estimatedVolumeMin: number;
  estimatedVolumeMax: number;
  recommendedVehicle: ConverterRecommendedVehicleDto;
  confidence: ConverterConfidenceDto;
  warnings: string[];
  summaryText: string;
  manualReviewRecommended: boolean;
}

export interface ConverterSessionSummaryDto {
  sessionId: string;
  flowType: ConverterFlowTypeDto;
  status: 'draft' | 'estimated' | 'applied';
  shipmentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConverterAnswerSummaryDto {
  moveType: ConverterMoveTypeDto;
  propertyType: ConverterPropertyTypeDto;
  originFloor: number | null;
  destinationFloor: number | null;
  buildingElevator: boolean | null;
  externalLift: boolean | null;
  specialItems: string[];
}

export interface GetConverterResultResponseDto {
  session: ConverterSessionSummaryDto;
  answer: ConverterAnswerSummaryDto | null;
  result: (EstimateConverterResponseDto & {
    status: 'draft' | 'estimated' | 'applied';
  }) | null;
}
