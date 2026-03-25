import { Request, Response } from 'express';
import { AdminService } from '../../application/services/AdminService';

export class AdminController {
  private adminService: AdminService;

  constructor() {
    this.adminService = new AdminService();
  }

  // ─── Dashboard ─────────────────────────────────────────────────────────────

  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.adminService.getStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'İstatistikler alınamadı.' });
    }
  };

  // ─── Carriers ──────────────────────────────────────────────────────────────

  getCarriers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, page, limit, search } = req.query;
      const result = await this.adminService.getCarriers({
        status: status as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        search: search as string,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Nakliyeciler alınamadı.' });
    }
  };

  getCarrierById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { carrierId } = req.params;
      const carrier = await this.adminService.getCarrierById(carrierId);
      res.status(200).json({ success: true, data: carrier });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message || 'Nakliyeci bulunamadı.' });
    }
  };

  verifyCarrier = async (req: Request, res: Response): Promise<void> => {
    try {
      const { carrierId } = req.params;
      const { approved, rejectionReason } = req.body;
      const adminId = req.user?.adminId;

      if (!adminId) {
        res.status(401).json({ success: false, message: 'Yetkisiz erişim.' });
        return;
      }

      if (typeof approved !== 'boolean') {
        res.status(400).json({ success: false, message: '"approved" alanı boolean olmalıdır.' });
        return;
      }

      const result = await this.adminService.verifyCarrier(adminId, carrierId, approved, rejectionReason);
      res.status(200).json({
        success: true,
        message: approved ? 'Nakliyeci onaylandı.' : 'Nakliyeci reddedildi.',
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'İşlem başarısız.' });
    }
  };

  getCarrierDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
      const { carrierId } = req.params;
      const documents = await this.adminService.getCarrierDocuments(carrierId);
      res.status(200).json({ success: true, data: documents });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message || 'Belgeler bulunamadı.' });
    }
  };

  // ─── Customers ─────────────────────────────────────────────────────────────

  getCustomers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page, limit, search } = req.query;
      const result = await this.adminService.getCustomers({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        search: search as string,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Müşteriler alınamadı.' });
    }
  };

  toggleCustomerActive = async (req: Request, res: Response): Promise<void> => {
    try {
      const { customerId } = req.params;
      const adminId = req.user?.adminId;

      if (!adminId) {
        res.status(401).json({ success: false, message: 'Yetkisiz erişim.' });
        return;
      }

      const result = await this.adminService.toggleCustomerActive(adminId, customerId);
      res.status(200).json({
        success: true,
        message: result.isActive ? 'Müşteri aktif edildi.' : 'Müşteri pasif edildi.',
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'İşlem başarısız.' });
    }
  };

  // ─── Shipments ─────────────────────────────────────────────────────────────

  getShipments = async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, page, limit } = req.query;
      const result = await this.adminService.getShipments({
        status: status as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'İlanlar alınamadı.' });
    }
  };

  // ─── Reviews ───────────────────────────────────────────────────────────────

  getReviews = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page, limit } = req.query;
      const result = await this.adminService.getReviews({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Yorumlar alınamadı.' });
    }
  };

  deleteReview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { reviewId } = req.params;
      const adminId = req.user?.adminId;

      if (!adminId) {
        res.status(401).json({ success: false, message: 'Yetkisiz erişim.' });
        return;
      }

      await this.adminService.deleteReview(adminId, reviewId);
      res.status(200).json({ success: true, message: 'Yorum silindi.' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Yorum silinemedi.' });
    }
  };

  // ─── Audit Log ─────────────────────────────────────────────────────────────

  getAuditLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page, limit, search } = req.query;
      const result = await this.adminService.getAuditLogs({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 30,
        search: search as string,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Loglar alınamadı.' });
    }
  };
}
