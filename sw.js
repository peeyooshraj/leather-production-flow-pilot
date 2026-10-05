const CACHE = "flow-pilot-v0.3";
const APP_SHELL = ["./", "./index.html", "./styles.css", "./manifest.webmanifest", "./src/app-v03.js", "./src/engines.js", "./src/fixture.js"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request)));
});
