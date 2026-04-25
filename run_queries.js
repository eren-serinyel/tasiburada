const mysql = require("mysql2/promise");

async function runQueries() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Maviface2141",
    database: "tasiburada_dev"
  });

  try {
    // Query 1: Shipments with no offers
    const [q1] = await connection.execute("SELECT COUNT(*) as shipments_no_offers FROM shipments s LEFT JOIN offers o ON s.id=o.shipmentId WHERE o.id IS NULL");
    console.log("Query 1 - Shipments with no offers:");
    console.log(JSON.stringify(q1[0]));
    
    // Query 2: Shipments with extras but no offers
    const [q2] = await connection.execute("SELECT COUNT(*) as shipments_with_extras_no_offers FROM shipments s WHERE EXISTS (SELECT 1 FROM shipment_extra_services ses WHERE ses.shipment_id=s.id) AND NOT EXISTS (SELECT 1 FROM offers o WHERE s.id=o.shipmentId)");
    console.log("\nQuery 2 - Shipments with extras but no offers:");
    console.log(JSON.stringify(q2[0]));
    
    // Query 3: HOME_MOVE shipments with extras and offers
    const [q3] = await connection.execute("SELECT COUNT(*) as home_shipments_with_extras_and_offers FROM shipments s WHERE s.shipment_category='HOME_MOVE' AND EXISTS (SELECT 1 FROM shipment_extra_services ses WHERE ses.shipment_id=s.id) AND EXISTS (SELECT 1 FROM offers o WHERE s.id=o.shipmentId)");
    console.log("\nQuery 3 - HOME_MOVE shipments with extras and offers:");
    console.log(JSON.stringify(q3[0]));
    
    // Query 4: OFFICE_MOVE shipments with extras and offers
    const [q4] = await connection.execute("SELECT COUNT(*) as office_shipments_with_extras_and_offers FROM shipments s WHERE s.shipment_category='OFFICE_MOVE' AND EXISTS (SELECT 1 FROM shipment_extra_services ses WHERE ses.shipment_id=s.id) AND EXISTS (SELECT 1 FROM offers o WHERE s.id=o.shipmentId)");
    console.log("\nQuery 4 - OFFICE_MOVE shipments with extras and offers:");
    console.log(JSON.stringify(q4[0]));
    
    // Query 5: Shipments with any offers
    const [q5] = await connection.execute("SELECT COUNT(*) as shipments_with_any_offers FROM shipments s WHERE EXISTS (SELECT 1 FROM offers o WHERE s.id=o.shipmentId)");
    console.log("\nQuery 5 - Shipments with any offers:");
    console.log(JSON.stringify(q5[0]));
    
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await connection.end();
  }
}

runQueries();
