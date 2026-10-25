/* Time. Screen clocks. Series 01. No dependencies, no trackers. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const p2 = n => String(n).padStart(2, '0');
const TAU = Math.PI * 2;
const params = new URLSearchParams(location.search);

/* ---------- number words ---------- */
const EN1 = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const EN10 = ['','','twenty','thirty','forty','fifty'];
const en = n => n < 20 ? EN1[n] : EN10[Math.floor(n / 10)] + (n % 10 ? '-' + EN1[n % 10] : '');
const FR1 = ['zéro','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf'];
const FR10 = ['','','vingt','trente','quarante','cinquante'];
const fr = (n, fem) => {
  let w;
  if (n < 20) w = FR1[n];
  else { const t = Math.floor(n / 10), u = n % 10; w = FR10[t] + (u === 0 ? '' : u === 1 ? ' et un' : '-' + FR1[u]); }
  return fem ? w.replace(/(^|\s)un$/, '$1une') : w;
};
function wordsEN(d) {
  const H = d.getHours(), M = d.getMinutes(), S = d.getSeconds();
  let hour = en(H % 12 || 12);
  if (M === 0 && H === 0) hour = 'midnight';
  if (M === 0 && H === 12) hour = 'noon';
  const min = M === 0 ? ((H === 0 || H === 12) ? '' : "o'clock") : M < 10 ? 'oh ' + en(M) : en(M);
  const sec = S === 0 ? 'exactly' : S === 1 ? 'and one second' : 'and ' + en(S) + ' seconds';
  const per = (H === 0 || H === 12) && M === 0 ? '' : H < 5 ? 'at night' : H < 12 ? 'in the morning' : H < 18 ? 'in the afternoon' : H < 22 ? 'in the evening' : 'at night';
  return { lines: [hour, min].filter(Boolean), sec, per };
}
function wordsFR(d) {
  const H = d.getHours(), M = d.getMinutes(), S = d.getSeconds();
  const hour = H === 0 ? 'minuit' : H === 12 ? 'midi' : H === 1 ? 'une heure' : fr(H) + ' heures';
  const min = M === 0 ? '' : fr(M, true);
  const sec = S === 0 ? 'pile' : 'et ' + fr(S, true) + (S === 1 ? ' seconde' : ' secondes');
  return { lines: [hour, min].filter(Boolean), sec, per: '' };
}

/* ---------- shared helpers ---------- */
const tzOffset = d => { const o = -d.getTimezoneOffset(), s = o >= 0 ? '+' : '-', a = Math.abs(o); return s + p2(Math.floor(a / 60)) + ':' + p2(a % 60); };
const isoLocal = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}${tzOffset(d)}`;
const dayOfYear = d => Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(d.getFullYear(), 0, 0)) / 864e5);
const msOfDay = d => ((d.getHours() * 60 + d.getMinutes()) * 60 + d.getSeconds()) * 1000 + d.getMilliseconds();
function flash(el, text) {
  if (el.textContent === text) return;
  el.textContent = text;
  el.classList.remove('fade'); el.classList.add('chg');
  requestAnimationFrame(() => requestAnimationFrame(() => { el.classList.add('fade'); el.classList.remove('chg'); }));
}

/* ======================================================================
   01  TIME DILATION
   Seconds within each minute follow f(x) = x - a·sin(2πx)/2π.
   f(0)=0, f(1)=1, monotonic (a<1): slow around the minute, fast mid-minute.
   ====================================================================== */
const A = 0.85;
const dilF = x => x - A * Math.sin(TAU * x) / TAU;
const dilRate = x => 1 - A * Math.cos(TAU * x);
const dilInv = y => { let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; dilF(m) < y ? lo = m : hi = m; } return (lo + hi) / 2; };
const DIL_X = Array.from({ length: 61 }, (_, i) => dilInv(i / 60));
function dilState(d) {
  const x = (d.getSeconds() + d.getMilliseconds() / 1000) / 60;
  const disp = Math.min(59.999, 60 * dilF(x));
  return { x, disp, sec: Math.floor(disp), rate: dilRate(x), drift: disp - 60 * x };
}
const dilation = {
  id: 'dilation', title: 'Time dilation', desc: 'Uneven seconds, exact minutes.',
  preview(d) { return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(dilState(d).sec)}`; },
  mount(root) {
    root.className = 'clk dil';
    root.innerHTML = `<div class="d-comp"><div class="d-time"><span class="d-hm"></span>:<span class="d-s"></span></div>
      <canvas></canvas><div class="d-meta"></div></div>
      <div><p class="caption"><b>Time dilation.</b> Every minute lasts exactly sixty seconds, but its seconds are not equal. They crawl as the minute turns and rush through the middle. Hours and minutes are always exact; the seconds lag, lead, then land on time.</p></div>`;
    this.hm = $('.d-hm', root); this.s = $('.d-s', root); this.meta = $('.d-meta', root);
    this.cv = $('canvas', root); this.ctx = this.cv.getContext('2d'); this.last = {};
  },
  resize() { const r = this.cv.getBoundingClientRect(), k = devicePixelRatio || 1; this.cv.width = Math.round(r.width * k); this.cv.height = Math.round(r.height * k); this.k = k; },
  frame(d) {
    const st = dilState(d);
    const hm = `${p2(d.getHours())}:${p2(d.getMinutes())}`;
    if (this.last.hm !== hm) this.hm.textContent = this.last.hm = hm;
    const ss = p2(st.sec);
    if (this.last.ss !== ss) this.s.textContent = this.last.ss = ss;
    // white where time crawls (around :00), real red where it rushes (mid-minute); continuous with the rate
    const t = Math.min(1, Math.max(0, (st.rate - (1 - A)) / (2 * A)));
    const col = `rgb(255,${Math.round(255 - 213 * t)},${Math.round(255 - 229 * t)})`;
    this.s.style.color = col; this.col = col;
    const dr = ((st.drift >= 0 ? '+' : '−') + Math.abs(st.drift).toFixed(1)).padStart(5, ' ');
    this.meta.innerHTML = `drift  <b style="color:${this.col}">${dr} s</b>   rate  ${st.rate.toFixed(2)}×`;
    this.draw(st);
  },
  draw(st) {
    const kk = devicePixelRatio || 1;
    if (Math.round(this.cv.clientWidth * kk) !== this.cv.width || Math.round(this.cv.clientHeight * kk) !== this.cv.height) this.resize();
    const c = this.ctx, W = this.cv.width, H = this.cv.height, k = this.k || 1;
    if (!W) return;
    c.clearRect(0, 0, W, H);
    const top = 12 * k, bot = H - 2 * k, pad = 1 * k, w = W - 2 * pad;
    c.font = `${10 * k}px ui-monospace,monospace`; c.fillStyle = '#555'; c.textBaseline = 'top';
    [0, 15, 30, 45].forEach(i => c.fillText(String(i), pad + i / 60 * w + 2 * k, 0));
    c.lineWidth = Math.max(1, k);
    for (let i = 0; i <= 60; i++) {
      const xt = pad + i / 60 * w, xb = pad + DIL_X[i] * w;
      c.strokeStyle = i <= st.sec ? '#cfcfcf' : '#2c2c2c';
      if (i === 60) c.strokeStyle = '#2c2c2c';
      c.beginPath(); c.moveTo(xt, top); c.lineTo(xb, bot); c.stroke();
    }
    c.strokeStyle = '#FF2A1A'; c.lineWidth = 2 * k;
    c.beginPath(); c.moveTo(pad + st.disp / 60 * w, top - 3 * k); c.lineTo(pad + st.x * w, bot); c.stroke();
    c.fillStyle = '#FF2A1A'; c.fillRect(pad + st.x * w - 3 * k, bot - 1 * k, 6 * k, 3 * k);
  }
};

/* ======================================================================
   02  TIME CODE   SMPTE HH:MM:SS:FF @ 25 fps (EBU, non-drop)
   ====================================================================== */
const tcOf = d => { const ms = msOfDay(d); return { ff: Math.floor((ms % 1000) / 40), frames: Math.floor(ms / 40) }; };
const timecode = {
  id: 'timecode', title: 'Time code', desc: 'Broadcast timecode, 25 frames a second.',
  preview(d) { return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}:${p2(tcOf(d).ff)}`; },
  mount(root) {
    root.className = 'clk tc';
    const cell = (k, cls) => `<div class="s-cell"><span class="s-k">${k}</span><span class="s-v ${cls}"></span></div>`;
    root.innerHTML = `<div class="slate"><div class="clap"></div>
      <div class="s-row">${cell('Prod.', 'v-prod')}${cell('Roll', 'v-roll')}${cell('Scene', 'v-scene')}${cell('Take', 'v-take')}</div>
      <div class="s-row"><div class="s-cell s-tc"><div class="tcd"></div><div class="fbar">${'<i></i>'.repeat(25)}</div></div></div>
      <div class="s-row">${cell('Date', 'v-date')}${cell('Zone', 'v-tz')}${cell('Frame', 'v-fr')}${cell('<span class="rec"></span>25 fps', 'v-fps')}</div>
    </div>
    <p class="caption"><b>Time code.</b> The time of day as broadcast SMPTE timecode: hours, minutes, seconds and frames, 25 to the second. The slate claps on every minute.</p>`;
    this.q = s => $(s, root);
    this.q('.v-prod').textContent = 'TIME.';
    this.q('.v-fps').textContent = 'EBU ND';
    this.tcd = this.q('.tcd'); this.bars = [...root.querySelectorAll('.fbar i')];
    this.clap = this.q('.clap'); this.rec = this.q('.rec');
    this.tcd.innerHTML = '<span class="hh"></span><span class="sep">:</span><span class="mm"></span><span class="sep">:</span><span class="ss"></span><span class="sep">:</span><span class="ff"></span>';
    this.el = { hh: this.q('.hh'), mm: this.q('.mm'), ss: this.q('.ss'), ff: this.q('.ff') };
    this.last = {};
  },
  set(k, v) { if (this.last[k] !== v) { this.last[k] = v; (this.el[k] || this.q('.v-' + k)).textContent = v; } },
  frame(d) {
    const { ff, frames } = tcOf(d);
    if (this.last.frames === frames) return;
    this.last.frames = frames;
    this.set('hh', p2(d.getHours())); this.set('mm', p2(d.getMinutes())); this.set('ss', p2(d.getSeconds())); this.set('ff', p2(ff));
    this.set('roll', 'A' + String(dayOfYear(d)).padStart(3, '0'));
    this.set('scene', p2(d.getHours())); this.set('take', String(d.getMinutes() + 1));
    this.set('date', `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}`);
    this.set('tz', 'UTC' + tzOffset(d)); this.set('fr', String(frames).padStart(7, '0'));
    this.bars.forEach((b, i) => { b.className = i === ff ? 'on' : i < ff ? 'past' : ''; });
    this.clap.classList.toggle('open', d.getSeconds() === 59 && ff >= 13);
    this.rec.classList.toggle('off', ff >= 13);
  }
};

/* ======================================================================
   03  HTML. TIME.
   ====================================================================== */
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const html = {
  id: 'html', title: 'HTML. Time.', desc: 'The time as live markup.',
  preview(d) { return `<time>\n  ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}\n</time>`; },
  mount(root) {
    root.className = 'clk html';
    const P = s => `<span class="tk-p">${s}</span>`;
    const L = (n, inner, cls = '') => `<div class="ln ${cls}"><span class="no">${n}</span><span class="src">${inner}</span></div>`;
    root.innerHTML = `<div class="code">${[L(1, '<span class="tk-c">&lt;!-- HTML. Time. --&gt;</span>'),
      L(2, P('&lt;') + '<span class="tk-t">time</span>'),
      L(3, '  <span class="tk-a">datetime</span>' + P('=') + '<span class="tk-q">"</span><span class="tk-s dt"><span class="g-d"></span>T<span class="g-h"></span>:<span class="g-m"></span>:<span class="g-s"></span><span class="g-z"></span></span><span class="tk-q">"</span>'),
      L(4, '  <span class="tk-a">title</span>' + P('=') + '<span class="tk-q">"</span><span class="tk-s g-t"></span><span class="tk-q">"</span>' + P('&gt;')),
      L(5, '  <span class="txt"><span class="g-txt"></span><span class="caret"></span></span>', 'big'),
      L(6, P('&lt;/') + '<span class="tk-t">time</span>' + P('&gt;'))].join('')}</div>
    <p class="caption"><b>HTML. Time.</b> The clock as its own source code: a valid HTML &lt;time&gt; element, rewritten every second. Changed characters light up.</p>`;
    this.root = root; this.code = $('.code', root);
    this.g = {}; ['d', 'h', 'm', 's', 'z', 't', 'txt'].forEach(k => this.g[k] = $('.g-' + k, root));
  },
  resize() {
    const r = this.root.getBoundingClientRect();
    // longest small line ≈ 45 ch incl. gutter; mono ≈ 0.6em per ch
    const cs = Math.max(11, Math.min(28, r.width / (46 * 0.61), r.height / 16));
    const bs = Math.max(cs * 1.5, Math.min((r.width - 7 * cs * 0.61) / (8.6 * 0.62), (r.height - cs * 1.55 * 5 - 90) / 1.15));
    this.code.style.setProperty('--cs', cs.toFixed(1) + 'px');
    this.code.style.setProperty('--bs', bs.toFixed(1) + 'px');
  },
  frame(d) {
    const sec = d.getSeconds();
    if (this.lastS === sec && this.lastT) return;
    this.lastS = sec; this.lastT = 1;
    const g = this.g;
    flash(g.d, `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`);
    flash(g.h, p2(d.getHours())); flash(g.m, p2(d.getMinutes())); flash(g.s, p2(sec)); flash(g.z, tzOffset(d));
    flash(g.t, `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`);
    g.txt.textContent = `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(sec)}`;
  }
};

/* ======================================================================
   04  TIME STOP
   Runs, then now and then stops dead for a moment, then races to catch up.
   Hold anywhere to stop it yourself.
   ====================================================================== */
const rand = (a, b) => a + Math.random() * (b - a);
const stop = {
  id: 'stop', title: 'Time stop', desc: 'Freezes, then catches up. Hold to stop.',
  holdToStop: true,
  preview(d) { return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`; },
  mount(root) {
    root.className = 'clk stp';
    let ticks = '';
    for (let i = 0; i < 60; i++) {
      const big = i % 5 === 0;
      ticks += `<rect x="${big ? -3.2 : -0.9}" y="${big ? -97 : -97}" width="${big ? 6.4 : 1.8}" height="${big ? 24 : 7}" fill="#fff" transform="rotate(${i * 6})"/>`;
    }
    root.innerHTML = `<svg viewBox="-104 -104 208 208" aria-label="Clock">
      <circle r="103" fill="none" stroke="#1c1c1c" stroke-width="1"/>
      ${ticks}
      <g class="hh"><rect x="-4.6" y="-58" width="9.2" height="72" fill="#fff"/></g>
      <g class="mh"><rect x="-3.4" y="-90" width="6.8" height="110" fill="#fff"/></g>
      <g class="sh"><rect x="-1" y="-62" width="2" height="90" fill="#FF4D00"/><circle cy="-64" r="7.5" fill="#FF4D00"/><circle r="2.2" fill="#FF4D00"/></g>
    </svg>
    <div class="s-side">
      <div class="s-read"><b class="s-dig"></b><span class="s-state"></span></div>
      <p class="caption"><b>Time stop.</b> Now and then the clock stops dead, then races to catch up. Hold the screen to stop it yourself. It never loses a second.</p>
    </div>`;
    this.hh = $('.hh', root); this.mh = $('.mh', root); this.sh = $('.sh', root);
    this.dig = $('.s-dig', root); this.stEl = $('.s-state', root);
    const now = Date.now();
    this.D = now; this.mode = 'run'; this.lastNow = now; this.held = false;
    this.nextAt = now + rand(6000, 11000);
    root.addEventListener('pointerdown', () => { this.held = true; this.freeze(Date.now(), Infinity); });
    const up = () => { if (!this.held) return; this.held = false; this.mode = 'catch'; };
    root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up); root.addEventListener('pointerleave', up);
  },
  freeze(now, dur) { if (this.mode !== 'stop') { this.mode = 'stop'; this.stopStart = now; } this.stopUntil = now + dur; },
  frame(d) {
    const now = d.getTime(), dt = Math.min(100, now - this.lastNow); this.lastNow = now;
    if (this.mode === 'run') {
      this.D = now;
      if (now >= this.nextAt) this.freeze(now, rand(1500, 6000));
    } else if (this.mode === 'stop') {
      if (!this.held && now >= this.stopUntil) this.mode = 'catch';
    }
    if (this.mode === 'catch') {
      const gap = now - this.D;
      this.D += Math.max(gap * (1 - Math.exp(-dt / 160)), Math.min(gap, dt * 2));
      if (now - this.D < 6) { this.D = now; this.mode = 'run'; this.nextAt = now + rand(14000, 42000); }
    }
    const t = new Date(this.D);
    const s = t.getSeconds() + t.getMilliseconds() / 1000, m = t.getMinutes() + s / 60, hr = (t.getHours() % 12) + m / 60;
    this.sh.setAttribute('transform', `rotate(${(s * 6).toFixed(2)})`);
    this.mh.setAttribute('transform', `rotate(${(m * 6).toFixed(2)})`);
    this.hh.setAttribute('transform', `rotate(${(hr * 30).toFixed(2)})`);
    const dig = `${p2(t.getHours())}:${p2(t.getMinutes())}:${p2(t.getSeconds())}`;
    if (this.lastDig !== dig) this.dig.textContent = this.lastDig = dig;
    let st = 'running', cls = '';
    if (this.mode === 'stop') { st = 'stopped ' + ((now - this.stopStart) / 1000).toFixed(1) + ' s'; cls = 'stopped'; }
    else if (this.mode === 'catch') st = 'catching up −' + ((now - this.D) / 1000).toFixed(1) + ' s';
    this.stEl.textContent = st; this.stEl.className = 's-state ' + cls;
  }
};

/* ======================================================================
   05  TIME TIME   the time in words
   ====================================================================== */
let lang = localStorage.getItem('tc-lang') || ((navigator.language || '').startsWith('fr') ? 'fr' : 'en');
const words = {
  id: 'words', title: 'Time time', desc: 'The time, spelled out.',
  preview(d) { return wordsEN(d).lines.join('\n'); },
  mount(root) {
    root.className = 'clk wrd';
    root.innerHTML = `<div class="w-box"></div><div class="w-foot"><p class="caption"><b>Time time.</b> The time, said the way you would say it. Spelled out in full, every second.</p><button class="lang"></button></div>`;
    this.box = $('.w-box', root); this.btn = $('.lang', root);
    this.btn.addEventListener('pointerdown', e => e.stopPropagation());
    this.btn.addEventListener('pointerup', e => e.stopPropagation());
    this.btn.addEventListener('click', e => { e.stopPropagation(); lang = lang === 'en' ? 'fr' : 'en'; localStorage.setItem('tc-lang', lang); this.key = null; this.paint(); });
    this.paint();
  },
  paint() {
    this.btn.innerHTML = lang === 'en' ? '<b>EN</b> <span>/ FR</span>' : '<span>EN /</span> <b>FR</b>';
    this.key = null; this.frame(new Date());
  },
  resize() { this.key = null; this.frame(new Date()); },
  frame(d) {
    const w = (lang === 'fr' ? wordsFR : wordsEN)(d);
    const key = lang + w.lines.join('|') + w.sec + w.per;
    if (key === this.key) return; this.key = key;
    const phr = w.lines.map(t => [t, '']).concat([[w.sec, 'a']]); if (w.per) phr.push([w.per, 's']);
    const wordy = []; phr.forEach(([t, c]) => t.split(' ').forEach(x => wordy.push([x, c])));
    const render = ls => { this.box.innerHTML = ls.map(([t, c]) => `<div class="w-l ${c}">${t}</div>`).join(''); return this.fit(); };
    const a = render(wordy), b = render(phr);
    if (a > b * 1.08) render(wordy);
  },
  fit() {
    const box = this.box, W = box.clientWidth, H = box.clientHeight; if (!W || !H) return 0;
    box.style.fontSize = '100px';
    let maxW = 0; for (const el of box.children) maxW = Math.max(maxW, el.scrollWidth);
    const totalH = box.scrollHeight;
    const k = Math.min(W / maxW, H / totalH) * 0.98;
    const fs = Math.min(100 * k, 260); box.style.fontSize = fs.toFixed(1) + 'px'; return fs;
  }
};

/* ======================================================================
   SHELL
   ====================================================================== */
const CLOCKS = [dilation, timecode, html, stop, words];
const ixView = $('#index'), ckView = $('#clock'), stage = $('#stage'), grid = $('#grid');
let cur = null, curIdx = -1, enteredFromIndex = false;

CLOCKS.forEach((c, i) => {
  const a = h('a', 'tile');
  a.href = '#/' + c.id;
  a.innerHTML = `<div class="t-n"><span>${p2(i + 1)}</span></div><div class="t-prev"></div><div><div class="t-title">${c.title}</div><div class="t-desc">${c.desc}</div></div>`;
  a.addEventListener('click', () => { enteredFromIndex = true; });
  c.tile = $('.t-prev', a);
  grid.appendChild(a);
});
{
  const a = h('a', 'tile wall');
  a.href = '?kiosk=1&cycle=60#/' + CLOCKS[0].id;
  a.innerHTML = `<div class="t-n"><span>↻</span></div><div class="t-prev">01 → 05\nevery 60 s</div><div><div class="t-title">Wall mode</div><div class="t-desc">All five in turn, no controls. For the Raspberry Pi.</div></div>`;
  grid.appendChild(a);
}

function show(idx, dir = 0) {
  if (cur && cur.unmount) cur.unmount();
  cur = CLOCKS[idx]; curIdx = idx;
  const root = h('div'); stage.replaceChildren(root);
  cur.mount(root);
  $('#c-title').innerHTML = `<span>${p2(idx + 1)}</span>${cur.title}`;
  $('#c-count').textContent = `${idx + 1}/${CLOCKS.length}`;
  document.title = cur.title + ' · Time.';
  root.animate && root.animate([{ opacity: 0, transform: `translateX(${dir * 24}px)` }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.7,.2,1)' });
  requestAnimationFrame(() => { cur.resize && cur.resize(); });
}

function route() {
  const id = location.hash.replace(/^#\/?/, '');
  const idx = CLOCKS.findIndex(c => c.id === id);
  if (idx < 0) {
    if (cur && cur.unmount) cur.unmount();
    cur = null; curIdx = -1; stage.replaceChildren();
    ckView.hidden = true; ixView.hidden = false; document.title = 'Time. Screen clocks';
    releaseWake();
  } else {
    const dir = curIdx < 0 ? 0 : (idx > curIdx ? 1 : -1);
    ixView.hidden = true; ckView.hidden = false;
    if (idx !== curIdx) show(idx, dir);
    requestWake(); poke();
  }
}
function go(delta) {
  if (curIdx < 0) return;
  const n = (curIdx + delta + CLOCKS.length) % CLOCKS.length;
  location.replace('#/' + CLOCKS[n].id);
}
function toIndex() { if (enteredFromIndex && history.length > 1) history.back(); else location.replace('#/'); }
$('#back').addEventListener('click', e => { e.preventDefault(); toIndex(); });
window.addEventListener('hashchange', route);

/* fullscreen */
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
function toggleFS() {
  const de = document.documentElement;
  if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  else { const r = de.requestFullscreen || de.webkitRequestFullscreen; if (r) { const p = r.call(de, { navigationUI: 'hide' }); p && p.catch && p.catch(() => {}); } }
}
$('#fs').addEventListener('click', e => { e.stopPropagation(); toggleFS(); });
['pointerdown', 'pointerup'].forEach(t => $('#chrome').addEventListener(t, e => e.stopPropagation()));

/* chrome auto-hide */
let idleT;
function poke() { ckView.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => ckView.classList.add('idle'), 2600); }
ckView.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') poke(); });

/* gestures: swipe to switch, tap for fullscreen */
let g0 = null;
ckView.addEventListener('pointerdown', e => { g0 = { x: e.clientX, y: e.clientY, t: performance.now() }; poke(); });
ckView.addEventListener('pointerup', e => {
  if (!g0) return;
  const dx = e.clientX - g0.x, dy = e.clientY - g0.y, dt = performance.now() - g0.t; g0 = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) { go(dx < 0 ? 1 : -1); return; }
  if (Math.hypot(dx, dy) < 10 && dt < 350 && cur && !cur.holdToStop) toggleFS();
});
ckView.addEventListener('pointercancel', () => { g0 = null; });

/* keys */
window.addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (curIdx < 0) {
    if (e.key === 'ArrowRight' || e.key === 'Enter') location.hash = '#/' + CLOCKS[0].id;
    return;
  }
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') { go(1); poke(); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') { go(-1); poke(); }
  else if (e.key === 'f' || e.key === 'F') toggleFS();
  else if (e.key === 'Escape' && !fsEl()) toIndex();
  else if (e.key === 'Backspace') toIndex();
});

/* wake lock */
let wake = null;
async function requestWake() {
  try { if ('wakeLock' in navigator && !wake && document.visibilityState === 'visible') { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (_) { wake = null; }
}
function releaseWake() { if (wake) { wake.release().catch(() => {}); wake = null; } }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && curIdx >= 0) requestWake(); });

/* resize */
let rzT;
window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => cur && cur.resize && cur.resize(), 60); });

/* kiosk / cycle for a wall display: ?kiosk=1&cycle=60 */
if (params.get('kiosk')) document.body.classList.add('kiosk');
const cycle = parseFloat(params.get('cycle'));
if (cycle > 0) {
  if (curIdx < 0 && !location.hash.replace(/^#\/?/, '')) location.replace('#/' + CLOCKS[0].id);
  setInterval(() => go(1), Math.max(5, cycle) * 1000);
}

/* one loop for everything */
let lastPrev = 0;
function loop() {
  const d = new Date();
  if (cur) { try { cur.frame(d); } catch (err) { console.error(err); } }
  else if (!ixView.hidden && d - lastPrev > 40) {
    lastPrev = +d;
    for (const c of CLOCKS) { const t = c.preview(d); if (c.tile.textContent !== t) c.tile.textContent = t; }
  }
  requestAnimationFrame(loop);
}
route();
requestAnimationFrame(loop);

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
