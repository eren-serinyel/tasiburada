import { AppDataSource } from '../infrastructure/database/data-source';
import { Carrier, CarrierApprovalState } from '../domain/entities/Carrier';
import { CarrierActivity } from '../domain/entities/CarrierActivity';
import { CarrierDocument, CarrierDocumentStatus, CarrierDocumentType } from '../domain/entities/CarrierDocument';
import { CarrierServiceType } from '../domain/entities/CarrierServiceType';
import { CarrierVehicleType } from '../domain/entities/CarrierVehicleType';
import { CarrierEarnings } from '../domain/entities/CarrierEarnings';
import { VehicleType } from '../domain/entities/VehicleType';
import { ServiceType } from '../domain/entities/ServiceType';
import { Admin } from '../domain/entities/Admin';
import { CarrierApprovalService } from '../application/services/carrier/CarrierApprovalService';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

const REQUIRED_DOCUMENT_TYPES: CarrierDocumentType[] = [
  CarrierDocumentType.AUTHORIZATION_CERT,
  CarrierDocumentType.SRC_CERT,
  CarrierDocumentType.VEHICLE_LICENSE,
  CarrierDocumentType.TAX_PLATE,
];

describe('CarrierApprovalService', () => {
  const service = new CarrierApprovalService();
  const carrierRepo = () => AppDataSource.getRepository(Carrier);
  const activityRepo = () => AppDataSource.getRepository(CarrierActivity);
  const documentRepo = () => AppDataSource.getRepository(CarrierDocument);
  const vehicleLinkRepo = () => AppDataSource.getRepository(CarrierVehicleType);
  const serviceLinkRepo = () => AppDataSource.getRepository(CarrierServiceType);
  const earningsRepo = () => AppDataSource.getRepository(CarrierEarnings);
  const vehicleTypeRepo = () => AppDataSource.getRepository(VehicleType);
  const serviceTypeRepo = () => AppDataSource.getRepository(ServiceType);
  const adminRepo = () => AppDataSource.getRepository(Admin);

  let carrierId = '';
  let adminId = '';
  let superadminId = '';
  let vehicleTypeId = '';
  let serviceTypeId = '';

  beforeAll(async () => {
    if (skipDB()) return;

    const admin = await adminRepo().findOne({ where: { email: 'admin@tasiburadan.com' } });
    const superadmin = await adminRepo().findOne({ where: { email: 'superadmin@tasiburadan.com' } });
    const vehicleType = await vehicleTypeRepo().findOne({ where: {} });
    const serviceType = await serviceTypeRepo().findOne({ where: {} });

    if (!admin || !superadmin || !vehicleType || !serviceType) {
      throw new Error('Approval test prerequisites are missing.');
    }

    adminId = admin.id;
    superadminId = superadmin.id;
    vehicleTypeId = vehicleType.id;
    serviceTypeId = serviceType.id;

    const carrier = await carrierRepo().save(
      carrierRepo().create({
        companyName: 'Approval Test Carrier',
        taxNumber: `APPROVAL-${Date.now()}`.slice(0, 32),
        contactName: 'Approval Test',
        phone: '05555555555',
        email: `approval-${Date.now()}@example.com`,
        passwordHash: 'test-hash',
        isActive: false,
        foundedYear: 2019,
        hasUploadedDocuments: true,
        verifiedByAdmin: false,
        pendingApproval: false,
        approvalState: CarrierApprovalState.DRAFT,
        approvalVersion: 0,
        resubmissionCount: 0,
        lastRejectedAt: null,
        lastSubmittedAt: null,
        reviewLockAdminId: null,
        reviewLockExpiresAt: null,
        reviewSessionId: null,
        approvalReadinessCached: false,
        approvalReadinessComputedAt: null,
        draftRevision: 1,
        lastReviewedDraftRevision: 0,
        documentCount: 0,
        balance: 0,
        rating: 0,
        completedShipments: 0,
        cancelledShipments: 0,
        totalOffers: 0,
        successRate: 0,
      }),
    );

    carrierId = carrier.id;
  });

  afterAll(async () => {
    if (skipDB() || !carrierId) return;
    await carrierRepo().delete(carrierId);
  });

  beforeEach(async () => {
    if (skipDB() || !carrierId) return;
    await resetCarrier(CarrierDocumentStatus.APPROVED);
  });

  async function resetCarrier(documentStatus: CarrierDocumentStatus) {
    await documentRepo().delete({ carrierId });
    await serviceLinkRepo().delete({ carrierId });
    await vehicleLinkRepo().delete({ carrierId });
    await activityRepo().delete({ carrierId });
    await earningsRepo().delete({ carrierId });

    await activityRepo().save(
      activityRepo().create({
        carrierId,
        city: 'Istanbul',
        district: 'Kadikoy',
        address: 'Test Mahallesi',
        serviceAreasJson: ['Istanbul', 'Ankara'],
        availableDates: '[]',
      }),
    );

    await vehicleLinkRepo().save(
      vehicleLinkRepo().create({
        carrierId,
        vehicleTypeId,
        capacityKg: 1200,
      }),
    );

    await serviceLinkRepo().save(
      serviceLinkRepo().create({
        carrierId,
        serviceTypeId,
      }),
    );

    await earningsRepo().save(earningsRepo().create({
      carrierId,
      bankName: 'Test Bankası',
      iban: 'TR330006100519786457841326',
      accountHolder: 'Approval Test Carrier',
    }));

    await documentRepo().save(
      REQUIRED_DOCUMENT_TYPES.map((type) =>
        documentRepo().create({
          carrierId,
          type,
          fileUrl: `/uploads/tests/${type.toLowerCase()}.pdf`,
          isRequired: true,
          status: documentStatus,
          isApproved: documentStatus === CarrierDocumentStatus.APPROVED,
        }),
      ),
    );

    await carrierRepo().update(carrierId, {
      companyName: 'Approval Test Carrier',
      taxNumber: `APPROVAL-${carrierId.slice(0, 8)}`,
      phone: '05555555555',
      email: `approval-${carrierId.slice(0, 8)}@example.com`,
      foundedYear: 2019,
      hasUploadedDocuments: true,
      isActive: false,
      verifiedByAdmin: false,
      pendingApproval: false,
      approvalState: CarrierApprovalState.DRAFT,
      approvalVersion: 0,
      resubmissionCount: 0,
      lastRejectedAt: null,
      lastSubmittedAt: null,
      reviewLockAdminId: null,
      reviewLockExpiresAt: null,
      reviewSessionId: null,
      approvalReadinessCached: false,
      approvalReadinessComputedAt: null,
      draftRevision: 1,
      lastReviewedDraftRevision: 0,
      documentCount: REQUIRED_DOCUMENT_TYPES.length,
    });

    await service.refreshApprovalProjection(carrierId);
  }

  test('approval lifecycle moves draft -> submitted -> in_review -> approved', async () => {
    if (skipDB()) return;

    const submission = await service.submitForReview(carrierId);
    expect(submission.approvalState).toBe(CarrierApprovalState.SUBMITTED);

    const claim = await service.claimForReview(adminId, carrierId);
    expect(claim.approvalState).toBe(CarrierApprovalState.IN_REVIEW);

    const approval = await service.approve(adminId, carrierId, 'Looks good');
    expect(approval.approvalState).toBe(CarrierApprovalState.APPROVED);

    const carrier = await carrierRepo().findOneByOrFail({ id: carrierId });
    expect(carrier.approvalState).toBe(CarrierApprovalState.APPROVED);
    expect(carrier.verifiedByAdmin).toBe(true);
    expect(carrier.pendingApproval).toBe(false);
  });

  test('atomic claim allows only one admin to acquire the review lock', async () => {
    if (skipDB()) return;

    await service.submitForReview(carrierId);

    const [first, second] = await Promise.allSettled([
      service.claimForReview(adminId, carrierId),
      service.claimForReview(superadminId, carrierId),
    ]);

    const fulfilled = [first, second].filter((result) => result.status === 'fulfilled');
    const rejected = [first, second].filter((result) => result.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const carrier = await carrierRepo().findOneByOrFail({ id: carrierId });
    expect(carrier.approvalState).toBe(CarrierApprovalState.IN_REVIEW);
    expect([adminId, superadminId]).toContain(carrier.reviewLockAdminId);
  });

  test('reject requires a draft change before resubmission', async () => {
    if (skipDB()) return;

    await service.submitForReview(carrierId);
    await service.claimForReview(adminId, carrierId);
    const rejection = await service.reject(adminId, carrierId, 'Eksik bilgi');
    expect(rejection.approvalState).toBe(CarrierApprovalState.REJECTED);

    await expect(service.submitForReview(carrierId)).rejects.toMatchObject({ statusCode: 400 });

    await service.markDraftChanged(carrierId);
    await carrierRepo().update(carrierId, {
      lastSubmittedAt: new Date(Date.now() - 120_000),
    });
    const resubmission = await service.submitForReview(carrierId);
    expect(resubmission.approvalState).toBe(CarrierApprovalState.SUBMITTED);
    expect(resubmission.approvalVersion).toBe(2);
    expect(resubmission.resubmissionCount).toBe(1);
  });

  test('invalid approve is blocked and expired review locks self-heal back to submitted', async () => {
    if (skipDB()) return;

    await service.submitForReview(carrierId);
    await expect(service.approve(adminId, carrierId)).rejects.toMatchObject({ statusCode: 409 });

    await carrierRepo().update(carrierId, {
      approvalState: CarrierApprovalState.IN_REVIEW,
      pendingApproval: true,
      reviewLockAdminId: adminId,
      reviewLockExpiresAt: new Date(Date.now() - 60_000),
      reviewSessionId: 'expired-lock',
    });

    const queue = await service.getApprovalQueue({ state: 'all', page: 1, limit: 20 });
    expect(queue.items.some((item) => item.carrierId === carrierId)).toBe(true);

    const carrier = await carrierRepo().findOneByOrFail({ id: carrierId });
    expect(carrier.approvalState).toBe(CarrierApprovalState.SUBMITTED);
    expect(carrier.reviewLockAdminId).toBeNull();
  });
});
