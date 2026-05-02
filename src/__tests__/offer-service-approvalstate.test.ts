import { OfferService } from '../application/services/OfferService';
import { ConflictError, ForbiddenError } from '../domain/errors/AppError';
import { Shipment, ShipmentCategory, ShipmentStatus } from '../domain/entities/Shipment';
import { Carrier, CarrierApprovalState } from '../domain/entities/Carrier';
import { Offer, OfferStatus } from '../domain/entities/Offer';
import { AppDataSource } from '../infrastructure/database/data-source';

describe('OfferService approvalState alignment', () => {
  const shipment = {
    id: 'shipment-1',
    customerId: 'customer-1',
    status: ShipmentStatus.PENDING,
    shipmentCategory: ShipmentCategory.HOME_MOVE,
    estimatedWeight: null,
    extraServices: [],
  };

  const approvedCarrier = {
    id: 'carrier-1',
    isActive: true,
    verifiedByAdmin: true,
    approvalState: CarrierApprovalState.APPROVED,
    carrierVehicles: [],
  };

  const existingOffer = {
    id: 'offer-1',
    shipmentId: 'shipment-1',
    carrierId: 'carrier-1',
    price: 1000,
    message: 'old message',
    estimatedDuration: 2,
    status: OfferStatus.PENDING,
    hasSuspiciousContent: false,
  };

  const updatedOffer = {
    ...existingOffer,
    price: 1500,
    message: 'updated message',
    estimatedDuration: 3,
    carrier: { companyName: 'Test Carrier' },
  };

  let settingSpy: jest.SpyInstance;

  beforeEach(() => {
    settingSpy = jest.spyOn(AppDataSource, 'getRepository').mockReturnValue({
      findOne: jest.fn().mockResolvedValue({ value: '100' }),
    } as any);
  });

  afterEach(() => {
    settingSpy.mockRestore();
    jest.restoreAllMocks();
  });

  function buildService(options: {
    carrier?: any;
    hasActiveCooldown?: boolean;
    capabilityError?: Error;
    contactError?: Error;
  } = {}) {
    const service = new OfferService() as any;

    service.shipmentRepository = {
      findById: jest.fn().mockResolvedValue(shipment),
    };
    service.offerRepository = {
      findActiveByShipmentAndCarrier: jest.fn().mockResolvedValue(existingOffer),
      update: jest.fn().mockResolvedValue({ ...existingOffer, price: 1500 }),
      findByIdWithShipmentAndCarrier: jest.fn().mockResolvedValue(updatedOffer),
    };
    service.platformPolicy = {
      hasActiveCooldown: jest.fn().mockResolvedValue(options.hasActiveCooldown ?? false),
      enforceNoContactInfo: options.contactError
        ? jest.fn().mockRejectedValue(options.contactError)
        : jest.fn().mockResolvedValue(undefined),
    };
    service.carrierRepository = {
      findById: jest.fn().mockResolvedValue(options.carrier ?? approvedCarrier),
      incrementTotalOffers: jest.fn().mockResolvedValue(undefined),
    };
    service.notificationService = {
      createNotification: jest.fn().mockResolvedValue(undefined),
    };
    service.assertCarrierCapabilityForShipment = options.capabilityError
      ? jest.fn().mockRejectedValue(options.capabilityError)
      : jest.fn().mockResolvedValue(undefined);

    return service;
  }

  test('approvalState APPROVED olmayan carrier teklif veremez', async () => {
    const service = buildService({
      carrier: {
        ...approvedCarrier,
        approvalState: CarrierApprovalState.DRAFT,
      },
    });

    await expect(
      service.createOffer('carrier-1', { shipmentId: 'shipment-1', price: 1000 })
    ).rejects.toThrow(ForbiddenError);
    await expect(
      service.createOffer('carrier-1', { shipmentId: 'shipment-1', price: 1000 })
    ).rejects.toThrow('APPROVED');
  });

  test('APPROVED carrier existing offer update yapabilir', async () => {
    const service = buildService();

    const result = await service.createOffer('carrier-1', {
      shipmentId: 'shipment-1',
      price: 1500,
      message: 'updated message',
      estimatedDuration: 3,
    });

    expect(result.isNew).toBe(false);
    expect(result.offer.id).toBe('offer-1');
    expect(service.offerRepository.update).toHaveBeenCalledWith('offer-1', {
      price: 1500,
      message: 'updated message',
      estimatedDuration: 3,
      hasSuspiciousContent: false,
    });
  });

  test.each([
    ['SUSPENDED', CarrierApprovalState.SUSPENDED],
    ['REJECTED', CarrierApprovalState.REJECTED],
    ['DRAFT', CarrierApprovalState.DRAFT],
  ])('%s carrier existing offer update yapamaz', async (_label, approvalState) => {
    const service = buildService({
      carrier: {
        ...approvedCarrier,
        approvalState,
      },
    });

    await expect(
      service.createOffer('carrier-1', { shipmentId: 'shipment-1', price: 1500 })
    ).rejects.toThrow(ForbiddenError);
    expect(service.offerRepository.update).not.toHaveBeenCalled();
  });

  test('inactive carrier existing offer update yapamaz', async () => {
    const service = buildService({
      carrier: {
        ...approvedCarrier,
        isActive: false,
      },
    });

    await expect(
      service.createOffer('carrier-1', { shipmentId: 'shipment-1', price: 1500 })
    ).rejects.toThrow(ForbiddenError);
    expect(service.offerRepository.update).not.toHaveBeenCalled();
  });

  test('unverified carrier existing offer update yapamaz', async () => {
    const service = buildService({
      carrier: {
        ...approvedCarrier,
        verifiedByAdmin: false,
      },
    });

    await expect(
      service.createOffer('carrier-1', { shipmentId: 'shipment-1', price: 1500 })
    ).rejects.toThrow(ForbiddenError);
    expect(service.offerRepository.update).not.toHaveBeenCalled();
  });

  test('capability kaybi sonrasi existing offer update yapamaz', async () => {
    const service = buildService({
      capabilityError: new ForbiddenError('Bu yuk turu icin teklif veremezsiniz.'),
    });

    await expect(
      service.createOffer('carrier-1', { shipmentId: 'shipment-1', price: 1500 })
    ).rejects.toThrow(ForbiddenError);
    expect(service.offerRepository.update).not.toHaveBeenCalled();
  });

  test('active cooldown varsa existing offer update yapamaz', async () => {
    const service = buildService({ hasActiveCooldown: true });

    await expect(
      service.createOffer('carrier-1', { shipmentId: 'shipment-1', price: 1500 })
    ).rejects.toThrow(ConflictError);
    expect(service.offerRepository.update).not.toHaveBeenCalled();
  });

  test('contact info iceren message existing offer update yapamaz', async () => {
    const service = buildService({
      contactError: new ForbiddenError('Teklif mesajinda iletisim bilgisi paylasilamaz.'),
    });

    await expect(
      service.createOffer('carrier-1', {
        shipmentId: 'shipment-1',
        price: 1500,
        message: 'Bana 0532 123 45 67 numaradan ulasin',
      })
    ).rejects.toThrow(ForbiddenError);
    expect(service.offerRepository.update).not.toHaveBeenCalled();
  });

  describe('acceptOffer carrier trust gate', () => {
    function buildAcceptService(carrierOverrides: Partial<typeof approvedCarrier> = {}) {
      const service = new OfferService() as any;
      service.platformPolicy = {
        assertNoActiveCooldown: jest.fn().mockResolvedValue(undefined),
      };
      service.notificationService = {
        createNotification: jest.fn().mockResolvedValue(undefined),
      };

      const offerRow = {
        id: 'offer-1',
        shipmentId: 'shipment-1',
        carrierId: 'carrier-1',
        price: 1000,
        status: OfferStatus.PENDING,
      };

      const shipmentRow = {
        id: 'shipment-1',
        customerId: 'customer-1',
        status: ShipmentStatus.PENDING,
        price: null,
      } as Shipment;

      const finalOffer = {
        ...offerRow,
        status: OfferStatus.ACCEPTED,
        shipment: shipmentRow,
        carrier: { id: 'carrier-1', companyName: 'Test Carrier' },
      } as Offer;

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
      const qbUpdate = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };

      jest.spyOn(AppDataSource.manager, 'transaction').mockImplementation(async (cb: any) => {
        const manager = {
          createQueryBuilder: jest.fn((entity: any) => {
            if (entity === Offer) return qbOffer;
            if (entity === Shipment) return qbShipment;
            return qbUpdate;
          }),
          save: jest.fn().mockImplementation(async (_entity: any, item: any) => item),
          findOne: jest.fn().mockImplementation(async (entity: any) => {
            if (entity === Carrier) {
              return {
                ...approvedCarrier,
                ...carrierOverrides,
              };
            }
            if (entity === Offer) {
              return finalOffer;
            }
            return null;
          }),
        };

        return cb(manager);
      });

      return service;
    }

    test('APPROVED carrier old pending offer accept edilebilir', async () => {
      const service = buildAcceptService();

      const result = await service.acceptOffer('customer-1', 'offer-1');

      expect(result.status).toBe(OfferStatus.ACCEPTED);
      expect(service.platformPolicy.assertNoActiveCooldown).toHaveBeenCalledWith('customer-1', 'carrier-1');
    });

    test.each([
      ['SUSPENDED', { approvalState: CarrierApprovalState.SUSPENDED, isActive: false, verifiedByAdmin: false }],
      ['REJECTED', { approvalState: CarrierApprovalState.REJECTED, isActive: false, verifiedByAdmin: false }],
      ['inactive', { isActive: false }],
      ['unverified', { verifiedByAdmin: false }],
    ])('%s carrier old pending offer accept edilemez', async (_label, carrierOverrides) => {
      const service = buildAcceptService(carrierOverrides);

      await expect(service.acceptOffer('customer-1', 'offer-1')).rejects.toThrow(ConflictError);
      await expect(service.acceptOffer('customer-1', 'offer-1')).rejects.toThrow('Bu taşıyıcı artık teklif kabulü için uygun değil.');
      expect(service.platformPolicy.assertNoActiveCooldown).not.toHaveBeenCalled();
    });
  });
});
