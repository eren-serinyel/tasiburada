import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { testApp } from './helpers/testApp';
import { AppDataSource } from '../infrastructure/database/data-source';
import { Carrier } from '../domain/entities/Carrier';
import { CarrierDocument, CarrierDocumentType } from '../domain/entities/CarrierDocument';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';
const ADMIN = { email: 'admin@tasiburadan.com', password: 'Maviface2141' };
const REQUIRED_TYPES = [
  CarrierDocumentType.AUTHORIZATION_CERT,
  CarrierDocumentType.SRC_CERT,
  CarrierDocumentType.VEHICLE_LICENSE,
  CarrierDocumentType.TAX_PLATE,
];

describe('Carrier onboarding document persistence', () => {
  let carrierId = '';
  let carrierToken = '';
  let adminToken = '';
  const storedFiles = new Set<string>();
  const documentIds = new Map<CarrierDocumentType, string>();

  beforeAll(async () => {
    if (skipDB()) return;
    const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const register = await request(testApp)
      .post('/api/v1/carriers/register')
      .send({
        companyName: `Onboarding Documents ${unique}`,
        taxNumber: unique.slice(-10),
        email: `onboarding-documents-${unique}@example.com`,
        phone: `05${unique.slice(-9)}`,
        contactName: 'Onboarding Documents',
        password: 'Guvenli123A',
        foundedYear: new Date().getFullYear(),
      });
    expect(register.status).toBe(201);
    carrierId = register.body.data.carrier.id;
    carrierToken = register.body.data.token;

    const adminLogin = await request(testApp).post('/api/v1/admin/login').send(ADMIN);
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.token;
  });

  afterAll(async () => {
    if (skipDB()) return;
    for (const filePath of storedFiles) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    if (carrierId) await AppDataSource.getRepository(Carrier).delete(carrierId);
  });

  test('four onboarding uploads return persisted document records', async () => {
    if (skipDB() || !carrierToken) return;

    for (const type of REQUIRED_TYPES) {
      const response = await request(testApp)
        .put('/api/v1/carriers/me/documents')
        .set('Authorization', `Bearer ${carrierToken}`)
        .field('type', type)
        .attach('file', Buffer.from(`%PDF-1.4\n${type}\n%%EOF`), `${type.toLowerCase()}.pdf`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.document?.id).toBeTruthy();
      expect(response.body.document?.type).toBe(type);
      expect(response.body.document?.fileUrl).toBe(`/api/v1/carriers/documents/${response.body.document.id}`);
      documentIds.set(type, response.body.document.id);
    }

    const rows = await AppDataSource.getRepository(CarrierDocument).find({ where: { carrierId } });
    expect(rows).toHaveLength(4);
    expect(new Set(rows.map(row => row.type))).toEqual(new Set(REQUIRED_TYPES));
    rows.forEach(row => {
      const filePath = path.resolve(process.cwd(), row.fileUrl.replace(/^\//, ''));
      storedFiles.add(filePath);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  test('reload endpoint returns all persisted documents and completion advances', async () => {
    if (skipDB() || !carrierToken) return;

    const reload = await request(testApp)
      .get('/api/v1/carriers/me/documents')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect(reload.status).toBe(200);
    expect(reload.body.success).toBe(true);
    expect(reload.body.data.documents).toHaveLength(4);
    expect(new Set(reload.body.data.documents.map((document: any) => document.type)))
      .toEqual(new Set(REQUIRED_TYPES));

    const status = await request(testApp)
      .put('/api/v1/carriers/me/profile-status')
      .set('Authorization', `Bearer ${carrierToken}`);
    expect(status.status).toBe(200);
    expect(status.body.data.sections.documentsCompleted).toBe(true);
    expect(status.body.data.completedSections).toContain('documents');
    expect(status.body.data.overallPercentage).toBe(33);
  });

  test('admin can list and view the uploaded authenticated document', async () => {
    if (skipDB() || !adminToken) return;

    const list = await request(testApp)
      .get(`/api/v1/admin/carriers/${carrierId}/documents`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.success).toBe(true);
    expect(list.body.data).toHaveLength(4);

    const documentId = documentIds.get(CarrierDocumentType.AUTHORIZATION_CERT);
    expect(documentId).toBeTruthy();
    const view = await request(testApp)
      .get(`/api/v1/carriers/documents/${documentId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(view.status).toBe(200);
    expect(view.headers['content-type']).toContain('application/pdf');
    expect(view.body.length).toBeGreaterThan(0);
  });

  test('unsupported document types fail instead of returning fake success or leaving an orphan file', async () => {
    if (skipDB() || !carrierToken) return;
    const documentsDir = path.resolve(process.cwd(), 'uploads', 'documents');
    const before = new Set(fs.readdirSync(documentsDir));

    const response = await request(testApp)
      .put('/api/v1/carriers/me/documents')
      .set('Authorization', `Bearer ${carrierToken}`)
      .field('type', 'NOT_A_DOCUMENT_TYPE')
      .attach('file', Buffer.from('%PDF-1.4\ninvalid\n%%EOF'), 'invalid.pdf');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Desteklenmeyen belge tipi');
    expect(fs.readdirSync(documentsDir).filter(name => !before.has(name))).toEqual([]);
  });
});

describe('Carrier onboarding document frontend contract', () => {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), 'shadcn-ui/src/pages/CarrierOnboarding.tsx'),
    'utf8',
  );

  test('onboarding sends canonical document types and requires a persisted document id', () => {
    REQUIRED_TYPES.forEach(type => expect(source).toContain(`type: '${type}'`));
    expect(source).toContain("!(json as any)?.document?.id");
    expect(source).toContain("apiClient('/api/v1/carriers/me/documents')");
  });

  test('onboarding reloads persisted documents from the authenticated list endpoint', () => {
    expect(source).toContain('const DOC_KEY_BY_TYPE');
    expect(source).toContain('setUploadedDocs(persisted)');
    expect(source).toContain('document?.id');
  });
});
