const CACHE = "orcamentos-publico-v1";
const PUBLICOS = ["/offline.html", "/icone.svg"];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PUBLICOS))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(
          chaves
            .filter(
              (chave) =>
                chave.startsWith("orcamentos-publico-") && chave !== CACHE,
            )
            .map((chave) => caches.delete(chave)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (PUBLICOS.includes(url.pathname)) {
    event.respondWith(
      caches
        .match(url.pathname)
        .then((cached) => cached || fetch(event.request)),
    );
    return;
  }
  if (event.request.mode === "navigate")
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/offline.html")),
    );
});
