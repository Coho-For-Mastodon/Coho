import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const outputDir = path.join(root, 'output', 'pdf');
const tempDir = path.join(root, 'tmp', 'pdfs');

const iconPath = path.join(
  root,
  'public',
  'assets',
  'icons',
  'new-icons',
  'icon-256x256.png'
);

const toDataUrl = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  const base64 = fs.readFileSync(filePath, 'base64');
  return `data:${mime};base64,${base64}`;
};

const iconData = toDataUrl(iconPath);

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Coho Poster</title>
  <style>
    @page {
      size: 11in 17in;
      margin: 0;
    }

    :root {
      --bg-1: #0a1727;
      --bg-2: #050d17;
      --ink: #e9f3ff;
      --muted: #98b4d4;
      --brand: #4cb5ff;
      --brand-2: #2fd6a5;
      --card: rgba(15, 33, 52, 0.9);
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      width: 11in;
      height: 17in;
      font-family: "Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      color: var(--ink);
      background: radial-gradient(circle at 18% 12%, #183451 0%, var(--bg-1) 38%, var(--bg-2) 100%);
    }

    .poster {
      position: relative;
      width: 100%;
      height: 100%;
      padding: 0.6in;
      overflow: hidden;
    }

    .shape {
      position: absolute;
      border-radius: 999px;
      filter: blur(2px);
      opacity: 0.42;
    }

    .shape.one {
      width: 4.4in;
      height: 4.4in;
      top: -1.2in;
      right: -1.1in;
      background: linear-gradient(145deg, #1d508a, #1f7f7a);
    }

    .shape.two {
      width: 3.3in;
      height: 3.3in;
      bottom: -0.9in;
      left: -1in;
      background: linear-gradient(145deg, #2a3c71, #225173);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.16in;
      margin-bottom: 0.25in;
    }

    .brand img {
      width: 0.62in;
      height: 0.62in;
      border-radius: 0.14in;
      box-shadow: 0 12px 30px rgba(6, 20, 36, 0.55);
    }

    .brand .name {
      font-size: 0.33in;
      font-weight: 800;
      letter-spacing: 0.02em;
      line-height: 1;
    }

    .brand .tag {
      font-size: 0.15in;
      color: var(--muted);
      margin-top: 0.02in;
      font-weight: 600;
    }

    .main {
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      gap: 0.36in;
      height: calc(100% - 1.05in);
    }

    h1 {
      margin: 0;
      font-size: 0.9in;
      line-height: 0.95;
      letter-spacing: -0.015em;
    }

    .headline-accent {
      color: var(--brand);
    }

    .subhead {
      margin-top: 0.17in;
      font-size: 0.24in;
      line-height: 1.35;
      color: #c7dcf5;
      max-width: 95%;
    }

    .pillars {
      margin-top: 0.18in;
      display: grid;
      gap: 0.16in;
    }

    .card {
      background: linear-gradient(150deg, rgba(18, 39, 61, 0.95), rgba(13, 31, 50, 0.9));
      border: 1px solid rgba(121, 168, 214, 0.24);
      border-radius: 0.16in;
      padding: 0.17in 0.18in;
      box-shadow: 0 14px 30px rgba(6, 16, 28, 0.4);
    }

    .card h3 {
      margin: 0;
      font-size: 0.22in;
      line-height: 1.2;
    }

    .card p {
      margin: 0.08in 0 0;
      font-size: 0.16in;
      line-height: 1.35;
      color: #a6c2dd;
    }

    .why {
      margin-top: 0.16in;
      background: linear-gradient(150deg, rgba(16, 36, 56, 0.96), rgba(12, 28, 45, 0.94));
      border-radius: 0.18in;
      padding: 0.2in;
      border: 1px solid rgba(121, 168, 214, 0.24);
      box-shadow: 0 14px 32px rgba(6, 15, 25, 0.42);
    }

    .why h2 {
      margin: 0;
      font-size: 0.27in;
    }

    .why ul {
      margin: 0.12in 0 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 0.08in;
    }

    .why li {
      font-size: 0.17in;
      line-height: 1.35;
      color: #b4cde7;
      padding-left: 0.24in;
      position: relative;
    }

    .why li::before {
      content: "";
      width: 0.11in;
      height: 0.11in;
      border-radius: 999px;
      background: linear-gradient(145deg, var(--brand), var(--brand-2));
      position: absolute;
      left: 0;
      top: 0.055in;
    }

    .right {
      display: grid;
      grid-template-rows: auto auto auto auto;
      gap: 0.15in;
      align-content: start;
    }

    .proof {
      margin-top: 0.02in;
      border-radius: 0.18in;
      background: linear-gradient(155deg, rgba(18, 48, 77, 0.95), rgba(15, 37, 59, 0.95));
      border: 1px solid rgba(121, 168, 214, 0.28);
      padding: 0.2in;
      box-shadow: 0 16px 34px rgba(5, 14, 24, 0.46);
    }

    .proof h2 {
      margin: 0;
      font-size: 0.28in;
      line-height: 1.15;
    }

    .proof p {
      margin: 0.1in 0 0;
      font-size: 0.17in;
      line-height: 1.32;
      color: #bad1ea;
    }

    .proof-grid {
      margin-top: 0.14in;
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.1in;
    }

    .proof-chip {
      border-radius: 0.12in;
      border: 1px solid rgba(121, 168, 214, 0.24);
      background: rgba(8, 25, 42, 0.72);
      padding: 0.12in 0.14in;
      font-size: 0.16in;
      color: #d3e6fb;
    }

    .metric {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.12in;
    }

    .metric .kpi {
      background: rgba(14, 32, 50, 0.95);
      border-radius: 0.14in;
      border: 1px solid rgba(121, 168, 214, 0.24);
      padding: 0.14in;
      min-height: 1.05in;
    }

    .kpi .label {
      font-size: 0.14in;
      color: #82a4c7;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .kpi .value {
      margin-top: 0.06in;
      font-size: 0.24in;
      line-height: 1.2;
      font-weight: 800;
      color: #dbeeff;
    }

    .quote {
      margin-top: 0.05in;
      padding: 0.18in;
      border-radius: 0.14in;
      background: linear-gradient(145deg, rgba(76, 181, 255, 0.18), rgba(47, 214, 165, 0.16));
      border: 1px solid rgba(100, 185, 237, 0.3);
      font-size: 0.2in;
      line-height: 1.35;
      color: #e4f2ff;
      font-weight: 600;
    }

    .cta {
      margin-top: 0.06in;
      border-radius: 0.18in;
      background: linear-gradient(160deg, #0b4d85, #0078d4 45%, #00a884);
      color: #fff;
      padding: 0.22in;
      box-shadow: 0 18px 34px rgba(6, 40, 78, 0.3);
    }

    .cta .small {
      font-size: 0.14in;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      opacity: 0.9;
      font-weight: 700;
    }

    .cta .url {
      margin-top: 0.06in;
      font-size: 0.32in;
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: 0.01em;
    }

    .cta .sub {
      margin-top: 0.08in;
      font-size: 0.16in;
      opacity: 0.95;
    }

    .foot {
      position: absolute;
      left: 0.6in;
      bottom: 0.24in;
      right: 0.6in;
      display: flex;
      justify-content: space-between;
      font-size: 0.12in;
      color: #8ba9ca;
      font-weight: 600;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="poster">
    <div class="shape one"></div>
    <div class="shape two"></div>

    <div class="brand">
      <img src="${iconData}" alt="Coho icon" />
      <div>
        <div class="name">Coho</div>
        <div class="tag">Fast, offline-first Mastodon client</div>
      </div>
    </div>

    <div class="main">
      <section>
        <h1>Simple,<br/><span class="headline-accent">powerful</span><br/>social.</h1>
        <div class="subhead">
          Coho is built for people who want Mastodon to feel calm, instant, and dependable on any device and any network.
        </div>

        <div class="why">
          <h2>Why people choose Coho</h2>
          <ul>
            <li>Works when the connection is weak or completely offline.</li>
            <li>Install once and use it across iOS, Android, Windows, macOS, and Linux.</li>
            <li>Optimistic UI keeps your flow moving instead of waiting on network round trips.</li>
            <li>Modern PWA architecture gives native quality behavior in a smaller footprint.</li>
          </ul>
        </div>

        <div class="pillars">
          <article class="card">
            <h3>Offline that actually works</h3>
            <p>Your timeline stays available. Likes, boosts, and posts are captured offline and sync automatically when you reconnect.</p>
          </article>
          <article class="card">
            <h3>Fast on old phones and bad networks</h3>
            <p>Strict lazy loading, worker offloading, and smart caching keep interactions responsive instead of stalling the UI.</p>
          </article>
          <article class="card">
            <h3>Clean design without losing power</h3>
            <p>A focused interface keeps noise low while still giving power users the tools they need.</p>
          </article>
        </div>
      </section>

      <section class="right">
        <div class="proof">
          <h2>Built for real-world conditions</h2>
          <p>Coho is engineered for unreliable networks and lower-end devices, so everyday usage still feels instant and stable.</p>
          <div class="proof-grid">
            <div class="proof-chip">Offline actions queue and replay automatically.</div>
            <div class="proof-chip">Lazy loading and worker offloading keep frame times steady.</div>
            <div class="proof-chip">No polling loops. Event-driven updates by design.</div>
          </div>
        </div>

        <div class="metric">
          <div class="kpi">
            <div class="label">Core promise</div>
            <div class="value">Network does not control your UX</div>
          </div>
          <div class="kpi">
            <div class="label">Design goal</div>
            <div class="value">No clutter. No pop-in. Just flow.</div>
          </div>
        </div>

        <div class="quote">
          "Coho keeps the interface calm and responsive so you can focus on people and ideas, not loading states."
        </div>

        <div class="cta">
          <div class="small">Try the app</div>
          <div class="url">coho.place</div>
          <div class="sub">Offline-first. Performance-first. Built for everyone.</div>
        </div>
      </section>
    </div>

    <div class="foot">
      <span>Progressive Web App</span>
      <span>Open source Mastodon client</span>
    </div>
  </div>
</body>
</html>`;

const posterPreviewPath = path.join(tempDir, 'coho-poster-preview.png');
const posterPdfPath = path.join(outputDir, 'coho-poster.pdf');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 1700 } });

await page.setContent(html, { waitUntil: 'load' });
await page.screenshot({ path: posterPreviewPath, fullPage: true });
await page.pdf({
  path: posterPdfPath,
  width: '11in',
  height: '17in',
  printBackground: true,
  preferCSSPageSize: true,
});

await browser.close();

console.log(`Wrote preview: ${posterPreviewPath}`);
console.log(`Wrote PDF: ${posterPdfPath}`);
