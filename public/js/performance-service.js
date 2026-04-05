// Updated
/**
 * Performance Service - Caching, Image Optimization, and Bundle Management
 * Improves page load times and reduces bandwidth usage
 */

class PerformanceService {
  constructor() {
    this.cacheVersion = 1;
    this.cacheName = `spopeer-cache-v${this.cacheVersion}`;
    this.imageCache = new Map();
    this.dataCache = new Map();
    this.init();
  }

  init() {
    // Register service worker for offline support and caching
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/js/service-worker.js')
        .then(_reg => console.log('Service Worker registered'))
        .catch(err => console.debug('Service Worker registration failed'));
    }
    
    // Initialize IndexedDB for offline data storage
    this.initIndexedDB();
  }

  /**
   * Initialize IndexedDB for offline data persistence
   */
  initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SpopeerDB', 1);
      
      request.onerror = () => {
        console.debug('IndexedDB open failed');
        reject(request.error);
      };
      
      request.onsuccess = () => {
        console.debug('IndexedDB open success');
        resolve(request.result);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores for offline data
        if (!db.objectStoreNames.contains('listings')) {
          db.createObjectStore('listings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('messages')) {
          db.createObjectStore('messages', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'url' });
        }
      };
    });
  }

  /**
   * Cache API data with expiration
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttlMinutes - Time to live in minutes (default: 5)
   */
  setDataCache(key, data, ttlMinutes = 5) {
    this.dataCache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (ttlMinutes * 60 * 1000)
    });
  }

  /**
   * Get cached data if not expired
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null if expired
   */
  getDataCache(key) {
    const cached = this.dataCache.get(key);
    if (!cached) return null;
    
    if (cached.expiresAt < Date.now()) {
      this.dataCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, entry] of this.dataCache.entries()) {
      if (entry.expiresAt < now) {
        this.dataCache.delete(key);
      }
    }
  }

  /**
   * Generate optimized image URL with WebP support and responsive sizing
   * @param {string} imageUrl - Original image URL
   * @param {string} size - Image size (thumbnail, medium, large)
   * @returns {object} Object with primary (WebP) and fallback (JPEG) URLs
   */
  optimizeImage(imageUrl, size = 'medium') {
    if (!imageUrl) return null;

    const sizes = {
      thumbnail: 150,
      medium: 400,
      large: 800,
      hero: 1200
    };

    const pixels = sizes[size] || sizes.medium;

    // Return both WebP and JPEG URLs for maximum compatibility
    return {
      webp: `${imageUrl}?w=${pixels}&fmt=webp&q=80`,
      jpeg: `${imageUrl}?w=${pixels}&fmt=jpg&q=85`,
      full: imageUrl,
      width: pixels
    };
  }

  /**
   * Create responsive image srcset string
   * @param {string} imageUrl - Original image URL
   * @returns {string} srcset attribute value
   */
  createImageSrcset(imageUrl) {
    if (!imageUrl) return '';
    
    return [
      `${imageUrl}?w=300&fmt=webp&q=80 300w`,
      `${imageUrl}?w=600&fmt=webp&q=80 600w`,
      `${imageUrl}?w=1200&fmt=webp&q=80 1200w`
    ].join(', ');
  }

  /**
   * Preload critical images for faster rendering
   * @param {array} imageUrls - Array of image URLs to preload
   */
  preloadImages(imageUrls) {
    imageUrls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
    });
  }

  /**
   * Lazy load images with Intersection Observer
   * Enables loading images only when they enter viewport
   */
  initLazyLoading() {
    const imageElements = document.querySelectorAll('img[data-src]');
    
    if (!imageElements.length) return;

    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px'
    });

    imageElements.forEach(img => imageObserver.observe(img));
  }

  /**
   * Apply lazy loading to dynamically created images
   * @param {element} element - Container element to scan for images
   */
  lazyLoadElement(element) {
    const images = element.querySelectorAll('img[data-src]');
    images.forEach(img => {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      }, { rootMargin: '50px' });
      
      observer.observe(img);
    });
  }

  /**
   * Monitor page performance metrics
   * Logs Core Web Vitals to help identify performance issues
   */
  monitorPerformance() {
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            console.log('CLS:', clsValue);
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }

    // Log page load time
    window.addEventListener('load', () => {
      if (performance.timing) {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        console.log('Page Load Time:', loadTime + 'ms');
      }
    });
  }

  /**
   * Minify CSS inline styles (remove extra whitespace)
   * @param {string} css - CSS string to minify
   * @returns {string} Minified CSS
   */
  minifyCSS(css) {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Remove extra whitespace
      .replace(/\s?([{}:;,>+~])\s?/g, '$1') // Remove spaces around punctuation
      .trim();
  }

  /**
   * Compress JavaScript (basic minification)
   * For production, use webpack/terser instead
   * @param {string} js - JavaScript string
   * @returns {string} Minified JavaScript
   */
  minifyJS(js) {
    return js
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*/g, '') // Remove line comments
      .replace(/\n\s*\n/g, '\n') // Remove blank lines
      .trim();
  }

  /**
   * Pre-fetch resources that will likely be needed
   * @param {array} urls - URLs to prefetch
   */
  prefetchResources(urls) {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    });
  }

  /**
   * Pre-connect to third-party domains
   * Reduces latency for cross-domain requests
   * @param {array} domains - Domains to preconnect to
   */
  preconnectDomains(domains) {
    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      document.head.appendChild(link);
    });
  }

  /**
   * Get performance metrics summary
   * @returns {object} Performance metrics
   */
  getMetrics() {
    if (!performance.timing) return null;

    const timing = performance.timing;
    return {
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      tcp: timing.connectEnd - timing.connectStart,
      ttfb: timing.responseStart - timing.navigationStart,
      download: timing.responseEnd - timing.responseStart,
      dom: timing.domComplete - timing.domLoading,
      load: timing.loadEventEnd - timing.navigationStart,
      interactive: timing.domInteractive - timing.navigationStart
    };
  }

  /**
   * Store data in IndexedDB for offline access
   * @param {string} storeName - Object store name
   * @param {object} data - Data to store
   */
  async storeOfflineData(storeName, data) {
    try {
      const request = indexedDB.open('SpopeerDB', 1);
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        store.put(data);
      };
    } catch (error) {
      console.debug('IndexedDB storage error:', error);
    }
  }

  /**
   * Retrieve data from IndexedDB for offline access
   * @param {string} storeName - Object store name
   * @param {string} key - Data key
   */
  async getOfflineData(storeName, key) {
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open('SpopeerDB', 1);
        request.onsuccess = (event) => {
          const db = event.target.result;
          const transaction = db.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          const getRequest = store.get(key);
          getRequest.onsuccess = () => resolve(getRequest.result);
          getRequest.onerror = () => resolve(null);
        };
      } catch (error) {
        console.debug('IndexedDB retrieval error:', error);
        resolve(null);
      }
    });
  }
}

// Initialize globally
const _PerformanceServiceInstance = new PerformanceService();

