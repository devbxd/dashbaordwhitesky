/* M&S IA — chat assistant + video maker (server side: /msia.js).
   One chat: ask about this account's data, or ask for a video. Videos are edited right
   here in the browser (canvas + MediaRecorder), so they cost nothing to produce. */

const MSIA = {
  messages: [],      // { id, role:'user'|'assistant', text, videoIds?, error? }
  videos: {},        // id -> video state (see msiaNewVideo)
  thinking: false,
  renderingId: null,
  status: null,      // /api/msia/status
};
let _msiaSeq = 0;
const msiaId = () => `msia${Date.now()}${_msiaSeq++}`;

const MSIA_SUGGESTIONS = [
  { icon: 'ti-alert-triangle', label: 'Unpaid invoices', prompt: 'Which invoices are still unpaid or overdue, and how much is outstanding in total?' },
  { icon: 'ti-chart-line', label: 'This month', prompt: 'Give me a quick summary of this month: revenue collected, pending, expenses and net.' },
  { icon: 'ti-alarm', label: 'Coming up', prompt: 'What deadlines are coming up soon (passports, visas, invoices due)?' },
  { icon: 'ti-brand-whatsapp', label: 'Payment reminder', prompt: 'Draft a polite WhatsApp reminder in Arabic for clients with overdue invoices.' },
  { icon: 'ti-movie', label: 'Promo video', prompt: 'Make a 30-second vertical video in Arabic promoting our travel agency.' },
  { icon: 'ti-movie', label: 'Vidéo en français', prompt: 'Fais une vidéo de 30 secondes en français : 5 conseils pour bien préparer ses vacances.' },
];

const MSIA_FORMATS = [
  { id: 'portrait', label: '9:16', hint: 'TikTok · Reels · Shorts', width: 720, height: 1280 },
  { id: 'landscape', label: '16:9', hint: 'YouTube · Facebook', width: 1280, height: 720 },
  { id: 'square', label: '1:1', hint: 'Instagram feed', width: 960, height: 960 },
];

function msiaEsc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function msiaPost(url, body, signal) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  const data = await r.json().catch(() => ({}));
  if (data && data.deactivated && typeof forceLogout === 'function') forceLogout(data.error);
  if (!r.ok) throw new Error((data && data.error) || `Request failed (${r.status})`);
  return data;
}

/* ─── Markdown (subset): escaped first, so model output can never inject HTML ─── */

function msiaInline(text) {
  return msiaEsc(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}
function msiaMarkdown(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  const cells = (row) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.trim().startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++]);
      const [head, ...rest] = rows;
      const body = rest.filter((r) => !/^\s*\|?\s*:?-{2,}/.test(r));
      out.push(`<div class="msia-table"><table><thead><tr>${cells(head).map((c) => `<th>${msiaInline(c)}</th>`).join('')}</tr></thead><tbody>${body
        .map((r) => `<tr>${cells(r).map((c) => `<td>${msiaInline(c)}</td>`).join('')}</tr>`)
        .join('')}</tbody></table></div>`);
      continue;
    }
    const bullet = /^\s*[-*•]\s+/;
    const numbered = /^\s*\d+[.)]\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const re = ordered ? numbered : bullet;
      const items = [];
      while (i < lines.length && re.test(lines[i])) items.push(lines[i++].replace(re, ''));
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.map((it) => `<li>${msiaInline(it)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }
    const heading = /^\s*#{1,6}\s+/;
    if (heading.test(line)) { out.push(`<p class="msia-h">${msiaInline(line.replace(heading, ''))}</p>`); i++; continue; }
    const para = [];
    // The first line is always taken, so an unrecognised line can never stall the loop.
    while (i < lines.length && lines[i].trim() && (!para.length || !/^\s*(\||[-*•]\s|\d+[.)]\s|#{1,6}\s)/.test(lines[i]))) para.push(lines[i++]);
    out.push(`<p>${para.map(msiaInline).join('<br>')}</p>`);
  }
  return out.join('');
}

/* ─── Page ─── */

async function pageMsIa(mc) {
  if (!MSIA.status) {
    try { MSIA.status = await api('GET', '/api/msia/status'); } catch (e) { MSIA.status = null; }
  }
  const st = MSIA.status || { gemini: false, pexels: false, languages: [] };
  mc.innerHTML = `
<div class="msia-wrap">
  <div class="msia-head">
    <div class="msia-head-id">
      <div class="msia-logo"><i class="ti ti-sparkles"></i></div>
      <div><div class="page-title">M&amp;S IA</div><div class="page-sub">Ask about your business, or ask for a video.</div></div>
    </div>
    <button class="btn-secondary msia-new ${MSIA.messages.length ? '' : 'hidden'}" id="msia-new" onclick="msiaNewChat()"><i class="ti ti-edit"></i> New chat</button>
  </div>
  ${!st.gemini ? `<div class="info-box msia-warn"><i class="ti ti-alert-triangle"></i> Setup needed: add the free <b>GEMINI_API_KEY</b>${!st.pexels ? ' and <b>PEXELS_API_KEY</b>' : ''} to the server environment, then redeploy.</div>` : ''}
  <div class="msia-scroll" id="msia-scroll"><div class="msia-thread" id="msia-thread"></div></div>
  <form class="msia-composer" id="msia-form">
    <div class="msia-input-row">
      <textarea id="msia-input" rows="1" dir="auto" placeholder="${st.gemini ? 'Ask a question or describe the video you want…' : 'M&S IA needs a Gemini key to work'}" ${st.gemini ? '' : 'disabled'}></textarea>
      <button type="submit" class="msia-send" id="msia-send" aria-label="Send" disabled><i class="ti ti-arrow-up"></i></button>
    </div>
    <div class="msia-foot">M&amp;S IA only sees this account's data and never changes it. Check important answers before acting on them.</div>
  </form>
</div>`;
  const input = document.getElementById('msia-input');
  const send = document.getElementById('msia-send');
  const grow = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 160) + 'px'; send.disabled = !input.value.trim() || MSIA.thinking || !st.gemini; };
  input.addEventListener('input', grow);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); msiaSend(input.value); }
  });
  document.getElementById('msia-form').addEventListener('submit', (e) => { e.preventDefault(); msiaSend(input.value); });
  msiaRenderThread();
}

function msiaNewChat() {
  if (MSIA.thinking || MSIA.renderingId) return;
  Object.values(MSIA.videos).forEach((v) => v.result && URL.revokeObjectURL(v.result.url));
  MSIA.messages = [];
  MSIA.videos = {};
  msiaRenderThread();
}

function msiaRenderThread() {
  const thread = document.getElementById('msia-thread');
  if (!thread) return;
  document.getElementById('msia-new')?.classList.toggle('hidden', !MSIA.messages.length);
  const st = MSIA.status || {};
  if (!MSIA.messages.length) {
    thread.innerHTML = `
<div class="msia-empty">
  <div class="msia-empty-logo"><i class="ti ti-sparkles"></i></div>
  <h2>Hello${currentUser && currentUser.display_name ? ', ' + msiaEsc(currentUser.display_name.split(' ')[0]) : ''} 👋</h2>
  <p>I know your invoices, clients, payments and bookings — and I can make ready-to-post videos with voice-over and captions, in Arabic, French or English.</p>
  <div class="msia-suggestions">${MSIA_SUGGESTIONS.map((s, i) => `
    <button type="button" class="msia-sugg" onclick="msiaSend(MSIA_SUGGESTIONS[${i}].prompt)" ${st.gemini ? '' : 'disabled'}>
      <span class="msia-sugg-icon"><i class="ti ${s.icon}"></i></span>
      <span><b>${msiaEsc(s.label)}</b><small dir="auto">${msiaEsc(s.prompt)}</small></span>
    </button>`).join('')}</div>
</div>`;
    return;
  }
  thread.innerHTML = MSIA.messages.map((m) => {
    if (m.role === 'user') return `<div class="msia-row msia-row-user"><div class="msia-bubble" dir="auto">${msiaEsc(m.text)}</div></div>`;
    const body = m.error
      ? `<div class="msia-error"><i class="ti ti-alert-triangle"></i> ${msiaEsc(m.text)}</div>`
      : (m.text ? `<div class="msia-md" dir="auto">${msiaMarkdown(m.text)}</div>` : '');
    return `<div class="msia-row"><div class="msia-avatar"><i class="ti ti-sparkles"></i></div><div class="msia-answer">${body}${(m.videoIds || []).map((id) => `<div class="msia-video" id="msia-v-${id}"></div>`).join('')}</div></div>`;
  }).join('') + (MSIA.thinking ? `<div class="msia-row"><div class="msia-avatar"><i class="ti ti-sparkles"></i></div><div class="msia-typing"><span></span><span></span><span></span></div></div>` : '');
  MSIA.messages.forEach((m) => (m.videoIds || []).forEach((id) => msiaRenderVideo(id)));
  const sc = document.getElementById('msia-scroll');
  if (sc) sc.scrollTop = sc.scrollHeight;
}

// What the model sees of earlier turns: video cards are summarised so "make it shorter" or
// "now in French" have the script to work from.
function msiaHistoryText(m) {
  if (!m.videoIds || !m.videoIds.length) return m.text;
  const notes = m.videoIds.map((id) => {
    const v = MSIA.videos[id];
    return v ? `[Video created — title: "${v.title}", language: ${v.language}, format: ${v.format}. Script: ${v.script}]` : '';
  });
  return [m.text, ...notes].filter(Boolean).join('\n');
}

async function msiaSend(text) {
  const q = String(text || '').trim();
  if (!q || MSIA.thinking || !(MSIA.status && MSIA.status.gemini)) return;
  MSIA.messages.push({ id: msiaId(), role: 'user', text: q });
  MSIA.thinking = true;
  const input = document.getElementById('msia-input');
  if (input) { input.value = ''; input.style.height = 'auto'; }
  const sendBtn = document.getElementById('msia-send');
  if (sendBtn) sendBtn.disabled = true;
  msiaRenderThread();
  try {
    const data = await msiaPost('/api/msia/chat', {
      messages: MSIA.messages.filter((m) => !m.error).map((m) => ({ role: m.role, text: msiaHistoryText(m) })),
    });
    const videoIds = (data.videos || []).map((req) => {
      MSIA.videos[req.id] = msiaNewVideo(req);
      return req.id;
    });
    MSIA.messages.push({ id: msiaId(), role: 'assistant', text: data.reply || '', videoIds });
    // Only the newest video starts on its own, and only if nothing else is being edited.
    if (videoIds.length && !MSIA.renderingId) setTimeout(() => msiaCreate(videoIds[0]), 0);
  } catch (e) {
    MSIA.messages.push({ id: msiaId(), role: 'assistant', text: e.message || 'Something went wrong.', error: true });
  } finally {
    MSIA.thinking = false;
    msiaRenderThread();
    document.getElementById('msia-input')?.focus();
  }
}

/* ─── Video cards ─── */

function msiaBrand() {
  return (document.querySelector('.brand-name')?.textContent || '').trim().slice(0, 40);
}

function msiaNewVideo(req) {
  return {
    ...req,
    brand: msiaBrand(),
    captions: true,
    music: null,
    musicVolume: 0.15,
    phase: 'idle', // idle | working | done
    steps: { voice: 'pending', footage: 'pending', render: 'pending' },
    progress: 0,
    error: null,
    result: null,
    showOptions: false,
    canvas: null,
    abort: null,
  };
}

function msiaLang(code) {
  const langs = (MSIA.status && MSIA.status.languages) || [];
  return langs.find((l) => l.code === code) || langs[0] || { code: 'ar', label: 'Arabic', rtl: true, voices: [] };
}

function msiaRenderVideo(id) {
  const el = document.getElementById(`msia-v-${id}`);
  const v = MSIA.videos[id];
  if (!el || !v) return;
  const fmtInfo = MSIA_FORMATS.find((f) => f.id === v.format) || MSIA_FORMATS[0];
  const lang = msiaLang(v.language);
  const supported = !!msiaPickMime();
  const pexels = MSIA.status && MSIA.status.pexels;
  const locked = MSIA.renderingId && MSIA.renderingId !== id;
  const canCreate = pexels && supported && v.phase !== 'working' && !locked && v.script.trim() && v.keywords.length;
  const working = v.phase === 'working';
  const overall = Math.round((((v.steps.voice === 'done' ? 1 : 0) + (v.steps.footage === 'done' ? 1 : v.steps.footage === 'active' ? v.progress : 0) + (v.steps.render === 'active' ? v.progress : 0)) / 3) * 100);
  const stepRow = (key, label, icon) => {
    const s = v.steps[key];
    return `<div class="msia-step ${s}"><span>${s === 'done' ? '<i class="ti ti-check"></i>' : s === 'active' ? '<i class="ti ti-loader-2 spin"></i>' : `<i class="ti ${icon}"></i>`}</span>${label}</div>`;
  };

  el.innerHTML = `
<div class="msia-card">
  <div class="msia-card-head"><i class="ti ti-movie"></i><b dir="auto">${msiaEsc(v.title || 'Video')}</b><span>${fmtInfo.label} · ${msiaEsc(lang.label.split(' — ').pop())}</span></div>
  <div class="msia-card-body ${v.format === 'portrait' ? 'portrait' : ''}">
    <div class="msia-preview" style="aspect-ratio:${fmtInfo.width}/${fmtInfo.height}" id="msia-prev-${id}"></div>
    <div class="msia-card-side">
      ${working ? `
        ${stepRow('voice', 'Voice-over', 'ti-microphone')}${stepRow('footage', 'Footage', 'ti-video')}${stepRow('render', 'Editing', 'ti-movie')}
        <div class="msia-bar"><div style="width:${overall}%"></div></div>
        <div class="msia-note">Editing happens live in this tab — keep it open until it finishes.</div>
        <button type="button" class="btn-secondary msia-sm" onclick="msiaCancel('${id}')">Cancel</button>`
      : `<div class="msia-script" dir="auto">${msiaEsc(v.script)}</div>
        ${v.error ? `<div class="msia-error"><i class="ti ti-alert-triangle"></i> ${msiaEsc(v.error)}</div>` : ''}
        ${!pexels ? '<div class="msia-note warn">PEXELS_API_KEY is not configured on the server, so videos can\'t be created yet.</div>' : ''}
        ${!supported ? '<div class="msia-note warn">This browser can\'t record video — use Chrome or Edge on a computer.</div>' : ''}
        <div class="msia-actions">
          ${v.result
            ? `<a class="btn-new msia-sm" href="${v.result.url}" download="${msiaEsc(msiaFileName(v.title, v.result.extension))}"><i class="ti ti-download"></i> Download ${v.result.extension.toUpperCase()} · ${v.result.sizeMb} MB</a>
               <button type="button" class="btn-secondary msia-sm" onclick="msiaCreate('${id}')" ${canCreate ? '' : 'disabled'}><i class="ti ti-refresh"></i> New footage</button>`
            : `<button type="button" class="btn-new msia-sm" onclick="msiaCreate('${id}')" ${canCreate ? '' : 'disabled'}><i class="ti ti-movie"></i> ${v.error ? 'Try again' : 'Create video'}</button>`}
          <button type="button" class="btn-secondary msia-sm" onclick="msiaToggleOptions('${id}')"><i class="ti ti-adjustments"></i> Edit script &amp; options</button>
        </div>
        ${v.result ? `<div class="msia-note">Footage: ${msiaEsc(v.result.credits.join(', '))} via Pexels (free for commercial use).</div>` : ''}
        ${locked && !v.result ? '<div class="msia-note">Another video is being edited — this one can start when it finishes.</div>' : ''}`}
    </div>
  </div>
  ${v.showOptions && !working ? msiaOptionsHtml(id, v, lang) : ''}
</div>`;

  const prev = document.getElementById(`msia-prev-${id}`);
  if (working && v.canvas) {
    prev.appendChild(v.canvas);
  } else if (v.result) {
    const video = document.createElement('video');
    video.src = v.result.url;
    video.controls = true;
    video.playsInline = true;
    // The video opens with a fade from black; show a real frame as the thumbnail instead.
    video.addEventListener('loadeddata', () => { if (video.currentTime === 0) video.currentTime = 0.8; }, { once: true });
    prev.appendChild(video);
  } else {
    prev.innerHTML = `<div class="msia-prev-empty"><i class="ti ti-movie"></i><span>${v.error ? 'Not created' : 'Ready to create'}</span></div>`;
  }
}

function msiaOptionsHtml(id, v, lang) {
  const langs = (MSIA.status && MSIA.status.languages) || [];
  return `
<div class="msia-options">
  <label>Title (file name)<input class="form-input" dir="auto" value="${msiaEsc(v.title)}" oninput="MSIA.videos['${id}'].title=this.value"></label>
  <label>Voice-over text — the narrator reads exactly this<textarea class="form-input" rows="6" dir="auto" oninput="MSIA.videos['${id}'].script=this.value">${msiaEsc(v.script)}</textarea></label>
  <div class="msia-opt-label">Footage keywords (English works best)</div>
  <div class="msia-chips">${v.keywords.map((k, i) => `<span class="msia-chip">${msiaEsc(k)}<button type="button" onclick="msiaRemoveKeyword('${id}',${i})" aria-label="Remove"><i class="ti ti-x"></i></button></span>`).join('')}
    <input class="msia-chip-input" placeholder="add keyword + Enter" onkeydown="if(event.key==='Enter'){event.preventDefault();msiaAddKeyword('${id}',this.value)}"></div>
  <div class="msia-grid2">
    <label>Language<select class="form-input" onchange="msiaSetLanguage('${id}',this.value)">${langs.map((l) => `<option value="${l.code}" ${l.code === v.language ? 'selected' : ''}>${msiaEsc(l.label)}</option>`).join('')}</select></label>
    <label>Narrator voice<select class="form-input" onchange="MSIA.videos['${id}'].voice=this.value">${lang.voices.map((vo) => `<option value="${vo.id}" ${vo.id === v.voice ? 'selected' : ''}>${msiaEsc(vo.label)}</option>`).join('')}</select></label>
  </div>
  <div class="msia-opt-label">Format</div>
  <div class="msia-formats">${MSIA_FORMATS.map((f) => `<button type="button" class="${f.id === v.format ? 'on' : ''}" onclick="msiaSetFormat('${id}','${f.id}')"><b>${f.label}</b><small>${f.hint}</small></button>`).join('')}</div>
  <div class="msia-grid2">
    <label>Brand name on the video (empty = hidden)<input class="form-input" maxlength="40" value="${msiaEsc(v.brand)}" oninput="MSIA.videos['${id}'].brand=this.value"></label>
    <label class="msia-check"><input type="checkbox" ${v.captions ? 'checked' : ''} onchange="MSIA.videos['${id}'].captions=this.checked"> Animated captions</label>
  </div>
  <div class="msia-music">
    <i class="ti ti-music"></i>
    <div><b>${v.music ? msiaEsc(v.music.name) : 'Background music (optional)'}</b><small>MP3/WAV you have the rights to.</small></div>
    ${v.music ? `<input type="range" min="0.05" max="0.5" step="0.05" value="${v.musicVolume}" oninput="MSIA.videos['${id}'].musicVolume=Number(this.value)" aria-label="Music volume">` : ''}
    <label class="btn-secondary msia-sm">${v.music ? 'Change' : 'Choose file'}<input type="file" accept="audio/*" hidden onchange="msiaSetMusic('${id}',this.files[0])"></label>
    ${v.music ? `<button type="button" class="btn-secondary msia-sm" onclick="msiaSetMusic('${id}',null)"><i class="ti ti-x"></i></button>` : ''}
  </div>
  <button type="button" class="btn-new" onclick="msiaCreate('${id}')"><i class="ti ti-movie"></i> ${v.result ? 'Create again with these settings' : 'Create video'}</button>
</div>`;
}

function msiaToggleOptions(id) {
  const v = MSIA.videos[id];
  v.showOptions = !v.showOptions;
  msiaRenderVideo(id);
  if (v.showOptions) document.querySelector(`#msia-v-${id} .msia-options`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function msiaRemoveKeyword(id, i) { MSIA.videos[id].keywords.splice(i, 1); msiaRenderVideo(id); }
function msiaAddKeyword(id, value) {
  const v = MSIA.videos[id];
  const k = String(value || '').trim();
  if (k && !v.keywords.includes(k) && v.keywords.length < 10) v.keywords.push(k);
  msiaRenderVideo(id);
  document.querySelector(`#msia-v-${id} .msia-chip-input`)?.focus();
}
function msiaSetLanguage(id, code) { const v = MSIA.videos[id]; v.language = code; v.voice = (msiaLang(code).voices[0] || {}).id; msiaRenderVideo(id); }
function msiaSetFormat(id, format) { MSIA.videos[id].format = format; msiaRenderVideo(id); }
function msiaSetMusic(id, file) { MSIA.videos[id].music = file || null; msiaRenderVideo(id); }
function msiaCancel(id) { MSIA.videos[id]?.abort?.abort(); }
function msiaRenderAllVideos() { Object.keys(MSIA.videos).forEach(msiaRenderVideo); }

function msiaFileName(title, ext) {
  const slug = String(title || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 50);
  return `${slug || 'ms-ia-video'}.${ext}`;
}

function msiaB64ToBuffer(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function msiaCreate(id) {
  const v = MSIA.videos[id];
  if (!v || v.phase === 'working' || (MSIA.renderingId && MSIA.renderingId !== id)) return;
  if (!(MSIA.status && MSIA.status.pexels) || !msiaPickMime() || !v.script.trim() || !v.keywords.length) { msiaRenderVideo(id); return; }
  const fmtInfo = MSIA_FORMATS.find((f) => f.id === v.format) || MSIA_FORMATS[0];
  const controller = new AbortController();
  if (v.result) URL.revokeObjectURL(v.result.url);
  Object.assign(v, { abort: controller, phase: 'working', error: null, result: null, progress: 0, showOptions: false, steps: { voice: 'active', footage: 'pending', render: 'pending' } });
  v.canvas = document.createElement('canvas');
  MSIA.renderingId = id;
  msiaRenderAllVideos();
  // Progress updates touch only the side panel text, not the canvas that is being recorded.
  const refresh = () => { if (MSIA.videos[id] === v) msiaRenderVideo(id); };
  try {
    const voice = await msiaPost('/api/msia/voice', { text: v.script, voice: v.voice }, controller.signal);
    v.steps = { voice: 'done', footage: 'active', render: 'pending' };
    refresh();
    const words = v.script.trim().split(/\s+/).length;
    const clipCount = Math.min(12, Math.max(3, Math.ceil(words / 2.4 / 4) + 1));
    const footage = await msiaPost('/api/msia/footage', { keywords: v.keywords, orientation: v.format, count: clipCount }, controller.signal);
    let lastPaint = 0;
    const rendered = await msiaRenderVideoFile({
      canvas: v.canvas,
      width: fmtInfo.width,
      height: fmtInfo.height,
      voice: msiaB64ToBuffer(voice.audio),
      words: voice.words,
      clipUrls: footage.clips.map((c) => c.url),
      captions: v.captions,
      rtl: !!msiaLang(v.language).rtl,
      brand: String(v.brand || '').trim(),
      music: v.music,
      musicVolume: v.musicVolume,
      signal: controller.signal,
      onProgress: (stage, p) => {
        if (stage === 'render') v.steps = { voice: 'done', footage: 'done', render: 'active' };
        v.progress = p;
        const now = Date.now();
        if (now - lastPaint > 400) { lastPaint = now; refresh(); }
      },
    });
    v.steps = { voice: 'done', footage: 'done', render: 'done' };
    v.result = {
      url: URL.createObjectURL(rendered.blob),
      extension: rendered.extension,
      sizeMb: (rendered.blob.size / 1024 / 1024).toFixed(1),
      credits: Array.from(new Set(footage.clips.map((c) => c.author))).slice(0, 6),
    };
    v.phase = 'done';
  } catch (e) {
    v.phase = 'idle';
    v.steps = { voice: 'pending', footage: 'pending', render: 'pending' };
    if (!(e && e.name === 'AbortError')) v.error = e.message || 'Something went wrong.';
  } finally {
    v.abort = null;
    v.canvas = null;
    if (MSIA.renderingId === id) MSIA.renderingId = null;
    msiaRenderAllVideos();
  }
}

/* ─── Renderer: clips + voice + captions → MP4/WebM, in real time ─── */

const MSIA_FPS = 30;
const MSIA_SEGMENT = 4;
const MSIA_MAX_CLIPS = 12;
const MSIA_LEAD_IN = 0.4;
const MSIA_TAIL = 1.0;
const MSIA_GOLD = '#D9B25B';
const MSIA_BRAND_BG = 'rgba(11, 58, 99, 0.92)';
const MSIA_FONT = '"Public Sans", "Segoe UI", Tahoma, Arial, sans-serif';

function msiaPickMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  return ['video/mp4;codecs=avc1.42E01F,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    .find((m) => MediaRecorder.isTypeSupported(m)) || null;
}
const msiaAbortError = () => new DOMException('Video creation was cancelled.', 'AbortError');

async function msiaLoadClip(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Clip download failed (${res.status})`);
  const video = document.createElement('video');
  video.muted = true; video.playsInline = true; video.loop = true; video.preload = 'auto';
  video.src = URL.createObjectURL(await res.blob());
  await new Promise((resolve, reject) => { video.onloadeddata = () => resolve(); video.onerror = () => reject(new Error('Clip could not be decoded')); });
  return video;
}

function msiaGroupCaptions(words, maxWords, maxChars) {
  const groups = [];
  let cur = [];
  let chars = 0;
  for (const w of words) {
    const last = cur[cur.length - 1];
    const pause = last ? w.start - last.end > 0.35 : false;
    if (cur.length && (cur.length >= maxWords || chars + w.text.length > maxChars || pause)) {
      groups.push({ words: cur, start: cur[0].start, end: last.end });
      cur = []; chars = 0;
    }
    cur.push(w); chars += w.text.length + 1;
  }
  if (cur.length) groups.push({ words: cur, start: cur[0].start, end: cur[cur.length - 1].end });
  // Hold each caption until the next one starts (capped) so text doesn't flicker between words.
  groups.forEach((g, i) => { const n = groups[i + 1]; g.end = n ? Math.min(n.start, g.end + 0.6) : g.end + 0.6; });
  return groups;
}

function msiaRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function msiaDrawCover(ctx, video, w, h, zoom) {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return;
  const s = Math.max(w / vw, h / vh) * zoom;
  ctx.drawImage(video, (w - vw * s) / 2, (h - vh * s) / 2, vw * s, vh * s);
}

function msiaDrawCaption(ctx, cap, t, w, h, rtl) {
  const portrait = h > w;
  const size = Math.round(Math.min(w, h) * (portrait ? 0.072 : 0.062));
  const maxWidth = w * 0.86;
  const lineH = size * 1.28;
  ctx.font = `800 ${size}px ${MSIA_FONT}`;
  ctx.direction = rtl ? 'rtl' : 'ltr';
  const space = ctx.measureText(' ').width;
  const lines = [];
  let line = [], lw = 0;
  for (const word of cap.words) {
    const ww = ctx.measureText(word.text).width;
    const extra = line.length ? space + ww : ww;
    if (line.length && lw + extra > maxWidth) { lines.push({ words: line, width: lw }); line = [word]; lw = ww; }
    else { line.push(word); lw += extra; }
  }
  if (line.length) lines.push({ words: line, width: lw });
  const age = t - cap.start;
  const pop = 1 - Math.pow(1 - Math.min(1, Math.max(0, age) / 0.16), 3);
  ctx.save();
  ctx.translate(w / 2, h * (portrait ? 0.7 : 0.8));
  ctx.scale(0.86 + 0.14 * pop, 0.86 + 0.14 * pop);
  ctx.globalAlpha = Math.min(1, 0.3 + pop);
  ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.2; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = size * 0.25;
  const firstY = -((lines.length - 1) * lineH) / 2;
  lines.forEach((l, li) => {
    const y = firstY + li * lineH;
    // LTR walks left→right from the left edge; RTL walks right→left from the right edge.
    let x = rtl ? l.width / 2 : -l.width / 2;
    ctx.textAlign = rtl ? 'right' : 'left';
    for (const word of l.words) {
      const ww = ctx.measureText(word.text).width;
      const active = t >= word.start && t < word.end + 0.05;
      ctx.strokeText(word.text, x, y);
      ctx.fillStyle = active ? MSIA_GOLD : '#FFFFFF';
      ctx.fillText(word.text, x, y);
      x += rtl ? -(ww + space) : ww + space;
    }
  });
  ctx.restore();
}

function msiaDrawBrand(ctx, brand, w, h) {
  const size = Math.round(Math.min(w, h) * 0.034);
  ctx.save();
  ctx.font = `700 ${size}px ${MSIA_FONT}`;
  ctx.direction = 'ltr'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const padX = size * 0.9, dot = size * 0.32;
  const boxW = padX * 2 + dot * 2 + size * 0.5 + ctx.measureText(brand).width;
  const boxH = size * 2.1;
  const x = Math.round(Math.min(w, h) * 0.05), y = x;
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = size * 0.6;
  ctx.fillStyle = MSIA_BRAND_BG;
  msiaRoundRect(ctx, x, y, boxW, boxH, boxH / 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = MSIA_GOLD;
  ctx.beginPath(); ctx.arc(x + padX + dot, y + boxH / 2, dot, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(brand, x + padX + dot * 2 + size * 0.5, y + boxH / 2 + 1);
  ctx.restore();
}

async function msiaRenderVideoFile(input) {
  const { canvas, width: W, height: H, signal } = input;
  const mimeType = msiaPickMime();
  if (!mimeType) throw new Error('This browser cannot record video. Please use Google Chrome or Microsoft Edge.');
  const audioCtx = new AudioContext();
  let clips = [];
  let rafId = 0;
  try {
    const voiceBuffer = await audioCtx.decodeAudioData(input.voice.slice(0));
    const total = MSIA_LEAD_IN + voiceBuffer.duration + MSIA_TAIL;
    const segments = Math.max(1, Math.round(total / MSIA_SEGMENT));
    const segLen = total / segments;
    const wanted = Math.min(segments, MSIA_MAX_CLIPS);

    // Three downloads at a time; broken clips are skipped.
    let tried = 0;
    while (clips.length < wanted && tried < input.clipUrls.length) {
      const batch = input.clipUrls.slice(tried, tried + 3);
      tried += batch.length;
      const results = await Promise.allSettled(batch.map((u) => msiaLoadClip(u, signal)));
      if (signal.aborted) throw msiaAbortError();
      for (const r of results) if (r.status === 'fulfilled' && clips.length < wanted) clips.push(r.value);
      input.onProgress('footage', Math.min(1, clips.length / wanted));
    }
    if (!clips.length) throw new Error('None of the footage clips could be downloaded. Check your connection and try again.');

    // Per segment: which clip, and where in it to start, so long clips show varied moments.
    const plan = Array.from({ length: segments }, (_, i) => {
      const video = clips[i % clips.length];
      const room = video.duration - segLen - 0.2;
      return { video, offset: Number.isFinite(room) && room > 0 ? Math.random() * room : 0 };
    });

    let musicBuffer = null;
    if (input.music) {
      try { musicBuffer = await audioCtx.decodeAudioData(await input.music.arrayBuffer()); } catch { musicBuffer = null; }
    }
    if (signal.aborted) throw msiaAbortError();

    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    // Holds the latest good frame, so a clip that is still seeking never flashes black.
    const base = document.createElement('canvas');
    base.width = W; base.height = H;
    const baseCtx = base.getContext('2d');
    baseCtx.fillStyle = '#082A4A'; baseCtx.fillRect(0, 0, W, H);

    const captions = input.captions
      ? msiaGroupCaptions(input.words, H > W ? 4 : 6, H > W ? 24 : 40).map((c) => ({
          start: c.start + MSIA_LEAD_IN, end: c.end + MSIA_LEAD_IN,
          words: c.words.map((w) => ({ ...w, start: w.start + MSIA_LEAD_IN, end: w.end + MSIA_LEAD_IN })),
        }))
      : [];
    const shade = ctx.createLinearGradient(0, H * 0.4, 0, H);
    shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,0.6)');
    const topShade = ctx.createLinearGradient(0, 0, 0, H * 0.18);
    topShade.addColorStop(0, 'rgba(0,0,0,0.35)'); topShade.addColorStop(1, 'rgba(0,0,0,0)');

    const dest = audioCtx.createMediaStreamDestination();
    const voiceSrc = audioCtx.createBufferSource();
    voiceSrc.buffer = voiceBuffer; voiceSrc.connect(dest);
    let musicSrc = null, musicGain = null;
    if (musicBuffer) {
      musicSrc = audioCtx.createBufferSource(); musicSrc.buffer = musicBuffer; musicSrc.loop = true;
      musicGain = audioCtx.createGain(); musicSrc.connect(musicGain).connect(dest);
    }

    const stream = new MediaStream([...canvas.captureStream(MSIA_FPS).getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6000000, audioBitsPerSecond: 128000 });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise((resolve) => { recorder.onstop = () => resolve(); });

    await audioCtx.resume();
    const t0 = audioCtx.currentTime + 0.15;
    voiceSrc.start(t0 + MSIA_LEAD_IN);
    if (musicSrc) {
      const vol = Math.max(0, Math.min(1, input.musicVolume));
      musicGain.gain.setValueAtTime(vol, t0);
      musicGain.gain.setValueAtTime(vol, t0 + total - 1.2);
      musicGain.gain.linearRampToValueAtTime(0, t0 + total);
      musicSrc.start(t0);
    }
    recorder.start(1000);
    plan[0].video.currentTime = plan[0].offset;
    let active = -1;

    await new Promise((resolve, reject) => {
      const frame = () => {
        if (signal.aborted) { reject(msiaAbortError()); return; }
        const t = Math.max(0, audioCtx.currentTime - t0);
        if (t >= total) { resolve(); return; }
        const seg = Math.min(segments - 1, Math.floor(t / segLen));
        if (seg !== active) {
          const prev = active >= 0 ? plan[active].video : null;
          const cur = plan[seg];
          if (prev && prev !== cur.video) prev.pause();
          if (prev !== cur.video) cur.video.currentTime = cur.offset;
          cur.video.play().catch(() => {});
          // Seek the next clip now so it is ready the moment its segment starts.
          const next = plan[seg + 1];
          if (next && next.video !== cur.video) next.video.currentTime = next.offset;
          active = seg;
        }
        const { video } = plan[seg];
        const p = (t - seg * segLen) / segLen;
        const zoom = seg % 2 === 0 ? 1 + 0.07 * p : 1.07 - 0.07 * p;
        if (video.readyState >= 2 && !video.seeking) msiaDrawCover(baseCtx, video, W, H, zoom);
        ctx.globalAlpha = 1;
        ctx.drawImage(base, 0, 0);
        ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);
        if (input.brand) { ctx.fillStyle = topShade; ctx.fillRect(0, 0, W, H); msiaDrawBrand(ctx, input.brand, W, H); }
        const cap = captions.find((c) => t >= c.start && t < c.end);
        if (cap) msiaDrawCaption(ctx, cap, t, W, H, input.rtl);
        const fade = Math.max(1 - t / 0.35, (t - (total - 0.6)) / 0.6, 0);
        if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fade)})`; ctx.fillRect(0, 0, W, H); }
        input.onProgress('render', t / total);
        rafId = requestAnimationFrame(frame);
      };
      rafId = requestAnimationFrame(frame);
    }).finally(() => {
      cancelAnimationFrame(rafId);
      if (recorder.state !== 'inactive') recorder.stop();
      clips.forEach((c) => c.pause());
    });

    await stopped;
    stream.getTracks().forEach((tr) => tr.stop());
    const type = mimeType.split(';')[0];
    return { blob: new Blob(chunks, { type }), mimeType: type, extension: type === 'video/mp4' ? 'mp4' : 'webm' };
  } finally {
    cancelAnimationFrame(rafId);
    clips.forEach((c) => { c.pause(); URL.revokeObjectURL(c.src); c.removeAttribute('src'); c.load(); });
    audioCtx.close().catch(() => {});
  }
}
