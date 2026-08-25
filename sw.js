// Service worker for offline support of the kindergarten mapping tool.
// Caches the app shell on first load so it keeps working without internet.

var CACHE_NAME = "kg-mapping-cache-v12";
var CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(CORE_ASSETS);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(name){ return name !== CACHE_NAME; })
             .map(function(name){ return caches.delete(name); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function(event){
  var req = event.request;

  // Only handle GET requests.
  if(req.method !== "GET") return;

  var url = new URL(req.url);
  var isSameOrigin = url.origin === self.location.origin;

  if(isSameOrigin){
    // App shell: cache-first, refresh cache in background when online.
    event.respondWith(
      caches.match(req).then(function(cached){
        var networkFetch = fetch(req).then(function(response){
          if(response && response.ok){
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
          }
          return response;
        }).catch(function(){ return cached; });
        return cached || networkFetch;
      })
    );
  } else {
    // Cross-origin (e.g. Google Fonts): network-first, fall back to cache, cache successful responses.
    event.respondWith(
      fetch(req).then(function(response){
        if(response && response.ok){
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        }
        return response;
      }).catch(function(){
        return caches.match(req);
      })
    );
  }
});
