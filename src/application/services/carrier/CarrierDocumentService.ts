import { CarrierDocumentRepository } from '../../../infrastructure/repositories/CarrierDocumentRepository';
import { CarrierDocument, CarrierDocumentType } from '../../../domain/entities/CarrierDocument';
import { CarrierProfileStatusService } from './CarrierProfileStatusService';

type DocumentInput = { type: string; fileUrl: string };

export class CarrierDocumentService {
  private carrierDocumentRepo = new CarrierDocumentRepository();
  private profileStatusService = new CarrierProfileStatusService();

  private readonly REQUIRED_TYPES: CarrierDocumentType[] = [
    CarrierDocumentType.AUTHORIZATION_CERT,
    CarrierDocumentType.SRC_CERT,
    CarrierDocumentType.VEHICLE_LICENSE,
    CarrierDocumentType.TAX_PLATE
  ];

  private normalizeType(type: string): CarrierDocumentType | null {
    if (!type) return null;
    const normalized = type.trim().toUpperCase();
    return (Object.values(CarrierDocumentType) as string[]).includes(normalized)
      ? (normalized as CarrierDocumentType)
      : null;
  }

  async saveDocumentsDraft(carrierId: string, docs: DocumentInput[]) {
    const entries = Array.isArray(docs) ? docs : [];

    for (const doc of entries) {
      const type = this.normalizeType(doc.type);
      const fileUrl = doc.fileUrl?.trim();
      if (!type || !fileUrl) continue;

      if (type === CarrierDocumentType.VEHICLE_LICENSE) {
        await this.carrierDocumentRepo.addVehicleLicenseDocument(carrierId, fileUrl);
      } else {
        const isRequired = this.REQUIRED_TYPES.includes(type);
        await this.carrierDocumentRepo.upsertSingleRequired(carrierId, type, fileUrl, isRequired);
      }
    }

    const statusByType = await this.carrierDocumentRepo.findRequiredDocumentTypesStatus(carrierId, this.REQUIRED_TYPES);
    const allRequiredHaveDoc = this.REQUIRED_TYPES.every(type => statusByType[type] === true);

    await this.profileStatusService.updateProfileCompletion(carrierId);

    return { allRequiredHaveDoc };
  }

  async getDocumentsForCarrier(carrierId: string) {
    const docs = await this.carrierDocumentRepo.findByCarrierId(carrierId);
    const grouped: Record<string, any> & { vehicleLicenses: CarrierDocument[] } = { vehicleLicenses: [] };

    for (const doc of docs) {
      if (doc.type === CarrierDocumentType.VEHICLE_LICENSE) {
        grouped.vehicleLicenses.push(doc);
      } else {
        grouped[doc.type] = doc;
      }
    }

    return { documents: docs, grouped };
  }
}
