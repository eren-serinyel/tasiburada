import { MatchingService } from '../application/services/MatchingService';
import { Carrier, CarrierApprovalState } from '../domain/entities/Carrier';
import { ExtraServiceLoadType } from '../domain/entities/ExtraServiceApplicability';
import { Shipment, ShipmentCategory } from '../domain/entities/Shipment';

function buildCarrier(overrides: Partial<Carrier> = {}): Carrier {
  return {
    id: 'carrier-1',
    isActive: true,
    verifiedByAdmin: true,
    approvalState: CarrierApprovalState.APPROVED,
    activityCity: 'Istanbul',
    scopeLinks: [{ scope: { name: 'Şehir İçi' } }] as any,
    loadTypeCapabilities: [{ loadType: ExtraServiceLoadType.HOME, isActive: true }] as any,
    extraServiceCapabilities: [{ extraServiceId: 'es-1', loadType: ExtraServiceLoadType.HOME, isActive: true }] as any,
    vehicleTypeLinks: [{ vehicleTypeId: 'vt-1' }] as any,
    activity: { availableDates: [] } as any,
    ...overrides,
  } as Carrier;
}

function buildShipment(overrides: Partial<Shipment> = {}): Shipment {
  return {
    id: 'shipment-1',
    originCity: 'Istanbul',
    destinationCity: 'Istanbul',
    shipmentDate: new Date('2026-05-01T12:00:00.000Z'),
    shipmentCategory: ShipmentCategory.HOME_MOVE,
    extraServices: [] as any,
    vehicleTypePreferenceId: 'vt-1',
    ...overrides,
  } as Shipment;
}

describe('MatchingService MVP hardening', () => {
  let service: MatchingService;

  beforeEach(() => {
    service = new MatchingService();
  });

  test('SUSPENDED carrier false', () => {
    const carrier = buildCarrier({ approvalState: CarrierApprovalState.SUSPENDED });
    const shipment = buildShipment();

    expect(service.isShipmentMatchingCarrier(shipment, carrier)).toBe(false);
  });

  test('REJECTED carrier false', () => {
    const carrier = buildCarrier({ approvalState: CarrierApprovalState.REJECTED });
    const shipment = buildShipment();

    expect(service.isShipmentMatchingCarrier(shipment, carrier)).toBe(false);
  });

  test('APPROVED carrier true path', () => {
    const carrier = buildCarrier();
    const shipment = buildShipment();

    expect(service.isShipmentMatchingCarrier(shipment, carrier)).toBe(true);
  });

  test('intra-city wrong city false', () => {
    const carrier = buildCarrier({ activityCity: 'Ankara' });
    const shipment = buildShipment({ originCity: 'Istanbul', destinationCity: 'Istanbul' });

    expect(service.isShipmentMatchingCarrier(shipment, carrier)).toBe(false);
  });

  test('intra-city correct city true', () => {
    const carrier = buildCarrier({ activityCity: 'İSTANBUL' });
    const shipment = buildShipment({ originCity: 'istanbul', destinationCity: 'İstanbul' });

    expect(service.isShipmentMatchingCarrier(shipment, carrier)).toBe(true);
  });

  test('intercity different city true', () => {
    const carrier = buildCarrier({ activityCity: 'Istanbul', scopeLinks: [{ scope: { name: 'Şehirler Arası' } }] as any });
    const shipment = buildShipment({ originCity: 'Istanbul', destinationCity: 'Ankara' });

    expect(service.isShipmentMatchingCarrier(shipment, carrier)).toBe(true);
  });

  test('missing loadType capability false', () => {
    const carrier = buildCarrier({ loadTypeCapabilities: [] as any });
    const shipment = buildShipment({ shipmentCategory: ShipmentCategory.HOME_MOVE });

    expect(service.isShipmentMatchingCarrier(shipment, carrier)).toBe(false);
  });

  test('active loadType capability true', () => {
    const carrier = buildCarrier({
      loadTypeCapabilities: [{ loadType: ExtraServiceLoadType.HOME, isActive: true }] as any,
    });
    const shipment = buildShipment({ shipmentCategory: ShipmentCategory.HOME_MOVE });

    expect(service.isShipmentMatchingCarrier(shipment, carrier)).toBe(true);
  });

  test('availableDates boşsa true', () => {
    const carrier = buildCarrier({ activity: { availableDates: [] } as any });
    const shipment = buildShipment({ shipmentDate: new Date('2026-05-01T10:00:00.000Z') });

    expect(service.isShipmentMatchingCarrier(shipment, carrier)).toBe(true);
  });

  test('availableDates dolu ve tarih eşleşmezse false', () => {
    const carrier = buildCarrier({ activity: { availableDates: ['2026-05-02'] } as any });
    const shipment = buildShipment({ shipmentDate: new Date('2026-05-01T10:00:00.000Z') });

    expect(service.isShipmentMatchingCarrier(shipment, carrier)).toBe(false);
  });

  test('vehicleTypePreferenceId yoksa pass', () => {
    const carrier = buildCarrier({ vehicleTypeLinks: [] as any });
    const shipment = buildShipment({ vehicleTypePreferenceId: null as any });

    expect(service.isShipmentMatchingCarrier(shipment, carrier)).toBe(true);
  });

  test('vehicleTypePreferenceId varsa carrier\'da yoksa false', () => {
    const carrier = buildCarrier({ vehicleTypeLinks: [{ vehicleTypeId: 'vt-other' }] as any });
    const shipment = buildShipment({ vehicleTypePreferenceId: 'vt-1' });

    expect(service.isShipmentMatchingCarrier(shipment, carrier)).toBe(false);
  });

  test('legacy fallback: approvalState missingse legacy path bozulmaz', () => {
    const carrier = buildCarrier({ approvalState: undefined as any });
    const shipment = buildShipment();

    expect(service.isShipmentMatchingCarrier(shipment, carrier)).toBe(true);
  });

  test('shipment extra service istemiyorsa pass', () => {
    const carrier = buildCarrier();
    const shipment = buildShipment({ extraServices: [] as any });

    expect(service.isShipmentMatchingCarrier(shipment, carrier)).toBe(true);
  });

  test('shipment extra service istiyor ve carrier capability varsa true', () => {
    const carrier = buildCarrier({
      extraServiceCapabilities: [
        { extraServiceId: 'es-1', loadType: ExtraServiceLoadType.HOME, isActive: true },
      ] as any,
    });
    const shipment = buildShipment({ extraServices: [{ id: 'es-1' }] as any });

    expect(service.isShipmentMatchingCarrier(shipment, carrier)).toBe(true);
  });

  test('shipment extra service istiyor ama carrier capability yoksa false', () => {
    const carrier = buildCarrier({ extraServiceCapabilities: [] as any });
    const shipment = buildShipment({ extraServices: [{ id: 'es-1' }] as any });

    expect(service.isShipmentMatchingCarrier(shipment, carrier)).toBe(false);
  });

  test('carrier extra service capability inactive ise false', () => {
    const carrier = buildCarrier({
      extraServiceCapabilities: [
        { extraServiceId: 'es-1', loadType: ExtraServiceLoadType.HOME, isActive: false },
      ] as any,
    });
    const shipment = buildShipment({ extraServices: [{ id: 'es-1' }] as any });

    expect(service.isShipmentMatchingCarrier(shipment, carrier)).toBe(false);
  });

  test('birden fazla extra service isteniyorsa ve biri eksikse false', () => {
    const carrier = buildCarrier({
      extraServiceCapabilities: [
        { extraServiceId: 'es-1', loadType: ExtraServiceLoadType.HOME, isActive: true },
      ] as any,
    });
    const shipment = buildShipment({ extraServices: [{ id: 'es-1' }, { id: 'es-2' }] as any });

    expect(service.isShipmentMatchingCarrier(shipment, carrier)).toBe(false);
  });

  test('loadType infer edilemiyorsa extra service pre-filter mevcut davranisi korur', () => {
    const carrier = buildCarrier({ extraServiceCapabilities: [] as any });
    const shipment = buildShipment({
      shipmentCategory: null as any,
      extraServices: [{ id: 'es-1' }] as any,
    });

    expect(service.isShipmentMatchingCarrier(shipment, carrier)).toBe(true);
  });

  test('getMismatchReason extra_service_mismatch döner', () => {
    const carrier = buildCarrier({ extraServiceCapabilities: [] as any });
    const shipment = buildShipment({ extraServices: [{ id: 'es-1' }] as any });

    const reason = (service as any).getMismatchReason(shipment, carrier);

    expect(reason).toBe('extra_service_mismatch');
  });
});
