import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { testApp } from './helpers/testApp';
import { AppDataSource } from '../infrastructure/database/data-source';
import { Shipment, ShipmentCategory, ShipmentStatus } from '../domain/entities/Shipment';
import { Offer, OfferStatus } from '../domain/entities/Offer';
import { Carrier, CarrierApprovalState } from '../domain/entities/Carrier';
import { ExtraService } from '../domain/entities/ExtraService';
import { CarrierExtraServiceCapability } from '../domain/entities/CarrierExtraServiceCapability';
import { CarrierLoadTypeCapability } from '../domain/entities/CarrierLoadTypeCapability';
import { ExtraServiceLoadType } from '../domain/entities/ExtraServiceLoadType';
import { ExtraServiceApplicability } from '../domain/entities/ExtraServiceApplicability';
import { calculateOfferMatchScore } from '../application/services/CustomerOfferService';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

const CUSTOMER = { email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' };
const CARRIER = { email: 'info@silenakliyat.com', password: 'Maviface2141' };

describe('Customer Offers Enhancements', () => {
  let customerToken: string;
  let customerId: string;
  let carrierId: string;
  const createdShipmentIds: string[] = [];
  const createdOfferIds: string[] = [];
  const createdExtraServiceIds: string[] = [];
  const createdApplicabilityIds: string[] = [];
  const createdCapabilityIds: string[] = [];
  const createdLoadTypeCapabilityIds: string[] = [];

  beforeAll(async () => {
    if (skipDB()) return;

    const customerLogin = await request(testApp)
      .post('/api/v1/customers/login')
      .send(CUSTOMER);
    if (customerLogin.status === 200) {
      customerToken = customerLogin.body.data?.token;
      customerId = customerLogin.body.data?.customer?.id;
    }

    const carrierLogin = await request(testApp)
      .post('/api/v1/carriers/login')
      .send(CARRIER);
    if (carrierLogin.status === 200) {
      carrierId = carrierLogin.body.data?.carrier?.id;
    }
  });

  afterAll(async () => {
    if (skipDB()) return;

    if (createdCapabilityIds.length) {
      await AppDataSource.getRepository(CarrierExtraServiceCapability).delete(createdCapabilityIds);
    }
    if (createdLoadTypeCapabilityIds.length) {
      await AppDataSource.getRepository(CarrierLoadTypeCapability).delete(createdLoadTypeCapabilityIds);
    }
    if (createdOfferIds.length) {
      await AppDataSource.getRepository(Offer).delete(createdOfferIds);
    }
    if (createdShipmentIds.length) {
      await AppDataSource.getRepository(Shipment).delete(createdShipmentIds);
    }
    if (createdApplicabilityIds.length) {
      await AppDataSource.getRepository(ExtraServiceApplicability).delete(createdApplicabilityIds);
    }
    if (createdExtraServiceIds.length) {
      await AppDataSource.getRepository(ExtraService).delete(createdExtraServiceIds);
    }
  });

  const createOfferFixture = async () => {
    if (!customerId || !carrierId) return null;

    const serviceRepo = AppDataSource.getRepository(ExtraService);
    const shipmentRepo = AppDataSource.getRepository(Shipment);
    const offerRepo = AppDataSource.getRepository(Offer);
    const capabilityRepo = AppDataSource.getRepository(CarrierExtraServiceCapability);
    const loadTypeCapabilityRepo = AppDataSource.getRepository(CarrierLoadTypeCapability);
    const applicabilityRepo = AppDataSource.getRepository(ExtraServiceApplicability);

    const serviceA = await serviceRepo.save(serviceRepo.create({
      name: `Test Ek Hizmet A ${randomUUID().slice(0, 8)}`,
      description: 'test',
      status: 'ACTIVE',
      sortOrder: 500,
    }));
    const serviceB = await serviceRepo.save(serviceRepo.create({
      name: `Test Ek Hizmet B ${randomUUID().slice(0, 8)}`,
      description: 'test',
      status: 'ACTIVE',
      sortOrder: 501,
    }));
    createdExtraServiceIds.push(serviceA.id, serviceB.id);

    const ruleA = await applicabilityRepo.save(applicabilityRepo.create({
      extraServiceId: serviceA.id,
      loadType: ExtraServiceLoadType.HOME,
      isDefaultVisible: true,
      isRecommendedByConverter: false,
      sortOrder: 1,
    }));
    const ruleB = await applicabilityRepo.save(applicabilityRepo.create({
      extraServiceId: serviceB.id,
      loadType: ExtraServiceLoadType.HOME,
      isDefaultVisible: true,
      isRecommendedByConverter: false,
      sortOrder: 2,
    }));
    createdApplicabilityIds.push(ruleA.id, ruleB.id);

    const shipmentOne = await shipmentRepo.save(shipmentRepo.create({
      id: randomUUID(),
      customerId,
      status: ShipmentStatus.OFFER_RECEIVED,
      shipmentCategory: ShipmentCategory.HOME_MOVE,
      originCity: 'Istanbul',
      destinationCity: 'Ankara',
      loadDetails: 'Teklif DTO testi 1',
      shipmentDate: new Date(),
      estimatedWeight: 999999,
      weight: 999999,
      contactPhone: null,
    }), { reload: false });
    createdShipmentIds.push(shipmentOne.id);

    await AppDataSource.createQueryBuilder()
      .relation(Shipment, 'extraServices')
      .of(shipmentOne.id)
      .add([serviceA.id, serviceB.id]);

    const shipmentTwo = await shipmentRepo.save(shipmentRepo.create({
      id: randomUUID(),
      customerId,
      status: ShipmentStatus.OFFER_RECEIVED,
      shipmentCategory: ShipmentCategory.HOME_MOVE,
      originCity: 'Bursa',
      destinationCity: 'Izmir',
      loadDetails: 'Teklif DTO testi 2',
      shipmentDate: new Date(),
      estimatedWeight: 100,
      weight: 100,
      contactPhone: null,
    }), { reload: false });
    createdShipmentIds.push(shipmentTwo.id);

    const offerOne = await offerRepo.save(offerRepo.create({
      id: randomUUID(),
      shipmentId: shipmentOne.id,
      carrierId,
      price: 2500,
      message: 'test offer message',
      estimatedDuration: 24,
      status: OfferStatus.PENDING,
      hasSuspiciousContent: false,
    }));
    createdOfferIds.push(offerOne.id);

    const offerTwo = await offerRepo.save(offerRepo.create({
      id: randomUUID(),
      shipmentId: shipmentTwo.id,
      carrierId,
      price: 2800,
      message: 'test offer message 2',
      estimatedDuration: 12,
      status: OfferStatus.PENDING,
      hasSuspiciousContent: false,
    }));
    createdOfferIds.push(offerTwo.id);

    const cap = await capabilityRepo.save(capabilityRepo.create({
      carrierId,
      extraServiceId: serviceA.id,
      loadType: ExtraServiceLoadType.HOME,
      isActive: true,
      priceMode: null,
      basePrice: null,
      notes: null,
    }));
    createdCapabilityIds.push(cap.id);

    const existingLoadTypeCapability = await loadTypeCapabilityRepo.findOne({
      where: { carrierId, loadType: ExtraServiceLoadType.HOME },
    });
    if (!existingLoadTypeCapability) {
      const loadTypeCap = await loadTypeCapabilityRepo.save(loadTypeCapabilityRepo.create({
        carrierId,
        loadType: ExtraServiceLoadType.HOME,
        isActive: true,
      }));
      createdLoadTypeCapabilityIds.push(loadTypeCap.id);
    }

    return { shipmentOne, shipmentTwo, offerOne, offerTwo, serviceA, serviceB };
  };

  test('1. customers/offers response carrier phone/email icermemeli', async () => {
    if (skipDB() || !customerToken) return;

    const res = await request(testApp)
      .get('/api/v1/customers/offers')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const offers: any[] = Array.isArray(res.body.data) ? res.body.data : [];
    offers.forEach((offer) => {
      if (offer?.carrier) {
        expect(offer.carrier).not.toHaveProperty('phone');
        expect(offer.carrier).not.toHaveProperty('email');
      }
    });
  });

  test('2. extraServiceCompatibility hesaplanmali ve missing list donmeli', async () => {
    if (skipDB() || !customerToken) return;

    const fixture = await createOfferFixture();
    if (!fixture) return;

    const res = await request(testApp)
      .get(`/api/v1/customers/offers?shipmentId=${fixture.shipmentOne.id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    const offers: any[] = Array.isArray(res.body.data) ? res.body.data : [];
    expect(offers.length).toBeGreaterThan(0);

    const target = offers.find((item) => item.id === fixture.offerOne.id) || offers[0];
    expect(target.extraServiceCompatibility).toBeDefined();
    expect(target.extraServiceCompatibility.requestedCount).toBe(2);
    expect(target.extraServiceCompatibility.matchedCount).toBe(1);
    expect(target.extraServiceCompatibility.isFullyCompatible).toBe(false);
    expect(target.extraServiceCompatibility.missing).toContain(fixture.serviceB.name);
    expect(target.matchScore).toBe(80);
    expect(target.matchDetails).toMatchObject({
      loadTypeCompatible: true,
      extraServicesCovered: 1,
      extraServicesTotal: 2,
    });
    expect(target.matchDetails.missingExtraServices).toContain(fixture.serviceB.name);
  });

  test('3. shipmentId filter sadece ilgili shipment tekliflerini donmeli', async () => {
    if (skipDB() || !customerToken) return;

    const fixture = await createOfferFixture();
    if (!fixture) return;

    const res = await request(testApp)
      .get(`/api/v1/customers/offers?shipmentId=${fixture.shipmentOne.id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    const offers: any[] = Array.isArray(res.body.data) ? res.body.data : [];
    expect(offers.length).toBeGreaterThan(0);
    offers.forEach((offer) => {
      expect(offer.shipmentId).toBe(fixture.shipmentOne.id);
    });
  });

  test('4. eski offer gorunur ama suspended carrier icin carrierEligibility false doner', async () => {
    if (skipDB() || !customerToken || !carrierId) return;

    const fixture = await createOfferFixture();
    if (!fixture) return;

    const carrierRepo = AppDataSource.getRepository(Carrier);
    const originalCarrier = await carrierRepo.findOne({ where: { id: carrierId } });
    expect(originalCarrier).toBeTruthy();

    await carrierRepo.update(carrierId, {
      approvalState: CarrierApprovalState.SUSPENDED,
      isActive: false,
      verifiedByAdmin: false,
    });

    try {
      const res = await request(testApp)
        .get(`/api/v1/customers/offers?shipmentId=${fixture.shipmentOne.id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      const offers: any[] = Array.isArray(res.body.data) ? res.body.data : [];
      const target = offers.find((item) => item.id === fixture.offerOne.id);

      expect(target).toBeDefined();
      expect(target.carrierEligibility).toMatchObject({
        isEligible: false,
        reason: 'suspended',
        label: 'Askiya alinmis',
      });
    } finally {
      if (originalCarrier) {
        await carrierRepo.update(carrierId, {
          approvalState: originalCarrier.approvalState,
          isActive: originalCarrier.isActive,
          verifiedByAdmin: originalCarrier.verifiedByAdmin,
        });
      }
    }
  });

  test('5. extra service yoksa load type uyumu ile matchScore 100 donmeli', async () => {
    if (skipDB() || !customerToken) return;

    const fixture = await createOfferFixture();
    if (!fixture) return;

    const res = await request(testApp)
      .get(`/api/v1/customers/offers?shipmentId=${fixture.shipmentTwo.id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    const offers: any[] = Array.isArray(res.body.data) ? res.body.data : [];
    const target = offers.find((item) => item.id === fixture.offerTwo.id);

    expect(target).toBeDefined();
    expect(target.matchScore).toBe(100);
    expect(target.matchDetails).toMatchObject({
      loadTypeCompatible: true,
      extraServicesCovered: 0,
      extraServicesTotal: 0,
      missingExtraServices: [],
    });
  });

  test('6. matchScore helper capability yokken 0, tam uyumda 100 hesaplamali', () => {
    const emptyCapability = calculateOfferMatchScore({
      carrierHasAnyCapability: false,
      loadType: ExtraServiceLoadType.HOME,
      carrierLoadTypes: new Set<ExtraServiceLoadType>(),
      requestedExtraServices: ['Piyano Tasima'],
      carrierExtraServices: new Set<string>(),
    });

    expect(emptyCapability.matchScore).toBe(0);
    expect(emptyCapability.matchDetails).toMatchObject({
      loadTypeCompatible: false,
      extraServicesCovered: 0,
      extraServicesTotal: 1,
      missingExtraServices: ['Piyano Tasima'],
    });

    const fullMatch = calculateOfferMatchScore({
      carrierHasAnyCapability: true,
      loadType: ExtraServiceLoadType.HOME,
      carrierLoadTypes: new Set<ExtraServiceLoadType>([ExtraServiceLoadType.HOME]),
      requestedExtraServices: ['Piyano Tasima', 'Gecici depolama'],
      carrierExtraServices: new Set<string>(['Piyano Tasima', 'Gecici depolama']),
    });

    expect(fullMatch.matchScore).toBe(100);
    expect(fullMatch.matchDetails).toMatchObject({
      loadTypeCompatible: true,
      extraServicesCovered: 2,
      extraServicesTotal: 2,
      missingExtraServices: [],
    });
  });
});
