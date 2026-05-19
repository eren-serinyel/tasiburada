import { ShipmentService } from '../application/services/ShipmentService';
import { Shipment, ShipmentStatus } from '../domain/entities/Shipment';
import { Carrier, CarrierApprovalState } from '../domain/entities/Carrier';

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
    assignCarrierIfOpen: jest.fn(),
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

describe('Shipment lifecycle hardening', () => {
  test('assignCarrier rejects carriers that fail matching eligibility', async () => {
    const service = buildService();
    const shipment = buildShipment();
    const carrier = buildCarrier({ verifiedByAdmin: false });

    service.shipmentRepository.findById.mockResolvedValue(shipment);
    service.matchingService.getCarrierForMatching.mockResolvedValue(carrier);
    service.matchingService.isShipmentMatchingCarrier.mockReturnValue(false);

    await expect(service.assignCarrier(shipment.id, carrier.id, shipment.customerId))
      .rejects
      .toMatchObject({ statusCode: 403 });

    expect(service.platformPolicy.assertNoActiveCooldown).not.toHaveBeenCalled();
    expect(service.shipmentRepository.assignCarrierIfOpen).not.toHaveBeenCalled();
  });

  test('assignCarrier allows offer_received shipments only after matching eligibility passes', async () => {
    const service = buildService();
    const shipment = buildShipment({ status: ShipmentStatus.OFFER_RECEIVED });
    const carrier = buildCarrier();
    const matched = {
      ...shipment,
      carrierId: carrier.id,
      status: ShipmentStatus.MATCHED,
      matchedAt: new Date('2026-05-01T10:00:00.000Z'),
    };

    service.shipmentRepository.findById.mockResolvedValue(shipment);
    service.matchingService.getCarrierForMatching.mockResolvedValue(carrier);
    service.matchingService.isShipmentMatchingCarrier.mockReturnValue(true);
    service.shipmentRepository.assignCarrierIfOpen.mockResolvedValue(matched);

    const result = await service.assignCarrier(shipment.id, carrier.id, shipment.customerId);

    expect(service.matchingService.isShipmentMatchingCarrier).toHaveBeenCalledWith(shipment, carrier);
    expect(service.platformPolicy.assertNoActiveCooldown).toHaveBeenCalledWith(shipment.customerId, carrier.id);
    expect(service.shipmentRepository.assignCarrierIfOpen).toHaveBeenCalledWith(shipment.id, carrier.id);
    expect(result.status).toBe(ShipmentStatus.MATCHED);
    expect(result.carrierId).toBe(carrier.id);
  });

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

  test('ensureStatusTransition rejects MATCHED → PENDING (illegal backward transition)', () => {
    const service = buildService();
    expect(() => service['ensureStatusTransition'](ShipmentStatus.MATCHED, ShipmentStatus.PENDING))
      .toThrow('Bu işlem şu anki durum');
  });

  test('ensureStatusTransition rejects COMPLETED → IN_TRANSIT (terminal state immutability)', () => {
    const service = buildService();
    expect(() => service['ensureStatusTransition'](ShipmentStatus.COMPLETED, ShipmentStatus.IN_TRANSIT))
      .toThrow('Bu işlem şu anki durum');
  });

  test('ensureStatusTransition rejects CANCELLED → PENDING (terminal state immutability)', () => {
    const service = buildService();
    expect(() => service['ensureStatusTransition'](ShipmentStatus.CANCELLED, ShipmentStatus.PENDING))
      .toThrow('Bu işlem şu anki durum');
  });

  test('ensureStatusTransition allows MATCHED → IN_TRANSIT (legal progression)', () => {
    const service = buildService();
    expect(() => service['ensureStatusTransition'](ShipmentStatus.MATCHED, ShipmentStatus.IN_TRANSIT))
      .not.toThrow();
  });

  test('ensureStatusTransition allows IN_TRANSIT → COMPLETED (legal progression)', () => {
    const service = buildService();
    expect(() => service['ensureStatusTransition'](ShipmentStatus.IN_TRANSIT, ShipmentStatus.COMPLETED))
      .not.toThrow();
  });
});
