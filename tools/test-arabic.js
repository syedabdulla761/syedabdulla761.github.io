const p = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await p.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [w, h, m, tag] of [[1440, 900, false, 'd'], [390, 844, true, 'm']]) {
    const pg = await b.newPage(); await pg.setViewport({ width: w, height: h, isMobile: m, hasTouch: m });
    const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', x => x.type() === 'error' && errs.push(x.text()));
    await pg.goto('http://localhost:8765/', { waitUntil: 'networkidle0' }); await sleep(3000);
    await pg.evaluate(() => document.getElementById('lang').click()); await sleep(1500);
    for (const id of (m ? ['home', 'work', 'live', 'contact'] : ['home', 'about', 'work', 'edu', 'live', 'contact'])) {
      await pg.evaluate(i => { const e = document.getElementById(i); window.scrollTo(0, e.offsetTop + (i === 'home' ? 0 : 40)); }, id); await sleep(1600);
      await pg.screenshot({ path: `ar-${tag}-${id}.png` });
    }
    if (!m) {
      const leftovers = await pg.evaluate(() => {
        const allow = /^(React|TypeScript|Java|Spring|Boot|AG-Grid|v31|v35|JPA|REST|ACL|Liquibase|PostgreSQL|JUnit|C#|\.NET|Docker|Git|GitHub|Actions|Bitbucket|Jira|Confluence|Jenkins|SonarCloud|Kubernetes|Agile|Scrum|Blueprint\.js|HTML5|CSS3|WCAG|a11y|Claude|Code|Copilot|Agents|Gemini|AI|insightsoftware|Logi|Symphony|BI|UVCE|IIS|Windows|K8s|CentOS|Raize|Serilog|SDK|Embed|Manager|Bot|API|Crystal|Reports|Source|V2|Playground|Composer|SSR|TS|LOC|CRUD|Syed|Abdulla|Full-Stack|FPS|GPU|IST|Lv|XP|English|playground\.logi-symphony\.com|ES6\+|JavaScript|Spring Security|tabindex|aria-hidden|syedabdulla761@gmail\.com|syedabdulla761\.github\.io|Three\.js|Intel|Arc|Graphics|Kolkata|SA|C|PWA|mobile|dock|gyro|recruiter|summary|palette|command|Bloom|Code|Review|Reviews|GitHub Actions|Security|Data|Enterprise|JS|RTL|WhatsApp|QR|ESC)$/i;
        const out = new Set();
        const walk = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT);
        while (walk.nextNode()) {
          const n = walk.currentNode, el = n.parentElement;
          if (!n.nodeValue.trim() || el.closest('.title, .holo-wrap, .marquee, .pills, .chip, #lv-msg, .greet, .num, .clocks span, #typer, .hbug, .nerd b, [data-tz]')) continue;
          const st = getComputedStyle(el); if (st.display === 'none' || st.visibility === 'hidden') continue;
          const words = n.nodeValue.match(/[A-Za-z][A-Za-z.\-+#]*/g) || [];
          if (words.some(wd => !allow.test(wd))) out.add(n.nodeValue.trim().slice(0, 80));
        }
        return [...out];
      });
      console.log('UNTRANSLATED (' + leftovers.length + '):\n  ' + leftovers.join('\n  '));
      await pg.evaluate(() => document.getElementById('quick-btn').click()); await sleep(800);
      await pg.screenshot({ path: 'ar-d-quick.png' });
      await pg.keyboard.press('Escape');
      await pg.evaluate(() => document.getElementById('lang').click()); await sleep(1200);
      console.log('back to EN — about p:', await pg.$eval('#about .glass > p', e => e.textContent.slice(0, 50)), '| dir', await pg.evaluate(() => document.dir), '| tz', await pg.$eval('#lv-tz', e => e.textContent), '| yr ok', await pg.$eval('footer', e => /© 20\d\d Syed/.test(e.textContent)));
    }
    console.log(tag, 'errors', errs, 'overflow', await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth));
    await pg.close();
  }
  await b.close();
})();
