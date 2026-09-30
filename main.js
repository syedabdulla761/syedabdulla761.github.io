import * as THREE from 'three';

/* ============ Three.js: morphing particle constellation ============ */
const isMobile = matchMedia('(max-width: 760px)').matches;
const N = isMobile ? 7000 : 16000;
const canvas = document.getElementById('bg');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x06070b, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x06070b, 0.028);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 0, 22);

const rand = (a, b) => a + Math.random() * (b - a);

// ---- Shape generators (each returns Float32Array N*3) ----
function textShape(str) {
  const c = document.createElement('canvas'), W = 1024, H = 360;
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 300px Syne, sans-serif';
  g.fillText(str, W / 2, H / 2);
  const d = g.getImageData(0, 0, W, H).data, pts = [];
  for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) if (d[(y * W + x) * 4 + 3] > 128) pts.push(x, y);
  const out = new Float32Array(N * 3);
  const count = pts.length / 2;
  for (let i = 0; i < N; i++) {
    if (count && i < N * 0.82) {
      const k = (Math.random() * count | 0) * 2;
      out[i * 3] = (pts[k] - W / 2) / 34 + (isMobile ? 0 : 6);
      out[i * 3 + 1] = -(pts[k + 1] - H / 2) / 34;
      out[i * 3 + 2] = rand(-0.6, 0.6);
    } else { // halo dust
      const r = rand(10, 30), t = rand(0, Math.PI * 2);
      out[i * 3] = Math.cos(t) * r; out[i * 3 + 1] = rand(-12, 12); out[i * 3 + 2] = Math.sin(t) * r - 10;
    }
  }
  if (isMobile) for (let i = 0; i < N; i++) { out[i * 3] *= 0.45; out[i * 3 + 1] = out[i * 3 + 1] * 0.45 + 5; }
  return out;
}

// 8-pointed geometric star (Khatam) with concentric rings – nods to Islamic & Indian geometric art
function starShape() {
  const out = new Float32Array(N * 3);
  const inSq = (x, y, s, rot) => {
    const c = Math.cos(rot), sn = Math.sin(rot);
    const u = x * c + y * sn, v = -x * sn + y * c;
    return Math.abs(u) < s && Math.abs(v) < s;
  };
  const S = 5.2;
  for (let i = 0; i < N; i++) {
    let x, y, z = 0;
    const m = Math.random();
    if (m < 0.55) { // star outline edges
      const sq = Math.random() < 0.5 ? 0 : Math.PI / 4;
      const side = Math.random() * 4 | 0, t = rand(-S, S);
      let u = [S, -S, t, t][side], v = [t, t, S, -S][side];
      const c = Math.cos(sq), sn = Math.sin(sq);
      x = u * c - v * sn; y = u * sn + v * c; z = rand(-0.15, 0.15);
    } else if (m < 0.8) { // filled interior
      do { x = rand(-S * 1.42, S * 1.42); y = rand(-S * 1.42, S * 1.42); } while (!(inSq(x, y, S, 0) || inSq(x, y, S, Math.PI / 4)));
      z = rand(-0.4, 0.4); x *= 0.55; y *= 0.55;
    } else { // rings
      const r = [7.9, 9.2, 3.2][Math.random() * 3 | 0], t = rand(0, Math.PI * 2);
      x = Math.cos(t) * r; y = Math.sin(t) * r; z = rand(-0.1, 0.1);
    }
    out[i * 3] = x + (isMobile ? 0 : -7); out[i * 3 + 1] = y; out[i * 3 + 2] = z;
  }
  return out;
}

function waveShape() {
  const out = new Float32Array(N * 3), side = Math.ceil(Math.sqrt(N));
  for (let i = 0; i < N; i++) {
    const gx = (i % side) / side - 0.5, gz = Math.floor(i / side) / side - 0.5;
    out[i * 3] = gx * 44; out[i * 3 + 2] = gz * 30 - 4; out[i * 3 + 1] = -6;
  }
  return out;
}

function gridShape() { // AG-Grid style spreadsheet panel in 3D
  const out = new Float32Array(N * 3), cols = 10, rows = 12, W = 22, H = 18;
  for (let i = 0; i < N; i++) {
    let x, y;
    if (Math.random() < 0.5) { const c = (Math.random() * (cols + 1) | 0); x = -W / 2 + c * W / cols; y = rand(-H / 2, H / 2); }
    else { const r = (Math.random() * (rows + 1) | 0); y = -H / 2 + r * H / rows; x = rand(-W / 2, W / 2); }
    if (Math.random() < 0.12) { // header row glow
      y = H / 2 - rand(0, H / rows); x = rand(-W / 2, W / 2);
    }
    const layer = Math.random() < 0.7 ? 0 : (Math.random() < 0.5 ? -3 : -6);
    out[i * 3] = x + (isMobile ? 0 : 9) + layer * 0.6; out[i * 3 + 1] = y - layer * 0.5; out[i * 3 + 2] = layer - 4;
  }
  return out;
}

function knotShape() {
  const out = new Float32Array(N * 3), p = 3, q = 5;
  for (let i = 0; i < N; i++) {
    const t = rand(0, Math.PI * 2), r = 5 + 2.2 * Math.cos(q * t);
    const a = rand(0, Math.PI * 2), tube = rand(0, 0.9);
    out[i * 3] = r * Math.cos(p * t) + Math.cos(a) * tube + (isMobile ? 0 : 8);
    out[i * 3 + 1] = r * Math.sin(p * t) + Math.sin(a) * tube;
    out[i * 3 + 2] = 2.2 * Math.sin(q * t) * 2 + rand(-0.4, 0.4);
  }
  return out;
}

function helixShape() { // DNA of learning
  const out = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const t = rand(-1, 1) * Math.PI * 3.2, strand = Math.random() < 0.5 ? 0 : Math.PI;
    let r = 3.2, x, y, z;
    if (Math.random() < 0.18) { const f = rand(-1, 1); x = Math.cos(t) * r * f; z = Math.sin(t) * r * f; }
    else { x = Math.cos(t + strand) * r + rand(-.25, .25); z = Math.sin(t + strand) * r + rand(-.25, .25); }
    y = t * 1.35;
    out[i * 3] = y * 0.9 + (isMobile ? 0 : 0); out[i * 3 + 1] = x - (isMobile ? 6 : 7.5); out[i * 3 + 2] = z;
  }
  return out;
}

// Globe with arcs from Bengaluru to Gulf cities
function globeShape() {
  const out = new Float32Array(N * 3), R = 8;
  const ll = (lat, lon, r = R) => { const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180; return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)); };
  const blr = ll(12.97, 77.59), cities = [ll(25.2, 55.27), ll(24.71, 46.67), ll(25.29, 51.53), ll(19.07, 72.87), ll(28.61, 77.2), ll(24.45, 54.37)];
  const arcN = N * 0.16 | 0;
  for (let i = 0; i < N; i++) {
    let v;
    if (i < arcN) {
      const c = cities[i % cities.length], t = Math.random();
      v = new THREE.Vector3().lerpVectors(blr, c, t).normalize().multiplyScalar(R + Math.sin(t * Math.PI) * 2.4);
    } else {
      const k = i - arcN, M = N - arcN, y = 1 - (k / (M - 1)) * 2, r = Math.sqrt(1 - y * y), th = k * 2.39996;
      v = new THREE.Vector3(Math.cos(th) * r * R, y * R, Math.sin(th) * r * R);
    }
    out[i * 3] = v.x; out[i * 3 + 1] = v.y - 1; out[i * 3 + 2] = v.z - 6;
  }
  return out;
}

const shapes = {};
const labels = { text: '01 / CONSTELLATION', star: '02 / KHATAM STAR', wave: '03 / DATA OCEAN', grid: '04 / AG-GRID', knot: '05 / TORUS KNOT', helix: '06 / HELIX', globe: '07 / BENGALURU → GCC' };

// ---- Geometry ----
const geo = new THREE.BufferGeometry();
const pos = new Float32Array(N * 3), seeds = new Float32Array(N), cols = new Float32Array(N * 3);
for (let i = 0; i < N; i++) {
  const r = rand(20, 60), t = rand(0, Math.PI * 2), p = rand(0, Math.PI);
  pos[i * 3] = r * Math.sin(p) * Math.cos(t); pos[i * 3 + 1] = r * Math.cos(p); pos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
  seeds[i] = Math.random();
  const gold = new THREE.Color(0xe8b04b), teal = new THREE.Color(0x2dd4bf), ivory = new THREE.Color(0xf6e7c8);
  const c = seeds[i] < 0.62 ? gold : seeds[i] < 0.86 ? ivory : teal;
  cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
}
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
geo.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));

const mat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
  uniforms: { uTime: { value: 0 }, uSize: { value: (isMobile ? 34 : 44) * renderer.getPixelRatio() } },
  vertexShader: `
    attribute float seed; varying vec3 vColor; varying float vA; uniform float uTime; uniform float uSize;
    void main(){
      vColor = color;
      vec3 p = position;
      p += 0.06 * vec3(sin(uTime*1.3+seed*40.), cos(uTime*1.1+seed*30.), sin(uTime*.9+seed*20.));
      vec4 mv = modelViewMatrix * vec4(p,1.);
      gl_Position = projectionMatrix * mv;
      float tw = 0.6 + 0.4*sin(uTime*2.5 + seed*80.);
      gl_PointSize = uSize * (0.35 + seed*0.65) * tw / -mv.z;
      vA = tw;
    }`,
  fragmentShader: `
    varying vec3 vColor; varying float vA;
    void main(){
      float d = length(gl_PointCoord - .5);
      float a = smoothstep(.5, 0., d);
      gl_FragColor = vec4(vColor, a * a * .9 * vA);
    }`
});
const points = new THREE.Points(geo, mat);
scene.add(points);

// Background star field
const sg = new THREE.BufferGeometry(), sp = new Float32Array(2500 * 3);
for (let i = 0; i < sp.length; i++) sp[i] = rand(-90, 90);
sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.08, color: 0x8d8a84, transparent: true, opacity: 0.6 }));
scene.add(stars);

let target = null, currentKey = 'text', morphT = 0;
const mouse = new THREE.Vector2(9, 9), mouseWorld = new THREE.Vector3(), ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

function setShape(key) {
  if (!shapes[key]) return;
  currentKey = key; target = shapes[key]; morphT = 0;
  document.getElementById('shape-label').textContent = labels[key];
}

// ---- Animation loop ----
const clock = new THREE.Clock();
let scrollY = 0, rotTarget = new THREE.Vector2();
function tick() {
  const t = clock.getElapsedTime();
  mat.uniforms.uTime.value = t;
  morphT = Math.min(morphT + 0.006, 1);
  const ease = 0.035 + morphT * 0.05;

  ray.setFromCamera(mouse, camera);
  ray.ray.intersectPlane(plane, mouseWorld);
  const inv = points.matrixWorld.clone().invert();
  const mLocal = mouseWorld.clone().applyMatrix4(inv);

  if (target) {
    const p = geo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      const ix = i * 3;
      let tx = target[ix], ty = target[ix + 1], tz = target[ix + 2];
      if (currentKey === 'wave') { ty = -5 + Math.sin(tx * 0.35 + t * 1.4) * 1.3 + Math.cos(tz * 0.45 + t) * 1.1 + Math.sin((tx + tz) * 0.2 + t * .6) * .8; }
      const lag = 0.4 + seeds[i] * 0.6;
      p[ix] += (tx - p[ix]) * ease * lag;
      p[ix + 1] += (ty - p[ix + 1]) * ease * lag;
      p[ix + 2] += (tz - p[ix + 2]) * ease * lag;
      // mouse repulsion
      const dx = p[ix] - mLocal.x, dy = p[ix + 1] - mLocal.y, d2 = dx * dx + dy * dy;
      if (d2 < 6) { const f = (6 - d2) / 6 * 0.35; p[ix] += dx * f; p[ix + 1] += dy * f; }
    }
    geo.attributes.position.needsUpdate = true;
  }

  const spin = { globe: 0.12, knot: 0.1, helix: 0.0 }[currentKey] ?? 0;
  if (spin) points.rotation.y += spin * 0.016; else points.rotation.y += (0 - points.rotation.y) * 0.03;
  if (currentKey === 'helix') points.rotation.x = Math.sin(t * .3) * .2;
  else points.rotation.x += (0 - points.rotation.x) * .03;
  rotTarget.set(mouse.y * 0.08, mouse.x * 0.12);
  camera.position.x += (mouse.x * 1.5 - camera.position.x) * 0.03;
  camera.position.y += (mouse.y * 1.0 - camera.position.y) * 0.03;
  camera.lookAt(0, 0, 0);
  stars.rotation.y = t * 0.01; stars.rotation.x = scrollY * 0.00005;

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
addEventListener('pointermove', e => { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = -(e.clientY / innerHeight) * 2 + 1; });
addEventListener('pointerleave', () => mouse.set(9, 9));

/* ============ Boot ============ */
const pctEl = document.getElementById('load-pct');
let pct = 0; const pi = setInterval(() => { pct = Math.min(pct + Math.random() * 18, 96); pctEl.textContent = pct | 0; }, 90);
(document.fonts ? document.fonts.load('800 100px Syne') : Promise.resolve()).catch(() => {}).then(() => {
  shapes.text = textShape('SA'); shapes.star = starShape(); shapes.wave = waveShape(); shapes.grid = gridShape();
  shapes.knot = knotShape(); shapes.helix = helixShape(); shapes.globe = globeShape();
  setShape('text');
  clearInterval(pi); pctEl.textContent = 100;
  setTimeout(() => { document.getElementById('loader').classList.add('done'); document.body.classList.add('loaded'); }, 350);
  tick();
});

/* ============ Section → shape, nav, reveals ============ */
const sections = [...document.querySelectorAll('section[data-shape]')];
const navLinks = [...document.querySelectorAll('.nav nav a')];
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  setShape(e.target.dataset.shape);
  navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
}), { threshold: 0.45 });
sections.forEach(s => io.observe(s));

document.querySelectorAll('h2, .sub, .glass, .stat, .card, .tl-head, .ring, .langs span, .contact-row, .clocks, .eyebrow').forEach(el => el.classList.add('rv'));
const rio = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const el = e.target;
  const sibs = [...el.parentElement.children].filter(c => c.classList.contains('rv'));
  el.style.transitionDelay = (sibs.indexOf(el) % 6) * 0.08 + 's';
  el.classList.add('in'); rio.unobserve(el);
  if (el.classList.contains('stat')) countUp(el.querySelector('.num'));
  if (el.classList.contains('ring')) { const c = el.querySelector('.fill'); c.style.strokeDashoffset = 327 * (1 - c.dataset.p / 100); }
}), { threshold: 0.15 });
document.querySelectorAll('.rv').forEach(el => rio.observe(el));

function countUp(el) {
  const to = +el.dataset.to, suf = el.dataset.suf || '', t0 = performance.now(), D = 1800;
  const step = now => { const k = Math.min((now - t0) / D, 1), e = 1 - Math.pow(1 - k, 4); el.textContent = Math.round(to * e) + suf; if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

addEventListener('scroll', () => {
  scrollY = window.scrollY;
  const h = document.documentElement.scrollHeight - innerHeight;
  document.getElementById('progress-bar').style.width = (scrollY / h * 100) + '%';
}, { passive: true });

/* ============ Hero: greetings + typer ============ */
const greets = ['Hello', 'नमस्ते', 'مرحبا', 'ನಮಸ್ಕಾರ', 'Salaam', 'నమస్కారం', 'Assalamu Alaikum'];
let gi = 0; const gEl = document.getElementById('greet');
setInterval(() => { gEl.classList.add('out'); setTimeout(() => { gi = (gi + 1) % greets.length; gEl.textContent = greets[gi]; gEl.classList.remove('out'); }, 400); }, 2200);

const phrases = ['enterprise BI interfaces.', 'secure Spring Boot APIs.', 'blazing-fast React apps.', 'accessible, WCAG-ready UIs.', 'AI-powered workflows.'];
let pi2 = 0, ci = 0, del = false; const tEl = document.getElementById('typer');
(function type() {
  const w = phrases[pi2];
  tEl.textContent = w.slice(0, ci);
  if (!del && ci++ >= w.length) { del = true; return setTimeout(type, 1600); }
  if (del && ci-- <= 0) { del = false; pi2 = (pi2 + 1) % phrases.length; ci = 0; }
  setTimeout(type, del ? 28 : 60);
})();

/* ============ Cursor, magnetic, tilt ============ */
const cur = document.getElementById('cursor'), dot = document.getElementById('cursor-dot');
let cx = 0, cy = 0, tx = 0, ty = 0;
addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; dot.style.transform = `translate(${tx}px,${ty}px) translate(-50%,-50%)`; });
(function loop() { cx += (tx - cx) * .18; cy += (ty - cy) * .18; cur.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`; requestAnimationFrame(loop); })();
document.querySelectorAll('a,button,.card,.pills i').forEach(el => { el.addEventListener('pointerenter', () => cur.classList.add('hover')); el.addEventListener('pointerleave', () => cur.classList.remove('hover')); });

document.querySelectorAll('.magnetic').forEach(el => {
  el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .3}px,${(e.clientY - r.top - r.height / 2) * .4}px)`; });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
});
document.querySelectorAll('.tilt').forEach(el => {
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 10}deg) rotateY(${(x - 0.5) * 12}deg) translateY(-4px)`;
    el.style.setProperty('--mx', x * 100 + '%'); el.style.setProperty('--my', y * 100 + '%');
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
});

/* ============ World clocks ============ */
const clocks = [...document.querySelectorAll('[data-tz]')];
const updClocks = () => clocks.forEach(c => c.textContent = new Date().toLocaleTimeString('en-GB', { timeZone: c.dataset.tz, hour: '2-digit', minute: '2-digit' }));
updClocks(); setInterval(updClocks, 15000);
document.getElementById('yr').textContent = new Date().getFullYear();

/* ============ Terminal easter egg ============ */
const term = document.getElementById('term'), out = document.getElementById('term-out'), inp = document.getElementById('term-input');
const print = (html) => { out.innerHTML += html + '\n'; out.scrollTop = out.scrollHeight; };
const cmds = {
  help: () => '<span class="g">whoami</span>  <span class="g">skills</span>  <span class="g">impact</span>  <span class="g">edu</span>  <span class="g">contact</span>  <span class="g">resume</span>  <span class="g">shape &lt;text|star|wave|grid|knot|helix|globe&gt;</span>  <span class="g">clear</span>  <span class="g">exit</span>',
  whoami: () => 'Syed Abdulla — Full-Stack Software Engineer @ insightsoftware (Logi Symphony BI).\n3+ yrs · React · TypeScript · Java · Spring Boot · Bengaluru, India.',
  skills: () => '<span class="t">frontend</span> React, TypeScript, AG-Grid Enterprise, Blueprint.js, WCAG\n<span class="t">backend </span> Java, Spring Boot, Spring Security ACL, JPA, Liquibase, PostgreSQL\n<span class="t">infra   </span> Docker, Kubernetes, GitHub Actions, Jenkins, SonarCloud',
  impact: () => '−42% grid bundle · 100+ enterprise customers · 130K-point charts\n90+ bugs fixed · 89 backports · +40% WCAG compliance · 0 spillovers',
  edu: () => 'B.Tech CSE, UVCE Bengaluru (2019–23) · CGPA 9.09 · Siemens Scholar',
  contact: () => 'email    syedabdulla761@gmail.com\nphone    +91 88676 18049\ngithub   github.com/syedabdulla761',
  resume: () => { location.href = 'Syed_Abdulla_Resume.docx'; return 'Downloading résumé…'; },
  clear: () => { out.innerHTML = ''; return null; },
  exit: () => { toggleTerm(false); return null; },
  sudo: () => 'Nice try. 😄 But you can hire me instead → type <span class="g">contact</span>',
};
function run(line) {
  const [c, ...a] = line.trim().split(/\s+/);
  print(`<span class="g">❯</span> ${line.replace(/</g, '&lt;')}`);
  if (!c) return;
  if (c === 'shape') { if (shapes[a[0]]) { setShape(a[0]); return print('morphing → ' + a[0]); } return print('unknown shape'); }
  const f = cmds[c.toLowerCase()];
  const r = f ? f() : `command not found: ${c.replace(/</g, '&lt;')} — try <span class="g">help</span>`;
  if (r) print(r);
}
function toggleTerm(open = !term.classList.contains('open')) {
  term.classList.toggle('open', open);
  term.setAttribute('aria-hidden', !open);
  if (open) { if (!out.innerHTML) print('Welcome to <span class="g">syed-os</span> v1.0 — type <span class="g">help</span>'); setTimeout(() => inp.focus(), 300); }
}
addEventListener('keydown', e => {
  if ((e.key === '`' || e.key === '~') && document.activeElement !== inp) { e.preventDefault(); toggleTerm(); }
  if (e.key === 'Escape') toggleTerm(false);
});
inp.addEventListener('keydown', e => { if (e.key === 'Enter') { run(inp.value); inp.value = ''; } });
document.getElementById('term-x').onclick = () => toggleTerm(false);
