if ('serviceWorker' in navigator && !navigator.webdriver) {
      navigator.serviceWorker.register('/js/service-worker.js').catch(function (err) {
        console.debug('SW registration failed:', err);
      });
    }
