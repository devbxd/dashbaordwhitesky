process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
const {Client}=require('pg');
const fs=require('fs');

const client=new Client({
  connectionString:'postgresql://neondb_owner:npg_T5CwZxGr9EVW@ep-small-salad-asns7h0n.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function importData(){
  await client.connect();
  console.log('Connecté à Neon!');
  
  // Create tables first
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      display_name VARCHAR(100),
      role VARCHAR(50) DEFAULT 'employe',
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(100),
      fax VARCHAR(100),
      address TEXT,
      city VARCHAR(100),
      tag VARCHAR(50) DEFAULT 'New',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      num VARCHAR(50) UNIQUE NOT NULL,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      client_name VARCHAR(255),
      client_address TEXT,
      client_phone VARCHAR(100),
      client_fax VARCHAR(100),
      status VARCHAR(50) DEFAULT 'pending',
      date DATE,
      due_date DATE,
      due_days INTEGER DEFAULT 7,
      currency VARCHAR(10) DEFAULT 'KWD',
      subtotal DECIMAL(12,2) DEFAULT 0,
      tax DECIMAL(12,2) DEFAULT 0,
      deposit DECIMAL(12,2) DEFAULT 0,
      total DECIMAL(12,2) DEFAULT 0,
      notes TEXT,
      owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS invoice_rows (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
      pnr VARCHAR(100),
      destination VARCHAR(255),
      passenger VARCHAR(255),
      airline VARCHAR(100),
      "airlineRef" VARCHAR(255),
      travel_date VARCHAR(100),
      price DECIMAL(12,2) DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS ticket_sales (
      id SERIAL PRIMARY KEY,
      num VARCHAR(50) UNIQUE NOT NULL,
      date DATE,
      passenger VARCHAR(255),
      pnr VARCHAR(100),
      company VARCHAR(100),
      airline VARCHAR(100),
      destination VARCHAR(255),
      system_issue VARCHAR(255),
      net_price DECIMAL(12,2) DEFAULT 0,
      selling_price DECIMAL(12,2) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'unpaid',
      notes TEXT,
      ticket_type VARCHAR(50) DEFAULT 'individual',
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
      method VARCHAR(100),
      reference VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT
    );
  `);
  console.log('Tables créées!');

  // Import data
  const sql=fs.readFileSync('dump.sql','utf8');
  const lines=sql.split('\n').filter(l=>l.trim());
  let ok=0,err=0;
  for(const line of lines){
    try{
      await client.query(line);
      ok++;
    }catch(e){
      console.log('Skip:',e.message.substring(0,80));
      err++;
    }
  }
  await client.end();
  console.log(`Done! ${ok} importées, ${err} ignorées.`);
}
importData().catch(console.error);