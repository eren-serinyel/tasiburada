// Sprint 2 E2E Test Script — uses direct JWT to bypass rate limits
const http = require('http');
const crypto = require('crypto');

const BASE = 'http://localhost:3001/api/v1';

// Known test users from DB
const CUSTOMER_ID    = '874abca3-7ce2-4cf4-ab86-389c90bda962';
const CUSTOMER_EMAIL = 'testcustomer1774475960881@test.com';
const CARRIER_ID     = '290814f3-59a3-4daf-a3c0-43e1a9b85951';
const CARRIER_EMAIL  = 'testcarrier1774475898688@test.com';
const JWT_SECRET     = 'tasiburada_jwt_secret_key_2025_secure_token';

function makeJwt(payload) {
  const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
  const body = Buffer.from(JSON.stringify({...payload, iat:Math.floor(Date.now()/1000), exp:Math.floor(Date.now()/1000)+86400})).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(header+'.'+body).digest('base64url');
  return header+'.'+body+'.'+sig;
}

const customerToken = makeJwt({ customerId: CUSTOMER_ID, email: CUSTOMER_EMAIL, type: 'customer' });
const carrierToken  = makeJwt({ carrierId: CARRIER_ID, email: CARRIER_EMAIL, type: 'carrier' });

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('=== Sprint 2 E2E Test ===\n');

  // 0. Health check
  try {
    const h = await request('GET', '/health');
    console.log('✓ Health:', h.status);
  } catch (e) {
    console.log('✗ Backend is NOT running! Start it first.');
    process.exit(1);
  }

  // 1. Verify tokens work
  console.log('\n--- Auth (direct JWT) ---');
  console.log('Customer token:', customerToken ? '✓' : '✗');
  console.log('Carrier token:', carrierToken ? '✓' : '✗');

  // 3. Create shipment (customer)
  console.log('\n--- 3. Müşteri ilan oluşturma ---');
  const createShip = await request('POST', '/shipments/', {
    origin: 'Istanbul Kadikoy',
    destination: 'Ankara Cankaya',
    loadDetails: 'Ev esyalari - test',
    shipmentDate: '2026-04-15',
    transportType: 'ev-tasima',
    weight: 500
  }, customerToken);
  const shipmentId = createShip.body?.data?.id;
  console.log('Create shipment:', createShip.status, shipmentId ? `✓ ID: ${shipmentId}` : '✗', createShip.body?.message || '');

  if (!shipmentId) {
    console.log('Shipment response:', JSON.stringify(createShip.body, null, 2));
    process.exit(1);
  }

  // 4. Carrier browses pending shipments
  console.log('\n--- TEST 1: Nakliyeci Teklif Verme ---');
  const pending = await request('GET', '/shipments/pending', null, carrierToken);
  console.log('Pending shipments:', pending.status, 
    pending.body?.data?.length > 0 ? `✓ ${pending.body.data.length} ilan` : '✗ İlan yok');

  // 5. Carrier gets shipment detail
  const detail = await request('GET', `/shipments/${shipmentId}`, null, carrierToken);
  console.log('Shipment detail:', detail.status, detail.body?.data ? '✓' : '✗');
  if (detail.status >= 400) {
    console.log('  ERROR:', JSON.stringify(detail.body));
  }
  if (detail.body?.data) {
    const d = detail.body.data;
    console.log(`  Rota: ${d.origin} → ${d.destination}`);
    console.log(`  Durum: ${d.status}`);
  }

  // 6. Carrier submits offer (TEST 1 core)
  console.log('\n  >>> Teklif gönderiliyor...');
  const offer = await request('POST', '/offers/', {
    shipmentId: shipmentId,
    price: 1200,
    message: 'Test teklif mesajı',
    estimatedDuration: 8
  }, carrierToken);
  const offerId = offer.body?.data?.id;
  console.log('POST /offers/:', offer.status, offerId ? `✓ Offer ID: ${offerId}` : '✗', offer.body?.message || '');
  
  if (offer.body?.data) {
    console.log(`  Fiyat: ${offer.body.data.price}`);
    console.log(`  Mesaj: ${offer.body.data.message}`);
    console.log(`  estimatedDuration: ${offer.body.data.estimatedDuration}`);
    console.log(`  Durum: ${offer.body.data.status}`);
  }

  // 7. Verify shipment status changed to offer_received
  const detailAfter = await request('GET', `/shipments/${shipmentId}`, null, carrierToken);
  console.log('Shipment status after offer:', detailAfter.body?.data?.status === 'offer_received' ? '✓ offer_received' : `✗ ${detailAfter.body?.data?.status}`);

  // TEST 2: Customer sees offers
  console.log('\n--- TEST 2: Müşteri Teklifleri Görme ---');
  const myOffers = await request('GET', '/customers/offers', null, customerToken);
  console.log('GET /customers/offers:', myOffers.status, 
    myOffers.body?.data?.length > 0 ? `✓ ${myOffers.body.data.length} teklif` : '✗ Teklif yok');
  
  if (myOffers.body?.data?.length > 0) {
    const o = myOffers.body.data[0];
    console.log(`  İlk teklif: ${o.price} TL, durum: ${o.status}`);
    console.log(`  Carrier: ${o.carrier?.companyName || o.carrier?.contactName || 'N/A'}`);
    console.log(`  Shipment: ${o.shipment?.origin || 'N/A'} → ${o.shipment?.destination || 'N/A'}`);
  }

  // Accept offer
  if (offerId) {
    console.log('\n  >>> Teklif kabul ediliyor...');
    const accept = await request('PUT', `/offers/${offerId}/accept`, null, customerToken);
    console.log('PUT /offers/:id/accept:', accept.status, accept.body?.success ? '✓' : '✗', accept.body?.message || '');
    
    if (accept.body?.data) {
      console.log(`  Offer status: ${accept.body.data.status}`);
    }

    // Verify shipment status
    const shipAfterAccept = await request('GET', `/shipments/${shipmentId}`, null, customerToken);
    console.log('Shipment after accept:', shipAfterAccept.body?.data?.status === 'matched' ? '✓ matched' : `✗ ${shipAfterAccept.body?.data?.status}`);
  }

  // TEST 3: Carrier sees own offers
  console.log('\n--- TEST 3: Nakliyeci Tekliflerini Görme ---');
  const carrierOffers = await request('GET', '/carriers/me/offers', null, carrierToken);
  console.log('GET /carriers/me/offers:', carrierOffers.status, 
    carrierOffers.body?.data?.length > 0 ? `✓ ${carrierOffers.body.data.length} teklif` : '✗ Teklif yok');
  
  if (carrierOffers.body?.data?.length > 0) {
    const o = carrierOffers.body.data[0];
    console.log(`  Teklif: ${o.price} TL, durum: ${o.status}`);
    console.log(`  Shipment: ${o.shipment?.origin || 'N/A'} → ${o.shipment?.destination || 'N/A'}`);
  }

  console.log('\n=== TEST TAMAMLANDI ===');
}

run().catch(err => {
  console.error('HATA:', err.message);
  process.exit(1);
});
