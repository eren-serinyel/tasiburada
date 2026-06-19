import { randomUUID } from 'node:crypto';
import { ShipmentService } from '../application/services/ShipmentService';
import { Shipment, ShipmentStatus } from '../domain/entities/Shipment';
import { Offer, OfferStatus } from '../domain/entities/Offer';
import { Carrier, CarrierApprovalState } from '../domain/entities/Carrier';
import { Customer } from '../domain/entities/Customer';
import { CarrierEarningsLog } from '../domain/entities/CarrierEarningsLog';
import { AppDataSource } from '../infrastructure/database/data-source';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

function buildShipment(overrides: Partial<Shipment> = {}): Shipment {
  return {
    id: 'shipment-1',
    customerId: 'customer-1',
    carrierId: null,
    status: ShipmentStatus.OFFER_RECEIVED,
    price: null,
    weight: null,
    estimatedWeight: null,
    shipmentDate: new Date('2026-06-01T09:00:00.000Z'),
    createdAt: new Date('2026-05-01T09:00:00.000Z'),
    originCity: 'Istanbul',
    originDistrict: 'Kadikoy',
    destinationCity: 'Istanbul',
    destinationDistrict: 'Besiktas',
    shipmentCategory: null,
    insuranceType: null,
    dateFlexibility: null,
    originPlaceType: null,
    destinationPlaceType: null,
    originFloor: null,
    destinationFloor: null,
    originHasElevator: false,
    destinationHasElevator: false,
    loadDetails: 'Pilot esya tasima',
    extraServices: [],
    customer: { firstName: 'Ada', lastName: 'Yilmaz' } as any,
    ...overrides,
  } as Shipment;
}

function buildCarrier(overrides: Partial<Carrier> = {}): Carrier {
  return {
    id: 'carrier-1',
    isActive: true,
    verifiedByAdmin: true,
    approvalState: CarrierApprovalState.APPROVED,
    ...overrides,
  } as Carrier;
}

function buildService() {
  const service = new ShipmentService() as any;
  service.shipmentRepository = {
    findById: jest.fn(),
    findPendingShipmentsForCarrier: jest.fn(),
    expireStaleOpenShipments: jest.fn().mockResolvedValue(0),
  };
  service.offerRepository = {
    expireStalePendingOffers: jest.fn().mockResolvedValue(0),
  };
  service.matchingService = {
    getCarrierForMatching: jest.fn(),
    isShipmentMatchingCarrier: jest.fn(),
  };
  service.platformPolicy = {
    assertNoActiveCooldown: jest.fn().mockResolvedValue(undefined),
    getActiveCooldownCustomerIdsForCarrier: jest.fn().mockResolvedValue(new Set<string>()),
  };
  return service;
}

async function createMatchedCancellationFixture(overrides: {
  carrier?: Partial<Carrier>;
  shipment?: Partial<Shipment>;
  offer?: Partial<Offer>;
} = {}) {
  const suffix = randomUUID();
  const customerRepo = AppDataSource.getRepository(Customer);
  const carrierRepo = AppDataSource.getRepository(Carrier);
  const shipmentRepo = AppDataSource.getRepository(Shipment);
  const offerRepo = AppDataSource.getRepository(Offer);

  const customer = await customerRepo.save(customerRepo.create({
    firstName: 'Cancel',
    lastName: 'Customer',
    email: `cancel-customer-${suffix}@example.com`,
    phone: '5550000000',
    passwordHash: 'hash',
    isActive: true,
    isVerified: true,
  }));

  const carrier = await carrierRepo.save(carrierRepo.create({
    companyName: `Cancel Carrier ${suffix}`,
    taxNumber: suffix.replace(/-/g, '').slice(0, 32),
    phone: '5551111111',
    email: `cancel-carrier-${suffix}@example.com`,
    passwordHash: 'hash',
    foundedYear: 2020,
    isActive: true,
    verifiedByAdmin: true,
    approvalState: CarrierApprovalState.APPROVED,
    completedShipments: 1,
    cancelledShipments: 0,
    totalOffers: 2,
    acceptedOffers: 2,
    successRate: 50,
    ...overrides.carrier,
  }));

  const shipmentId = randomUUID();
  const shipment = {
    id: shipmentId,
    customerId: customer.id,
    carrierId: carrier.id,
    status: ShipmentStatus.MATCHED,
    price: 2000,
    matchedAt: new Date(),
    ...overrides.shipment,
  } as Shipment;
  await AppDataSource.query(
    `INSERT INTO shipments (
      id, customer_id, carrier_id, status, price,
      origin_city, origin_district, destination_city, destination_district,
      load_details, shipment_date, photo_urls, matched_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      shipment.id,
      shipment.customerId,
      shipment.carrierId,
      shipment.status,
      shipment.price,
      'Istanbul',
      'Kadikoy',
      'Ankara',
      'Cankaya',
      'Matched cancellation fixture',
      new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      JSON.stringify([]),
      shipment.matchedAt,
    ],
  );

  const offerId = randomUUID();
  const offer = {
    id: offerId,
    shipmentId: shipment.id,
    carrierId: carrier.id,
    price: 2000,
    status: OfferStatus.ACCEPTED,
    hasSuspiciousContent: false,
    ...overrides.offer,
  } as Offer;
  await AppDataSource.query(
    `INSERT INTO offers (id, shipmentId, carrierId, price, status, has_suspicious_content)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      offer.id,
      offer.shipmentId,
      offer.carrierId,
      offer.price,
      offer.status,
      offer.hasSuspiciousContent,
    ],
  );

  return { customer, carrier, shipment, offer };
}

describe('Shipment lifecycle hardening', () => {
  test('carrier pending list keeps offer_received shipments visible when they still match', async () => {
    const service = buildService();
    const carrier = buildCarrier();
    const pendingShipment = buildShipment({ id: 'pending-1', status: ShipmentStatus.PENDING });
    const offerReceivedShipment = buildShipment({ id: 'offer-received-1', status: ShipmentStatus.OFFER_RECEIVED });

    service.matchingService.getCarrierForMatching.mockResolvedValue(carrier);
    service.shipmentRepository.findPendingShipmentsForCarrier.mockResolvedValue([
      pendingShipment,
      offerReceivedShipment,
    ]);
    service.matchingService.isShipmentMatchingCarrier.mockReturnValue(true);

    const result = await service.getPendingShipmentsForCarrier(carrier.id);

    expect(result.map((shipment: any) => shipment.id)).toEqual([
      pendingShipment.id,
      offerReceivedShipment.id,
    ]);
    expect(result.map((shipment: any) => shipment.status)).toEqual([
      ShipmentStatus.PENDING,
      ShipmentStatus.OFFER_RECEIVED,
    ]);
  });

  test('ensureStatusTransition rejects MATCHED â†’ PENDING (illegal backward transition)', () => {
    const service = buildService();
    expect(() => service['ensureStatusTransition'](ShipmentStatus.MATCHED, ShipmentStatus.PENDING))
      .toThrow('matched');
  });

  test('ensureStatusTransition rejects COMPLETED â†’ IN_TRANSIT (terminal state immutability)', () => {
    const service = buildService();
    expect(() => service['ensureStatusTransition'](ShipmentStatus.COMPLETED, ShipmentStatus.IN_TRANSIT))
      .toThrow('completed');
  });

  test('ensureStatusTransition rejects CANCELLED â†’ PENDING (terminal state immutability)', () => {
    const service = buildService();
    expect(() => service['ensureStatusTransition'](ShipmentStatus.CANCELLED, ShipmentStatus.PENDING))
      .toThrow('cancelled');
  });

  test('ensureStatusTransition allows MATCHED â†’ IN_TRANSIT (legal progression)', () => {
    const service = buildService();
    expect(() => service['ensureStatusTransition'](ShipmentStatus.MATCHED, ShipmentStatus.IN_TRANSIT))
      .not.toThrow();
  });

  test('ensureStatusTransition allows IN_TRANSIT â†’ COMPLETED (legal progression)', () => {
    const service = buildService();
    expect(() => service['ensureStatusTransition'](ShipmentStatus.IN_TRANSIT, ShipmentStatus.COMPLETED))
      .not.toThrow();
  });
  test('ensureStatusTransition rejects EXPIRED -> PENDING (terminal state immutability)', () => {
    const service = buildService();
    expect(() => service['ensureStatusTransition'](ShipmentStatus.EXPIRED, ShipmentStatus.PENDING))
      .toThrow('expired');
  });

  test('expireStale delegates shipment and offer cleanup', async () => {
    const service = buildService();
    service.shipmentRepository.expireStaleOpenShipments.mockResolvedValue(2);
    service.offerRepository.expireStalePendingOffers.mockResolvedValue(3);

    await expect(service.expireStale()).resolves.toEqual({ shipments: 2, offers: 3 });
    expect(service.shipmentRepository.expireStaleOpenShipments).toHaveBeenCalledTimes(1);
    expect(service.offerRepository.expireStalePendingOffers).toHaveBeenCalledTimes(1);
  });

  test('MATCHED cancellation cancels accepted offer and removes acceptedOffers denominator penalty', async () => {
    if (skipDB()) return;

    const carrierRepo = AppDataSource.getRepository(Carrier);
    const shipmentRepo = AppDataSource.getRepository(Shipment);
    const offerRepo = AppDataSource.getRepository(Offer);
    const customerRepo = AppDataSource.getRepository(Customer);
    const fixture = await createMatchedCancellationFixture();

    try {
      const service = new ShipmentService() as any;
      service.notificationService = {
        createNotification: jest.fn().mockResolvedValue(undefined),
      };
      service.platformPolicy = {
        shouldCreateCancellationCooldown: jest.fn().mockReturnValue(false),
        createCancellationCooldown: jest.fn().mockResolvedValue(undefined),
      };

      const result = await service.cancel(fixture.customer.id, fixture.shipment.id, 'karsilikli mutabakat');

      expect(result.status).toBe(ShipmentStatus.CANCELLED);
      expect((await shipmentRepo.findOneByOrFail({ id: fixture.shipment.id })).status).toBe(ShipmentStatus.CANCELLED);
      expect((await offerRepo.findOneByOrFail({ id: fixture.offer.id })).status).toBe(OfferStatus.CANCELLED);

      const carrier = await carrierRepo.findOneByOrFail({ id: fixture.carrier.id });
      expect(carrier.acceptedOffers).toBe(1);
      expect(carrier.cancelledShipments).toBe(1);
      expect(carrier.successRate).toBe(100);
    } finally {
      await offerRepo.delete({ shipmentId: fixture.shipment.id });
      await shipmentRepo.delete(fixture.shipment.id);
      await carrierRepo.delete(fixture.carrier.id);
      await customerRepo.delete(fixture.customer.id);
    }
  });

  test('MATCHED cancellation rolls back offer and carrier stats when shipment update fails', async () => {
    if (skipDB()) return;

    const carrierRepo = AppDataSource.getRepository(Carrier);
    const shipmentRepo = AppDataSource.getRepository(Shipment);
    const offerRepo = AppDataSource.getRepository(Offer);
    const customerRepo = AppDataSource.getRepository(Customer);
    const fixture = await createMatchedCancellationFixture();
    const triggerName = `tr_cancel_rollback_${randomUUID().replace(/-/g, '').slice(0, 16)}`;

    try {
      await AppDataSource.query(`
        CREATE TRIGGER ${triggerName}
        BEFORE UPDATE ON shipments
        FOR EACH ROW
        BEGIN
          IF NEW.id = '${fixture.shipment.id}' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'forced shipment cancel rollback';
          END IF;
        END
      `);

      const service = new ShipmentService() as any;
      service.notificationService = {
        createNotification: jest.fn().mockResolvedValue(undefined),
      };
      service.platformPolicy = {
        shouldCreateCancellationCooldown: jest.fn().mockReturnValue(false),
        createCancellationCooldown: jest.fn().mockResolvedValue(undefined),
      };

      await expect(service.cancel(fixture.customer.id, fixture.shipment.id, 'karsilikli mutabakat'))
        .rejects
        .toThrow('forced shipment cancel rollback');

      expect(service.notificationService.createNotification).not.toHaveBeenCalled();
      expect(service.platformPolicy.createCancellationCooldown).not.toHaveBeenCalled();
      expect((await shipmentRepo.findOneByOrFail({ id: fixture.shipment.id })).status).toBe(ShipmentStatus.MATCHED);
      expect((await offerRepo.findOneByOrFail({ id: fixture.offer.id })).status).toBe(OfferStatus.ACCEPTED);

      const carrier = await carrierRepo.findOneByOrFail({ id: fixture.carrier.id });
      expect(carrier.acceptedOffers).toBe(2);
      expect(carrier.cancelledShipments).toBe(0);
      expect(carrier.successRate).toBe(50);
    } finally {
      await AppDataSource.query(`DROP TRIGGER IF EXISTS ${triggerName}`);
      await offerRepo.delete({ shipmentId: fixture.shipment.id });
      await shipmentRepo.delete(fixture.shipment.id);
      await carrierRepo.delete(fixture.carrier.id);
      await customerRepo.delete(fixture.customer.id);
    }
  });

  test('completeShipment rolls status back when transactional earnings step fails', async () => {
    if (skipDB()) return;

    const carrierRepo = AppDataSource.getRepository(Carrier);
    const customerRepo = AppDataSource.getRepository(Customer);
    const shipmentRepo = AppDataSource.getRepository(Shipment);
    const earningsRepo = AppDataSource.getRepository(CarrierEarningsLog);

    const carrier = await carrierRepo.findOne({ where: { email: 'info@silenakliyat.com' } as any });
    const customer = await customerRepo.findOne({ where: { email: 'ahmet.yilmaz0@gmail.com' } });
    if (!carrier || !customer) return;

    const shipmentId = randomUUID();
    await AppDataSource.query(
      `INSERT INTO shipments (
        id, customer_id, carrier_id, status, price,
        origin_city, origin_district, destination_city, destination_district,
        load_details, shipment_date, photo_urls
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shipmentId,
        customer.id,
        carrier.id,
        ShipmentStatus.IN_TRANSIT,
        1500,
        'Istanbul',
        'Kadikoy',
        'Istanbul',
        'Besiktas',
        'Rollback contract shipment',
        '2026-07-01',
        JSON.stringify([]),
      ],
    );

    try {
      const service = new ShipmentService() as any;
      service.platformPolicy = {
        computeCommission: jest.fn().mockRejectedValue(new Error('forced-commission-failure')),
      };

      await expect(service.completeShipmentByCarrier(carrier.id, shipmentId))
        .rejects
        .toThrow('forced-commission-failure');

      const persisted = await shipmentRepo
        .createQueryBuilder('shipment')
        .select(['shipment.id', 'shipment.status'])
        .where('shipment.id = :shipmentId', { shipmentId })
        .getOne();
      expect(persisted?.status).toBe(ShipmentStatus.IN_TRANSIT);
      expect(await earningsRepo.count({ where: { shipmentId } })).toBe(0);
    } finally {
      await earningsRepo.delete({ shipmentId });
      await shipmentRepo.delete(shipmentId);
    }
  });
});
