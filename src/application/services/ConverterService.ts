import { AppDataSource } from '../../infrastructure/database/data-source';
import {
  ConverterAnswer,
  ConverterConfidence,
  ConverterFlowType,
  ConverterItemCatalog,
  ConverterRecommendedVehicle,
  ConverterResult,
  ConverterSession,
  ConverterSessionStatus,
  ConverterVehicleRule,
  ExtraService,
  ExtraServiceLoadType,
  Shipment,
  ShipmentStatus,
  VehicleType,
} from '../../domain/entities';
import {
  ApplyConverterToShipmentRequestDto,
  ApplyConverterToShipmentResponseDto,
  CreateConverterSessionRequestDto,
  EstimateConverterRequestDto,
  EstimateConverterResponseDto,
  GetConverterResultResponseDto,
} from '../dto';
import { CONVERTER_TO_VEHICLE_TYPE_NAME } from './converter/vehicleTypeMapping';

const roundDown1 = (value: number): number => Math.floor(value * 10) / 10;
const roundUp1 = (value: number): number => Math.ceil(value * 10) / 10;
const EDITABLE_SHIPMENT_STATUSES = new Set<ShipmentStatus>([
  ShipmentStatus.PENDING,
  ShipmentStatus.OFFER_RECEIVED,
]);

export class ConverterService {
  private sessionRepo = AppDataSource.getRepository(ConverterSession);
  private answerRepo = AppDataSource.getRepository(ConverterAnswer);
  private resultRepo = AppDataSource.getRepository(ConverterResult);
  private catalogRepo = AppDataSource.getRepository(ConverterItemCatalog);
  private vehicleRuleRepo = AppDataSource.getRepository(ConverterVehicleRule);
  private shipmentRepo = AppDataSource.getRepository(Shipment);
  private vehicleTypeRepo = AppDataSource.getRepository(VehicleType);
  private extraServiceRepo = AppDataSource.getRepository(ExtraService);

  private inferConverterLoadType(payload: Pick<EstimateConverterRequestDto, 'loadType' | 'moveType'>): ExtraServiceLoadType {
    if (payload.loadType) {
      return payload.loadType as ExtraServiceLoadType;
    }

    return payload.moveType === 'partial_load'
      ? ExtraServiceLoadType.PARTIAL
      : ExtraServiceLoadType.HOME;
  }

  private async buildSuggestedExtraServiceIds(
    payload: EstimateConverterRequestDto,
    estimatedVolumeMax: number,
  ): Promise<string[]> {
    const loadType = this.inferConverterLoadType(payload);
    const suggestedNames = new Set<string>();
    const totalItemCount = payload.items.reduce((sum, item) => sum + item.quantity, 0);
    const highFloorWithoutLift = Math.max(payload.originFloor, payload.destinationFloor) >= 4
      && !payload.buildingElevator
      && !payload.externalLift;

    if (highFloorWithoutLift && [ExtraServiceLoadType.HOME, ExtraServiceLoadType.OFFICE].includes(loadType)) {
      suggestedNames.add('Asansörlü Taşıma');
      suggestedNames.add('Kat arası taşıma');
    }

    if ((payload.specialItems?.length ?? 0) > 0 || totalItemCount >= 8 || estimatedVolumeMax >= 20) {
      suggestedNames.add('Profesyonel Paketleme');
    }

    if (loadType === ExtraServiceLoadType.OFFICE) {
      suggestedNames.add('Server/IT özel taşıma');
    }

    if (suggestedNames.size === 0) {
      return [];
    }

    const services = await this.extraServiceRepo
      .createQueryBuilder('extraService')
      .innerJoin('extraService.applicabilityRules', 'applicability', 'applicability.loadType = :loadType', { loadType })
      .where('extraService.status = :status', { status: 'ACTIVE' })
      .andWhere('extraService.name IN (:...names)', { names: Array.from(suggestedNames) })
      .orderBy('applicability.sortOrder', 'ASC')
      .addOrderBy('extraService.sortOrder', 'ASC')
      .getMany();

    return services.map((service) => service.id);
  }

  async createSession(userId: string | null, payload: CreateConverterSessionRequestDto) {
    const session: ConverterSession = this.sessionRepo.create({
      userId,
      flowType: payload.flowType as ConverterFlowType,
      status: ConverterSessionStatus.DRAFT,
      shipmentId: null,
    } as Partial<ConverterSession>);

    const saved: ConverterSession = await this.sessionRepo.save(session);
    return {
      sessionId: saved.id,
      status: saved.status,
      createdAt: saved.createdAt,
    };
  }

  async estimate(sessionId: string, userId: string | null, payload: EstimateConverterRequestDto): Promise<EstimateConverterResponseDto> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      const error = new Error('Converter oturumu bulunamadı.');
      (error as any).statusCode = 404;
      throw error;
    }

    if (session.userId && userId && session.userId !== userId) {
      const error = new Error('Bu converter oturumuna erişim yetkiniz yok.');
      (error as any).statusCode = 403;
      throw error;
    }

    const requestedCodes = payload.items.map((item) => item.itemCode);
    const catalogItems = requestedCodes.length > 0
      ? await this.catalogRepo.find({ where: requestedCodes.map((itemCode) => ({ itemCode, isActive: true })) })
      : [];
    const catalogMap = new Map(catalogItems.map((item) => [item.itemCode, item]));

    const missingCodes = requestedCodes.filter((code) => !catalogMap.has(code));
    if (missingCodes.length > 0) {
      const error = new Error(`Aktif katalogda bulunamayan itemCode değerleri: ${missingCodes.join(', ')}`);
      (error as any).statusCode = 400;
      throw error;
    }

    let totalMin = 0;
    let totalMax = 0;
    for (const item of payload.items) {
      const catalogItem = catalogMap.get(item.itemCode)!;
      totalMin += catalogItem.unitVolumeMin * item.quantity;
      totalMax += catalogItem.unitVolumeMax * item.quantity;
    }

    const estimatedVolumeMin = roundDown1(totalMin);
    const estimatedVolumeMax = roundUp1(totalMax);

    const warnings: string[] = [];
    const specialItems = Array.isArray(payload.specialItems) ? payload.specialItems : [];
    const activeRules = await this.vehicleRuleRepo.find({ where: { isActive: true }, order: { priority: 'ASC' } });
    if (activeRules.length === 0) {
      const error = new Error('Aktif converter araç kuralları bulunamadı.');
      (error as any).statusCode = 500;
      throw error;
    }

    let selectedRule = activeRules.find(
      (rule) => estimatedVolumeMax >= rule.volumeMin && estimatedVolumeMax < rule.volumeMax,
    ) ?? activeRules[activeRules.length - 1];

    const currentIndex = activeRules.findIndex((rule) => rule.vehicleCode === selectedRule.vehicleCode);
    const thresholdSpan = selectedRule.volumeMax - selectedRule.volumeMin;
    const nearThreshold = thresholdSpan > 0
      && selectedRule.nearThresholdOverride
      && estimatedVolumeMax >= selectedRule.volumeMin + thresholdSpan * 0.9;
    const hasSpecialItems = specialItems.length > 0;

    if ((nearThreshold || hasSpecialItems) && currentIndex >= 0 && currentIndex < activeRules.length - 1) {
      selectedRule = activeRules[currentIndex + 1];
      if (hasSpecialItems) {
        warnings.push('Özel eşya seçildiği için daha geniş araç önerildi.');
      }
      if (nearThreshold) {
        warnings.push('Hacim üst sınıra yakın olduğu için bir üst araç sınıfı önerildi.');
      }
    }

    const hasFloors = typeof payload.originFloor === 'number' && typeof payload.destinationFloor === 'number';
    const hasElevatorInfo = typeof payload.buildingElevator === 'boolean' && typeof payload.externalLift === 'boolean';
    const hasEnoughItems = payload.items.reduce((sum, item) => sum + item.quantity, 0) >= 5;
    const hasProperty = payload.propertyType !== 'unknown';

    let confidence: ConverterConfidence = ConverterConfidence.LOW;
    if (hasProperty && hasEnoughItems && hasFloors && hasElevatorInfo) {
      confidence = ConverterConfidence.HIGH;
    } else if ((hasProperty && hasEnoughItems) || (hasFloors && hasElevatorInfo)) {
      confidence = ConverterConfidence.MEDIUM;
    }

    if (payload.items.length === 0 || !hasProperty) {
      warnings.push('Girilen veri sınırlı olduğu için sonuç düşük güven seviyesindedir.');
    }

    const manualReviewRecommended = confidence === ConverterConfidence.LOW && (hasSpecialItems || payload.items.length < 2);
    const summaryText = `Tahmini hacim bandı ${estimatedVolumeMin}-${estimatedVolumeMax} m3 aralığında görünüyor. Nihai planlama keşif ve taşıyıcı değerlendirmesiyle netleşir.`;

    const suggestedExtraServiceIds = await this.buildSuggestedExtraServiceIds(payload, estimatedVolumeMax);
    let answer = await this.answerRepo.findOne({ where: { sessionId: session.id } });
    if (!answer) {
      answer = this.answerRepo.create({ sessionId: session.id } as Partial<ConverterAnswer>);
    }
    answer.moveType = payload.moveType as any;
    answer.propertyType = payload.propertyType as any;
    answer.originFloor = payload.originFloor;
    answer.destinationFloor = payload.destinationFloor;
    answer.buildingElevator = payload.buildingElevator;
    answer.externalLift = payload.externalLift;
    answer.specialItemsJson = specialItems;
    answer.rawAnswersJson = payload as unknown as Record<string, unknown>;
    await this.answerRepo.save(answer);

    let result = await this.resultRepo.findOne({ where: { sessionId: session.id } });
    if (!result) {
      result = this.resultRepo.create({ sessionId: session.id } as Partial<ConverterResult>);
    }
    result.estimatedVolumeMin = estimatedVolumeMin;
    result.estimatedVolumeMax = estimatedVolumeMax;
    result.recommendedVehicle = selectedRule.vehicleCode as ConverterRecommendedVehicle;
    result.confidence = confidence;
    result.warningsJson = warnings;
    result.summaryText = summaryText;
    result.manualReviewRecommended = manualReviewRecommended;
    await this.resultRepo.save(result);

    session.status = ConverterSessionStatus.ESTIMATED;
    if (!session.userId && userId) {
      session.userId = userId;
    }
    await this.sessionRepo.save(session);

    return {
      estimatedVolumeMin,
      estimatedVolumeMax,
      recommendedVehicle: result.recommendedVehicle,
      confidence,
      warnings,
      summaryText,
      manualReviewRecommended,
      suggestedExtraServiceIds,
    };
  }

  async getResult(sessionId: string, userId: string | null): Promise<GetConverterResultResponseDto> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      const error = new Error('Converter oturumu bulunamadı.');
      (error as any).statusCode = 404;
      throw error;
    }

    if (session.userId && userId && session.userId !== userId) {
      const error = new Error('Bu converter oturumuna erişim yetkiniz yok.');
      (error as any).statusCode = 403;
      throw error;
    }

    const [answer, result] = await Promise.all([
      this.answerRepo.findOne({ where: { sessionId: session.id } }),
      this.resultRepo.findOne({ where: { sessionId: session.id } }),
    ]);

    const answerPayload = (answer?.rawAnswersJson ?? null) as EstimateConverterRequestDto | null;
    const suggestedExtraServiceIds = answerPayload && result
      ? await this.buildSuggestedExtraServiceIds(answerPayload, result.estimatedVolumeMax ?? 0)
      : [];

    return {
      session: {
        sessionId: session.id,
        flowType: session.flowType,
        status: session.status,
        shipmentId: session.shipmentId,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      answer: answer
        ? {
            moveType: answer.moveType,
            propertyType: answer.propertyType,
            originFloor: answer.originFloor,
            destinationFloor: answer.destinationFloor,
            buildingElevator: answer.buildingElevator,
            externalLift: answer.externalLift,
            specialItems: answer.specialItemsJson ?? [],
          }
        : null,
      result: result
        ? {
            estimatedVolumeMin: result.estimatedVolumeMin ?? 0,
            estimatedVolumeMax: result.estimatedVolumeMax ?? 0,
            recommendedVehicle: (result.recommendedVehicle ?? 'panelvan') as any,
            confidence: (result.confidence ?? 'low') as any,
            warnings: result.warningsJson ?? [],
            summaryText: result.summaryText ?? '',
            manualReviewRecommended: result.manualReviewRecommended,
            suggestedExtraServiceIds,
            status: session.status,
          }
        : null,
    };
  }

  async applyToShipment(
    sessionId: string,
    userId: string | null,
    payload: ApplyConverterToShipmentRequestDto,
  ): Promise<ApplyConverterToShipmentResponseDto> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      const error = new Error('Converter oturumu bulunamadı.');
      (error as any).statusCode = 404;
      throw error;
    }

    if (!session.userId || !userId || session.userId !== userId) {
      const error = new Error('Bu converter oturumuna erişim yetkiniz yok.');
      (error as any).statusCode = 403;
      throw error;
    }

    const [shipment, answer, result] = await Promise.all([
      this.shipmentRepo.findOne({ where: { id: payload.shipmentId, customerId: userId } }),
      this.answerRepo.findOne({ where: { sessionId: session.id } }),
      this.resultRepo.findOne({ where: { sessionId: session.id } }),
    ]);

    if (!shipment) {
      const error = new Error('Shipment bulunamadı.');
      (error as any).statusCode = 404;
      throw error;
    }

    if (!EDITABLE_SHIPMENT_STATUSES.has(shipment.status)) {
      const error = new Error('Bu shipment durumunda converter apply işlemi yapılamaz.');
      (error as any).statusCode = 409;
      throw error;
    }

    if (!result) {
      const error = new Error('Apply için önce estimate sonucu oluşturulmalıdır.');
      (error as any).statusCode = 409;
      throw error;
    }

    if (session.shipmentId && session.shipmentId !== shipment.id) {
      const error = new Error('Bu converter oturumu başka bir shipment için zaten uygulanmış.');
      (error as any).statusCode = 409;
      throw error;
    }

    const vehicleTypeName = result.recommendedVehicle
      ? CONVERTER_TO_VEHICLE_TYPE_NAME[result.recommendedVehicle]
      : undefined;
    const vehicleType = vehicleTypeName
      ? await this.vehicleTypeRepo.findOne({ where: { name: vehicleTypeName } })
      : null;

    const updatedFields: string[] = [];
    const skippedFields: string[] = [];

    const applyIfEmpty = <T>(field: string, currentValue: T | null | undefined, nextValue: T | null | undefined, setter: (value: T) => void) => {
      const isEmpty = currentValue === null || currentValue === undefined || currentValue === '';
      const hasValue = nextValue !== null && nextValue !== undefined && nextValue !== '';
      if (isEmpty && hasValue) {
        setter(nextValue as T);
        updatedFields.push(field);
        return;
      }
      skippedFields.push(field);
    };

    applyIfEmpty('estimatedWeight', shipment.estimatedWeight, result.estimatedVolumeMax, (value) => {
      shipment.estimatedWeight = Number(value);
    });
    applyIfEmpty('loadDetails', shipment.loadDetails, result.summaryText, (value) => {
      shipment.loadDetails = value;
    });
    applyIfEmpty('vehicleTypePreferenceId', shipment.vehicleTypePreferenceId, vehicleType?.id, (value) => {
      shipment.vehicleTypePreferenceId = value;
    });
    applyIfEmpty('converterEstimatedVolumeMin', shipment.converterEstimatedVolumeMin, result.estimatedVolumeMin, (value) => {
      shipment.converterEstimatedVolumeMin = Number(value);
    });
    applyIfEmpty('converterEstimatedVolumeMax', shipment.converterEstimatedVolumeMax, result.estimatedVolumeMax, (value) => {
      shipment.converterEstimatedVolumeMax = Number(value);
    });
    applyIfEmpty('converterRecommendedVehicleCode', shipment.converterRecommendedVehicleCode, result.recommendedVehicle, (value) => {
      shipment.converterRecommendedVehicleCode = value;
    });
    applyIfEmpty('converterSpecialItemsJson', shipment.converterSpecialItemsJson, answer?.specialItemsJson ?? [], (value) => {
      shipment.converterSpecialItemsJson = value;
    });
    applyIfEmpty('converterSessionId', shipment.converterSessionId, session.id, (value) => {
      shipment.converterSessionId = value;
    });

    const isAlreadyAppliedToSameShipment = session.status === ConverterSessionStatus.APPLIED
      && session.shipmentId === shipment.id
      && !!shipment.converterAppliedAt;

    if (updatedFields.length === 0 && isAlreadyAppliedToSameShipment) {
      return {
        shipmentId: shipment.id,
        sessionId: session.id,
        applied: true,
        idempotent: true,
        updatedFields,
        skippedFields,
        appliedAt: shipment.converterAppliedAt,
      };
    }

    const appliedAt = shipment.converterAppliedAt ?? new Date();
    shipment.converterAppliedAt = appliedAt;
    shipment.converterLastAppliedBy = userId;
    if (!updatedFields.includes('converterAppliedAt')) {
      updatedFields.push('converterAppliedAt');
    }
    if (!updatedFields.includes('converterLastAppliedBy')) {
      updatedFields.push('converterLastAppliedBy');
    }

    session.shipmentId = shipment.id;
    session.status = ConverterSessionStatus.APPLIED;
    result.appliedToShipmentAt = appliedAt;

    await Promise.all([
      this.shipmentRepo.save(shipment),
      this.sessionRepo.save(session),
      this.resultRepo.save(result),
    ]);

    return {
      shipmentId: shipment.id,
      sessionId: session.id,
      applied: true,
      idempotent: false,
      updatedFields,
      skippedFields,
      appliedAt,
    };
  }
}


