import {
  AuxiliaryCarrierProfileSection,
  CarrierProfileStatus,
  CoreCarrierProfileSection
} from '../../../domain/entities/CarrierProfileStatus';
import { CarrierProfileStatusRepository } from '../../../infrastructure/repositories/CarrierProfileStatusRepository';
import { CarrierRepository } from '../../../infrastructure/repositories/CarrierRepository';
import { CarrierVehicleTypeRepository } from '../../../infrastructure/repositories/CarrierVehicleTypeRepository';
import { CarrierServiceTypeRepository } from '../../../infrastructure/repositories/CarrierServiceTypeRepository';
import { CarrierActivityRepository } from '../../../infrastructure/repositories/CarrierActivityRepository';
import { CarrierEarningsRepository } from '../../../infrastructure/repositories/CarrierEarningsRepository';
import { CarrierDocumentRepository } from '../../../infrastructure/repositories/CarrierDocumentRepository';
import { CarrierDocumentType } from '../../../domain/entities/CarrierDocument';

const CORE_SECTION_COLUMN_MAP: Record<CoreCarrierProfileSection, keyof CarrierProfileStatus> = {
  company: 'companyInfoCompleted',
  activity: 'activityInfoCompleted',
  documents: 'documentsCompleted',
  earnings: 'earningsCompleted'
};

const AUX_SECTION_COLUMN_MAP: Record<AuxiliaryCarrierProfileSection, keyof CarrierProfileStatus> = {
  vehicles: 'vehiclesCompleted',
  security: 'securityCompleted',
  notifications: 'notificationsCompleted'
};

const CORE_SECTIONS = Object.keys(CORE_SECTION_COLUMN_MAP) as CoreCarrierProfileSection[];

export class CarrierProfileStatusService {
  private repository = new CarrierProfileStatusRepository();
  private carrierRepository = new CarrierRepository();
  private vehicleTypeRepository = new CarrierVehicleTypeRepository();
  private serviceTypeRepository = new CarrierServiceTypeRepository();
  private activityRepository = new CarrierActivityRepository();
  private earningsRepository = new CarrierEarningsRepository();
  private documentRepository = new CarrierDocumentRepository();

  private readonly REQUIRED_DOCUMENT_TYPES: CarrierDocumentType[] = [
    CarrierDocumentType.AUTHORIZATION_CERT,
    CarrierDocumentType.SRC_CERT,
    CarrierDocumentType.VEHICLE_LICENSE,
    CarrierDocumentType.TAX_PLATE
  ];

  async getOrCreate(carrierId: string): Promise<CarrierProfileStatus> {
    const existing = await this.repository.findByCarrierId(carrierId);
    if (existing) return existing;
    return this.createInitialStatus(carrierId);
  }

  async createInitialStatus(carrierId: string): Promise<CarrierProfileStatus> {
    const status = await this.repository.create({
      carrierId,
      companyInfoCompleted: false,
      activityInfoCompleted: false,
      documentsCompleted: false,
      earningsCompleted: false,
      vehiclesCompleted: false,
      securityCompleted: false,
      notificationsCompleted: false,
      overallPercentage: 0
    });
    await this.carrierRepository.update(carrierId, { profileCompletion: status.overallPercentage } as any);
    return status;
  }

  /**
   * Profil tamamlanma yüzdesini (4 çekirdek bölüm x %25) kriterlere göre hesaplar,
   * carrier_profile_status ve carriers.profileCompletion alanlarını günceller.
   */
  async updateProfileCompletion(carrierId: string): Promise<CarrierProfileStatus> {
    const status = await this.getOrCreate(carrierId);

    const [carrier, activity, earnings, requiredDocStatus] = await Promise.all([
      this.carrierRepository.findById(carrierId, { relations: [] } as any),
      this.activityRepository.findByCarrierId(carrierId),
      this.earningsRepository.findByCarrierId(carrierId),
      this.documentRepository.findRequiredDocumentTypesStatus(carrierId, this.REQUIRED_DOCUMENT_TYPES)
    ]);

    if (!carrier) {
      throw new Error('Nakliyeci bulunamadı.');
    }

    // 1) Firma Bilgileri tamam → companyName, taxNumber, foundedYear doluysa
    const companyInfoCompleted =
      this.hasText(carrier.companyName) &&
      this.hasText(carrier.taxNumber) &&
      Number.isFinite(Number(carrier.foundedYear)) &&
      Number(carrier.foundedYear) > 0;

    // 2) Faaliyet Bilgileri tamam → activityCity, activityDistrict, serviceAreas doluysa
    const serviceAreas = this.parseStringArray((activity as any)?.serviceAreasJson);
    const activityInfoCompleted =
      this.hasText(activity?.city) &&
      this.hasText(activity?.district) &&
      serviceAreas.length > 0;

    // 3) Belgeler tamam → zorunlu belgeler (K1/K2, SRC, Ruhsat, Vergi Levhası) yüklenmişse
    const documentsCompleted = this.REQUIRED_DOCUMENT_TYPES.every(type => requiredDocStatus[type] === true);

    // 4) Kazanç Bilgileri tamam → bankName, iban doluysa
    const earningsCompleted = this.hasText((earnings as any)?.bankName) && this.hasText((earnings as any)?.iban);

    console.log(`Profile Calc [${carrierId}]: Company=${companyInfoCompleted}, Activity=${activityInfoCompleted} (Areas:${serviceAreas.length}), Docs=${documentsCompleted}, Earnings=${earningsCompleted}`);

    status.companyInfoCompleted = companyInfoCompleted;
    status.activityInfoCompleted = activityInfoCompleted;
    status.documentsCompleted = documentsCompleted;
    status.earningsCompleted = earningsCompleted;

    status.overallPercentage = this.calculatePercentage(status);

    await this.repository.save(status);
    await this.carrierRepository.update(carrierId, { profileCompletion: status.overallPercentage } as any);

    return status;
  }

  async updateSectionCompleted(carrierId: string, section: CoreCarrierProfileSection, completed: boolean = true): Promise<CarrierProfileStatus> {
    const status = await this.getOrCreate(carrierId);
    const columnKey = CORE_SECTION_COLUMN_MAP[section];
    if (!columnKey) {
      throw new Error(`Desteklenmeyen çekirdek profil bölümü: ${section}`);
    }
    (status as any)[columnKey] = completed;
    status.overallPercentage = this.calculatePercentage(status);
    await this.repository.save(status);
    await this.carrierRepository.update(carrierId, { profileCompletion: status.overallPercentage } as any);
    return status;
  }

  async updateAuxSectionCompleted(carrierId: string, section: AuxiliaryCarrierProfileSection, completed: boolean = true): Promise<CarrierProfileStatus> {
    const status = await this.getOrCreate(carrierId);
    const columnKey = AUX_SECTION_COLUMN_MAP[section];
    if (!columnKey) {
      throw new Error(`Desteklenmeyen ek profil bölümü: ${section}`);
    }
    (status as any)[columnKey] = completed;
    return this.repository.save(status);
  }

  async getStatusSummary(carrierId: string) {
    const status = await this.updateProfileCompletion(carrierId);
    const completedSectionsCount = this.getCompletedCoreSectionsCount(status);
    const completedSections = CORE_SECTIONS.filter(section => {
      const key = CORE_SECTION_COLUMN_MAP[section];
      return Boolean((status as any)[key]);
    });
    return {
      overallPercentage: status.overallPercentage,
      completedSectionsCount,
      totalSections: CORE_SECTIONS.length,
      completedSections,
      sections: {
        companyInfoCompleted: status.companyInfoCompleted,
        activityInfoCompleted: status.activityInfoCompleted,
        documentsCompleted: status.documentsCompleted,
        earningsCompleted: status.earningsCompleted
      }
    };
  }

  async syncVehiclesCompletion(carrierId: string): Promise<CarrierProfileStatus> {
    const [vehicleTypeCount, serviceTypeCount] = await Promise.all([
      this.vehicleTypeRepository.countByCarrierId(carrierId),
      this.serviceTypeRepository.countByCarrierId(carrierId)
    ]);
    const completed = vehicleTypeCount > 0 && serviceTypeCount > 0;
    return this.updateAuxSectionCompleted(carrierId, 'vehicles', completed);
  }

  private calculatePercentage(status: CarrierProfileStatus): number {
    const completedCount = this.getCompletedCoreSectionsCount(status);
    const percentage = completedCount * 25;
    return Math.min(100, Math.max(0, percentage));
  }

  private getCompletedCoreSectionsCount(status: CarrierProfileStatus): number {
    return CORE_SECTIONS.reduce((acc, section) => {
      const key = CORE_SECTION_COLUMN_MAP[section];
      return (status as any)[key] ? acc + 1 : acc;
    }, 0);
  }

  private hasText(value: unknown): boolean {
    return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;
  }

  private parseStringArray(raw: unknown): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(v => String(v).trim()).filter(Boolean);
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(v => String(v).trim()).filter(Boolean) : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}
