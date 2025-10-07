// Script to completely disable service workers
// This will run on every page load to ensure no service workers are active

(function() {
  'use strict';
  
  console.log('KILLING ALL SERVICE WORKERS...');
  
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    // Immediately unregister all service workers
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      console.log('Found', registrations.length, 'service workers to kill');
      for(let registration of registrations) {
        console.log('KILLING service worker:', registration);
        registration.unregister().then(function(boolean) {
          console.log('Service worker killed:', boolean);
        });
      }
    });
    
    // Clear all caches immediately
    if ('caches' in window) {
      caches.keys().then(function(cacheNames) {
        console.log('Found', cacheNames.length, 'caches to clear');
        return Promise.all(
          cacheNames.map(function(cacheName) {
            console.log('KILLING cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(function() {
        console.log('ALL CACHES KILLED');
      });
    }
    
    // Override serviceWorker.register to prevent future registrations
    if (navigator.serviceWorker.register) {
      navigator.serviceWorker.register = function() {
        console.log('BLOCKED service worker registration attempt');
        return Promise.reject(new Error('Service worker registration blocked'));
      };
    }
  }
  
  console.log('SERVICE WORKER KILLER ACTIVE');
})();
