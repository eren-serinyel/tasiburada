import { Request, Response } from 'express';
import { CarrierCompanyInfoService } from '../../application/services/carrier/CarrierCompanyInfoService';
import { CarrierActivityService } from '../../application/services/carrier/CarrierActivityService';
import { CarrierVehicleTypeService } from '../../application/services/carrier/CarrierVehicleTypeService';
import { CarrierVehicleService } from '../../application/services/carrier/CarrierVehicleService';
import { CarrierEarningsService } from '../../application/services/carrier/CarrierEarningsService';
import { CarrierSecurityService } from '../../application/services/carrier/CarrierSecurityService';
import { NotificationPreferenceService } from '../../application/services/carrier/NotificationPreferenceService';
import { CarrierProfileQueryService } from '../../application/services/carrier/CarrierProfileQueryService';
import { CarrierServiceTypeService } from '../../application/services/carrier/CarrierServiceTypeService';
import { CarrierProfileStatusService } from '../../application/services/carrier/CarrierProfileStatusService';
import { CarrierScopeOfWorkService } from '../../application/services/carrier/CarrierScopeOfWorkService';

export class CarrierProfileController {
  private companyInfoService = new CarrierCompanyInfoService();
  private activityService = new CarrierActivityService();
  private vehicleTypeService = new CarrierVehicleTypeService();
  private serviceTypeService = new CarrierServiceTypeService();
  private scopeOfWorkService = new CarrierScopeOfWorkService();
  private vehicleService = new CarrierVehicleService();
  private earningsService = new CarrierEarningsService();
  private securityService = new CarrierSecurityService();
  private notificationService = new NotificationPreferenceService();
  private profileQueryService = new CarrierProfileQueryService();
  private profileStatusService = new CarrierProfileStatusService();

  private ensureCarrier(req: Request, res: Response): string | null {
    if (!req.carrierId) {
      res.status(401).json({ success: false, message: 'Kimlik doğrulaması gerekli.' });
      return null;
    }

    const requestedId = req.params?.carrierId;
    if (requestedId && requestedId !== req.carrierId) {
      res.status(403).json({ success: false, message: 'Bu kaynağa erişim yetkiniz yok.' });
      return null;
    }

    return requestedId || req.carrierId;
  }

  getProfileStatus = async (req: Request, res: Response) => {
    const carrierId = this.ensureCarrier(req, res);
    if (!carrierId) return;
    try {
      const summary = await this.profileQueryService.getProfileStatus(carrierId);
      res.status(200).json({ success: true, data: summary });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Profil durumu alınamadı.' });
    }
  };

  refreshProfileStatus = async (req: Request, res: Response) => {
    const carrierId = this.ensureCarrier(req, res);
    if (!carrierId) return;
    try {
      await this.profileStatusService.updateProfileCompletion(carrierId);
      const summary = await this.profileQueryService.getProfileStatus(carrierId);
      res.status(200).json({ success: true, data: summary });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Profil durumu güncellenemedi.' });
    }
  };

  getCarrierProfile = async (req: Request, res: Response) => {
    const carrierId = req.params?.carrierId || req.carrierId;
    if (!carrierId) {
      res.status(400).json({ success: false, message: 'Carrier ID gereklidir.' });
      return;
    }
    try {
      const overview = await this.profileQueryService.getCarrierOverview(carrierId);
      res.status(200).json({ success: true, data: overview });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Profil bilgileri alınamadı.' });
    }
  };

  updateCompanyInfo = async (req: Request, res: Response) => {
    const carrierId = this.ensureCarrier(req, res);
    if (!carrierId) return;
    try {
      const carrier = await this.companyInfoService.updateCompanyInfo(carrierId, req.body);

      const serviceTypeNames = this.extractStringArray(req.body.serviceTypeNames, req.body.services);
      let serviceTypes: any = null;
      if (serviceTypeNames) {
        await this.serviceTypeService.replaceSelectedTypeNames(carrierId, serviceTypeNames);
        serviceTypes = await this.serviceTypeService.listSelectedTypes(carrierId);
      } else if (req.body.serviceTypeIds) {
        // If IDs are provided directly
        await this.serviceTypeService.replaceSelectedTypes(carrierId, req.body.serviceTypeIds);
        serviceTypes = await this.serviceTypeService.listSelectedTypes(carrierId);
      }

      const scopeOfWorkNames = this.extractStringArray(req.body.scopeOfWorkNames, req.body.scopes);
      let scopeOfWorks: any = null; 
      if (scopeOfWorkNames) {
         await this.scopeOfWorkService.replaceSelectedTypeNames(carrierId, scopeOfWorkNames);
         scopeOfWorks = await this.scopeOfWorkService.listSelectedTypes(carrierId);
      } else if (req.body.scopeOfWorkIds) {
          await this.scopeOfWorkService.replaceSelectedTypes(carrierId, req.body.scopeOfWorkIds);
          scopeOfWorks = await this.scopeOfWorkService.listSelectedTypes(carrierId);
      }

      const vehicleTypeNames = this.extractStringArray(req.body.vehicleTypeNames, req.body.vehicleTypes);
      let vehicleTypes: any = null;
      if (vehicleTypeNames) {
        const capacityOverrides = this.extractCapacityOverrides(req.body.vehicleTypeCapacities ?? req.body.vehicleCapacities);
        await this.vehicleTypeService.replaceSelectedTypeNames(carrierId, vehicleTypeNames, capacityOverrides);
        vehicleTypes = await this.vehicleTypeService.listSelectedTypes(carrierId);
      }

      let earnings: any = null;
      if (req.body.bankName && req.body.iban && (req.body.accountHolder || req.body.accountHolderTitle)) {
        earnings = await this.earningsService.upsert(carrierId, {
          bankName: req.body.bankName,
          iban: req.body.iban,
          accountHolder: req.body.accountHolder ?? req.body.accountHolderTitle
        });
      }

      res.status(200).json({ success: true, message: 'Firma bilgileri güncellendi.', data: { carrier, serviceTypes, scopeOfWorks, vehicleTypes, earnings } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Firma bilgileri güncellenemedi.' });
    }
  };

  updateProfilePicture = async (req: Request, res: Response) => {
    const carrierId = this.ensureCarrier(req, res);
    if (!carrierId) return;

    if (!req.file) {
      res.status(400).json({ success: false, message: 'Profil fotoğrafı dosyası zorunludur.' });
      return;
    }

    try {
      const pictureUrl = `/uploads/pictures/${req.file.filename}`;
      const updatedCarrier = await this.companyInfoService.updateProfilePicture(carrierId, pictureUrl ?? null);
      res.status(200).json({ success: true, pictureUrl: updatedCarrier?.pictureUrl ?? null });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Profil fotoğrafı güncellenemedi.' });
    }
  };

  getActivityInfo = async (req: Request, res: Response) => {
    const carrierId = this.ensureCarrier(req, res);
    if (!carrierId) return;
    try {
      const activity = await this.activityService.getActivityInfo(carrierId);
      res.status(200).json({ success: true, data: activity });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Faaliyet bilgileri alınamadı.' });
    }
  };

  updateActivityInfo = async (req: Request, res: Response) => {
    const carrierId = this.ensureCarrier(req, res);
    if (!carrierId) return;
    try {
      const activity = await this.activityService.updateActivityInfo(carrierId, req.body);
      res.status(200).json({ success: true, message: 'Faaliyet bilgileri kaydedildi.', data: activity });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Faaliyet bilgileri güncellenemedi.' });
    }
  };

  updateVehicleTypes = async (req: Request, res: Response) => {
    const carrierId = this.ensureCarrier(req, res);
    if (!carrierId) return;
    try {
      await this.vehicleTypeService.replaceSelectedTypes(carrierId, req.body.vehicleTypeIds || []);
      res.status(200).json({ success: true, message: 'Araç türleri güncellendi.' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Araç türleri güncellenemedi.' });
    }
  };

  updateServiceTypes = async (req: Request, res: Response) => {
    const carrierId = this.ensureCarrier(req, res);
    if (!carrierId) return;
    try {
      await this.serviceTypeService.replaceSelectedTypes(carrierId, req.body.serviceTypeIds || []);
      res.status(200).json({ success: true, message: 'Hizmet türleri güncellendi.' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Hizmet türleri güncellenemedi.' });
    }
  };

  upsertVehicles = async (req: Request, res: Response) => {
    const carrierId = this.ensureCarrier(req, res);
    if (!carrierId) return;
    try {
      const payload = (req.body.vehicles || req.body.selectedVehicles || []).map((vehicle: any) => ({
        id: vehicle.id,
        vehicleTypeId: vehicle.vehicleTypeId,
        licensePlate: vehicle.licensePlate,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        capacityKg: vehicle.capacityKg ?? vehicle.customCapacity ?? vehicle.capacity ?? 0,
        capacityM3: vehicle.capacityM3,
        hasInsurance: vehicle.hasInsurance,
        hasTrackingDevice: vehicle.hasTrackingDevice
      }));

      const vehicles = await this.vehicleService.upsertVehicles(carrierId, payload);
      res.status(200).json({ success: true, message: 'Araç bilgileri kaydedildi.', data: vehicles });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Araç bilgileri güncellenemedi.' });
    }
  };

  listVehicles = async (req: Request, res: Response) => {
    const carrierId = this.ensureCarrier(req, res);
    if (!carrierId) return;
    try {
      const vehicles = await this.vehicleService.listVehicles(carrierId);
      const formatted = vehicles.map(vehicle => ({
        id: vehicle.id,
        vehicleTypeId: vehicle.vehicleTypeId,
        vehicleTypeName: vehicle.vehicleType?.name,
        capacityKg: Number(vehicle.capacityKg),
        capacityM3: vehicle.capacityM3 !== null && vehicle.capacityM3 !== undefined ? Number(vehicle.capacityM3) : null,
        licensePlate: vehicle.licensePlate,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        hasInsurance: vehicle.hasInsurance,
        hasTrackingDevice: vehicle.hasTrackingDevice,
        createdAt: vehicle.createdAt,
        updatedAt: vehicle.updatedAt
      }));
      res.status(200).json({ success: true, data: formatted });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Araç listesi alınamadı.' });
    }
  };

  updateEarnings = async (req: Request, res: Response) => {
    const carrierId = this.ensureCarrier(req, res);
    if (!carrierId) return;
    try {
      const earnings = await this.earningsService.upsert(carrierId, req.body);
      res.status(200).json({ success: true, message: 'Kazanç bilgileri güncellendi.', data: earnings });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Kazanç bilgileri güncellenemedi.' });
    }
  };

  updateSecurity = async (req: Request, res: Response) => {
    const carrierId = this.ensureCarrier(req, res);
    if (!carrierId) return;
    try {
      const settings = await this.securityService.updateSettings(carrierId, req.body);
      res.status(200).json({ success: true, message: 'Güvenlik ayarları kaydedildi.', data: settings });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Güvenlik ayarları güncellenemedi.' });
    }
  };

  getNotifications = async (req: Request, res: Response) => {
    const carrierId = this.ensureCarrier(req, res);
    if (!carrierId) return;
    try {
      const preferences = await this.notificationService.getPreferences(carrierId);
      res.status(200).json({ success: true, data: preferences });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Bildirim tercihleri alınamadı.' });
    }
  };

  toggleNotification = async (req: Request, res: Response) => {
    const carrierId = this.ensureCarrier(req, res);
    if (!carrierId) return;
    try {
      const preferences = await this.notificationService.togglePreference(carrierId, req.body);
      res.status(200).json({ success: true, message: 'Bildirim tercihi güncellendi.', data: preferences });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Bildirim tercihi güncellenemedi.' });
    }
  };

  private extractStringArray(...candidates: any[]): string[] | null {
    const source = candidates.find(candidate => Array.isArray(candidate));
    if (!source) return null;
    return (source as any[]).map(item => String(item).trim()).filter(Boolean);
  }

  private extractCapacityOverrides(candidate: any): Record<string, number> | undefined {
    if (!candidate || typeof candidate !== 'object') return undefined;
    const entries = Object.entries(candidate)
      .map(([key, value]) => {
        const parsed = Number(value);
        if (Number.isNaN(parsed)) {
          return null;
        }
        return [String(key).trim(), parsed] as [string, number];
      })
      .filter(Boolean) as [string, number][];
    if (!entries.length) return undefined;
    return Object.fromEntries(entries);
  }
}
