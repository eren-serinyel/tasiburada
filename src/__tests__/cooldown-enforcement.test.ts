import { OfferService } from '../application/services/OfferService';
import { ShipmentService } from '../application/services/ShipmentService';
import { PlatformPolicyService } from '../application/services/PlatformPolicyService';
import { AppDataSource } from '../infrastructure/database/data-source';
import { ConflictError } from '../domain/errors/AppError';
import { Shipment, ShipmentCategory, ShipmentStatus } from '../domain/entities/Shipment';
import { CarrierApprovalState } from '../domain/entities/Carrier';
import { Offer, OfferStatus } from '../domain/entities/Offer';
import { MatchCooldownStatus } from '../domain/entities/MatchCooldown';

describe('Cooldown enforcement v1', () => {
  const mockSettingRepo = {
    findOne: jest.fn().mockResolvedValue({ value: '100' }),
  } as any;

  function buildOfferServiceForCreateOffer(hasActiveCooldown: boolean) {
    const service = new OfferService() as any;

    service.assertCarrierCapabilityForShipment = jest.fn().mockResolvedValue(undefined);
    service.shipmentRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'shipment-1',
        customerId: 'customer-1',
        status: ShipmentStatus.PENDING,
        shipmentCategory: ShipmentCategory.HOME_MOVE,
        estimatedWeight: null,
        extraServices: [],
      }),
      update: jest.fn().mockResolvedValue({ id: 'shipment-1' }),
    };
    service.offerRepository = {
      findActiveByShipmentAndCarrier: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'offer-1' }),
      findByIdWithShipmentAndCarrier: jest.fn().mockResolvedValue({
        id: 'offer-1',
        shipmentId: 'shipment-1',
        carrierId: 'carrier-1',
        carrier: { companyName: 'Test Carrier' },
      }),
    };
    service.platformPolicy = {
      hasActiveCooldown: jest.fn().mockResolvedValue(hasActiveCooldown),
      enforceNoContactInfo: jest.fn().mockResolvedValue(undefined),
    };
    service.carrierRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'carrier-1',
        isActive: true,
        verifiedByAdmin: true,
        approvalState: CarrierApprovalState.APPROVED,
        carrierVehicles: [],
      }),
      incrementTotalOffers: jest.fn().mockResolvedValue(undefined),
    };
    service.notificationService = {
      createNotification: jest.fn().mockResolvedValue(undefined),
    };

    const settingSpy = jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockSettingRepo);

    return { service, settingSpy };
  }

  test('active cooldown pair createOffer -> ConflictError', async () => {
    const { service, settingSpy } = buildOfferServiceForCreateOffer(true);

    await expect(
      service.createOffer('carrier-1', { shipmentId: 'shipment-1', price: 1000 })
    ).rejects.toThrow('Bu müşteri ile aktif eşleşme bekleme süresi bulunduğu için teklif verilemez.');

    settingSpy.mockRestore();
  });

  test('expired cooldown createOffer -> allowed', async () => {
    const { service, settingSpy } = buildOfferServiceForCreateOffer(false);

    const result = await service.createOffer('carrier-1', { shipmentId: 'shipment-1', price: 1000 });

    expect(result.isNew).toBe(true);
    expect(result.offer.id).toBe('offer-1');
    settingSpy.mockRestore();
  });

  test('waived cooldown createOffer -> allowed', async () => {
    const { service, settingSpy } = buildOfferServiceForCreateOffer(false);

    const result = await service.createOffer('carrier-1', { shipmentId: 'shipment-1', price: 1000 });

    expect(result.isNew).toBe(true);
    expect(result.offer.id).toBe('offer-1');
    settingSpy.mockRestore();
  });

  function buildPendingShipment(id: string, customerId: string): Shipment {
    return {
      id,
      customerId,
      status: ShipmentStatus.PENDING,
      price: 1000,
      weight: null,
      shipmentDate: new Date('2026-05-01T10:00:00.000Z'),
      createdAt: new Date('2026-04-27T10:00:00.000Z'),
      originCity: 'Istanbul',
      originDistrict: 'Kadikoy',
      destinationCity: 'Ankara',
      destinationDistrict: 'Cankaya',
      loadDetails: 'Test load',
      extraServices: [],
      customer: { firstName: 'Ali', lastName: 'Yilmaz' } as any,
    } as unknown as Shipment;
  }

  test('pending listing active cooldown shipment\'ı göstermez', async () => {
    const service = new ShipmentService() as any;
    service.matchingService = {
      getCarrierForMatching: jest.fn().mockResolvedValue({ id: 'carrier-1' }),
      isShipmentMatchingCarrier: jest.fn().mockReturnValue(true),
    };
    service.shipmentRepository = {
      findPendingShipmentsForCarrier: jest.fn().mockResolvedValue([
        buildPendingShipment('s-1', 'customer-1'),
        buildPendingShipment('s-2', 'customer-2'),
      ]),
    };
    service.platformPolicy = {
      getActiveCooldownCustomerIdsForCarrier: jest.fn().mockResolvedValue(new Set(['customer-1'])),
    };

    const result = await service.getPendingShipmentsForCarrier('carrier-1');

    expect(result.map((item: any) => item.id)).toEqual(['s-2']);
  });

  test('pending listing expired cooldown shipment\'ı gösterir', async () => {
    const service = new ShipmentService() as any;
    service.matchingService = {
      getCarrierForMatching: jest.fn().mockResolvedValue({ id: 'carrier-1' }),
      isShipmentMatchingCarrier: jest.fn().mockReturnValue(true),
    };
    service.shipmentRepository = {
      findPendingShipmentsForCarrier: jest.fn().mockResolvedValue([
        buildPendingShipment('s-1', 'customer-1'),
      ]),
    };
    service.platformPolicy = {
      getActiveCooldownCustomerIdsForCarrier: jest.fn().mockResolvedValue(new Set()),
    };

    const result = await service.getPendingShipmentsForCarrier('carrier-1');

    expect(result.map((item: any) => item.id)).toEqual(['s-1']);
  });

  test('accept cooldown regression: assertNoActiveCooldown çalışmaya devam eder', async () => {
    const service = new OfferService() as any;
    service.platformPolicy = {
      assertNoActiveCooldown: jest.fn().mockRejectedValue(new ConflictError('active cooldown')),
    };

    const offerRow = {
      id: 'offer-1',
      shipmentId: 'shipment-1',
      carrierId: 'carrier-1',
      status: OfferStatus.PENDING,
    };
    const shipmentRow = {
      id: 'shipment-1',
      customerId: 'customer-1',
      status: ShipmentStatus.PENDING,
    };

    const qbOffer = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(offerRow),
    };
    const qbShipment = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(shipmentRow),
    };

    const txSpy = jest.spyOn(AppDataSource.manager, 'transaction').mockImplementation(async (cb: any) => {
      const manager = {
        createQueryBuilder: jest.fn((entity: any) => {
          if (entity === Offer) return qbOffer;
          if (entity === Shipment) return qbShipment;
          return {
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 0 }),
          };
        }),
        save: jest.fn(),
        findOne: jest.fn().mockResolvedValue({
          id: 'carrier-1',
          isActive: true,
          verifiedByAdmin: true,
          approvalState: CarrierApprovalState.APPROVED,
        }),
      };

      return cb(manager);
    });

    await expect(service.acceptOffer('customer-1', 'offer-1')).rejects.toBeInstanceOf(ConflictError);
    expect(service.platformPolicy.assertNoActiveCooldown).toHaveBeenCalledWith('customer-1', 'carrier-1');

    txSpy.mockRestore();
  });

  test('assign carrier cooldown regression: assertNoActiveCooldown çalışmaya devam eder', async () => {
    const service = new ShipmentService() as any;
    service.shipmentRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'shipment-1',
        customerId: 'customer-1',
        status: ShipmentStatus.PENDING,
      }),
    };
    service.platformPolicy = {
      assertNoActiveCooldown: jest.fn().mockRejectedValue(new ConflictError('active cooldown')),
    };

    await expect(service.assignCarrier('shipment-1', 'carrier-1', 'customer-1')).rejects.toBeInstanceOf(ConflictError);
    expect(service.platformPolicy.assertNoActiveCooldown).toHaveBeenCalledWith('customer-1', 'carrier-1');
  });
});

describe('expireStaleCooldowns lifecycle', () => {
  let service: PlatformPolicyService;

  beforeEach(() => {
    service = new PlatformPolicyService();
  });

  test('stale ACTIVE kayıtları EXPIRED yapar ve affected count döner', async () => {
    const mockRepo = { update: jest.fn().mockResolvedValue({ affected: 5 }) };
    const repoSpy = jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepo as any);

    const count = await service.expireStaleCooldowns(new Date('2026-04-27T12:00:00.000Z'));

    expect(count).toBe(5);
    expect(mockRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: MatchCooldownStatus.ACTIVE }),
      { status: MatchCooldownStatus.EXPIRED }
    );
    repoSpy.mockRestore();
  });

  test('geçmiş kayıt yoksa 0 döner', async () => {
    const mockRepo = { update: jest.fn().mockResolvedValue({ affected: 0 }) };
    const repoSpy = jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepo as any);

    const count = await service.expireStaleCooldowns(new Date());

    expect(count).toBe(0);
    repoSpy.mockRestore();
  });

  test('affected undefined ise 0 döner', async () => {
    const mockRepo = { update: jest.fn().mockResolvedValue({}) };
    const repoSpy = jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepo as any);

    const count = await service.expireStaleCooldowns(new Date());

    expect(count).toBe(0);
    repoSpy.mockRestore();
  });

  test('WAIVED ve EXPIRED kayıtlar dokunulmaz — filtre ACTIVE statusa göre', async () => {
    const mockRepo = { update: jest.fn().mockResolvedValue({ affected: 0 }) };
    const repoSpy = jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepo as any);

    await service.expireStaleCooldowns(new Date());

    // update call must always target only ACTIVE status — never WAIVED or EXPIRED
    expect(mockRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: MatchCooldownStatus.ACTIVE }),
      expect.not.objectContaining({ status: MatchCooldownStatus.WAIVED })
    );
    repoSpy.mockRestore();
  });
});

describe('expireStaleCooldowns + hasActiveCooldown integration', () => {
  test('activeUntil geçmiş cooldown hasActiveCooldown false döner', async () => {
    const service = new PlatformPolicyService();
    // MoreThan(now) filter in repo.findOne excludes expired rows — returns null
    const mockRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    const repoSpy = jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepo as any);

    const result = await service.hasActiveCooldown('customer-1', 'carrier-1');

    expect(result).toBe(false);
    repoSpy.mockRestore();
  });

  test('activeUntil gelecekte olan ACTIVE cooldown hasActiveCooldown true döner', async () => {
    const service = new PlatformPolicyService();
    const mockRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 42 }),
      update: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    const repoSpy = jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepo as any);

    const result = await service.hasActiveCooldown('customer-1', 'carrier-1');

    expect(result).toBe(true);
    repoSpy.mockRestore();
  });

  test('getActiveCooldownCustomerIdsForCarrier expired pair döndürmez', async () => {
    const service = new PlatformPolicyService();
    // repo.find returns empty — expired rows excluded by MoreThan(now) query
    const mockRepo = {
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const repoSpy = jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepo as any);

    const result = await service.getActiveCooldownCustomerIdsForCarrier('carrier-1', ['customer-1']);

    expect(result.size).toBe(0);
    repoSpy.mockRestore();
  });

  test('getActiveCooldownCustomerIdsForCarrier expireStaleCooldowns çağırır', async () => {
    const service = new PlatformPolicyService();
    const expireSpy = jest.spyOn(service, 'expireStaleCooldowns').mockResolvedValue(0);
    const mockRepo = {
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    const repoSpy = jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepo as any);

    await service.getActiveCooldownCustomerIdsForCarrier('carrier-1', ['customer-1']);

    expect(expireSpy).toHaveBeenCalledTimes(1);
    expireSpy.mockRestore();
    repoSpy.mockRestore();
  });

  test('active cooldown hâlâ createOffer bloklar', async () => {
    // Covered by existing "active cooldown pair createOffer -> ConflictError" test
    // This test verifies the logic path explicitly via hasActiveCooldown
    const service = new PlatformPolicyService();
    const mockRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 1 }), // active future cooldown
      update: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    const repoSpy = jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepo as any);

    const isBlocked = await service.hasActiveCooldown('customer-1', 'carrier-1');

    expect(isBlocked).toBe(true);
    repoSpy.mockRestore();
  });
});
