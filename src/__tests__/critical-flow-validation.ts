import { AppDataSource } from '../infrastructure/database/data-source';
import { Shipment } from '../domain/entities/Shipment';
import { Offer } from '../domain/entities/Offer';
import { Carrier } from '../domain/entities/Carrier';
import { ExtraService } from '../domain/entities/ExtraService';
import { CarrierLoadTypeCapability } from '../domain/entities/CarrierLoadTypeCapability';
import { CarrierExtraServiceCapability } from '../domain/entities/CarrierExtraServiceCapability';
import { ExtraServiceLoadType } from '../domain/entities/ExtraServiceLoadType';

/**
 * CRITICAL FLOW VALIDATION:
 * Test that carrier capability filtering works end-to-end for a real shipment
 */
async function validateCriticalFlow() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  try {
    // 1. Pick ONE HOME_MOVE shipment with extra services
    const shipment = await AppDataSource.query(`
      SELECT s.id, s.shipment_category
      FROM shipments s
      WHERE s.shipment_category = 'HOME_MOVE'
        AND EXISTS (
          SELECT 1 FROM shipment_extra_services ses
          WHERE ses.shipment_id = s.id
        )
      LIMIT 1
    `);

    if (!shipment || shipment.length === 0) {
      console.log('❌ No HOME_MOVE shipments with extras found');
      return;
    }

    const shipmentId = shipment[0].id;
    console.log(`\n📦 Testing Shipment: ${shipmentId}`);

    // 2. Get extra services for this shipment
    const shipmentExtras = await AppDataSource.query(`
      SELECT es.id, es.name
      FROM shipment_extra_services ses
      JOIN extra_services es ON es.id = ses.extra_service_id
      WHERE ses.shipment_id = ?
    `, [shipmentId]);

    console.log(`📋 Extra Services: ${shipmentExtras.map((e: any) => e.name).join(', ')}`);
    const extraServiceIds = shipmentExtras.map((e: any) => e.id);

    // 3. Get all ACTIVE carriers with HOME capability
    const capableCarriers = await AppDataSource.query(`
      SELECT DISTINCT c.id, c.companyName
      FROM carriers c
      JOIN carrier_load_type_capabilities clc ON c.id = clc.carrier_id
      WHERE c.isActive = true
        AND clc.is_active = true
        AND clc.load_type = 'HOME'
      LIMIT 20
    `);

    console.log(`✅ Capable carriers with HOME load type: ${capableCarriers.length}`);

    // 4. For each capable carrier, verify it has ALL required extra service capabilities
    let fullCapableCount = 0;
    const fullCapableCarrierIds: string[] = [];
    
    for (const carrier of capableCarriers) {
      const hasAllExtras = await AppDataSource.query(`
        SELECT COUNT(DISTINCT cesc.extra_service_id) as count
        FROM carrier_extra_service_capabilities cesc
        WHERE cesc.carrier_id = ?
          AND cesc.is_active = true
          AND cesc.load_type = 'HOME'
          AND cesc.extra_service_id IN (${extraServiceIds.map(() => '?').join(',')})
      `, [carrier.id, ...extraServiceIds]);

      if (hasAllExtras[0].count === extraServiceIds.length) {
        fullCapableCount++;
        fullCapableCarrierIds.push(carrier.id as string);
      }
    }

    console.log(`🎯 Carriers with HOME + ALL extra services: ${fullCapableCount}`);

    // 5. Count actual offers for this shipment FROM capable carriers
    let offersFromCapable = 0;
    if (fullCapableCarrierIds.length > 0) {
      const result = await AppDataSource.query(`
        SELECT COUNT(*) as count
        FROM offers o
        WHERE o.shipmentId = ?
          AND o.carrierId IN (${fullCapableCarrierIds.map(() => '?').join(',')})
      `, [shipmentId, ...fullCapableCarrierIds]);
      offersFromCapable = result[0].count;
    }

    console.log(`💰 Offers from capable carriers: ${offersFromCapable}`);

    // 6. Count offers from NON-capable carriers
    const allCarrierIds = capableCarriers.map((c: any) => c.id as string);
    const nonCapableIds = allCarrierIds.filter((id: string) => !fullCapableCarrierIds.includes(id));
    
    let offersFromNonCapable = 0;
    if (nonCapableIds.length > 0) {
      const result = await AppDataSource.query(`
        SELECT COUNT(*) as count
        FROM offers o
        WHERE o.shipmentId = ?
          AND o.carrierId IN (${nonCapableIds.map(() => '?').join(',')})
      `, [shipmentId, ...nonCapableIds]);
      offersFromNonCapable = result[0].count;
    }

    console.log(`⚠️  Offers from non-capable carriers: ${offersFromNonCapable}`);

    // 7. Verdict
    if (offersFromCapable > 0 && offersFromNonCapable === 0) {
      console.log('\n✅ CRITICAL FLOW PASS: Only capable carriers have offers for this shipment');
    } else if (offersFromCapable === 0) {
      console.log('\n⚠️  CRITICAL FLOW WARN: No offers from capable carriers (may be price/geography issue)');
    } else if (offersFromNonCapable > 0) {
      console.log('\n❌ CRITICAL FLOW FAIL: Non-capable carriers have offers (filtering not working!)');
    }

  } catch (error) {
    console.error('❌ Validation error:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

validateCriticalFlow().catch(console.error);
