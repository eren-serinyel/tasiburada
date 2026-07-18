import {
  AuxiliaryCarrierProfileSection,
  CarrierProfileStatus,
  CoreCarrierProfileSection
} from '../../../domain/entities/CarrierProfileStatus';
import { CarrierProfileStatusRepository } from '../../../infrastructure/repositories/CarrierProfileStatusRepository';
import { CarrierApprovalService } from './CarrierApprovalService';
import { calculateApprovalProfilePercentage } from './CarrierApprovalCriteria';

const CORE_SECTION_COLUMN_MAP: Record<CoreCarrierProfileSection, keyof CarrierProfileStatus> = {
  company: 'companyInfoCompleted',
  activity: 'activityInfoCompleted',
  services: 'servicesCompleted',
  documents: 'documentsCompleted',
  vehicles: 'vehiclesCompleted',
  earnings: 'earningsCompleted'
};

const AUX_SECTION_COLUMN_MAP: Record<AuxiliaryCarrierProfileSection, keyof CarrierProfileStatus> = {
  security: 'securityCompleted',
  notifications: 'notificationsCompleted'
};

const CORE_SECTIONS = Object.keys(CORE_SECTION_COLUMN_MAP) as CoreCarrierProfileSection[];

export class CarrierProfileStatusService {
  private repository = new CarrierProfileStatusRepository();
  private approvalService = new CarrierApprovalService();

  async getOrCreate(carrierId: string): Promise<CarrierProfileStatus> {
    const existing = await this.repository.findByCarrierId(carrierId);
    if (existing) return existing;
    try {
      return await this.createInitialStatus(carrierId);
    } catch (err: any) {
      // FK constraint or insert error — return in-memory default without saving
      console.error('createInitialStatus failed (FK constraint?):', err.message);
      return this.buildDefaultStatus(carrierId);
    }
  }

  private buildDefaultStatus(carrierId: string): CarrierProfileStatus {
    const s = new CarrierProfileStatus();
    s.carrierId = carrierId;
    s.companyInfoCompleted = false;
    s.activityInfoCompleted = false;
    s.servicesCompleted = false;
    s.documentsCompleted = false;
    s.earningsCompleted = false;
    s.vehiclesCompleted = false;
    s.securityCompleted = false;
    s.notificationsCompleted = false;
    s.overallPercentage = 0;
    return s;
  }

  async createInitialStatus(carrierId: string): Promise<CarrierProfileStatus> {
    const status = await this.repository.create({
      carrierId,
      companyInfoCompleted: false,
      activityInfoCompleted: false,
      servicesCompleted: false,
      documentsCompleted: false,
      earningsCompleted: false,
      vehiclesCompleted: false,
      securityCompleted: false,
      notificationsCompleted: false,
      overallPercentage: 0
    });
    return status;
  }

  /**
   * Profil tamamlanma yüzdesini approval ile aynı altı bölüm üzerinden hesaplar,
   * carrier_profile_status projeksiyonuna yazar.
   */
  async updateProfileCompletion(carrierId: string): Promise<CarrierProfileStatus> {
    const status = await this.getOrCreate(carrierId);

    try {
      const readiness = await this.approvalService.getReadiness(carrierId);
      Object.assign(status, readiness.sections);
      status.overallPercentage = calculateApprovalProfilePercentage(readiness.sections);

      await this.repository.save(status);
      return status;
    } catch (error: any) {
      console.error('Profile completion update failed:', error);
      throw new Error(`Profil tamamlanma durumu güncellenemedi: ${error.message}`);
    }
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
        servicesCompleted: status.servicesCompleted,
        documentsCompleted: status.documentsCompleted,
        vehiclesCompleted: status.vehiclesCompleted,
        earningsCompleted: status.earningsCompleted
      }
    };
  }

  async syncVehiclesCompletion(carrierId: string): Promise<CarrierProfileStatus> {
    return this.updateProfileCompletion(carrierId);
  }

  private calculatePercentage(status: CarrierProfileStatus): number {
    const completedCount = this.getCompletedCoreSectionsCount(status);
    const percentage = Math.round((completedCount / CORE_SECTIONS.length) * 100);
    return Math.min(100, Math.max(0, percentage));
  }

  private getCompletedCoreSectionsCount(status: CarrierProfileStatus): number {
    return CORE_SECTIONS.reduce((acc, section) => {
      const key = CORE_SECTION_COLUMN_MAP[section];
      return (status as any)[key] ? acc + 1 : acc;
    }, 0);
  }

}
