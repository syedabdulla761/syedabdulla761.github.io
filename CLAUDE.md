# Syed Abdulla — Portfolio (context for Claude)

Personal portfolio of **Syed Abdulla**, Full-Stack Software Engineer at insightsoftware (Bengaluru).
Live: **https://syedabdulla761.github.io/** · Repo: `syedabdulla761/syedabdulla761.github.io` (GitHub Pages, branch `main`, root).

Read this whole file before changing anything. It records what was built, why, what was rejected, and what's left.

---

## 1. Vision

- **Audience:** tech hirers in **India and the Middle East / GCC** (Dubai, Riyadh, Doha). Syed is open to roles in both.
- **Goal:** a portfolio that is *memorable* (a layman should enjoy exploring it) **and** *recruiter-practical* (facts, résumé, contact in seconds).
- **Look:** dark cosmic theme — near-black background, gold `#e8b04b` / ivory / teal `#2dd4bf` accents, glowing Three.js particles with bloom. The **8-pointed Khatam star** (two rotated squares) is the recurring motif: favicon, loader, cursor, card watermark, a particle shape. Nods to Indian + Islamic geometric art.
- **Tone:** confident, metric-led. The résumé's real numbers carry the site.

## 2. Hard-won preferences (follow these)

- **No immersive scroll effects.** Tried and rejected as overkill: warp-speed star streaks, tilted 3D section layers, and a full "tunnel" scroll (Singularity-style). Scrolling must stay a normal page; only gentle Lenis smoothing on desktop + a slow star drift.
- **Don't add a light/dark toggle** — the glow/bloom identity depends on the dark background (user agreed).
- **Feature-light over feature-heavy.** Already removed: hidden terminal, "stats for nerds" + "last deployed" tiles, vertical shape label, separate bug-squash mini-game, card flip button.
- **Arabic is optional** — keep everyday Arabic; keep industry terms (backports, sprints, breaking changes, Frontend/Backend, job titles, product names) in **English**. Don't use dictionary coinages.
- Be accurate about claims; numbers below are the source of truth.

## 3. Content facts (source of truth)

- Product renamed **Logi Symphony → Simba** (Sept 2026, launched). Write "Simba (formerly Logi Symphony)" where context helps.
- **Playground** (Syed built it from the ground up, React + Spring Boot) is **public and marketed worldwide** at **https://playground.simba.com/** — the product sandbox for insightsoftware's *thousands of client companies*. Never say "100+ customers".
- Jira (insightsoftware.atlassian.net, as of 2026-10-01): **305 tickets done** — **95 bugs**, 95 stories/tasks/features, **4 spikes** (AG-Grid v31→v35 upgrade, SSR embedding R&D, per-user private folders migration, a customer Time Bar Slider investigation — never publish customer names).
- Dates: intern hire **2023-02-20**, full-time **2023-07-24**. Career counter starts 2023-02-20.
- Other metrics: −42% grid bundle, 130K-point chart crash fix, 89 backports / 11 releases, +40% WCAG, 150+ agent commits reviewed, 0 sprint spillovers, CGPA 9.09, Siemens Scholar, 12th 96.16%, 10th 96.48%, "Exceeds Expectations" 2025 & 2026.
- Contact: syedabdulla761@gmail.com · +91 88676 18049 (WhatsApp) · LinkedIn https://www.linkedin.com/in/syed-abdulla-6467311b6/ · GitHub https://github.com/syedabdulla761
- Name in Arabic: **سيد عبدالله**.

## 4. Architecture (no build step)

| File | Role |
|---|---|
| `index.html` | All sections: hero, about, impact, **playground** (featured work), work (timeline), skills, edu, live, contact; overlays (⌘K palette, 30-sec summary, achievements panel); HUD; JSON-LD Person schema |
| `style.css` | All styles; tokens in `:root`; Arabic/RTL rules under `html[lang=ar]` / `[dir=rtl]` |
| `main.js` (ES module) | Three.js scene: 16K particles desktop / 12K mobile morphing between shapes per section, bloom (UnrealBloomPass), gestures (tap = shockwave, hold = black hole, drag = orbit), gyro parallax, WebAudio sound (harp strum, scroll filter, rumble), reveals/counters/scramble, Lenis, i18n (`AR_SRC`), ⌘K palette (`ACTIONS`), cursor. Exposes `window.SA` (event bus `SA.emit/on`, `tone/pluck/boom`, `setShape`, `shockwave`, `scrollTo`, `actions`, `toast`, …) |
| `extras.js` (module, loads after main) | Live tiles (IST clock/status, Open-Meteo weather, visitor-timezone overlap, career counter), holographic card (drag/flick spin, QR via `qrcode-generator`), exploration game (8 hidden bugs on real content + 14 achievements, progress in `localStorage` key `sa-progress-v1`), Playground screen carousel |
| `sw.js` | Network-first service worker. **Bump `CACHE` (currently `sa-portfolio-v8`) on every deploy.** |
| `img/` | Playground screenshots (WebP) + `playground-themes.gif` (theme-switching capture) |
| `Syed_Abdulla_Resume.pdf/.docx` | Résumé served by the site (generated from v14, see §6) |
| `Syed_Abdulla.vcf`, `manifest.webmanifest`, `icon-*.png`, `favicon.svg`, `og.png` | Contact card, PWA, icons, link preview |
| `tools/` | Reusable scripts (résumé regeneration, Playground capture, browser tests) — see `tools/README.md` |

CDN deps: three@0.160.0 (import map, plus `three/addons/`), lenis@1.1.13, qrcode-generator@1.4.4, Google Fonts (Syne, Inter, JetBrains Mono, Cairo, Noto Kufi Arabic, Noto Sans Devanagari/Kannada).

### Gotchas already solved (don't regress)
- Renderer clear colour and fog must be **`0x000000`**: with OutputPass the sRGB conversion turned `#06070b` slate-grey.
- Camera parallax vector `mouse` defaults to **(0,0)**; the interaction vector `aim` uses (9,9) as "off". A (9,9) default skews the camera on phones.
- Mobile "SA" monogram is fitted into the gap between the nav and `.greet` (`textShape` in main.js) so it never covers the name. Re-check this if the hero layout changes.
- Mobile bloom runs at pixel ratio 1 and auto-disables if FPS < 34 for 2s.
- i18n: `AR_SRC` targets **leaf elements** so live values (clocks, counters, hidden bugs) survive the innerHTML swap. Spans like `.i-you`, `.i-since`, `#tag-pre` exist for that reason. `en` HTML is captured at load.
- Shared `const` names: `main.js` has a module-level `let scrollY` — use `window.scrollY` inside functions.
- Fixed/overlay elements (`.overlay`, `.dock`, `.holo-wrap`, `.tile`) are excluded from background gestures via the `UI` selector in main.js.

## 5. Deploying

- Remote: `git@github.com-personal:syedabdulla761/syedabdulla761.github.io.git` (SSH alias for the **personal** key in `~/.ssh/config`). The `gh` CLI on this machine is logged into the **work** account — it can't manage this repo; use git over SSH and the public GitHub API for read-only checks.
- Repo-local git identity is `syedabdulla761@gmail.com` (don't commit with the work email).
- Pages builds in ~1 min. If a run sits at "waiting", push an empty commit (`git commit --allow-empty -m "Rebuild" && git push`).
- Verify with `curl --ssl-no-revoke …` (corporate network breaks cert revocation checks).

## 6. Résumé

- `~/Downloads/Syed_Abdulla_Resume_v13.docx` = user's original (never edit). **v14** = current, produced by `tools/resume_v14.ps1` (Word COM): regenerates v14 from v13 with find/replace edits, LinkedIn + Portfolio header links, then exports `Syed_Abdulla_Resume.pdf` into this repo. Copy v14 to `Syed_Abdulla_Resume.docx` too. Must stay **1 page** (script prints page count).
- Gotcha: inserting text at a hyperlink's end puts it *inside* the link — the script inserts before the paragraph mark instead.

## 7. Testing

Browser tests use `puppeteer-core` driving installed Edge (headless, `--enable-unsafe-swiftshader` for WebGL). See `tools/README.md`. Always check: no `pageerror`, `scrollWidth - innerWidth === 0`, desktop 1440×900 + phones 390×844 / 360×740 / 430×932, English and Arabic. Screenshot clips need `+ scrollY` (page coordinates).

## 8. Status & what's left

**Done (as of 2026-10-01):** everything in §4; Playground case study; Jira-verified numbers; LinkedIn everywhere; résumé v14; Simba rename; feature trim; mobile name-overlap fix.

**Open items:**
1. **IMPORTANT — professional photo.** User will provide one. Suggested spots: hero (beside the name), 30-second summary, holographic card. Gulf recruiters expect it.
2. **`og.png` link preview** still says "India & GCC" and lacks the Playground — regenerate (1200×630, render HTML in headless Edge) to say "India & Middle East".
3. User should **pin `syedabdulla761.github.io`** on their GitHub profile (old coursework repos were made private).
4. Optional: native-speaker review of the Arabic.

**Last self-rating: 8.5/10.** Main remaining gap was visual proof of work (now added via the Playground case study) plus the photo.
