// Live panel, holographic business card and the exploration game (hidden bugs + achievements).
// Relies on window.SA exposed by main.js (loaded first).
const SA = window.SA;
const $ = id => document.getElementById(id);
const IST = 'Asia/Kolkata';
const isTouch = matchMedia('(hover: none)').matches;
const isAr = () => document.documentElement.lang === 'ar';
// Arabic counted nouns: 1, 2 (dual), 3–10 (plural), 11+ (singular accusative)
const arCount = (n, [one, two, few, many]) => n === 1 ? one : n === 2 ? two : n <= 10 ? `${n} ${few}` : `${n} ${many}`;

/* ============ Timezone helpers ============ */
function tzOffsetMin(tz, d = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(d).map(p => [p.type, p.value]));
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((asUTC - d.getTime()) / 60000);
}
const fmtTime = (tz, sec) => new Date().toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', ...(sec ? { second: '2-digit' } : {}) });
const fmtDurAr = m => { const h = Math.floor(Math.abs(m) / 60), mm = Math.abs(m) % 60; return [h && h + ' س', mm && mm + ' د'].filter(Boolean).join(' ') || '0 د'; };
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
  const ar = isAr();
  if (h >= 23 || h < 7) return ['night', ar ? '🌙 الوقت ليل في بنغالورو — سأرد صباحًا' : '🌙 Night in Bengaluru — I’ll reply in the morning'];
  if (!weekend && h >= 9 && h < 19) return ['on', ar ? '🟢 ساعات العمل هنا — وقت مثالي للتواصل' : '🟢 Working hours here — a great time to reach out'];
  return ['eve', ar ? '🟡 خارج ساعات العمل في بنغالورو — رسائلك مرحّب بها' : '🟡 Off-hours in Bengaluru — messages welcome'];
}
function tickLive() {
  $('lv-time').textContent = fmtTime(IST, true);
  const [cls, txt] = statusIST();
  const st = $('lv-status'); st.textContent = txt; st.dataset.s = cls;
  $('lv-you').textContent = fmtTime(visitorTz);
  const ist = tzOffsetMin(IST), you = tzOffsetMin(visitorTz), diff = you - ist;
  const ov = overlapMin(ist, you);
  $('lv-overlap').textContent = isAr()
    ? (diff === 0 ? 'نفس منطقتي الزمنية — تداخل كامل في يوم العمل' : `أنت ${diff > 0 ? 'تسبق' : 'تتأخر عن'} بنغالورو بـ ${fmtDurAr(diff)} · ${fmtDurAr(ov)} من ساعات العمل المشتركة`)
    : (diff === 0 ? 'Same timezone as me — full working-day overlap' : `You're ${fmtDur(diff)} ${diff > 0 ? 'ahead of' : 'behind'} Bengaluru · ${fmtDur(ov)} of shared working hours`);
  $('lv-bar').style.width = (ov / 540 * 100) + '%';
  // career counter
  const start = new Date('2023-02-20T09:00:00+05:30'), now = new Date();
  let y = now.getFullYear() - start.getFullYear(), m = now.getMonth() - start.getMonth(), d = now.getDate() - start.getDate();
  if (d < 0) { m--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (m < 0) { y--; m += 12; }
  const secs = Math.floor((now - start) / 1000);
  const [uy, um, ud] = isAr() ? ['س', 'ش', 'ي'] : ['y', 'm', 'd'];
  $('lv-ship').innerHTML = `${y}<i>${uy}</i> ${m}<i>${um}</i> ${d}<i>${ud}</i> <span>${String(Math.floor(secs % 86400 / 3600)).padStart(2, '0')}:${String(Math.floor(secs % 3600 / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}</span>`;
  const days = Math.floor(secs / 86400);
  $('lv-days').textContent = days.toLocaleString('en-IN') + (isAr() ? ' يومًا' : ' days');
}
$('lv-tz').textContent = cityOf(visitorTz);
tickLive(); setInterval(tickLive, 1000);

/* ============ Live: Bengaluru weather (Open-Meteo, no key) ============ */
const WX = [[[0], '☀️', 'Clear sky', '🌙', 'سماء صافية'], [[1, 2], '🌤️', 'Partly cloudy', '☁️', 'غائم جزئيًا'], [[3], '☁️', 'Overcast', null, 'غائم'], [[45, 48], '🌫️', 'Foggy', null, 'ضبابي'], [[51, 53, 55, 56, 57], '🌦️', 'Drizzle', null, 'رذاذ'],
  [[61, 63, 65, 66, 67], '🌧️', 'Rain', null, 'ممطر'], [[71, 73, 75, 77, 85, 86], '❄️', 'Snow', null, 'ثلوج'], [[80, 81, 82], '🌦️', 'Rain showers', null, 'زخات مطر'], [[95, 96, 99], '⛈️', 'Thunderstorm', null, 'عاصفة رعدية']];
let wxNow = null, wxFailed = false;
function renderWx() {
  if (wxFailed) { $('lv-temp').textContent = '—'; $('lv-wx').textContent = isAr() ? 'بيانات الطقس غير متاحة حاليًا' : 'Weather feed unavailable right now'; return; }
  if (!wxNow) return;
  const c = wxNow, w = WX.find(x => x[0].includes(c.weather_code)) || [[], '🌡️', 'Weather', null, 'الطقس'];
  $('lv-temp').innerHTML = `${Math.round(c.temperature_2m)}°<small>C</small> <span class="wx-ico">${!c.is_day && w[3] ? w[3] : w[1]}</span>`;
  $('lv-wx').textContent = isAr()
    ? `${w[4]} · الحرارة المحسوسة ${Math.round(c.apparent_temperature)}° · الرطوبة ${c.relative_humidity_2m}%`
    : `${w[2]} · feels ${Math.round(c.apparent_temperature)}° · ${c.relative_humidity_2m}% humidity`;
}
(async () => {
  try {
    const ctl = new AbortController(); setTimeout(() => ctl.abort(), 6000);
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=12.97&longitude=77.59&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day&timezone=Asia%2FKolkata', { signal: ctl.signal });
    wxNow = (await r.json()).current; renderWx();
  } catch { wxFailed = true; renderWx(); }
})();

/* ============ Live: last deploy from GitHub ============ */
const AR_UNITS = { year: ['منذ سنة', 'منذ سنتين', 'سنوات', 'سنة'], month: ['منذ شهر', 'منذ شهرين', 'أشهر', 'شهرًا'], day: ['منذ يوم', 'منذ يومين', 'أيام', 'يومًا'], hour: ['منذ ساعة', 'منذ ساعتين', 'ساعات', 'ساعة'], minute: ['منذ دقيقة', 'منذ دقيقتين', 'دقائق', 'دقيقة'] };
const agoAr = d => { const s = (Date.now() - d) / 1000; for (const [u, n] of [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]]) if (s >= n) { const v = Math.floor(s / n), f = AR_UNITS[u]; return v <= 2 ? arCount(v, f) : 'منذ ' + arCount(v, f); } return 'الآن'; };
let commit = null;
function renderDep() {
  if (!commit) { $('lv-dep').textContent = isAr() ? 'مؤخرًا' : 'Recently'; return; }
  $('lv-dep').textContent = isAr() ? agoAr(new Date(commit.date)) : ago(new Date(commit.date));
  $('lv-msg').innerHTML = `<a href="${commit.url}" target="_blank" rel="noopener">${commit.sha}</a> ${commit.msg.replace(/</g, '&lt;')}`;
}
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
    commit = c; renderDep();
  } catch { renderDep(); $('lv-msg').textContent = 'GitHub API unavailable'; }
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

/* ============ Holographic business card — drag / swipe to spin, tap to flip ============ */
const stage = document.querySelector('.holo-stage'), holo = $('holo');
let angle = 0, tiltX = 0, tiltY = 0, drag = null;
const applyHolo = () => { holo.style.transform = `rotateX(${tiltX}deg) rotateY(${angle + tiltY}deg)`; };
function setTilt(nx, ny) { // nx, ny in 0..1
  tiltX = (0.5 - ny) * 22; tiltY = (nx - 0.5) * 26;
  holo.style.setProperty('--fx', nx * 100 + '%'); holo.style.setProperty('--fy', ny * 100 + '%');
  holo.style.setProperty('--ang', (nx * 180 + 90) + 'deg');
  applyHolo();
}
function settle(target) {
  const turned = Math.round(target / 180) !== Math.round(drag?.start / 180 ?? 0);
  angle = target; holo.classList.remove('dragging'); applyHolo();
  if (turned) { SA.pluck(659.25, 0.06); navigator.vibrate?.(10); SA.emit('card'); }
}
holo.addEventListener('pointerdown', e => {
  drag = { x: e.clientX, lx: e.clientX, t: performance.now(), start: angle, vel: 0, moved: 0 };
  holo.setPointerCapture(e.pointerId); holo.classList.add('dragging');
});
holo.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.lx; drag.lx = e.clientX; drag.moved += Math.abs(dx);
  drag.vel = drag.vel * 0.6 + dx * 0.4;
  angle = drag.start + (e.clientX - drag.x) * 0.6;
  if (drag.moved > 30 && Math.abs(dx) > 6) SA.pluck(1318.51 - Math.min(Math.abs(dx), 30) * 8, 0.012);
  applyHolo();
});
function release() {
  if (!drag) return;
  let target;
  if (drag.moved < 6 && performance.now() - drag.t < 400) target = Math.round(drag.start / 180) * 180 + 180; // tap = flip
  else target = Math.round((angle + drag.vel * 9) / 180) * 180; // flick carries momentum, then snaps to a face
  settle(target); drag = null;
}
holo.addEventListener('pointerup', release);
holo.addEventListener('pointercancel', release);
holo.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drag = { start: angle }; settle(angle + 180); drag = null; } });
stage.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' || drag) return; const r = holo.getBoundingClientRect(); setTilt(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))); });
stage.addEventListener('pointerleave', () => { if (drag) return; tiltX = tiltY = 0; applyHolo(); });
if (isTouch) addEventListener('deviceorientation', e => {
  if (e.gamma == null || drag) return;
  setTilt(Math.max(0, Math.min(1, 0.5 + e.gamma / 50)), Math.max(0, Math.min(1, 0.5 + (e.beta - 45) / 50)));
});
const flipCard = () => { drag = { start: angle }; settle(Math.round(angle / 180) * 180 + 180); drag = null; };
// QR code (qrcode-generator, loaded globally) → portfolio URL
try {
  const qr = window.qrcode(0, 'M'); qr.addData('https://syedabdulla761.github.io/'); qr.make();
  $('qr').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
} catch { $('qr').textContent = 'syedabdulla761.github.io'; }

/* ============ Exploration game: hidden bugs + achievements ============ */
// Bugs hide on real content. Squashing one reveals the story behind it, so visitors read
// about Syed while they play — without a separate "game" screen.
const BUGS = [
  { host: '#about .glass', hint: 'About', hintAr: 'نبذة عني', fact: 'Siemens Scholar — full scholarship through B.Tech at UVCE, graduating with a 9.09 CGPA.', ar: 'منحة سيمنس — منحة كاملة طوال دراسة البكالوريوس في UVCE، مع تخرّج بمعدل 9.09.' },
  { host: '#impact .stat:nth-child(1)', hint: 'Impact', hintAr: 'الإنجازات', ar: 'ترقية AG-Grid من v31 إلى v35: أكثر من 50 breaking change، و58 ملف TypeScript، وتقليص الـ bundle بنسبة 42%.', fact: 'AG-Grid v31 → v35: mapped 50+ breaking changes, migrated 58 TypeScript files and cut the grid bundle by 42%.' },
  { host: '#impact .stat:nth-child(3)', hint: 'Impact', hintAr: 'الإنجازات', ar: 'أصلح تعطّل المتصفح في line charts تعرض أكثر من 130 ألف نقطة بيانات.', fact: 'Fixed a browser crash when line charts rendered 130K+ data points (stacked-value computation).' },
  { host: 'IIS', hint: 'Experience', hintAr: 'الخبرات', ar: 'اكتشف سبب خطأ IIS HTTP 404.11 (encoded characters في الـ URLs) — خطأ أثّر على 100% من عملاء Windows.', fact: 'Traced IIS HTTP 404.11 to encoded characters in composite URLs — a bug hitting 100% of Windows-deployed customers.' },
  { host: 'SonarCloud', hint: 'Experience', hintAr: 'الخبرات', ar: 'خفّض أخطاء SonarCloud عالية الخطورة في الـ frontend إلى الصفر.', fact: 'Drove SonarCloud High-severity frontend bugs down to zero.' },
  { host: '#skills .skill:nth-child(2)', hint: 'Stack', hintAr: 'المهارات', ar: 'بنى أدوار صلاحيات على مستوى المجلد باستخدام Spring Security ACL.', fact: 'Built folder-scoped roles with a custom Spring Security ACL evaluator and advisory-lock name uniqueness.' },
  { host: '#edu .ring:nth-child(2)', hint: 'Education', hintAr: 'التعليم', ar: 'حصل على 96.16% في الصف الثاني عشر و96.48% في الصف العاشر.', fact: 'Scored 96.16% in Class 12 and 96.48% in Class 10.' },
  { host: '#live .t-ship', hint: 'Live', hintAr: 'مباشر', ar: '95 خطأ تم إصلاحه و89 backports عبر 11 إصدارًا مدعومًا — ضمن 305 تذكرة Jira منذ 2023.', fact: '95 bugs fixed and 89 backports across 11 supported releases — part of 305 Jira tickets since 2023.' },
];
const ACH = [
  { id: 'hello', i: '👋', n: 'First contact', d: 'Scrolled past the hero', an: 'أول تواصل', ad: 'بدأت التصفح', xp: 10 },
  { id: 'impact', i: '📈', n: 'Numbers person', d: 'Checked the impact stats', an: 'عاشق الأرقام', ad: 'اطّلعت على إحصاءات الإنجازات', xp: 10 },
  { id: 'work', i: '💼', n: 'Deep diver', d: 'Explored the experience timeline', an: 'غوص عميق', ad: 'استكشفت مسيرة الخبرات', xp: 20 },
  { id: 'live', i: '📡', n: 'Live wire', d: 'Tuned in live from Bengaluru', an: 'على الهواء', ad: 'زرت قسم «مباشر»', xp: 10 },
  { id: 'end', i: '🏁', n: 'Completionist', d: 'Made it all the way to Contact', an: 'حتى النهاية', ad: 'وصلت إلى قسم التواصل', xp: 20 },
  { id: 'burst', i: '💥', n: 'Big bang', d: 'Tapped empty space for a shockwave', an: 'الانفجار العظيم', ad: 'أطلقت موجة صادمة', xp: 15 },
  { id: 'hole', i: '🕳️', n: 'Event horizon', d: 'Held down to create a black hole', an: 'أفق الحدث', ad: 'صنعت ثقبًا أسود', xp: 30 },
  { id: 'spin', i: '🌀', n: 'Orbital mechanic', d: 'Dragged to spin the constellation', an: 'ميكانيكا المدارات', ad: 'أدرت الجسيمات بالسحب', xp: 15 },
  { id: 'card', i: '💳', n: 'Card shark', d: 'Flipped the holographic card', an: 'محترف البطاقات', ad: 'قلبت بطاقة التعريف', xp: 15 },
  { id: 'sound', i: '🎵', n: 'Maestro', d: 'Turned on the sound', an: 'المايسترو', ad: 'شغّلت الصوت', xp: 15 },
  { id: 'lang', i: '🌍', n: 'Polyglot', d: 'Switched the site to العربية', an: 'متعدد اللغات', ad: 'حوّلت الموقع إلى العربية', xp: 15 },
  { id: 'term', i: '⌨️', n: 'Hacker', d: 'Found the secret terminal', an: 'هاكر', ad: 'وجدت الـ terminal السري', xp: 25 },
  { id: 'cmdk', i: '⚡', n: 'Power user', d: 'Opened the command menu', an: 'مستخدم محترف', ad: 'فتحت قائمة الأوامر', xp: 15 },
  { id: 'summary', i: '📋', n: 'Recruiter mode', d: 'Read the 30-second summary', an: 'وضع التوظيف', ad: 'قرأت الملخص في 30 ثانية', xp: 15 },
  { id: 'hunter', i: '🏆', n: 'Bug hunter', d: 'Squashed every hidden bug', an: 'صائد الأخطاء', ad: 'سحقت كل الأخطاء المخفية', xp: 100 },
];
const KEY = 'sa-progress-v1';
let prog = { a: [], b: [] };
try { prog = { a: [], b: [], ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prog)); } catch {} };
const xp = () => prog.a.reduce((s, id) => s + (ACH.find(a => a.id === id)?.xp || 0), 0) + prog.b.length * 10;
const level = x => Math.floor(x / 100) + 1;

const hud = $('hud'), achStack = $('ach-stack');
function renderHud(pulse) {
  const x = xp(), lv = level(x), pct = x % 100;
  $('hud-lv').textContent = lv; $('hud-bugs').textContent = `${prog.b.length}/${BUGS.length}`;
  $('hud-ring').style.setProperty('--p', pct);
  $('at-lv').textContent = 'Lv ' + lv; $('at-xp').textContent = x; $('at-bugs').textContent = prog.b.length; $('at-ach').textContent = prog.a.length;
  $('at-bar').style.width = Math.round((prog.a.length + prog.b.length) / (ACH.length + BUGS.length) * 100) + '%';
  if (prog.a.length || prog.b.length) hud.classList.add('show');
  if (pulse) { hud.classList.remove('pulse'); void hud.offsetWidth; hud.classList.add('pulse'); }
}
function popCard(html, cls = '', ms = 3800) {
  const el = document.createElement('div');
  el.className = 'ach-toast ' + cls; el.innerHTML = html;
  achStack.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 500); }, ms);
}
function unlock(id) {
  if (prog.a.includes(id)) return;
  const a = ACH.find(x => x.id === id); if (!a) return;
  const before = level(xp());
  prog.a.push(id); save();
  popCard(isAr() ? `<span class="at-i">${a.i}</span><div><small>إنجاز جديد · +${a.xp} XP</small><b>${a.n}</b></div>` : `<span class="at-i">${a.i}</span><div><small>Achievement unlocked · +${a.xp} XP</small><b>${a.n}</b></div>`);
  [0, 4, 7].forEach((k, i) => setTimeout(() => SA.pluck([523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 1760, 2093][k] || 1046.5, 0.05), i * 90));
  levelCheck(before); renderHud(true);
}
function levelCheck(before) {
  const now = level(xp());
  if (now > before) setTimeout(() => popCard(isAr() ? `<span class="at-i">⭐</span><div><small>ترقية مستوى</small><b>وصلت إلى المستوى ${now}</b></div>` : `<span class="at-i">⭐</span><div><small>Level up</small><b>You reached level ${now}</b></div>`, 'lvl'), 600);
}
['burst', 'hole', 'spin', 'card', 'sound', 'lang', 'term', 'cmdk', 'summary'].forEach(ev => SA.on(ev, () => unlock(ev)));
const secAch = { about: 'hello', impact: 'impact', work: 'work', live: 'live', contact: 'end' };
const sio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { unlock(secAch[e.target.id]); sio.unobserve(e.target); } }), { threshold: 0.35 });
Object.keys(secAch).forEach(id => sio.observe($(id)));

// Plant the bugs
const bugHost = h => h.startsWith('#') ? document.querySelector(h) : [...document.querySelectorAll('#work .card')].find(c => c.textContent.includes(h));
const BUG_ICONS = ['🐞', '🪲', '🐛', '🦗'];
BUGS.forEach((b, i) => {
  if (prog.b.includes(i)) return;
  const host = bugHost(b.host); if (!host) return;
  host.classList.add('bug-host');
  const el = document.createElement('button');
  el.className = 'hbug'; el.type = 'button'; el.textContent = BUG_ICONS[i % BUG_ICONS.length];
  el.setAttribute('aria-label', 'A bug! Squash it');
  el.style.setProperty('--x', (12 + (i * 37) % 70) + '%'); el.style.setProperty('--y', (18 + (i * 53) % 60) + '%');
  el.style.setProperty('--dur', (7 + i % 4 * 2) + 's'); el.style.animationDelay = -(i * 1.3) + 's';
  el.addEventListener('click', e => { e.stopPropagation(); squash(i, el); });
  host.appendChild(el);
});
function squash(i, el) {
  if (prog.b.includes(i)) return;
  const before = level(xp());
  prog.b.push(i); save();
  el.classList.add('splat'); setTimeout(() => el.remove(), 500);
  navigator.vibrate?.([12, 30, 12]); SA.boom(false); SA.pluck(880, 0.05);
  popCard(isAr() ? `<span class="at-i">🐞</span><div><small>تم سحق الخطأ ${prog.b.length}/${BUGS.length} · +10 XP</small><b>${BUGS[i].ar}</b></div>` : `<span class="at-i">🐞</span><div><small>Bug ${prog.b.length}/${BUGS.length} squashed · +10 XP</small><b>${BUGS[i].fact}</b></div>`, 'bugfact', 6000);
  levelCheck(before); renderHud(true);
  if (prog.b.length === BUGS.length) setTimeout(finale, 1400);
}
function finale() {
  unlock('hunter');
  SA.setShape('star'); SA.shockwave();
  [0, 2, 4, 7, 9, 11].forEach((k, i) => setTimeout(() => SA.pluck([261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1318.51][k], 0.07), i * 120));
  setTimeout(() => popCard(isAr() ? `<span class="at-i">🏆</span><div><small>تم سحق كل الأخطاء</small><b>هذه هي الدقة التي يقدّمها سيد في بيئة الإنتاج. <a href="#contact">لنتحدث ←</a></b></div>` : `<span class="at-i">🏆</span><div><small>Every bug squashed</small><b>That's the attention to detail Syed brings to production. <a href="#contact">Let's talk →</a></b></div>`, 'bugfact final', 9000), 900);
}

// Achievements panel
const achp = $('achp');
function openAch() {
  SA.closeOverlays();
  const ar = isAr();
  $('achp-list').innerHTML = ACH.map(a => `<li class="${prog.a.includes(a.id) ? 'got' : ''}"><span>${prog.a.includes(a.id) ? a.i : '🔒'}</span><div><b>${a.n}</b><small>${ar ? a.ad : a.d}</small></div><em>+${a.xp}</em></li>`).join('');
  $('achp-bugs').innerHTML = BUGS.map((b, i) => prog.b.includes(i)
    ? `<li class="got"><span>🐞</span><p>${ar ? b.ar : b.fact}</p></li>`
    : `<li><span>❔</span><p>${ar ? `خطأ مختبئ في مكان ما ضمن <b>${b.hintAr}</b>…` : `A bug is hiding somewhere in <b>${b.hint}</b>…`}</p></li>`).join('');
  $('achp-sum').textContent = ar ? `المستوى ${level(xp())} · ${xp()} XP · ${prog.a.length}/${ACH.length} إنجازًا · ${prog.b.length}/${BUGS.length} أخطاء` : `Level ${level(xp())} · ${xp()} XP · ${prog.a.length}/${ACH.length} achievements · ${prog.b.length}/${BUGS.length} bugs`;
  achp.hidden = false; $('achp-x').focus();
}
const closeAch = () => { achp.hidden = true; };
$('achp-x').addEventListener('click', closeAch);
achp.addEventListener('pointerdown', e => { if (e.target === achp) closeAch(); });
addEventListener('keydown', e => { if (e.key === 'Escape') closeAch(); });
$('achp-reset').addEventListener('click', () => { prog = { a: [], b: [] }; save(); location.reload(); });
hud.addEventListener('click', openAch);
$('ach-tile').addEventListener('click', openAch);
renderHud(false);

/* ============ Gesture hint (first visit) ============ */
const hint = $('ghint');
setTimeout(() => hint.classList.add('show'), 2600);
setTimeout(() => hint.classList.remove('show'), 11000);
hint.addEventListener('click', () => hint.classList.remove('show'));

/* ============ Palette entries ============ */
SA.actions.push(
  { g: 'Play', i: '🏆', l: 'Achievements & hidden bugs', la: 'الإنجازات والأخطاء المخفية', k: 'game progress xp level', run: openAch },
  { g: 'Play', i: '💳', l: 'Flip the holographic card', la: 'اقلب بطاقة التعريف', k: 'business card qr', run: () => { SA.scrollTo($('contact')); setTimeout(flipCard, 800); } },
  { g: 'Play', i: '📇', l: 'Save contact to phone (vCard)', la: 'احفظ جهة الاتصال في هاتفك (vCard)', k: 'vcf contact save', run: () => { location.href = 'Syed_Abdulla.vcf'; } },
  { g: 'Play', i: '📡', l: 'Live from Bengaluru', la: 'مباشرة من بنغالورو', k: 'weather time now live', run: () => SA.scrollTo($('live')) },
);

SA.on('langchange', () => { $('lv-tz').textContent = cityOf(visitorTz); tickLive(); renderWx(); renderDep(); renderHud(false); });

/* ============ Featured work: Playground screen carousel ============ */
{
  const shots = [...document.querySelectorAll('#playground .shots img')], tabs = [...document.querySelectorAll('#playground .case-tabs button')];
  let cur = 0, timer = null, visible = false;
  const load = img => { if (img.dataset.src) { img.src = img.dataset.src; img.removeAttribute('data-src'); } };
  function show(i) {
    cur = (i + shots.length) % shots.length;
    load(shots[cur]); load(shots[(cur + 1) % shots.length]); // prefetch the next screen
    shots.forEach((s, k) => s.classList.toggle('on', k === cur));
    tabs.forEach((t, k) => { t.classList.toggle('on', k === cur); t.setAttribute('aria-selected', k === cur); });
  }
  const DUR = i => i === 1 ? 11000 : 4500; // give the theme-switching GIF time to play through
  const schedule = () => { clearTimeout(timer); if (visible) timer = setTimeout(() => { show(cur + 1); schedule(); }, DUR(cur)); };
  tabs.forEach((t, k) => t.addEventListener('click', () => { show(k); schedule(); }));
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { load(shots[1]); schedule(); } else clearTimeout(timer); }, { threshold: 0.3 }).observe(document.getElementById('playground'));
}
