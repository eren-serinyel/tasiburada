import { OfferService } from '../application/services/OfferService';
import { ConflictError, ForbiddenError, ValidationError } from '../domain/errors/AppError';
import { Shipment, ShipmentCategory, ShipmentStatus } from '../domain/entities/Shipment';
import { Carrier, CarrierApprovalState } from '../domain/entities/Carrier';
import { Offer, OfferStatus } from '../domain/entities/Offer';
import { AppDataSource } from '../infrastructure/database/data-source';
import { PlatformSetting } from '../domain/entities/PlatformSetting';
import { CarrierExtraServiceCapability } from '../domain/entities/CarrierExtraServiceCapability';
import { CarrierCustomExtraService } from '../domain/entities/CarrierCustomExtraService';

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
    expect(service.offerRepository.update).toHaveBeenCalledWith('offer-1', expect.objectContaining({
      price: 1500,
      basePrice: 1500,
      extraServicesTotal: null,
      extraServicesBreakdown: null,
      message: 'updated message',
      estimatedDuration: 3,
      hasSuspiciousContent: false,
      validUntil: expect.any(Date),
    }));
  });

  test('eksik ek hizmet yetkisi teklifi engellemez, warning olarak doner', async () => {
    const service = buildService();
    service.assertCarrierCapabilityForShipment = jest.fn().mockResolvedValue([
      {
        code: 'MISSING_EXTRA_SERVICE_CAPABILITY',
        message: 'Bu ilandaki bazı ek hizmetler profilinizde aktif değil: Server/IT özel taşıma.',
      },
    ]);

    const result = await service.createOffer('carrier-1', {
      shipmentId: 'shipment-1',
      price: 1500,
    });

    expect(result.isNew).toBe(false);
    expect(result.warnings).toEqual([
      expect.objectContaining({ code: 'MISSING_EXTRA_SERVICE_CAPABILITY' }),
    ]);
    expect(service.offerRepository.update).toHaveBeenCalled();
  });

  test('FIXED ek hizmet fiyatlarini mevcut teklif guncellemesine ekler', async () => {
    settingSpy.mockRestore();
    jest.spyOn(AppDataSource, 'getRepository').mockImplementation((entity: any) => {
      if (entity === PlatformSetting) {
        return {
          findOne: jest.fn().mockResolvedValue({ value: '100' }),
        } as any;
      }

      if (entity === CarrierExtraServiceCapability) {
        return {
          find: jest.fn().mockResolvedValue([
            {
              extraServiceId: 'svc-1',
              basePrice: 250,
              extraService: { name: 'Paketleme' },
            },
          ]),
        } as any;
      }

      return {
        findOne: jest.fn(),
        find: jest.fn().mockResolvedValue([]),
      } as any;
    });

    const service = buildService();
    service.shipmentRepository.findById.mockResolvedValue({
      ...shipment,
      extraServices: [{ id: 'svc-1', name: 'Paketleme' }],
    });

    await service.createOffer('carrier-1', {
      shipmentId: 'shipment-1',
      price: 1500,
      message: 'updated message',
      estimatedDuration: 3,
    });

    expect(service.offerRepository.update).toHaveBeenCalledWith('offer-1', expect.objectContaining({
      price: 1750,
      basePrice: 1500,
      extraServicesTotal: 250,
      extraServicesBreakdown: [{ extraServiceId: 'svc-1', name: 'Paketleme', price: 250, source: 'requested' }],
      message: 'updated message',
      estimatedDuration: 3,
      hasSuspiciousContent: false,
      validUntil: expect.any(Date),
    }));
  });

  test('carrier selected custom extra services are added as offered breakdown items', async () => {
    settingSpy.mockRestore();
    jest.spyOn(AppDataSource, 'getRepository').mockImplementation((entity: any) => {
      if (entity === PlatformSetting) {
        return {
          findOne: jest.fn().mockResolvedValue({ value: '100' }),
        } as any;
      }

      if (entity === CarrierExtraServiceCapability) {
        return {
          find: jest.fn().mockResolvedValue([]),
        } as any;
      }

      if (entity === CarrierCustomExtraService) {
        return {
          find: jest.fn().mockResolvedValue([
            {
              id: 'custom-1',
              title: 'Gece taşıma',
              loadType: 'HOME',
              priceMode: 'FIXED',
              basePrice: 800,
            },
          ]),
        } as any;
      }

      return {
        findOne: jest.fn(),
        find: jest.fn().mockResolvedValue([]),
      } as any;
    });

    const service = buildService();

    await service.createOffer('carrier-1', {
      shipmentId: 'shipment-1',
      price: 1500,
      customExtraServiceIds: ['custom-1'],
    });

    expect(service.offerRepository.update).toHaveBeenCalledWith('offer-1', expect.objectContaining({
      price: 2300,
      basePrice: 1500,
      extraServicesTotal: 800,
      extraServicesBreakdown: [{ customServiceId: 'custom-1', name: 'Gece taşıma', price: 800, source: 'offered' }],
    }));
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
    function buildAcceptService(carrierOverrides: Partial<typeof approvedCarrier> = {}, offerOverrides: Partial<Offer> = {}) {
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
        ...offerOverrides,
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
          find: jest.fn().mockResolvedValue([]),
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

    test('validUntil gecmis teklif kabul edilemez', async () => {
      const service = buildAcceptService({}, {
        validUntil: new Date(Date.now() - 60_000),
      });

      await expect(service.acceptOffer('customer-1', 'offer-1'))
        .rejects
        .toThrow('teklifin');
      expect(service.platformPolicy.assertNoActiveCooldown).not.toHaveBeenCalled();
    });

    test('acceptOffer notifies carriers whose pending offers were auto-rejected', async () => {
      const service = buildAcceptService();
      const notificationService = service.notificationService;

      jest.spyOn(AppDataSource.manager, 'transaction').mockRestore();

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
      const autoRejected = [
        { id: 'offer-2', carrierId: 'carrier-2', shipmentId: 'shipment-1', status: OfferStatus.PENDING },
        { id: 'offer-3', carrierId: 'carrier-3', shipmentId: 'shipment-1', status: OfferStatus.PENDING },
      ] as Offer[];
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
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
      };

      jest.spyOn(AppDataSource.manager, 'transaction').mockImplementation(async (cb: any) => {
        const manager = {
          createQueryBuilder: jest.fn((entity: any) => {
            if (entity === Offer) return qbOffer;
            if (entity === Shipment) return qbShipment;
            return qbUpdate;
          }),
          save: jest.fn().mockImplementation(async (_entity: any, item: any) => item),
          find: jest.fn().mockResolvedValue([offerRow, ...autoRejected]),
          findOne: jest.fn().mockImplementation(async (entity: any) => {
            if (entity === Carrier) return approvedCarrier;
            if (entity === Offer) return finalOffer;
            return null;
          }),
        };

        return cb(manager);
      });

      await service.acceptOffer('customer-1', 'offer-1');

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        'carrier-2',
        'carrier',
        'OFFER_REJECTED',
        'Teklifiniz Değerlendirildi',
        expect.stringContaining('başka bir firmayı seçti'),
        'shipment-1'
      );
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        'carrier-3',
        'carrier',
        'OFFER_REJECTED',
        'Teklifiniz Değerlendirildi',
        expect.stringContaining('başka bir firmayı seçti'),
        'shipment-1'
      );
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

  describe('withdrawOffer shipment lifecycle guard', () => {
    function buildWithdrawService(shipmentStatus: ShipmentStatus) {
      const service = new OfferService() as any;
      service.notificationService = {
        createNotification: jest.fn().mockResolvedValue(undefined),
      };

      const shipmentRow = {
        id: 'shipment-1',
        customerId: 'customer-1',
        carrierId: 'carrier-1',
        status: shipmentStatus,
        price: 1000,
      } as Shipment;

      const offerRow = {
        id: 'offer-1',
        shipmentId: 'shipment-1',
        carrierId: 'carrier-1',
        price: 1000,
        status: OfferStatus.ACCEPTED,
        shipment: shipmentRow,
      } as Offer;

      const qbOffer = {
        setLock: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(offerRow),
      };
      const qbUpdate = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };
      const manager = {
        createQueryBuilder: jest.fn((entity?: any) => {
          if (entity === Offer) return qbOffer;
          return qbUpdate;
        }),
        save: jest.fn().mockImplementation(async (_entity: any, item: any) => item),
        findOne: jest.fn().mockImplementation(async (entity: any) => {
          if (entity === Shipment) return shipmentRow;
          if (entity === Offer) {
            return {
              ...offerRow,
              shipment: shipmentRow,
              carrier: { id: 'carrier-1', companyName: 'Test Carrier' },
            };
          }
          return null;
        }),
      };

      jest.spyOn(AppDataSource.manager, 'transaction').mockImplementation(async (cb: any) => cb(manager));

      return { service, manager, shipmentRow, offerRow };
    }

    test('ACCEPTED teklif shipment MATCHED iken geri çekilebilir', async () => {
      const { service, shipmentRow } = buildWithdrawService(ShipmentStatus.MATCHED);

      const result = await service.withdrawOffer('carrier-1', 'offer-1');

      expect(result.status).toBe(OfferStatus.WITHDRAWN);
      expect(shipmentRow.status).toBe(ShipmentStatus.PENDING);
      expect(shipmentRow.carrierId).toBeNull();
      expect(shipmentRow.price).toBeNull();
    });

    test('ACCEPTED teklif shipment IN_TRANSIT olduktan sonra geri çekilemez', async () => {
      const { service, manager, shipmentRow, offerRow } = buildWithdrawService(ShipmentStatus.IN_TRANSIT);

      await expect(service.withdrawOffer('carrier-1', 'offer-1')).rejects.toThrow(ValidationError);
      await expect(service.withdrawOffer('carrier-1', 'offer-1')).rejects.toThrow('Taşıma başladıktan sonra teklif geri çekilemez.');
      expect(manager.save).not.toHaveBeenCalled();
      expect(offerRow.status).toBe(OfferStatus.ACCEPTED);
      expect(shipmentRow.status).toBe(ShipmentStatus.IN_TRANSIT);
      expect(shipmentRow.carrierId).toBe('carrier-1');
      expect(shipmentRow.price).toBe(1000);
    });
  });
});
