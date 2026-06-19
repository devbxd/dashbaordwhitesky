const {DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync('./db/whitesky.db');

const cols=[
  'ALTER TABLE clients ADD COLUMN fax TEXT DEFAULT ""',
  'ALTER TABLE invoices ADD COLUMN client_fax TEXT DEFAULT ""',
  'ALTER TABLE invoices ADD COLUMN client_phone TEXT DEFAULT ""',
  'ALTER TABLE invoices ADD COLUMN client_address TEXT DEFAULT ""',
  'ALTER TABLE invoices ADD COLUMN due_days INTEGER DEFAULT 7',
  'ALTER TABLE invoices ADD COLUMN deposit REAL DEFAULT 0',
  'ALTER TABLE invoices ADD COLUMN owner_name TEXT DEFAULT ""',
  'ALTER TABLE invoices ADD COLUMN currency TEXT DEFAULT "KWD"',
  'ALTER TABLE invoices ADD COLUMN tax REAL DEFAULT 0',
  'ALTER TABLE invoices ADD COLUMN subtotal REAL DEFAULT 0',
  'ALTER TABLE invoices ADD COLUMN notes TEXT DEFAULT ""',
  'ALTER TABLE invoices ADD COLUMN due_date TEXT DEFAULT ""',
];

for(const sql of cols){
  try{ db.exec(sql); console.log('OK:', sql.split('ADD COLUMN')[1]); }
  catch(e){ console.log('Déjà fait:', sql.split('ADD COLUMN')[1]); }
}
console.log('Terminé !');