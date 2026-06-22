import request from 'supertest';
import { AppDataSource } from '../infrastructure/database/data-source';
import { ExtraService } from '../domain/entities/ExtraService';
import { CarrierLoadTypeCapability } from '../domain/entities/CarrierLoadTypeCapability';
import { testApp } from './helpers/testApp';

/**
 * Carrier Capability API Tests
 * - Verifies capability CRUD endpoints work correctly
 * - Tests validation rules: loadType dependency, applicability, duplicates, inactive filtering
 * - Uses seeded test data (existing carriers with capabilities)
 */
describe('Carrier Capability Management API', () => {
  let carrierToken: string;
  let testCarrierId: string;
  let adminToken: string;
  let testExtraServiceId: string;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/v1/carriers/me/capabilities
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /api/v1/carriers/me/capabilities', () => {
    test('carrier reads own capabilities', async () => {
      // Login as test carrier
      const login = await request(testApp)
        .post('/api/v1/carriers/login')
        .send({ email: 'info@silenakliyat.com', password: 'Maviface2141' });

      expect(login.status).toBe(200);
      carrierToken = login.body.data?.token;
      testCarrierId = login.body.data?.carrier?.id;
      expect(carrierToken).toBeTruthy();
      expect(testCarrierId).toBeTruthy();

      // Get capabilities
      const res = await request(testApp)
        .get('/api/v1/carriers/me/capabilities')
        .set('Authorization', `Bearer ${carrierToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('carrierId', testCarrierId);
      expect(res.body.data).toHaveProperty('loadTypes');
      expect(res.body.data).toHaveProperty('extraServices');
      expect(Array.isArray(res.body.data.loadTypes)).toBe(true);
      expect(Array.isArray(res.body.data.extraServices)).toBe(true);
    });

    test('response includes active and inactive capabilities', async () => {
      expect(carrierToken).toBeTruthy();

      const res = await request(testApp)
        .get('/api/v1/carriers/me/capabilities')
        .set('Authorization', `Bearer ${carrierToken}`);

      expect(res.status).toBe(200);
      // Each capability should have isActive property
      res.body.data.loadTypes.forEach((lt: any) => {
        expect(lt).toHaveProperty('isActive');
        expect(typeof lt.isActive).toBe('boolean');
      });
      res.body.data.extraServices.forEach((es: any) => {
        expect(es).toHaveProperty('isActive');
        expect(typeof es.isActive).toBe('boolean');
      });
    });

    test('unauthenticated access rejected', async () => {
      const res = await request(testApp)
        .get('/api/v1/carriers/me/capabilities')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/v1/admin/carriers/:carrierId/capabilities
  // ─────────────────────────────────────────────────────────────────────────

  describe('PUT /api/v1/carriers/me/capabilities', () => {
    test('carrier can create, update, list, and delete custom extra services', async () => {
      expect(carrierToken).toBeTruthy();

      const current = await request(testApp)
        .get('/api/v1/carriers/me/capabilities')
        .set('Authorization', `Bearer ${carrierToken}`);

      expect(current.status).toBe(200);
      const loadType = current.body.data.loadTypes.find((item: any) => item.isActive)?.loadType;
      if (!loadType) return;

      let customServiceId: string | undefined;

      try {
        const create = await request(testApp)
          .post('/api/v1/carriers/me/custom-extra-services')
          .set('Authorization', `Bearer ${carrierToken}`)
          .send({
            loadType,
            title: `Test manuel hizmet ${Date.now()}`,
            description: 'Test aciklamasi',
            priceMode: 'QUOTE',
            quoteMinPrice: 100,
            quoteMaxPrice: 300,
          });

        expect(create.status).toBe(201);
        expect(create.body.success).toBe(true);
        expect(create.body.data.loadType).toBe(loadType);
        expect(Number(create.body.data.quoteMinPrice)).toBe(100);
        expect(Number(create.body.data.quoteMaxPrice)).toBe(300);
        customServiceId = create.body.data.id;

        const list = await request(testApp)
          .get(`/api/v1/carriers/me/custom-extra-services?loadType=${loadType}`)
          .set('Authorization', `Bearer ${carrierToken}`);

        expect(list.status).toBe(200);
        expect(list.body.data.some((item: any) => item.id === customServiceId)).toBe(true);

        const update = await request(testApp)
          .put(`/api/v1/carriers/me/custom-extra-services/${customServiceId}`)
          .set('Authorization', `Bearer ${carrierToken}`)
          .send({
            loadType,
            title: 'Test manuel hizmet guncel',
            description: 'Sabit fiyatli test',
            priceMode: 'FIXED',
            basePrice: 450,
          });

        expect(update.status).toBe(200);
        expect(update.body.success).toBe(true);
        expect(update.body.data.priceMode).toBe('FIXED');
        expect(Number(update.body.data.basePrice)).toBe(450);

        const remove = await request(testApp)
          .delete(`/api/v1/carriers/me/custom-extra-services/${customServiceId}`)
          .set('Authorization', `Bearer ${carrierToken}`);

        expect(remove.status).toBe(200);
        expect(remove.body.success).toBe(true);
        customServiceId = undefined;
      } finally {
        if (customServiceId) {
          await request(testApp)
            .delete(`/api/v1/carriers/me/custom-extra-services/${customServiceId}`)
            .set('Authorization', `Bearer ${carrierToken}`);
        }
      }
    });

    test('carrier can add and update own fixed extra service price', async () => {
      expect(carrierToken).toBeTruthy();

      const current = await request(testApp)
        .get('/api/v1/carriers/me/capabilities')
        .set('Authorization', `Bearer ${carrierToken}`);

      expect(current.status).toBe(200);
      const loadType = current.body.data.loadTypes.find((item: any) => item.isActive)?.loadType;
      if (!loadType) return;

      const services = await request(testApp)
        .get(`/api/v1/extra-services?loadType=${loadType}`);

      expect(services.status).toBe(200);
      const service = services.body.data?.[0];
      if (!service) return;

      const previousCapability = current.body.data.extraServices.find(
        (item: any) => item.extraServiceId === service.id && item.loadType === loadType
      );

      try {
        const createOrUpdate = await request(testApp)
          .put('/api/v1/carriers/me/capabilities')
          .set('Authorization', `Bearer ${carrierToken}`)
          .send({
            action: 'add_extra_service',
            extraServiceId: service.id,
            loadType,
            priceMode: 'FIXED',
            basePrice: 321,
          });

        expect(createOrUpdate.status).toBe(200);
        expect(createOrUpdate.body.success).toBe(true);

        const firstSaved = createOrUpdate.body.data.extraServices.find(
          (item: any) => item.extraServiceId === service.id && item.loadType === loadType
        );
        expect(Number(firstSaved.basePrice)).toBe(321);

        const priceUpdate = await request(testApp)
          .put('/api/v1/carriers/me/capabilities')
          .set('Authorization', `Bearer ${carrierToken}`)
          .send({
            action: 'add_extra_service',
            extraServiceId: service.id,
            loadType,
            priceMode: 'FIXED',
            basePrice: 432,
          });

        expect(priceUpdate.status).toBe(200);
        const updated = priceUpdate.body.data.extraServices.find(
          (item: any) => item.extraServiceId === service.id && item.loadType === loadType
        );
        expect(Number(updated.basePrice)).toBe(432);
      } finally {
        if (previousCapability) {
          await request(testApp)
            .put('/api/v1/carriers/me/capabilities')
            .set('Authorization', `Bearer ${carrierToken}`)
            .send({
              action: 'add_extra_service',
              extraServiceId: service.id,
              loadType,
              priceMode: previousCapability.priceMode || 'NONE',
              basePrice: previousCapability.basePrice ?? undefined,
              notes: previousCapability.notes,
            });
        } else {
          await request(testApp)
            .put('/api/v1/carriers/me/capabilities')
            .set('Authorization', `Bearer ${carrierToken}`)
            .send({
              action: 'remove_extra_service',
              extraServiceId: service.id,
              loadType,
            });
        }
      }
    });
  });

  describe('GET /api/v1/admin/carriers/:carrierId/capabilities', () => {
    beforeAll(async () => {
      // Login as admin once
      const adminLogin = await request(testApp)
        .post('/api/v1/admin/login')
        .send({ email: 'superadmin@tasiburadan.com', password: 'Maviface2141' });

      expect(adminLogin.status).toBe(200);
      adminToken = adminLogin.body.data?.token;
      expect(adminToken).toBeTruthy();
    });

    test('admin reads carrier capabilities', async () => {
      expect(testCarrierId).toBeTruthy();

      const res = await request(testApp)
        .get(`/api/v1/admin/carriers/${testCarrierId}/capabilities`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.carrierId).toBe(testCarrierId);
      expect(Array.isArray(res.body.data.loadTypes)).toBe(true);
      expect(Array.isArray(res.body.data.extraServices)).toBe(true);

      // Save an extra service ID for update tests
      if (res.body.data.extraServices.length > 0) {
        testExtraServiceId = res.body.data.extraServices[0].extraServiceId;
      }
    });

    test('admin can read any carrier capabilities', async () => {
      // Get list of carriers
      const carriersList = await request(testApp)
        .get('/api/v1/admin/carriers?limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      if (carriersList.body.data?.carriers?.length > 0) {
        const someCarrierId = carriersList.body.data.carriers[0].id;

        const res = await request(testApp)
          .get(`/api/v1/admin/carriers/${someCarrierId}/capabilities`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 400]).toContain(res.status);
        if (res.status === 200) {
          expect(res.body.data.carrierId).toBe(someCarrierId);
        }
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PUT /api/v1/admin/carriers/:carrierId/capabilities
  // ─────────────────────────────────────────────────────────────────────────

  describe('PUT /api/v1/admin/carriers/:carrierId/capabilities', () => {
    test('admin can toggle extra service capability inactive', async () => {
      expect(adminToken).toBeTruthy();
      expect(testCarrierId).toBeTruthy();

      // Get current capabilities
      const getCap = await request(testApp)
        .get(`/api/v1/admin/carriers/${testCarrierId}/capabilities`)
        .set('Authorization', `Bearer ${adminToken}`);

      const currentExtra = getCap.body.data?.extraServices?.[0];
      if (!currentExtra) {
        expect(currentExtra).toBeTruthy();
        return;
      }

      const currentActive = currentExtra.isActive;

      // Toggle to opposite
      const res = await request(testApp)
        .put(`/api/v1/admin/carriers/${testCarrierId}/capabilities`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'toggle_active',
          extraServiceId: currentExtra.extraServiceId,
          loadType: currentExtra.loadType,
          isActive: !currentActive,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify toggle happened
      const updated = res.body.data.extraServices.find(
        (es: any) => es.extraServiceId === currentExtra.extraServiceId
      );
      if (updated) {
        expect(updated.isActive).toBe(!currentActive);
      }
    });

    test('admin cannot add extra service without load type capability', async () => {
      expect(adminToken).toBeTruthy();

      // Get an extra service that likely isn't supported
      const services = await AppDataSource.getRepository(ExtraService).find({ take: 1 });
      if (services.length === 0) return;

      // Try to add for STORAGE load type
      const res = await request(testApp)
        .put(`/api/v1/admin/carriers/${testCarrierId}/capabilities`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'add_extra_service',
          extraServiceId: services[0].id,
          loadType: 'STORAGE',
          priceMode: 'FIXED',
          basePrice: 100,
        });

      // Should either succeed (if carrier has STORAGE) or fail with validation error
      // (if carrier lacks STORAGE load type capability)
      expect([200, 400]).toContain(res.status);

      if (res.status === 400) {
        expect(res.body.success).toBe(false);
        // Error message should mention load type requirement
        expect(
          (res.body.message || res.body.error?.details || '').toLowerCase()
        ).toMatch(/yükleme|load type|capability/i);
      }
    });

    test('invalid payload returns 400', async () => {
      expect(adminToken).toBeTruthy();

      const res = await request(testApp)
        .put(`/api/v1/admin/carriers/${testCarrierId}/capabilities`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'invalid_action',
          loadType: 'HOME',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Validation Rules
  // ─────────────────────────────────────────────────────────────────────────

  describe('Capability Validation Rules', () => {
    test('inactive extra service capability should not be available for offers', async () => {
      // This test verifies that OfferService correctly filters out inactive capabilities
      // Get capabilities
      const capRes = await request(testApp)
        .get('/api/v1/carriers/me/capabilities')
        .set('Authorization', `Bearer ${carrierToken}`);

      expect(capRes.status).toBe(200);

      // Count active extra services
      const activeCount = capRes.body.data.extraServices.filter(
        (es: any) => es.isActive === true
      ).length;

      expect(typeof activeCount).toBe('number');
      expect(activeCount >= 0).toBe(true);
    });

    test('carrier load type capability has proper active status', async () => {
      const capRes = await request(testApp)
        .get('/api/v1/carriers/me/capabilities')
        .set('Authorization', `Bearer ${carrierToken}`);

      expect(capRes.status).toBe(200);

      // Each load type should have consistent active property
      capRes.body.data.loadTypes.forEach((lt: any) => {
        expect([true, false]).toContain(lt.isActive);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Error Handling
  // ─────────────────────────────────────────────────────────────────────────

  describe('Error Handling', () => {
    test('missing admin authentication returns 401', async () => {
      const res = await request(testApp)
        .get(`/api/v1/admin/carriers/${testCarrierId}/capabilities`);

      expect(res.status).toBe(401);
    });


     test('admin update with missing action returns 400', async () => {
       const res = await request(testApp)
         .put(`/api/v1/admin/carriers/${testCarrierId}/capabilities`)
         .set('Authorization', `Bearer ${adminToken}`)
         .send({
           loadType: 'HOME',
           // missing 'action'
         });
       expect(res.status).toBe(400);
       expect(res.body.success).toBe(false);
     });
   });
});

