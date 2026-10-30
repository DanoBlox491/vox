// Vox Service Worker - Makes the app installable
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  // A basic pass-through so we don't break Firebase requests
});
