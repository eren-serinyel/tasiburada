import { AppDataSource } from '../../infrastructure/database/data-source';
import { Carrier } from '../../domain/entities/Carrier';
import { Customer } from '../../domain/entities/Customer';
import { Shipment, ShipmentStatus } from '../../domain/entities/Shipment';
import { Review } from '../../domain/entities/Review';
import { Offer, OfferStatus } from '../../domain/entities/Offer';
import { CarrierDocument, CarrierDocumentStatus } from '../../domain/entities/CarrierDocument';
import { Admin } from '../../domain/entities/Admin';
import { AuditLogRepository } from '../../infrastructure/repositories/AuditLogRepository';
import { NotificationService } from './NotificationService';
import * as bcrypt from 'bcryptjs';

export class AdminService {
  private auditLogRepository: AuditLogRepository;
  private notificationService: NotificationService;

  constructor() {
    this.auditLogRepository = new AuditLogRepository();
    this.notificationService = new NotificationService();
  }

  // ─── Dashboard ─────────────────────────────────────────────────────────────

  async getStats() {
    const carrierRepo = AppDataSource.getRepository(Carrier);
    const customerRepo = AppDataSource.getRepository(Customer);
    const shipmentRepo = AppDataSource.getRepository(Shipment);
    const reviewRepo = AppDataSource.getRepository(Review);
    const offerRepo = AppDataSource.getRepository(Offer);

    const [
      totalCustomers,
      totalCarriers,
      verifiedCarriers,
      pendingVerification,
      totalShipments,
      activeShipments,
      completedShipments,
      totalOffers,
      totalReviews,
      avgRatingRaw,
    ] = await Promise.all([
      customerRepo.count(),
      carrierRepo.count(),
      carrierRepo.count({ where: { verifiedByAdmin: true } }),
      carrierRepo.count({ where: { verifiedByAdmin: false, hasUploadedDocuments: true } }),
      shipmentRepo.count(),
      shipmentRepo.count({ where: { status: ShipmentStatus.IN_TRANSIT } }),
      shipmentRepo.count({ where: { status: ShipmentStatus.COMPLETED } }),
      offerRepo.count(),
      reviewRepo.count(),
      reviewRepo
        .createQueryBuilder('review')
        .select('AVG(review.rating)', 'avg')
        .getRawOne<{ avg: string | null }>(),
    ]);

    return {
      totalCustomers,
      totalCarriers,
      verifiedCarriers,
      pendingCarriers: pendingVerification,
      totalShipments,
      activeShipments,
      completedShipments,
      totalOffers,
      totalReviews,
      avgRating: Math.round(Number(avgRatingRaw?.avg || 0) * 10) / 10,
    };
  }

  // ─── Carriers ──────────────────────────────────────────────────────────────

  async getCarriers(params: { status?: string; page?: number; limit?: number; search?: string }) {
    const { status = 'all', page = 1, limit = 20, search } = params;
    const carrierRepo = AppDataSource.getRepository(Carrier);
    const query = carrierRepo.createQueryBuilder('carrier');

    if (status === 'verified') {
      query.andWhere('carrier.verifiedByAdmin = :v AND carrier.isActive = :a', { v: true, a: true });
    } else if (status === 'pending') {
      query.andWhere('carrier.verifiedByAdmin = :v AND carrier.hasUploadedDocuments = :d', {
        v: false,
        d: true,
      });
    } else if (status === 'rejected') {
      query.andWhere('carrier.isActive = :a AND carrier.verifiedByAdmin = :v', { a: false, v: false });
    }

    if (search) {
      query.andWhere(
        '(carrier.email LIKE :s OR carrier.companyName LIKE :s)',
        { s: `%${search}%` }
      );
    }

    query.orderBy('carrier.createdAt', 'DESC').take(limit).skip((page - 1) * limit);

    const [carriers, total] = await query.getManyAndCount();
    return {
      carriers,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getCarrierById(carrierId: string) {
    const carrierRepo = AppDataSource.getRepository(Carrier);
    const carrier = await carrierRepo.findOne({
      where: { id: carrierId },
      relations: ['documents', 'vehicles'],
    });
    if (!carrier) throw new Error('Nakliyeci bulunamadı.');
    return carrier;
  }

  async verifyCarrier(
    adminId: string,
    carrierId: string,
    approved: boolean,
    rejectionReason?: string
  ) {
    const carrierRepo = AppDataSource.getRepository(Carrier);
    const carrier = await carrierRepo.findOne({ where: { id: carrierId } });
    if (!carrier) throw new Error('Nakliyeci bulunamadı.');

    await carrierRepo.update(carrierId, {
      verifiedByAdmin: approved,
      isActive: approved,
    });

    await this.auditLogRepository.log({
      adminId,
      action: approved ? 'CARRIER_VERIFIED' : 'CARRIER_REJECTED',
      targetType: 'carrier',
      targetId: carrierId,
      details: { approved, rejectionReason: rejectionReason || null, carrierEmail: carrier.email },
    });

    return { success: true, approved };
  }

  async getCarrierDocuments(carrierId: string) {
    const carrierRepo = AppDataSource.getRepository(Carrier);
    const carrier = await carrierRepo.findOne({
      where: { id: carrierId },
      relations: ['documents'],
    });
    if (!carrier) throw new Error('Nakliyeci bulunamadı.');
    return carrier.documents ?? [];
  }

  // ─── Customers ─────────────────────────────────────────────────────────────

  async getCustomers(params: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 20, search } = params;
    const customerRepo = AppDataSource.getRepository(Customer);
    const query = customerRepo.createQueryBuilder('customer');

    if (search) {
      query.andWhere(
        '(customer.email LIKE :s OR customer.firstName LIKE :s OR customer.lastName LIKE :s)',
        { s: `%${search}%` }
      );
    }

    query.orderBy('customer.createdAt', 'DESC').take(limit).skip((page - 1) * limit);
    const [customers, total] = await query.getManyAndCount();

    return {
      customers,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async toggleCustomerActive(adminId: string, customerId: string) {
    const customerRepo = AppDataSource.getRepository(Customer);
    const customer = await customerRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new Error('Müşteri bulunamadı.');

    const newActive = !customer.isActive;
    await customerRepo.update(customerId, { isActive: newActive });

    await this.auditLogRepository.log({
      adminId,
      action: newActive ? 'CUSTOMER_ACTIVATED' : 'CUSTOMER_DEACTIVATED',
      targetType: 'customer',
      targetId: customerId,
      details: { email: customer.email, newActive },
    });

    return { isActive: newActive };
  }

  // ─── Shipments ─────────────────────────────────────────────────────────────

  async getShipments(params: { status?: string; page?: number; limit?: number; search?: string }) {
    const { status, page = 1, limit = 20, search } = params;
    const shipmentRepo = AppDataSource.getRepository(Shipment);
    const query = shipmentRepo
      .createQueryBuilder('shipment')
      .leftJoinAndSelect('shipment.customer', 'customer');

    if (status && status !== 'all') {
      query.andWhere('shipment.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(shipment.origin LIKE :s OR shipment.destination LIKE :s OR shipment.loadDetails LIKE :s OR customer.firstName LIKE :s OR customer.lastName LIKE :s)',
        { s: `%${search}%` }
      );
    }

    query.orderBy('shipment.createdAt', 'DESC').take(limit).skip((page - 1) * limit);
    const [shipments, total] = await query.getManyAndCount();

    return {
      shipments,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Reviews ───────────────────────────────────────────────────────────────

  async getReviews(params: { page?: number; limit?: number; rating?: number }) {
    const { page = 1, limit = 20, rating } = params;
    const reviewRepo = AppDataSource.getRepository(Review);

    const query = reviewRepo.createQueryBuilder('review')
      .leftJoinAndSelect('review.carrier', 'carrier')
      .leftJoinAndSelect('review.customer', 'customer')
      .leftJoinAndSelect('review.shipment', 'shipment');

    if (rating && rating >= 1 && rating <= 5) {
      query.andWhere('review.rating = :rating', { rating });
    }

    query.orderBy('review.createdAt', 'DESC').take(limit).skip((page - 1) * limit);
    const [reviews, total] = await query.getManyAndCount();

    return {
      reviews,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async deleteReview(adminId: string, reviewId: string) {
    const reviewRepo = AppDataSource.getRepository(Review);
    const review = await reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new Error('Yorum bulunamadı.');

    await reviewRepo.delete(reviewId);

    await this.auditLogRepository.log({
      adminId,
      action: 'REVIEW_DELETED',
      targetType: 'review',
      targetId: reviewId,
      details: { carrierId: review.carrierId, rating: review.rating, comment: review.comment },
    });

    return { success: true };
  }

  // ─── Audit Log ─────────────────────────────────────────────────────────────

  async getAuditLogs(params: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 30, search } = params;
    const logs = await this.auditLogRepository.findPaginated({ page, limit, search });
    return logs;
  }

  // ─── Dashboard Trends ──────────────────────────────────────────────────────

  async getStatsTrends(period: number = 30) {
    const shipmentRepo = AppDataSource.getRepository(Shipment);
    const days = Math.min(period, 365);

    const rows: { date: string; count: string }[] = await shipmentRepo
      .createQueryBuilder('s')
      .select('DATE(s.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('s.createdAt >= DATE_SUB(NOW(), INTERVAL :days DAY)', { days })
      .groupBy('DATE(s.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const map = new Map(rows.map(r => [r.date, Number(r.count)]));
    const result: { date: string; value: number }[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, value: map.get(key) || 0 });
    }
    return result;
  }

  // ─── Carrier Shipments & Reviews ───────────────────────────────────────────

  async getCarrierShipments(carrierId: string) {
    const shipmentRepo = AppDataSource.getRepository(Shipment);
    return shipmentRepo.find({
      where: { carrierId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async getCarrierReviews(carrierId: string) {
    const reviewRepo = AppDataSource.getRepository(Review);
    return reviewRepo.find({
      where: { carrierId },
      relations: ['customer'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  // ─── Offers ────────────────────────────────────────────────────────────────

  async getOffers(params: { status?: string; page?: number; limit?: number; search?: string }) {
    const { status, page = 1, limit = 20, search } = params;
    const offerRepo = AppDataSource.getRepository(Offer);
    const query = offerRepo.createQueryBuilder('offer')
      .leftJoinAndSelect('offer.shipment', 'shipment')
      .leftJoinAndSelect('shipment.customer', 'customer')
      .leftJoinAndSelect('offer.carrier', 'carrier');

    if (status && status !== 'all') {
      query.andWhere('offer.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(carrier.companyName LIKE :s OR shipment.origin LIKE :s OR shipment.destination LIKE :s)',
        { s: `%${search}%` }
      );
    }

    query.orderBy('offer.offeredAt', 'DESC').take(limit).skip((page - 1) * limit);
    const [offers, total] = await query.getManyAndCount();

    // Strip passwordHash from carrier
    const sanitized = offers.map(o => {
      if (o.carrier) {
        const { passwordHash, ...rest } = o.carrier as any;
        o.carrier = rest;
      }
      return o;
    });

    return {
      offers: sanitized,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async cancelOffer(adminId: string, offerId: string) {
    const offerRepo = AppDataSource.getRepository(Offer);
    const offer = await offerRepo.findOne({ where: { id: offerId } });
    if (!offer) throw new Error('Teklif bulunamadı.');
    if (offer.status !== OfferStatus.PENDING) throw new Error('Sadece bekleyen teklifler iptal edilebilir.');

    await offerRepo.update(offerId, { status: OfferStatus.REJECTED });

    await this.auditLogRepository.log({
      adminId,
      action: 'OFFER_CANCELLED',
      targetType: 'offer',
      targetId: offerId,
      details: { shipmentId: offer.shipmentId, carrierId: offer.carrierId },
    });

    return { success: true };
  }

  // ─── Documents ─────────────────────────────────────────────────────────────

  async getDocuments(params: { status?: string; type?: string; page?: number; limit?: number; search?: string }) {
    const { status, type, page = 1, limit = 20, search } = params;
    const docRepo = AppDataSource.getRepository(CarrierDocument);
    const query = docRepo.createQueryBuilder('doc')
      .leftJoinAndSelect('doc.carrier', 'carrier');

    if (status && status !== 'all') {
      query.andWhere('doc.status = :status', { status });
    }
    if (type) {
      query.andWhere('doc.type = :type', { type });
    }
    if (search) {
      query.andWhere('(carrier.companyName LIKE :s OR carrier.email LIKE :s)', { s: `%${search}%` });
    }

    query.orderBy('doc.uploadedAt', 'DESC').take(limit).skip((page - 1) * limit);
    const [documents, total] = await query.getManyAndCount();

    const sanitized = documents.map(d => {
      if (d.carrier) {
        const { passwordHash, ...rest } = d.carrier as any;
        d.carrier = rest;
      }
      return d;
    });

    return {
      documents: sanitized,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async verifyDocument(adminId: string, documentId: string, approved: boolean, reason?: string) {
    const docRepo = AppDataSource.getRepository(CarrierDocument);
    const doc = await docRepo.findOne({ where: { id: documentId }, relations: ['carrier'] });
    if (!doc) throw new Error('Belge bulunamadı.');

    await docRepo.update(documentId, {
      status: approved ? CarrierDocumentStatus.APPROVED : CarrierDocumentStatus.REJECTED,
      isApproved: approved,
      verifiedAt: new Date(),
    });

    await this.auditLogRepository.log({
      adminId,
      action: approved ? 'DOCUMENT_APPROVED' : 'DOCUMENT_REJECTED',
      targetType: 'document',
      targetId: documentId,
      details: { carrierId: doc.carrierId, docType: doc.type, approved, reason: reason || null },
    });

    // Notify the carrier
    await this.notificationService.createNotification(
      doc.carrierId,
      'carrier',
      approved ? 'DOCUMENT_APPROVED' : 'DOCUMENT_REJECTED',
      approved ? 'Belge Onaylandı' : 'Belge Reddedildi',
      approved
        ? `${doc.type} belgeniz onaylandı.`
        : `${doc.type} belgeniz reddedildi.${reason ? ` Neden: ${reason}` : ''}`,
      doc.carrierId
    );

    return { success: true, approved };
  }

  // ─── Reports ───────────────────────────────────────────────────────────────

  async getReportsOverview(period: string = 'month') {
    const shipmentRepo = AppDataSource.getRepository(Shipment);
    const offerRepo = AppDataSource.getRepository(Offer);
    const carrierRepo = AppDataSource.getRepository(Carrier);
    const customerRepo = AppDataSource.getRepository(Customer);

    let interval: string;
    switch (period) {
      case 'week': interval = '7 DAY'; break;
      case 'quarter': interval = '90 DAY'; break;
      case 'year': interval = '365 DAY'; break;
      default: interval = '30 DAY';
    }

    const [
      totalShipments, completedShipments, cancelledShipments,
      totalOffers, acceptedOffers,
      newCarriers, newCustomers,
      revenueRaw, monthlyShipments, monthlyOffers, topCarriers, topRoutes,
    ] = await Promise.all([
      shipmentRepo.count(),
      shipmentRepo.count({ where: { status: ShipmentStatus.COMPLETED } }),
      shipmentRepo.count({ where: { status: ShipmentStatus.CANCELLED } }),
      offerRepo.count(),
      offerRepo.count({ where: { status: OfferStatus.ACCEPTED } }),
      carrierRepo.createQueryBuilder('c')
        .where(`c.createdAt >= DATE_SUB(NOW(), INTERVAL ${interval})`).getCount(),
      customerRepo.createQueryBuilder('c')
        .where(`c.createdAt >= DATE_SUB(NOW(), INTERVAL ${interval})`).getCount(),
      // Total revenue from completed shipments
      shipmentRepo.createQueryBuilder('s')
        .select('COALESCE(SUM(s.price), 0)', 'total')
        .where('s.status = :st', { st: ShipmentStatus.COMPLETED })
        .getRawOne<{ total: string }>(),
      // Monthly shipment trend (last 12 months)
      shipmentRepo.createQueryBuilder('s')
        .select("DATE_FORMAT(s.createdAt, '%Y-%m')", 'month')
        .addSelect('COUNT(*)', 'count')
        .where('s.createdAt >= DATE_SUB(NOW(), INTERVAL 12 MONTH)')
        .groupBy('month').orderBy('month', 'ASC')
        .getRawMany<{ month: string; count: string }>(),
      // Monthly offer trend
      offerRepo.createQueryBuilder('o')
        .select("DATE_FORMAT(o.offeredAt, '%Y-%m')", 'month')
        .addSelect('COUNT(*)', 'count')
        .where('o.offeredAt >= DATE_SUB(NOW(), INTERVAL 12 MONTH)')
        .groupBy('month').orderBy('month', 'ASC')
        .getRawMany<{ month: string; count: string }>(),
      // Top 10 carriers by completed shipments
      carrierRepo.createQueryBuilder('c')
        .select(['c.id', 'c.companyName', 'c.rating', 'c.completedShipments'])
        .orderBy('c.completedShipments', 'DESC')
        .take(10).getMany(),
      // Top routes
      shipmentRepo.createQueryBuilder('s')
        .select('s.origin', 'origin')
        .addSelect('s.destination', 'destination')
        .addSelect('COUNT(*)', 'count')
        .addSelect('ROUND(AVG(s.price), 0)', 'avgPrice')
        .groupBy('s.origin').addGroupBy('s.destination')
        .orderBy('count', 'DESC')
        .take(10).getRawMany(),
    ]);

    const matchRate = totalShipments > 0 ? Math.round((completedShipments / totalShipments) * 100) : 0;
    const cancelRate = totalShipments > 0 ? Math.round((cancelledShipments / totalShipments) * 100) : 0;

    return {
      kpi: {
        totalRevenue: Number(revenueRaw?.total || 0),
        totalShipments,
        completedShipments,
        totalOffers,
        acceptedOffers,
        matchRate,
        cancelRate,
        newCarriers,
        newCustomers,
      },
      monthlyShipments: monthlyShipments.map(r => ({ month: r.month, count: Number(r.count) })),
      monthlyOffers: monthlyOffers.map(r => ({ month: r.month, count: Number(r.count) })),
      topCarriers: topCarriers.map(c => ({
        id: c.id,
        companyName: c.companyName,
        rating: Number(c.rating || 0),
        completedShipments: c.completedShipments || 0,
      })),
      topRoutes: topRoutes.map(r => ({
        origin: r.origin,
        destination: r.destination,
        count: Number(r.count),
        avgPrice: Number(r.avgPrice || 0),
      })),
    };
  }

  // ─── Admin Management ──────────────────────────────────────────────────────

  async getAdmins(params: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params;
    const adminRepo = AppDataSource.getRepository(Admin);
    const [admins, total] = await adminRepo.findAndCount({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    // Strip password hashes
    const safe = admins.map(({ passwordHash, ...rest }) => rest);
    return {
      admins: safe,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createAdmin(adminId: string, data: { email: string; password: string; role?: string }) {
    const adminRepo = AppDataSource.getRepository(Admin);
    const existing = await adminRepo.findOne({ where: { email: data.email } });
    if (existing) throw new Error('Bu e-posta adresi zaten kayıtlı.');

    const hash = await bcrypt.hash(data.password, 10);
    const admin = adminRepo.create({
      email: data.email,
      passwordHash: hash,
      role: (data.role === 'superadmin' ? 'superadmin' : 'admin') as any,
      isActive: true,
    });
    const saved = await adminRepo.save(admin);

    await this.auditLogRepository.log({
      adminId,
      action: 'ADMIN_CREATED',
      targetType: 'admin',
      targetId: saved.id,
      details: { email: data.email, role: data.role || 'admin' },
    });

    const { passwordHash, ...safe } = saved;
    return safe;
  }

  async updateAdmin(adminId: string, targetAdminId: string, data: { role?: string; isActive?: boolean }) {
    const adminRepo = AppDataSource.getRepository(Admin);
    const admin = await adminRepo.findOne({ where: { id: targetAdminId } });
    if (!admin) throw new Error('Admin bulunamadı.');

    const updateData: Partial<Admin> = {};
    if (data.role !== undefined) updateData.role = (data.role === 'superadmin' ? 'superadmin' : 'admin') as any;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    await adminRepo.update(targetAdminId, updateData);

    await this.auditLogRepository.log({
      adminId,
      action: 'ADMIN_UPDATED',
      targetType: 'admin',
      targetId: targetAdminId,
      details: { ...data },
    });

    return { success: true };
  }

  async deleteAdmin(adminId: string, targetAdminId: string) {
    if (adminId === targetAdminId) throw new Error('Kendinizi silemezsiniz.');
    const adminRepo = AppDataSource.getRepository(Admin);
    const admin = await adminRepo.findOne({ where: { id: targetAdminId } });
    if (!admin) throw new Error('Admin bulunamadı.');

    await adminRepo.delete(targetAdminId);

    await this.auditLogRepository.log({
      adminId,
      action: 'ADMIN_DELETED',
      targetType: 'admin',
      targetId: targetAdminId,
      details: { email: admin.email },
    });

    return { success: true };
  }
}
