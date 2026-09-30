// Live panel, holographic business card and the bug-squash mini-game.
// Relies on window.SA exposed by main.js (loaded first).
const SA = window.SA;
const $ = id => document.getElementById(id);
const IST = 'Asia/Kolkata';
const isTouch = matchMedia('(hover: none)').matches;

/* ============ Timezone helpers ============ */
function tzOffsetMin(tz, d = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(d).map(p => [p.type, p.value]));
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((asUTC - d.getTime()) / 60000);
}
const fmtTime = (tz, sec) => new Date().toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', ...(sec ? { second: '2-digit' } : {}) });
const fmtDur = m => { const h = Math.floor(Math.abs(m) / 60), mm = Math.abs(m) % 60; return (h ? h + 'h' : '') + (mm ? (h ? ' ' : '') + mm + 'm' : '') || '0m'; };

// Shared 09:00–18:00 working window between two UTC offsets (minutes)
function overlapMin(offA, offB) {
  const a0 = 540 - offA, a1 = 1080 - offA;
  let best = 0;
  for (const shift of [-1440, 0, 1440]) {
    const b0 = 540 - offB + shift, b1 = 1080 - offB + shift;
    best = Math.max(best, Math.min(a1, b1) - Math.max(a0, b0));
  }
  return Math.max(0, best);
}

/* ============ Live: clocks, status, overlap ============ */
const visitorTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const cityOf = tz => ({ Calcutta: 'Kolkata', Bombay: 'Mumbai', Saigon: 'Ho Chi Minh' }[tz.split('/').pop()] || (tz.split('/').pop() || tz).replace(/_/g, ' '));
function statusIST() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: IST, weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).map(p => [p.type, p.value]));
  const h = +parts.hour, weekend = parts.weekday === 'Sat' || parts.weekday === 'Sun';
  if (h >= 23 || h < 7) return ['night', '🌙 Night in Bengaluru — I’ll reply in the morning'];
  if (!weekend && h >= 9 && h < 19) return ['on', '🟢 Working hours here — a great time to reach out'];
  return ['eve', '🟡 Off-hours in Bengaluru — messages welcome'];
}
function tickLive() {
  $('lv-time').textContent = fmtTime(IST, true);
  const [cls, txt] = statusIST();
  const st = $('lv-status'); st.textContent = txt; st.dataset.s = cls;
  $('lv-you').textContent = fmtTime(visitorTz);
  const ist = tzOffsetMin(IST), you = tzOffsetMin(visitorTz), diff = you - ist;
  const ov = overlapMin(ist, you);
  $('lv-overlap').textContent = diff === 0
    ? 'Same timezone as me — full working-day overlap'
    : `You're ${fmtDur(diff)} ${diff > 0 ? 'ahead of' : 'behind'} Bengaluru · ${fmtDur(ov)} of shared working hours`;
  $('lv-bar').style.width = (ov / 540 * 100) + '%';
  // career counter
  const start = new Date('2023-02-01T09:00:00+05:30'), now = new Date();
  let y = now.getFullYear() - start.getFullYear(), m = now.getMonth() - start.getMonth(), d = now.getDate() - start.getDate();
  if (d < 0) { m--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (m < 0) { y--; m += 12; }
  const secs = Math.floor((now - start) / 1000);
  $('lv-ship').innerHTML = `${y}<i>y</i> ${m}<i>m</i> ${d}<i>d</i> <span>${String(Math.floor(secs % 86400 / 3600)).padStart(2, '0')}:${String(Math.floor(secs % 3600 / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}</span>`;
  $('lv-days').textContent = Math.floor(secs / 86400).toLocaleString('en-IN') + ' days';
}
$('lv-tz').textContent = cityOf(visitorTz);
tickLive(); setInterval(tickLive, 1000);

/* ============ Live: Bengaluru weather (Open-Meteo, no key) ============ */
const WX = [[[0], '☀️', 'Clear sky', '🌙'], [[1, 2], '🌤️', 'Partly cloudy', '☁️'], [[3], '☁️', 'Overcast'], [[45, 48], '🌫️', 'Foggy'], [[51, 53, 55, 56, 57], '🌦️', 'Drizzle'],
  [[61, 63, 65, 66, 67], '🌧️', 'Rain'], [[71, 73, 75, 77, 85, 86], '❄️', 'Snow'], [[80, 81, 82], '🌦️', 'Rain showers'], [[95, 96, 99], '⛈️', 'Thunderstorm']];
(async () => {
  try {
    const ctl = new AbortController(); setTimeout(() => ctl.abort(), 6000);
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=12.97&longitude=77.59&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day&timezone=Asia%2FKolkata', { signal: ctl.signal });
    const c = (await r.json()).current;
    const w = WX.find(x => x[0].includes(c.weather_code)) || [[], '🌡️', 'Weather'];
    $('lv-temp').innerHTML = `${Math.round(c.temperature_2m)}°<small>C</small> <span class="wx-ico">${!c.is_day && w[3] ? w[3] : w[1]}</span>`;
    $('lv-wx').textContent = `${w[2]} · feels ${Math.round(c.apparent_temperature)}° · ${c.relative_humidity_2m}% humidity`;
  } catch { $('lv-temp').textContent = '—'; $('lv-wx').textContent = 'Weather feed unavailable right now'; }
})();

/* ============ Live: last deploy from GitHub ============ */
const ago = d => { const s = (Date.now() - d) / 1000; for (const [u, n] of [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]]) if (s >= n) { const v = Math.floor(s / n); return `${v} ${u}${v > 1 ? 's' : ''} ago`; } return 'just now'; };
(async () => {
  try {
    let c; try { c = JSON.parse(sessionStorage.getItem('sa-commit')); } catch {}
    if (!c) {
      const r = await fetch('https://api.github.com/repos/syedabdulla761/syedabdulla761.github.io/commits?per_page=1');
      const j = (await r.json())[0];
      c = { date: j.commit.author.date, msg: j.commit.message.split('\n')[0], sha: j.sha.slice(0, 7), url: j.html_url };
      try { sessionStorage.setItem('sa-commit', JSON.stringify(c)); } catch {}
    }
    $('lv-dep').textContent = ago(new Date(c.date));
    $('lv-msg').innerHTML = `<a href="${c.url}" target="_blank" rel="noopener">${c.sha}</a> ${c.msg.replace(/</g, '&lt;')}`;
  } catch { $('lv-dep').textContent = 'Recently'; $('lv-msg').textContent = 'GitHub API unavailable'; }
})();

/* ============ Live: stats for nerds ============ */
$('lv-pts').textContent = SA.N.toLocaleString('en-IN');
try {
  const gl = SA.renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
  let gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  const m = /ANGLE \(([^,]+),\s*([^,]+)/.exec(gpu); if (m) gpu = m[2].replace(/\((R|TM)\)/gi, '').replace(/\s+(Direct3D|vs_|ps_|OpenGL).*$/i, '').replace(/\s*\(0x[0-9a-f]+\)/i, '').trim();
  $('lv-gpu').textContent = gpu.length > 24 ? gpu.slice(0, 23) + '…' : gpu; $('lv-gpu').title = gpu;
} catch { $('lv-gpu').textContent = 'WebGL'; }
const showLoad = () => { const n = performance.getEntriesByType('navigation')[0]; const ms = n ? (n.loadEventEnd || n.domContentLoadedEventEnd) : performance.now(); $('lv-load').textContent = ms > 1000 ? (ms / 1000).toFixed(2) + 's' : Math.round(ms) + 'ms'; };
document.readyState === 'complete' ? setTimeout(showLoad, 0) : addEventListener('load', () => setTimeout(showLoad, 0));
const spark = $('lv-spark'), sctx = spark.getContext('2d'), hist = [];
function drawSpark() {
  hist.push(SA.fps); if (hist.length > 60) hist.shift();
  $('lv-fps').textContent = SA.fps;
  const w = spark.width = spark.clientWidth * devicePixelRatio, h = spark.height = 40 * devicePixelRatio;
  sctx.clearRect(0, 0, w, h);
  const g = sctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#2dd4bf'); g.addColorStop(1, '#e8b04b');
  sctx.strokeStyle = g; sctx.lineWidth = 2 * devicePixelRatio; sctx.beginPath();
  hist.forEach((v, i) => { const x = i / 59 * w, y = h - Math.min(v, 120) / 120 * (h - 4) - 2; i ? sctx.lineTo(x, y) : sctx.moveTo(x, y); });
  sctx.stroke();
}
setInterval(drawSpark, 500);

/* ============ Holographic business card ============ */
const stage = document.querySelector('.holo-stage'), holo = $('holo');
let flipped = false, rx = 0, ry = 0;
const applyHolo = () => { holo.style.transform = `rotateX(${rx}deg) rotateY(${ry + (flipped ? 180 : 0)}deg)`; };
function setTilt(nx, ny) { // nx, ny in 0..1
  rx = (0.5 - ny) * 22; ry = (nx - 0.5) * 30;
  holo.style.setProperty('--fx', nx * 100 + '%'); holo.style.setProperty('--fy', ny * 100 + '%');
  holo.style.setProperty('--ang', (nx * 180 + 90) + 'deg');
  applyHolo();
}
stage.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; const r = stage.getBoundingClientRect(); setTilt((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); });
stage.addEventListener('pointerleave', () => { rx = ry = 0; applyHolo(); });
const flip = () => { flipped = !flipped; applyHolo(); SA.tone(660, 0.25, 'sine', 0.06, 990); navigator.vibrate?.(10); };
holo.addEventListener('click', flip);
$('flip-btn').addEventListener('click', flip);
if (isTouch) addEventListener('deviceorientation', e => {
  if (e.gamma == null) return;
  setTilt(Math.max(0, Math.min(1, 0.5 + e.gamma / 50)), Math.max(0, Math.min(1, 0.5 + (e.beta - 45) / 50)));
});
// QR code (qrcode-generator, loaded globally) → portfolio URL
try {
  const qr = window.qrcode(0, 'M'); qr.addData('https://syedabdulla761.github.io/'); qr.make();
  $('qr').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
} catch { $('qr').textContent = 'syedabdulla761.github.io'; }

/* ============ Mini-game: squash the bugs ============ */
const game = $('game'), field = $('g-field');
const BUGS = ['🐞', '🐛', '🪲', '🦟'], FEAT = '✨';
let running = false, score = 0, escaped = 0, oops = 0, endAt = 0, lastSpawn = 0, ents = [], raf;
const best = () => { try { return +localStorage.getItem('sa-bugs-best') || 0; } catch { return 0; } };
function openGame() { SA.closeOverlays(); game.hidden = false; $('g-start').hidden = false; $('g-end').hidden = true; $('g-best').textContent = best() ? `Your best: ${best()}` : ''; }
function closeGame() { running = false; cancelAnimationFrame(raf); game.hidden = true; field.innerHTML = ''; ents = []; }
function spawn(now) {
  const el = document.createElement('span'), feature = Math.random() < 0.16;
  el.className = 'bug' + (feature ? ' feat' : ''); el.textContent = feature ? FEAT : BUGS[Math.random() * BUGS.length | 0];
  const W = innerWidth, H = innerHeight, side = Math.random() * 4 | 0;
  const x = [Math.random() * W, W + 30, Math.random() * W, -30][side], y = [-30, Math.random() * H, H + 30, Math.random() * H][side];
  const tx = W * (0.2 + Math.random() * 0.6), ty = H * (0.2 + Math.random() * 0.6), ang = Math.atan2(ty - y, tx - x);
  const speed = (feature ? 1.3 : 1.6 + Math.random() * 1.6) * (1 + (now - (endAt - 20000)) / 20000) * (W < 600 ? 0.8 : 1);
  const ent = { el, x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, feature, wob: Math.random() * 6, dead: false };
  el.addEventListener('pointerdown', e => { e.stopPropagation(); squash(ent, e); });
  field.appendChild(el); ents.push(ent);
}
function pop(x, y, txt, cls) { const f = document.createElement('b'); f.className = 'g-pop ' + cls; f.textContent = txt; f.style.left = x + 'px'; f.style.top = y + 'px'; field.appendChild(f); setTimeout(() => f.remove(), 700); }
function squash(ent, e) {
  if (ent.dead || !running) return;
  ent.dead = true; ent.el.classList.add('splat');
  setTimeout(() => ent.el.remove(), 400);
  if (ent.feature) { oops++; score = Math.max(0, score - 3); pop(ent.x, ent.y, '−3 feature!', 'bad'); navigator.vibrate?.([30, 40, 30]); SA.tone(160, 0.3, 'square', 0.05, 80); game.classList.add('shake'); setTimeout(() => game.classList.remove('shake'), 300); }
  else { score++; pop(ent.x, ent.y, '+1', 'good'); navigator.vibrate?.(12); SA.tone(520 + score * 12, 0.12, 'triangle', 0.07, 1200); }
  $('g-score').textContent = score;
}
function loop(now) {
  if (!running) return;
  const left = Math.max(0, endAt - now);
  $('g-time').textContent = Math.ceil(left / 1000);
  const interval = 650 - (1 - left / 20000) * 380;
  if (now - lastSpawn > interval) { spawn(now); lastSpawn = now; }
  for (const b of ents) {
    if (b.dead) continue;
    b.wob += 0.15; b.x += b.vx + Math.sin(b.wob) * 0.8; b.y += b.vy + Math.cos(b.wob) * 0.8;
    b.el.style.transform = `translate(${b.x}px,${b.y}px) translate(-50%,-50%) rotate(${Math.atan2(b.vy, b.vx) * 57.3 + 90 + Math.sin(b.wob) * 12}deg)`;
    if (b.x < -60 || b.x > innerWidth + 60 || b.y < -60 || b.y > innerHeight + 60) { b.dead = true; b.el.remove(); if (!b.feature) escaped++; }
  }
  ents = ents.filter(b => !b.dead || b.el.isConnected);
  if (left <= 0) return finish();
  raf = requestAnimationFrame(loop);
}
function start() {
  field.innerHTML = ''; ents = []; score = escaped = oops = 0; $('g-score').textContent = 0;
  $('g-start').hidden = true; $('g-end').hidden = true;
  running = true; endAt = performance.now() + 20000; lastSpawn = 0;
  SA.tone(440, 0.15, 'triangle', 0.08, 880);
  raf = requestAnimationFrame(loop);
}
function finish() {
  running = false; field.querySelectorAll('.bug').forEach(b => b.classList.add('flee'));
  const prev = best(); if (score > prev) try { localStorage.setItem('sa-bugs-best', score); } catch {}
  const rank = score >= 30 ? 'Principal Bug Hunter 🏆' : score >= 20 ? 'Senior Debugger 💪' : score >= 10 ? 'Solid Engineer 👍' : 'The bugs won this round 😅';
  $('g-title').textContent = rank;
  $('g-msg').innerHTML = `You squashed <b>${score}</b> bug${score === 1 ? '' : 's'}${escaped ? ` · ${escaped} escaped` : ''}${oops ? ` · ${oops} feature${oops > 1 ? 's' : ''} broken` : ''}${score > prev && prev ? ' · <b>new best!</b>' : ''}.<br>Syed has squashed <b>90+ production bugs</b> and shipped <b>89 backports</b> across 11 releases — without breaking features.`;
  $('g-end').hidden = false;
  SA.tone(330, 0.5, 'sine', 0.1, 660);
}
$('game-btn').addEventListener('click', openGame);
$('g-go').addEventListener('click', start);
$('g-again').addEventListener('click', start);
$('g-x').addEventListener('click', closeGame);
$('g-hire').addEventListener('click', () => closeGame());
addEventListener('keydown', e => { if (e.key === 'Escape' && !game.hidden) closeGame(); });

/* ============ Gesture hint (first visit) ============ */
const hint = $('ghint');
setTimeout(() => hint.classList.add('show'), 2600);
setTimeout(() => hint.classList.remove('show'), 11000);
hint.addEventListener('click', () => hint.classList.remove('show'));

/* ============ Palette entries ============ */
SA.actions.push(
  { g: 'Play', i: '🐞', l: 'Play: squash the bugs', k: 'game fun mini', run: openGame },
  { g: 'Play', i: '💳', l: 'Flip the holographic card', k: 'business card qr', run: () => { $('contact').scrollIntoView({ behavior: 'smooth' }); setTimeout(flip, 700); } },
  { g: 'Play', i: '📇', l: 'Save contact to phone (vCard)', k: 'vcf contact save', run: () => { location.href = 'Syed_Abdulla.vcf'; } },
  { g: 'Play', i: '📡', l: 'Live from Bengaluru', k: 'weather time now live', run: () => $('live').scrollIntoView({ behavior: 'smooth' }) },
);
