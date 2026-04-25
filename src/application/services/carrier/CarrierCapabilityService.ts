import { AppDataSource } from '../../../infrastructure/database/data-source';
import { CarrierLoadTypeCapability } from '../../../domain/entities/CarrierLoadTypeCapability';
import { CarrierExtraServiceCapability } from '../../../domain/entities/CarrierExtraServiceCapability';
import { ExtraService } from '../../../domain/entities/ExtraService';
import { ExtraServiceApplicability } from '../../../domain/entities/ExtraServiceApplicability';
import { ExtraServiceLoadType } from '../../../domain/entities/ExtraServiceLoadType';
import {
  CarrierCapabilityProfileDTO,
  CarrierLoadTypeCapabilityDTO,
  CarrierExtraServiceCapabilityDTO,
  UpdateCarrierCapabilityPayload,
  UpdateCapabilityResultDTO,
} from '../../dto/CarrierCapabilityDTO';
import { ValidationError, ForbiddenError } from '../../../domain/errors';

/**
 * Business logic for carrier capability management
 * - Read own/admin capabilities
 * - Update capabilities with validation
 * - Ensure data integrity (no orphan capabilities)
 */
export class CarrierCapabilityService {
  private loadTypeCapabilityRepo = AppDataSource.getRepository(CarrierLoadTypeCapability);
  private extraServiceCapabilityRepo = AppDataSource.getRepository(CarrierExtraServiceCapability);
  private extraServiceRepo = AppDataSource.getRepository(ExtraService);
  private applicabilityRepo = AppDataSource.getRepository(ExtraServiceApplicability);

  /**
   * Get carrier's complete capability profile
   */
  async getCarrierCapabilities(carrierId: string): Promise<CarrierCapabilityProfileDTO> {
    if (!carrierId) {
      throw new ValidationError('Nakliyeci kimliği zorunludur.');
    }

    const loadTypeCapabilities = await this.loadTypeCapabilityRepo.find({
      where: { carrierId },
      order: { loadType: 'ASC', createdAt: 'ASC' },
    });

    const extraServiceCapabilities = await this.extraServiceCapabilityRepo.find({
      where: { carrierId },
      relations: ['extraService'],
      order: { loadType: 'ASC', createdAt: 'ASC' },
    });

    const loadTypeMap = new Set(loadTypeCapabilities.map(lt => lt.loadType));

    return {
      carrierId,
      loadTypes: loadTypeCapabilities.map(lt => this.mapLoadTypeCapability(lt)),
      extraServices: extraServiceCapabilities.map(esc =>
        this.mapExtraServiceCapability(esc)
      ),
      canHandleAllLoadTypes: loadTypeMap.size === 4, // HOME, OFFICE, PARTIAL, STORAGE
      activeExtraServicesCount: extraServiceCapabilities.filter(esc => esc.isActive).length,
    };
  }

  /**
   * Add or update carrier capability with full validation
   */
  async updateCapability(
    carrierId: string,
    payload: UpdateCarrierCapabilityPayload
  ): Promise<UpdateCapabilityResultDTO> {
    if (!carrierId) {
      throw new ValidationError('Nakliyeci kimliği zorunludur.');
    }

    try {
      switch (payload.action) {
        case 'add_load_type':
          await this.addLoadTypeCapability(carrierId, payload.loadType!);
          break;
        case 'remove_load_type':
          await this.removeLoadTypeCapability(carrierId, payload.loadType!);
          break;
        case 'add_extra_service':
          await this.addExtraServiceCapability(carrierId, payload);
          break;
        case 'remove_extra_service':
          await this.removeExtraServiceCapability(carrierId, payload.extraServiceId!, payload.loadType!);
          break;
        case 'toggle_active':
          await this.toggleCapabilityActive(carrierId, payload);
          break;
        default:
          throw new ValidationError(`Unknown action: ${payload.action}`);
      }

      const updatedProfile = await this.getCarrierCapabilities(carrierId);
      return {
        success: true,
        message: 'Yetenek güncellemesi başarılı',
        data: updatedProfile,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Yetenek güncellemesi başarısız',
        error: {
          code: error.name || 'CAPABILITY_UPDATE_ERROR',
          details: error.message,
        },
      };
    }
  }

  /**
   * Add load type capability
   * - Check duplicate (shouldn't happen due to unique constraint)
   */
  private async addLoadTypeCapability(carrierId: string, loadType: ExtraServiceLoadType): Promise<void> {
    // Check for duplicate
    const existing = await this.loadTypeCapabilityRepo.findOne({
      where: { carrierId, loadType },
    });

    if (existing) {
      throw new ValidationError(`Nakliyeci zaten ${loadType} yükleme türü yeteneğine sahip.`);
    }

    const capability = this.loadTypeCapabilityRepo.create({
      carrierId,
      loadType,
      isActive: true,
    });

    await this.loadTypeCapabilityRepo.save(capability);
  }

  /**
   * Remove load type capability
   * - Check if any extra service capabilities depend on this load type
   */
  private async removeLoadTypeCapability(carrierId: string, loadType: ExtraServiceLoadType): Promise<void> {
    const capability = await this.loadTypeCapabilityRepo.findOne({
      where: { carrierId, loadType },
    });

    if (!capability) {
      throw new ValidationError(`Nakliyeci ${loadType} yükleme türü yeteneğine sahip değil.`);
    }

    // Check for dependent extra service capabilities
    const dependentServices = await this.extraServiceCapabilityRepo.find({
      where: { carrierId, loadType },
    });

    if (dependentServices.length > 0) {
      throw new ValidationError(
        `${dependentServices.length} ek hizmet yeteneği bu yükleme türüne bağlıdır. Lütfen önce ek hizmetleri kaldırın.`
      );
    }

    await this.loadTypeCapabilityRepo.remove(capability);
  }

  /**
   * Add extra service capability
   * - Validate loadType capability exists
   * - Validate service + loadType exists in applicability table
   * - Check for duplicate
   */
  private async addExtraServiceCapability(carrierId: string, payload: UpdateCarrierCapabilityPayload): Promise<void> {
    const { extraServiceId, loadType, priceMode = 'NONE', basePrice, notes } = payload;

    if (!extraServiceId || !loadType) {
      throw new ValidationError('Ek hizmet kimliği ve yükleme türü zorunludur.');
    }

    // 1. Check carrier has load type capability
    const loadTypeCapability = await this.loadTypeCapabilityRepo.findOne({
      where: { carrierId, loadType, isActive: true },
    });

    if (!loadTypeCapability) {
      throw new ValidationError(
        `Nakliyeci önce ${loadType} yükleme türü yeteneğine sahip olmalı (yalnız o zaman ek hizmetler eklenebilir).`
      );
    }

    // 2. Check extra service exists
    const extraService = await this.extraServiceRepo.findOne({
      where: { id: extraServiceId },
    });

    if (!extraService) {
      throw new ValidationError(`Ek hizmet bulunamadı: ${extraServiceId}`);
    }

    // 3. Check applicability exists (service + loadType must be valid combination)
    const applicability = await this.applicabilityRepo.findOne({
      where: { extraServiceId, loadType },
    });

    if (!applicability) {
      throw new ValidationError(
        `${extraService.name} ek hizmeti ${loadType} yükleme türü için geçerli değil.`
      );
    }

    // 4. Check for duplicate
    const existing = await this.extraServiceCapabilityRepo.findOne({
      where: { carrierId, extraServiceId, loadType },
    });

    if (existing) {
      throw new ValidationError(
        `Nakliyeci zaten ${extraService.name} (${loadType}) ek hizmet yeteneğine sahip.`
      );
    }

    // 5. Validate priceMode and basePrice
    if (priceMode === 'FIXED' && (basePrice === undefined || basePrice < 0)) {
      throw new ValidationError('FIXED fiyat modu için geçerli bir basePrice belirtiniz.');
    }

    // 6. Create and save
    const capability = this.extraServiceCapabilityRepo.create({
      carrierId,
      extraServiceId,
      loadType,
      isActive: true,
      priceMode: (priceMode || null) as typeof priceMode,
      basePrice: priceMode === 'FIXED' ? basePrice : null,
      notes,
    } as any);

    await this.extraServiceCapabilityRepo.save(capability);
  }

  /**
   * Remove extra service capability
   */
  private async removeExtraServiceCapability(
    carrierId: string,
    extraServiceId: string,
    loadType: ExtraServiceLoadType
  ): Promise<void> {
    const capability = await this.extraServiceCapabilityRepo.findOne({
      where: { carrierId, extraServiceId, loadType },
    });

    if (!capability) {
      throw new ValidationError('Ek hizmet yeteneği bulunamadı.');
    }

    await this.extraServiceCapabilityRepo.remove(capability);
  }

  /**
   * Toggle capability active/inactive
   */
  private async toggleCapabilityActive(
    carrierId: string,
    payload: UpdateCarrierCapabilityPayload
  ): Promise<void> {
    const { loadType, extraServiceId, isActive } = payload;

    if (isActive === undefined) {
      throw new ValidationError('isActive zorunludur.');
    }

    if (loadType && !extraServiceId) {
      // Toggle load type capability
      const capability = await this.loadTypeCapabilityRepo.findOne({
        where: { carrierId, loadType },
      });

      if (!capability) {
        throw new ValidationError('Yükleme türü yeteneği bulunamadı.');
      }

      capability.isActive = isActive;
      await this.loadTypeCapabilityRepo.save(capability);
    } else if (extraServiceId && loadType) {
      // Toggle extra service capability
      const capability = await this.extraServiceCapabilityRepo.findOne({
        where: { carrierId, extraServiceId, loadType },
      });

      if (!capability) {
        throw new ValidationError('Ek hizmet yeteneği bulunamadı.');
      }

      capability.isActive = isActive;
      await this.extraServiceCapabilityRepo.save(capability);
    } else {
      throw new ValidationError('loadType veya extraServiceId belirtiniz.');
    }
  }

  // ─── Mappers ──────────────────────────────────────────────────────────────

  private mapLoadTypeCapability(entity: CarrierLoadTypeCapability): CarrierLoadTypeCapabilityDTO {
    return {
      id: entity.id,
      carrierId: entity.carrierId,
      loadType: entity.loadType,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private mapExtraServiceCapability(entity: CarrierExtraServiceCapability): CarrierExtraServiceCapabilityDTO {
    return {
      id: entity.id,
      carrierId: entity.carrierId,
      extraServiceId: entity.extraServiceId,
      extraServiceName: entity.extraService?.name || 'Unknown',
      loadType: entity.loadType,
      isActive: entity.isActive,
      priceMode: (entity.priceMode || undefined) as any,
      basePrice: entity.basePrice ? Number(entity.basePrice) : undefined,
      notes: (entity.notes || undefined) as any,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
