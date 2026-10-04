/**
 * Smooth Navigation Transitions
 * Adds fade transitions between pages and prevents showing loading/redirect messages
 */

const SmoothNavigation = {
  TRANSITION_DURATION: 300, // milliseconds
  isNavigating: false,

  ensureVisible: function() {
    if (!document || !document.body) return;
    document.body.style.opacity = '1';
  },

  /**
   * Navigate to a new URL with smooth fade transition
   */
  navigateTo: function(url) {
    if (this.isNavigating) return;
    this.isNavigating = true;

    // Add fade-out animation
    document.body.style.opacity = '1';
    document.body.style.transition = 'opacity ' + this.TRANSITION_DURATION + 'ms ease-out';
    document.body.style.opacity = '0';

    // Navigate after fade completes
    setTimeout(function() {
      window.location.href = url;
    }, this.TRANSITION_DURATION);
  },

  /**
   * Initialize fade-in on page load
   */
  initPageLoad: function() {
    // Never hide page by default; interrupted transitions can otherwise leave a white screen.
    document.body.style.transition = 'opacity 400ms ease-in';
    this.ensureVisible();

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this.ensureVisible.bind(this));
    } else {
      // DOM is already loaded
      this.ensureVisible();
    }

    // Hide any loading or redirect messages
    this.hideLoadingIndicators();

    // Intercept all page navigation
    this.interceptPageLinks();
  },

  /**
   * Hide loading indicators and redirect messages
   */
  hideLoadingIndicators: function() {
    try {
      // Hide common loading indicators
      var indicators = [
        '.loader', '.loading', '.spinner', '.redirect-message',
        '[data-loading="true"]', '[class*="loading-message"]',
        '[class*="redirect"]'
      ];

      indicators.forEach(function(selector) {
        var elements = document.querySelectorAll(selector);
        elements.forEach(function(el) {
          if (el && typeof el.style !== 'undefined') {
            el.style.display = 'none';
          }
        });
      });
    } catch (err) {
      // Silently fail if selector syntax is invalid
    }
  },

  /**
   * Intercept all navigation links for smooth transitions
   */
  interceptPageLinks: function() {
    // Avoid global capture-phase link interception. Individual pages contain
    // authenticated routing and delegated click handlers; a delayed transition
    // redirect can race those handlers and briefly show a stale destination.
    // Let the browser perform native navigation instead.
    return;
  }
};

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      SmoothNavigation.initPageLoad();
    });
  } else {
    SmoothNavigation.initPageLoad();
  }

  // Recovery hooks for BFCache/history edge-cases that can leave stale inline opacity.
  window.addEventListener('pageshow', function () {
    SmoothNavigation.ensureVisible();
  });
  window.addEventListener('load', function () {
    SmoothNavigation.ensureVisible();
  });
}
