import fs from 'node:fs';
import path from 'node:path';
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

  private resolveStoredUpload(fileUrl?: string): { fileUrl: string; filePath: string } | null {
    const normalizedUrl = `/${String(fileUrl || '').trim().replace(/^\/+/, '').replace(/\\/g, '/')}`;
    if (!normalizedUrl.startsWith('/uploads/')) {
      return null;
    }

    const uploadsRoot = path.resolve(process.cwd(), 'uploads');
    const resolvedPath = path.resolve(process.cwd(), normalizedUrl.replace(/^\//, ''));
    if (!resolvedPath.startsWith(uploadsRoot + path.sep) && resolvedPath !== uploadsRoot) {
      return null;
    }

    return { fileUrl: normalizedUrl, filePath: resolvedPath };
  }

  async saveDocumentsDraft(carrierId: string, docs: DocumentInput[]) {
    const entries = Array.isArray(docs) ? docs : [];

    for (const doc of entries) {
      const type = this.normalizeType(doc.type);
      const fileUrl = doc.fileUrl?.trim();
      if (!type || !fileUrl) continue;

      const storedUpload = this.resolveStoredUpload(fileUrl);
      if (!storedUpload || !fs.existsSync(storedUpload.filePath)) {
        throw new Error('Geçersiz belge dosyası. Lütfen dosyayı yeniden yükleyin.');
      }

      if (type === CarrierDocumentType.VEHICLE_LICENSE) {
        await this.carrierDocumentRepo.addVehicleLicenseDocument(carrierId, storedUpload.fileUrl);
      } else {
        const isRequired = this.REQUIRED_TYPES.includes(type);
        await this.carrierDocumentRepo.upsertSingleRequired(carrierId, type, storedUpload.fileUrl, isRequired);
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

  async getDocumentById(carrierId: string, documentId: string) {
    const doc = await this.carrierDocumentRepo.findOwnedById(carrierId, documentId);
    if (!doc) {
      throw new Error('Belge bulunamadı.');
    }
    return doc;
  }

  async deleteDocument(carrierId: string, documentId: string) {
    const deleted = await this.carrierDocumentRepo.deleteOwnedById(carrierId, documentId);
    if (!deleted) {
      throw new Error('Belge bulunamadı.');
    }

    await this.profileStatusService.updateProfileCompletion(carrierId);
    return deleted;
  }
}
