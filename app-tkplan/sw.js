// 治療計画書ツール オフラインキャッシュ
// 患者データは扱わない（アプリ本体のファイルのみ保存。写真は blob: URL のため SW を経由しない）
// ※ 中身を更新したら、下の CACHE の日付を必ず上げること。
//    版数が同じままだと、古いキャッシュが残って更新が届かない。
const CACHE = "tkplan-2026-07-24b";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  const isNav = req.mode === "navigate" ||
    (req.destination === "" && req.headers.get("accept") || "").includes("text/html");

  if (isNav) {
    // HTML は network-first：更新を確実に届ける（オフライン時のみキャッシュへ退避）
    // no-store＝ブラウザ側の古い控えを使わせず、必ず取りに行く
    e.respondWith(
      fetch(req, { cache: "no-store" }).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copy));
        }
        return res;
      }).catch(() => caches.match("./index.html").then(hit => hit || caches.match("./")))
    );
    return;
  }

  // それ以外（アイコン等）は cache-first。ただし正常な応答だけを保存する
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok && new URL(req.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
