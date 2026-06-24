process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
const {Client}=require('pg');
const client=new Client({connectionString:'postgresql://neondb_owner:npg_T5CwZxGr9EVW@ep-small-salad-asns7h0n.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require'});
client.connect().then(async()=>{
  console.log('Connecté!');
  const fixes=[
    'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS owner_name TEXT',
    'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_address TEXT',
    'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_phone TEXT',
    'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_fax TEXT',
    'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_days INTEGER DEFAULT 7',
    'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deposit REAL DEFAULT 0',
    'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT \'KWD\'',
    'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax REAL DEFAULT 0',
    'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal REAL DEFAULT 0',
    'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT',
    'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date TEXT',
    'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_id INTEGER',
    'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS owner_id INTEGER',
    'ALTER TABLE invoice_rows ADD COLUMN IF NOT EXISTS "airlineRef" TEXT DEFAULT \'\'',
    'ALTER TABLE ticket_sales ADD COLUMN IF NOT EXISTS owner_name TEXT',
    'ALTER TABLE ticket_sales ADD COLUMN IF NOT EXISTS owner_id INTEGER',
    'ALTER TABLE ticket_sales ADD COLUMN IF NOT EXISTS client_id INTEGER',
    'ALTER TABLE ticket_sales ADD COLUMN IF NOT EXISTS ticket_type TEXT DEFAULT \'individual\'',
    'ALTER TABLE ticket_sales ADD COLUMN IF NOT EXISTS system_issue TEXT',
    'ALTER TABLE ticket_sales ADD COLUMN IF NOT EXISTS company TEXT',
  ];
  for(const sql of fixes){
    try{await client.query(sql);console.log('OK:',sql.split('ADD COLUMN IF NOT EXISTS')[1]);}
    catch(e){console.log('Skip:',e.message.substring(0,60));}
  }
  await client.end();
  console.log('DONE!');
}).catch(console.error);