const p = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const open = async (w, h, mobile) => {
    const pg = await b.newPage();
    await pg.setViewport({ width: w, height: h, isMobile: mobile, hasTouch: mobile });
    const errs = []; pg.on('pageerror', e => errs.push('PAGEERR ' + e.message)); pg.on('console', m => m.type() === 'error' && errs.push('CONSOLE ' + m.text()));
    await pg.goto('http://localhost:8765/', { waitUntil: 'networkidle0' }); await sleep(3500);
    return [pg, errs];
  };
  const center = async (pg, sel) => { await pg.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center', behavior: 'instant' }), sel); await sleep(1400); const bb = await (await pg.$(sel)).boundingBox(); return [bb.x + bb.width / 2, bb.y + bb.height / 2, bb]; };

  // ---------------- desktop ----------------
  let [pg, errs] = await open(1440, 900, false);
  await pg.click('#snd'); await sleep(600);
  for (let x = 100; x < 1300; x += 60) await pg.mouse.move(x, 820);   // strum the harp
  await pg.mouse.move(1150, 800); await pg.mouse.down(); await sleep(1500); await pg.mouse.up(); await sleep(400); // black hole
  await pg.mouse.move(1000, 820); await pg.mouse.down(); await pg.mouse.move(1300, 820, { steps: 12 }); await pg.mouse.up(); // spin
  await sleep(1200);
  await pg.screenshot({ path: 'z-toasts.png' });
  // bug in About
  const [bx, by] = await center(pg, '#about .hbug');
  await pg.mouse.click(bx, by); await sleep(900);
  await pg.screenshot({ path: 'z-bugfact.png' });
  // card drag
  const [cx, cy, cbb] = await center(pg, '#holo');
  await pg.mouse.move(cx - 60, cy); await pg.mouse.down();
  await pg.mouse.move(cx + 60, cy, { steps: 8 }); await sleep(100);
  await pg.screenshot({ path: 'z-card-mid.png', clip: { x: cbb.x - 60, y: cbb.y - 40 + (await pg.evaluate(() => scrollY)), width: cbb.width + 120, height: cbb.height + 80 } });
  await pg.mouse.move(cx + 200, cy, { steps: 6 }); await pg.mouse.up(); await sleep(900);
  const tf1 = await pg.$eval('#holo', e => e.style.transform);
  await pg.screenshot({ path: 'z-card-after.png', clip: { x: cbb.x - 60, y: cbb.y - 40 + (await pg.evaluate(() => scrollY)), width: cbb.width + 120, height: cbb.height + 80 } });
  await pg.mouse.click(cx, cy); await sleep(900);
  const tf2 = await pg.$eval('#holo', e => e.style.transform);
  console.log('card after drag:', tf1, '| after tap:', tf2);
  // panel
  await pg.click('#hud'); await sleep(700);
  await pg.screenshot({ path: 'z-panel.png' });
  const state = await pg.evaluate(() => JSON.parse(localStorage.getItem('sa-progress-v1')));
  console.log('progress', JSON.stringify(state), 'bugs on page', await pg.$$eval('.hbug', e => e.length));
  console.log('desktop errors', errs, 'overflow', await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  await pg.close();

  // ---------------- mobile ----------------
  [pg, errs] = await open(390, 844, true);
  await pg.screenshot({ path: 'w-hero.png' });
  const [mx, my] = await center(pg, '#holo');
  await pg.touchscreen.touchStart(mx - 80, my); for (let k = 1; k <= 8; k++) { await pg.touchscreen.touchMove(mx - 80 + k * 25, my); await sleep(16); } await pg.touchscreen.touchEnd(); await sleep(900);
  console.log('mobile card after swipe:', await pg.$eval('#holo', e => e.style.transform));
  await pg.screenshot({ path: 'w-card.png' });
  await center(pg, '#live .t-ship'); await pg.screenshot({ path: 'w-live.png' });
  console.log('mobile fps', await pg.evaluate(() => window.SA.fps), 'particles', await pg.evaluate(() => window.SA.N));
  console.log('mobile errors', errs, 'overflow', await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  await b.close();
})();
