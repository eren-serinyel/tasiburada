import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { testApp } from './helpers/testApp';
import { AppDataSource } from '../infrastructure/database/data-source';
import { Carrier } from '../domain/entities/Carrier';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

describe('Carrier registration tax number contract', () => {
  const createdCarrierIds: string[] = [];
  const suffix = `${Date.now()}`.slice(-7);
  const taxNumber10 = `7${suffix}01`;
  const taxNumber11 = `8${suffix}012`;

  const payload = (taxNumber: string, label: string) => ({
    companyName: `Kayıt Test ${label}`,
    taxNumber,
    email: `carrier-register-${label}-${Date.now()}@example.com`,
    phone: '05551234567',
    contactName: 'Kayıt Test Yetkilisi',
    password: 'Guvenli123A',
    foundedYear: new Date().getFullYear(),
  });

  afterAll(async () => {
    if (skipDB() || createdCarrierIds.length === 0) return;
    await AppDataSource.getRepository(Carrier).delete(createdCarrierIds);
  });

  test('10 haneli benzersiz VKN ile kayıt 201 dönmeli ve DB kaydı oluşmalı', async () => {
    if (skipDB()) return;
    const response = await request(testApp)
      .post('/api/v1/carriers/register')
      .send(payload(taxNumber10, 'vkn'));

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data?.token).toBeTruthy();
    createdCarrierIds.push(response.body.data.carrier.id);

    const carrier = await AppDataSource.getRepository(Carrier).findOneBy({ taxNumber: taxNumber10 });
    expect(carrier?.id).toBe(response.body.data.carrier.id);
  });

  test('11 haneli benzersiz TCKN ile kayıt 201 dönmeli', async () => {
    if (skipDB()) return;
    const response = await request(testApp)
      .post('/api/v1/carriers/register')
      .send(payload(taxNumber11, 'tckn'));

    expect(response.status).toBe(201);
    expect(response.body.data?.carrier?.taxNumber).toBe(taxNumber11);
    createdCarrierIds.push(response.body.data.carrier.id);
  });

  test('kayıtlı vergi numarası net 409 mesajı dönmeli', async () => {
    if (skipDB()) return;
    const response = await request(testApp)
      .post('/api/v1/carriers/register')
      .send(payload(taxNumber10, 'duplicate'));

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      message: 'Bu vergi numarası zaten kayıtlı.',
    });
  });

  test('10/11 hane dışındaki vergi numarası net 400 mesajı dönmeli', async () => {
    const response = await request(testApp)
      .post('/api/v1/carriers/register')
      .send(payload('123456789012', 'invalid'));

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Vergi numarası 10, TCKN 11 haneli olmalıdır.');
  });
});

describe('Carrier registration frontend contract', () => {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), 'shadcn-ui/src/pages/RegisterCarrier.tsx'),
    'utf8',
  );

  test('başarılı kayıt AuthContext üzerinden oturum açıp onboarding rotasına gider', () => {
    expect(source).toContain('const { login: authLogin } = useAuth();');
    expect(source).toContain('authLogin(token, sessionCarrier);');
    expect(source).not.toContain("window.dispatchEvent(new Event('userLogin'))");
    expect(source).not.toContain("localStorage.setItem('authToken', token)");
    expect(source).toContain("navigate('/nakliyeci-onboarding')");
  });

  test('form 10/11 hane sözleşmesini ve kalıcı sunucu hata alanını kullanır', () => {
    expect(source).toContain("return 'Vergi numarası 10, TCKN 11 haneli olmalıdır'");
    expect(source).toContain('maxLength={11}');
    expect(source).toContain('role="alert"');
    expect(source).toContain("submit: message");
    expect(source).toContain('suppressErrorToast: true');
  });
});
