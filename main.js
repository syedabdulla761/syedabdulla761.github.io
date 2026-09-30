import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ============ Three.js: morphing particle constellation ============ */
const isMobile = matchMedia('(max-width: 760px)').matches;
const N = isMobile ? 12000 : 16000;
const canvas = document.getElementById('bg');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x000000, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.028);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 0, 22);

// Cinematic bloom everywhere. Phones run the post-processing chain at 1x pixel ratio and
// drop it automatically if the frame rate can't keep up.
let composer = new EffectComposer(renderer), bloomPass = null;
if (isMobile) composer.setPixelRatio(1);
composer.addPass(new RenderPass(scene, camera));
bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.75, 0.6, 0.12);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());
const BLOOM = isMobile ? 0.95 : 0.75;

const rand = (a, b) => a + Math.random() * (b - a);

/* ============ Tunnel scroll: the page never moves — you travel through it ============ */
// Every section is a fixed panel. Scrolling scrubs a timeline: between sections you fly down
// a 3D tunnel (the next section grows out of the vanishing point, blurred, then sharpens while
// the current one swells past the camera). Long sections scroll normally while you're parked in them.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tunnelOn = !reducedMotion;
const touchDev = matchMedia('(hover: none)').matches;
const panels = [...document.querySelectorAll('main > section')].map(sec => {
  const layer = document.createElement('div'); layer.className = 'layer';
  [...sec.children].forEach(c => { if (!c.matches('.scroll-hint')) layer.appendChild(c); });
  sec.insertBefore(layer, sec.firstChild);
  return { sec, layer, h: 0, arrive: 0, leave: 0 };
});
const spacer = document.createElement('div'); spacer.id = 'tunnel-space'; spacer.setAttribute('aria-hidden', 'true');
document.body.appendChild(spacer);
if (tunnelOn) document.documentElement.classList.add('tunnel');
const TRAVEL = () => innerHeight * 1.15, HOLD = () => innerHeight * 0.35;
let lastTY = -1, curIdx = -1, travelT = 1;
function measure() {
  if (!tunnelOn) return;
  const vh = innerHeight; let y = 0;
  panels.forEach((p, i) => {
    const was = p.sec.classList.contains('on');
    p.sec.classList.add('on');
    p.h = Math.max(p.layer.scrollHeight, vh);
    if (!was) p.sec.classList.remove('on');
    if (i) y += TRAVEL();
    p.arrive = Math.round(y); y += Math.max(0, p.h - vh) + HOLD(); p.leave = Math.round(y);
  });
  spacer.style.height = Math.round(y + vh) + 'px';
  lastTY = -1;
}
measure();
addEventListener('resize', measure); addEventListener('load', measure);
document.fonts?.ready.then(measure);
function updateTunnel() {
  if (!tunnelOn) return;
  const y = window.scrollY, vh = innerHeight;
  if (y === lastTY) return; lastTY = y;
  let k = 0; while (k < panels.length - 1 && y >= panels[k + 1].arrive) k++;
  let from = -1, t = 1;
  if (k < panels.length - 1 && y > panels[k].leave) { from = k; k = k + 1; t = (y - panels[from].leave) / TRAVEL(); }
  travelT = from >= 0 ? t : 1;
  panels.forEach((p, i) => {
    const show = i === k || i === from;
    p.sec.classList.toggle('on', show);
    if (!show) return;
    const maxOff = Math.max(0, p.h - vh);
    let off, scale = 1, op = 1, blur = 0;
    // phones skip the blur filter for performance, so they cross-fade faster to avoid overlap
    if (i === from) { off = maxOff; const e = t * t; scale = 1 + e * 2.4; op = 1 - Math.min(1, t * (touchDev ? 2.6 : 1.6)); blur = t * 16; }
    else if (from >= 0) { off = 0; const e = 1 - Math.pow(1 - t, 3); scale = 0.18 + 0.82 * e; op = Math.max(0, Math.min(1, (t - (touchDev ? 0.42 : 0.2)) * (touchDev ? 2 : 1.7))); blur = (1 - e) * 14; }
    else off = Math.min(Math.max(0, y - p.arrive), maxOff);
    p.layer.style.transformOrigin = `50% ${Math.round(off + vh / 2)}px`;
    p.layer.style.transform = `translate3d(0,${-Math.round(off)}px,0) scale(${scale.toFixed(4)})`;
    p.layer.style.opacity = op < 1 ? op.toFixed(3) : '';
    p.layer.style.filter = blur > 0.4 && !touchDev ? `blur(${blur.toFixed(1)}px)` : '';
    p.sec.style.zIndex = i === from ? 3 : 2;
  });
  const cur = from >= 0 && t < 0.5 ? from : k;
  panels.forEach((p, i) => p.sec.classList.toggle('cur', i === cur));
  if (cur !== curIdx) { curIdx = cur; arrive(panels[cur].sec); }
}
function arrive(sec) {
  setShape(sec.dataset.shape);
  document.querySelectorAll('.nav nav a, .dock a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + sec.id));
  SA.emit('section', sec.id);
}
addEventListener('scroll', updateTunnel, { passive: true });

// Inertial smooth scrolling on desktop (Lenis); phones keep native momentum scrolling
let lenis = null;
if (window.Lenis && !reducedMotion && !touchDev) {
  lenis = new window.Lenis({ lerp: 0.08, anchors: false });
  const lraf = t => { lenis.raf(t); requestAnimationFrame(lraf); };
  requestAnimationFrame(lraf);
}
const scrollToEl = el => {
  const p = panels.find(q => q.sec === el || q.sec.contains(el));
  if (!tunnelOn || !p) return el.scrollIntoView({ behavior: 'smooth' });
  lenis ? lenis.scrollTo(p.arrive, { duration: 2.2 }) : window.scrollTo({ top: p.arrive, behavior: 'smooth' });
};
// In-page links travel through the tunnel instead of jumping
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const el = document.getElementById(a.getAttribute('href').slice(1)); if (!el) return;
  e.preventDefault(); scrollToEl(el);
}, true);

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

// Radar: concentric rings, spokes and a sweeping wedge — for the live section
function radarShape() {
  const out = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const m = Math.random();
    let r, a;
    if (m < 0.55) { r = (1 + (Math.random() * 5 | 0)) * 1.9 + rand(-.05, .05); a = rand(0, Math.PI * 2); }
    else if (m < 0.72) { a = (Math.random() * 12 | 0) * Math.PI / 6; r = rand(0.3, 9.5); }
    else { a = Math.pow(Math.random(), 2) * 0.9; r = Math.sqrt(Math.random()) * 9.5; }
    out[i * 3] = Math.cos(a) * r; out[i * 3 + 1] = Math.sin(a) * r; out[i * 3 + 2] = rand(-0.2, 0.2) - 4;
  }
  return out;
}

const shapes = {};
const labelsAr = { text: '01 / كوكبة', star: '02 / نجمة الخاتم', wave: '03 / محيط البيانات', grid: '04 / AG-GRID', knot: '05 / عقدة طوقية', helix: '06 / حلزون', radar: '07 / رادار مباشر', globe: '08 / بنغالورو ← الخليج' };
const labels = { text: '01 / CONSTELLATION', star: '02 / KHATAM STAR', wave: '03 / DATA OCEAN', grid: '04 / AG-GRID', knot: '05 / TORUS KNOT', helix: '06 / HELIX', radar: '07 / LIVE RADAR', globe: '08 / BENGALURU → GCC' };

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
  uniforms: { uTime: { value: 0 }, uSize: { value: (isMobile ? 46 : 44) * renderer.getPixelRatio() } },
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
const world = new THREE.Group(); // user-controlled orbit (drag / swipe) wraps the particle cloud
world.add(points);
scene.add(world);

// Background star field drifting toward the camera
const STAR_N = isMobile ? 900 : 1800;
const starPos = new Float32Array(STAR_N * 3);
for (let i = 0; i < STAR_N; i++) { starPos[i * 3] = rand(-70, 70); starPos[i * 3 + 1] = rand(-45, 45); starPos[i * 3 + 2] = rand(-140, 20); }
const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.09, color: 0x8d8a84, transparent: true, opacity: 0.6 }));
scene.add(stars);

// The tunnel: rings of light and longitudinal guide lines converging on a glowing singularity
const TUN_R = 12.5, RINGS = 44, PER = isMobile ? 64 : 110, GAP = 7, TUN_LEN = RINGS * GAP, TUN_NEAR = 20 - TUN_LEN;
const ringPos = new Float32Array(RINGS * PER * 3), ringCol = new Float32Array(RINGS * PER * 3);
const cGold = new THREE.Color(0xe8b04b), cTeal = new THREE.Color(0x2dd4bf);
for (let r = 0; r < RINGS; r++) for (let j = 0; j < PER; j++) {
  const i = (r * PER + j) * 3, a = j / PER * Math.PI * 2 + r * 0.21, rad = TUN_R * (1 + rand(-0.05, 0.05));
  ringPos[i] = Math.cos(a) * rad; ringPos[i + 1] = Math.sin(a) * rad; ringPos[i + 2] = 20 - r * GAP;
  const c = r % 4 === 0 ? cTeal : cGold; ringCol[i] = c.r; ringCol[i + 1] = c.g; ringCol[i + 2] = c.b;
}
const ringGeo = new THREE.BufferGeometry();
ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3)); ringGeo.setAttribute('color', new THREE.BufferAttribute(ringCol, 3));
const tunnel = new THREE.Group();
tunnel.add(new THREE.Points(ringGeo, new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })));
const LN = 32, linePos = new Float32Array(LN * 6);
for (let i = 0; i < LN; i++) { const a = i / LN * Math.PI * 2, x = Math.cos(a) * TUN_R, y = Math.sin(a) * TUN_R; linePos.set([x, y, 22, x, y, TUN_NEAR], i * 6); }
const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
tunnel.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0xe8b04b, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false })));
const gc = document.createElement('canvas'); gc.width = gc.height = 128;
const gx = gc.getContext('2d'), grd = gx.createRadialGradient(64, 64, 0, 64, 64, 64);
grd.addColorStop(0, 'rgba(255,232,180,1)'); grd.addColorStop(0.22, 'rgba(232,176,75,.45)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
gx.fillStyle = grd; gx.fillRect(0, 0, 128, 128);
const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0.3 }));
core.position.set(0, 0, -140); core.scale.setScalar(46); tunnel.add(core);
scene.add(tunnel);
let sv = 0, prevSY = window.scrollY, tunZ = 0; // smoothed scroll velocity (px / frame), tunnel travel

let burst = 0, hole = 0, holing = false;
let target = null, currentKey = 'text', morphT = 0;
// mouse = camera parallax (also driven by gyro); aim = interaction point (repel / burst / black hole)
const mouse = new THREE.Vector2(0, 0), aim = new THREE.Vector2(9, 9), mouseWorld = new THREE.Vector3(), ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const userRot = new THREE.Vector2(), userVel = new THREE.Vector2();

function setShape(key) {
  if (!shapes[key]) return;
  currentKey = key; target = shapes[key]; morphT = 0;
  document.getElementById('shape-label').textContent = (document.documentElement.lang === 'ar' ? labelsAr : labels)[key];
  chime(Object.keys(labels).indexOf(key));
}

// ---- Animation loop ----
const clock = new THREE.Clock();
let scrollY = 0, press = null, fps = 60, fpsFrames = 0, fpsT = performance.now(), lowFps = 0;
function tick() {
  const t = clock.getElapsedTime(), now = performance.now();
  mat.uniforms.uTime.value = t;
  morphT = Math.min(morphT + 0.006, 1);
  const ease = 0.035 + morphT * 0.05;

  fpsFrames++;
  if (now - fpsT >= 500) {
    fps = Math.round(fpsFrames * 1000 / (now - fpsT)); fpsFrames = 0; fpsT = now;
    if (composer && isMobile && t > 6) { lowFps = fps < 34 ? lowFps + 1 : 0; if (lowFps >= 4) { composer = null; bloomPass = null; } }
  }

  // long-press on empty space → black hole
  if (press && !holing && press.moved < 12 && now - press.t > 380) { holing = true; navigator.vibrate?.(15); }
  hole = holing ? Math.min(hole + 0.012, 1) : Math.max(hole - 0.06, 0);
  if (bloomPass) bloomPass.strength = BLOOM + hole * 0.9 + burst * 0.5;
  SA.onHole?.(hole);

  ray.setFromCamera(aim, camera);
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
      const pull = hole > 0.01 ? ease * lag * (1 - hole * 0.85) : ease * lag;
      p[ix] += (tx - p[ix]) * pull;
      p[ix + 1] += (ty - p[ix + 1]) * pull;
      p[ix + 2] += (tz - p[ix + 2]) * pull;
      const dx = p[ix] - mLocal.x, dy = p[ix + 1] - mLocal.y, d2 = dx * dx + dy * dy;
      if (hole > 0.01) { // swirl into the event horizon
        if (d2 < 600) { const f = hole * 0.07 / (1 + d2 * 0.012); p[ix] += -dx * f - dy * f * 0.9; p[ix + 1] += -dy * f + dx * f * 0.9; p[ix + 2] *= 1 - hole * 0.04; }
      } else if (d2 < 6) { const f = (6 - d2) / 6 * 0.35; p[ix] += dx * f; p[ix + 1] += dy * f; }
      if (burst > 0.02 && d2 < 140) { const f = burst * 0.9 / (1 + d2 * 0.07); p[ix] += dx * f; p[ix + 1] += dy * f; p[ix + 2] += (seeds[i] - 0.5) * f * 8; }
    }
    geo.attributes.position.needsUpdate = true;
    burst *= 0.9;
  }

  const spin = { globe: 0.12, knot: 0.1 }[currentKey] ?? 0;
  if (spin) points.rotation.y += spin * 0.016; else points.rotation.y += (0 - points.rotation.y) * 0.03;
  if (currentKey === 'helix') points.rotation.x = Math.sin(t * .3) * .2;
  else points.rotation.x += (0 - points.rotation.x) * .03;
  if (currentKey === 'radar') points.rotation.z -= 0.004; else points.rotation.z += (0 - points.rotation.z) * 0.03;

  // user orbit with inertia; drifts home when idle so shapes stay readable
  userRot.x += userVel.y; userRot.y += userVel.x;
  userVel.multiplyScalar(press ? 0.8 : 0.95);
  if (!press) { userRot.y = Math.atan2(Math.sin(userRot.y), Math.cos(userRot.y)) * 0.992; userRot.x *= 0.985; }
  userRot.x = Math.max(-1.1, Math.min(1.1, userRot.x));
  world.rotation.set(userRot.x, userRot.y, 0);

  camera.position.x += (mouse.x * 1.5 - camera.position.x) * 0.03;
  camera.position.y += (mouse.y * 1.0 - camera.position.y) * 0.03;
  camera.lookAt(0, 0, 0);
  // tunnel flight: rings rush toward the camera as you scroll, faster mid-transition
  const sy = window.scrollY; sv += ((sy - prevSY) - sv) * 0.18; prevSY = sy;
  const inTransit = travelT < 1, boost = inTransit ? 2.6 : 1;
  const spd = 0.02 + sv * 0.035 * boost;
  tunZ += spd;
  for (let r = 0; r < RINGS; r++) {
    const z = (((20 - r * GAP + tunZ) - TUN_NEAR) % TUN_LEN + TUN_LEN) % TUN_LEN + TUN_NEAR;
    for (let j = 0, b = r * PER * 3 + 2; j < PER; j++, b += 3) ringPos[b] = z;
  }
  ringGeo.attributes.position.needsUpdate = true;
  tunnel.rotation.z += 0.0006 + sv * 0.0003 * boost;
  for (let i = 0, k = 2; i < STAR_N; i++, k += 3) { let z = starPos[k] + spd * 0.6; if (z > 22) z -= 162; else if (z < -140) z += 162; starPos[k] = z; }
  sg.attributes.position.needsUpdate = true;
  core.material.opacity = 0.18 + (inTransit ? Math.sin(travelT * Math.PI) * 0.45 : 0);
  const fov = 55 + Math.min(Math.abs(sv) * 0.12, 6) + (inTransit ? Math.sin(travelT * Math.PI) * 7 : 0);
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * 0.12; camera.updateProjectionMatrix(); }
  world.rotation.x += Math.max(-0.2, Math.min(0.2, sv * 0.003));
  updateTunnel();

  composer ? composer.render() : renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer?.setSize(innerWidth, innerHeight);
});

/* ---- Gestures: tap = shockwave · hold = black hole · drag/swipe = orbit ---- */
const UI = 'a,button,input,.card,.glass,.stat,#term,.overlay,.dock,.holo-wrap,.tile,.gesture-hint';
const toNdc = (e, v) => v.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
let aimT;
addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') { toNdc(e, mouse); toNdc(e, aim); }
  else if (press) toNdc(e, aim);
  if (!press) return;
  const dx = e.clientX - press.lx, dy = e.clientY - press.ly;
  press.lx = e.clientX; press.ly = e.clientY; press.moved += Math.abs(dx) + Math.abs(dy);
  if (press.moved > 12 && !holing) { userVel.x = dx * 0.0045; if (e.pointerType === 'mouse') userVel.y = dy * 0.003; }
  if (press.moved > 160 && !holing && !press.spun) { press.spun = true; SA.emit('spin'); }
});
addEventListener('pointerleave', () => { mouse.set(0, 0); aim.set(9, 9); });
addEventListener('pointerdown', e => {
  toNdc(e, aim); if (e.pointerType === 'mouse') toNdc(e, mouse);
  clearTimeout(aimT);
  if (e.button > 0 || e.target.closest(UI)) return;
  if (e.pointerType === 'mouse') e.preventDefault(); // no text selection while dragging the cosmos
  press = { t: performance.now(), moved: 0, lx: e.clientX, ly: e.clientY };
});
function endPress(cancelled) {
  if (!press) return;
  const quick = performance.now() - press.t < 350 && press.moved < 12;
  if (holing) { burst = 1 + hole * 1.2; navigator.vibrate?.([20, 30, 60]); SA.boom(true); SA.emit('hole'); }
  else if (quick && !cancelled) { burst = 1; navigator.vibrate?.(25); SA.boom(false); SA.emit('burst'); }
  holing = false; press = null;
  if (matchMedia('(hover: none)').matches) aimT = setTimeout(() => aim.set(9, 9), 900);
}
addEventListener('pointerup', () => endPress(false));
addEventListener('pointercancel', () => endPress(true));

// Gyroscope parallax on phones (tilt to move the camera)
let gyroAsked = false;
function onTilt(e) { if (e.gamma == null) return; mouse.x = Math.max(-1, Math.min(1, e.gamma / 35)); mouse.y = Math.max(-1, Math.min(1, -(e.beta - 40) / 35)); }
if (matchMedia('(hover: none)').matches) {
  addEventListener('deviceorientation', onTilt);
  addEventListener('touchend', () => { // iOS needs an explicit permission prompt from a gesture
    if (gyroAsked || typeof window.DeviceOrientationEvent?.requestPermission !== 'function') return;
    gyroAsked = true; DeviceOrientationEvent.requestPermission().catch(() => {});
  }, { passive: true });
}

// Shared hooks for extras.js (live panel, holo card, mini-game)
const bus = new EventTarget();
const SA = window.SA = {
  emit: n => bus.dispatchEvent(new Event(n)),
  on: (n, f) => bus.addEventListener(n, f),
  boom() {}, pluck() {},
  N, get fps() { return fps; }, renderer,
  setShape: k => setShape(k),
  shockwave: () => { aim.set(0, 0); burst = 1.4; },
  scrollTo: el => scrollToEl(el),
  remeasure: () => measure(),
  tone(freq, dur = 0.3, type = 'sine', vol = 0.1, slideTo) {
    if (!soundOn || !actx) return;
    const t0 = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
  },
};

/* ============ Boot ============ */
const pctEl = document.getElementById('load-pct');
let pct = 0; const pi = setInterval(() => { pct = Math.min(pct + Math.random() * 18, 96); pctEl.textContent = pct | 0; }, 90);
(document.fonts ? document.fonts.load('800 100px Syne') : Promise.resolve()).catch(() => {}).then(() => {
  shapes.text = textShape('SA'); shapes.star = starShape(); shapes.wave = waveShape(); shapes.grid = gridShape();
  shapes.knot = knotShape(); shapes.helix = helixShape(); shapes.radar = radarShape(); shapes.globe = globeShape();
  setShape('text');
  clearInterval(pi); pctEl.textContent = 100;
  setTimeout(() => { document.getElementById('loader').classList.add('done'); document.body.classList.add('loaded'); }, 350);
  tick();
});

/* ============ Section → shape, nav, reveals ============ */
const sections = [...document.querySelectorAll('section[data-shape]')];
const navLinks = [...document.querySelectorAll('.nav nav a')];
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting || tunnelOn) return;
  setShape(e.target.dataset.shape);
  navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
}), { threshold: 0.45 });
sections.forEach(s => io.observe(s));

document.querySelectorAll('h2, .sub, .glass, .stat, .card, .tl-head, .ring, .langs span, .contact-row, .clocks, .eyebrow, .tile, .holo-stage').forEach(el => el.classList.add('rv'));
const rio = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const el = e.target;
  const sibs = [...el.parentElement.children].filter(c => c.classList.contains('rv'));
  el.style.transitionDelay = (sibs.indexOf(el) % 6) * 0.08 + 's';
  el.classList.add('in'); rio.unobserve(el);
  if (el.tagName === 'H2') scramble(el);
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
const phrasesAr = ['واجهات ذكاء أعمال للمؤسسات.', 'واجهات برمجية آمنة بـ Spring Boot.', 'تطبيقات React فائقة السرعة.', 'واجهات سهلة الوصول وفق WCAG.', 'سير عمل مدعومًا بالذكاء الاصطناعي.'];
(function type() {
  const w = (document.documentElement.lang === 'ar' ? phrasesAr : phrases)[pi2 % phrases.length];
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
  resume: () => { location.href = 'Syed_Abdulla_Resume.pdf'; return 'Downloading résumé…'; },
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
  if (open) { SA.emit('term'); if (!out.innerHTML) print('Welcome to <span class="g">syed-os</span> v1.0 — type <span class="g">help</span>'); setTimeout(() => inp.focus(), 300); }
}
addEventListener('keydown', e => {
  const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
  if ((e.key === '`' || e.key === '~') && !typing) { e.preventDefault(); toggleTerm(); }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmdk.hidden ? openCmdk() : closeOverlays(); }
  if (e.key === '/' && !typing) { e.preventDefault(); openCmdk(); }
  if (e.key === 'Escape') { toggleTerm(false); closeOverlays(); }
});
inp.addEventListener('keydown', e => { if (e.key === 'Enter') { run(inp.value); inp.value = ''; } });
document.getElementById('term-x').onclick = () => toggleTerm(false);

/* ============ Interactive sound (WebAudio, off by default) ============ */
// A drone in a reverb "space". The cursor / finger strums a pentatonic harp across the screen,
// scrolling opens the filter, the black hole rumbles, and UI elements chime on hover.
let actx = null, master = null, wet = null, echo = null, lp = null, rumble = null, rumbleG = null, soundOn = false;
const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
function impulse(sec, decay) {
  const len = actx.sampleRate * sec, b = actx.createBuffer(2, len, actx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  return b;
}
function initAudio() {
  actx = new (window.AudioContext || window.webkitAudioContext)();
  const comp = actx.createDynamicsCompressor(); comp.connect(actx.destination);
  master = actx.createGain(); master.gain.value = 0; master.connect(comp);
  const verb = actx.createConvolver(); verb.buffer = impulse(3.5, 2.8); verb.connect(master);
  wet = actx.createGain(); wet.gain.value = 0.55; wet.connect(verb);
  echo = actx.createDelay(1); const fb = actx.createGain(); echo.delayTime.value = 0.33; fb.gain.value = 0.35;
  echo.connect(fb); fb.connect(echo); echo.connect(wet);
  lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 4; lp.connect(master); lp.connect(wet);
  [55, 82.4, 110, 164.8].forEach((f, i) => { // A-minor drone with slow detune shimmer
    const o = actx.createOscillator(), g = actx.createGain(), l = actx.createOscillator(), lg = actx.createGain();
    o.type = i % 2 ? 'triangle' : 'sawtooth'; o.frequency.value = f; g.gain.value = 0.12 / (i + 1);
    l.frequency.value = 0.07 + i * 0.03; lg.gain.value = 2.5; l.connect(lg); lg.connect(o.detune);
    o.connect(g); g.connect(lp); o.start(); l.start();
  });
  rumble = actx.createOscillator(); rumble.type = 'sawtooth'; rumble.frequency.value = 40;
  const rl = actx.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 160;
  rumbleG = actx.createGain(); rumbleG.gain.value = 0;
  rumble.connect(rl); rl.connect(rumbleG); rumbleG.connect(master); rumbleG.connect(wet); rumble.start();
}
function voice(freq, { dur = 1.4, type = 'triangle', vol = 0.08, slideTo, delay = false } = {}) {
  if (!soundOn || !actx) return;
  const t0 = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master); g.connect(wet); if (delay) g.connect(echo);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
function noiseBurst(dur, vol, freq) {
  if (!soundOn || !actx) return;
  const t0 = actx.currentTime, len = actx.sampleRate * dur, b = actx.createBuffer(1, len, actx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = actx.createBufferSource(), bp = actx.createBiquadFilter(), g = actx.createGain();
  src.buffer = b; bp.type = 'bandpass'; bp.frequency.setValueAtTime(freq, t0); bp.frequency.exponentialRampToValueAtTime(80, t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bp); bp.connect(g); g.connect(master); g.connect(wet); src.start(t0);
}
SA.tone = (freq, dur = 0.3, type = 'sine', vol = 0.1, slideTo) => voice(freq, { dur, type, vol, slideTo });
SA.pluck = (freq, vol = 0.06) => { voice(freq, { dur: 1.6, type: 'triangle', vol, delay: true }); voice(freq * 2, { dur: 0.7, type: 'sine', vol: vol * 0.35 }); };
SA.boom = big => { voice(big ? 95 : 170, { dur: big ? 1.8 : 0.6, type: 'sine', vol: big ? 0.4 : 0.2, slideTo: 32 }); noiseBurst(big ? 1.3 : 0.35, big ? 0.3 : 0.12, big ? 500 : 1600); };
SA.onHole = h => {
  if (!rumbleG) return;
  const t = actx.currentTime;
  rumbleG.gain.setTargetAtTime(soundOn ? h * 0.25 : 0, t, 0.08);
  rumble.frequency.setTargetAtTime(32 + h * 50, t, 0.1);
};
// Two-note pentatonic chime when the particles change shape
function chime(i) {
  if (!soundOn || !actx) return;
  SA.pluck(SCALE[3 + i % 7], 0.07); setTimeout(() => SA.pluck(SCALE[5 + i % 7], 0.05), 140);
}
// Harp: sweep the cursor (or swipe a finger) across the screen to strum
let lastNote = -1, lastPluckT = 0;
addEventListener('pointermove', e => {
  if (!soundOn || (e.pointerType !== 'mouse' && e.pressure === 0)) return;
  const idx = Math.min(SCALE.length - 1, Math.floor(e.clientX / innerWidth * SCALE.length)), now = performance.now();
  if (idx === lastNote || now - lastPluckT < 55) return;
  lastNote = idx; lastPluckT = now;
  SA.pluck(SCALE[idx], 0.028 + Math.min(Math.abs(e.movementX || 8), 40) / 1400);
});
// Scroll speed opens the drone's filter — the page "breathes" as you move through it
let lastSY = window.scrollY, lastST = performance.now(), scT;
addEventListener('scroll', () => {
  if (!soundOn) return;
  const now = performance.now(), v = Math.abs(window.scrollY - lastSY) / Math.max(now - lastST, 16);
  lastSY = window.scrollY; lastST = now;
  lp.frequency.setTargetAtTime(420 + Math.min(v * 1600, 3400), actx.currentTime, 0.08);
  clearTimeout(scT); scT = setTimeout(() => lp.frequency.setTargetAtTime(420, actx.currentTime, 0.6), 160);
}, { passive: true });
// Soft UI chimes on hover
let hovEl = null, hovT = 0;
document.addEventListener('pointerover', e => {
  if (!soundOn || e.pointerType !== 'mouse') return;
  const el = e.target.closest('.card,.tile,.stat,.pills i,.btn,.nav a,.ring,.badges span,.skill');
  if (!el || el === hovEl) return;
  hovEl = el;
  const now = performance.now(); if (now - hovT < 70) return; hovT = now;
  SA.pluck(SCALE[7 + [...el.parentElement.children].indexOf(el) % 7], 0.03);
});
const sndBtn = document.getElementById('snd');
sndBtn.classList.add('nudge');
sndBtn.onclick = () => {
  if (!actx) initAudio();
  soundOn = !soundOn; actx.resume();
  master.gain.setTargetAtTime(soundOn ? 0.6 : 0, actx.currentTime, 0.5);
  sndBtn.textContent = soundOn ? '🔊' : '🔇';
  sndBtn.classList.remove('nudge');
  if (!soundOn) return;
  SA.emit('sound');
  [0, 2, 4, 7].forEach((k, i) => setTimeout(() => SA.pluck(SCALE[k + 3], 0.07), i * 110));
  const ar = document.documentElement.lang === 'ar', touch = matchMedia('(hover: none)').matches;
  toast(ar ? (touch ? 'الصوت يعمل — اسحب أفقيًا للعزف 🎵' : 'الصوت يعمل — حرّك المؤشر عبر الشاشة للعزف 🎵') : (touch ? 'Sound on — swipe sideways to strum 🎵' : 'Sound on — sweep your cursor across the screen to play 🎵'));
};

/* ============ English ⇄ العربية (full site, right-to-left) ============ */
// [selector, html] translates the first match; [selector, [html, …]] translates every match in order.
// Tech names stay in English, as is standard in Gulf tech hiring. Leaves are targeted so live
// values (clocks, counters, hidden bugs) inside their parents survive the swap.
const AR_SRC = [
  ['.title .reveal', ['سيد', 'عبدالله']], ['#quick h3', 'سيد عبدالله'], ['.hud-t small', 'المستوى'],
  ['.cmdk-foot', '<span><kbd>↑</kbd><kbd>↓</kbd> تنقّل</span><span><kbd>↵</kbd> اختيار</span>'],
  ['#achp .eyebrow', ['🏆 استكشافك', '🐞 الأخطاء المخفية — كل واحد منها قصة حقيقية']], ['#achp h3', 'الإنجازات'], ['#achp-reset', 'إعادة ضبط التقدم'],
  ['.nav nav a[href="#about"]', 'نبذة عني'], ['.nav nav a[href="#impact"]', 'الإنجازات'], ['.nav nav a[href="#work"]', 'الخبرات'],
  ['.nav nav a[href="#skills"]', 'المهارات'], ['.nav nav a[href="#live"]', 'مباشر'], ['.nav nav a[href="#contact"]', 'تواصل'], ['#cv', 'السيرة الذاتية ↓'],
  // hero
  ['.role', 'مهندس برمجيات متكامل (Full-Stack) <b>·</b> React <b>·</b> TypeScript <b>·</b> Java <b>·</b> Spring Boot'],
  ['#tag-pre', 'أبني'],
  ['.hero-cta a[href="#work"]', 'استعرض أعمالي'], ['.hero-cta a[href="#contact"]', 'لنتحدث'], ['#quick-btn', '⚡ ملخص في 30 ثانية'],
  ['.hero-meta', '<span>📍 بنغالورو، الهند</span><span>🌍 منفتح على فرص العمل في الهند ودول الخليج</span><span>🟢 أكثر من 3 سنوات · insightsoftware</span>'],
  ['.scroll-hint', '<span></span>مرّر'],
  // about
  ['#about .eyebrow', '01 — نبذة عني'],
  ['#about h2', 'هندسة برمجيات بروح <span class="gold">المسؤولية</span> والدقة والإتقان.'],
  ['#about .glass > p', [
    'مهندس برمجيات بخبرة تزيد على <b>3 سنوات</b>، متخصص في بناء تطبيقات React عالية الأداء وتصوير البيانات للمؤسسات — وأعمل الآن على المنظومة كاملة مع <b>Spring Boot</b>.',
    'أتولى بشكل مستقل ميزات عالية الأثر من البداية إلى النهاية — من ترحيل المكتبات وتوحيد الواجهات إلى الامتثال لمعايير WCAG — مع تسليم السبرنتات <b>دون أي تأخير</b>.']],
  ['#about .badges span', ['🎓 UVCE علوم الحاسب 2023 · المعدل 9.09', '🏅 منحة سيمنس', '⭐ «يفوق التوقعات» مرتين', '🚀 ترقية إلى مهندس برمجيات خلال عامين']],
  ['#about blockquote', '«ملكية حقيقية للعمل، ومهارة تقنية، وروح تعاون.» <cite>— تقييم المدير</cite>'],
  // impact
  ['#impact .eyebrow', '02 — الإنجازات بالأرقام'],
  ['#impact h2', 'نتائج <span class="gold">تُنجَز</span> فعلًا.'],
  ['#impact .lbl', [
    'تقليص حجم حزمة الجدول (بعد الضغط) بعد الترحيل إلى AG-Grid v35',
    'عميل مؤسسي يستخدم منصة Playground التي بنيتها من الصفر',
    'نقطة بيانات تُعرض بسلاسة بعد إصلاح تعطّل المتصفح في المخططات الخطية',
    'خطأ تم إصلاحه · 89 نقلًا للإصلاحات عبر 11 إصدارًا مدعومًا',
    'تحسّن في الامتثال لمعايير WCAG — أكثر من 35 إصلاحًا خلال ربع سنة',
    'إيداعًا من وكلاء الذكاء الاصطناعي تمت مراجعتها · أكثر من 20 مهمة سُلّمت بسير عمل وكيلي']],
  // experience
  ['#work .eyebrow', '03 — الخبرات'],
  ['#work h2', 'insightsoftware <span class="muted">· Logi Symphony</span>'],
  ['#work .sub', 'فبراير 2023 – الآن · بنغالورو · <a href="https://playground.logi-symphony.com" target="_blank" rel="noopener">playground.logi-symphony.com ↗</a>'],
  ['#work .tl-head h3', ['مهندس برمجيات', 'مهندس برمجيات مشارك', 'متدرب في هندسة البرمجيات']],
  ['#work .tl-head span', ['سبتمبر 2025 – الآن', 'يوليو 2023 – أغسطس 2025', 'فبراير 2023 – يونيو 2023']],
  ['#work .card h4', [
    'ترحيل AG-Grid من v31 إلى v35', 'تنظيم المجلدات — الواجهة الخلفية بـ Spring Boot', 'تجربة المجلدات — الواجهة',
    'تضمين التقارير ذاتية الخدمة', 'توحيد Symphony والصفحة الرئيسية', 'ذكاء Playground الاصطناعي والعروض التوضيحية',
    'الامتثال لمعايير WCAG', 'إصلاح حرج لخطأ IIS 404.11', 'Source V2 والمرشِّحات',
    'تطبيق Playground — من الصفر', 'فوز في الهاكاثون — «Composer»', 'SonarCloud ومخططات بـ 130 ألف نقطة',
    'ترحيل السجلات: من Raize إلى Serilog']],
  ['#work .card p', [
    'قدت ترقية المكتبة على مستوى المؤسسة عبر أكثر من 15 وحدة. أعددت دراسة تغطي أكثر من 50 تغييرًا جذريًا وخارطة طريق من 17 مهمة، ورحّلت 58 ملف TypeScript وأكثر من 30 عارض خلايا مخصصًا إلى البنية المعيارية في v35.',
    'كيانات JPA وواجهات REST و3 أدوار على مستوى المجلد عبر مُقيِّم ACL مخصص في Spring Security. مجلدات خاصة لكل مستخدم (~4 آلاف سطر): تجهيز قائم على الأحداث، وترحيل بيانات عبر Liquibase، ونقل ذري قائم على المشاركة.',
    'شريط جانبي لشجرة المكتبة مع مسار التنقل، ونوافذ إنشاء المجلدات وتعديلها مع شارات مجلدات النظام، وتنقّل يبدأ بالمجلدات مع أدوار الصلاحيات.',
    'سلّمت بمفردي تضمين التقارير ذاتية الخدمة من الدراسة الأولية حتى تسليم التوثيق — Embed Manager وأحداث SDK ومقتطفات التضمين.',
    'قدت إعادة تصميم الصفحة الرئيسية لتصبح واجهة مركّزة على المهام مع دعم السمات، ودمجت أكثر من 5 مسارات إدارية في تجربة موحّدة.',
    'دمجت روبوت المحادثة بالذكاء الاصطناعي (إنشاء المرئيات، أسئلة البيانات، Bot API)، وعروضًا للتقارير الدقيقة وCrystal Reports والعلامة البيضاء، ونشرًا تجريبيًا لكل فرع عبر GitHub Actions.',
    'أنهيت ديون إمكانية الوصول لربع سنة كامل — تعارضات aria-hidden وtabindex، وأنماط قارئ الشاشة باستخدام Blueprint.js في لوحات المعلومات ومحرر المصادر والقوائم.',
    'شخّصت أحرفًا مُرمَّزة في الروابط المركّبة كانت تعطّل عمليات النشر على Windows — إصلاح شمل 100% من العملاء على Windows.',
    'تبويب الاتصالات (واجهة شجرية) وتبويب الملفات واللوحة الجانبية لـ Source V2. المرحلة الثانية من المرشِّح الهرمي ولوحة المرشِّحات ذات التطبيق التلقائي — دون أي تأخير عبر أكثر من 6 سبرنتات.',
    'بنيت منصة Playground الموجّهة للعملاء من الأساس، ويستخدمها الآن أكثر من 100 عميل مؤسسي لاستكشاف المنتج.',
    'قدت تطوير الواجهة لميزة جديدة في الهاكاثون، واعتُمدت لاحقًا ضمن خارطة طريق المنتج.',
    'خفّضت أخطاء SonarCloud عالية الخطورة إلى الصفر، وأصلحت تعطّل المتصفح في مخططات تعرض أكثر من 130 ألف نقطة، وعالجت مشكلات النشر في K8s/Docker وCentOS/PostgreSQL.',
    'رحّلت مكتبة السجلات في المنتج، مما حسّن قابلية الصيانة.']],
  ['#work .card .kpi', ['−42% من الحزمة', '~4 آلاف سطر', 'من البداية للنهاية', 'تسليم فردي', 'من 5+ إلى 1', 'روبوت ذكاء اصطناعي', '+40% امتثال', '100% من مستخدمي Windows', '0 تأخير', '+100 عميل', '🏆 ضمن خارطة الطريق', '0 أخطاء حرجة']],
  // skills
  ['#skills .eyebrow', '04 — المهارات'],
  ['#skills h2', 'أدوات <span class="gold">أتقنها</span>.'],
  ['#skills .skill h4', ['الواجهات الأمامية', 'الواجهات الخلفية', 'البنية التحتية والأدوات', 'سير عمل يعتمد على الذكاء الاصطناعي']],
  // education
  ['#edu .eyebrow', '05 — التعليم والتقدير'],
  ['#edu h2', '<span class="gold">تميّز</span> أكاديمي.'],
  ['#edu .sub', 'بكالوريوس التقنية في علوم وهندسة الحاسب<br/>كلية فيسفيسفارايا الجامعية للهندسة (UVCE)، بنغالورو · 2019 – 2023'],
  ['#edu .ring > span', ['المعدل التراكمي', 'الصف الثاني عشر', 'الصف العاشر', 'منحة سيمنس']],
  ['#edu .ring > b', [null, null, null, 'كاملة']],
  ['#edu .langs span', ['<b>English</b> احترافي', '<b class="deva">हिन्दी</b> احترافي', '<b class="kan">ಕನ್ನಡ</b> اللغة الأم', '<b>తెలుగు</b> محادثة']],
  // live
  ['#live .eyebrow', '<span class="live-dot"></span>06 — الآن'],
  ['#live h2', 'مباشرة من <span class="gold">بنغالورو</span>.'],
  ['#live .sub', 'كل ما هنا يتحدّث لحظيًا — توقيتي المحلي، والطقس خارج نافذتي، ومدى تقاطع منطقتك الزمنية مع منطقتي، وأداء هذه الصفحة على جهازك.'],
  ['#live .t-clock small', 'بنغالورو · توقيت الهند'], ['#live .i-you', 'توقيتك'], ['#live .t-weather small', 'الطقس في بنغالورو'],
  ['#live .t-ship small', 'أبني برمجيات المؤسسات منذ'], ['#live .i-since', 'منذ فبراير 2023 · والعدّاد مستمر'],
  ['#live .t-nerd small', 'إحصاءات للمهتمين · هذه الصفحة على جهازك'], ['#live .nerd span', ['إطار/ث', 'جسيم', 'زمن التحميل', 'المعالج الرسومي']],
  ['#live .t-deploy small', 'آخر نشر للموقع'], ['#ach-tile small', 'استكشافك'],
  ['#ach-tile .muted-s', '🐞 <b id="at-bugs">0</b>/8 أخطاء مخفية تم سحقها · 🏆 <b id="at-ach">0</b>/15 إنجازًا — كل خطأ يخفي قصة من مسيرتي.'],
  ['#ach-tile .play', 'عرض ◀'],
  // contact
  ['#contact .eyebrow', '07 — تواصل'],
  ['#contact h2', 'لنبنِ معًا شيئًا<br/><span class="gold">استثنائيًا</span>.'],
  ['#contact .sub', 'من بنغالورو إلى دبي والرياض والدوحة وما بعدها — منفتح على فرص تطوير الواجهات والتطوير المتكامل (Full-Stack).'],
  ['.holo-hint', '↔ اسحب البطاقة لتدويرها · انقر لقلبها'], ['.holo-actions a', '📇 حفظ جهة الاتصال'],
  ['.contact-row a[href^="https://wa.me"]', 'واتساب'],
  ['.clocks small', ['بنغالورو', 'دبي', 'الرياض', 'الدوحة']],
  ['footer', `© ${new Date().getFullYear()} سيد عبدالله · صُمّم بـ Three.js و JavaScript · <span class="desk">انقر على مساحة فارغة لموجة صادمة · <kbd>⌘K</kbd> للأوامر · <kbd>~</kbd> للطرفية</span><span class="touch">انقر على مساحة فارغة لموجة صادمة · أمِل هاتفك</span>`],
  // chrome
  ['.dock a', ['<span>⌂</span>الرئيسية', '<span>◉</span>مباشر', '<span>▤</span>الخبرات', '<span>✉</span>تواصل']], ['#dock-k', '<span>⌘</span>القائمة'],
  ['#ghint', '<span class="desk">✦ <b>اسحب</b> للتدوير · <b>اضغط مطولًا</b> لثقب أسود · <b>انقر</b> لموجة صادمة · 🔇 شغّل <b>الصوت</b> للعزف</span><span class="touch">✦ <b>اسحب أفقيًا</b> للتدوير · <b>اضغط مطولًا</b> لثقب أسود · <b>انقر</b> لموجة صادمة</span>'],
  // 30-second summary
  ['#quick .eyebrow', '⚡ ملخص في 30 ثانية'], ['#quick .q-role', 'مهندس برمجيات متكامل · insightsoftware'],
  ['#quick dt', ['الخبرة', 'التقنيات الأساسية', 'المجال', 'أبرز الإنجازات', 'التعليم', 'التقييمات', 'اللغات', 'الموقع']],
  ['#quick dd', [
    'أكثر من 3 سنوات (فبراير 2023 – الآن) · ترقية إلى مهندس برمجيات خلال عامين', 'React، TypeScript، Java، Spring Boot، PostgreSQL',
    'ذكاء الأعمال وتصوير البيانات للمؤسسات (Logi Symphony)',
    'تقليص حزمة الجدول 42% · منصة Playground يستخدمها أكثر من 100 عميل مؤسسي · تحسين الامتثال لـ WCAG بنسبة 40% · دون أي تأخير في السبرنتات',
    'بكالوريوس علوم الحاسب، UVCE بنغالورو · المعدل 9.09 · منحة سيمنس', '«يفوق التوقعات» في 2025 و2026',
    'الإنجليزية، الهندية، الكنادية، التيلوغوية', 'بنغالورو، الهند · منفتح على فرص العمل في الهند ودول الخليج']],
  ['#quick .q-actions > *', ['تنزيل السيرة الذاتية', 'نسخ البريد', 'واتساب']],
];
const AR = AR_SRC.flatMap(([sel, ar]) => Array.isArray(ar)
  ? [...document.querySelectorAll(sel)].map((el, i) => ar[i] != null && { el, ar: ar[i], en: el.innerHTML }).filter(Boolean)
  : (el => el ? [{ el, ar, en: el.innerHTML }] : [])(document.querySelector(sel)));
let isAr = false;
const langBtn = document.getElementById('lang');
function toggleLang() {
  const apply = () => {
    isAr = !isAr;
    AR.forEach(({ el, ar, en }) => { el.innerHTML = isAr ? ar : en; });
    document.documentElement.lang = isAr ? 'ar' : 'en';
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    langBtn.textContent = isAr ? 'EN' : 'ع';
    document.getElementById('shape-label').textContent = (isAr ? labelsAr : labels)[currentKey];
    cIn.placeholder = isAr ? 'ابحث عن إجراء أو قسم أو شكل…' : 'Search actions, sections, shapes…';
    measure();
    SA.emit('langchange');
    if (isAr) SA.emit('lang');
  };
  document.startViewTransition ? document.startViewTransition(apply) : apply();
}
langBtn.onclick = toggleLang;

/* ============ Text scramble on headline reveal ============ */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/#%&*+=';
function scramble(el) {
  if (isAr || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [];
  while (walker.nextNode()) if (walker.currentNode.nodeValue.trim()) nodes.push([walker.currentNode, walker.currentNode.nodeValue]);
  const total = nodes.reduce((a, [, t]) => a + t.length, 0), D = 900, t0 = performance.now();
  (function frame(now) {
    const k = Math.min((now - t0) / D, 1), shown = Math.floor(k * total);
    let idx = 0;
    for (const [n, orig] of nodes) {
      let str = '';
      for (const ch of orig) { str += (idx < shown || ch === ' ') ? ch : GLYPHS[Math.random() * GLYPHS.length | 0]; idx++; }
      n.nodeValue = str;
    }
    if (k < 1 && !isAr) requestAnimationFrame(frame); else nodes.forEach(([n, o]) => { n.nodeValue = o; });
  })(t0);
}

/* ============ Toast + copy ============ */
const toastEl = document.getElementById('toast');
let toastT;
function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2200); }
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast((document.documentElement.lang === 'ar' ? 'تم النسخ ✓ ' : 'Copied ✓ ') + text); }
  catch { toast(text); }
}
document.querySelectorAll('[data-copy]').forEach(b => { b.onclick = () => copy(b.dataset.copy); });

/* ============ Overlays: quick view + command palette ============ */
const cmdk = document.getElementById('cmdk'), quick = document.getElementById('quick');
const cIn = document.getElementById('cmdk-input'), cList = document.getElementById('cmdk-list');
let lastFocus = null;
function closeOverlays() {
  const wasOpen = !cmdk.hidden || !quick.hidden;
  cmdk.hidden = true; quick.hidden = true;
  if (wasOpen) lastFocus?.focus?.();
}
function openQuick() { SA.emit('summary'); closeOverlays(); lastFocus = document.activeElement; quick.hidden = false; document.getElementById('quick-x').focus(); }
[cmdk, quick].forEach(o => o.addEventListener('pointerdown', e => { if (e.target === o) closeOverlays(); }));
document.getElementById('quick-x').onclick = closeOverlays;
document.getElementById('quick-btn').onclick = openQuick;

const go = id => () => scrollToEl(document.getElementById(id));
const ACTIONS = [
  { g: 'Navigate', i: '⌂', l: 'Home', run: go('home') },
  { g: 'Navigate', i: '◎', l: 'About', run: go('about') },
  { g: 'Navigate', i: '◈', l: 'Impact in numbers', run: go('impact') },
  { g: 'Navigate', i: '▤', l: 'Experience', k: 'work insightsoftware career', run: go('work') },
  { g: 'Navigate', i: '⚙', l: 'Tech stack', k: 'skills', run: go('skills') },
  { g: 'Navigate', i: '🎓', l: 'Education & recognition', k: 'cgpa uvce', run: go('edu') },
  { g: 'Navigate', i: '✉', l: 'Contact', run: go('contact') },
  { g: 'Recruiter', i: '⚡', l: '30-second summary', k: 'quick hr recruiter overview', run: openQuick },
  { g: 'Recruiter', i: '↓', l: 'Download résumé (PDF)', k: 'cv resume', run: () => { location.href = 'Syed_Abdulla_Resume.pdf'; } },
  { g: 'Recruiter', i: '⧉', l: 'Copy email address', h: 'syedabdulla761@gmail.com', run: () => copy('syedabdulla761@gmail.com') },
  { g: 'Recruiter', i: '☏', l: 'Copy phone number', h: '+91 88676 18049', run: () => copy('+91 88676 18049') },
  { g: 'Recruiter', i: '💬', l: 'Message on WhatsApp', run: () => open('https://wa.me/918867618049', '_blank') },
  { g: 'Recruiter', i: '⌥', l: 'Open GitHub', run: () => open('https://github.com/syedabdulla761', '_blank') },
  { g: 'Experience', i: '✦', l: 'Toggle العربية / English', k: 'arabic language rtl', run: toggleLang },
  { g: 'Experience', i: '♪', l: 'Toggle ambient sound', k: 'audio music', run: () => sndBtn.click() },
  { g: 'Experience', i: '›_', l: 'Open terminal', k: 'console shell', run: () => toggleTerm(true) },
  { g: 'Experience', i: '✺', l: 'Trigger shockwave', k: 'explode burst', run: () => SA.shockwave() },
  ...Object.keys(labels).map(k => ({ g: 'Morph particles', i: '◇', l: 'Shape → ' + labels[k].split(' / ')[1].toLowerCase(), k, run: () => setShape(k) })),
];
const ACT_AR = { 'Home': 'الرئيسية', 'About': 'نبذة عني', 'Impact in numbers': 'الإنجازات بالأرقام', 'Experience': 'الخبرات', 'Tech stack': 'المهارات التقنية',
  'Education & recognition': 'التعليم والتقدير', 'Contact': 'تواصل', '30-second summary': 'ملخص في 30 ثانية', 'Download résumé (PDF)': 'تنزيل السيرة الذاتية (PDF)',
  'Copy email address': 'نسخ البريد الإلكتروني', 'Copy phone number': 'نسخ رقم الهاتف', 'Message on WhatsApp': 'مراسلة عبر واتساب', 'Open GitHub': 'فتح GitHub',
  'Toggle العربية / English': 'English / العربية', 'Toggle ambient sound': 'تشغيل الصوت أو إيقافه', 'Open terminal': 'فتح الطرفية', 'Trigger shockwave': 'إطلاق موجة صادمة' };
const GRP_AR = { 'Navigate': 'التنقل', 'Recruiter': 'لمسؤولي التوظيف', 'Experience': 'التجربة', 'Morph particles': 'تشكيل الجسيمات', 'Play': 'اللعب' };
const actLabel = a => document.documentElement.lang !== 'ar' ? a.l
  : a.g === 'Morph particles' ? 'الشكل ← ' + labelsAr[a.k].split(' / ')[1] : (ACT_AR[a.l] || a.la || a.l);
const grpLabel = g => document.documentElement.lang === 'ar' ? (GRP_AR[g] || g) : g;
let filtered = ACTIONS, sel = 0;
function renderCmdk() {
  const q = cIn.value.trim().toLowerCase();
  filtered = ACTIONS.filter(a => !q || q.split(/\s+/).every(w => (a.l + ' ' + actLabel(a) + ' ' + (a.k || '') + ' ' + a.g + ' ' + grpLabel(a.g)).toLowerCase().includes(w)));
  sel = Math.min(sel, Math.max(filtered.length - 1, 0));
  let html = '', grp = '';
  filtered.forEach((a, i) => {
    if (a.g !== grp) { grp = a.g; html += `<li class="grp">${grpLabel(grp)}</li>`; }
    html += `<li class="it${i === sel ? ' sel' : ''}" role="option" data-i="${i}"><i>${a.i}</i>${actLabel(a)}${a.h ? `<small>${a.h}</small>` : ''}</li>`;
  });
  cList.innerHTML = html || (document.documentElement.lang === 'ar' ? '<li class="none">لا نتائج — جرّب «resume» أو «globe»</li>' : '<li class="none">No results — try “resume” or “globe”</li>');
  cList.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
}
function openCmdk() { SA.emit('cmdk'); closeOverlays(); lastFocus = document.activeElement; cmdk.hidden = false; cIn.value = ''; sel = 0; renderCmdk(); cIn.focus(); }
function runSel(i = sel) { const a = filtered[i]; if (!a) return; closeOverlays(); a.run(); }
cIn.addEventListener('input', () => { sel = 0; renderCmdk(); });
cIn.addEventListener('keydown', e => {
  if (!filtered.length) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % filtered.length; renderCmdk(); }
  if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + filtered.length) % filtered.length; renderCmdk(); }
  if (e.key === 'Enter') { e.preventDefault(); runSel(); }
});
cList.addEventListener('click', e => { const li = e.target.closest('.it'); if (li) runSel(+li.dataset.i); });
cList.addEventListener('pointermove', e => {
  const li = e.target.closest('.it');
  if (li && +li.dataset.i !== sel) { sel = +li.dataset.i; cList.querySelectorAll('.it').forEach(x => x.classList.toggle('sel', +x.dataset.i === sel)); }
});
document.getElementById('kbar-btn').onclick = openCmdk;
document.getElementById('dock-k').onclick = openCmdk;

/* ============ Mobile dock active state ============ */
const dockLinks = [...document.querySelectorAll('.dock a')];
const dockIO = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting && !tunnelOn) dockLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
}), { threshold: 0.4 });
sections.forEach(s => dockIO.observe(s));


Object.assign(SA, { actions: ACTIONS, toast, copy, openCmdk, closeOverlays });
SA.panels = panels;
