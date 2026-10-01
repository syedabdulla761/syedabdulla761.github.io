const p = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = process.argv[2];
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--ignore-certificate-errors'] });
  const pg = await b.newPage(); await pg.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const dismiss = () => pg.evaluate(() => { [...document.querySelectorAll('button,a,span,div')].filter(e => e.innerText && e.innerText.trim() === 'Dismiss' && e.offsetParent).forEach(e => e.click()); });
  const shots = [
    ['home', 'https://playground.simba.com/'],
    ['cross-filter', 'https://playground.simba.com/discovery/cross-visual-filtering?crossVisualFiltersPublish=true&dashboardId=658e9803af70ab3f797a9a3e&embedComponentType=dashboard'],
    ['interactivity', 'https://playground.simba.com/discovery/ux-interactivity?dashboardId=69bac71bf1ba966a2d01aab5&dashboardIpOverrides=true&embedComponentType=dashboard'],
    ['themes', 'https://playground.simba.com/discovery/ui-themes?dashboardId=69bac71bf1ba966a2d01aab5&embedComponentType=dashboard'],
    ['embed-api', 'https://playground.simba.com/discovery/embed-api?embedComponentType=visual-builder&listVisuals=true'],
  ];
  for (const [name, url] of shots) {
    await pg.goto(url, { waitUntil: 'networkidle2', timeout: 90000 }).catch(e => console.log('goto', name, e.message));
    await sleep(4000); await dismiss(); await sleep(22000); await dismiss(); await sleep(800);
    await pg.screenshot({ path: `${OUT}/playground-${name}.webp`, type: 'webp', quality: 80 });
    const spinners = await pg.evaluate(() => document.querySelectorAll('[class*=spinner],[class*=loading],[class*=Spinner]').length);
    console.log(name, 'saved; spinners on page:', spinners, fs.statSync(`${OUT}/playground-${name}.webp`).size);
  }
  await b.close();
})();
