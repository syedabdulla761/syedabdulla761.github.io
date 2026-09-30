# Syed Abdulla — Portfolio

Interactive 3D portfolio built with **Three.js** and vanilla JS — 16K GPU particles that morph between shapes as you scroll (monogram → Khatam star → data ocean → AG-Grid → torus knot → helix → Bengaluru→GCC globe).

- Live: https://syedabdulla761.github.io/
- **Bloom post-processing** (UnrealBloomPass) on desktop; lighter render path on phones.
- **⌘K / Ctrl+K command palette** — jump to sections, copy email/phone, download résumé, morph shapes.
- **⚡ 30-second recruiter summary** modal.
- **Mobile dock**, gyroscope tilt parallax, haptic shockwave (Android).
- **Full English ⇄ العربية** — every section, the hero name (سيد عبدالله), achievements and command menu translated; layout mirrors right-to-left, Kufi/Cairo Arabic type; View Transitions.
- **Playable sound** — sweep the cursor / swipe to strum a pentatonic harp, scroll speed opens the drone filter, black-hole rumble, bass-drop shockwaves (off by default).
- **Installable PWA** with offline support (network-first service worker).
- **Gestures:** tap = shockwave · press-and-hold = black hole (release for a supernova) · drag / swipe = orbit the 3D cloud with inertia.
- **Live from Bengaluru:** IST clock + availability, live weather (Open-Meteo), visitor timezone & working-hour overlap, career counter, last deploy (GitHub API), stats for nerds (FPS sparkline, GPU, load time).
- **Holographic 3D business card** — pointer/gyro tilt, foil shader, drag/flick to spin with momentum, QR code on the back, one-tap vCard save.
- **Exploration game** — 8 hidden bugs on real content (each reveals a career story) + 15 achievements, XP and levels.
- **Tunnel scroll** — the page never scrolls: you fly down a 3D tunnel of light toward a glowing singularity. Each section emerges blurred from the vanishing point, sharpens, then swells past the camera; long sections scroll while you're parked in them. Lenis inertial scrolling on desktop.
- Hidden terminal: press <kbd>~</kbd>.
- Zero build step: serve the folder with any static server (`npx serve .`).
