/**
 * Smooth Navigation Transitions
 * Adds fade transitions between pages and prevents showing loading/redirect messages
 */

const SmoothNavigation = {
  TRANSITION_DURATION: 300, // milliseconds
  isNavigating: false,

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
    // Set initial opacity to 0 and fade in
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 400ms ease-in';

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        document.body.style.opacity = '1';
      });
    } else {
      // DOM is already loaded
      document.body.style.opacity = '1';
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
    var self = this;

    // Intercept link clicks
    document.addEventListener('click', function(e) {
      var link = e.target.closest('a[href]');
      if (!link) return;

      var href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      // Don't intercept external links or anchors
      if (link.target === '_blank' || link.hasAttribute('data-no-transition')) return;

      // Check if it's an internal navigation
      if (href.startsWith('/') || href.startsWith('.') || href.includes(window.location.hostname)) {
        e.preventDefault();
        self.navigateTo(href);
      }
    }, true);

    // Intercept form submissions if they navigate
    document.addEventListener('submit', function(e) {
      var form = e.target;
      if (form.method && form.method.toUpperCase() === 'GET' && form.action) {
        // GET forms navigate immediately
        setTimeout(function() {
          self.isNavigating = true;
          document.body.style.opacity = '0';
          document.body.style.transition = 'opacity ' + self.TRANSITION_DURATION + 'ms ease-out';
        }, 100);
      }
    }, true);
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
}
