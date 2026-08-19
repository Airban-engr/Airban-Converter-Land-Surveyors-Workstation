const CACHE_VERSION = "airban-converter-v50";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./manifest.webmanifest",
  "./src/styles/app.css",
  "./src/assets/airban-full-logo.jpg",
  "./src/assets/airban-header-logo.jpg",
  "./src/assets/airban-icon.svg",
  "./src/assets/icons/airban-apple-touch-icon.png",
  "./src/assets/icons/airban-icon-192.png",
  "./src/assets/icons/airban-icon-512.png",
  "./src/assets/icons/airban-icon.ico",
  "./src/assets/icons/airban-maskable-512.png",
  "./src/vendor/proj4/proj4.js",
  "./src/vendor/leaflet/leaflet.js",
  "./src/js/constants.js",
  "./src/js/utils.js",
  "./src/js/units.js",
  "./src/js/dms.js",
  "./src/js/converter.js",
  "./src/js/csv.js",
  "./src/js/observations.js",
  "./src/js/survey.js",
  "./src/js/parcel.js",
  "./src/js/qc.js",
  "./src/js/report.js",
  "./src/js/project.js",
  "./src/js/map.js",
  "./src/js/app.js",
  "./src/js/pwa.js",
  "./samples/ghana-grid-no-header.csv",
  "./samples/ghana-grid-header.csv",
  "./samples/bearing-distance-observations.csv",
  "./samples/angular-traverse-observations.csv",
  "./samples/parcel-beacons.csv",
  "./samples/parcel-with-reference-cors.csv",
  "./samples/topcon-coordinate-observations.csv",
  "./samples/topcon-alias-coordinate-observations.csv",
  "./samples/topcon-no-header-northing-easting.csv",
  "./samples/wgs84-points.csv",
  "./samples/utm-zone-30n-points.csv"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => {
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
        return Response.error();
      });
    })
  );
});
