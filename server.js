require('dotenv/config');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const { Pool, types } = require('pg');
const { google } = require('googleapis');
const crypto = require('crypto');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');

// The live tables predate some of this schema and were created with real DATE/NUMERIC
// column types (not the TEXT/REAL this file's CREATE TABLE IF NOT EXISTS describes — a
// no-op on tables that already exist). Left alone, pg hands back DATE as a JS Date
// (silently shifting by a day around UTC midnight) and NUMERIC as a string (turning every
// `+ total` into string concatenation instead of a sum). Parsing both as plain values here
// fixes it everywhere at once instead of patching every call site.
types.setTypeParser(1082, val => val); // date -> 'YYYY-MM-DD' string
types.setTypeParser(1700, val => parseFloat(val)); // numeric -> number

const app = express();
app.set('trust proxy', 1); // behind Render's proxy — needed so req.protocol reports https, not http
const PORT = process.env.PORT || 3000;
const SHEET_ID = '1gPYfTzGNpV7B_i2sv87p88EGmAN5uvQB58AsEr4lZWY';

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is not set.');
  process.exit(1);
}
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function toParams(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function cleanDate(d) {
  if (!d) return null;
  return String(d).split('T')[0];
}

// Isolated roles: each owns its own clients/invoices/tickets/payments, fully separated
// from the shared WhiteSky data and from each other (owner_id scoping).
// 'client' = self-registered tenants (see POST /api/signup) — every signup gets its own
// isolated sandbox automatically, no manual account creation needed.
const ISOLATED_ROLES = ['demo', 'cyber', 'client'];
const isIsolated = (role) => ISOLATED_ROLES.includes(role);
// Settings namespace: 'cyber' is a single fixed account so it gets a fixed prefix; 'client'
// covers potentially many self-registered tenants, so each one is namespaced by their own
// user id instead — otherwise every self-registered agency would share one branding.
function settingsPrefix(user) {
  if (!user) return '';
  if (user.role === 'cyber') return 'cyber_';
  if (user.role === 'client') return `client${user.id}_`;
  return '';
}
const NUM_PREFIX = {
  cyber: { inv: 'MSC-', tkt: 'MSC-SVC-', qte: 'MSC-QTE-', cn: 'MSC-CN-', htl: 'MSC-HTL-', visa: 'MSC-VISA-', grp: 'MSC-GRP-' },
  demo: { inv: 'DEMO-', tkt: 'DEMO-TKT-', qte: 'DEMO-QTE-', cn: 'DEMO-CN-', htl: 'DEMO-HTL-', visa: 'DEMO-VISA-', grp: 'DEMO-GRP-' },
  client: { inv: 'INV-', tkt: 'TKT-', qte: 'QTE-', cn: 'CN-', htl: 'HTL-', visa: 'VISA-', grp: 'GRP-' },
};

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
      currency TEXT DEFAULT 'KWD',
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
    CREATE TABLE IF NOT EXISTS hotel_bookings (
      id SERIAL PRIMARY KEY,
      num TEXT UNIQUE NOT NULL,
      hotel_name TEXT,
      confirmation_num TEXT,
      destination TEXT,
      room_type TEXT,
      passenger TEXT,
      checkin_date TEXT,
      checkout_date TEXT,
      currency TEXT DEFAULT 'KWD',
      net_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      status TEXT DEFAULT 'unpaid',
      notes TEXT,
      booking_type TEXT DEFAULT 'individual',
      client_id INTEGER,
      owner_id INTEGER,
      owner_name TEXT,
      created_at TEXT DEFAULT (to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'))
    );
    CREATE TABLE IF NOT EXISTS visas (
      id SERIAL PRIMARY KEY,
      num TEXT UNIQUE NOT NULL,
      visa_type TEXT,
      country TEXT,
      passenger TEXT,
      passport_num TEXT,
      date TEXT,
      appointment_date TEXT,
      currency TEXT DEFAULT 'KWD',
      net_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      status TEXT DEFAULT 'submitted',
      notes TEXT,
      booking_type TEXT DEFAULT 'individual',
      client_id INTEGER,
      owner_id INTEGER,
      owner_name TEXT,
      created_at TEXT DEFAULT (to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'))
    );
    CREATE TABLE IF NOT EXISTS groups_trips (
      id SERIAL PRIMARY KEY,
      num TEXT UNIQUE NOT NULL,
      name TEXT,
      destination TEXT,
      departure_date TEXT,
      return_date TEXT,
      currency TEXT DEFAULT 'KWD',
      status TEXT DEFAULT 'draft',
      notes TEXT,
      owner_id INTEGER,
      owner_name TEXT,
      created_at TEXT DEFAULT (to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'))
    );
    CREATE TABLE IF NOT EXISTS group_travelers (
      id SERIAL PRIMARY KEY,
      group_id INTEGER NOT NULL,
      name TEXT,
      phone TEXT,
      room_no TEXT,
      amount REAL DEFAULT 0,
      paid BOOLEAN DEFAULT false,
      notes TEXT
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
    CREATE TABLE IF NOT EXISTS quotes (
      id SERIAL PRIMARY KEY,
      num TEXT UNIQUE NOT NULL,
      client_id INTEGER,
      client_name TEXT,
      client_address TEXT,
      client_phone TEXT,
      client_fax TEXT,
      status TEXT DEFAULT 'draft',
      date TEXT,
      valid_until TEXT,
      subtotal REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      deposit REAL DEFAULT 0,
      total REAL DEFAULT 0,
      currency TEXT DEFAULT 'KWD',
      notes TEXT,
      owner_id INTEGER,
      owner_name TEXT,
      converted_invoice_id INTEGER,
      created_at TEXT DEFAULT (to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'))
    );
    CREATE TABLE IF NOT EXISTS quote_rows (
      id SERIAL PRIMARY KEY,
      quote_id INTEGER NOT NULL,
      pnr TEXT,
      destination TEXT,
      passenger TEXT,
      airline TEXT,
      "airlineRef" TEXT DEFAULT '',
      travel_date TEXT,
      price REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      price REAL DEFAULT 0,
      currency TEXT DEFAULT 'KWD',
      owner_id INTEGER,
      created_at TEXT DEFAULT (to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'))
    );
    CREATE TABLE IF NOT EXISTS credit_notes (
      id SERIAL PRIMARY KEY,
      num TEXT UNIQUE NOT NULL,
      invoice_id INTEGER,
      invoice_num TEXT,
      client_name TEXT,
      date TEXT,
      reason TEXT,
      amount REAL DEFAULT 0,
      currency TEXT DEFAULT 'KWD',
      owner_id INTEGER,
      owner_name TEXT,
      created_at TEXT DEFAULT (to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'))
    );
  `);
  // Additive migration: lets a 'demo' role own its own clients, fully isolated from real data.
  await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS owner_id INTEGER`);
  // Lets the patron deactivate any account (self-registered clients included) from the
  // new Admin page — a deactivated account is blocked right at login, not mid-session.
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invites (
      code TEXT PRIMARY KEY,
      used BOOLEAN DEFAULT false,
      created_by INTEGER,
      created_at TEXT DEFAULT (to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')),
      used_by INTEGER,
      used_at TEXT
    );
  `);
  // ticket_sales predates the currency column — every ticket was silently saved in whatever
  // the account's default currency is, ignoring the dropdown actually shown in the form.
  await pool.query(`ALTER TABLE ticket_sales ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'KWD'`);
  // The live 'payments' table was created before invoice_num/client_name/amount/date existed
  // in this schema — CREATE TABLE IF NOT EXISTS silently skipped adding them, so every
  // payment ever recorded through the app was failing at the database level.
  await pool.query(`
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_num TEXT;
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS client_name TEXT;
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount REAL DEFAULT 0;
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS date TEXT;
  `);
  // QR-code authenticity check: each invoice gets a random, unguessable token (not the
  // sequential invoice number) so /verify/:token can't be walked to snoop on other clients.
  await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS verify_token TEXT`);
  const untokened = await query('SELECT id FROM invoices WHERE verify_token IS NULL');
  for (const inv of untokened) {
    await run('UPDATE invoices SET verify_token=? WHERE id=?', [crypto.randomBytes(12).toString('hex'), inv.id]);
  }

  const defaultSettings = {
    company_name: 'WHITE SKY TRAVEL AGENCY',
    company_address: 'HAWALLY BLOCK 4 STREET 4',
    company_phone_p: '965-98818699',
    company_phone_m: '965-99967060',
    company_email: 'info@whiteskytravelsagency.com',
    company_logo: '',
    invoice_currency: 'KWD',
    invoice_due_days: '7',
    invoice_footer: 'Please make all checks payable to WHITE SKY TRAVEL AGENCY.\nTotal due in 07 days.\ninfo@whiteskytravelsagency.com | M : 98818699 / 99967060',
  };
  for (const [k, v] of Object.entries(defaultSettings)) {
    await pool.query('INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING', [k, v]);
  }

  // M&S Cyber Systems — Boudy Hajj's own branch, fully isolated data + its own branding namespace.
  const cyberSettings = {
    cyber_company_name: 'M&S Cyber Systems',
    cyber_company_tagline: 'Cybersecurity · Software · Systems',
    cyber_company_address: '',
    cyber_company_phone_p: '',
    cyber_company_phone_m: '',
    cyber_company_email: 'boudytwitch@gmail.com',
    cyber_company_logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIj4KPHBvbHlnb24gcG9pbnRzPSIxMDAsMTAgMTc3LjksNTUgMTc3LjksMTQ1IDEwMCwxOTAgMjIuMSwxNDUgMjIuMSw1NSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMGEzMjU4IiBzdHJva2Utd2lkdGg9IjciLz4KPHBhdGggZD0iTTgwLDk1IHYtMTUgYTIwLDIwIDAgMCAxIDQwLDAgdjE1IiBmaWxsPSJub25lIiBzdHJva2U9IiMwYTMyNTgiIHN0cm9rZS13aWR0aD0iNyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxyZWN0IHg9IjcyIiB5PSI5NSIgd2lkdGg9IjU2IiBoZWlnaHQ9IjQyIiByeD0iNyIgcnk9IjciIGZpbGw9IiMwYTMyNTgiLz4KPGNpcmNsZSBjeD0iMTAwIiBjeT0iMTE0IiByPSI1IiBmaWxsPSIjZmZmIi8+Cjwvc3ZnPgo=',
    cyber_invoice_currency: 'USD',
    cyber_invoice_due_days: '15',
    cyber_invoice_footer: 'Merci pour votre confiance.\nPaiement dû sous 15 jours à réception de la facture.\nboudytwitch@gmail.com',
  };
  for (const [k, v] of Object.entries(cyberSettings)) {
    await pool.query('INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING', [k, v]);
  }

  const count = await queryOne('SELECT COUNT(*) as c FROM users');
  if (parseInt(count.c) === 0) {
    await pool.query('INSERT INTO users (username,password,role,display_name) VALUES ($1,$2,$3,$4)',
      ['majd', bcrypt.hashSync('whitesky67758123', 10), 'patron', 'Majd']);
    await pool.query('INSERT INTO users (username,password,role,display_name) VALUES ($1,$2,$3,$4)',
      ['user', bcrypt.hashSync('whitesky00123', 10), 'employe', 'User']);
  }
  // 'demo' role: fully isolated sandbox account for prospect demos — sees only what it creates itself.
  const demoExists = await queryOne('SELECT id FROM users WHERE username=?', ['test']);
  if (!demoExists) {
    await pool.query('INSERT INTO users (username,password,role,display_name) VALUES ($1,$2,$3,$4)',
      ['test', bcrypt.hashSync('test', 10), 'demo', 'Test Account']);
    console.log('✅  Demo account created — username: test / password: test');
  }
  // 'cyber' role: Boudy Hajj's isolated account for M&S Cyber Systems — own data, own branding.
  const boudyExists = await queryOne('SELECT id FROM users WHERE username=?', ['boudy']);
  if (!boudyExists) {
    await pool.query('INSERT INTO users (username,password,role,display_name) VALUES ($1,$2,$3,$4)',
      ['boudy', bcrypt.hashSync('Boudy12345', 10), 'cyber', 'Boudy Hajj']);
    console.log('✅  M&S Cyber Systems account created — username: boudy / password: Boudy12345');
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
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

async function auth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Non autorisé' });
  try {
    // Checked on every request, not just at login — deactivating someone now cuts off
    // an already-open session immediately instead of waiting for it to expire (30 days).
    const u = await queryOne('SELECT active FROM users WHERE id=?', [req.session.user.id]);
    if (!u || u.active === false) {
      req.session.destroy(() => {});
      return res.status(403).json({ error: 'Your account is not available. Contact +961 71 335 614 on WhatsApp.', deactivated: true });
    }
  } catch (e) { return res.status(500).json({ error: e.message }); }
  next();
}
async function patron(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'patron') return res.status(403).json({ error: 'Réservé au patron' });
  try {
    const u = await queryOne('SELECT active FROM users WHERE id=?', [req.session.user.id]);
    if (!u || u.active === false) {
      req.session.destroy(() => {});
      return res.status(403).json({ error: 'Your account is not available. Contact +961 71 335 614 on WhatsApp.', deactivated: true });
    }
  } catch (e) { return res.status(500).json({ error: e.message }); }
  next();
}

app.post('/api/login', async (req, res) => {
  try {
    const u = await queryOne('SELECT * FROM users WHERE username=?', [req.body.username]);
    if (!u || !bcrypt.compareSync(req.body.password, u.password)) return res.json({ success: false, error: 'Identifiants incorrects' });
    if (u.active === false) return res.json({ success: false, error: 'Your account is not available. Contact +961 71 335 614 on WhatsApp.' });
    req.session.user = { id: u.id, username: u.username, role: u.role, display_name: u.display_name };
    res.json({ success: true, user: req.session.user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });
app.get('/api/me', (req, res) => res.json({ user: req.session.user || null }));

// Self-service signup — anyone with the app/link creates their own account, no manual
// provisioning needed. Each signup becomes its own isolated 'client' tenant (own data,
// own branding), seeded with sane defaults so their invoices aren't blank on day one.
app.post('/api/signup', async (req, res) => {
  try {
    const { username, password, display_name, company_name, client, invite_code } = req.body;
    // Only the desktop app is allowed to self-register — the plain website never shows
    // this option, and this check stops someone from calling the endpoint directly too.
    if (client !== 'desktop') return res.status(403).json({ error: 'Account creation is only available from the desktop app.' });
    // The download link itself is just a public file with no limit — anyone can share it
    // with anyone. The real one-signup-per-person control is this code: the patron hands
    // out one single-use invite code per prospect (separately from the download link), and
    // it's consumed the moment an account is created with it. No valid, unused code = no signup.
    if (!invite_code) return res.status(400).json({ error: 'An invite code is required — ask the person who sent you this app for one.' });
    const invite = await queryOne('SELECT * FROM invites WHERE code=?', [String(invite_code).trim().toUpperCase()]);
    if (!invite) return res.status(400).json({ error: 'Invalid invite code.' });
    if (invite.used) return res.status(400).json({ error: 'This invite code has already been used.' });
    if (!username || !password || !display_name) return res.status(400).json({ error: 'All fields are required' });
    if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const existing = await queryOne('SELECT id FROM users WHERE username=?', [username]);
    if (existing) return res.status(400).json({ error: 'That username is already taken' });

    const r = await queryOne('INSERT INTO users (username,password,role,display_name) VALUES (?,?,?,?) RETURNING id',
      [username, bcrypt.hashSync(password, 10), 'client', display_name]);
    await run('UPDATE invites SET used=true, used_by=?, used_at=? WHERE code=?',
      [r.id, new Date().toISOString(), invite.code]);
    const prefix = `client${r.id}_`;
    const seed = {
      company_name: company_name || display_name,
      invoice_currency: 'KWD',
      invoice_due_days: '7',
      invoice_footer: `Please make all checks payable to ${company_name || display_name}.`,
    };
    for (const [k, v] of Object.entries(seed)) {
      await pool.query('INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING', [prefix + k, v]);
    }
    req.session.user = { id: r.id, username, role: 'client', display_name };
    res.json({ success: true, user: req.session.user });
  } catch (e) {
    if (String(e.message).toLowerCase().includes('duplicate')) return res.status(400).json({ error: 'That username is already taken' });
    res.status(500).json({ error: e.message });
  }
});

const OTHER_PREFIX_RE = /^(cyber_|client\d+_)/;
app.get('/api/settings', auth, async (req, res) => {
  try {
    const prefix = settingsPrefix(req.session.user);
    const rows = await query('SELECT key,value FROM settings');
    const s = {};
    rows.forEach(r => {
      if (prefix) {
        if (r.key.startsWith(prefix)) s[r.key.slice(prefix.length)] = r.value;
      } else if (!OTHER_PREFIX_RE.test(r.key)) {
        s[r.key] = r.value;
      }
    });
    res.json(s);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/settings', auth, async (req, res) => {
  try {
    const role = req.session.user.role;
    if (role !== 'patron' && role !== 'cyber' && role !== 'client') return res.status(403).json({ error: 'Réservé au patron' });
    const prefix = settingsPrefix(req.session.user);
    for (const [k, v] of Object.entries(req.body)) {
      await pool.query('INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2', [prefix + k, String(v)]);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/clients', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      return res.json(await query('SELECT * FROM clients WHERE owner_id=? ORDER BY name', [req.session.user.id]));
    }
    res.json(await query('SELECT * FROM clients ORDER BY name'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/clients', auth, async (req, res) => {
  try {
    const { name, email, phone, fax, address, city, tag, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Nom requis' });
    const ownerId = isIsolated(req.session.user.role) ? req.session.user.id : null;
    const r = await queryOne('INSERT INTO clients (name,email,phone,fax,address,city,tag,notes,owner_id) VALUES (?,?,?,?,?,?,?,?,?) RETURNING id',
      [name, email || '', phone || '', fax || '', address || '', city || '', tag || 'Nouveau', notes || '', ownerId]);
    res.json({ id: r.id, ...req.body });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/clients/:id', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      const c = await queryOne('SELECT owner_id FROM clients WHERE id=?', [req.params.id]);
      if (!c || c.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    }
    const { name, email, phone, fax, address, city, tag, notes } = req.body;
    await run('UPDATE clients SET name=?,email=?,phone=?,fax=?,address=?,city=?,tag=?,notes=? WHERE id=?',
      [name, email || '', phone || '', fax || '', address || '', city || '', tag || 'Nouveau', notes || '', req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/clients/:id', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      const c = await queryOne('SELECT owner_id FROM clients WHERE id=?', [req.params.id]);
      if (!c || c.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    }
    await run('DELETE FROM clients WHERE id=?', [req.params.id]); res.json({ success: true });
  }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/invoices/next-num', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      const prefix = (NUM_PREFIX[req.session.user.role] || NUM_PREFIX.demo).inv;
      const last = await queryOne('SELECT num FROM invoices WHERE owner_id=? ORDER BY id DESC LIMIT 1', [req.session.user.id]);
      if (!last) return res.json({ num: prefix + '001' });
      const m = last.num.match(/(\d+)$/);
      return res.json({ num: prefix + String(m ? parseInt(m[1]) + 1 : 1).padStart(3, '0') });
    }
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
    if (isIsolated(req.session.user.role)) { q += ' AND owner_id=?'; p.push(req.session.user.id); }
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
    if (isIsolated(req.session.user.role) && inv.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    const rows = await query('SELECT * FROM invoice_rows WHERE invoice_id=?', [inv.id]);
    const verifyUrl = `${req.protocol}://${req.get('host')}/verify/${inv.verify_token}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 160, color: { dark: '#0a3258' } });
    res.json({ ...inv, rows, verify_url: verifyUrl, qr_data_url: qrDataUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/invoices', auth, async (req, res) => {
  try {
    const { num, client_id, client_name, client_address, client_phone, client_fax, status, date, due_date, due_days, tax, deposit, notes, currency, rows } = req.body;
    const sub = (rows || []).reduce((a, r) => a + (parseFloat(r.price) || 0), 0);
    const taxA = parseFloat(tax) || 0, depA = parseFloat(deposit) || 0;
    const r = await queryOne(
      'INSERT INTO invoices (num,client_id,client_name,client_address,client_phone,client_fax,status,date,due_date,due_days,subtotal,tax,deposit,total,currency,notes,owner_id,owner_name,verify_token) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id',
      [num, client_id || null, client_name, client_address || '', client_phone || '', client_fax || '', status || 'pending', cleanDate(date), cleanDate(due_date), due_days || 7, sub, taxA, depA, sub + taxA - depA, currency || 'KWD', notes || '', req.session.user.id, req.session.user.display_name, crypto.randomBytes(12).toString('hex')]);
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
    if (isIsolated(req.session.user.role) && inv.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    const { client_name, client_address, client_phone, client_fax, status, date, due_date, due_days, tax, deposit, notes, currency, rows } = req.body;
    const sub = (rows || []).reduce((a, r) => a + (parseFloat(r.price) || 0), 0);
    const taxA = parseFloat(tax) || 0, depA = parseFloat(deposit) || 0;
    await run('UPDATE invoices SET client_name=?,client_address=?,client_phone=?,client_fax=?,status=?,date=?,due_date=?,due_days=?,subtotal=?,tax=?,deposit=?,total=?,currency=?,notes=? WHERE id=?',
      [client_name, client_address || '', client_phone || '', client_fax || '', status, cleanDate(date), cleanDate(due_date), due_days || 7, sub, taxA, depA, sub + taxA - depA, currency || 'KWD', notes || '', req.params.id]);
    await run('DELETE FROM invoice_rows WHERE invoice_id=?', [req.params.id]);
    for (const row of (rows || [])) {
      await run('INSERT INTO invoice_rows (invoice_id,pnr,destination,passenger,airline,"airlineRef",travel_date,price) VALUES (?,?,?,?,?,?,?,?)',
        [req.params.id, row.pnr || '', row.destination || '', row.passenger || '', row.airline || '', row.airlineRef || '', row.travel_date || '', parseFloat(row.price) || 0]);
    }
    // Editing an invoice away from paid/partial must also drop any recorded payment,
    // same as the dedicated status-toggle route, so Payments/totals stay consistent.
    if (status !== 'paid' && status !== 'partial') await run('DELETE FROM payments WHERE invoice_id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/invoices/:id/status', auth, async (req, res) => {
  try {
    const inv = await queryOne('SELECT * FROM invoices WHERE id=?', [req.params.id]);
    if (!inv) return res.status(404).json({ error: 'Introuvable' });
    if (req.session.user.role === 'employe' && inv.owner_id !== req.session.user.id && !inv.client_id) return res.status(403).json({ error: 'Access denied' });
    if (isIsolated(req.session.user.role) && inv.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    await run('UPDATE invoices SET status=? WHERE id=?', [req.body.status, req.params.id]);
    // Leaving 'paid'/'partial' invalidates any recorded payment for this invoice, so the
    // Payments page and totals never show a payment for an invoice that isn't actually
    // marked paid or partially paid (e.g. an explicit "mark unpaid" resets it fully).
    if (req.body.status !== 'paid' && req.body.status !== 'partial') await run('DELETE FROM payments WHERE invoice_id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/invoices/:id', auth, async (req, res) => {
  try {
    const inv = await queryOne('SELECT * FROM invoices WHERE id=?', [req.params.id]);
    if (!inv) return res.status(404).json({ error: 'Introuvable' });
    if (req.session.user.role === 'employe' && inv.owner_id !== req.session.user.id && !inv.client_id) return res.status(403).json({ error: 'Access denied' });
    if (isIsolated(req.session.user.role) && inv.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    await run('DELETE FROM invoice_rows WHERE invoice_id=?', [req.params.id]);
    await run('DELETE FROM invoices WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ─── QUOTES ─── */
app.get('/api/quotes/next-num', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      const prefix = (NUM_PREFIX[req.session.user.role] || NUM_PREFIX.demo).qte;
      const last = await queryOne('SELECT num FROM quotes WHERE owner_id=? ORDER BY id DESC LIMIT 1', [req.session.user.id]);
      if (!last) return res.json({ num: prefix + '001' });
      const m = last.num.match(/(\d+)$/);
      return res.json({ num: prefix + String(m ? parseInt(m[1]) + 1 : 1).padStart(3, '0') });
    }
    const last = await queryOne('SELECT num FROM quotes ORDER BY id DESC LIMIT 1');
    if (!last) return res.json({ num: 'QTE-001' });
    const m = last.num.match(/(\d+)$/);
    res.json({ num: 'QTE-' + String(m ? parseInt(m[1]) + 1 : 1).padStart(3, '0') });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/quotes', auth, async (req, res) => {
  try {
    let q = 'SELECT * FROM quotes WHERE 1=1'; const p = [];
    if (req.session.user.role === 'employe') { q += ' AND (owner_id=? OR client_id IS NOT NULL)'; p.push(req.session.user.id); }
    if (isIsolated(req.session.user.role)) { q += ' AND owner_id=?'; p.push(req.session.user.id); }
    q += ' ORDER BY created_at DESC';
    res.json(await query(q, p));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/quotes/:id', auth, async (req, res) => {
  try {
    const qt = await queryOne('SELECT * FROM quotes WHERE id=?', [req.params.id]);
    if (!qt) return res.status(404).json({ error: 'Introuvable' });
    if (req.session.user.role === 'employe' && qt.owner_id !== req.session.user.id && !qt.client_id) return res.status(403).json({ error: 'Access denied' });
    if (isIsolated(req.session.user.role) && qt.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    const rows = await query('SELECT * FROM quote_rows WHERE quote_id=?', [qt.id]);
    res.json({ ...qt, rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/quotes', auth, async (req, res) => {
  try {
    const { num, client_id, client_name, client_address, client_phone, client_fax, status, date, valid_until, tax, deposit, notes, currency, rows } = req.body;
    const sub = (rows || []).reduce((a, r) => a + (parseFloat(r.price) || 0), 0);
    const taxA = parseFloat(tax) || 0, depA = parseFloat(deposit) || 0;
    const r = await queryOne(
      'INSERT INTO quotes (num,client_id,client_name,client_address,client_phone,client_fax,status,date,valid_until,subtotal,tax,deposit,total,currency,notes,owner_id,owner_name) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id',
      [num, client_id || null, client_name, client_address || '', client_phone || '', client_fax || '', status || 'draft', cleanDate(date), cleanDate(valid_until), sub, taxA, depA, sub + taxA - depA, currency || 'KWD', notes || '', req.session.user.id, req.session.user.display_name]);
    for (const row of (rows || [])) {
      await run('INSERT INTO quote_rows (quote_id,pnr,destination,passenger,airline,"airlineRef",travel_date,price) VALUES (?,?,?,?,?,?,?,?)',
        [r.id, row.pnr || '', row.destination || '', row.passenger || '', row.airline || '', row.airlineRef || '', row.travel_date || '', parseFloat(row.price) || 0]);
    }
    res.json({ id: r.id, num });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/quotes/:id', auth, async (req, res) => {
  try {
    const qt = await queryOne('SELECT * FROM quotes WHERE id=?', [req.params.id]);
    if (!qt) return res.status(404).json({ error: 'Introuvable' });
    if (req.session.user.role === 'employe' && qt.owner_id !== req.session.user.id && !qt.client_id) return res.status(403).json({ error: 'Access denied' });
    if (isIsolated(req.session.user.role) && qt.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    const { client_name, client_address, client_phone, client_fax, status, date, valid_until, tax, deposit, notes, currency, rows } = req.body;
    const sub = (rows || []).reduce((a, r) => a + (parseFloat(r.price) || 0), 0);
    const taxA = parseFloat(tax) || 0, depA = parseFloat(deposit) || 0;
    await run('UPDATE quotes SET client_name=?,client_address=?,client_phone=?,client_fax=?,status=?,date=?,valid_until=?,subtotal=?,tax=?,deposit=?,total=?,currency=?,notes=? WHERE id=?',
      [client_name, client_address || '', client_phone || '', client_fax || '', status, cleanDate(date), cleanDate(valid_until), sub, taxA, depA, sub + taxA - depA, currency || 'KWD', notes || '', req.params.id]);
    await run('DELETE FROM quote_rows WHERE quote_id=?', [req.params.id]);
    for (const row of (rows || [])) {
      await run('INSERT INTO quote_rows (quote_id,pnr,destination,passenger,airline,"airlineRef",travel_date,price) VALUES (?,?,?,?,?,?,?,?)',
        [req.params.id, row.pnr || '', row.destination || '', row.passenger || '', row.airline || '', row.airlineRef || '', row.travel_date || '', parseFloat(row.price) || 0]);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/quotes/:id/status', auth, async (req, res) => {
  try {
    const qt = await queryOne('SELECT * FROM quotes WHERE id=?', [req.params.id]);
    if (!qt) return res.status(404).json({ error: 'Introuvable' });
    if (req.session.user.role === 'employe' && qt.owner_id !== req.session.user.id && !qt.client_id) return res.status(403).json({ error: 'Access denied' });
    if (isIsolated(req.session.user.role) && qt.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    await run('UPDATE quotes SET status=? WHERE id=?', [req.body.status, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/quotes/:id', auth, async (req, res) => {
  try {
    const qt = await queryOne('SELECT * FROM quotes WHERE id=?', [req.params.id]);
    if (!qt) return res.status(404).json({ error: 'Introuvable' });
    if (req.session.user.role === 'employe' && qt.owner_id !== req.session.user.id && !qt.client_id) return res.status(403).json({ error: 'Access denied' });
    if (isIsolated(req.session.user.role) && qt.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    await run('DELETE FROM quote_rows WHERE quote_id=?', [req.params.id]);
    await run('DELETE FROM quotes WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/quotes/:id/convert', auth, async (req, res) => {
  try {
    const qt = await queryOne('SELECT * FROM quotes WHERE id=?', [req.params.id]);
    if (!qt) return res.status(404).json({ error: 'Introuvable' });
    if (isIsolated(req.session.user.role) && qt.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    if (qt.converted_invoice_id) return res.status(400).json({ error: 'Already converted' });
    const rows = await query('SELECT * FROM quote_rows WHERE quote_id=?', [qt.id]);

    const isIso = isIsolated(req.session.user.role);
    let num;
    if (isIso) {
      const prefix = (NUM_PREFIX[req.session.user.role] || NUM_PREFIX.demo).inv;
      const last = await queryOne('SELECT num FROM invoices WHERE owner_id=? ORDER BY id DESC LIMIT 1', [req.session.user.id]);
      const m = last ? last.num.match(/(\d+)$/) : null;
      num = prefix + String(m ? parseInt(m[1]) + 1 : 1).padStart(3, '0');
    } else {
      const last = await queryOne('SELECT num FROM invoices ORDER BY id DESC LIMIT 1');
      const m = last ? last.num.match(/(\d+)$/) : null;
      num = 'FAC-' + String(m ? parseInt(m[1]) + 1 : 1).padStart(3, '0');
    }

    const r = await queryOne(
      'INSERT INTO invoices (num,client_id,client_name,client_address,client_phone,client_fax,status,date,due_date,due_days,subtotal,tax,deposit,total,currency,notes,owner_id,owner_name,verify_token) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id',
      [num, qt.client_id || null, qt.client_name, qt.client_address || '', qt.client_phone || '', qt.client_fax || '', 'pending', cleanDate(new Date().toISOString()), null, 7, qt.subtotal, qt.tax, qt.deposit, qt.total, qt.currency || 'KWD', qt.notes || '', req.session.user.id, req.session.user.display_name, crypto.randomBytes(12).toString('hex')]);
    for (const row of rows) {
      await run('INSERT INTO invoice_rows (invoice_id,pnr,destination,passenger,airline,"airlineRef",travel_date,price) VALUES (?,?,?,?,?,?,?,?)',
        [r.id, row.pnr || '', row.destination || '', row.passenger || '', row.airline || '', row.airlineRef || '', row.travel_date || '', row.price || 0]);
    }
    await run("UPDATE quotes SET status='accepted', converted_invoice_id=? WHERE id=?", [r.id, qt.id]);
    res.json({ id: r.id, num });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ─── ITEM CATALOG (reusable line items) ─── */
app.get('/api/items', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) return res.json(await query('SELECT * FROM items WHERE owner_id=? ORDER BY name', [req.session.user.id]));
    res.json(await query('SELECT * FROM items ORDER BY name'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/items', auth, async (req, res) => {
  try {
    const { name, category, price, currency } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const ownerId = isIsolated(req.session.user.role) ? req.session.user.id : null;
    const r = await queryOne('INSERT INTO items (name,category,price,currency,owner_id) VALUES (?,?,?,?,?) RETURNING id',
      [name, category || '', parseFloat(price) || 0, currency || 'KWD', ownerId]);
    res.json({ id: r.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/items/:id', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      const it = await queryOne('SELECT owner_id FROM items WHERE id=?', [req.params.id]);
      if (!it || it.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    }
    const { name, category, price, currency } = req.body;
    await run('UPDATE items SET name=?,category=?,price=?,currency=? WHERE id=?', [name, category || '', parseFloat(price) || 0, currency || 'KWD', req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/items/:id', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      const it = await queryOne('SELECT owner_id FROM items WHERE id=?', [req.params.id]);
      if (!it || it.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    }
    await run('DELETE FROM items WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ─── CREDIT NOTES ─── */
app.get('/api/credit-notes/next-num', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      const prefix = (NUM_PREFIX[req.session.user.role] || NUM_PREFIX.demo).cn || 'CN-';
      const last = await queryOne('SELECT num FROM credit_notes WHERE owner_id=? ORDER BY id DESC LIMIT 1', [req.session.user.id]);
      if (!last) return res.json({ num: prefix + '001' });
      const m = last.num.match(/(\d+)$/);
      return res.json({ num: prefix + String(m ? parseInt(m[1]) + 1 : 1).padStart(3, '0') });
    }
    const last = await queryOne('SELECT num FROM credit_notes ORDER BY id DESC LIMIT 1');
    if (!last) return res.json({ num: 'CN-001' });
    const m = last.num.match(/(\d+)$/);
    res.json({ num: 'CN-' + String(m ? parseInt(m[1]) + 1 : 1).padStart(3, '0') });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/credit-notes', auth, async (req, res) => {
  try {
    let q = 'SELECT * FROM credit_notes WHERE 1=1'; const p = [];
    if (req.session.user.role === 'employe') { q += ' AND owner_id=?'; p.push(req.session.user.id); }
    if (isIsolated(req.session.user.role)) { q += ' AND owner_id=?'; p.push(req.session.user.id); }
    q += ' ORDER BY created_at DESC';
    res.json(await query(q, p));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/credit-notes/:id', auth, async (req, res) => {
  try {
    const cn = await queryOne('SELECT * FROM credit_notes WHERE id=?', [req.params.id]);
    if (!cn) return res.status(404).json({ error: 'Introuvable' });
    if (isIsolated(req.session.user.role) && cn.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    res.json(cn);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/credit-notes', auth, async (req, res) => {
  try {
    const { num, invoice_id, invoice_num, client_name, date, reason, amount, currency } = req.body;
    if (invoice_id && isIsolated(req.session.user.role)) {
      const inv = await queryOne('SELECT owner_id FROM invoices WHERE id=?', [invoice_id]);
      if (!inv || inv.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    }
    const r = await queryOne(
      'INSERT INTO credit_notes (num,invoice_id,invoice_num,client_name,date,reason,amount,currency,owner_id,owner_name) VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id',
      [num, invoice_id || null, invoice_num || '', client_name, cleanDate(date), reason || '', parseFloat(amount) || 0, currency || 'KWD', req.session.user.id, req.session.user.display_name]);
    if (invoice_id) await run("UPDATE invoices SET status='refunded' WHERE id=?", [invoice_id]);
    res.json({ id: r.id, num });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/credit-notes/:id', auth, async (req, res) => {
  try {
    const cn = await queryOne('SELECT * FROM credit_notes WHERE id=?', [req.params.id]);
    if (!cn) return res.status(404).json({ error: 'Introuvable' });
    if (isIsolated(req.session.user.role) && cn.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    await run('DELETE FROM credit_notes WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/tickets/next-num', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      const prefix = (NUM_PREFIX[req.session.user.role] || NUM_PREFIX.demo).tkt;
      const last = await queryOne('SELECT num FROM ticket_sales WHERE owner_id=? ORDER BY id DESC LIMIT 1', [req.session.user.id]);
      if (!last) return res.json({ num: prefix + '001' });
      const m = last.num.match(/(\d+)$/);
      return res.json({ num: prefix + String(m ? parseInt(m[1]) + 1 : 1).padStart(3, '0') });
    }
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
    if (isIsolated(req.session.user.role)) { q += ' AND owner_id=?'; p.push(req.session.user.id); }
    q += ' ORDER BY created_at DESC';
    res.json(await query(q, p));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/tickets/:id', auth, async (req, res) => {
  try {
    const t = await queryOne('SELECT * FROM ticket_sales WHERE id=?', [req.params.id]);
    if (!t) return res.status(404).json({ error: 'Not found' });
    if (isIsolated(req.session.user.role) && t.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    res.json(t);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/tickets', auth, async (req, res) => {
  try {
    const { num, airline, pnr, company, destination, passenger, date, system_issue, currency, net_price, selling_price, status, notes, ticket_type, client_id } = req.body;
    const r = await queryOne(
      'INSERT INTO ticket_sales (num,airline,pnr,company,destination,passenger,date,system_issue,currency,net_price,selling_price,status,notes,ticket_type,client_id,owner_id,owner_name) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id',
      [num, airline || '', pnr || '', company || '', destination || '', passenger || '', cleanDate(date) || '', system_issue || '', currency || 'KWD', parseFloat(net_price) || 0, parseFloat(selling_price) || 0, status || 'unpaid', notes || '', ticket_type || 'individual', client_id || null, req.session.user.id, req.session.user.display_name]);
    res.json({ id: r.id, num });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/tickets/:id', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      const t = await queryOne('SELECT owner_id FROM ticket_sales WHERE id=?', [req.params.id]);
      if (!t || t.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    }
    const { airline, pnr, company, destination, passenger, date, system_issue, currency, net_price, selling_price, status, notes, ticket_type, client_id } = req.body;
    await run('UPDATE ticket_sales SET airline=?,pnr=?,company=?,destination=?,passenger=?,date=?,system_issue=?,currency=?,net_price=?,selling_price=?,status=?,notes=?,ticket_type=?,client_id=? WHERE id=?',
      [airline || '', pnr || '', company || '', destination || '', passenger || '', cleanDate(date) || '', system_issue || '', currency || 'KWD', parseFloat(net_price) || 0, parseFloat(selling_price) || 0, status || 'unpaid', notes || '', ticket_type || 'individual', client_id || null, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/tickets/:id/status', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      const t = await queryOne('SELECT owner_id FROM ticket_sales WHERE id=?', [req.params.id]);
      if (!t || t.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    }
    await run('UPDATE ticket_sales SET status=? WHERE id=?', [req.body.status, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/tickets/:id', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      const t = await queryOne('SELECT owner_id FROM ticket_sales WHERE id=?', [req.params.id]);
      if (!t || t.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    }
    await run('DELETE FROM ticket_sales WHERE id=?', [req.params.id]); res.json({ success: true });
  }
  catch (e) { res.status(500).json({ error: e.message }); }
});

/* ─── HOTELS ─── */
app.get('/api/hotels/next-num', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      const prefix = (NUM_PREFIX[req.session.user.role] || NUM_PREFIX.demo).htl;
      const last = await queryOne('SELECT num FROM hotel_bookings WHERE owner_id=? ORDER BY id DESC LIMIT 1', [req.session.user.id]);
      if (!last) return res.json({ num: prefix + '001' });
      const m = last.num.match(/(\d+)$/);
      return res.json({ num: prefix + String(m ? parseInt(m[1]) + 1 : 1).padStart(3, '0') });
    }
    const last = await queryOne('SELECT num FROM hotel_bookings ORDER BY id DESC LIMIT 1');
    if (!last) return res.json({ num: 'HTL-001' });
    const m = last.num.match(/(\d+)$/);
    res.json({ num: 'HTL-' + String(m ? parseInt(m[1]) + 1 : 1).padStart(3, '0') });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/hotels', auth, async (req, res) => {
  try {
    let q = 'SELECT * FROM hotel_bookings WHERE 1=1'; const p = [];
    if (req.session.user.role === 'employe') { q += ' AND owner_id=?'; p.push(req.session.user.id); }
    if (isIsolated(req.session.user.role)) { q += ' AND owner_id=?'; p.push(req.session.user.id); }
    q += ' ORDER BY created_at DESC';
    res.json(await query(q, p));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/hotels/:id', auth, async (req, res) => {
  try {
    const h = await queryOne('SELECT * FROM hotel_bookings WHERE id=?', [req.params.id]);
    if (!h) return res.status(404).json({ error: 'Not found' });
    if (isIsolated(req.session.user.role) && h.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    res.json(h);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/hotels', auth, async (req, res) => {
  try {
    const { num, hotel_name, confirmation_num, destination, room_type, passenger, checkin_date, checkout_date, currency, net_price, selling_price, status, notes, booking_type, client_id } = req.body;
    const r = await queryOne(
      'INSERT INTO hotel_bookings (num,hotel_name,confirmation_num,destination,room_type,passenger,checkin_date,checkout_date,currency,net_price,selling_price,status,notes,booking_type,client_id,owner_id,owner_name) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id',
      [num, hotel_name || '', confirmation_num || '', destination || '', room_type || '', passenger || '', cleanDate(checkin_date) || '', cleanDate(checkout_date) || '', currency || 'KWD', parseFloat(net_price) || 0, parseFloat(selling_price) || 0, status || 'unpaid', notes || '', booking_type || 'individual', client_id || null, req.session.user.id, req.session.user.display_name]);
    res.json({ id: r.id, num });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/hotels/:id', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      const h = await queryOne('SELECT owner_id FROM hotel_bookings WHERE id=?', [req.params.id]);
      if (!h || h.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    }
    const { hotel_name, confirmation_num, destination, room_type, passenger, checkin_date, checkout_date, currency, net_price, selling_price, status, notes, booking_type, client_id } = req.body;
    await run('UPDATE hotel_bookings SET hotel_name=?,confirmation_num=?,destination=?,room_type=?,passenger=?,checkin_date=?,checkout_date=?,currency=?,net_price=?,selling_price=?,status=?,notes=?,booking_type=?,client_id=? WHERE id=?',
      [hotel_name || '', confirmation_num || '', destination || '', room_type || '', passenger || '', cleanDate(checkin_date) || '', cleanDate(checkout_date) || '', currency || 'KWD', parseFloat(net_price) || 0, parseFloat(selling_price) || 0, status || 'unpaid', notes || '', booking_type || 'individual', client_id || null, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/hotels/:id/status', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      const h = await queryOne('SELECT owner_id FROM hotel_bookings WHERE id=?', [req.params.id]);
      if (!h || h.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    }
    await run('UPDATE hotel_bookings SET status=? WHERE id=?', [req.body.status, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/hotels/:id', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      const h = await queryOne('SELECT owner_id FROM hotel_bookings WHERE id=?', [req.params.id]);
      if (!h || h.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    }
    await run('DELETE FROM hotel_bookings WHERE id=?', [req.params.id]); res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ─── VISAS ─── */
app.get('/api/visas/next-num', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      const prefix = (NUM_PREFIX[req.session.user.role] || NUM_PREFIX.demo).visa;
      const last = await queryOne('SELECT num FROM visas WHERE owner_id=? ORDER BY id DESC LIMIT 1', [req.session.user.id]);
      if (!last) return res.json({ num: prefix + '001' });
      const m = last.num.match(/(\d+)$/);
      return res.json({ num: prefix + String(m ? parseInt(m[1]) + 1 : 1).padStart(3, '0') });
    }
    const last = await queryOne('SELECT num FROM visas ORDER BY id DESC LIMIT 1');
    if (!last) return res.json({ num: 'VISA-001' });
    const m = last.num.match(/(\d+)$/);
    res.json({ num: 'VISA-' + String(m ? parseInt(m[1]) + 1 : 1).padStart(3, '0') });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/visas', auth, async (req, res) => {
  try {
    let q = 'SELECT * FROM visas WHERE 1=1'; const p = [];
    if (req.session.user.role === 'employe') { q += ' AND owner_id=?'; p.push(req.session.user.id); }
    if (isIsolated(req.session.user.role)) { q += ' AND owner_id=?'; p.push(req.session.user.id); }
    q += ' ORDER BY created_at DESC';
    res.json(await query(q, p));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/visas/:id', auth, async (req, res) => {
  try {
    const v = await queryOne('SELECT * FROM visas WHERE id=?', [req.params.id]);
    if (!v) return res.status(404).json({ error: 'Not found' });
    if (isIsolated(req.session.user.role) && v.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    res.json(v);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/visas', auth, async (req, res) => {
  try {
    const { num, visa_type, country, passenger, passport_num, date, appointment_date, currency, net_price, selling_price, status, notes, booking_type, client_id } = req.body;
    const r = await queryOne(
      'INSERT INTO visas (num,visa_type,country,passenger,passport_num,date,appointment_date,currency,net_price,selling_price,status,notes,booking_type,client_id,owner_id,owner_name) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id',
      [num, visa_type || '', country || '', passenger || '', passport_num || '', cleanDate(date) || '', cleanDate(appointment_date) || '', currency || 'KWD', parseFloat(net_price) || 0, parseFloat(selling_price) || 0, status || 'submitted', notes || '', booking_type || 'individual', client_id || null, req.session.user.id, req.session.user.display_name]);
    res.json({ id: r.id, num });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/visas/:id', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      const v = await queryOne('SELECT owner_id FROM visas WHERE id=?', [req.params.id]);
      if (!v || v.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    }
    const { visa_type, country, passenger, passport_num, date, appointment_date, currency, net_price, selling_price, status, notes, booking_type, client_id } = req.body;
    await run('UPDATE visas SET visa_type=?,country=?,passenger=?,passport_num=?,date=?,appointment_date=?,currency=?,net_price=?,selling_price=?,status=?,notes=?,booking_type=?,client_id=? WHERE id=?',
      [visa_type || '', country || '', passenger || '', passport_num || '', cleanDate(date) || '', cleanDate(appointment_date) || '', currency || 'KWD', parseFloat(net_price) || 0, parseFloat(selling_price) || 0, status || 'submitted', notes || '', booking_type || 'individual', client_id || null, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/visas/:id/status', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      const v = await queryOne('SELECT owner_id FROM visas WHERE id=?', [req.params.id]);
      if (!v || v.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    }
    await run('UPDATE visas SET status=? WHERE id=?', [req.body.status, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/visas/:id', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      const v = await queryOne('SELECT owner_id FROM visas WHERE id=?', [req.params.id]);
      if (!v || v.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    }
    await run('DELETE FROM visas WHERE id=?', [req.params.id]); res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ─── GROUPS ─── */
app.get('/api/groups/next-num', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      const prefix = (NUM_PREFIX[req.session.user.role] || NUM_PREFIX.demo).grp;
      const last = await queryOne('SELECT num FROM groups_trips WHERE owner_id=? ORDER BY id DESC LIMIT 1', [req.session.user.id]);
      if (!last) return res.json({ num: prefix + '001' });
      const m = last.num.match(/(\d+)$/);
      return res.json({ num: prefix + String(m ? parseInt(m[1]) + 1 : 1).padStart(3, '0') });
    }
    const last = await queryOne('SELECT num FROM groups_trips ORDER BY id DESC LIMIT 1');
    if (!last) return res.json({ num: 'GRP-001' });
    const m = last.num.match(/(\d+)$/);
    res.json({ num: 'GRP-' + String(m ? parseInt(m[1]) + 1 : 1).padStart(3, '0') });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/groups', auth, async (req, res) => {
  try {
    let q = 'SELECT * FROM groups_trips WHERE 1=1'; const p = [];
    if (req.session.user.role === 'employe') { q += ' AND owner_id=?'; p.push(req.session.user.id); }
    if (isIsolated(req.session.user.role)) { q += ' AND owner_id=?'; p.push(req.session.user.id); }
    q += ' ORDER BY created_at DESC';
    const groups = await query(q, p);
    for (const g of groups) {
      const travelers = await query('SELECT * FROM group_travelers WHERE group_id=?', [g.id]);
      g.travelerCount = travelers.length;
      g.totalCollected = travelers.reduce((a, t) => a + (t.paid ? (parseFloat(t.amount) || 0) : 0), 0);
      g.totalExpected = travelers.reduce((a, t) => a + (parseFloat(t.amount) || 0), 0);
    }
    res.json(groups);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/groups/:id', auth, async (req, res) => {
  try {
    const g = await queryOne('SELECT * FROM groups_trips WHERE id=?', [req.params.id]);
    if (!g) return res.status(404).json({ error: 'Not found' });
    if (isIsolated(req.session.user.role) && g.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    g.travelers = await query('SELECT * FROM group_travelers WHERE group_id=? ORDER BY id', [req.params.id]);
    res.json(g);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/groups', auth, async (req, res) => {
  try {
    const { num, name, destination, departure_date, return_date, currency, status, notes, travelers } = req.body;
    const r = await queryOne(
      'INSERT INTO groups_trips (num,name,destination,departure_date,return_date,currency,status,notes,owner_id,owner_name) VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id',
      [num, name || '', destination || '', cleanDate(departure_date) || '', cleanDate(return_date) || '', currency || 'KWD', status || 'draft', notes || '', req.session.user.id, req.session.user.display_name]);
    for (const t of (travelers || [])) {
      await run('INSERT INTO group_travelers (group_id,name,phone,room_no,amount,paid,notes) VALUES (?,?,?,?,?,?,?)',
        [r.id, t.name || '', t.phone || '', t.room_no || '', parseFloat(t.amount) || 0, !!t.paid, t.notes || '']);
    }
    res.json({ id: r.id, num });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/groups/:id', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      const g = await queryOne('SELECT owner_id FROM groups_trips WHERE id=?', [req.params.id]);
      if (!g || g.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    }
    const { name, destination, departure_date, return_date, currency, status, notes, travelers } = req.body;
    await run('UPDATE groups_trips SET name=?,destination=?,departure_date=?,return_date=?,currency=?,status=?,notes=? WHERE id=?',
      [name || '', destination || '', cleanDate(departure_date) || '', cleanDate(return_date) || '', currency || 'KWD', status || 'draft', notes || '', req.params.id]);
    await run('DELETE FROM group_travelers WHERE group_id=?', [req.params.id]);
    for (const t of (travelers || [])) {
      await run('INSERT INTO group_travelers (group_id,name,phone,room_no,amount,paid,notes) VALUES (?,?,?,?,?,?,?)',
        [req.params.id, t.name || '', t.phone || '', t.room_no || '', parseFloat(t.amount) || 0, !!t.paid, t.notes || '']);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/groups/:id', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      const g = await queryOne('SELECT owner_id FROM groups_trips WHERE id=?', [req.params.id]);
      if (!g || g.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    }
    await run('DELETE FROM group_travelers WHERE group_id=?', [req.params.id]);
    await run('DELETE FROM groups_trips WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/invoices/:id/payments', auth, async (req, res) => {
  try {
    const inv = await queryOne('SELECT * FROM invoices WHERE id=?', [req.params.id]);
    if (!inv) return res.status(404).json({ error: 'Introuvable' });
    if (isIsolated(req.session.user.role) && inv.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    const rows = await query('SELECT * FROM payments WHERE invoice_id=? ORDER BY created_at ASC', [inv.id]);
    const totalPaid = rows.reduce((a, p) => a + (parseFloat(p.amount) || 0), 0);
    res.json({ payments: rows, totalPaid, balance: Math.max(0, inv.total - totalPaid) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

async function getScopedSettings(user) {
  const prefix = settingsPrefix(user);
  const rows = await query('SELECT key,value FROM settings');
  const s = {};
  rows.forEach(r => {
    if (prefix) { if (r.key.startsWith(prefix)) s[r.key.slice(prefix.length)] = r.value; }
    else if (!OTHER_PREFIX_RE.test(r.key)) s[r.key] = r.value;
  });
  return s;
}

app.post('/api/invoices/:id/send-email', auth, async (req, res) => {
  try {
    const inv = await queryOne('SELECT * FROM invoices WHERE id=?', [req.params.id]);
    if (!inv) return res.status(404).json({ error: 'Introuvable' });
    if (isIsolated(req.session.user.role) && inv.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    const { to, message } = req.body;
    if (!to) return res.status(400).json({ error: 'Recipient email is required' });

    const s = await getScopedSettings(req.session.user);
    if (!s.smtp_host || !s.smtp_user || !s.smtp_pass) {
      return res.status(400).json({ error: 'Email isn\'t set up yet — add your SMTP details in Settings first.' });
    }
    const rows = await query('SELECT * FROM invoice_rows WHERE invoice_id=?', [inv.id]);
    const transporter = nodemailer.createTransport({
      host: s.smtp_host, port: parseInt(s.smtp_port) || 587, secure: parseInt(s.smtp_port) === 465,
      auth: { user: s.smtp_user, pass: s.smtp_pass }
    });

    const rowsHtml = rows.map(r => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${r.pnr || '—'}</td><td style="padding:8px;border-bottom:1px solid #eee">${r.destination || '—'}</td><td style="padding:8px;border-bottom:1px solid #eee">${r.passenger || '—'}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${inv.currency} ${Number(r.price).toFixed(2)}</td></tr>`).join('');
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a2e">
        ${s.company_logo ? `<img src="${s.company_logo}" style="height:56px;margin-bottom:12px"/>` : ''}
        <h2 style="color:#0a3258;margin:0 0 4px">Invoice ${inv.num}</h2>
        <p style="color:#888;font-size:13px;margin:0 0 20px">from ${s.company_name || ''}</p>
        ${message ? `<p style="font-size:14px;line-height:1.6">${String(message).replace(/\n/g, '<br>')}</p>` : ''}
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:16px">
          <thead><tr style="background:#0a3258;color:#fff"><th style="padding:8px;text-align:left">PNR</th><th style="padding:8px;text-align:left">Destination</th><th style="padding:8px;text-align:left">Passenger</th><th style="padding:8px;text-align:right">Price</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div style="text-align:right;font-size:18px;font-weight:700;color:#0a3258;margin-top:14px">Total: ${inv.currency} ${Number(inv.total).toFixed(2)}</div>
        <p style="font-size:12px;color:#aaa;margin-top:24px">Status: ${inv.status.toUpperCase()}</p>
      </div>`;

    await transporter.sendMail({
      from: s.smtp_from || s.smtp_user,
      to, subject: `Invoice ${inv.num} from ${s.company_name || ''}`, html
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Could not send email: ' + e.message }); }
});

app.get('/api/payments', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    if (isIsolated(req.session.user.role)) {
      let conds = ['invoices.owner_id=?']; const p = [req.session.user.id];
      if (from) { conds.push('payments.date>=?'); p.push(from); }
      if (to) { conds.push('payments.date<=?'); p.push(to); }
      return res.json(await query(
        `SELECT payments.* FROM payments JOIN invoices ON invoices.id=payments.invoice_id WHERE ${conds.join(' AND ')} ORDER BY payments.created_at DESC`, p));
    }
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
    if (isIsolated(req.session.user.role) && invoice_id) {
      const inv = await queryOne('SELECT owner_id FROM invoices WHERE id=?', [invoice_id]);
      if (!inv || inv.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
    }
    const r = await queryOne(
      'INSERT INTO payments (invoice_id,invoice_num,client_name,amount,method,reference,date,notes) VALUES (?,?,?,?,?,?,?,?) RETURNING id',
      [invoice_id || null, invoice_num, client_name, parseFloat(amount), method, reference || '', date, notes || '']);
    if (invoice_id) {
      // A payment doesn't have to cover the full balance — e.g. a client paying in two
      // installments. The invoice is only 'paid' once payments on file add up to the total;
      // until then it's 'partial' so Payments/Reports can tell the difference from unpaid.
      const inv = await queryOne('SELECT total FROM invoices WHERE id=?', [invoice_id]);
      const paidRows = await query('SELECT COALESCE(SUM(amount),0) as total_paid FROM payments WHERE invoice_id=?', [invoice_id]);
      const totalPaid = parseFloat(paidRows[0].total_paid) || 0;
      await run('UPDATE invoices SET status=? WHERE id=?', [totalPaid >= inv.total ? 'paid' : 'partial', invoice_id]);
    }
    res.json({ id: r.id, totalPaid: invoice_id ? (await queryOne('SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE invoice_id=?', [invoice_id])).t : null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/payments/:id', auth, async (req, res) => {
  try {
    if (isIsolated(req.session.user.role)) {
      const pay = await queryOne('SELECT invoice_id FROM payments WHERE id=?', [req.params.id]);
      if (pay && pay.invoice_id) {
        const inv = await queryOne('SELECT owner_id FROM invoices WHERE id=?', [pay.invoice_id]);
        if (!inv || inv.owner_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
      }
    }
    await run('DELETE FROM payments WHERE id=?', [req.params.id]); res.json({ success: true });
  }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/reports/summary', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const isIsolatedUser = isIsolated(req.session.user.role);

    let invConds = []; const invP = [];
    if (from) { invConds.push('date>=?'); invP.push(from); }
    if (to) { invConds.push('date<=?'); invP.push(to); }
    if (isIsolatedUser) { invConds.push('owner_id=?'); invP.push(req.session.user.id); }
    const invW = invConds.length ? 'WHERE ' + invConds.join(' AND ') : '';
    const inv = await query(`SELECT * FROM invoices ${invW}`, invP);

    let pays;
    if (isIsolatedUser) {
      let payConds = ['invoices.owner_id=?']; const payP = [req.session.user.id];
      if (from) { payConds.push('payments.date>=?'); payP.push(from); }
      if (to) { payConds.push('payments.date<=?'); payP.push(to); }
      pays = await query(`SELECT payments.* FROM payments JOIN invoices ON invoices.id=payments.invoice_id WHERE ${payConds.join(' AND ')}`, payP);
    } else {
      let payConds = []; const payP = [];
      if (from) { payConds.push('date>=?'); payP.push(from); }
      if (to) { payConds.push('date<=?'); payP.push(to); }
      const payW = payConds.length ? 'WHERE ' + payConds.join(' AND ') : '';
      pays = await query(`SELECT * FROM payments ${payW}`, payP);
    }

    const byMonth = {};
    for (const i of inv) { const m = (i.date || '').slice(0, 7); if (m) { byMonth[m] = (byMonth[m] || 0) + i.total; } }
    const byStatus = { paid: 0, pending: 0, overdue: 0, draft: 0 };
    for (const i of inv) byStatus[i.status] = (byStatus[i.status] || 0) + (parseFloat(i.total)||0);
    const byClient = {};
    for (const i of inv) byClient[i.client_name] = (byClient[i.client_name] || 0) + i.total;
    const countResult = isIsolatedUser
      ? await queryOne('SELECT COUNT(*) as c FROM clients WHERE owner_id=?', [req.session.user.id])
      : await queryOne('SELECT COUNT(*) as c FROM clients');
    res.json({
      paid: byStatus.paid, pending: byStatus.pending, overdue: byStatus.overdue, draft: byStatus.draft,
      totalPayments: pays.reduce((a, p) => a + (parseFloat(p.amount)||0), 0),
      invoiceCount: inv.length,
      clientCount: parseInt(countResult.c),
      byMonth, byClient,
      topClients: Object.entries(byClient).sort((a, b) => b[1] - a[1]).slice(0, 5)
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users', patron, async (req, res) => {
  try { res.json(await query('SELECT id,username,role,display_name,active FROM users ORDER BY id')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/users/:id/active', patron, async (req, res) => {
  try {
    if (req.params.id == req.session.user.id) return res.status(400).json({ error: "You can't deactivate your own account" });
    await run('UPDATE users SET active=? WHERE id=?', [!!req.body.active, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* Invite codes — one single-use code per prospect, generated and handed out (WhatsApp,
   etc.) separately from the download link, so sharing the .exe alone can't mint accounts. */
app.get('/api/invites', patron, async (req, res) => {
  try { res.json(await query('SELECT invites.*, u.display_name as used_by_name FROM invites LEFT JOIN users u ON u.id=invites.used_by ORDER BY invites.created_at DESC')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/invites', patron, async (req, res) => {
  try {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    await run('INSERT INTO invites (code,created_by) VALUES (?,?)', [code, req.session.user.id]);
    res.json({ code });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/invites/:code', patron, async (req, res) => {
  try { await run('DELETE FROM invites WHERE code=? AND used=false', [req.params.code]); res.json({ success: true }); }
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

/* ─── BACKUP GOOGLE SHEETS ─── */
async function backupToSheets() {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
      console.log('⚠️  GOOGLE_SERVICE_ACCOUNT non configuré, backup ignoré');
      return;
    }
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const [clients, invoices, tickets, payments] = await Promise.all([
      pool.query('SELECT * FROM clients ORDER BY id'),
      pool.query('SELECT * FROM invoices ORDER BY id'),
      pool.query('SELECT * FROM ticket_sales ORDER BY id'),
      pool.query('SELECT * FROM payments ORDER BY id')
    ]);

    const now = new Date().toLocaleString('fr-FR');

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'Clients!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          ['ID', 'Nom', 'Email', 'Téléphone', 'Fax', 'Adresse', 'Ville', 'Tag', 'Notes'],
          ...clients.rows.map(r => [r.id, r.name, r.email||'', r.phone||'', r.fax||'', r.address||'', r.city||'', r.tag||'', r.notes||''])
        ]
      }
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'Invoices!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          ['ID', 'Numéro', 'Client', 'Total', 'Devise', 'Statut', 'Date', 'Date Echéance', 'Créé par'],
          ...invoices.rows.map(r => [r.id, r.num, r.client_name, r.total, r.currency||'KWD', r.status, r.date||'', r.due_date||'', r.owner_name||''])
        ]
      }
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'Tickets!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          ['ID', 'Numéro', 'Passager', 'Airline', 'PNR', 'Destination', 'Date', 'Net', 'Vente', 'Profit', 'Statut'],
          ...tickets.rows.map(r => [r.id, r.num, r.passenger||'', r.airline||'', r.pnr||'', r.destination||'', r.date||'', r.net_price, r.selling_price, r.selling_price - r.net_price, r.status])
        ]
      }
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'Payments!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          ['ID', 'Facture', 'Client', 'Montant', 'Méthode', 'Référence', 'Date'],
          ...payments.rows.map(r => [r.id, r.invoice_num||'', r.client_name||'', r.amount, r.method||'', r.reference||'', r.date||''])
        ]
      }
    });

    console.log(`✅ Backup Google Sheets effectué — ${now}`);
  } catch (e) {
    console.error('❌ Backup error:', e.message);
  }
}

function scheduleBackup() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const msUntilMidnight = midnight - now;
  setTimeout(() => {
    backupToSheets();
    setInterval(backupToSheets, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
  console.log(`⏰ Prochain backup dans ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);
}

/* ─── PUBLIC INVOICE VERIFICATION (QR code target — no auth, reachable by anyone with the link) ─── */
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
app.get('/verify/:token', async (req, res) => {
  try {
    const inv = await queryOne('SELECT * FROM invoices WHERE verify_token=?', [req.params.token]);
    const shell = (bodyHtml) => `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Invoice Verification</title><style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Arial,sans-serif;background:#EEF2F8;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;color:#1a1a2e}
      .card{background:#fff;border-radius:16px;box-shadow:0 10px 40px rgba(10,40,70,.12);max-width:420px;width:100%;padding:2rem;text-align:center}
      .icon{width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-size:30px}
      h1{font-size:18px;margin-bottom:.25rem}
      .sub{font-size:13px;color:#888;margin-bottom:1.5rem}
      .row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #f0f3f8;font-size:13.5px;text-align:left}
      .row:last-child{border-bottom:none}
      .row .k{color:#888}
      .row .v{font-weight:700;color:#1a1a2e}
      .foot{margin-top:1.5rem;font-size:11px;color:#bbb}
    </style></head><body><div class="card">${bodyHtml}</div></body></html>`;

    if (!inv) {
      return res.status(404).send(shell(`
        <div class="icon" style="background:#fdecea;color:#b71c1c">✕</div>
        <h1>Not a recognized invoice</h1>
        <div class="sub">This QR code doesn't match any invoice on file. If you received this from someone claiming to represent us, please contact us directly to confirm.</div>
      `));
    }

    const owner = inv.owner_id ? await queryOne('SELECT id,role FROM users WHERE id=?', [inv.owner_id]) : null;
    const prefix = settingsPrefix(owner);
    const settingsRows = await query('SELECT key,value FROM settings');
    const s = {};
    settingsRows.forEach(r => {
      if (prefix) { if (r.key.startsWith(prefix)) s[r.key.slice(prefix.length)] = r.value; }
      else if (!OTHER_PREFIX_RE.test(r.key)) s[r.key] = r.value;
    });
    const companyName = s.company_name || 'WhiteSky Travel Agency';

    res.send(shell(`
      <div class="icon" style="background:#e6f9ee;color:#1a7a3a">✓</div>
      <h1>Authentic invoice</h1>
      <div class="sub">Issued and on file with ${escapeHtml(companyName)}</div>
      <div class="row"><span class="k">Invoice #</span><span class="v">${escapeHtml(inv.num)}</span></div>
      <div class="row"><span class="k">Billed to</span><span class="v">${escapeHtml(inv.client_name)}</span></div>
      <div class="row"><span class="k">Date</span><span class="v">${escapeHtml(inv.date)}</span></div>
      <div class="row"><span class="k">Amount</span><span class="v">${escapeHtml(inv.currency)} ${Number(inv.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
      <div class="row"><span class="k">Status</span><span class="v">${escapeHtml((inv.status || '').toUpperCase())}</span></div>
      <div class="foot">Scanned from the QR code printed on the invoice · ${escapeHtml(companyName)}</div>
    `));
  } catch (e) { res.status(500).send('Verification error'); }
});
// JSON form of the same check, for anything that wants to verify programmatically.
app.get('/api/verify/:token', async (req, res) => {
  try {
    const inv = await queryOne('SELECT num,client_name,date,total,currency,status FROM invoices WHERE verify_token=?', [req.params.token]);
    if (!inv) return res.status(404).json({ authentic: false });
    res.json({ authentic: true, ...inv });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/download', (req, res) => res.sendFile(path.join(__dirname, 'public', 'download.html')));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✈  WhiteSky Travel Agency — Système de Facturation`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🌐  Local :   http://localhost:${PORT}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    scheduleBackup();
  });
}).catch(err => {
  console.error('❌ Erreur connexion base de données:', err.message);
  process.exit(1);
});


