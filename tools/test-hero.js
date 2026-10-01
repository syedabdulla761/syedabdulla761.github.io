const p = require('puppeteer-core'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [w, h] of [[390, 844], [360, 740], [430, 932], [1440, 900]]) {
    const m = w < 800;
    const pg = await b.newPage(); await pg.setViewport({ width: w, height: h, isMobile: m, hasTouch: m });
    const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('http://localhost:8765/', { waitUntil: 'networkidle0' }); await sleep(6500);
    await pg.screenshot({ path: `hero-${w}.png` });
    console.log(w, h, 'errors', errs);
    await pg.close();
  }
  await b.close();
})();
