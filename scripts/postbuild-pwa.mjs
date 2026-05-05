// Post-build script: turns the static export into a Progressive Web
// App. Adds a manifest, a service worker, the relevant <link> /
// <meta> tags inside index.html, and an icon at the right sizes.
//
// Run from the repo root after `npx expo export --platform web`:
//   node scripts/postbuild-pwa.mjs
//
// The script is intentionally dependency-free — it uses only Node
// built-ins so it can run on a vanilla GitHub Actions runner without
// any extra `npm install`.

import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const BASE = '/ECFC-FE12';

if (!fs.existsSync(DIST)) {
  console.error(`✗ ${DIST} not found — run \`expo export --platform web\` first.`);
  process.exit(1);
}

// ---- 1. Manifest ----------------------------------------------------

const manifest = {
  name: 'Coach Hub',
  short_name: 'Coach Hub',
  description:
    'Présences, stats et matchs synchronisés avec ton équipe.',
  start_url: `${BASE}/`,
  scope: `${BASE}/`,
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#FAFAFA',
  theme_color: '#006FEE',
  lang: 'fr',
  icons: [
    {
      src: `${BASE}/icon-192.png`,
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: `${BASE}/icon-512.png`,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
  ],
};

fs.writeFileSync(
  path.join(DIST, 'manifest.webmanifest'),
  JSON.stringify(manifest, null, 2),
);
console.log('✓ wrote dist/manifest.webmanifest');

// ---- 2. PWA icons ---------------------------------------------------
// We don't have a build-time image processor; reuse the logo PNG that
// ships with the app. Both icon sizes point to the same source — the
// browser scales it down for the 192 case, while iOS / Android use
// the 512 for the high-res home-screen icon.
const logoSrc = path.resolve('assets', 'logo.png');
if (fs.existsSync(logoSrc)) {
  fs.copyFileSync(logoSrc, path.join(DIST, 'icon-192.png'));
  fs.copyFileSync(logoSrc, path.join(DIST, 'icon-512.png'));
  console.log('✓ copied logo.png to dist/icon-{192,512}.png');
} else {
  console.warn(
    '⚠ assets/logo.png missing — PWA icons will fall back to favicon.',
  );
}

// ---- 3. Service worker ---------------------------------------------

const SW_VERSION = `coachhub-${Date.now()}`;
const sw = `// Coach Hub service worker — generated at build time.
// Strategy:
//   * Pre-cache the app shell (HTML + JS bundle entry) on install.
//   * Network-first for everything else (Supabase API + assets) so
//     fresh data wins, with a cache fallback when offline.
//   * Static assets under /_expo / /assets are cached on first hit.

const CACHE = '${SW_VERSION}';
const SHELL = [
  '${BASE}/',
  '${BASE}/index.html',
  '${BASE}/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE && k.startsWith('coachhub-'))
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never intercept Supabase REST / Realtime traffic — let it hit
  // the network directly.
  if (url.hostname.endsWith('.supabase.co')) return;

  // For navigation requests, try network first, fall back to cached
  // index.html so the app boots even fully offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('${BASE}/index.html')),
    );
    return;
  }

  // Same-origin static assets: cache-first then network.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }).catch(() => hit);
      }),
    );
  }
});
`;
fs.writeFileSync(path.join(DIST, 'sw.js'), sw);
console.log(`✓ wrote dist/sw.js  (${SW_VERSION})`);

// ---- 4. Patch index.html -------------------------------------------

const indexPath = path.join(DIST, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const headInjections = `
    <link rel="manifest" href="${BASE}/manifest.webmanifest">
    <meta name="theme-color" content="#006FEE">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="Coach Hub">
    <link rel="apple-touch-icon" href="${BASE}/icon-192.png">
    <link rel="apple-touch-icon" sizes="192x192" href="${BASE}/icon-192.png">
    <link rel="apple-touch-icon" sizes="512x512" href="${BASE}/icon-512.png">
`;

const swRegister = `
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker
            .register('${BASE}/sw.js', { scope: '${BASE}/' })
            .catch(function () { /* ignore — PWA is opt-in */ });
        });
      }
    </script>
`;

// Update the document title so iOS / Android pick it up when the
// app is added to the home screen.
html = html.replace(
  /<title>[^<]*<\/title>/,
  '<title>Coach Hub</title>',
);

if (!html.includes('manifest.webmanifest')) {
  html = html.replace('</head>', `${headInjections}  </head>`);
}
if (!html.includes("navigator.serviceWorker")) {
  html = html.replace('</body>', `${swRegister}  </body>`);
}

fs.writeFileSync(indexPath, html);
console.log('✓ patched dist/index.html');

console.log('\\n✓ PWA artifacts ready in dist/.');
