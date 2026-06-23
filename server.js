require('dotenv/config');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  host: 'whitesky-db-whiteskyinvoices.l.aivencloud.com',
  port: 15917,
  database: 'defaultdb',
  user: 'avnadmin',
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

function toParams(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function query(sql, params = []) {
  const { rows } = await pool.query(toParams(sql), params);
  return rows;
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function run(sql, params = []) {
  const res = await pool.query(toParams(sql), params);
  return { lastInsertRowid: res.rows[0]?.id, rowCount: res.rowCount };
}

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employe',
      display_name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      fax TEXT,
      address TEXT,
      city TEXT,
      tag TEXT DEFAULT 'Nouveau',
      notes TEXT,
      created_at TEXT DEFAULT (to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'))
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
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
      created_at TEXT DEFAULT (to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'))
    );
    CREATE TABLE IF NOT EXISTS invoice_rows (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER NOT NULL,
      pnr TEXT,
      destination TEXT,
      passenger TEXT,
      airline TEXT,
      "airlineRef" TEXT DEFAULT '',
      travel_date TEXT,
      price REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS ticket_sales (
      id SERIAL PRIMARY KEY,
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
      ticket_type TEXT DEFAULT 'individual',
      client_id INTEGER,
      owner_id INTEGER,
      owner_name TEXT,
      created_at TEXT DEFAULT (to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'))
    );
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER,
      invoice_num TEXT,
      client_name TEXT,
      amount REAL,
      method TEXT,
      reference TEXT,
      date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'))
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

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
    await pool.query('INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING', [k, v]);
  }

  const count = await queryOne('SELECT COUNT(*) as c FROM users');
  if (parseInt(count.c) === 0) {
    await pool.query('INSERT INTO users (username,password,role,display_name) VALUES ($1,$2,$3,$4)',
      ['majd', bcrypt.hashSync('whitesky67758123', 10), 'patron', 'Majd']);
    await pool.query('INSERT INTO users (username,password,role,display_name) VALUES ($1,$2,$3,$4)',
      ['user', bcrypt.hashSync('whitesky00123', 10), 'employe', 'User']);
  }

  console.log('✅  Base de données PostgreSQL prête');
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
    if (path.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
  }
}));
app.use(session({
  secret: process.env.SESSION_SECRET || 'whitesky-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 }
}));

function auth(req, res, next) { if (!req.session.user) return res.status(401).json({ error: 'Non autorisé' }); next(); }
function patron(req, res, next) { if (!req.session.user || req.session.user.role !== 'patron') return res.status(403).json({ error: 'Réservé au patron' }); next(); }

app.post('/api/login', async (req, res) => {
  try {
    const u = await queryOne('SELECT * FROM users WHERE username=?', [req.body.username]);
    if (!u || !bcrypt.compareSync(req.body.password, u.password)) return res.json({ success: false, error: 'Identifiants incorrects' });
    req.session.user = { id: u.id, username: u.username, role: u.role, display_name: u.display_name };
    res.json({ success: true, user: req.session.user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });
app.get('/api/me', (req, res) => res.json({ user: req.session.user || null }));

app.get('/api/settings', auth, async (req, res) => {
  try {
    const rows = await query('SELECT key,value FROM settings');
    const s = {}; rows.forEach(r => s[r.key] = r.value); res.json(s);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/settings', patron, async (req, res) => {
  try {
    for (const [k, v] of Object.entries(req.body)) {
      await pool.query('INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2', [k, String(v)]);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/clients', auth, async (req, res) => {
  try { res.json(await query('SELECT * FROM clients ORDER BY name')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/clients', auth, async (req, res) => {
  try {
    const { name, email, phone, fax, address, city, tag, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Nom requis' });
    const r = await queryOne('INSERT INTO clients (name,email,phone,fax,address,city,tag,notes) VALUES (?,?,?,?,?,?,?,?) RETURNING id',
      [name, email || '', phone || '', fax || '', address || '', city || '', tag || 'Nouveau', notes || '']);
    res.json({ id: r.id, ...req.body });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/clients/:id', auth, async (req, res) => {
  try {
    const { name, email, phone, fax, address, city, tag, notes } = req.body;
    await run('UPDATE clients SET name=?,email=?,phone=?,fax=?,address=?,city=?,tag=?,notes=? WHERE id=?',
      [name, email || '', phone || '', fax || '', address || '', city || '', tag || 'Nouveau', notes || '', req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/clients/:id', auth, async (req, res) => {
  try { await run('DELETE FROM clients WHERE id=?', [req.params.id]); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/invoices/next-num', auth, async (req, res) => {
  try {
    const last = await queryOne('SELECT num FROM invoices ORDER BY id DESC LIMIT 1');
    if (!last) return res.json({ num: 'FAC-001' });
    const m = last.num.match(/(\d+)$/);
    res.json({ num: 'FAC-' + String(m ? parseInt(m[1]) + 1 : 1).padStart(3, '0') });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/invoices', auth, async (req, res) => {
  try {
    const { from, to, status, search } = req.query;
    let q = 'SELECT * FROM invoices WHERE 1=1'; const p = [];
    if (req.session.user.role === 'employe') { q += ' AND (owner_id=? OR client_id IS NOT NULL)'; p.push(req.session.user.id); }
    if (from) { q += ' AND date>=?'; p.push(from); }
    if (to) { q += ' AND date<=?'; p.push(to); }
    if (status) { q += ' AND status=?'; p.push(status); }
    if (search) { q += ' AND (client_name LIKE ? OR num LIKE ?)'; p.push('%' + search + '%', '%' + search + '%'); }
    q += ' ORDER BY created_at DESC';
    res.json(await query(q, p));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/invoices/:id', auth, async (req, res) => {
  try {
    const inv = await queryOne('SELECT * FROM invoices WHERE id=?', [req.params.id]);
    if (!inv) return res.status(404).json({ error: 'Introuvable' });
    if (req.session.user.role === 'employe' && inv.owner_id !== req.session.user.id && !inv.client_id) return res.status(403).json({ error: 'Access denied' });
    const rows = await query('SELECT * FROM invoice_rows WHERE invoice_id=?', [inv.id]);
    res.json({ ...inv, rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/invoices', auth, async (req, res) => {
  try {
    const { num, client_id, client_name, client_address, client_phone, client_fax, status, date, due_date, due_days, tax, deposit, notes, currency, rows } = req.body;
    const sub = (rows || []).reduce((a, r) => a + (parseFloat(r.price) || 0), 0);
    const taxA = parseFloat(tax) || 0, depA = parseFloat(deposit) || 0;
    const r = await queryOne(
      'INSERT INTO invoices (num,client_id,client_name,client_address,client_phone,client_fax,status,date,due_date,due_days,subtotal,tax,deposit,total,currency,notes,owner_id,owner_name) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id',
      [num, client_id || null, client_name, client_address || '', client_phone || '', client_fax || '', status || 'pending', date, due_date, due_days || 7, sub, taxA, depA, sub + taxA - depA, currency || 'KWD', notes || '', req.session.user.id, req.session.user.display_name]);
    for (const row of (rows || [])) {
      await run('INSERT INTO invoice_rows (invoice_id,pnr,destination,passenger,airline,"airlineRef",travel_date,price) VALUES (?,?,?,?,?,?,?,?)',
        [r.id, row.pnr || '', row.destination || '', row.passenger || '', row.airline || '', row.airlineRef || '', row.travel_date || '', parseFloat(row.price) || 0]);
    }
    res.json({ id: r.id, num });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/invoices/:id', auth, async (req, res) => {
  try {
    const inv = await queryOne('SELECT * FROM invoices WHERE id=?', [req.params.id]);
    if (!inv) return res.status(404).json({ error: 'Introuvable' });
    if (req.session.user.role === 'employe' && inv.owner_id !== req.session.user.id && !inv.client_id) return res.status(403).json({ error: 'Access denied' });
    const { client_name, client_address, client_phone, client_fax, status, date, due_date, due_days, tax, deposit, notes, currency, rows } = req.body;
    const sub = (rows || []).reduce((a, r) => a + (parseFloat(r.price) || 0), 0);
    const taxA = parseFloat(tax) || 0, depA = parseFloat(deposit) || 0;
    await run('UPDATE invoices SET client_name=?,client_address=?,client_phone=?,client_fax=?,status=?,date=?,due_date=?,due_days=?,subtotal=?,tax=?,deposit=?,total=?,currency=?,notes=? WHERE id=?',
      [client_name, client_address || '', client_phone || '', client_fax || '', status, date, due_date, due_days || 7, sub, taxA, depA, sub + taxA - depA, currency || 'KWD', notes || '', req.params.id]);
    await run('DELETE FROM invoice_rows WHERE invoice_id=?', [req.params.id]);
    for (const row of (rows || [])) {
      await run('INSERT INTO invoice_rows (invoice_id,pnr,destination,passenger,airline,"airlineRef",travel_date,price) VALUES (?,?,?,?,?,?,?,?)',
        [req.params.id, row.pnr || '', row.destination || '', row.passenger || '', row.airline || '', row.airlineRef || '', row.travel_date || '', parseFloat(row.price) || 0]);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/invoices/:id/status', auth, async (req, res) => {
  try {
    const inv = await queryOne('SELECT * FROM invoices WHERE id=?', [req.params.id]);
    if (!inv) return res.status(404).json({ error: 'Introuvable' });
    if (req.session.user.role === 'employe' && inv.owner_id !== req.session.user.id && !inv.client_id) return res.status(403).json({ error: 'Access denied' });
    await run('UPDATE invoices SET status=? WHERE id=?', [req.body.status, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/invoices/:id', auth, async (req, res) => {
  try {
    const inv = await queryOne('SELECT * FROM invoices WHERE id=?', [req.params.id]);
    if (!inv) return res.status(404).json({ error: 'Introuvable' });
    if (req.session.user.role === 'employe' && inv.owner_id !== req.session.user.id && !inv.client_id) return res.status(403).json({ error: 'Access denied' });
    await run('DELETE FROM invoice_rows WHERE invoice_id=?', [req.params.id]);
    await run('DELETE FROM invoices WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/tickets/next-num', auth, async (req, res) => {
  try {
    const last = await queryOne('SELECT num FROM ticket_sales ORDER BY id DESC LIMIT 1');
    if (!last) return res.json({ num: 'TKT-001' });
    const m = last.num.match(/(\d+)$/);
    res.json({ num: 'TKT-' + String(m ? parseInt(m[1]) + 1 : 1).padStart(3, '0') });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/tickets', auth, async (req, res) => {
  try {
    let q = 'SELECT * FROM ticket_sales WHERE 1=1'; const p = [];
    if (req.session.user.role === 'employe') { q += ' AND owner_id=?'; p.push(req.session.user.id); }
    q += ' ORDER BY created_at DESC';
    res.json(await query(q, p));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/tickets/:id', auth, async (req, res) => {
  try {
    const t = await queryOne('SELECT * FROM ticket_sales WHERE id=?', [req.params.id]);
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json(t);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/tickets', auth, async (req, res) => {
  try {
    const { num, airline, pnr, company, destination, passenger, date, system_issue, net_price, selling_price, status, notes, ticket_type, client_id } = req.body;
    const r = await queryOne(
      'INSERT INTO ticket_sales (num,airline,pnr,company,destination,passenger,date,system_issue,net_price,selling_price,status,notes,ticket_type,client_id,owner_id,owner_name) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id',
      [num, airline || '', pnr || '', company || '', destination || '', passenger || '', date || '', system_issue || '', parseFloat(net_price) || 0, parseFloat(selling_price) || 0, status || 'unpaid', notes || '', ticket_type || 'individual', client_id || null, req.session.user.id, req.session.user.display_name]);
    res.json({ id: r.id, num });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/tickets/:id', auth, async (req, res) => {
  try {
    const { airline, pnr, company, destination, passenger, date, system_issue, net_price, selling_price, status, notes, ticket_type, client_id } = req.body;
    await run('UPDATE ticket_sales SET airline=?,pnr=?,company=?,destination=?,passenger=?,date=?,system_issue=?,net_price=?,selling_price=?,status=?,notes=?,ticket_type=?,client_id=? WHERE id=?',
      [airline || '', pnr || '', company || '', destination || '', passenger || '', date || '', system_issue || '', parseFloat(net_price) || 0, parseFloat(selling_price) || 0, status || 'unpaid', notes || '', ticket_type || 'individual', client_id || null, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/tickets/:id/status', auth, async (req, res) => {
  try {
    await run('UPDATE ticket_sales SET status=? WHERE id=?', [req.body.status, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/tickets/:id', auth, async (req, res) => {
  try { await run('DELETE FROM ticket_sales WHERE id=?', [req.params.id]); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/payments', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    let q = 'SELECT * FROM payments WHERE 1=1'; const p = [];
    if (from) { q += ' AND date>=?'; p.push(from); }
    if (to) { q += ' AND date<=?'; p.push(to); }
    q += ' ORDER BY created_at DESC';
    res.json(await query(q, p));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/payments', auth, async (req, res) => {
  try {
    const { invoice_id, invoice_num, client_name, amount, method, reference, date, notes } = req.body;
    const r = await queryOne(
      'INSERT INTO payments (invoice_id,invoice_num,client_name,amount,method,reference,date,notes) VALUES (?,?,?,?,?,?,?,?) RETURNING id',
      [invoice_id || null, invoice_num, client_name, parseFloat(amount), method, reference || '', date, notes || '']);
    if (invoice_id) await run("UPDATE invoices SET status='paid' WHERE id=?", [invoice_id]);
    res.json({ id: r.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/payments/:id', auth, async (req, res) => {
  try { await run('DELETE FROM payments WHERE id=?', [req.params.id]); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/reports/summary', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    let w = ''; const p = [];
    if (from && to) { w = 'WHERE date>=? AND date<=?'; p.push(from, to); }
    else if (from) { w = 'WHERE date>=?'; p.push(from); }
    else if (to) { w = 'WHERE date<=?'; p.push(to); }
    const inv = await query(`SELECT * FROM invoices ${w}`, p);
    const pays = await query(`SELECT * FROM payments ${w}`, p);
    const byMonth = {};
    for (const i of inv) { const m = (i.date || '').slice(0, 7); if (m) { byMonth[m] = (byMonth[m] || 0) + i.total; } }
    const byStatus = { paid: 0, pending: 0, overdue: 0, draft: 0 };
    for (const i of inv) byStatus[i.status] = (byStatus[i.status] || 0) + i.total;
    const byClient = {};
    for (const i of inv) byClient[i.client_name] = (byClient[i.client_name] || 0) + i.total;
    const countResult = await queryOne('SELECT COUNT(*) as c FROM clients');
    res.json({
      paid: byStatus.paid, pending: byStatus.pending, overdue: byStatus.overdue, draft: byStatus.draft,
      totalPayments: pays.reduce((a, p) => a + p.amount, 0),
      invoiceCount: inv.length,
      clientCount: parseInt(countResult.c),
      byMonth, byClient,
      topClients: Object.entries(byClient).sort((a, b) => b[1] - a[1]).slice(0, 5)
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users', patron, async (req, res) => {
  try { res.json(await query('SELECT id,username,role,display_name FROM users')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/users', patron, async (req, res) => {
  try {
    const r = await queryOne('INSERT INTO users (username,password,role,display_name) VALUES (?,?,?,?) RETURNING id',
      [req.body.username, bcrypt.hashSync(req.body.password, 10), req.body.role || 'employe', req.body.display_name]);
    res.json({ id: r.id });
  } catch (e) { res.status(400).json({ error: "Nom d'utilisateur déjà pris" }); }
});
app.put('/api/users/:id', patron, async (req, res) => {
  try {
    const { display_name, role, password } = req.body;
    if (password) await run('UPDATE users SET password=? WHERE id=?', [bcrypt.hashSync(password, 10), req.params.id]);
    await run('UPDATE users SET display_name=?,role=? WHERE id=?', [display_name, role, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/users/:id', patron, async (req, res) => {
  try {
    if (req.params.id == req.session.user.id) return res.status(400).json({ error: 'Impossible de supprimer votre compte' });
    await run('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✈  WhiteSky Travel Agency — Système de Facturation`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🌐  Local :   http://localhost:${PORT}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  });
}).catch(err => {
  console.error('❌ Erreur connexion base de données:', err.message);
  process.exit(1);
});

