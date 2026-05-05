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
// Generic Coach Hub icons live alongside the rest of the project's
// assets. They are pre-rasterized from assets/app-icon.svg (the
// rounded blue square with the "CH" monogram). The Carouge crest is
// kept separate and only shown for the Carouge team inside the app.
const icons = [
  { src: path.resolve('assets', 'icon-192.png'), out: 'icon-192.png' },
  { src: path.resolve('assets', 'icon-512.png'), out: 'icon-512.png' },
];
let iconCount = 0;
for (const { src, out } of icons) {
  if (!fs.existsSync(src)) {
    console.warn(`⚠ ${src} missing — skipping ${out}`);
    continue;
  }
  fs.copyFileSync(src, path.join(DIST, out));
  iconCount += 1;
}
console.log(`✓ copied ${iconCount} PWA icon(s) into dist/`);

// ---- 3. Service worker ---------------------------------------------

const SW_VERSION = `coachhub-${Date.now()}`;
const sw = `// Coach Hub service worker — generated at build time.
// Strategy: NETWORK-FIRST for everything we control, with a cache
// fallback for offline. Cache-first would be faster but it bit us:
// devices that installed the PWA before a fix kept seeing the old
// bundle until they manually cleared the cache. Network-first is a
// few ms slower online, but you always get the latest deploy.

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

// Allow the page to ask the SW to update itself immediately by
// posting { type: 'SKIP_WAITING' }. The page does this whenever a
// new SW is registered.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function networkFirst(req, cache) {
  return fetch(req)
    .then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(cache).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    })
    .catch(() => caches.match(req));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never intercept Supabase REST / Realtime traffic — let it hit
  // the network directly.
  if (url.hostname.endsWith('.supabase.co')) return;

  // Navigation: network-first, fall back to cached index.html so the
  // app boots even fully offline.
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

  // Same-origin static assets: also network-first now. Cache only
  // serves as the offline fallback.
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(req, CACHE));
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
        var refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', function () {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
        window.addEventListener('load', function () {
          navigator.serviceWorker
            .register('${BASE}/sw.js', { scope: '${BASE}/' })
            .then(function (reg) {
              if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
              reg.addEventListener('updatefound', function () {
                var sw = reg.installing;
                if (!sw) return;
                sw.addEventListener('statechange', function () {
                  if (sw.state === 'installed' && navigator.serviceWorker.controller) {
                    sw.postMessage({ type: 'SKIP_WAITING' });
                  }
                });
              });
            })
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

// Force `viewport-fit=cover` on the viewport meta tag — without it,
// iOS Safari refuses to expose safe-area-inset-* values to the
// page when running in PWA standalone mode, and the bottom tab bar
// gets clipped by the home indicator.
html = html.replace(
  /<meta\s+name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />',
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
