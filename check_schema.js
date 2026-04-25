const mysql = require('mysql2/promise');

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Maviface2141',
    database: 'tasiburada_dev'
  });

  try {
    // Check offers table columns
    const [offersColumns] = await connection.execute("DESCRIBE offers");
    console.log('Offers table columns:');
    offersColumns.forEach(col => console.log('  ' + col.Field + ' (' + col.Type + ')'));
    
    // Check shipments table columns
    const [shipmentsColumns] = await connection.execute("DESCRIBE shipments");
    console.log('\nShipments table columns:');
    shipmentsColumns.forEach(col => console.log('  ' + col.Field + ' (' + col.Type + ')'));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkSchema();
