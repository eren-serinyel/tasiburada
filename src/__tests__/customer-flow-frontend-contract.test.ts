const {
  CONTACT_SAFETY_WARNING,
  buildShipmentPayloadFromForm,
  getConverterAppliedSummary,
  getCustomerShipmentDetailPath,
} = require('../../shadcn-ui/src/lib/customerShipmentForm');

describe('customer flow frontend contract', () => {
  test('ShipmentList customer detail route points to ilan detail', () => {
    expect(getCustomerShipmentDetailPath('shipment-123')).toBe('/ilan/shipment-123');
  });

  test('OfferRequest payload includes backend shipment contract fields', () => {
    const payload = buildShipmentPayloadFromForm(
      {
        originCity: 'Istanbul',
        originDistrict: 'Kadikoy',
        destinationCity: 'Ankara',
        destinationDistrict: 'Cankaya',
        date: '2026-05-10',
        transportType: 'evden-eve',
        placeType: '2+1 ev',
        floor: '4',
        hasElevator: true,
        dateFlexibility: 'FLEXIBLE',
        serviceOptions: { 'evden-eve': ['svc-pack', 'svc-lift'] },
        weightKg: '1250',
        note: 'Kirilacak esya var',
      },
      {
        phone: '5551112233',
        today: '2026-04-29',
        templateWeights: { '2+1 ev': 1500 },
      },
    );

    expect(payload.origin).toBe('Istanbul, Kadikoy');
    expect(payload.destination).toBe('Ankara, Cankaya');
    expect(payload.originPlaceType).toBe('2+1 ev');
    expect(payload.destinationPlaceType).toBe('2+1 ev');
    expect(payload.originFloor).toBe(4);
    expect(payload.destinationFloor).toBe(4);
    expect(payload.originHasElevator).toBe(true);
    expect(payload.destinationHasElevator).toBe(true);
    expect(payload.dateFlexibility).toBe('FLEXIBLE');
    expect(payload.extraServices).toEqual(['svc-pack', 'svc-lift']);
    expect(payload.weight).toBe(1250);
    expect(payload.estimatedWeight).toBe(1250);
    expect(payload.vehicleTypePreferenceId).toBeUndefined();
    expect(payload.shipmentDate).toBe('2026-05-10');
  });

  test('OfferRequest payload supports explicit origin and destination access fields', () => {
    const payload = buildShipmentPayloadFromForm({
      originPlaceType: 'Apartman',
      destinationPlaceType: 'Villa',
      originFloor: '2',
      destinationFloor: '0',
      originHasElevator: false,
      destinationHasElevator: true,
      originAccessDistance: '15',
      destinationAccessDistance: '30',
      dateFlexibility: 'WITHIN_WEEK',
      extraServices: ['svc-a'],
    });

    expect(payload.originPlaceType).toBe('Apartman');
    expect(payload.destinationPlaceType).toBe('Villa');
    expect(payload.originFloor).toBe(2);
    expect(payload.destinationFloor).toBe(0);
    expect(payload.originHasElevator).toBe(false);
    expect(payload.destinationHasElevator).toBe(true);
    expect(payload.originAccessDistance).toBe(15);
    expect(payload.destinationAccessDistance).toBe(30);
    expect(payload.dateFlexibility).toBe('WITHIN_WEEK');
    expect(payload.extraServices).toEqual(['svc-a']);
  });

  test('contact safety warning copy is available to render on step 3', () => {
    expect(CONTACT_SAFETY_WARNING).toBe(
      'Telefon, WhatsApp, e-posta veya açık iletişim bilgisi paylaşmayın. Güvenliğiniz için tüm iletişim platform üzerinden ilerlemelidir.',
    );
  });

  test('converter applied summary renders volume weight and vehicle details', () => {
    expect(getConverterAppliedSummary({
      estimatedVolumeMin: 18,
      estimatedVolumeMax: 24,
      estimatedWeightKg: 1250,
      recommendedVehicle: 'Kamyonet',
    })).toEqual([
      'Tahmini hacim: 18-24 m³',
      'Tahmini ağırlık: 1250 kg',
      'Önerilen araç: Kamyonet',
    ]);
  });
});
