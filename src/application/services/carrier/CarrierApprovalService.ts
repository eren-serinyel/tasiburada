import { EntityManager } from 'typeorm';
import { AppDataSource } from '../../../infrastructure/database/data-source';
import { Carrier, CarrierApprovalState } from '../../../domain/entities';
import { AuditLogRepository } from '../../../infrastructure/repositories/AuditLogRepository';
import { CarrierRepository } from '../../../infrastructure/repositories/CarrierRepository';
import { ValidationError, ConflictError, NotFoundError, ForbiddenError } from '../../../domain/errors/AppError';
import {
  CarrierApprovalReadiness,
  computeCarrierApprovalReadiness,
} from './CarrierApprovalCriteria';

export type { CarrierApprovalReadiness } from './CarrierApprovalCriteria';

const REVIEW_LOCK_MINUTES = 15;
const SUBMIT_COOLDOWN_MS = 60 * 1000;

export class CarrierApprovalReadinessError extends ValidationError {
  constructor(public readonly readiness: CarrierApprovalReadiness) {
    super('Profil incelemeye gönderilecek durumda değil.');
  }
}

type QueueFilters = {
  state?: CarrierApprovalState | 'all';
  assignedAdminId?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export class CarrierApprovalService {
  private carrierRepository = new CarrierRepository();
  private auditLogRepository = new AuditLogRepository();

  async refreshApprovalProjection(carrierId: string, manager?: EntityManager): Promise<CarrierApprovalReadiness> {
    const carrier = await this.getCarrierWithRelations(carrierId, manager);
    const readiness = this.computeReadiness(carrier);
    const repo = this.getCarrierRepo(manager);

    const nextState = this.deriveStateAfterProjection(carrier, readiness);
    await repo.update(carrierId, {
      approvalReadinessCached: readiness.isReadyForSubmission,
      approvalReadinessComputedAt: new Date(),
      approvalState: nextState,
      verifiedByAdmin: nextState === CarrierApprovalState.APPROVED,
      pendingApproval: [CarrierApprovalState.SUBMITTED, CarrierApprovalState.IN_REVIEW].includes(nextState),
      isActive:
        nextState === CarrierApprovalState.SUSPENDED
          ? false
          : nextState === CarrierApprovalState.APPROVED
            ? true
            : carrier.isActive,
    });

    return readiness;
  }

  async markDraftChanged(carrierId: string): Promise<CarrierApprovalReadiness> {
    await AppDataSource.transaction(async (manager) => {
      const repo = this.getCarrierRepo(manager);
      await repo
        .createQueryBuilder()
        .update(Carrier)
        .set({
          draftRevision: () => '`draft_revision` + 1',
        })
        .where('id = :carrierId', { carrierId })
        .execute();

      const carrier = await this.getCarrierWithRelations(carrierId, manager);
      const readiness = this.computeReadiness(carrier);
      const nextState = this.deriveStateAfterProjection(carrier, readiness, true);

      await repo.update(carrierId, {
        approvalState: nextState,
        approvalReadinessCached: readiness.isReadyForSubmission,
        approvalReadinessComputedAt: new Date(),
        verifiedByAdmin: nextState === CarrierApprovalState.APPROVED,
        pendingApproval: [CarrierApprovalState.SUBMITTED, CarrierApprovalState.IN_REVIEW].includes(nextState),
        isActive:
          nextState === CarrierApprovalState.SUSPENDED
            ? false
            : nextState === CarrierApprovalState.APPROVED
              ? true
              : carrier.isActive,
        reviewLockAdminId: nextState === CarrierApprovalState.SUBMITTED ? null : carrier.reviewLockAdminId,
        reviewLockExpiresAt: nextState === CarrierApprovalState.SUBMITTED ? null : carrier.reviewLockExpiresAt,
        reviewSessionId: nextState === CarrierApprovalState.SUBMITTED ? null : carrier.reviewSessionId,
      });
    });

    return this.getReadiness(carrierId);
  }

  async getReadiness(carrierId: string): Promise<CarrierApprovalReadiness> {
    const carrier = await this.getCarrierWithRelations(carrierId);
    return this.computeReadiness(carrier);
  }

  async submitForReview(carrierId: string): Promise<{ approvalState: CarrierApprovalState; approvalVersion: number; resubmissionCount: number; submittedAt: Date }> {
    return AppDataSource.transaction(async (manager) => {
      const repo = this.getCarrierRepo(manager);
      const carrier = await this.getCarrierWithRelations(carrierId, manager);
      await this.selfHealExpiredLocks(carrier.id, manager);
      const refreshed = await this.getCarrierWithRelations(carrierId, manager);
      const readiness = this.computeReadiness(refreshed);

      if (![CarrierApprovalState.DRAFT, CarrierApprovalState.REJECTED].includes(refreshed.approvalState)) {
        throw new ConflictError('Bu kayıt şu an tekrar incelemeye gönderilemez.');
      }

      if (!readiness.isReadyForSubmission) {
        throw new CarrierApprovalReadinessError(readiness);
      }

      if (Date.now() - new Date(refreshed.lastSubmittedAt ?? 0).getTime() < SUBMIT_COOLDOWN_MS) {
        throw new ConflictError('Çok sık submit denemesi yapıyorsunuz. Lütfen kısa süre sonra tekrar deneyin.');
      }

      const isResubmission = refreshed.approvalVersion > 0;
      const now = new Date();
      await repo.update(carrierId, {
        approvalState: CarrierApprovalState.SUBMITTED,
        approvalVersion: refreshed.approvalVersion + 1,
        resubmissionCount: isResubmission ? refreshed.resubmissionCount + 1 : refreshed.resubmissionCount,
        lastSubmittedAt: now,
        approvalReadinessCached: readiness.isReadyForSubmission,
        approvalReadinessComputedAt: now,
        pendingApproval: true,
        verifiedByAdmin: false,
        reviewLockAdminId: null,
        reviewLockExpiresAt: null,
        reviewSessionId: null,
      });

      await this.auditLogRepository.log({
        adminId: carrierId,
        action: 'CARRIER_APPROVAL_SUBMITTED',
        targetType: 'carrier_approval',
        targetId: carrierId,
        details: {
          carrierId,
          approvalVersion: refreshed.approvalVersion + 1,
          resubmissionCount: isResubmission ? refreshed.resubmissionCount + 1 : refreshed.resubmissionCount,
          draftRevision: refreshed.draftRevision,
        },
      });

      return {
        approvalState: CarrierApprovalState.SUBMITTED,
        approvalVersion: refreshed.approvalVersion + 1,
        resubmissionCount: isResubmission ? refreshed.resubmissionCount + 1 : refreshed.resubmissionCount,
        submittedAt: now,
      };
    });
  }

  async claimForReview(adminId: string, carrierId: string): Promise<{ approvalState: CarrierApprovalState; reviewLockAdminId: string; reviewLockExpiresAt: Date; reviewSessionId: string }> {
    return AppDataSource.transaction(async (manager) => {
      const repo = this.getCarrierRepo(manager);
      const lockExpiresAt = new Date(Date.now() + REVIEW_LOCK_MINUTES * 60 * 1000);
      const reviewSessionId = this.generateSessionId();

      const result = await repo
        .createQueryBuilder()
        .update(Carrier)
        .set({
          approvalState: CarrierApprovalState.IN_REVIEW,
          reviewLockAdminId: adminId,
          reviewLockExpiresAt: lockExpiresAt,
          reviewSessionId,
          pendingApproval: true,
        })
        .where('id = :carrierId', { carrierId })
        .andWhere(`(
          approval_state = :submittedState
          OR (approval_state = :reviewState AND review_lock_expires_at IS NOT NULL AND review_lock_expires_at <= NOW())
        )`, {
          submittedState: CarrierApprovalState.SUBMITTED,
          reviewState: CarrierApprovalState.IN_REVIEW,
        })
        .andWhere('(review_lock_admin_id IS NULL OR review_lock_expires_at IS NULL OR review_lock_expires_at <= NOW())')
        .execute();

      if (!result.affected) {
        throw new ConflictError('Bu kayıt şu anda başka bir admin tarafından inceleniyor olabilir.');
      }

      await this.auditLogRepository.log({
        adminId,
        action: 'CARRIER_APPROVAL_CLAIMED',
        targetType: 'carrier_approval',
        targetId: carrierId,
        details: { reviewSessionId, reviewLockExpiresAt: lockExpiresAt },
      });

      return {
        approvalState: CarrierApprovalState.IN_REVIEW,
        reviewLockAdminId: adminId,
        reviewLockExpiresAt: lockExpiresAt,
        reviewSessionId,
      };
    });
  }

  async releaseReview(adminId: string, carrierId: string): Promise<{ approvalState: CarrierApprovalState }> {
    return AppDataSource.transaction(async (manager) => {
      const carrier = await this.assertLockedByAdmin(carrierId, adminId, manager);
      await this.getCarrierRepo(manager).update(carrierId, {
        approvalState: CarrierApprovalState.SUBMITTED,
        reviewLockAdminId: null,
        reviewLockExpiresAt: null,
        reviewSessionId: null,
        pendingApproval: true,
      });

      await this.auditLogRepository.log({
        adminId,
        action: 'CARRIER_APPROVAL_RELEASED',
        targetType: 'carrier_approval',
        targetId: carrierId,
        details: { previousState: carrier.approvalState },
      });

      return { approvalState: CarrierApprovalState.SUBMITTED };
    });
  }

  async approve(adminId: string, carrierId: string, note?: string): Promise<{ approvalState: CarrierApprovalState; approvedAt: Date }> {
    return AppDataSource.transaction(async (manager) => {
      await this.assertLockedByAdmin(carrierId, adminId, manager);
      const carrier = await this.getCarrierWithRelations(carrierId, manager);
      const readiness = this.computeReadiness(carrier);
      if (!readiness.isReadyForSubmission) {
        throw new ValidationError('Profil artık onaylanabilir durumda değil.');
      }
      if (!readiness.requiredDocumentsApproved) {
        throw new ValidationError('Tüm zorunlu belgeler onaylanmadan carrier onaylanamaz.');
      }

      const approvedAt = new Date();
      await this.getCarrierRepo(manager).update(carrierId, {
        approvalState: CarrierApprovalState.APPROVED,
        verifiedByAdmin: true,
        pendingApproval: false,
        isActive: true,
        reviewLockAdminId: null,
        reviewLockExpiresAt: null,
        reviewSessionId: null,
        lastReviewedDraftRevision: carrier.draftRevision,
        approvalReadinessCached: readiness.isReadyForSubmission,
        approvalReadinessComputedAt: approvedAt,
      });

      await this.auditLogRepository.log({
        adminId,
        action: 'CARRIER_APPROVED',
        targetType: 'carrier_approval',
        targetId: carrierId,
        details: { note: note || null, approvalVersion: carrier.approvalVersion },
      });

      return { approvalState: CarrierApprovalState.APPROVED, approvedAt };
    });
  }

  async reject(adminId: string, carrierId: string, reason: string): Promise<{ approvalState: CarrierApprovalState; rejectedAt: Date }> {
    if (!reason?.trim()) {
      throw new ValidationError('Red gerekçesi zorunludur.');
    }

    return AppDataSource.transaction(async (manager) => {
      const carrier = await this.assertLockedByAdmin(carrierId, adminId, manager);
      const rejectedAt = new Date();

      await this.getCarrierRepo(manager).update(carrierId, {
        approvalState: CarrierApprovalState.REJECTED,
        verifiedByAdmin: false,
        pendingApproval: false,
        isActive: false,
        lastRejectedAt: rejectedAt,
        reviewLockAdminId: null,
        reviewLockExpiresAt: null,
        reviewSessionId: null,
        lastReviewedDraftRevision: carrier.draftRevision,
      });

      await this.auditLogRepository.log({
        adminId,
        action: 'CARRIER_REJECTED',
        targetType: 'carrier_approval',
        targetId: carrierId,
        details: { reason, approvalVersion: carrier.approvalVersion },
      });

      return { approvalState: CarrierApprovalState.REJECTED, rejectedAt };
    });
  }

  async suspend(adminId: string, carrierId: string, reason: string): Promise<{ approvalState: CarrierApprovalState }> {
    if (!reason?.trim()) {
      throw new ValidationError('Askıya alma gerekçesi zorunludur.');
    }

    return AppDataSource.transaction(async (manager) => {
      const carrier = await this.getCarrierWithRelations(carrierId, manager);
      if (carrier.approvalState !== CarrierApprovalState.APPROVED) {
        throw new ConflictError('Sadece onaylı carrier askıya alınabilir.');
      }

      await this.getCarrierRepo(manager).update(carrierId, {
        approvalState: CarrierApprovalState.SUSPENDED,
        verifiedByAdmin: false,
        pendingApproval: false,
        isActive: false,
      });

      await this.auditLogRepository.log({
        adminId,
        action: 'CARRIER_SUSPENDED',
        targetType: 'carrier_approval',
        targetId: carrierId,
        details: { reason },
      });

      return { approvalState: CarrierApprovalState.SUSPENDED };
    });
  }

  async getApprovalQueue(filters: QueueFilters = {}) {
    await this.selfHealExpiredLocks();

    const {
      state = 'all',
      assignedAdminId,
      search,
      page = 1,
      limit = 20,
    } = filters;

    const repo = this.getCarrierRepo();
    const query = repo
      .createQueryBuilder('carrier')
      .leftJoinAndSelect('carrier.documents', 'documents')
      .leftJoinAndSelect('carrier.activity', 'activity');

    if (state !== 'all') {
      query.andWhere('carrier.approvalState = :state', { state });
    } else {
      query.andWhere('carrier.approvalState IN (:...states)', {
        states: [CarrierApprovalState.SUBMITTED, CarrierApprovalState.IN_REVIEW],
      });
    }

    if (assignedAdminId) {
      query.andWhere('carrier.reviewLockAdminId = :assignedAdminId', { assignedAdminId });
    }

    if (search) {
      query.andWhere('(carrier.companyName LIKE :search OR carrier.email LIKE :search OR carrier.taxNumber LIKE :search)', {
        search: `%${search}%`,
      });
    }

    query.orderBy('carrier.lastSubmittedAt', 'ASC').take(limit).skip((page - 1) * limit);
    const [carriers, total] = await query.getManyAndCount();

    const items = carriers.map((carrier) => {
      const readiness = this.computeReadiness(carrier);
      return {
        carrierId: carrier.id,
        companyName: carrier.companyName,
        email: carrier.email,
        approvalState: carrier.approvalState,
        approvalVersion: carrier.approvalVersion,
        resubmissionCount: carrier.resubmissionCount,
        requiredDocumentsComplete: readiness.requiredDocumentsPresent,
        requiredDocumentsValid: readiness.requiredDocumentsValid,
        requiredDocuments: readiness.requiredDocuments,
        isReadyForSubmission: readiness.isReadyForSubmission,
        submittedAt: carrier.lastSubmittedAt,
        lastRejectedAt: carrier.lastRejectedAt,
        assignedAdminId: carrier.reviewLockAdminId,
        reviewLockExpiresAt: carrier.reviewLockExpiresAt,
      };
    });

    return {
      items,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async selfHealExpiredLocks(carrierId?: string, manager?: EntityManager): Promise<void> {
    const repo = this.getCarrierRepo(manager);
    const query = repo
      .createQueryBuilder()
      .update(Carrier)
      .set({
        approvalState: CarrierApprovalState.SUBMITTED,
        reviewLockAdminId: null,
        reviewLockExpiresAt: null,
        reviewSessionId: null,
        pendingApproval: true,
      })
      .where('approval_state = :reviewState', { reviewState: CarrierApprovalState.IN_REVIEW })
      .andWhere('review_lock_expires_at IS NOT NULL')
      .andWhere('review_lock_expires_at <= NOW()');

    if (carrierId) {
      query.andWhere('id = :carrierId', { carrierId });
    }

    await query.execute();
  }

  private computeReadiness(carrier: Carrier): CarrierApprovalReadiness {
    return computeCarrierApprovalReadiness(carrier);
  }

  private deriveStateAfterProjection(
    carrier: Carrier,
    readiness: CarrierApprovalReadiness,
    invalidateReview: boolean = false,
  ): CarrierApprovalState {
    if (carrier.approvalState === CarrierApprovalState.APPROVED || carrier.approvalState === CarrierApprovalState.SUSPENDED) {
      return carrier.approvalState;
    }

    if (invalidateReview && carrier.approvalState === CarrierApprovalState.IN_REVIEW) {
      return CarrierApprovalState.SUBMITTED;
    }

    if (carrier.approvalState === CarrierApprovalState.SUBMITTED || carrier.approvalState === CarrierApprovalState.IN_REVIEW) {
      return carrier.approvalState;
    }

    if (carrier.approvalState === CarrierApprovalState.REJECTED) {
      return readiness.isReadyForSubmission ? CarrierApprovalState.REJECTED : CarrierApprovalState.DRAFT;
    }

    return CarrierApprovalState.DRAFT;
  }

  private async assertLockedByAdmin(carrierId: string, adminId: string, manager?: EntityManager): Promise<Carrier> {
    await this.selfHealExpiredLocks(carrierId, manager);
    const carrier = await this.getCarrierWithRelations(carrierId, manager);

    if (carrier.approvalState !== CarrierApprovalState.IN_REVIEW) {
      throw new ConflictError('Bu kayıt aktif inceleme durumunda değil.');
    }

    if (carrier.reviewLockAdminId !== adminId) {
      throw new ForbiddenError('Bu inceleme başka bir admin tarafından tutuluyor.');
    }

    if (carrier.reviewLockExpiresAt && carrier.reviewLockExpiresAt.getTime() <= Date.now()) {
      throw new ConflictError('İnceleme lock süresi dolmuş.');
    }

    return carrier;
  }

  private async getCarrierWithRelations(carrierId: string, manager?: EntityManager): Promise<Carrier> {
    const repo = this.getCarrierRepo(manager);
    const carrier = await repo.findOne({
      where: { id: carrierId },
      relations: ['activity', 'documents', 'vehicleTypeLinks', 'serviceTypeLinks', 'earnings'],
    });
    if (!carrier) {
      throw new NotFoundError('Nakliyeci bulunamadı.');
    }
    return carrier;
  }

  private getCarrierRepo(manager?: EntityManager) {
    return (manager ?? AppDataSource.manager).getRepository(Carrier);
  }

  private generateSessionId(): string {
    return `review-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
