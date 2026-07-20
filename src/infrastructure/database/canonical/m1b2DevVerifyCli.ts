import { createHash } from 'crypto';
import { config } from 'dotenv';
import {
  createConnection,
  type RowDataPacket,
} from 'mysql2/promise';
import {
  inspectCanonicalSchema,
  readOnlySchemaConnectionOptionsFromEnvironment,
} from '../disposable/schemaIntrospection';
import { countCanonicalSchema } from './canonicalVerification';

config();

const LOOPBACK_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
]);

const fail = (reason: string): never => {
  throw new Error(`M1B-2 dev verification failed: ${reason}`);
};

const requireSafeEnvironment = (): void => {
  if (process.env.NODE_ENV !== 'development') {
    fail('NODE_ENV must be development');
  }
  if (
    !process.env.DB_HOST ||
    !LOOPBACK_HOSTS.has(process.env.DB_HOST.toLowerCase())
  ) {
    fail('DB_HOST must be loopback');
  }
  if (process.env.DB_NAME !== 'tasiburada_dev') {
    fail('DB_NAME must be tasiburada_dev');
  }
};

const main = async (): Promise<void> => {
  requireSafeEnvironment();
  const connection = await createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME,
    timezone: 'Z',
  });

  try {
    await connection.query(
      `SET SESSION time_zone = '+00:00'`,
    );
    const [disposableRows] =
      await connection.query<RowDataPacket[]>(
        `SELECT SCHEMA_NAME AS schemaName
           FROM information_schema.SCHEMATA
          WHERE SCHEMA_NAME LIKE
            'tasiburada\\_m1b2\\_%\\_test'`,
      );
    if (disposableRows.length !== 0) {
      fail('disposable database cleanup mismatch');
    }
    const [migrationRows] = await connection.query<RowDataPacket[]>(
      'SELECT timestamp, name FROM migrations ORDER BY timestamp, id',
    );
    const migrationNames = migrationRows.map(row =>
      String(row.name),
    );
    const expectedMigrations = [
      'CanonicalBaselineV11784500000000',
      'AddShipmentV2IdentityCodes1784580000000',
      'AddShipmentOperationalConditions1784660000000',
      'AddShipmentCategoryDetails1784740000000',
    ];
    if (
      JSON.stringify(migrationNames) !==
      JSON.stringify(expectedMigrations)
    ) {
      fail('migration history mismatch');
    }

    const [summaryRows] = await connection.query<RowDataPacket[]>(
      `SELECT
         (SELECT COUNT(*) FROM shipments) AS shipments,
         (SELECT COUNT(*) FROM customers) AS customers,
         (SELECT COUNT(*) FROM carriers) AS carriers,
         (SELECT COUNT(*) FROM offers) AS offers,
         (SELECT COUNT(*)
            FROM shipment_home_move_details) AS homeDetails,
         (SELECT COUNT(*)
            FROM shipment_home_move_items) AS homeItems,
         (SELECT COUNT(*)
            FROM shipment_office_move_details) AS officeDetails,
         (SELECT COUNT(*)
            FROM shipment_partial_item_details) AS partialDetails,
         (SELECT COUNT(*)
            FROM shipment_partial_items) AS partialItems`,
    );
    const summary = summaryRows[0];
    if (
      Number(summary.shipments) !== 2000 ||
      Number(summary.homeDetails) !== 1000 ||
      Number(summary.officeDetails) !== 300 ||
      Number(summary.partialDetails) !== 600 ||
      Number(summary.homeItems) !== 0 ||
      Number(summary.partialItems) !== 0
    ) {
      fail('row count mismatch');
    }

    const [violationRows] =
      await connection.query<RowDataPacket[]>(
        `SELECT
           (SELECT COUNT(*)
              FROM shipment_home_move_details detail
              JOIN shipments shipment
                ON shipment.id = detail.shipment_id
             WHERE detail.service_category_code <> 'HOME_MOVE'
                OR shipment.service_category_code <> 'HOME_MOVE')
             AS wrongHome,
           (SELECT COUNT(*)
              FROM shipment_office_move_details detail
              JOIN shipments shipment
                ON shipment.id = detail.shipment_id
             WHERE detail.service_category_code <> 'OFFICE_MOVE'
                OR shipment.service_category_code <> 'OFFICE_MOVE')
             AS wrongOffice,
           (SELECT COUNT(*)
              FROM shipment_partial_item_details detail
              JOIN shipments shipment
                ON shipment.id = detail.shipment_id
             WHERE detail.service_category_code <> 'PARTIAL_ITEM'
                OR shipment.service_category_code <> 'PARTIAL_ITEM')
             AS wrongPartial,
           (SELECT COUNT(*)
              FROM shipments shipment
              LEFT JOIN shipment_home_move_details home
                ON home.shipment_id = shipment.id
              LEFT JOIN shipment_office_move_details officeDetail
                ON officeDetail.shipment_id = shipment.id
              LEFT JOIN shipment_partial_item_details partialDetail
                ON partialDetail.shipment_id = shipment.id
             WHERE shipment.shipment_category = 'STORAGE'
               AND (
                 home.shipment_id IS NOT NULL
                 OR officeDetail.shipment_id IS NOT NULL
                 OR partialDetail.shipment_id IS NOT NULL
               ))
             AS storageDetails,
           (SELECT COUNT(*)
              FROM shipments shipment
              LEFT JOIN customers customer
                ON customer.id = shipment.customer_id
             WHERE customer.id IS NULL)
             AS shipmentCustomerOrphans,
           (SELECT COUNT(*)
              FROM offers offer
              LEFT JOIN shipments shipment
                ON shipment.id = offer.shipmentId
              LEFT JOIN carriers carrier
                ON carrier.id = offer.carrierId
             WHERE shipment.id IS NULL OR carrier.id IS NULL)
             AS offerOrphans`,
      );
    const violations = violationRows[0];
    if (
      Object.values(violations).some(value => Number(value) !== 0)
    ) {
      fail('category or relationship invariant mismatch');
    }

    const [shipmentRows] =
      await connection.query<RowDataPacket[]>(
        'SELECT id FROM shipments ORDER BY id',
      );
    const shipmentPkHash = createHash('sha256')
      .update(
        shipmentRows.map(row => String(row.id)).join('\n'),
      )
      .digest('hex');
    const [homeBackfillRows] =
      await connection.query<RowDataPacket[]>(
        `SELECT residence_type_code AS code,
                COUNT(*) AS rowCount
           FROM shipment_home_move_details
          GROUP BY residence_type_code
          ORDER BY residence_type_code`,
      );
    const [timezoneRows] =
      await connection.query<RowDataPacket[]>(
        'SELECT @@session.time_zone AS sessionTimezone',
      );
    if (
      String(timezoneRows[0]?.sessionTimezone) !== '+00:00'
    ) {
      fail('session timezone mismatch');
    }

    const manifest = await inspectCanonicalSchema(
      readOnlySchemaConnectionOptionsFromEnvironment(process.env),
    );
    const schemaCounts = countCanonicalSchema(manifest);
    if (schemaCounts.tables !== 53) {
      fail('physical table count mismatch');
    }

    console.log('M1B-2 dev verification: PASS');
    console.log('Canonical migrations: 4');
    console.log('Legacy migrations: 0');
    console.log('Pending migrations: 0');
    console.log('Disposable databases remaining: 0');
    console.log(`Row counts: ${JSON.stringify(summary)}`);
    console.log(
      `Invariant violations: ${JSON.stringify(violations)}`,
    );
    console.log(
      `Home residence backfill: ${JSON.stringify(homeBackfillRows)}`,
    );
    console.log(`Shipment PK fingerprint: ${shipmentPkHash}`);
    console.log('Session timezone: +00:00');
    console.log(
      `Schema fingerprint: ${manifest.schemaFingerprint}`,
    );
    console.log(
      `Schema counts: ${JSON.stringify(schemaCounts)}`,
    );
  } finally {
    await connection.end();
  }
};

void main().catch(error => {
  const message =
    error instanceof Error &&
    error.message.startsWith('M1B-2 dev verification failed:')
      ? error.message
      : 'M1B-2 dev verification failed';
  console.error(message);
  process.exitCode = 1;
});
