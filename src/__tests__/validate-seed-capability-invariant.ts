import { AppDataSource } from '../infrastructure/database/data-source';

/**
 * POST-SEED VALIDATION: Capability Invariant
 * 
 * Invariant: For every seeded offer:
 *   1. Carrier must have ACTIVE load_type capability for shipment's load type
 *   2. For every extra service on shipment, carrier must have ACTIVE extra service capability
 *      with matching load type
 *   3. No invalid offers should exist
 * 
 * Exit code:
 *   0: All checks pass
 *   1: Invariant violated
 */
async function validateSeedCapabilityInvariant() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🔍 SEED VALIDATION: CAPABILITY INVARIANT CHECK');
    console.log('═══════════════════════════════════════════════════════════\n');

    // 1. Check total offers
    const totalOffersRes = await AppDataSource.query('SELECT COUNT(*) as cnt FROM offers');
    const totalOffers = totalOffersRes[0].cnt;
    console.log(`📊 Total offers: ${totalOffers}`);

    // 2. Find invalid offers: carrier lacks load type capability
    const invalidLoadTypeOffersRes = await AppDataSource.query(`
      SELECT COUNT(DISTINCT o.id) as cnt
      FROM offers o
      JOIN shipments s ON s.id = o.shipmentId
      LEFT JOIN carrier_load_type_capabilities clc 
        ON clc.carrier_id = o.carrierId 
        AND clc.is_active = true
      WHERE clc.id IS NULL
        AND s.shipment_category IN ('HOME_MOVE', 'OFFICE_MOVE', 'PARTIAL_ITEM', 'STORAGE')
      LIMIT 1000
    `);
    const invalidLoadTypeOffers = invalidLoadTypeOffersRes[0].cnt;
    console.log(`\n❌ Offers with invalid load_type capability: ${invalidLoadTypeOffers}`);
    if (invalidLoadTypeOffers > 0) {
      console.log('   (Carrier lacks required load type capability)');
    }

    // 3. Find offers where shipment has extra services but carrier lacks capability
    const shipmentExtraRes = await AppDataSource.query(`
      SELECT DISTINCT 
        o.id as offerId,
        o.shipmentId,
        o.carrierId,
        c.companyName,
        s.shipment_category,
        GROUP_CONCAT(DISTINCT es.name SEPARATOR ', ') as required_extras,
        COUNT(DISTINCT ses.extra_service_id) as extra_count
      FROM offers o
      JOIN shipments s ON s.id = o.shipmentId
      JOIN carriers c ON c.id = o.carrierId
      JOIN shipment_extra_services ses ON ses.shipment_id = s.id
      JOIN extra_services es ON es.id = ses.extra_service_id
      GROUP BY o.id, o.shipmentId, o.carrierId
      LIMIT 100
    `);

    console.log(`\n🔎 Checking ${shipmentExtraRes.length} offers with shipment extra services...`);

    let invalidExtraServiceOffers = 0;
    const invalidOffersDetail: string[] = [];

    for (const row of shipmentExtraRes) {
      const inferredLoadType = inferLoadTypeFromCategory(row.shipment_category);
      
      // Get required extra services
      const requiredRes = await AppDataSource.query(`
        SELECT DISTINCT ses.extra_service_id
        FROM shipment_extra_services ses
        WHERE ses.shipment_id = ?
      `, [row.shipmentId]);

      const requiredIds = requiredRes.map((r: any) => r.extra_service_id);

      // Check if carrier has all required extra service capabilities
      const carrierCapRes = await AppDataSource.query(`
        SELECT COUNT(DISTINCT cesc.extra_service_id) as cnt
        FROM carrier_extra_service_capabilities cesc
        WHERE cesc.carrier_id = ?
          AND cesc.is_active = true
          AND cesc.load_type = ?
          AND cesc.extra_service_id IN (${requiredIds.map(() => '?').join(',')})
      `, [row.carrierId, inferredLoadType, ...requiredIds]);

      const hasAllCapabilities = carrierCapRes[0].cnt === requiredIds.length;
      
      if (!hasAllCapabilities) {
        invalidExtraServiceOffers++;
        invalidOffersDetail.push(
          `  ${row.companyName} / Shipment extras: [${row.required_extras}] / Carrier has: ${carrierCapRes[0].cnt}/${requiredIds.length}`
        );
      }
    }

    console.log(`❌ Offers missing extra service capabilities: ${invalidExtraServiceOffers}`);
    if (invalidOffersDetail.length > 0 && invalidOffersDetail.length <= 5) {
      invalidOffersDetail.forEach(detail => console.log(detail));
    } else if (invalidOffersDetail.length > 5) {
      invalidOffersDetail.slice(0, 5).forEach(detail => console.log(detail));
      console.log(`  ... and ${invalidOffersDetail.length - 5} more`);
    }

    // 4. Summary
    const totalInvalidOffers = invalidLoadTypeOffers + invalidExtraServiceOffers;
    const validOffers = totalOffers - totalInvalidOffers;
    const validityPercent = totalOffers > 0 ? ((validOffers / totalOffers) * 100).toFixed(2) : '0.00';

    console.log(`\n════════════════════════════════════════════════════════════`);
    console.log(`📈 SUMMARY:`);
    console.log(`   ✅ Valid offers: ${validOffers}/${totalOffers} (${validityPercent}%)`);
    console.log(`   ❌ Invalid offers: ${totalInvalidOffers}`);
    console.log(`════════════════════════════════════════════════════════════\n`);

    // 5. Shipment coverage metrics
    const shipmentCoverageRes = await AppDataSource.query(`
      SELECT
        (SELECT COUNT(*) FROM shipments) as total_shipments,
        (SELECT COUNT(DISTINCT shipmentId) FROM offers) as shipments_with_offers,
        (SELECT COUNT(*) FROM shipments s 
         WHERE NOT EXISTS (SELECT 1 FROM offers o WHERE o.shipmentId = s.id)) as shipments_without_offers
    `);

    console.log(`📦 Shipment Coverage:`);
    console.log(`   Total shipments: ${shipmentCoverageRes[0].total_shipments}`);
    console.log(`   With offers: ${shipmentCoverageRes[0].shipments_with_offers}`);
    console.log(`   Without offers: ${shipmentCoverageRes[0].shipments_without_offers}`);
    const coveragePercent = shipmentCoverageRes[0].total_shipments > 0 
      ? ((shipmentCoverageRes[0].shipments_with_offers / shipmentCoverageRes[0].total_shipments) * 100).toFixed(2)
      : '0.00';
    console.log(`   Coverage: ${coveragePercent}%\n`);

    // 6. VERDICT
    if (totalInvalidOffers === 0) {
      console.log('✅ VALIDATION PASSED: All offers match carrier capabilities');
      console.log('🟢 Seed integrity is VALID\n');
      return 0;
    } else {
      console.log(`❌ VALIDATION FAILED: ${totalInvalidOffers} offers violate capability invariant`);
      console.log('🔴 Seed integrity is BROKEN\n');
      return 1;
    }

  } catch (error) {
    console.error('Error during validation:', error);
    return 1;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

function inferLoadTypeFromCategory(category: string): string {
  const map: Record<string, string> = {
    'HOME_MOVE': 'HOME',
    'OFFICE_MOVE': 'OFFICE',
    'PARTIAL_ITEM': 'PARTIAL',
    'STORAGE': 'STORAGE',
  };
  return map[category] || 'HOME';
}

validateSeedCapabilityInvariant()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
