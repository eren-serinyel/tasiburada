import { AppDataSource } from '../../infrastructure/database/data-source';
import { Carrier, CarrierApprovalState } from '../../domain/entities/Carrier';
import { Customer } from '../../domain/entities/Customer';
import { Shipment, ShipmentStatus } from '../../domain/entities/Shipment';
import { Review } from '../../domain/entities/Review';
import { Offer, OfferStatus } from '../../domain/entities/Offer';
import { CarrierDocument, CarrierDocumentStatus } from '../../domain/entities/CarrierDocument';
import { Admin } from '../../domain/entities/Admin';
import { PlatformSetting } from '../../domain/entities/PlatformSetting';
import {
  ContactFilterLog,
  ContactFilterReviewStatus,
  ContactFilterSeverity,
} from '../../domain/entities/ContactFilterLog';
import { MatchCooldown, MatchCooldownStatus } from '../../domain/entities/MatchCooldown';
import { AuditLogRepository } from '../../infrastructure/repositories/AuditLogRepository';
import { NotificationService } from './NotificationService';
import { CarrierApprovalService } from './carrier/CarrierApprovalService';
import { ContactSafetyService } from './contact-safety/ContactSafetyService';
import * as bcrypt from 'bcryptjs';
import { NotFoundError, ValidationError } from '../../domain/errors/AppError';

export interface ContactFilterLogDto {
  id: number;
  createdAt: Date;
  actorType: string;
  actorId: string | null;
  surface: string;
  shipmentId: string | null;
  offerId: string | null;
  action: string;
  severity: ContactFilterSeverity;
  riskScore: number;
  reviewStatus: ContactFilterReviewStatus;
  matchedRules: string[];
  /** Partial hash — 12 hex chars + '…' — raw text is never stored */
  textHashPreview: string;
}

interface ContactFilterLogsParams {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  surface?: string;
  actorType?: string;
  action?: string;
  severity?: string;
  reviewStatus?: string;
  shipmentId?: string;
  offerId?: string;
  actorId?: string;
}

interface ContactFilterLogStatsParams {
  dateFrom?: string;
  dateTo?: string;
  surface?: string;
  actorType?: string;
  action?: string;
  severity?: string;
  reviewStatus?: string;
}

interface ContactFilterLogStatsDto {
  todayBlockedCount: number;
  highRiskCount: number;
  repeatedViolatorCount: number;
  unreviewedCount: number;
  topSurfaces: Array<{ surface: string; count: number }>;
  actionDistribution: Array<{ action: string; count: number }>;
  severityDistribution: Array<{ severity: string; count: number }>;
  generatedAt: string;
  window: { dateFrom: string; dateTo: string };
}

export class AdminService {
  private auditLogRepository: AuditLogRepository;
  private notificationService: NotificationService;
  private carrierApprovalService: CarrierApprovalService;
  private contactSafetyService: ContactSafetyService;

  constructor() {
    this.auditLogRepository = new AuditLogRepository();
    this.notificationService = new NotificationService();
    this.carrierApprovalService = new CarrierApprovalService();
    this.contactSafetyService = new ContactSafetyService();
  }

  private parseDateOrThrow(value: string | undefined, field: string): Date | undefined {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new ValidationError(`${field} gecersiz tarih formatinda.`);
    }
    return parsed;
  }

  private resolveDateWindow(dateFrom?: string, dateTo?: string): { from: Date; to: Date } {
    const parsedFrom = this.parseDateOrThrow(dateFrom, 'dateFrom');
    const parsedTo = this.parseDateOrThrow(dateTo, 'dateTo');

    const to = parsedTo ? new Date(parsedTo) : new Date();
    to.setHours(23, 59, 59, 999);

    const from = parsedFrom ? new Date(parsedFrom) : new Date(to);
    if (!parsedFrom) {
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
    }

    if (from > to) {
      throw new ValidationError('dateFrom, dateTo degerinden buyuk olamaz.');
    }

    return { from, to };
  }

  private applyContactFilterLogFilters(
    qb: any,
    params: {
      dateFrom?: Date;
      dateTo?: Date;
      surface?: string;
      actorType?: string;
      action?: string;
      severity?: string;
      reviewStatus?: string;
      shipmentId?: string;
      offerId?: string;
      actorId?: string;
    },
  ): void {
    if (params.dateFrom) {
      qb.andWhere('log.createdAt >= :dateFrom', { dateFrom: params.dateFrom });
    }
    if (params.dateTo) {
      qb.andWhere('log.createdAt <= :dateTo', { dateTo: params.dateTo });
    }
    if (params.surface) {
      qb.andWhere('log.surface = :surface', { surface: params.surface });
    }
    if (params.actorType) {
      qb.andWhere('log.actorType = :actorType', { actorType: params.actorType });
    }
    if (params.action) {
      qb.andWhere('log.action = :action', { action: params.action });
    }
    if (params.severity) {
      qb.andWhere('log.severity = :severity', { severity: params.severity });
    }
    if (params.reviewStatus) {
      qb.andWhere('log.reviewStatus = :reviewStatus', { reviewStatus: params.reviewStatus });
    }
    if (params.shipmentId) {
      qb.andWhere('log.shipmentId = :shipmentId', { shipmentId: params.shipmentId });
    }
    if (params.offerId) {
      qb.andWhere('log.offerId = :offerId', { offerId: params.offerId });
    }
    if (params.actorId) {
      qb.andWhere('log.actorId = :actorId', { actorId: params.actorId });
    }
  }

  private toContactFilterLogDto(row: ContactFilterLog): ContactFilterLogDto {
    return {
      id: row.id,
      createdAt: row.createdAt,
      actorType: row.actorType,
      actorId: row.actorId,
      surface: row.surface,
      shipmentId: row.shipmentId,
      offerId: row.offerId,
      action: row.action,
      severity: row.severity,
      riskScore: row.riskScore,
      reviewStatus: row.reviewStatus,
      matchedRules: Array.isArray(row.matchedRules) ? row.matchedRules : [],
      textHashPreview: row.textHash ? `${row.textHash.slice(0, 12)}…` : '',
    };
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
      draftCarriers,
      rejectedCarriers,
      suspendedCarriers,
      totalShipments,
      activeShipments,
      completedShipments,
      totalOffers,
      totalReviews,
      avgRatingRaw,
      revenueRaw,
    ] = await Promise.all([
      customerRepo.count(),
      carrierRepo.count(),
      carrierRepo.count({ where: { approvalState: CarrierApprovalState.APPROVED } }),
      carrierRepo.count({
        where: [
          { approvalState: CarrierApprovalState.SUBMITTED },
          { approvalState: CarrierApprovalState.IN_REVIEW },
        ],
      }),
      carrierRepo.count({ where: { approvalState: CarrierApprovalState.DRAFT } }),
      carrierRepo.count({ where: { approvalState: CarrierApprovalState.REJECTED } }),
      carrierRepo.count({ where: { approvalState: CarrierApprovalState.SUSPENDED } }),
      shipmentRepo.count(),
      shipmentRepo.count({ where: { status: ShipmentStatus.IN_TRANSIT } }),
      shipmentRepo.count({ where: { status: ShipmentStatus.COMPLETED } }),
      offerRepo.count(),
      reviewRepo.count(),
      reviewRepo
        .createQueryBuilder('review')
        .select('AVG(review.rating)', 'avg')
        .getRawOne<{ avg: string | null }>(),
      shipmentRepo
        .createQueryBuilder('shipment')
        .select('SUM(shipment.price)', 'total')
        .where('shipment.status = :status', { status: ShipmentStatus.COMPLETED })
        .getRawOne<{ total: string | null }>(),
    ]);

    return {
      totalCustomers,
      totalCarriers,
      verifiedCarriers,
      pendingCarriers: pendingVerification,
      draftCarriers,
      rejectedCarriers,
      suspendedCarriers,
      totalShipments,
      activeShipments,
      completedShipments,
      totalOffers,
      totalReviews,
      avgRating: Math.round(Number(avgRatingRaw?.avg || 0) * 10) / 10,
      totalRevenue: Number(revenueRaw?.total || 0),
    };
  }

  // ─── Carriers ──────────────────────────────────────────────────────────────

  async getCarriers(params: { status?: string; page?: number; limit?: number; search?: string }) {
    const { status = 'all', page = 1, limit = 20, search } = params;
    const carrierRepo = AppDataSource.getRepository(Carrier);
    await this.carrierApprovalService.selfHealExpiredLocks();
    const query = carrierRepo.createQueryBuilder('carrier');

    if (status === 'verified') {
      query.andWhere('carrier.approvalState = :state', { state: CarrierApprovalState.APPROVED });
    } else if (status === 'pending') {
      query.andWhere('carrier.approvalState IN (:...states)', {
        states: [CarrierApprovalState.SUBMITTED, CarrierApprovalState.IN_REVIEW],
      });
    } else if (status === 'draft') {
      query.andWhere('carrier.approvalState = :state', { state: CarrierApprovalState.DRAFT });
    } else if (status === 'rejected') {
      query.andWhere('carrier.approvalState = :state', { state: CarrierApprovalState.REJECTED });
    } else if (status === 'suspended') {
      query.andWhere('carrier.approvalState = :state', { state: CarrierApprovalState.SUSPENDED });
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
    await this.carrierApprovalService.selfHealExpiredLocks(carrierId);
    const carrier = await carrierRepo.findOne({
      where: { id: carrierId },
      relations: ['documents', 'carrierVehicles'],
    });
    if (!carrier) throw new Error('Nakliyeci bulunamadı.');
    const { passwordHash, resetToken, verificationToken, ...safeCarrier } = carrier as any;
    return safeCarrier;
  }

  async verifyCarrier(
    adminId: string,
    carrierId: string,
    approved: boolean,
    rejectionReason?: string
  ) {
    const carrierRepo = AppDataSource.getRepository(Carrier);
    await this.carrierApprovalService.selfHealExpiredLocks(carrierId);
    const carrier = await carrierRepo.findOne({ where: { id: carrierId } });
    if (!carrier) throw new Error('Nakliyeci bulunamadı.');

    if (carrier.approvalState === CarrierApprovalState.SUBMITTED) {
      await this.carrierApprovalService.claimForReview(adminId, carrierId);
    } else if (
      carrier.approvalState !== CarrierApprovalState.IN_REVIEW &&
      !(approved === false && carrier.approvalState === CarrierApprovalState.APPROVED)
    ) {
      throw new ValidationError('Nakliyeci karar verilebilir durumda deÄŸil.');
    }

    if (approved) {
      await this.carrierApprovalService.approve(adminId, carrierId);
    } else if (carrier.approvalState === CarrierApprovalState.APPROVED) {
      await this.carrierApprovalService.suspend(
        adminId,
        carrierId,
        rejectionReason || 'Legacy verify endpoint rejection',
      );
    } else {
      await this.carrierApprovalService.reject(
        adminId,
        carrierId,
        rejectionReason || 'Legacy verify endpoint rejection',
      );
    }

    if (approved) {
      const approvedCarrier = await carrierRepo.findOne({ where: { id: carrierId } });
      if (typeof (this.notificationService as any).createFromEvent === 'function') {
        this.notificationService.createFromEvent('carrier.profile_approved', {
          recipientUserId: carrierId,
          entityId: carrierId,
          approvalVersion: approvedCarrier?.approvalVersion ?? 0,
          reviewedByAdminId: adminId,
        }).catch((err) => console.error('Carrier profile approved notification failed:', err));
      } else {
        this.notificationService.createNotification(
          carrierId,
          'carrier',
          'CARRIER_APPROVED',
          'Profiliniz Onaylandı',
          'Başvurunuz onaylandı. Artık aktif olarak teklif verebilirsiniz.',
          carrierId
        ).catch((err) => console.error('Carrier profile approved notification failed:', err));
      }
    }

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

    const safeCustomers = customers.map(({ passwordHash, ...rest }: any) => rest);

    return {
      customers: safeCustomers,
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
      if (status === 'active') {
        query.andWhere('shipment.status IN (:...statuses)', {
          statuses: [ShipmentStatus.MATCHED, ShipmentStatus.IN_TRANSIT],
        });
      } else {
        query.andWhere('shipment.status = :status', { status });
      }
    }

    if (search) {
      query.andWhere(
        `(
          shipment.originCity LIKE :s
          OR shipment.originDistrict LIKE :s
          OR shipment.destinationCity LIKE :s
          OR shipment.destinationDistrict LIKE :s
          OR shipment.loadDetails LIKE :s
          OR customer.firstName LIKE :s
          OR customer.lastName LIKE :s
        )`,
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

  // ─── Contact Filter Logs ───────────────────────────────────────────────────

  async getContactFilterLogs(params: ContactFilterLogsParams): Promise<{
    data: ContactFilterLogDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 30,
      dateFrom,
      dateTo,
      surface,
      actorType,
      action,
      severity,
      reviewStatus,
      shipmentId,
      offerId,
      actorId,
    } = params;

    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * safeLimit;

    const repo = AppDataSource.getRepository(ContactFilterLog);
    const qb = repo
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .skip(offset)
      .take(safeLimit);

    const parsedDateFrom = this.parseDateOrThrow(dateFrom, 'dateFrom');
    const parsedDateTo = this.parseDateOrThrow(dateTo, 'dateTo');
    const normalizedDateTo = parsedDateTo ? new Date(parsedDateTo) : undefined;
    if (normalizedDateTo) {
      normalizedDateTo.setHours(23, 59, 59, 999);
    }

    this.applyContactFilterLogFilters(qb, {
      dateFrom: parsedDateFrom,
      dateTo: normalizedDateTo,
      surface,
      actorType,
      action,
      severity,
      reviewStatus,
      shipmentId,
      offerId,
      actorId,
    });

    const [rows, total] = await qb.getManyAndCount();

    const data = rows.map((row) => this.toContactFilterLogDto(row));

    return { data, total, page: safePage, limit: safeLimit };
  }

  async getContactFilterLogStats(params: ContactFilterLogStatsParams): Promise<ContactFilterLogStatsDto> {
    const { dateFrom, dateTo, surface, actorType, action, severity, reviewStatus } = params;
    const window = this.resolveDateWindow(dateFrom, dateTo);
    const repo = AppDataSource.getRepository(ContactFilterLog);

    const buildBaseQuery = () => {
      const qb = repo.createQueryBuilder('log');
      this.applyContactFilterLogFilters(qb, {
        dateFrom: window.from,
        dateTo: window.to,
        surface,
        actorType,
        action,
        severity,
        reviewStatus,
      });
      return qb;
    };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      todayBlockedCount,
      highRiskCount,
      unreviewedCount,
      topSurfacesRaw,
      actionDistributionRaw,
      severityDistributionRaw,
    ] = await Promise.all([
      buildBaseQuery()
        .andWhere('log.action = :blockedAction', { blockedAction: 'blocked' })
        .andWhere('log.createdAt >= :todayStart AND log.createdAt <= :todayEnd', {
          todayStart,
          todayEnd,
        })
        .getCount(),
      buildBaseQuery()
        .andWhere('(log.severity = :highSeverity OR log.riskScore >= :highRiskScore)', {
          highSeverity: ContactFilterSeverity.HIGH,
          highRiskScore: 80,
        })
        .getCount(),
      buildBaseQuery()
        .andWhere('log.reviewStatus = :unreviewedStatus', { unreviewedStatus: ContactFilterReviewStatus.UNREVIEWED })
        .getCount(),
      buildBaseQuery()
        .select('log.surface', 'surface')
        .addSelect('COUNT(log.id)', 'count')
        .groupBy('log.surface')
        .orderBy('count', 'DESC')
        .limit(5)
        .getRawMany<{ surface: string; count: string }>(),
      buildBaseQuery()
        .select('log.action', 'action')
        .addSelect('COUNT(log.id)', 'count')
        .groupBy('log.action')
        .orderBy('count', 'DESC')
        .getRawMany<{ action: string; count: string }>(),
      buildBaseQuery()
        .select('log.severity', 'severity')
        .addSelect('COUNT(log.id)', 'count')
        .groupBy('log.severity')
        .orderBy('count', 'DESC')
        .getRawMany<{ severity: string; count: string }>(),
    ]);

    let repeatedViolatorCount = 0;
    if (action !== 'flagged' && actorType !== 'system') {
      const repeated = await this.contactSafetyService.getRepeatedViolations({
        windowDays: 7,
        threshold: 3,
        endAt: window.to,
        actorType: actorType as any,
        surface: surface as any,
        severity: severity as any,
        reviewStatus: reviewStatus as any,
      });
      repeatedViolatorCount = repeated.length;
    }

    return {
      todayBlockedCount,
      highRiskCount,
      repeatedViolatorCount,
      unreviewedCount,
      topSurfaces: topSurfacesRaw.map((row) => ({
        surface: row.surface,
        count: Number(row.count || 0),
      })),
      actionDistribution: actionDistributionRaw.map((row) => ({
        action: row.action,
        count: Number(row.count || 0),
      })),
      severityDistribution: severityDistributionRaw.map((row) => ({
        severity: row.severity,
        count: Number(row.count || 0),
      })),
      generatedAt: new Date().toISOString(),
      window: {
        dateFrom: window.from.toISOString(),
        dateTo: window.to.toISOString(),
      },
    };
  }

  async writeAuditLog(data: {
    adminId: string;
    action: string;
    targetType: string;
    targetId: string;
    details?: Record<string, any>;
  }) {
    return this.auditLogRepository.log(data);
  }

  // ─── Dashboard Trends ──────────────────────────────────────────────────────

  async getStatsTrends(days: number = 30) {
    const shipmentRepo = AppDataSource.getRepository(Shipment);
    const offerRepo = AppDataSource.getRepository(Offer);
    const period = Math.min(days, 365);

    const [shipmentRows, offerRows, completedRows] = await Promise.all([
      shipmentRepo.createQueryBuilder('s')
        .select('DATE(s.createdAt)', 'date')
        .addSelect('COUNT(*)', 'count')
        .where('s.createdAt >= DATE_SUB(NOW(), INTERVAL :days DAY)', { days: period })
        .groupBy('DATE(s.createdAt)')
        .getRawMany<{ date: string; count: string }>(),
      offerRepo.createQueryBuilder('o')
        .select('DATE(o.offeredAt)', 'date')
        .addSelect('COUNT(*)', 'count')
        .where('o.offeredAt >= DATE_SUB(NOW(), INTERVAL :days DAY)', { days: period })
        .groupBy('DATE(o.offeredAt)')
        .getRawMany<{ date: string; count: string }>(),
      shipmentRepo.createQueryBuilder('s')
        .select('DATE(s.updatedAt)', 'date')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(s.price)', 'revenue')
        .where('s.status = :st AND s.updatedAt >= DATE_SUB(NOW(), INTERVAL :days DAY)', { st: ShipmentStatus.COMPLETED, days: period })
        .groupBy('DATE(s.updatedAt)')
        .getRawMany<{ date: string; count: string; revenue: string }>(),
    ]);

    const shipmentMap = new Map(shipmentRows.map(r => [r.date, Number(r.count)]));
    const offerMap = new Map(offerRows.map(r => [r.date, Number(r.count)]));
    const completedMap = new Map(completedRows.map(r => [r.date, { count: Number(r.count), revenue: Number(r.revenue || 0) }]));

    const trends: { date: string; shipments: number; offers: number; completed: number; revenue: number }[] = [];
    const now = new Date();
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const completedData = completedMap.get(key) || { count: 0, revenue: 0 };
      trends.push({
        date: key,
        shipments: shipmentMap.get(key) || 0,
        offers: offerMap.get(key) || 0,
        completed: completedData.count,
        revenue: completedData.revenue,
      });
    }
    return { trends };
  }

  // ─── Carrier Shipments & Reviews ───────────────────────────────────────────

  async getCarrierShipments(carrierId: string, params: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 10 } = params;
    const shipmentRepo = AppDataSource.getRepository(Shipment);
    const [shipments, total] = await shipmentRepo.findAndCount({
      where: { carrierId },
      relations: ['customer'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return {
      shipments,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getCarrierReviews(carrierId: string, params: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 10 } = params;
    const reviewRepo = AppDataSource.getRepository(Review);
    const [reviews, total] = await reviewRepo.findAndCount({
      where: { carrierId },
      relations: ['customer', 'shipment'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    const avgRaw = await reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .where('r.carrierId = :carrierId', { carrierId })
      .getRawOne<{ avg: string | null }>();

    return {
      reviews,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      averageRating: Math.round(Number(avgRaw?.avg || 0) * 10) / 10,
    };
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
        `(
          carrier.companyName LIKE :s
          OR shipment.originCity LIKE :s
          OR shipment.originDistrict LIKE :s
          OR shipment.destinationCity LIKE :s
          OR shipment.destinationDistrict LIKE :s
        )`,
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
      if (o.shipment?.customer) {
        const { passwordHash, resetToken, resetTokenExpiry, verificationToken, ...customer } = o.shipment.customer as any;
        o.shipment.customer = customer;
      }
      return o;
    });

    return {
      offers: sanitized,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOfferDetail(offerId: string) {
    const offer = await AppDataSource.getRepository(Offer)
      .createQueryBuilder('offer')
      .leftJoinAndSelect('offer.shipment', 'shipment')
      .leftJoinAndSelect('shipment.customer', 'customer')
      .leftJoinAndSelect('offer.carrier', 'carrier')
      .where('offer.id = :offerId', { offerId })
      .getOne();

    if (!offer) {
      throw new NotFoundError('Teklif bulunamadı.');
    }

    if (offer.carrier) {
      const { passwordHash, resetToken, resetTokenExpiry, verificationToken, ...carrier } = offer.carrier as any;
      offer.carrier = carrier;
    }
    if (offer.shipment?.customer) {
      const { passwordHash, resetToken, resetTokenExpiry, verificationToken, ...customer } = offer.shipment.customer as any;
      offer.shipment.customer = customer;
    }

    const contactLogs = await AppDataSource.getRepository(ContactFilterLog)
      .createQueryBuilder('log')
      .where('log.offerId = :offerId', { offerId })
      .orderBy('log.createdAt', 'DESC')
      .getMany();

    return {
      offer,
      contactLogs: contactLogs.map((log) => this.toContactFilterLogDto(log)),
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
        .select('s.originCity', 'origin')
        .addSelect('s.destinationCity', 'destination')
        .addSelect('COUNT(*)', 'count')
        .addSelect('ROUND(AVG(s.price), 0)', 'avgPrice')
        .groupBy('s.originCity').addGroupBy('s.destinationCity')
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
      where: { deletedAt: null as any },
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

  async createAdmin(adminId: string, data: { email: string; password: string; role?: string; firstName?: string; lastName?: string }) {
    const adminRepo = AppDataSource.getRepository(Admin);
    const existing = await adminRepo.findOne({ where: { email: data.email } });
    if (existing) throw new Error('Bu e-posta adresi zaten kayıtlı.');

    const hash = await bcrypt.hash(data.password, 10);
    const admin = adminRepo.create({
      email: data.email,
      passwordHash: hash,
      role: (data.role === 'superadmin' ? 'superadmin' : 'admin') as any,
      isActive: true,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
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

  async updateAdmin(adminId: string, targetAdminId: string, data: { role?: string; isActive?: boolean; firstName?: string; lastName?: string }) {
    const adminRepo = AppDataSource.getRepository(Admin);
    const admin = await adminRepo.findOne({ where: { id: targetAdminId } });
    if (!admin) throw new Error('Admin bulunamadı.');

    const updateData: Partial<Admin> = {};
    if (data.role !== undefined) updateData.role = (data.role === 'superadmin' ? 'superadmin' : 'admin') as any;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;

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
    if (admin.role === 'superadmin') throw new Error('Superadmin silinemez.');

    await adminRepo.update(targetAdminId, { deletedAt: new Date(), isActive: false });

    await this.auditLogRepository.log({
      adminId,
      action: 'ADMIN_DELETED',
      targetType: 'admin',
      targetId: targetAdminId,
      details: { email: admin.email },
    });

    return { success: true };
  }

  async resetAdminPassword(adminId: string, targetAdminId: string, newPassword: string) {
    const adminRepo = AppDataSource.getRepository(Admin);
    const admin = await adminRepo.findOne({ where: { id: targetAdminId } });
    if (!admin) throw new Error('Admin bulunamadı.');

    const hash = await bcrypt.hash(newPassword, 10);
    await adminRepo.update(targetAdminId, { passwordHash: hash });

    await this.auditLogRepository.log({
      adminId,
      action: 'ADMIN_PASSWORD_RESET',
      targetType: 'admin',
      targetId: targetAdminId,
      details: { email: admin.email },
    });

    return { success: true };
  }

  // ─── Platform Settings ─────────────────────────────────────────────────────

  async getSettings() {
    const settingRepo = AppDataSource.getRepository(PlatformSetting);
    const settings = await settingRepo.find({ order: { key: 'ASC' } });

    const result: Record<string, any> = {};
    for (const s of settings) {
      switch (s.type) {
        case 'number': result[s.key] = Number(s.value); break;
        case 'boolean': result[s.key] = s.value === 'true'; break;
        case 'json': try { result[s.key] = JSON.parse(s.value); } catch { result[s.key] = s.value; } break;
        default: result[s.key] = s.value;
      }
    }
    return { settings: result, raw: settings };
  }

  async updateSettings(adminId: string, updates: Record<string, any>) {
    const numericValidations: Record<string, (v: number) => string | null> = {
      min_offer_price: (v) => v < 0 ? 'Min teklif fiyatı negatif olamaz.' : null,
      max_cancellation_rate: (v) => v < 0 || v > 100 ? 'İptal oranı 0-100 arasında olmalıdır.' : null,
      platform_commission: (v) => v < 0 || v > 100 ? 'Komisyon oranı 0-100 arasında olmalıdır.' : null,
      commission_rate: (v) => v < 0 || v > 100 ? 'Komisyon oranı 0-100 arasında olmalıdır.' : null,
      min_password_length: (v) => v < 6 || v > 32 ? 'Şifre uzunluğu 6-32 arasında olmalıdır.' : null,
      session_timeout: (v) => v < 1 ? 'Oturum zaman aşımı en az 1 dakika olmalıdır.' : null,
    };

    for (const [key, value] of Object.entries(updates)) {
      const validate = numericValidations[key];
      if (validate && typeof value === 'number') {
        const error = validate(value);
        if (error) throw new ValidationError(error);
      }
    }

    const settingRepo = AppDataSource.getRepository(PlatformSetting);
    const changed: string[] = [];

    for (const [key, value] of Object.entries(updates)) {
      const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
      const type = typeof value === 'number' ? 'number'
        : typeof value === 'boolean' ? 'boolean'
        : typeof value === 'object' ? 'json'
        : 'string';

      const existing = await settingRepo.findOne({ where: { key } });
      if (existing) {
        await settingRepo.update(existing.id, { value: valueStr, type: type as any });
      } else {
        const setting = settingRepo.create({ key, value: valueStr, type: type as any });
        await settingRepo.save(setting);
      }
      changed.push(key);
    }

    await this.auditLogRepository.log({
      adminId,
      action: 'SETTINGS_UPDATED',
      targetType: 'platform_setting',
      targetId: 'bulk',
      details: { changedKeys: changed },
    });

    return this.getSettings();
  }

  // ─── Separate Report Endpoints ─────────────────────────────────────────────

  async getTopCarriers(limit: number = 10) {
    const carrierRepo = AppDataSource.getRepository(Carrier);
    const carriers = await carrierRepo.createQueryBuilder('c')
      .select(['c.id', 'c.companyName', 'c.rating', 'c.completedShipments', 'c.email', 'c.approvalState'])
      .orderBy('c.completedShipments', 'DESC')
      .take(limit)
      .getMany();

    return carriers.map(c => ({
      id: c.id,
      companyName: c.companyName,
      email: c.email,
      rating: Number(c.rating || 0),
      completedShipments: c.completedShipments || 0,
      verified: c.approvalState === CarrierApprovalState.APPROVED,
    }));
  }

  async getPopularRoutes(limit: number = 10) {
    const shipmentRepo = AppDataSource.getRepository(Shipment);
    return shipmentRepo.createQueryBuilder('s')
      .select('s.originCity', 'origin')
      .addSelect('s.destinationCity', 'destination')
      .addSelect('COUNT(*)', 'count')
      .addSelect('ROUND(AVG(s.price), 0)', 'avgPrice')
      .groupBy('s.originCity')
      .addGroupBy('s.destinationCity')
      .orderBy('count', 'DESC')
      .take(limit)
      .getRawMany();
  }

  async deleteOffer(adminId: string, offerId: string) {
    const offerRepo = AppDataSource.getRepository(Offer);
    const offer = await offerRepo.findOne({ where: { id: offerId } });
    if (!offer) throw new Error('Teklif bulunamadı.');

    await offerRepo.delete(offerId);

    await this.auditLogRepository.log({
      adminId,
      action: 'OFFER_DELETED',
      targetType: 'offer',
      targetId: offerId,
      details: { shipmentId: offer.shipmentId, carrierId: offer.carrierId, status: offer.status },
    });

    return { success: true };
  }

  // ─── Match Cooldowns ────────────────────────────────────────────────────────

  async getCooldowns(params: {
    page?: number;
    limit?: number;
    status?: string;
    carrierId?: string;
    customerId?: string;
  }) {
    const { page = 1, limit = 30, status, carrierId, customerId } = params;

    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * safeLimit;

    const repo = AppDataSource.getRepository(MatchCooldown);
    const qb = repo
      .createQueryBuilder('c')
      .orderBy('c.activeUntil', 'DESC')
      .skip(offset)
      .take(safeLimit);

    if (status) {
      qb.andWhere('c.status = :status', { status });
    }
    if (carrierId) {
      qb.andWhere('c.carrierId = :carrierId', { carrierId });
    }
    if (customerId) {
      qb.andWhere('c.customerId = :customerId', { customerId });
    }

    const [rows, total] = await qb.getManyAndCount();
    return { data: rows, total, page: safePage, limit: safeLimit };
  }
}
