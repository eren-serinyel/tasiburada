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
        originAddressText: 'Ataturk Mah. 5. Sok. A Blok Kat 5 Daire 12',
        destinationCity: 'Ankara',
        destinationDistrict: 'Cankaya',
        destinationAddressText: 'Cumhuriyet Mah. B Blok Kat 3 Daire 7',
        date: '2026-05-10',
        transportType: 'evden-eve',
        placeType: '2+1 ev',
        floor: '4',
        hasElevator: true,
        dateFlexibility: 'PLUS_MINUS_1_DAY',
        serviceOptions: { 'evden-eve': ['svc-pack', 'svc-lift'] },
        customExtraServices: ['custom-aadee'],
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
    expect(payload.originAddressText).toBe('Ataturk Mah. 5. Sok. A Blok Kat 5 Daire 12');
    expect(payload.destinationAddressText).toBe('Cumhuriyet Mah. B Blok Kat 3 Daire 7');
    expect(payload.originPlaceType).toBe('Daire');
    expect(payload.destinationPlaceType).toBe('Daire');
    expect(payload.originFloor).toBe(4);
    expect(payload.destinationFloor).toBe(4);
    expect(payload.originHasElevator).toBe(true);
    expect(payload.destinationHasElevator).toBe(true);
    expect(payload.dateFlexibility).toBe('PLUS_MINUS_1_DAY');
    expect(payload.loadType).toBe('HOME');
    expect(payload.extraServices).toEqual(['svc-pack', 'svc-lift']);
    expect(payload.customExtraServices).toEqual(['custom-aadee']);
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
      dateFlexibility: 'PLUS_MINUS_3_DAYS',
      extraServices: ['svc-a'],
    });

    expect(payload.originPlaceType).toBe('Apartman Dairesi');
    expect(payload.destinationPlaceType).toBe('Villa');
    expect(payload.originFloor).toBe(2);
    expect(payload.destinationFloor).toBe(0);
    expect(payload.originHasElevator).toBe(false);
    expect(payload.destinationHasElevator).toBe(true);
    expect(payload.originAccessDistance).toBe(15);
    expect(payload.destinationAccessDistance).toBe(30);
    expect(payload.dateFlexibility).toBe('PLUS_MINUS_3_DAYS');
    expect(payload.extraServices).toEqual(['svc-a']);
  });

  test('OfferRequest payload maps legacy date flexibility values to active backend enum', () => {
    expect(buildShipmentPayloadFromForm({ dateFlexibility: 'FLEXIBLE' }).dateFlexibility).toBe('PLUS_MINUS_3_DAYS');
    expect(buildShipmentPayloadFromForm({ dateFlexibility: 'WITHIN_WEEK' }).dateFlexibility).toBe('PLUS_MINUS_3_DAYS');
    expect(buildShipmentPayloadFromForm({ dateFlexibility: 'UNKNOWN' }).dateFlexibility).toBe('EXACT');
  });

  test('OfferRequest payload sends OFFICE loadType for office transport', () => {
    const payload = buildShipmentPayloadFromForm({
      originCity: 'Istanbul',
      originDistrict: 'Kadikoy',
      destinationCity: 'Ankara',
      destinationDistrict: 'Cankaya',
      transportType: 'ofis-tasima',
      extraServices: ['Server/IT özel taşıma', 'Profesyonel Paketleme'],
    });

    expect(payload.transportType).toBe('ofis-tasima');
    expect(payload.loadType).toBe('OFFICE');
    expect(payload.originPlaceType).toBeUndefined();
    expect(payload.destinationPlaceType).toBeUndefined();
    expect(payload.extraServices).toEqual(['Server/IT özel taşıma', 'Profesyonel Paketleme']);
  });

  test('OfferRequest payload normalizes office place type before sending backend', () => {
    const payload = buildShipmentPayloadFromForm({
      originCity: 'Ankara',
      originDistrict: 'Bala',
      destinationCity: 'Aydın',
      destinationDistrict: 'Germencik',
      transportType: 'ofis-tasima',
      placeType: 'Orta ofis',
    });

    expect(payload.loadDetails).toBe('ofis-tasima / Orta ofis');
    expect(payload.originPlaceType).toBe('Ofis');
    expect(payload.destinationPlaceType).toBe('Ofis');
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
