// M&S IA — the dashboard's AI assistant and video maker.
//
// Chat:  Gemini answers questions about the signed-in account's data through read-only
//        tools. Every tool reads through this app's own GET endpoints, called with the
//        user's session cookie, so M&S IA sees exactly what that account already sees —
//        the same owner_id / isolated-tenant rules — and never another account's data.
// Video: Gemini writes the script; this module provides the voice-over (Microsoft Edge
//        TTS, word timings included) and stock footage (Pexels). The browser does the
//        editing (public/js/msia.js), so no server-side video processing is needed.
//
// Needs GEMINI_API_KEY (chat + scripts) and PEXELS_API_KEY (video footage). Both free.

const { randomUUID } = require('crypto');

const GEMINI_MODELS = [process.env.GEMINI_MODEL, 'gemini-flash-latest', 'gemini-3.6-flash', 'gemini-flash-lite-latest'].filter(
  (m, i, all) => m && all.indexOf(m) === i
);
const MAX_TOOL_ROUNDS = 6;
const MAX_HISTORY = 20;

const LANGUAGES = [
  {
    code: 'ar', label: 'العربية — Arabic', rtl: true,
    voices: [
      { id: 'ar-KW-FahedNeural', label: 'Fahed — Kuwaiti, male' },
      { id: 'ar-KW-NouraNeural', label: 'Noura — Kuwaiti, female' },
      { id: 'ar-SA-HamedNeural', label: 'Hamed — Saudi, male' },
      { id: 'ar-SA-ZariyahNeural', label: 'Zariyah — Saudi, female' },
      { id: 'ar-LB-RamiNeural', label: 'Rami — Lebanese, male' },
      { id: 'ar-LB-LaylaNeural', label: 'Layla — Lebanese, female' },
    ],
  },
  {
    code: 'fr', label: 'Français — French', rtl: false,
    voices: [
      { id: 'fr-FR-HenriNeural', label: 'Henri — male' },
      { id: 'fr-FR-DeniseNeural', label: 'Denise — female' },
    ],
  },
  {
    code: 'en', label: 'English', rtl: false,
    voices: [
      { id: 'en-US-GuyNeural', label: 'Guy — US, male' },
      { id: 'en-US-JennyNeural', label: 'Jenny — US, female' },
      { id: 'en-GB-RyanNeural', label: 'Ryan — UK, male' },
    ],
  },
];
const ALL_VOICE_IDS = new Set(LANGUAGES.flatMap((l) => l.voices.map((v) => v.id)));
// First voice of each language is male, second female.
const defaultVoice = (code, gender) => LANGUAGES.find((l) => l.code === code).voices[gender === 'female' ? 1 : 0].id;

/* ─── Data access: this app's own API, as the signed-in user ─── */

// Record types the assistant can search, mapped to the endpoint the UI already uses and the
// date column that "from/to" filters on.
const RECORD_TYPES = {
  invoices: { path: '/api/invoices', date: 'date' },
  quotes: { path: '/api/quotes', date: 'date' },
  clients: { path: '/api/clients', date: 'created_at' },
  payments: { path: '/api/payments', date: 'date' },
  expenses: { path: '/api/expenses', date: 'date' },
  credit_notes: { path: '/api/credit-notes', date: 'date' },
  tickets: { path: '/api/tickets', date: 'date' },
  hotels: { path: '/api/hotels', date: 'checkin_date' },
  visas: { path: '/api/visas', date: 'date' },
  groups: { path: '/api/groups', date: 'departure_date' },
  passports: { path: '/api/passports', date: 'passport_expiry' },
  catalog: { path: '/api/items', date: 'created_at' },
};
const DETAIL_PATHS = {
  invoice: '/api/invoices/',
  quote: '/api/quotes/',
  ticket: '/api/tickets/',
  hotel: '/api/hotels/',
  visa: '/api/visas/',
  group: '/api/groups/',
  passport: '/api/passports/',
  expense: '/api/expenses/',
  credit_note: '/api/credit-notes/',
};
// Never sent to the model: secrets, tokens and uploaded files (scans are large base64 blobs).
const HIDDEN_FIELDS = new Set(['password', 'verify_token', 'verify_url', 'qr_data_url', 'receipt', 'visa_file', 'passport_file', 'company_logo', 'logo', 'owner_id']);
// Branding/config keys worth knowing; everything else in settings stays out of the prompt.
const SETTINGS_ALLOWED = ['company_name', 'company_tagline', 'company_address', 'company_phone_p', 'company_phone_m', 'company_email', 'invoice_currency', 'invoice_due_days'];
const MONEY_FIELDS = ['total', 'amount', 'selling_price', 'net_price', 'paid_amount', 'totalExpected', 'totalCollected'];

function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (HIDDEN_FIELDS.has(k) || v === null || v === '') continue;
      if (typeof v === 'string' && v.length > 400) {
        out[k] = v.startsWith('data:') ? '[file]' : `${v.slice(0, 400)}…`;
        continue;
      }
      out[k] = clean(v);
    }
    return out;
  }
  return value;
}

function makeReader(req, port) {
  return async function read(path) {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      headers: { cookie: req.headers.cookie || '', 'x-forwarded-proto': req.protocol || 'http', accept: 'application/json' },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || `Could not read ${path} (${res.status})`);
    return data;
  };
}

const TOOL_DECLARATIONS = [
  {
    name: 'get_business_overview',
    description:
      'Headline numbers for this account: revenue collected, pending and overdue amounts, invoice and client counts, expenses and net result, revenue by month, top clients, plus upcoming deadlines (passport expiries, visa appointments, invoices coming due in the next 30 days). Optional period filter.',
    parameters: {
      type: 'OBJECT',
      properties: {
        from: { type: 'STRING', description: 'Start date YYYY-MM-DD (optional).' },
        to: { type: 'STRING', description: 'End date YYYY-MM-DD (optional).' },
      },
    },
  },
  {
    name: 'search_records',
    description:
      'Search one type of record and get the total number of matches, money sums per currency over ALL matches, and up to `limit` records. Types: invoices, quotes, clients, payments, expenses, credit_notes, tickets (ticket sales), hotels (hotel bookings), visas, groups (group trips), passports (client passports), catalog (catalog items). Use it for any list, count or "how much" question.',
    parameters: {
      type: 'OBJECT',
      properties: {
        type: { type: 'STRING', enum: Object.keys(RECORD_TYPES) },
        search: { type: 'STRING', description: 'Text to look for in any field: client or passenger name, number, PNR, destination, airline, hotel, country...' },
        status: { type: 'STRING', description: 'Exact status, e.g. paid, pending, partial, overdue, draft, accepted, confirmed, cancelled.' },
        from: { type: 'STRING', description: 'Only records on/after this date (YYYY-MM-DD), using the record\'s main date.' },
        to: { type: 'STRING', description: 'Only records on/before this date (YYYY-MM-DD).' },
        limit: { type: 'INTEGER', description: 'Max records to return (default 25, max 100). Totals always cover every match.' },
      },
      required: ['type'],
    },
  },
  {
    name: 'get_record_details',
    description:
      'Full details of one record by its numeric id (from search_records), e.g. an invoice with its lines (PNR, passenger, airline, travel date, price), or a group trip with its travelers.',
    parameters: {
      type: 'OBJECT',
      properties: {
        kind: { type: 'STRING', enum: Object.keys(DETAIL_PATHS) },
        id: { type: 'INTEGER' },
      },
      required: ['kind', 'id'],
    },
  },
];

async function runTool(name, args, read) {
  if (name === 'get_business_overview') {
    const qs = new URLSearchParams();
    if (args.from) qs.set('from', String(args.from));
    if (args.to) qs.set('to', String(args.to));
    const [summary, upcoming, settings] = await Promise.all([
      read(`/api/reports/summary${qs.toString() ? `?${qs}` : ''}`),
      read('/api/upcoming').catch(() => []),
      read('/api/settings').catch(() => ({})),
    ]);
    const company = {};
    for (const k of SETTINGS_ALLOWED) if (settings[k]) company[k] = settings[k];
    return clean({ company, summary, upcoming });
  }

  if (name === 'search_records') {
    const type = RECORD_TYPES[args.type];
    if (!type) return { error: `Unknown type "${args.type}".` };
    const all = await read(type.path);
    if (!Array.isArray(all)) return { error: 'Unexpected answer from the app.' };
    const search = typeof args.search === 'string' ? args.search.trim().toLowerCase() : '';
    const status = typeof args.status === 'string' ? args.status.trim().toLowerCase() : '';
    const day = (v) => (v ? String(v).slice(0, 10) : '');
    const matches = all.filter((r) => {
      if (status && String(r.status || '').toLowerCase() !== status) return false;
      if (args.from && (!day(r[type.date]) || day(r[type.date]) < args.from)) return false;
      if (args.to && (!day(r[type.date]) || day(r[type.date]) > args.to)) return false;
      if (search) {
        const haystack = Object.entries(r)
          .filter(([k, v]) => !HIDDEN_FIELDS.has(k) && (typeof v === 'string' || typeof v === 'number'))
          .map(([, v]) => String(v).toLowerCase())
          .join(' | ');
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
    const sums = {};
    for (const r of matches) {
      const currency = r.currency || 'default';
      for (const f of MONEY_FIELDS) {
        const n = parseFloat(r[f]);
        if (!Number.isFinite(n)) continue;
        sums[currency] = sums[currency] || {};
        sums[currency][f] = Math.round(((sums[currency][f] || 0) + n) * 1000) / 1000;
      }
    }
    const limit = Math.min(Math.max(Number(args.limit) || 25, 1), 100);
    return clean({ type: args.type, totalMatches: matches.length, totalRecords: all.length, sums, returned: Math.min(limit, matches.length), records: matches.slice(0, limit) });
  }

  if (name === 'get_record_details') {
    const base = DETAIL_PATHS[args.kind];
    const id = parseInt(args.id, 10);
    if (!base || !Number.isFinite(id)) return { error: 'Give a record kind and its numeric id (use search_records to find it).' };
    return clean(await read(`${base}${id}`));
  }

  return { error: `Unknown tool "${name}".` };
}

/* ─── Gemini ─── */

async function callGemini(body, models = GEMINI_MODELS) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, status: 503, error: 'GEMINI_API_KEY is not configured on the server.' };
  const send = (model) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    }).catch(() => null);

  // Free-tier quotas are per model, and "high demand" spikes are brief: retry a 5xx once,
  // then fall through to the next model on 404/429/5xx.
  let last = { ok: false, status: 502, error: 'The AI did not answer.' };
  for (const model of models) {
    let res = await send(model);
    if (res && res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1500));
      res = await send(model);
    }
    if (!res) { last = { ok: false, status: 502, error: 'Could not reach Google Gemini.' }; continue; }
    if (res.status === 404) { last = { ok: false, status: 502, error: `Gemini model "${model}" is not available.` }; continue; }
    if (res.status === 429) { last = { ok: false, status: 429, error: 'The free AI quota is used up for now. Wait a minute (or until tomorrow) and try again.' }; continue; }
    if (res.status >= 500) { last = { ok: false, status: 503, error: 'The AI is overloaded right now. Please try again in a moment.' }; continue; }
    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      return { ok: false, status: 502, error: (detail && detail.error && detail.error.message) || `Gemini error ${res.status}` };
    }
    const data = await res.json();
    const content = data && data.candidates && data.candidates[0] && data.candidates[0].content;
    if (!content || !content.parts || !content.parts.length) {
      const reason = (data.promptFeedback && data.promptFeedback.blockReason) || (data.candidates && data.candidates[0] && data.candidates[0].finishReason);
      return { ok: false, status: 502, error: reason ? `The AI declined to answer (${reason}).` : 'The AI returned an empty answer.' };
    }
    return { ok: true, model, content: { role: 'model', parts: content.parts } };
  }
  return last;
}

const textOf = (content) => content.parts.filter((p) => typeof p.text === 'string' && !p.thought).map((p) => p.text).join('').trim();

const CREATE_VIDEO_DECLARATION = {
  name: 'create_video',
  description:
    'Produce a short social-media video (voice-over, stock footage, animated captions) from a script you write. Call this whenever the user asks for a video, reel, TikTok, short or promo. The video is then generated in the chat.',
  parameters: {
    type: 'OBJECT',
    properties: {
      title: { type: 'STRING', description: 'Short catchy title, in the video language.' },
      script: {
        type: 'STRING',
        description:
          'The exact voice-over text the narrator reads, in the video language. About 70 words for ~30 s (default), 140 for ~60 s, 210 for ~90 s. Strong hook first, useful content, short call to action to contact the agency. Plain spoken sentences only: no emojis, hashtags, headings, lists, stage directions or speaker names.',
      },
      language: { type: 'STRING', enum: ['ar', 'fr', 'en'], description: 'Video language. Default to the language the user writes in.' },
      keywords: {
        type: 'ARRAY',
        items: { type: 'STRING' },
        description: '6 to 8 short ENGLISH stock-footage search terms, concrete and visual, following the script order (e.g. "airplane window", "beach resort", "istanbul mosque", "hotel room", "passport stamp").',
      },
      format: { type: 'STRING', enum: ['portrait', 'landscape', 'square'], description: 'portrait (9:16, default) for TikTok/Reels/Shorts, landscape (16:9) for YouTube, square for Instagram feed.' },
      voice_gender: { type: 'STRING', enum: ['male', 'female'] },
    },
    required: ['title', 'script', 'language', 'keywords'],
  },
};

function systemPrompt(user, companyName) {
  const today = new Date().toISOString().slice(0, 10);
  return `You are "M&S IA", the AI assistant built into the business dashboard of ${companyName || 'this agency'} (invoices, quotes, clients, payments, expenses, credit notes, and for travel agencies: ticket sales, hotel bookings, visas, group trips and client passports). You are talking to ${user.display_name || user.username}. Today is ${today}.

You do two things:
1. Answer questions about this account's business by calling the tools. The tools only return data this account is allowed to see — never suggest you can see other accounts. Never guess or invent numbers, names, dates or statuses; if the tools do not have it, say so. For counts and totals, use totalMatches and sums from the tools, not the length of a truncated list. Always state the currency of amounts.
2. Make short videos for social media with create_video. Write the script yourself: warm, professional, trustworthy and accurate; never invent prices, dates, offers or promises (only use real figures from the tools if the user wants a video based on their data). Do not ask for confirmation first unless the request is really unclear — just make it, then in one or two sentences tell the user the video is being produced below and that they can edit the script or options in the video card.

Always reply in the language the user wrote in (Arabic, French or English). Be concise and practical: lead with the answer, then short bullet points or a small markdown table for lists. You can draft messages (e.g. WhatsApp payment reminders, emails to clients). You can only read data; if asked to change something, explain which page of the dashboard to use.`;
}

function toVideoRequest(args) {
  const script = typeof args.script === 'string' ? args.script.trim() : '';
  if (!script) return null;
  const language = args.language === 'fr' || args.language === 'en' ? args.language : 'ar';
  const format = args.format === 'landscape' || args.format === 'square' ? args.format : 'portrait';
  const keywords = Array.isArray(args.keywords)
    ? args.keywords.filter((k) => typeof k === 'string' && k.trim()).map((k) => k.trim()).slice(0, 10)
    : [];
  return {
    id: randomUUID(),
    title: typeof args.title === 'string' ? args.title.trim().slice(0, 120) : '',
    script: script.slice(0, 3000),
    keywords: keywords.length ? keywords : ['travel', 'airplane', 'beach resort'],
    language,
    format,
    voice: defaultVoice(language, args.voice_gender === 'female' ? 'female' : 'male'),
  };
}

/* ─── Voice (Microsoft Edge TTS) ─── */

// 100-nanosecond ticks → seconds.
const TICKS_PER_SECOND = 10000000;
const escapeXml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function synthesize(text, voice) {
  // Loaded on first use so a missing package can only break the voice-over, never the server.
  const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
  return new Promise(async (resolve, reject) => {
    const tts = new MsEdgeTTS();
    const timer = setTimeout(() => { tts.close(); reject(new Error('The voice service timed out.')); }, 50000);
    const fail = (err) => { clearTimeout(timer); tts.close(); reject(err); };
    try {
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, { wordBoundaryEnabled: true });
      const { audioStream, metadataStream } = tts.toStream(escapeXml(text), { rate: '+0%' });
      const chunks = [];
      const words = [];
      if (metadataStream) {
        metadataStream.on('data', (raw) => {
          try {
            for (const item of JSON.parse(raw.toString()).Metadata || []) {
              if (item.Type !== 'WordBoundary') continue;
              const start = item.Data.Offset / TICKS_PER_SECOND;
              words.push({ text: item.Data.text.Text, start, end: start + item.Data.Duration / TICKS_PER_SECOND });
            }
          } catch { /* a malformed metadata frame only costs one caption word */ }
        });
      }
      audioStream.on('data', (c) => chunks.push(c));
      audioStream.on('error', fail);
      audioStream.on('end', () => {
        clearTimeout(timer);
        tts.close();
        resolve({ audio: Buffer.concat(chunks), words: words.sort((a, b) => a.start - b.start) });
      });
    } catch (err) {
      fail(err);
    }
  });
}

/* ─── Footage (Pexels) ─── */

// The browser renders at ~720p, so the rendition whose short side is closest to 720 looks
// sharp without downloading 4K files.
function pickFile(files) {
  const usable = (files || []).filter(
    (f) => f.file_type === 'video/mp4' && f.width && f.height && Math.min(f.width, f.height) >= 480 && /^https:\/\/videos\.pexels\.com\//.test(f.link)
  );
  usable.sort((a, b) => Math.abs(Math.min(a.width, a.height) - 720) - Math.abs(Math.min(b.width, b.height) - 720));
  return usable[0];
}

/* ─── Routes ─── */

module.exports = function registerMsIa(app, { auth, port }) {
  app.get('/api/msia/status', auth, (req, res) => {
    res.json({
      gemini: Boolean(process.env.GEMINI_API_KEY),
      pexels: Boolean(process.env.PEXELS_API_KEY),
      languages: LANGUAGES,
    });
  });

  app.post('/api/msia/chat', auth, async (req, res) => {
    try {
      const history = Array.isArray(req.body && req.body.messages)
        ? req.body.messages
            .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string' && m.text.trim())
            .slice(-MAX_HISTORY)
        : [];
      if (!history.length || history[history.length - 1].role !== 'user') return res.status(400).json({ error: 'Ask a question first.' });

      const read = makeReader(req, port);
      const settings = await read('/api/settings').catch(() => ({}));
      const contents = history.map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text.slice(0, 4000) }] }));
      const videos = [];
      let models = GEMINI_MODELS;

      for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        const result = await callGemini(
          {
            systemInstruction: { parts: [{ text: systemPrompt(req.session.user, settings.company_name) }] },
            contents,
            // Last round: no tools, so the model has to answer with what it has.
            tools: round < MAX_TOOL_ROUNDS ? [{ functionDeclarations: [...TOOL_DECLARATIONS, CREATE_VIDEO_DECLARATION] }] : undefined,
            generationConfig: { temperature: 0.5 },
          },
          models
        );
        if (!result.ok) return res.status(result.status).json({ error: result.error });
        // Follow-up rounds stay on the same model: its function-call signatures are model-specific.
        models = [result.model];

        const calls = result.content.parts.filter((p) => p.functionCall);
        if (!calls.length) {
          const reply = textOf(result.content);
          return res.json({ reply: reply || (videos.length ? '' : "Sorry, I couldn't find an answer to that."), videos });
        }

        // Echo the model turn back unchanged (it carries thought signatures), then answer every call.
        contents.push(result.content);
        const responses = await Promise.all(
          calls.map(async ({ functionCall }) => {
            const name = functionCall.name;
            const args = functionCall.args || {};
            let output;
            if (name === 'create_video') {
              const video = toVideoRequest(args);
              if (video && videos.length < 3) videos.push(video);
              output = video
                ? { status: 'The video card is now shown in the chat and production has started in the browser.' }
                : { error: 'The script was empty — write the full voice-over text in "script".' };
            } else {
              try {
                output = await runTool(name, args, read);
              } catch (err) {
                output = { error: err.message || 'Tool failed.' };
              }
            }
            return { functionResponse: { name, response: { result: output } } };
          })
        );
        contents.push({ role: 'user', parts: responses });
      }
      res.status(502).json({ error: 'The question needed too many steps. Try asking something more specific.' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/msia/voice', auth, async (req, res) => {
    const text = typeof (req.body && req.body.text) === 'string' ? req.body.text.trim() : '';
    const voice = typeof (req.body && req.body.voice) === 'string' ? req.body.voice : '';
    if (!text) return res.status(400).json({ error: 'The script is empty.' });
    if (text.length > 3000) return res.status(400).json({ error: 'The script is too long (max 3000 characters).' });
    if (!ALL_VOICE_IDS.has(voice)) return res.status(400).json({ error: 'Unknown voice.' });
    try {
      const { audio, words } = await synthesize(text, voice);
      if (!audio.length) throw new Error('The voice service returned no audio.');
      res.json({ audio: audio.toString('base64'), mimeType: 'audio/mpeg', words });
    } catch (err) {
      res.status(502).json({ error: `Voice generation failed: ${err.message}` });
    }
  });

  app.post('/api/msia/footage', auth, async (req, res) => {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'PEXELS_API_KEY is not configured on the server.' });
    const body = req.body || {};
    const keywords = Array.isArray(body.keywords)
      ? body.keywords.filter((k) => typeof k === 'string' && k.trim()).map((k) => k.trim().slice(0, 60)).slice(0, 10)
      : [];
    const orientation = ['portrait', 'landscape', 'square'].includes(body.orientation) ? body.orientation : 'portrait';
    const count = Math.min(Math.max(Number(body.count) || 8, 1), 24);
    if (!keywords.length) return res.status(400).json({ error: 'Add at least one footage keyword.' });

    const perKeyword = await Promise.all(
      keywords.map(async (keyword) => {
        const url = `https://api.pexels.com/videos/search?${new URLSearchParams({ query: keyword, orientation, per_page: '8' })}`;
        const r = await fetch(url, { headers: { Authorization: apiKey } }).catch(() => null);
        if (!r) return { keyword, status: 0, videos: [] };
        if (!r.ok) return { keyword, status: r.status, videos: [] };
        const data = await r.json();
        return { keyword, status: 200, videos: data.videos || [] };
      })
    );
    if (perKeyword.some((r) => r.status === 401 || r.status === 403)) return res.status(502).json({ error: 'The Pexels API key was rejected. Check PEXELS_API_KEY.' });
    if (perKeyword.every((r) => r.status === 429)) return res.status(429).json({ error: 'Pexels rate limit reached. Try again in a little while.' });

    // Round-robin across keywords so the footage follows the script order.
    const seen = new Set();
    const clips = [];
    for (let round = 0; round < 8 && clips.length < count * 2; round++) {
      for (const { keyword, videos } of perKeyword) {
        const video = videos[round];
        if (!video || seen.has(video.id) || video.duration < 3) continue;
        const file = pickFile(video.video_files);
        if (!file) continue;
        seen.add(video.id);
        clips.push({ url: file.link, width: file.width, height: file.height, duration: video.duration, keyword, author: (video.user && video.user.name) || 'Pexels' });
      }
    }
    if (!clips.length) return res.status(404).json({ error: 'No footage found for these keywords. Try simpler English keywords.' });
    res.json({ clips });
  });
};
