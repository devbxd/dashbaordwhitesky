/* M&S AI — chat assistant + video maker (server side: /msia.js).
   One chat: ask about this account's data, or ask for a video. Videos are edited right
   here in the browser (canvas + MediaRecorder), so they cost nothing to produce. */

const MSIA = {
  messages: [],      // { id, role:'user'|'assistant', text, videoIds?, error? }
  videos: {},        // id -> video state (see msiaNewVideo)
  demos: {},         // id -> live demo state (see msiaNewDemo)
  pendingPhotos: [], // photos attached in the composer, sent with the next message
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
  { icon: 'ti-device-desktop', label: 'Live demo of the system', prompt: 'Make a live demo video of the system that presents its main features, in English.' },
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
  const st = MSIA.status || { ai: false, pexels: false, languages: [] };
  mc.innerHTML = `
<div class="msia-wrap">
  <div class="msia-head">
    <div class="msia-head-id">
      <div class="msia-logo"><i class="ti ti-sparkles"></i></div>
      <div><div class="page-title">M&amp;S AI</div><div class="page-sub">Ask about your business, or ask for a video.</div></div>
    </div>
    <button class="btn-secondary msia-new ${MSIA.messages.length ? '' : 'hidden'}" id="msia-new" onclick="msiaNewChat()"><i class="ti ti-edit"></i> New chat</button>
  </div>
  ${!st.ai ? `<div class="info-box msia-warn"><i class="ti ti-alert-triangle"></i> Setup needed: add the free <b>GROQ_API_KEY</b>${!st.pexels ? ' and <b>PEXELS_API_KEY</b>' : ''} to the server environment, then redeploy.</div>` : ''}
  <div class="msia-scroll" id="msia-scroll"><div class="msia-thread" id="msia-thread"></div></div>
  <form class="msia-composer" id="msia-form">
    <div class="msia-attach hidden" id="msia-attach"></div>
    <div class="msia-input-row">
      <label class="msia-clip" title="Attach photos for a video" ${st.ai ? '' : 'hidden'}><i class="ti ti-paperclip"></i><input type="file" accept="image/*" multiple hidden onchange="msiaAttach(this.files);this.value=''"></label>
      <textarea id="msia-input" rows="1" dir="auto" placeholder="${st.ai ? 'Ask a question or describe the video you want…' : 'M&S AI needs an AI key to work'}" ${st.ai ? '' : 'disabled'}></textarea>
      <button type="submit" class="msia-send" id="msia-send" aria-label="Send" disabled><i class="ti ti-arrow-up"></i></button>
    </div>
    <div class="msia-foot">M&amp;S AI only sees this account's data and never changes it. Check important answers before acting on them.</div>
  </form>
</div>`;
  const input = document.getElementById('msia-input');
  const send = document.getElementById('msia-send');
  const grow = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 160) + 'px'; send.disabled = !input.value.trim() || MSIA.thinking || !st.ai; };
  input.addEventListener('input', grow);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); msiaSend(input.value); }
  });
  document.getElementById('msia-form').addEventListener('submit', (e) => { e.preventDefault(); msiaSend(input.value); });
  msiaRenderAttach();
  msiaRenderThread();
}

function msiaAttach(files) {
  MSIA.pendingPhotos = MSIA.pendingPhotos.concat(msiaImageFiles(files)).slice(0, MSIA_MAX_PHOTOS);
  msiaRenderAttach();
  const input = document.getElementById('msia-input');
  if (input && !input.value.trim()) input.placeholder = 'Describe the video to make with these photos…';
  input?.focus();
}
function msiaUnattach(i) { MSIA.pendingPhotos.splice(i, 1); msiaRenderAttach(); }
function msiaRenderAttach() {
  const box = document.getElementById('msia-attach');
  if (!box) return;
  box.classList.toggle('hidden', !MSIA.pendingPhotos.length);
  box.innerHTML = MSIA.pendingPhotos.map((f, i) => `<div class="msia-photo"><img src="${msiaThumb(f)}" alt=""><button type="button" onclick="msiaUnattach(${i})" aria-label="Remove photo"><i class="ti ti-x"></i></button></div>`).join('')
    + (MSIA.pendingPhotos.length ? `<span class="msia-attach-note">${MSIA.pendingPhotos.length} photo${MSIA.pendingPhotos.length > 1 ? 's' : ''} — the next video will use them</span>` : '');
}

function msiaNewChat() {
  if (MSIA.thinking || MSIA.renderingId) return;
  [...Object.values(MSIA.videos), ...Object.values(MSIA.demos)].forEach((v) => v.result && URL.revokeObjectURL(v.result.url));
  MSIA.demos = {};
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
  <p>I know your invoices, clients, payments and bookings — and I can make ready-to-post videos with voice-over and captions, in Arabic or English.</p>
  <div class="msia-suggestions">${MSIA_SUGGESTIONS.map((s, i) => `
    <button type="button" class="msia-sugg" onclick="msiaSend(MSIA_SUGGESTIONS[${i}].prompt)" ${st.ai ? '' : 'disabled'}>
      <span class="msia-sugg-icon"><i class="ti ${s.icon}"></i></span>
      <span><b>${msiaEsc(s.label)}</b><small dir="auto">${msiaEsc(s.prompt)}</small></span>
    </button>`).join('')}</div>
</div>`;
    return;
  }
  thread.innerHTML = MSIA.messages.map((m) => {
    if (m.role === 'user') {
      const pics = (m.photos || []).length ? `<div class="msia-bubble-photos">${m.photos.slice(0, 8).map((f) => `<img src="${msiaThumb(f)}" alt="">`).join('')}${m.photos.length > 8 ? `<span>+${m.photos.length - 8}</span>` : ''}</div>` : '';
      return `<div class="msia-row msia-row-user"><div class="msia-bubble" dir="auto">${pics}${msiaEsc(m.text)}</div></div>`;
    }
    const body = m.error
      ? `<div class="msia-error"><i class="ti ti-alert-triangle"></i> ${msiaEsc(m.text)}</div>`
      : (m.text ? `<div class="msia-md" dir="auto">${msiaMarkdown(m.text)}</div>` : '');
    return `<div class="msia-row"><div class="msia-avatar"><i class="ti ti-sparkles"></i></div><div class="msia-answer">${body}${(m.videoIds || []).map((id) => `<div class="msia-video" id="msia-v-${id}"></div>`).join('')}${(m.demoIds || []).map((id) => `<div class="msia-video" id="msia-d-${id}"></div>`).join('')}</div></div>`;
  }).join('') + (MSIA.thinking ? `<div class="msia-row"><div class="msia-avatar"><i class="ti ti-sparkles"></i></div><div class="msia-typing"><span></span><span></span><span></span></div></div>` : '');
  MSIA.messages.forEach((m) => {
    (m.videoIds || []).forEach((id) => msiaRenderVideo(id));
    (m.demoIds || []).forEach((id) => msiaRenderDemo(id));
  });
  const sc = document.getElementById('msia-scroll');
  if (sc) sc.scrollTop = sc.scrollHeight;
}

// What the model sees of earlier turns: video cards are summarised so "make it shorter" or
// "now in Arabic" have the script to work from.
function msiaHistoryText(m) {
  if (m.role === 'user' && m.photos && m.photos.length) {
    return `${m.text}\n[The user attached ${m.photos.length} photo${m.photos.length > 1 ? 's' : ''} for the video. They will be used as the footage automatically.]`;
  }
  const notes = (m.videoIds || []).map((id) => {
    const v = MSIA.videos[id];
    return v ? `[Video created — title: "${v.title}", language: ${v.language}, format: ${v.format}. Script: ${v.script}]` : '';
  });
  (m.demoIds || []).forEach((id) => {
    const d = MSIA.demos[id];
    if (d) notes.push(`[Live demo created — title: "${d.title}", language: ${d.language}. Scenes: ${d.scenes.map((s) => `${s.page}: ${s.narration}`).join(' | ')}]`);
  });
  return [m.text, ...notes].filter(Boolean).join('\n');
}

async function msiaSend(text) {
  const q = String(text || '').trim();
  if (!q || MSIA.thinking || !(MSIA.status && MSIA.status.ai)) return;
  const photos = MSIA.pendingPhotos;
  MSIA.pendingPhotos = [];
  msiaRenderAttach();
  MSIA.messages.push({ id: msiaId(), role: 'user', text: q, photos });
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
      // Photos sent with this question become the footage of the video it produced.
      if (photos.length) MSIA.videos[req.id].photos = photos.slice();
      return req.id;
    });
    const demoIds = (data.demos || []).map((req) => {
      MSIA.demos[req.id] = msiaNewDemo(req);
      return req.id;
    });
    MSIA.messages.push({ id: msiaId(), role: 'assistant', text: data.reply || '', videoIds, demoIds });
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
    photos: [],    // user photos (File); when present they replace stock footage
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
  const hasPhotos = v.photos.length > 0;
  const canCreate = (pexels || hasPhotos) && supported && v.phase !== 'working' && !locked && v.script.trim() && (hasPhotos || v.keywords.length);
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
        ${stepRow('voice', 'Voice-over', 'ti-microphone')}${stepRow('footage', hasPhotos ? 'Photos' : 'Footage', hasPhotos ? 'ti-photo' : 'ti-video')}${stepRow('render', 'Editing', 'ti-movie')}
        <div class="msia-bar"><div style="width:${overall}%"></div></div>
        <div class="msia-note">Editing happens live in this tab — keep it open until it finishes.</div>
        <button type="button" class="btn-secondary msia-sm" onclick="msiaCancel('${id}')">Cancel</button>`
      : `<div class="msia-script" dir="auto">${msiaEsc(v.script)}</div>
        ${v.error ? `<div class="msia-error"><i class="ti ti-alert-triangle"></i> ${msiaEsc(v.error)}</div>` : ''}
        ${!pexels && !hasPhotos ? '<div class="msia-note warn">PEXELS_API_KEY is not configured on the server — add your own photos in "Edit script &amp; options" to create this video.</div>' : ''}
        ${hasPhotos ? `<div class="msia-note"><i class="ti ti-photo"></i> Made with your ${v.photos.length} photo${v.photos.length > 1 ? 's' : ''}.</div>` : ''}
        ${!supported ? '<div class="msia-note warn">This browser can\'t record video — use Chrome or Edge on a computer.</div>' : ''}
        <div class="msia-actions">
          ${v.result
            ? `<a class="btn-new msia-sm" href="${v.result.url}" download="${msiaEsc(msiaFileName(v.title, v.result.extension))}"><i class="ti ti-download"></i> Download ${v.result.extension.toUpperCase()} · ${v.result.sizeMb} MB</a>
               <button type="button" class="btn-secondary msia-sm" onclick="msiaCreate('${id}')" ${canCreate ? '' : 'disabled'}><i class="ti ti-refresh"></i> ${hasPhotos ? 'Create again' : 'New footage'}</button>`
            : `<button type="button" class="btn-new msia-sm" onclick="msiaCreate('${id}')" ${canCreate ? '' : 'disabled'}><i class="ti ti-movie"></i> ${v.error ? 'Try again' : 'Create video'}</button>`}
          <button type="button" class="btn-secondary msia-sm" onclick="msiaToggleOptions('${id}')"><i class="ti ti-adjustments"></i> Edit script &amp; options</button>
        </div>
        ${v.result && v.result.credits.length ? `<div class="msia-note">Footage: ${msiaEsc(v.result.credits.join(', '))} via Pexels (free for commercial use).</div>` : ''}
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
  <div class="msia-opt-label">Your photos ${v.photos.length ? `(${v.photos.length}) — used instead of stock footage` : '— optional, replaces stock footage'}</div>
  <div class="msia-photos">${v.photos.map((f, i) => `<div class="msia-photo"><img src="${msiaThumb(f)}" alt=""><button type="button" onclick="msiaRemovePhoto('${id}',${i})" aria-label="Remove photo"><i class="ti ti-x"></i></button></div>`).join('')}
    ${v.photos.length < MSIA_MAX_PHOTOS ? `<label class="msia-photo-add"><i class="ti ti-photo-plus"></i><span>Add photos</span><input type="file" accept="image/*" multiple hidden onchange="msiaAddPhotos('${id}',this.files)"></label>` : ''}</div>
  <div class="msia-opt-label">Footage keywords (English works best)${v.photos.length ? ' — only used without photos' : ''}</div>
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

const MSIA_MAX_PHOTOS = 20;
const _msiaThumbs = new WeakMap();
// One object URL per photo, reused across re-renders instead of leaking a new one each time.
function msiaThumb(file) {
  if (!_msiaThumbs.has(file)) _msiaThumbs.set(file, URL.createObjectURL(file));
  return _msiaThumbs.get(file);
}
const msiaImageFiles = (files) => Array.from(files || []).filter((f) => f && /^image\//.test(f.type));
function msiaAddPhotos(id, files) {
  const v = MSIA.videos[id];
  v.photos = v.photos.concat(msiaImageFiles(files)).slice(0, MSIA_MAX_PHOTOS);
  msiaRenderVideo(id);
}
function msiaRemovePhoto(id, i) { MSIA.videos[id].photos.splice(i, 1); msiaRenderVideo(id); }
function msiaRenderAllVideos() { Object.keys(MSIA.videos).forEach(msiaRenderVideo); Object.keys(MSIA.demos).forEach(msiaRenderDemo); }

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
  const hasPhotos = v.photos.length > 0;
  if (!(hasPhotos || (MSIA.status && MSIA.status.pexels)) || !msiaPickMime() || !v.script.trim() || !(hasPhotos || v.keywords.length)) { msiaRenderVideo(id); return; }
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
    // With the user's photos there is nothing to fetch: they are edited straight from this browser.
    const footage = hasPhotos ? { clips: [] } : await msiaPost('/api/msia/footage', { keywords: v.keywords, orientation: v.format, count: clipCount }, controller.signal);
    let lastPaint = 0;
    const rendered = await msiaRenderVideoFile({
      canvas: v.canvas,
      width: fmtInfo.width,
      height: fmtInfo.height,
      voice: msiaB64ToBuffer(voice.audio),
      words: voice.words,
      clipUrls: footage.clips.map((c) => c.url),
      photos: v.photos,
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

// Draws a video frame or photo so it covers the whole canvas (cropping the overflow).
function msiaDrawCover(ctx, src, w, h, zoom, panX = 0, panY = 0) {
  const vw = src.videoWidth || src.naturalWidth || src.width, vh = src.videoHeight || src.naturalHeight || src.height;
  if (!vw || !vh) return;
  const s = Math.max(w / vw, h / vh) * zoom;
  ctx.drawImage(src, (w - vw * s) / 2 + panX, (h - vh * s) / 2 + panY, vw * s, vh * s);
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

    // The user's own photos replace stock footage: each gets a slow zoom/pan, with crossfades.
    const photos = [];
    if (input.photos && input.photos.length) {
      for (let i = 0; i < input.photos.length; i++) {
        try { photos.push(await msiaLoadPhoto(input.photos[i])); } catch { /* an unreadable photo is skipped */ }
        if (signal.aborted) throw msiaAbortError();
        input.onProgress('footage', (i + 1) / input.photos.length);
      }
      if (!photos.length) throw new Error("None of the photos could be opened. Use JPG or PNG files.");
    } else {
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
    }

    // Photos: every photo is shown (2.2–5 s each), cycling if the narration is longer.
    // Clips: which clip per segment, and where in it to start, so long clips show varied moments.
    const photoMode = photos.length > 0;
    const segCount = photoMode ? Math.max(1, Math.round(total / Math.min(5, Math.max(2.2, total / photos.length)))) : segments;
    const segDur = total / segCount;
    const plan = Array.from({ length: segCount }, (_, i) => {
      if (photoMode) return { photo: photos[i % photos.length] };
      const video = clips[i % clips.length];
      const room = video.duration - segDur - 0.2;
      return { video, offset: Number.isFinite(room) && room > 0 ? Math.random() * room : 0 };
    });
    // Ken Burns move for a photo segment at progress p (0..1): alternating zoom in/out and pan.
    const photoMove = (seg, p) => {
      const zoomIn = seg % 2 === 0;
      const zoom = zoomIn ? 1.04 + 0.1 * p : 1.14 - 0.1 * p;
      const dir = (seg % 3) - 1;
      return { zoom, panX: dir * 0.035 * W * (p - 0.5), panY: (seg % 2 ? 1 : -1) * 0.02 * H * (p - 0.5) };
    };

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
    if (!photoMode) plan[0].video.currentTime = plan[0].offset;
    let active = -1;
    const CROSSFADE = 0.5;

    await new Promise((resolve, reject) => {
      const frame = () => {
        if (signal.aborted) { reject(msiaAbortError()); return; }
        const t = Math.max(0, audioCtx.currentTime - t0);
        if (t >= total) { resolve(); return; }
        const seg = Math.min(segCount - 1, Math.floor(t / segDur));
        const p = (t - seg * segDur) / segDur;
        if (photoMode) {
          const m = photoMove(seg, p);
          baseCtx.globalAlpha = 1;
          const intoSeg = t - seg * segDur;
          if (seg > 0 && intoSeg < CROSSFADE) {
            // Crossfade: previous photo at the end of its move, then the new one fading in on top.
            const pm = photoMove(seg - 1, 1);
            msiaDrawCover(baseCtx, plan[seg - 1].photo, W, H, pm.zoom, pm.panX, pm.panY);
            baseCtx.globalAlpha = intoSeg / CROSSFADE;
          }
          msiaDrawCover(baseCtx, plan[seg].photo, W, H, m.zoom, m.panX, m.panY);
          baseCtx.globalAlpha = 1;
        } else {
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
          const zoom = seg % 2 === 0 ? 1 + 0.07 * p : 1.07 - 0.07 * p;
          if (video.readyState >= 2 && !video.seeking) msiaDrawCover(baseCtx, video, W, H, zoom);
        }
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

// Decodes a user photo, honouring its EXIF orientation (phone pictures are often rotated).
async function msiaLoadPhoto(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* fall back below */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ─── Live demo: record THIS dashboard while it tours its own pages ───
   The browser records the current tab (getDisplayMedia — Chrome asks the user to share it),
   the app opens each scene's page, highlights it and scrolls through it while the narration
   plays, and captions + branding are drawn as a DOM overlay so they land in the recording. */

const MSIA_DEMO_END = { ar: 'شكراً لمشاهدتكم', en: 'Thanks for watching' };
const MSIA_DEMO_TAG = { ar: 'عرض مباشر', en: 'Live demo' };

function msiaNewDemo(req) {
  return { ...req, brand: msiaBrand(), blur: true, phase: 'idle', progress: 0, error: null, result: null, showOptions: false, abort: null };
}

function msiaPageLabel(page) {
  return (document.querySelector(`.nav-item[data-page="${page}"] span`)?.textContent || page).trim();
}
// Pages this account doesn't have (e.g. travel pages on the Cyber account) are skipped.
function msiaPageAvailable(page) {
  const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
  return !!nav && !nav.classList.contains('hidden');
}

function msiaRenderDemo(id) {
  const el = document.getElementById(`msia-d-${id}`);
  const d = MSIA.demos[id];
  if (!el || !d) return;
  const lang = msiaLang(d.language);
  const busy = d.phase === 'preparing' || d.phase === 'recording';
  const locked = MSIA.renderingId && MSIA.renderingId !== id;
  const canRecord = !busy && !locked && !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) && !!msiaPickMime() && d.scenes.some((s) => msiaPageAvailable(s.page));
  const scenes = d.scenes.map((s, i) => `
    <div class="msia-scene ${msiaPageAvailable(s.page) ? '' : 'off'}"><span>${i + 1}</span><div><b>${msiaEsc(msiaPageLabel(s.page))}</b><small dir="auto">${msiaEsc(s.narration)}</small></div></div>`).join('');
  el.innerHTML = `
<div class="msia-card">
  <div class="msia-card-head"><i class="ti ti-device-desktop"></i><b dir="auto">${msiaEsc(d.title || 'Live demo')}</b><span>Live demo · ${d.scenes.length} scenes · ${msiaEsc(lang.label.split(' — ').pop())}</span></div>
  <div class="msia-card-body">
    ${d.result ? `<div class="msia-preview" style="aspect-ratio:${d.result.width}/${d.result.height}" id="msia-dprev-${id}"></div>` : `<div class="msia-scenes">${scenes}</div>`}
    <div class="msia-card-side">
      ${busy ? `
        <div class="msia-step active"><span><i class="ti ti-loader-2 spin"></i></span>${d.phase === 'preparing' ? 'Preparing the narration…' : 'Recording the demo…'}</div>
        <div class="msia-bar"><div style="width:${Math.round(d.progress * 100)}%"></div></div>
        <div class="msia-note">Don't touch the mouse or keyboard until it finishes. Press Esc to cancel.</div>`
      : `
        ${d.error ? `<div class="msia-error"><i class="ti ti-alert-triangle"></i> ${msiaEsc(d.error)}</div>` : ''}
        ${!d.result ? `<div class="msia-note">When you press <b>Record demo</b>, Chrome asks what to share: choose <b>this tab</b>. The app then tours its pages by itself while the narrator explains them — don't touch anything until it's done.</div>` : ''}
        ${!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) ? '<div class="msia-note warn">This browser can\'t record the screen — use Chrome or Edge on a computer.</div>' : ''}
        <label class="msia-check-inline"><input type="checkbox" ${d.blur ? 'checked' : ''} onchange="MSIA.demos['${id}'].blur=this.checked"> Hide client data (blur names, amounts and tables)</label>
        <div class="msia-actions">
          ${d.result
            ? `<a class="btn-new msia-sm" href="${d.result.url}" download="${msiaEsc(msiaFileName(d.title || 'demo', d.result.extension))}"><i class="ti ti-download"></i> Download ${d.result.extension.toUpperCase()} · ${d.result.sizeMb} MB</a>
               <button type="button" class="btn-secondary msia-sm" onclick="msiaRecordDemo('${id}')" ${canRecord ? '' : 'disabled'}><i class="ti ti-refresh"></i> Record again</button>`
            : `<button type="button" class="btn-new msia-sm" onclick="msiaRecordDemo('${id}')" ${canRecord ? '' : 'disabled'}><i class="ti ti-player-record"></i> Record demo</button>`}
          <button type="button" class="btn-secondary msia-sm" onclick="msiaToggleDemoOptions('${id}')"><i class="ti ti-adjustments"></i> Edit scenes &amp; voice</button>
        </div>
        ${locked ? '<div class="msia-note">Another video is being made — this one can start when it finishes.</div>' : ''}`}
    </div>
  </div>
  ${d.showOptions && !busy ? msiaDemoOptionsHtml(id, d, lang) : ''}
</div>`;
  if (d.result) {
    const video = document.createElement('video');
    video.src = d.result.url;
    video.controls = true;
    video.playsInline = true;
    video.addEventListener('loadeddata', () => { if (video.currentTime === 0) video.currentTime = 1; }, { once: true });
    document.getElementById(`msia-dprev-${id}`)?.appendChild(video);
  }
}

function msiaDemoOptionsHtml(id, d, lang) {
  const langs = (MSIA.status && MSIA.status.languages) || [];
  const pages = [...document.querySelectorAll('.nav-item[data-page]')]
    .map((n) => n.dataset.page)
    .filter((p) => !['msia', 'admin', 'projects', 'settings'].includes(p) && msiaPageAvailable(p));
  return `
<div class="msia-options">
  <label>Title<input class="form-input" dir="auto" value="${msiaEsc(d.title)}" oninput="MSIA.demos['${id}'].title=this.value"></label>
  ${d.scenes.map((s, i) => `
  <div class="msia-scene-edit">
    <div class="msia-scene-edit-top"><span>${i + 1}</span>
      <select class="form-input" onchange="MSIA.demos['${id}'].scenes[${i}].page=this.value">${pages.map((p) => `<option value="${p}" ${p === s.page ? 'selected' : ''}>${msiaEsc(msiaPageLabel(p))}</option>`).join('')}</select>
      <button type="button" class="btn-secondary msia-sm" onclick="msiaDemoRemoveScene('${id}',${i})" ${d.scenes.length > 1 ? '' : 'disabled'} aria-label="Remove scene"><i class="ti ti-trash"></i></button>
    </div>
    <textarea class="form-input" rows="2" dir="auto" oninput="MSIA.demos['${id}'].scenes[${i}].narration=this.value">${msiaEsc(s.narration)}</textarea>
  </div>`).join('')}
  ${d.scenes.length < 10 ? `<button type="button" class="btn-secondary msia-sm" style="align-self:flex-start" onclick="msiaDemoAddScene('${id}')"><i class="ti ti-plus"></i> Add scene</button>` : ''}
  <div class="msia-grid2">
    <label>Language<select class="form-input" onchange="msiaDemoSetLanguage('${id}',this.value)">${langs.map((l) => `<option value="${l.code}" ${l.code === d.language ? 'selected' : ''}>${msiaEsc(l.label)}</option>`).join('')}</select></label>
    <label>Narrator voice<select class="form-input" onchange="MSIA.demos['${id}'].voice=this.value">${lang.voices.map((vo) => `<option value="${vo.id}" ${vo.id === d.voice ? 'selected' : ''}>${msiaEsc(vo.label)}</option>`).join('')}</select></label>
  </div>
  <label>Brand name on the video (empty = hidden)<input class="form-input" maxlength="40" value="${msiaEsc(d.brand)}" oninput="MSIA.demos['${id}'].brand=this.value"></label>
</div>`;
}

function msiaToggleDemoOptions(id) { const d = MSIA.demos[id]; d.showOptions = !d.showOptions; msiaRenderDemo(id); }
function msiaDemoRemoveScene(id, i) { MSIA.demos[id].scenes.splice(i, 1); msiaRenderDemo(id); }
function msiaDemoAddScene(id) { MSIA.demos[id].scenes.push({ page: 'dashboard', narration: '' }); msiaRenderDemo(id); }
function msiaDemoSetLanguage(id, code) { const d = MSIA.demos[id]; d.language = code; d.voice = (msiaLang(code).voices[0] || {}).id; msiaRenderDemo(id); }

function msiaSleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) { reject(msiaAbortError()); return; }
    const t = setTimeout(resolve, ms);
    if (signal) signal.addEventListener('abort', () => { clearTimeout(t); reject(msiaAbortError()); }, { once: true });
  });
}

// Overlay drawn on top of the real app while recording: title/end cards, brand badge,
// captions and a click shield (so a stray click can't derail the tour).
function msiaDemoLayer(d) {
  const rtl = !!msiaLang(d.language).rtl;
  const root = document.createElement('div');
  root.className = 'msia-demo-layer';
  root.innerHTML = `
    <div class="msia-demo-card" id="msia-demo-card"></div>
    ${d.brand ? `<div class="msia-demo-brand"><i></i>${msiaEsc(d.brand)}<small>${msiaEsc(MSIA_DEMO_TAG[d.language] || MSIA_DEMO_TAG.en)}</small></div>` : ''}
    <div class="msia-demo-cap" id="msia-demo-cap" dir="${rtl ? 'rtl' : 'ltr'}"></div>`;
  document.body.appendChild(root);
  const card = root.querySelector('#msia-demo-card');
  const cap = root.querySelector('#msia-demo-cap');
  let capKey = null;
  return {
    async card(html, ms, signal) {
      card.innerHTML = html;
      card.classList.add('on');
      await msiaSleep(ms, signal);
      card.classList.remove('on');
      await msiaSleep(450, signal);
    },
    caption(group, t) {
      if (!group) { if (capKey !== null) { cap.classList.remove('on'); capKey = null; } return; }
      if (capKey !== group.start) {
        capKey = group.start;
        cap.innerHTML = group.words.map((w) => `<span>${msiaEsc(w.text)}</span>`).join(' ');
        cap.classList.add('on');
      }
      const spans = cap.children;
      group.words.forEach((w, i) => spans[i] && spans[i].classList.toggle('now', t >= w.start && t < w.end + 0.05));
    },
    spot(page) {
      document.querySelectorAll('.msia-demo-spot').forEach((n) => n.classList.remove('msia-demo-spot'));
      const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
      if (nav) { nav.classList.add('msia-demo-spot'); nav.scrollIntoView({ block: 'nearest' }); }
      const btn = document.querySelector('#main-content .btn-new');
      if (btn) btn.classList.add('msia-demo-spot');
    },
    remove() {
      document.querySelectorAll('.msia-demo-spot').forEach((n) => n.classList.remove('msia-demo-spot'));
      root.remove();
    },
  };
}

async function msiaDemoGoto(page, signal) {
  window.scrollTo(0, 0);
  showPage(page);
  // Wait for the page to swap its loading skeleton for real content (max 6 s).
  const start = Date.now();
  while (document.querySelector('#main-content .skeleton-page') && Date.now() - start < 6000) await msiaSleep(100, signal);
  await msiaSleep(500, signal);
}

async function msiaRecordDemo(id) {
  const d = MSIA.demos[id];
  if (!d || MSIA.renderingId || d.phase === 'preparing' || d.phase === 'recording') return;
  const scenes = d.scenes.filter((s) => msiaPageAvailable(s.page) && String(s.narration || '').trim());
  if (!scenes.length) { d.error = 'Add at least one scene with narration.'; msiaRenderDemo(id); return; }

  // Must be called straight from the click, before any await: Chrome only allows screen
  // capture right after a user gesture.
  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30, displaySurface: 'browser' },
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: 'include',
      surfaceSwitching: 'exclude',
      monitorTypeSurfaces: 'exclude',
    });
  } catch (e) {
    d.error = 'Recording was not started. Press "Record demo" again and choose this tab.';
    msiaRenderDemo(id);
    return;
  }
  const track = stream.getVideoTracks()[0];
  const controller = new AbortController();
  const onKey = (e) => { if (e.key === 'Escape') controller.abort(); };
  track.addEventListener('ended', () => controller.abort()); // "Stop sharing" was clicked
  document.addEventListener('keydown', onKey);
  if (d.result) URL.revokeObjectURL(d.result.url);
  Object.assign(d, { phase: 'preparing', progress: 0, error: null, result: null, showOptions: false, abort: controller });
  MSIA.renderingId = id;
  msiaRenderAllVideos();

  let audioCtx = null;
  let layer = null;
  let recorder = null;
  const signal = controller.signal;
  try {
    // 1. Narration for every scene (before recording, so nothing waits on the network on camera).
    const voices = [];
    for (let i = 0; i < scenes.length; i++) {
      voices.push(await msiaPost('/api/msia/voice', { text: scenes[i].narration, voice: d.voice }, signal));
      d.progress = (i + 1) / scenes.length;
      msiaRenderDemo(id);
    }
    audioCtx = new AudioContext();
    const buffers = await Promise.all(voices.map((v) => audioCtx.decodeAudioData(msiaB64ToBuffer(v.audio))));
    const dest = audioCtx.createMediaStreamDestination();

    // 2. Recorder: the tab's picture + the narration.
    const mimeType = msiaPickMime();
    recorder = new MediaRecorder(new MediaStream([track, ...dest.stream.getAudioTracks()]), { mimeType, videoBitsPerSecond: 8000000, audioBitsPerSecond: 128000 });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise((resolve) => { recorder.onstop = () => resolve(); });

    layer = msiaDemoLayer(d);
    document.body.classList.add('msia-demo-on');
    document.body.classList.toggle('msia-demo-private', !!d.blur);
    await audioCtx.resume();
    d.phase = 'recording';
    d.progress = 0;
    const totalTime = buffers.reduce((a, b) => a + b.duration + 1.4, 0) + 6;
    let elapsed = 0;

    // Open the first page behind the title card so the tour starts on real content.
    await msiaDemoGoto(scenes[0].page, signal);
    recorder.start(1000);
    await layer.card(`<div class="msia-demo-card-logo"><i class="ti ti-sparkles"></i></div><h1 dir="auto">${msiaEsc(d.title || d.brand || 'Demo')}</h1>${d.brand ? `<p>${msiaEsc(d.brand)}</p>` : ''}`, 2300, signal);
    elapsed += 2.8;

    for (let i = 0; i < scenes.length; i++) {
      if (i > 0) { await msiaDemoGoto(scenes[i].page, signal); elapsed += 0.9; }
      layer.spot(scenes[i].page);
      const buf = buffers[i];
      const groups = msiaGroupCaptions(voices[i].words || [], 9, 64);
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      src.connect(dest);
      const t0 = audioCtx.currentTime + 0.15;
      src.start(t0);
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      await new Promise((resolve, reject) => {
        const frame = () => {
          if (signal.aborted) { src.stop(); reject(msiaAbortError()); return; }
          const t = audioCtx.currentTime - t0;
          if (t >= buf.duration + 0.5) { layer.caption(null); resolve(); return; }
          layer.caption(groups.find((g) => t >= g.start && t < g.end) || null, t);
          if (maxScroll > 40) {
            // Hold the top of the page for a quarter of the scene, then glide down.
            const p = Math.min(1, Math.max(0, (t - buf.duration * 0.25) / (buf.duration * 0.65)));
            const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
            window.scrollTo(0, Math.round(maxScroll * 0.85 * eased));
          }
          d.progress = Math.min(0.99, (elapsed + Math.max(0, t)) / totalTime);
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      elapsed += buf.duration + 0.5;
    }

    window.scrollTo(0, 0);
    await layer.card(`<div class="msia-demo-card-logo"><i class="ti ti-sparkles"></i></div><h1 dir="auto">${msiaEsc(MSIA_DEMO_END[d.language] || MSIA_DEMO_END.en)}</h1>${d.brand ? `<p>${msiaEsc(d.brand)}</p>` : ''}`, 2000, signal);
    recorder.stop();
    await stopped;
    const type = mimeType.split(';')[0];
    const blob = new Blob(chunks, { type });
    const settings = track.getSettings();
    d.result = {
      url: URL.createObjectURL(blob),
      extension: type === 'video/mp4' ? 'mp4' : 'webm',
      sizeMb: (blob.size / 1024 / 1024).toFixed(1),
      width: settings.width || window.innerWidth,
      height: settings.height || window.innerHeight,
    };
    d.phase = 'done';
  } catch (e) {
    d.phase = 'idle';
    d.error = e && e.name === 'AbortError' ? 'Recording stopped before the end.' : (e.message || 'Something went wrong.');
  } finally {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    stream.getTracks().forEach((t) => t.stop());
    document.removeEventListener('keydown', onKey);
    if (layer) layer.remove();
    document.body.classList.remove('msia-demo-on', 'msia-demo-private');
    if (audioCtx) audioCtx.close().catch(() => {});
    d.abort = null;
    if (MSIA.renderingId === id) MSIA.renderingId = null;
    window.scrollTo(0, 0);
    showPage('msia');
  }
}
