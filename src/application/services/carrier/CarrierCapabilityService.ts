import { AppDataSource } from '../../../infrastructure/database/data-source';
import { CarrierLoadTypeCapability } from '../../../domain/entities/CarrierLoadTypeCapability';
import { CarrierExtraServiceCapability } from '../../../domain/entities/CarrierExtraServiceCapability';
import { CarrierCustomExtraService } from '../../../domain/entities/CarrierCustomExtraService';
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
  private customExtraServiceRepo = AppDataSource.getRepository(CarrierCustomExtraService);
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
    const { extraServiceId, loadType, priceMode = 'NONE', basePrice, quoteMinPrice, quoteMaxPrice, notes } = payload;

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
      if (priceMode === 'FIXED' && (basePrice === undefined || basePrice < 0)) {
        throw new ValidationError('FIXED fiyat modu icin gecerli bir basePrice belirtiniz.');
      }
      if (priceMode === 'QUOTE') {
        this.validateQuotePriceRange(quoteMinPrice, quoteMaxPrice);
      }

      existing.isActive = true;
      existing.priceMode = (priceMode || null) as any;
      existing.basePrice = priceMode === 'FIXED' ? Number(basePrice) : null;
      existing.quoteMinPrice = priceMode === 'QUOTE' ? Number(quoteMinPrice) : null;
      existing.quoteMaxPrice = priceMode === 'QUOTE' ? Number(quoteMaxPrice) : null;
      existing.notes = notes ?? null;
      await this.extraServiceCapabilityRepo.save(existing);
      return;
    }

    // 5. Validate priceMode and basePrice
    if (priceMode === 'FIXED' && (basePrice === undefined || basePrice < 0)) {
      throw new ValidationError('FIXED fiyat modu için geçerli bir basePrice belirtiniz.');
    }

    if (priceMode === 'QUOTE') {
      this.validateQuotePriceRange(quoteMinPrice, quoteMaxPrice);
    }

    // 6. Create and save
    const capability = this.extraServiceCapabilityRepo.create({
      carrierId,
      extraServiceId,
      loadType,
      isActive: true,
      priceMode: (priceMode || null) as typeof priceMode,
      basePrice: priceMode === 'FIXED' ? Number(basePrice) : null,
      quoteMinPrice: priceMode === 'QUOTE' ? Number(quoteMinPrice) : null,
      quoteMaxPrice: priceMode === 'QUOTE' ? Number(quoteMaxPrice) : null,
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

  private validateQuotePriceRange(quoteMinPrice?: number, quoteMaxPrice?: number): void {
    const min = Number(quoteMinPrice);
    const max = Number(quoteMaxPrice);

    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < 0) {
      throw new ValidationError('Gorusulur fiyat modu icin gecerli min ve max fiyat belirtiniz.');
    }

    if (max < min) {
      throw new ValidationError('Max fiyat min fiyattan kucuk olamaz.');
    }
  }

  async listCustomExtraServices(carrierId: string, loadType?: ExtraServiceLoadType | null): Promise<CarrierCustomExtraService[]> {
    if (!carrierId) {
      throw new ValidationError('Nakliyeci kimligi zorunludur.');
    }

    return this.customExtraServiceRepo.find({
      where: {
        carrierId,
        ...(loadType ? { loadType } : {}),
      },
      order: { loadType: 'ASC', createdAt: 'ASC' },
    });
  }

  async upsertCustomExtraService(carrierId: string, payload: {
    id?: string;
    loadType?: ExtraServiceLoadType;
    title?: string;
    description?: string | null;
    isActive?: boolean;
    priceMode?: 'NONE' | 'FIXED' | 'QUOTE';
    basePrice?: number | null;
    quoteMinPrice?: number | null;
    quoteMaxPrice?: number | null;
  }): Promise<CarrierCustomExtraService> {
    if (!carrierId) {
      throw new ValidationError('Nakliyeci kimligi zorunludur.');
    }

    if (!payload.loadType) {
      throw new ValidationError('Yuk tipi zorunludur.');
    }

    const title = String(payload.title || '').trim();
    if (!title) {
      throw new ValidationError('Baslik zorunludur.');
    }

    const loadTypeCapability = await this.loadTypeCapabilityRepo.findOne({
      where: { carrierId, loadType: payload.loadType, isActive: true },
    });
    if (!loadTypeCapability) {
      throw new ValidationError('Bu tasima turu aktif degil.');
    }

    const priceMode = payload.priceMode || 'QUOTE';
    if (priceMode === 'FIXED' && (payload.basePrice === undefined || payload.basePrice === null || Number(payload.basePrice) < 0)) {
      throw new ValidationError('Sabit fiyat icin gecerli bir tutar belirtiniz.');
    }
    if (priceMode === 'QUOTE') {
      this.validateQuotePriceRange(payload.quoteMinPrice ?? undefined, payload.quoteMaxPrice ?? undefined);
    }

    let entity: CarrierCustomExtraService | null = null;
    if (payload.id) {
      entity = await this.customExtraServiceRepo.findOne({
        where: { id: payload.id, carrierId },
      });
      if (!entity) {
        throw new ValidationError('Ozel ek hizmet bulunamadi.');
      }
    }

    const customService = entity ?? this.customExtraServiceRepo.create({ carrierId });
    customService.loadType = payload.loadType;
    customService.title = title.slice(0, 120);
    customService.description = payload.description ? String(payload.description).trim().slice(0, 700) : null;
    customService.isActive = payload.isActive ?? true;
    customService.priceMode = priceMode as any;
    customService.basePrice = priceMode === 'FIXED' ? Number(payload.basePrice) : null;
    customService.quoteMinPrice = priceMode === 'QUOTE' ? Number(payload.quoteMinPrice) : null;
    customService.quoteMaxPrice = priceMode === 'QUOTE' ? Number(payload.quoteMaxPrice) : null;

    return this.customExtraServiceRepo.save(customService);
  }

  async deleteCustomExtraService(carrierId: string, customServiceId: string): Promise<void> {
    if (!carrierId || !customServiceId) {
      throw new ValidationError('Nakliyeci ve hizmet kimligi zorunludur.');
    }

    const customService = await this.customExtraServiceRepo.findOne({
      where: { id: customServiceId, carrierId },
    });
    if (!customService) {
      throw new ValidationError('Ozel ek hizmet bulunamadi.');
    }

    await this.customExtraServiceRepo.remove(customService);
  }

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
      quoteMinPrice: entity.quoteMinPrice == null ? undefined : Number(entity.quoteMinPrice),
      quoteMaxPrice: entity.quoteMaxPrice == null ? undefined : Number(entity.quoteMaxPrice),
      notes: (entity.notes || undefined) as any,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
