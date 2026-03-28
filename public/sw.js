/**
 * Service Worker لضمان عمل واجهة الأوفلاين واللوجو.
 */
const CACHE_NAME = 'shehab-platform-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/icons/logo.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // نرجع الملف من الكاش إذا وجد، وإلا نطلبه من الشبكة
      return response || fetch(event.request).catch(() => {
        // إذا فشل الطلب وكان لصفحة ملاحة، يمكن توجيه الطالب لمكان معين (اختياري)
      });
    })
  );
});
