process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
const {Client}=require('pg');
const client=new Client({connectionString:'postgresql://neondb_owner:npg_T5CwZxGr9EVW@ep-small-salad-asns7h0n.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require'});
client.connect().then(()=>client.query(`
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS owner_name TEXT;
  ALTER TABLE ticket_sales ADD COLUMN IF NOT EXISTS owner_name TEXT;
`)).then(()=>{console.log('Done!');client.end();}).catch(console.error);