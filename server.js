const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = 3000;

if (!fs.existsSync('./db')) fs.mkdirSync('./db');
const db = new DatabaseSync('./db/whitesky.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employe',
    display_name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    fax TEXT,
    address TEXT,
    city TEXT,
    tag TEXT DEFAULT 'Nouveau',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    num TEXT UNIQUE NOT NULL,
    client_id INTEGER,
    client_name TEXT,
    client_address TEXT,
    client_phone TEXT,
    client_fax TEXT,
    status TEXT DEFAULT 'draft',
    date TEXT,
    due_date TEXT,
    due_days INTEGER DEFAULT 7,
    subtotal REAL DEFAULT 0,
    tax REAL DEFAULT 0,
    deposit REAL DEFAULT 0,
    total REAL DEFAULT 0,
    currency TEXT DEFAULT 'KWD',
    notes TEXT,
    owner_id INTEGER,
    owner_name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(client_id) REFERENCES clients(id)
  );
  CREATE TABLE IF NOT EXISTS invoice_rows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    pnr TEXT,
    destination TEXT,
    passenger TEXT,
    airline TEXT,
    travel_date TEXT,
    price REAL DEFAULT 0,
    FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS ticket_sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    num TEXT UNIQUE NOT NULL,
    airline TEXT,
    pnr TEXT,
    company TEXT,
    destination TEXT,
    passenger TEXT,
    date TEXT,
    system_issue TEXT,
    net_price REAL DEFAULT 0,
    selling_price REAL DEFAULT 0,
    status TEXT DEFAULT 'unpaid',
    notes TEXT,
    owner_id INTEGER,
    owner_name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER,
    invoice_num TEXT,
    client_name TEXT,
    amount REAL,
    method TEXT,
    reference TEXT,
    date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Migration — create ticket_sales if not exists
try{db.exec(`CREATE TABLE IF NOT EXISTS ticket_sales (id INTEGER PRIMARY KEY AUTOINCREMENT,num TEXT UNIQUE NOT NULL,airline TEXT,pnr TEXT,company TEXT,destination TEXT,passenger TEXT,date TEXT,system_issue TEXT,net_price REAL DEFAULT 0,selling_price REAL DEFAULT 0,status TEXT DEFAULT 'unpaid',notes TEXT,owner_id INTEGER,owner_name TEXT,created_at TEXT DEFAULT (datetime('now')))`);}catch(e){}

// Default settings
const defaultSettings = {
  company_name: 'WHITE SKY TRAVEL AGENCY',
  company_address: 'HAWALLY BLOCK 4 STREET 4',
  company_phone_p: '965-98818699',
  company_phone_m: '965-99967060',
  company_email: 'WHITESKYTRAVAL@GMAIL.COM',
  company_logo: '',
  invoice_currency: 'KWD',
  invoice_due_days: '7',
  invoice_footer: 'Please make all checks payable to WHITE SKY TRAVEL AGENCY.\nTotal due in 07 days.\nwhiteskytraval@gmail.com | M : 98818699 / 99976060',
};
for (const [k, v] of Object.entries(defaultSettings)) {
  const ex = db.prepare('SELECT value FROM settings WHERE key=?').get(k);
  if (!ex) db.prepare('INSERT INTO settings (key,value) VALUES (?,?)').run(k, v);
}

// Seed users
if (db.prepare('SELECT COUNT(*) as c FROM users').get().c === 0) {
  db.prepare("INSERT INTO users (username,password,role,display_name) VALUES (?,?,?,?)").run('patron', bcrypt.hashSync('whitesky67758123',10), 'patron', 'Admin');
  db.prepare("INSERT INTO users (username,password,role,display_name) VALUES (?,?,?,?)").run('employe', bcrypt.hashSync('whitesky00123',10), 'employe', 'User');
}

// Seed sample data
if (db.prepare('SELECT COUNT(*) as c FROM clients').get().c === 0) {
  db.prepare("INSERT INTO clients (name,email,phone,fax,address,city,tag) VALUES (?,?,?,?,?,?,?)").run('BERRO','berro@email.com','965-99967060','NA','DUBAI','Dubai','VIP');
  db.prepare("INSERT INTO clients (name,email,phone,address,city,tag) VALUES (?,?,?,?,?,?)").run('Ahmad Mansour','ahmad@gmail.com','+961 70 123 456','Tripoli','Tripoli','Régulier');
  db.prepare("INSERT INTO clients (name,email,phone,address,city,tag) VALUES (?,?,?,?,?,?)").run('Sara Khalil','sara@outlook.com','+961 71 987 654','Beyrouth','Beyrouth','Nouveau');

  const inv1 = db.prepare("INSERT INTO invoices (num,client_id,client_name,client_address,client_phone,client_fax,status,date,due_date,due_days,subtotal,total,currency,owner_id,owner_name) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run('FAC-001',1,'BERRO','DUBAI','965-99967060','NA','pending','2025-01-15','2025-01-22',7,4500,4500,'KWD',1,'Patron');
  db.prepare("INSERT INTO invoice_rows (invoice_id,pnr,destination,passenger,airline,travel_date,price) VALUES (?,?,?,?,?,?,?)").run(inv1.lastInsertRowid,'UDXAY4','BEY/DXB/BEY','ZAHER DEEB','ME','29/12-31/12/24',1000);
  db.prepare("INSERT INTO invoice_rows (invoice_id,pnr,destination,passenger,airline,travel_date,price) VALUES (?,?,?,?,?,?,?)").run(inv1.lastInsertRowid,'VIQY85','BEY/DXB/BEY','WISSAM ELMAWLA','ME','29/12-31/12/24',2000);
  db.prepare("INSERT INTO invoice_rows (invoice_id,pnr,destination,passenger,airline,travel_date,price) VALUES (?,?,?,?,?,?,?)").run(inv1.lastInsertRowid,'VIW64Z','BEY/DXB','SAAD RAMADAN','ME','29/12/24',1500);

  const inv2 = db.prepare("INSERT INTO invoices (num,client_id,client_name,status,date,due_date,subtotal,total,currency,owner_id,owner_name) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run('FAC-002',2,'Ahmad Mansour','paid','2025-06-01','2025-06-15',1800,1800,'KWD',2,'Employé');
  db.prepare("INSERT INTO invoice_rows (invoice_id,pnr,destination,passenger,airline,travel_date,price) VALUES (?,?,?,?,?,?,?)").run(inv2.lastInsertRowid,'ABC123','BEY/CDG/BEY','AHMAD MANSOUR','AF','15/06-22/06/25',1800);
  db.prepare("INSERT INTO payments (invoice_id,invoice_num,client_name,amount,method,date) VALUES (?,?,?,?,?,?)").run(inv2.lastInsertRowid,'FAC-002','Ahmad Mansour',1800,'Virement','2025-06-03');
}

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'whitesky-secret-2024', resave: false, saveUninitialized: false, cookie: { maxAge: 8*60*60*1000 } }));

function auth(req,res,next){ if(!req.session.user) return res.status(401).json({error:'Non autorisé'}); next(); }
function patron(req,res,next){ if(!req.session.user||req.session.user.role!=='patron') return res.status(403).json({error:'Réservé au patron'}); next(); }

// ── AUTH
app.post('/api/login',(req,res)=>{
  const u=db.prepare('SELECT * FROM users WHERE username=?').get(req.body.username);
  if(!u||!bcrypt.compareSync(req.body.password,u.password)) return res.json({success:false,error:'Identifiants incorrects'});
  req.session.user={id:u.id,username:u.username,role:u.role,display_name:u.display_name};
  res.json({success:true,user:req.session.user});
});
app.post('/api/logout',(req,res)=>{ req.session.destroy(); res.json({success:true}); });
app.get('/api/me',(req,res)=>res.json({user:req.session.user||null}));

// ── SETTINGS
app.get('/api/settings',auth,(req,res)=>{
  const rows=db.prepare('SELECT key,value FROM settings').all();
  const s={}; rows.forEach(r=>s[r.key]=r.value); res.json(s);
});
app.post('/api/settings',patron,(req,res)=>{
  for(const[k,v] of Object.entries(req.body)){
    db.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)').run(k,String(v));
  }
  res.json({success:true});
});

// ── CLIENTS
app.get('/api/clients',auth,(req,res)=>res.json(db.prepare('SELECT * FROM clients ORDER BY name').all()));
app.post('/api/clients',auth,(req,res)=>{
  const {name,email,phone,fax,address,city,tag,notes}=req.body;
  if(!name) return res.status(400).json({error:'Nom requis'});
  const r=db.prepare('INSERT INTO clients (name,email,phone,fax,address,city,tag,notes) VALUES (?,?,?,?,?,?,?,?)').run(name,email||'',phone||'',fax||'',address||'',city||'',tag||'Nouveau',notes||'');
  res.json({id:r.lastInsertRowid,...req.body});
});
app.put('/api/clients/:id',auth,(req,res)=>{
  const {name,email,phone,fax,address,city,tag,notes}=req.body;
  db.prepare('UPDATE clients SET name=?,email=?,phone=?,fax=?,address=?,city=?,tag=?,notes=? WHERE id=?').run(name,email||'',phone||'',fax||'',address||'',city||'',tag||'Nouveau',notes||'',req.params.id);
  res.json({success:true});
});
app.delete('/api/clients/:id',auth,(req,res)=>{ db.prepare('DELETE FROM clients WHERE id=?').run(req.params.id); res.json({success:true}); });

// ── INVOICES
app.get('/api/invoices/next-num',auth,(req,res)=>{
  const last=db.prepare('SELECT num FROM invoices ORDER BY id DESC LIMIT 1').get();
  if(!last) return res.json({num:'FAC-001'});
  const m=last.num.match(/(\d+)$/);
  res.json({num:'FAC-'+String(m?parseInt(m[1])+1:1).padStart(3,'0')});
});
app.get('/api/invoices',auth,(req,res)=>{
  const {from,to,status,search}=req.query;
  let q='SELECT * FROM invoices WHERE 1=1';
  const p=[];
  if(req.session.user.role==='employe'){ q+=' AND (owner_id=? OR client_id IS NOT NULL)'; p.push(req.session.user.id); }
  if(from){ q+=' AND date>=?'; p.push(from); }
  if(to){ q+=' AND date<=?'; p.push(to); }
  if(status){ q+=' AND status=?'; p.push(status); }
  if(search){ q+=' AND (client_name LIKE ? OR num LIKE ?)'; p.push('%'+search+'%','%'+search+'%'); }
  q+=' ORDER BY created_at DESC';
  res.json(db.prepare(q).all(...p));
});
app.get('/api/invoices/:id',auth,(req,res)=>{
  const inv=db.prepare('SELECT * FROM invoices WHERE id=?').get(req.params.id);
  if(!inv) return res.status(404).json({error:'Introuvable'});
  if(req.session.user.role==="employe"&&inv.owner_id!==req.session.user.id&&!inv.client_id) return res.status(403).json({error:"Access denied"});
  const rows=db.prepare('SELECT * FROM invoice_rows WHERE invoice_id=?').all(inv.id);
  res.json({...inv,rows});
});
app.post('/api/invoices',auth,(req,res)=>{
  const {num,client_id,client_name,client_address,client_phone,client_fax,status,date,due_date,due_days,tax,deposit,notes,currency,rows}=req.body;
  const sub=(rows||[]).reduce((a,r)=>a+(parseFloat(r.price)||0),0);
  const taxA=parseFloat(tax)||0, depA=parseFloat(deposit)||0;
  const r=db.prepare('INSERT INTO invoices (num,client_id,client_name,client_address,client_phone,client_fax,status,date,due_date,due_days,subtotal,tax,deposit,total,currency,notes,owner_id,owner_name) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    num,client_id||null,client_name,client_address||'',client_phone||'',client_fax||'',status||'pending',date,due_date,due_days||7,sub,taxA,depA,sub+taxA-depA,currency||'KWD',notes||'',req.session.user.id,req.session.user.display_name);
  const ins=db.prepare('INSERT INTO invoice_rows (invoice_id,pnr,destination,passenger,airline,travel_date,price) VALUES (?,?,?,?,?,?,?)');
  for(const row of(rows||[])) ins.run(r.lastInsertRowid,row.pnr||'',row.destination||'',row.passenger||'',row.airline||'',row.travel_date||'',parseFloat(row.price)||0);
  res.json({id:r.lastInsertRowid,num});
});
app.put('/api/invoices/:id',auth,(req,res)=>{
  const inv=db.prepare('SELECT * FROM invoices WHERE id=?').get(req.params.id);
  if(!inv) return res.status(404).json({error:'Introuvable'});
  if(req.session.user.role==="employe"&&inv.owner_id!==req.session.user.id) return res.status(403).json({error:"Access denied"});
  const {client_name,client_address,client_phone,client_fax,status,date,due_date,due_days,tax,deposit,notes,currency,rows}=req.body;
  const sub=(rows||[]).reduce((a,r)=>a+(parseFloat(r.price)||0),0);
  const taxA=parseFloat(tax)||0, depA=parseFloat(deposit)||0;
  db.prepare('UPDATE invoices SET client_name=?,client_address=?,client_phone=?,client_fax=?,status=?,date=?,due_date=?,due_days=?,subtotal=?,tax=?,deposit=?,total=?,currency=?,notes=? WHERE id=?').run(
    client_name,client_address||'',client_phone||'',client_fax||'',status,date,due_date,due_days||7,sub,taxA,depA,sub+taxA-depA,currency||'KWD',notes||'',req.params.id);
  db.prepare('DELETE FROM invoice_rows WHERE invoice_id=?').run(req.params.id);
  const ins=db.prepare('INSERT INTO invoice_rows (invoice_id,pnr,destination,passenger,airline,travel_date,price) VALUES (?,?,?,?,?,?,?)');
  for(const row of(rows||[])) ins.run(req.params.id,row.pnr||'',row.destination||'',row.passenger||'',row.airline||'',row.travel_date||'',parseFloat(row.price)||0);
  res.json({success:true});
});
app.patch('/api/invoices/:id/status',auth,(req,res)=>{ db.prepare('UPDATE invoices SET status=? WHERE id=?').run(req.body.status,req.params.id); res.json({success:true}); });
app.delete('/api/invoices/:id',auth,(req,res)=>{
  const inv=db.prepare('SELECT * FROM invoices WHERE id=?').get(req.params.id);
  if(!inv) return res.status(404).json({error:'Introuvable'});
  if(req.session.user.role==="employe"&&inv.owner_id!==req.session.user.id) return res.status(403).json({error:"Access denied"});
  db.prepare('DELETE FROM invoice_rows WHERE invoice_id=?').run(req.params.id);
  db.prepare('DELETE FROM invoices WHERE id=?').run(req.params.id);
  res.json({success:true});
});

// ── QUOTES
// ── TICKET SALES
app.get('/api/tickets/next-num',auth,(req,res)=>{
  const last=db.prepare('SELECT num FROM ticket_sales ORDER BY id DESC LIMIT 1').get();
  if(!last) return res.json({num:'TKT-001'});
  const m=last.num.match(/(\d+)$/);
  res.json({num:'TKT-'+String(m?parseInt(m[1])+1:1).padStart(3,'0')});
});
app.get('/api/tickets',auth,(req,res)=>{
  let q='SELECT * FROM ticket_sales WHERE 1=1'; const p=[];
  if(req.session.user.role==='employe'){q+=' AND owner_id=?';p.push(req.session.user.id);}
  q+=' ORDER BY created_at DESC';
  res.json(db.prepare(q).all(...p));
});
app.get('/api/tickets/:id',auth,(req,res)=>{
  const t=db.prepare('SELECT * FROM ticket_sales WHERE id=?').get(req.params.id);
  if(!t) return res.status(404).json({error:'Not found'});
  res.json(t);
});
app.post('/api/tickets',auth,(req,res)=>{
  const {num,airline,pnr,company,destination,passenger,date,system_issue,net_price,selling_price,status,notes}=req.body;
  const r=db.prepare('INSERT INTO ticket_sales (num,airline,pnr,company,destination,passenger,date,system_issue,net_price,selling_price,status,notes,owner_id,owner_name) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    num,airline||'',pnr||'',company||'',destination||'',passenger||'',date||'',system_issue||'',parseFloat(net_price)||0,parseFloat(selling_price)||0,status||'unpaid',notes||'',req.session.user.id,req.session.user.display_name);
  res.json({id:r.lastInsertRowid,num});
});
app.put('/api/tickets/:id',auth,(req,res)=>{
  const {airline,pnr,company,destination,passenger,date,system_issue,net_price,selling_price,status,notes}=req.body;
  db.prepare('UPDATE ticket_sales SET airline=?,pnr=?,company=?,destination=?,passenger=?,date=?,system_issue=?,net_price=?,selling_price=?,status=?,notes=? WHERE id=?').run(
    airline||'',pnr||'',company||'',destination||'',passenger||'',date||'',system_issue||'',parseFloat(net_price)||0,parseFloat(selling_price)||0,status||'unpaid',notes||'',req.params.id);
  res.json({success:true});
});
app.patch('/api/tickets/:id/status',auth,(req,res)=>{
  db.prepare('UPDATE ticket_sales SET status=? WHERE id=?').run(req.body.status,req.params.id);
  res.json({success:true});
});
app.delete('/api/tickets/:id',auth,(req,res)=>{
  db.prepare('DELETE FROM ticket_sales WHERE id=?').run(req.params.id);
  res.json({success:true});
});

// ── PAYMENTS
app.get('/api/payments',auth,(req,res)=>{
  const {from,to}=req.query;
  let q='SELECT * FROM payments WHERE 1=1'; const p=[];
  if(from){q+=' AND date>=?';p.push(from);}
  if(to){q+=' AND date<=?';p.push(to);}
  q+=' ORDER BY created_at DESC';
  res.json(db.prepare(q).all(...p));
});
app.post('/api/payments',auth,(req,res)=>{
  const {invoice_id,invoice_num,client_name,amount,method,reference,date,notes}=req.body;
  const r=db.prepare('INSERT INTO payments (invoice_id,invoice_num,client_name,amount,method,reference,date,notes) VALUES (?,?,?,?,?,?,?,?)').run(invoice_id||null,invoice_num,client_name,parseFloat(amount),method,reference||'',date,notes||'');
  if(invoice_id) db.prepare("UPDATE invoices SET status='paid' WHERE id=?").run(invoice_id);
  res.json({id:r.lastInsertRowid});
});
app.delete('/api/payments/:id',auth,(req,res)=>{ db.prepare('DELETE FROM payments WHERE id=?').run(req.params.id); res.json({success:true}); });

// ── REPORTS
app.get('/api/reports/summary',auth,(req,res)=>{
  const {from,to}=req.query;
  let w=''; const p=[];
  if(from&&to){w='WHERE date>=? AND date<=?';p.push(from,to);}
  else if(from){w='WHERE date>=?';p.push(from);}
  else if(to){w='WHERE date<=?';p.push(to);}
  const inv=db.prepare(`SELECT * FROM invoices ${w}`).all(...p);
  const pays=db.prepare(`SELECT * FROM payments ${w}`).all(...p);
  const byMonth={};
  for(const i of inv){ const m=(i.date||'').slice(0,7); if(m){byMonth[m]=(byMonth[m]||0)+i.total;} }
  const byStatus={paid:0,pending:0,overdue:0,draft:0};
  for(const i of inv) byStatus[i.status]=(byStatus[i.status]||0)+i.total;
  const byClient={};
  for(const i of inv) byClient[i.client_name]=(byClient[i.client_name]||0)+i.total;
  res.json({
    paid:byStatus.paid, pending:byStatus.pending, overdue:byStatus.overdue, draft:byStatus.draft,
    totalPayments:pays.reduce((a,p)=>a+p.amount,0),
    invoiceCount:inv.length,
    clientCount:db.prepare('SELECT COUNT(*) as c FROM clients').get().c,
    byMonth, byClient,
    topClients:Object.entries(byClient).sort((a,b)=>b[1]-a[1]).slice(0,5)
  });
});

// ── USERS
app.get('/api/users',patron,(req,res)=>res.json(db.prepare('SELECT id,username,role,display_name FROM users').all()));
app.post('/api/users',patron,(req,res)=>{
  try{
    const r=db.prepare('INSERT INTO users (username,password,role,display_name) VALUES (?,?,?,?)').run(req.body.username,bcrypt.hashSync(req.body.password,10),req.body.role||'employe',req.body.display_name);
    res.json({id:r.lastInsertRowid});
  }catch(e){res.status(400).json({error:"Nom d'utilisateur déjà pris"});}
});
app.put('/api/users/:id',patron,(req,res)=>{
  const {display_name,role,password}=req.body;
  if(password) db.prepare('UPDATE users SET password=? WHERE id=?').run(bcrypt.hashSync(password,10),req.params.id);
  db.prepare('UPDATE users SET display_name=?,role=? WHERE id=?').run(display_name,role,req.params.id);
  res.json({success:true});
});
app.delete('/api/users/:id',patron,(req,res)=>{
  if(req.params.id==req.session.user.id) return res.status(400).json({error:'Impossible de supprimer votre compte'});
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({success:true});
});

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

app.listen(PORT,'0.0.0.0',()=>{
  console.log(`\n✈  WhiteSky Travel Agency — Système de Facturation`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🌐  Local :   http://localhost:${PORT}`);
  console.log(`🌐  Réseau:   http://[VOTRE-IP]:${PORT}`);
  console.log(`\n👤  patron  → whitesky2024`);
  console.log(`👤  employe → staff2024`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});