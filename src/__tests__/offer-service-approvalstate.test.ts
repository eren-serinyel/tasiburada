import { OfferService } from '../application/services/OfferService';
import { ForbiddenError } from '../domain/errors/AppError';
import { ShipmentCategory, ShipmentStatus } from '../domain/entities/Shipment';
import { CarrierApprovalState } from '../domain/entities/Carrier';
import { AppDataSource } from '../infrastructure/database/data-source';

describe('OfferService approvalState alignment', () => {
  test('approvalState APPROVED olmayan carrier teklif veremez', async () => {
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
    };
    service.offerRepository = {
      findActiveByShipmentAndCarrier: jest.fn().mockResolvedValue(null),
    };
    service.platformPolicy = {
      hasActiveCooldown: jest.fn().mockResolvedValue(false),
      enforceNoContactInfo: jest.fn().mockResolvedValue(undefined),
    };
    service.carrierRepository = {
      findById: jest
        .fn()
        .mockResolvedValueOnce({ carrierVehicles: [] })
        .mockResolvedValueOnce({
          id: 'carrier-1',
          isActive: true,
          verifiedByAdmin: true,
          approvalState: CarrierApprovalState.DRAFT,
        }),
    };

    const settingSpy = jest
      .spyOn(AppDataSource, 'getRepository')
      .mockReturnValue({
        findOne: jest.fn().mockResolvedValue({ value: '100' }),
      } as any);

    try {
      await service.createOffer('carrier-1', { shipmentId: 'shipment-1', price: 1000 });
      throw new Error('Expected createOffer to throw for non-approved carrier');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenError);
      expect((error as Error).message).toContain('APPROVED');
    }

    settingSpy.mockRestore();
  });
});
