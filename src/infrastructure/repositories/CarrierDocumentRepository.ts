import { BaseRepository } from './BaseRepository';
import { CarrierDocument, CarrierDocumentStatus, CarrierDocumentType } from '../../domain/entities/CarrierDocument';

export class CarrierDocumentRepository extends BaseRepository<CarrierDocument> {
  constructor() {
    super(CarrierDocument);
  }

  async findByCarrierId(carrierId: string): Promise<CarrierDocument[]> {
    return this.repository.find({ where: { carrierId }, order: { createdAt: 'DESC' } as any });
  }

  async upsertSingleRequired(carrierId: string, type: string, fileUrl: string, isRequired: boolean): Promise<CarrierDocument> {
    const normalizedType = type as CarrierDocumentType;
    const existing = await this.repository.findOne({ where: { carrierId, type: normalizedType } });
    const payload: Partial<CarrierDocument> = {
      carrierId,
      type: normalizedType,
      fileUrl,
      isRequired,
      status: CarrierDocumentStatus.PENDING,
      isApproved: false,
      uploadedAt: new Date()
    };

    if (existing) {
      Object.assign(existing, payload);
      return this.repository.save(existing);
    }

    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  async addVehicleLicenseDocument(carrierId: string, fileUrl: string): Promise<CarrierDocument> {
    const entity = this.repository.create({
      carrierId,
      type: CarrierDocumentType.VEHICLE_LICENSE,
      fileUrl,
      isRequired: true,
      status: CarrierDocumentStatus.PENDING,
      isApproved: false,
      uploadedAt: new Date()
    });
    return this.repository.save(entity);
  }

  async findRequiredDocumentTypesStatus(carrierId: string, requiredTypes: string[]): Promise<Record<string, boolean>> {
    const normalized = (requiredTypes || []).filter(Boolean);
    const statusMap: Record<string, boolean> = {};
    normalized.forEach(type => { statusMap[type] = false; });
    if (!normalized.length) {
      return statusMap;
    }

    const rows = await this.repository.createQueryBuilder('doc')
      .select('doc.type', 'type')
      .where('doc.carrierId = :carrierId', { carrierId })
      .andWhere('doc.type IN (:...types)', { types: normalized })
      .andWhere("doc.fileUrl IS NOT NULL AND doc.fileUrl <> ''")
      .getRawMany<{ type: string }>();

    rows.forEach(row => {
      if (row?.type) {
        statusMap[row.type] = true;
      }
    });

    return statusMap;
  }
}
