const mysql = require('mysql2/promise');

async function checkIntegrity() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Maviface2141',
    database: 'tasiburada_dev'
  });

  const queries = [
    "SELECT COUNT(*) as orphan_shipment_extra_services FROM shipment_extra_services ses WHERE NOT EXISTS (SELECT 1 FROM shipments s WHERE s.id=ses.shipment_id) OR NOT EXISTS (SELECT 1 FROM extra_services es WHERE es.id=ses.extra_service_id)",
    "SELECT COUNT(*) as orphan_load_type_cap FROM carrier_load_type_capabilities clc WHERE NOT EXISTS (SELECT 1 FROM carriers c WHERE c.id=clc.carrier_id)",
    "SELECT COUNT(*) as orphan_extra_service_cap FROM carrier_extra_service_capabilities cesc WHERE NOT EXISTS (SELECT 1 FROM carriers c WHERE c.id=cesc.carrier_id) OR NOT EXISTS (SELECT 1 FROM extra_services es WHERE es.id=cesc.extra_service_id)",
    "SELECT COUNT(*) as shipments_no_offers FROM shipments s LEFT JOIN offers o ON s.id=o.shipment_id WHERE o.id IS NULL",
    "SELECT COUNT(*) as home_shipments_with_offers FROM shipments s WHERE s.shipment_category='HOME_MOVE' AND EXISTS (SELECT 1 FROM offers o WHERE s.id=o.shipment_id)",
    "SELECT COUNT(*) as office_shipments_with_offers FROM shipments s WHERE s.shipment_category='OFFICE_MOVE' AND EXISTS (SELECT 1 FROM offers o WHERE s.id=o.shipment_id)"
  ];

  try {
    for (let query of queries) {
      const [rows] = await connection.execute(query);
      console.log(JSON.stringify(rows[0]));
    }
  } catch (error) {
    console.error('Database query error:', error.message);
  } finally {
    await connection.end();
  }
}

checkIntegrity();
