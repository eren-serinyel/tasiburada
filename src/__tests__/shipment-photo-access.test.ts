import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { testApp } from './helpers/testApp';
import { AppDataSource } from '../infrastructure/database/data-source';
import { Customer } from '../domain/entities/Customer';
import { Carrier, CarrierApprovalState } from '../domain/entities/Carrier';
import { Shipment, ShipmentStatus } from '../domain/entities/Shipment';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true' || !AppDataSource.isInitialized;

describe('Shipment photo access control', () => {
  const createdIds = {
    customerId: '',
    carrierId: '',
    shipmentId: '',
  };
  const filename = `shipment-${Date.now()}-${randomUUID()}.png`;
  const publicUrl = `/uploads/pictures/${filename}`;
  const picturesDir = path.resolve(process.cwd(), 'uploads', 'pictures');
  const filePath = path.join(picturesDir, filename);

  const sign = (payload: Record<string, unknown>) =>
    jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });

  beforeAll(async () => {
    if (skipDB()) return;

    fs.mkdirSync(picturesDir, { recursive: true });
    fs.writeFileSync(filePath, Buffer.from('shipment-photo-test'));

    const customer = await AppDataSource.getRepository(Customer).save({
      firstName: 'Photo',
      lastName: 'Owner',
      email: `photo-owner-${Date.now()}@test.local`,
      phone: '05000000000',
      passwordHash: 'hash',
      isActive: true,
      isVerified: true,
    });
    createdIds.customerId = customer.id;

    const carrier = await AppDataSource.getRepository(Carrier).save({
      companyName: 'Assigned Photo Carrier',
      taxNumber: `${Date.now()}`.slice(-10),
      contactName: 'Assigned Carrier',
      phone: '05000000001',
      email: `assigned-photo-carrier-${Date.now()}@test.local`,
      passwordHash: 'hash',
      foundedYear: 2018,
      isActive: true,
      verifiedByAdmin: true,
      approvalState: CarrierApprovalState.APPROVED,
    });
    createdIds.carrierId = carrier.id;

    const shipment = await AppDataSource.getRepository(Shipment).save({
      customerId: customer.id,
      carrierId: carrier.id,
      status: ShipmentStatus.MATCHED,
      originCity: 'Istanbul',
      destinationCity: 'Ankara',
      loadDetails: 'Test yuk fotograflari',
      shipmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      photoUrls: [publicUrl],
    });
    createdIds.shipmentId = shipment.id;
  });

  afterAll(async () => {
    if (skipDB()) return;

    if (createdIds.shipmentId) {
      await AppDataSource.getRepository(Shipment).delete(createdIds.shipmentId);
    }
    if (createdIds.carrierId) {
      await AppDataSource.getRepository(Carrier).delete(createdIds.carrierId);
    }
    if (createdIds.customerId) {
      await AppDataSource.getRepository(Customer).delete(createdIds.customerId);
    }
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

  test('shipment item photos are not public and are only served to related parties', async () => {
    if (skipDB()) return;

    const secureUrl = `/api/v1/shipments/${createdIds.shipmentId}/photos/${encodeURIComponent(filename)}`;
    const customerToken = sign({
      customerId: createdIds.customerId,
      email: 'photo-owner@test.local',
      type: 'customer',
    });
    const assignedCarrierToken = sign({
      carrierId: createdIds.carrierId,
      email: 'assigned-photo-carrier@test.local',
      type: 'carrier',
    });
    const randomCarrierToken = sign({
      carrierId: randomUUID(),
      email: 'random-photo-carrier@test.local',
      type: 'carrier',
    });
    const adminToken = sign({
      adminId: randomUUID(),
      email: 'admin-photo@test.local',
      type: 'admin',
      role: 'admin',
    });

    const publicResponse = await request(testApp).get(publicUrl);
    expect(publicResponse.status).toBe(404);

    const unauthenticatedResponse = await request(testApp).get(secureUrl);
    expect(unauthenticatedResponse.status).toBe(401);

    const customerResponse = await request(testApp)
      .get(secureUrl)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(customerResponse.status).toBe(200);
    expect(Buffer.from(customerResponse.body).toString()).toBe('shipment-photo-test');

    const randomCarrierResponse = await request(testApp)
      .get(secureUrl)
      .set('Authorization', `Bearer ${randomCarrierToken}`);
    expect(randomCarrierResponse.status).toBe(403);

    const assignedCarrierResponse = await request(testApp)
      .get(secureUrl)
      .set('Authorization', `Bearer ${assignedCarrierToken}`);
    expect(assignedCarrierResponse.status).toBe(200);
    expect(Buffer.from(assignedCarrierResponse.body).toString()).toBe('shipment-photo-test');

    const adminResponse = await request(testApp)
      .get(secureUrl)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminResponse.status).toBe(200);
    expect(Buffer.from(adminResponse.body).toString()).toBe('shipment-photo-test');
  });
});
