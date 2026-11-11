const CACHE = 'nsl-distance-7ba2e0c644', SHELL = ["/assets/site.css?v=884414b32f", "/assets/site.js?v=f609fe931c", "/icons/mark-light.webp", "/icons/mark-dark.webp"];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.indexOf('nsl-') === 0 && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (u.search.indexOf('v=') > -1 || u.pathname.indexOf('/icons/') === 0) {
    e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; })));
    return;
  }
  const key = u.origin + u.pathname;
  const net = fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); } return res; });
  e.respondWith(caches.match(key).then(hit => {
    if (!hit) return net;
    return Promise.race([net.catch(() => hit), new Promise(ok => setTimeout(() => ok(hit), 3000))]);
  }));
});
