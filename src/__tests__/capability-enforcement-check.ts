import { AppDataSource } from '../infrastructure/database/data-source';

/**
 * Validation: Check if capability enforcement works correctly
 * Compare: carriers with offers vs carriers with proper capability backing
 */
async function validateCapabilityEnforcement() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  try {
    console.log('\n🔍 CAPABILITY ENFORCEMENT VALIDATION\n');

    // 1. Sample: Find a HOME_MOVE shipment with extra services AND offers
    const shipmentRes = await AppDataSource.query(`
      SELECT s.id, s.shipment_category
      FROM shipments s
      WHERE s.shipment_category = 'HOME_MOVE'
        AND EXISTS (
          SELECT 1 FROM shipment_extra_services ses
          WHERE ses.shipment_id = s.id
        )
        AND EXISTS (
          SELECT 1 FROM offers o
          WHERE o.shipmentId = s.id
        )
      ORDER BY s.id DESC
      LIMIT 1
    `);

    if (!shipmentRes || shipmentRes.length === 0) {
      console.log('⚠️  No HOME_MOVE shipments with extras and offers found');
      return;
    }

    const shipmentId = shipmentRes[0].id;
    console.log(`📦 Shipment: ${shipmentId} (HOME_MOVE with extras and offers)`);

    // 2. Get required extra services
    const extrasRes = await AppDataSource.query(`
      SELECT es.id, es.name
      FROM shipment_extra_services ses
      JOIN extra_services es ON es.id = ses.extra_service_id
      WHERE ses.shipment_id = ?
    `, [shipmentId]);

    console.log(`📋 Required extras: ${extrasRes.map((e: any) => e.name).join(', ')}`);
    const requiredIds = extrasRes.map((e: any) => e.id);

    // 3. Get all carriers with offers for this shipment
    const carriersWithOffers = await AppDataSource.query(`
      SELECT DISTINCT o.carrierId, c.companyName
      FROM offers o
      JOIN carriers c ON c.id = o.carrierId
      WHERE o.shipmentId = ?
    `, [shipmentId]);

    console.log(`\n🚚 Carriers with offers: ${carriersWithOffers.length}`);

    // 4. For each carrier with offer, check if it has proper capabilities
    let capableCount = 0;
    let nonCapableCount = 0;

    for (const cwo of carriersWithOffers) {
      const hasHome = await AppDataSource.query(`
        SELECT 1 FROM carrier_load_type_capabilities
        WHERE carrier_id = ? AND is_active = true AND load_type = 'HOME'
      `, [cwo.carrierId]);

      if (!hasHome || hasHome.length === 0) {
        console.log(`  ❌ ${cwo.companyName} - NO HOME capability`);
        nonCapableCount++;
        continue;
      }

      const hasAllExtras = await AppDataSource.query(`
        SELECT COUNT(DISTINCT extra_service_id) as cnt
        FROM carrier_extra_service_capabilities
        WHERE carrier_id = ? AND is_active = true AND load_type = 'HOME'
          AND extra_service_id IN (${requiredIds.map(() => '?').join(',')})
      `, [cwo.carrierId, ...requiredIds]);

      if (hasAllExtras[0].cnt === requiredIds.length) {
        console.log(`  ✅ ${cwo.companyName} - Has HOME + all extras`);
        capableCount++;
      } else {
        console.log(`  ⚠️  ${cwo.companyName} - Missing some extras (${hasAllExtras[0].cnt}/${requiredIds.length})`);
        nonCapableCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Properly capable: ${capableCount}/${carriersWithOffers.length}`);
    console.log(`   ❌ Non-capable: ${nonCapableCount}/${carriersWithOffers.length}`);

    if (nonCapableCount === 0) {
      console.log('\n✅ ENFORCEMENT PASS: All offers from capable carriers');
    } else {
      console.log(`\n❌ ENFORCEMENT FAIL: ${nonCapableCount} non-capable carriers have offers`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

validateCapabilityEnforcement().catch(console.error);
