const p = require('puppeteer-core');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');
const { PNG } = require('pngjs');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--ignore-certificate-errors'] });
  const pg = await b.newPage(); await pg.setViewport({ width: 1440, height: 900, deviceScaleFactor: 0.5 });
  await pg.goto('https://playground.simba.com/discovery/ui-themes?dashboardId=69bac71bf1ba966a2d01aab5&embedComponentType=dashboard', { waitUntil: 'networkidle2', timeout: 90000 });
  const dismiss = () => pg.evaluate(() => [...document.querySelectorAll('button,a,span,div')].filter(e => e.innerText && e.innerText.trim() === 'Dismiss' && e.offsetParent).forEach(e => e.click()));
  await sleep(4000); await dismiss(); await sleep(18000); await dismiss();
  const opts = await pg.evaluate(() => { const s = [...document.querySelectorAll('select')].find(x => [...x.options].some(o => /default/i.test(o.text)) && x.closest('div')?.innerText.includes('Themes')) || [...document.querySelectorAll('select')][2]; s.id = s.id || 'theme-sel'; return { id: s.id, opts: [...s.options].map(o => o.value + '|' + o.text) }; });
  console.log('theme options', JSON.stringify(opts));
  const frames = [];
  const grab = async n => { for (let i = 0; i < n; i++) { frames.push(await pg.screenshot({ type: 'png' })); await sleep(350); } };
  await grab(6);
  const values = opts.opts.map(o => o.split('|')[0]).filter(v => v && !/default/i.test(v)).slice(0, 3);
  for (const v of values.concat([opts.opts[0].split('|')[0]])) {
    await pg.select('#' + opts.id, v);
    await pg.evaluate(() => [...document.querySelectorAll('button')].find(x => x.innerText.trim() === 'Apply Settings')?.click());
    await sleep(4000); await dismiss(); await sleep(12000); await dismiss(); await sleep(500);
    await grab(6);
  }
  const W = 720, H = 450, gif = GIFEncoder();
  for (const buf of frames) {
    const png = PNG.sync.read(Buffer.from(buf));
    const data = new Uint8Array(png.data.buffer, png.data.byteOffset, png.data.length);
    const pal = quantize(data, 128); const idx = applyPalette(data, pal);
    gif.writeFrame(idx, png.width, png.height, { palette: pal, delay: 350 });
  }
  gif.finish();
  fs.writeFileSync(process.argv[2], Buffer.from(gif.bytes()));
  console.log('frames', frames.length, 'bytes', fs.statSync(process.argv[2]).size);
  await b.close();
})();
