/**
 * auth-service-flow.test.ts
 * AuthService (requestPasswordReset, resetPassword, verifyEmail, resendVerification,
 * checkEmailUserType) ve AuthController integration testleri.
 */
import request from 'supertest';
import { testApp } from './helpers/testApp';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

const CUSTOMER = { email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' };
const CARRIER  = { email: 'info@silenakliyat.com',   password: 'Maviface2141' };

describe('AuthService Akışı', () => {

  // ── requestPasswordReset ──────────────────────────────────────────────────
  test('1. Olmayan e-posta ile şifre sıfırlama isteği 404/400 dönmeli', async () => {
    if (skipDB()) return;
    const res = await request(testApp)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'olmayan@example.com', userType: 'customer' });
    expect([400, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  test('2. email eksik şifre sıfırlama isteği 400 dönmeli', async () => {
    const res = await request(testApp)
      .post('/api/v1/auth/forgot-password')
      .send({ userType: 'customer' });
    expect(res.status).toBe(400);
  });

  test('3. userType eksik şifre sıfırlama isteği 400 dönmeli', async () => {
    const res = await request(testApp)
      .post('/api/v1/auth/forgot-password')
      .send({ email: CUSTOMER.email });
    expect(res.status).toBe(400);
  });

  test('4. Geçerli müşteri e-postası ile şifre sıfırlama isteği 200 veya 400 dönmeli', async () => {
    if (skipDB()) return;
    const res = await request(testApp)
      .post('/api/v1/auth/forgot-password')
      .send({ email: CUSTOMER.email, userType: 'customer' });
    expect([200, 400]).toContain(res.status);
  });

  test('5. Geçerli nakliyeci e-postası ile şifre sıfırlama isteği 200 veya 400 dönmeli', async () => {
    if (skipDB()) return;
    const res = await request(testApp)
      .post('/api/v1/auth/forgot-password')
      .send({ email: CARRIER.email, userType: 'carrier' });
    expect([200, 400]).toContain(res.status);
  });

  // ── resetPassword ─────────────────────────────────────────────────────────
  test('6. Geçersiz reset token ile şifre sıfırlama 400/404 dönmeli', async () => {
    const res = await request(testApp)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'gecersiztoken123', newPassword: 'YeniSifre123!', userType: 'customer' });
    expect([400, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  test('7. token eksik reset isteği 400 dönmeli', async () => {
    const res = await request(testApp)
      .post('/api/v1/auth/reset-password')
      .send({ newPassword: 'YeniSifre123!', userType: 'customer' });
    expect(res.status).toBe(400);
  });

  test('8. newPassword eksik reset isteği 400 dönmeli', async () => {
    const res = await request(testApp)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'abc', userType: 'customer' });
    expect(res.status).toBe(400);
  });

  test('9. userType eksik reset isteği 400 dönmeli', async () => {
    const res = await request(testApp)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'abc', newPassword: 'YeniSifre123!' });
    expect(res.status).toBe(400);
  });

  // ── verifyEmail ───────────────────────────────────────────────────────────
  test('10. Geçersiz doğrulama token ile e-posta doğrulama 400/404 dönmeli', async () => {
    const res = await request(testApp)
      .post('/api/v1/auth/verify-email')
      .send({ token: 'gecersiz-token', userType: 'customer' });
    expect([400, 404]).toContain(res.status);
  });

  test('11. token eksik doğrulama isteği 400 dönmeli', async () => {
    const res = await request(testApp)
      .post('/api/v1/auth/verify-email')
      .send({ userType: 'customer' });
    expect(res.status).toBe(400);
  });

  // ── resendVerification ────────────────────────────────────────────────────
  // resendVerification is GET with query params
  test('12. Olmayan e-posta ile doğrulama yeniden gönderme 400 dönmeli', async () => {
    if (skipDB()) return;
    const res = await request(testApp)
      .get('/api/v1/auth/resend-verification')
      .query({ email: 'olmayan@example.com', userType: 'customer' });
    expect([400]).toContain(res.status);
  });

  test('13. email eksik doğrulama yeniden gönderme (GET) 400 dönmeli', async () => {
    const res = await request(testApp)
      .get('/api/v1/auth/resend-verification')
      .query({ userType: 'customer' });
    expect(res.status).toBe(400);
  });

  // checkEmail is GET with query params
  test('14. Müşteri e-postası check-email ile "customer" dönmeli', async () => {
    if (skipDB()) return;
    const res = await request(testApp)
      .get('/api/v1/auth/check-email')
      .query({ email: CUSTOMER.email });
    expect(res.status).toBe(200);
    expect(res.body.userType).toBe('customer');
  });

  test('15. Carrier e-postası check-email ile "carrier" dönmeli', async () => {
    if (skipDB()) return;
    const res = await request(testApp)
      .get('/api/v1/auth/check-email')
      .query({ email: CARRIER.email });
    expect(res.status).toBe(200);
    expect(res.body.userType).toBe('carrier');
  });

  test('16. Kayıtsız e-posta check-email ile userType null dönmeli', async () => {
    if (skipDB()) return;
    const res = await request(testApp)
      .get('/api/v1/auth/check-email')
      .query({ email: 'kayitsiz@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.userType).toBeNull();
  });

  test('17. email eksik check-email isteği 400 dönmeli', async () => {
    const res = await request(testApp)
      .get('/api/v1/auth/check-email');
    expect(res.status).toBe(400);
  });

  // ── Carrier login ─────────────────────────────────────────────────────────
  test('18. Yanlış şifre ile carrier girişi 401 dönmeli', async () => {
    if (skipDB()) return;
    const res = await request(testApp)
      .post('/api/v1/carriers/login')
      .send({ email: CARRIER.email, password: 'YanlisParola999' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('19. Geçerli carrier girişi 200 dönmeli ve token üretmeli', async () => {
    if (skipDB()) return;
    const res = await request(testApp)
      .post('/api/v1/carriers/login')
      .send(CARRIER);
    expect(res.status).toBe(200);
    expect(res.body.data?.token).toBeTruthy();
  });

  // ── Customer login ────────────────────────────────────────────────────────
  test('20. Yanlış şifre ile customer girişi 401 dönmeli', async () => {
    if (skipDB()) return;
    const res = await request(testApp)
      .post('/api/v1/customers/login')
      .send({ email: CUSTOMER.email, password: 'YanlisParola999' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
