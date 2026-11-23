// 駿河台シティのサービスワーカー：一度読み込んだファイルを iPad などに保存して、
// 次からは保存したものをすぐ使う（電波がなくても開ける）。新しい版は裏で取りに行って、次に開いたときに反映する。
// 地図の小窓の地理院タイル（別のサーバー）は保存しない。
const CACHE = 'suruga-dai-city-v2'; // v2（2026-11-23）：街のデータに版の印を付けたので、v1 の保存を捨てる

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) {
            cache.put(req, res.clone());
            // 街のデータ（?v= で版の印付き）は、同じファイルの古い版を消す（iPad の保存場所がふくらまないように）
            const u = new URL(req.url);
            if (u.searchParams.has('v'))
              cache.keys().then((ks) => ks.forEach((k) => {
                const ku = new URL(k.url);
                if (ku.pathname === u.pathname && ku.search !== u.search) cache.delete(k);
              }));
          }
          return res;
        })
        .catch(() => cached);
      // ページ本体（index.html）は新しい版を優先、それ以外は保存した版をすぐ返す
      return req.mode === 'navigate' ? fresh.then((r) => r || cached) : cached || fresh;
    }),
  );
});
