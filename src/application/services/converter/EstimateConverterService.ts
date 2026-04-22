import {
  EstimateConverterRequestDto,
  EstimateConverterResponseDto,
} from '../../dto/converter/ConverterDto';

/**
 * BE-05 scaffold: concrete rule engine implementation will be added in BE-03.
 */
export class EstimateConverterService {
  public estimate(_input: EstimateConverterRequestDto): EstimateConverterResponseDto {
    return {
      estimatedVolumeMin: 0,
      estimatedVolumeMax: 0,
      recommendedVehicle: 'panelvan',
      confidence: 'low',
      warnings: ['Estimate engine scaffold is active; rules are not implemented yet.'],
      summaryText: 'Tahmini hacim bandi kurallari bir sonraki adimda eklenecek.',
      manualReviewRecommended: true,
    };
  }
}
