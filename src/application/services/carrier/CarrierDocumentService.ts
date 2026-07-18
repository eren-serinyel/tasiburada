import fs from 'node:fs';
import path from 'node:path';
import { CarrierDocumentRepository } from '../../../infrastructure/repositories/CarrierDocumentRepository';
import { CarrierDocument, CarrierDocumentType } from '../../../domain/entities/CarrierDocument';
import { CarrierProfileStatusService } from './CarrierProfileStatusService';

type DocumentInput = { type: string; fileUrl: string };

const DOCUMENT_TYPE_ALIASES: Record<string, CarrierDocumentType> = {
  K_BELGESI: CarrierDocumentType.AUTHORIZATION_CERT,
  SRC: CarrierDocumentType.SRC_CERT,
  RUHSAT: CarrierDocumentType.VEHICLE_LICENSE,
  VERGI_LEVHASI: CarrierDocumentType.TAX_PLATE,
  SIGORTA: CarrierDocumentType.INSURANCE_POLICY,
};

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
    if (DOCUMENT_TYPE_ALIASES[normalized]) {
      return DOCUMENT_TYPE_ALIASES[normalized];
    }
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

  private toPublicDocument(doc: CarrierDocument): CarrierDocument & { storageUrl: string; downloadUrl: string } {
    const publicUrl = `/api/v1/carriers/documents/${doc.id}`;
    return {
      ...(doc as any),
      storageUrl: doc.fileUrl,
      fileUrl: publicUrl,
      downloadUrl: `${publicUrl}?download=1`,
    };
  }

  async saveDocumentsDraft(carrierId: string, docs: DocumentInput[]) {
    const entries = Array.isArray(docs) ? docs : [];
    if (entries.length === 0) {
      throw new Error('En az bir belge yüklemelisiniz.');
    }
    const savedDocuments: CarrierDocument[] = [];

    for (const doc of entries) {
      const type = this.normalizeType(doc.type);
      const fileUrl = doc.fileUrl?.trim();
      if (!type) {
        throw new Error(`Desteklenmeyen belge tipi: ${doc.type || '(boş)'}.`);
      }
      if (!fileUrl) {
        throw new Error('Belge dosyası zorunludur.');
      }

      const storedUpload = this.resolveStoredUpload(fileUrl);
      if (!storedUpload || !fs.existsSync(storedUpload.filePath)) {
        throw new Error('Geçersiz belge dosyası. Lütfen dosyayı yeniden yükleyin.');
      }

      if (type === CarrierDocumentType.VEHICLE_LICENSE) {
        savedDocuments.push(await this.carrierDocumentRepo.addVehicleLicenseDocument(carrierId, storedUpload.fileUrl));
      } else {
        const isRequired = this.REQUIRED_TYPES.includes(type);
        savedDocuments.push(await this.carrierDocumentRepo.upsertSingleRequired(carrierId, type, storedUpload.fileUrl, isRequired));
      }
    }

    const statusByType = await this.carrierDocumentRepo.findRequiredDocumentTypesStatus(carrierId, this.REQUIRED_TYPES);
    const allRequiredHaveDoc = this.REQUIRED_TYPES.every(type => statusByType[type] === true);

    await this.profileStatusService.updateProfileCompletion(carrierId);

    return {
      allRequiredHaveDoc,
      documents: savedDocuments.map((doc) => this.toPublicDocument(doc)),
    };
  }

  async getDocumentsForCarrier(carrierId: string) {
    const docs = await this.carrierDocumentRepo.findByCarrierId(carrierId);
    const grouped: Record<string, any> & { vehicleLicenses: CarrierDocument[] } = { vehicleLicenses: [] };

    for (const doc of docs) {
      if (doc.type === CarrierDocumentType.VEHICLE_LICENSE) {
        grouped.vehicleLicenses.push(this.toPublicDocument(doc));
      } else {
        grouped[doc.type] = this.toPublicDocument(doc);
      }
    }

    return { documents: docs.map((doc) => this.toPublicDocument(doc)), grouped };
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
