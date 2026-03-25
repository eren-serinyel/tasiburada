import { AppDataSource } from '../../infrastructure/database/data-source';
import { Carrier } from '../../domain/entities/Carrier';
import { Customer } from '../../domain/entities/Customer';
import { Shipment, ShipmentStatus } from '../../domain/entities/Shipment';
import { Review } from '../../domain/entities/Review';
import { Offer } from '../../domain/entities/Offer';
import { AuditLogRepository } from '../../infrastructure/repositories/AuditLogRepository';

export class AdminService {
  private auditLogRepository: AuditLogRepository;

  constructor() {
    this.auditLogRepository = new AuditLogRepository();
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

  async getShipments(params: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = params;
    const shipmentRepo = AppDataSource.getRepository(Shipment);
    const query = shipmentRepo
      .createQueryBuilder('shipment')
      .leftJoinAndSelect('shipment.customer', 'customer');

    if (status && status !== 'all') {
      query.andWhere('shipment.status = :status', { status });
    }

    query.orderBy('shipment.createdAt', 'DESC').take(limit).skip((page - 1) * limit);
    const [shipments, total] = await query.getManyAndCount();

    return {
      shipments,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Reviews ───────────────────────────────────────────────────────────────

  async getReviews(params: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params;
    const reviewRepo = AppDataSource.getRepository(Review);

    const [reviews, total] = await reviewRepo.findAndCount({
      relations: ['carrier', 'customer', 'shipment'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

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
}
