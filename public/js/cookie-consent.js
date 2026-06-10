/**
 * Cookie Consent Manager
 * Implements transparent cookie consent in compliance with GDPR/ePrivacy
 * Manages user preferences for analytics, marketing, and essential cookies
 */

(function() {
  'use strict';

  const CONSENT_KEY = 'spopeer_cookie_consent';
  const CONSENT_VERSION = '1';
  const BANNER_SHOWN_KEY = 'spopeer_consent_banner_shown';

  // Default consent state (essential only)
  const DEFAULT_CONSENT = {
    essential: true,      // Always required
    analytics: false,     // Google Analytics / behavior tracking
    marketing: false,     // Marketing pixels / retargeting
    preferences: false,   // Save user preferences
    version: CONSENT_VERSION
  };

  class CookieConsent {
    constructor() {
      this.preferences = this.loadPreferences();
      this.needsRender = !localStorage.getItem(BANNER_SHOWN_KEY);
    }

    /**
     * Load saved consent preferences from localStorage
     */
    loadPreferences() {
      try {
        const stored = localStorage.getItem(CONSENT_KEY);
        if (stored) {
          const prefs = JSON.parse(stored);
          if (prefs.version === CONSENT_VERSION) {
            return prefs;
          }
        }
      } catch (e) {
        console.warn('Failed to load cookie preferences:', e);
      }
      return { ...DEFAULT_CONSENT };
    }

    /**
     * Save consent preferences
     */
    savePreferences(prefs) {
      this.preferences = { ...this.preferences, ...prefs, version: CONSENT_VERSION };
      try {
        localStorage.setItem(CONSENT_KEY, JSON.stringify(this.preferences));
        localStorage.setItem(BANNER_SHOWN_KEY, String(Date.now()));
      } catch (e) {
        console.error('Failed to save cookie preferences:', e);
      }
      this.onConsentChange();
    }

    /**
     * Check if a category is allowed
     */
    isAllowed(category) {
      return this.preferences[category] === true;
    }

    /**
     * Trigger dependent scripts when consent changes
     */
    onConsentChange() {
      // Emit event for other modules to listen to
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('spopeer:consent-change', {
          detail: this.preferences,
          bubbles: false
        }));
      }

      if (window.SpopeerTelemetry && typeof window.SpopeerTelemetry.syncConsent === 'function') {
        window.SpopeerTelemetry.syncConsent(this.preferences);
      }
    }

    /**
     * Render the cookie consent banner
     */
    renderBanner() {
      if (!this.needsRender) return;
      if (document.getElementById('spopeer-cookie-banner')) return;

      const banner = document.createElement('div');
      banner.id = 'spopeer-cookie-banner';
      banner.role = 'complementary';
      banner.setAttribute('aria-label', 'Cookie Consent');
      banner.innerHTML = `
        <div class="cookie-banner-content">
          <div class="cookie-banner-text">
            <h3 class="cookie-banner-title">Cookie Preferences</h3>
            <p class="cookie-banner-desc">
              We use cookies to enhance your experience. Essential cookies are always on. 
              You can enable analytics and marketing cookies to help us improve Spopeer.
              <a href="/pages/legal/privacy.html#tracking" class="cookie-banner-link">Learn more</a>
            </p>
          </div>
          
          <div class="cookie-banner-options">
            <div class="cookie-option">
              <label class="cookie-checkbox-label">
                <input type="checkbox" id="cookie-essential" disabled checked>
                <span class="cookie-label-text">Essential</span>
              </label>
              <p class="cookie-option-desc">Required for site function</p>
            </div>
            
            <div class="cookie-option">
              <label class="cookie-checkbox-label">
                <input type="checkbox" id="cookie-analytics">
                <span class="cookie-label-text">Analytics</span>
              </label>
              <p class="cookie-option-desc">Help us improve the platform</p>
            </div>
            
            <div class="cookie-option">
              <label class="cookie-checkbox-label">
                <input type="checkbox" id="cookie-marketing">
                <span class="cookie-label-text">Marketing</span>
              </label>
              <p class="cookie-option-desc">Personalized ads and content</p>
            </div>
          </div>
          
          <div class="cookie-banner-buttons">
            <button class="cookie-btn cookie-btn-secondary" id="cookie-reject">Reject</button>
            <button class="cookie-btn cookie-btn-primary" id="cookie-accept">Accept All</button>
          </div>
        </div>
      `;

      // Add styles
      const style = document.createElement('style');
      style.textContent = `
        #spopeer-cookie-banner {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #fff;
          border-top: 1px solid #e2e8f0;
          box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.1);
          z-index: 9999;
          animation: slideUpBanner 0.3s ease-out;
        }
        
        @keyframes slideUpBanner {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .cookie-banner-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 24px;
          align-items: start;
        }
        
        @media (max-width: 768px) {
          .cookie-banner-content {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
        
        .cookie-banner-text h3 {
          margin: 0 0 8px;
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
        }
        
        .cookie-banner-desc {
          margin: 0;
          font-size: 13px;
          color: #64748b;
          line-height: 1.6;
        }
        
        .cookie-banner-link {
          color: #1d4ed8;
          text-decoration: none;
          font-weight: 600;
        }
        
        .cookie-banner-link:hover {
          text-decoration: underline;
        }
        
        .cookie-banner-options {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin: 12px 0;
        }
        
        @media (max-width: 768px) {
          .cookie-banner-options {
            grid-template-columns: 1fr;
          }
        }
        
        .cookie-option {
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #f8fafc;
        }
        
        .cookie-checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
        }
        
        .cookie-checkbox-label input[type="checkbox"] {
          cursor: pointer;
          width: 18px;
          height: 18px;
          accent-color: #1d4ed8;
        }
        
        .cookie-checkbox-label input[type="checkbox"]:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }
        
        .cookie-label-text {
          color: #0f172a;
        }
        
        .cookie-option-desc {
          margin: 6px 0 0 26px;
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
        }
        
        .cookie-banner-buttons {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        
        @media (max-width: 768px) {
          .cookie-banner-buttons {
            width: 100%;
          }
        }
        
        .cookie-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .cookie-btn-primary {
          background: #1d4ed8;
          color: white;
        }
        
        .cookie-btn-primary:hover {
          background: #1e40af;
        }
        
        .cookie-btn-secondary {
          background: #e2e8f0;
          color: #0f172a;
        }
        
        .cookie-btn-secondary:hover {
          background: #cbd5e1;
        }
      `;
      
      if (!document.head.querySelector('style[data-cookie-consent]')) {
        style.setAttribute('data-cookie-consent', 'true');
        document.head.appendChild(style);
      }

      document.body.appendChild(banner);
      this.attachHandlers();
    }

    /**
     * Attach event handlers to banner buttons and checkboxes
     */
    attachHandlers() {
      const banner = document.getElementById('spopeer-cookie-banner');
      if (!banner) return;

      // Sync checkboxes with preferences
      const analyticsCheckbox = banner.querySelector('#cookie-analytics');
      const marketingCheckbox = banner.querySelector('#cookie-marketing');
      
      if (analyticsCheckbox) {
        analyticsCheckbox.checked = this.preferences.analytics;
        analyticsCheckbox.addEventListener('change', (e) => {
          this.preferences.analytics = e.target.checked;
        });
      }
      
      if (marketingCheckbox) {
        marketingCheckbox.checked = this.preferences.marketing;
        marketingCheckbox.addEventListener('change', (e) => {
          this.preferences.marketing = e.target.checked;
        });
      }

      // Accept all
      const acceptBtn = banner.querySelector('#cookie-accept');
      if (acceptBtn) {
        acceptBtn.addEventListener('click', () => {
          this.savePreferences({
            analytics: true,
            marketing: true,
            preferences: true
          });
          this.hideBanner();
        });
      }

      // Reject non-essential
      const rejectBtn = banner.querySelector('#cookie-reject');
      if (rejectBtn) {
        rejectBtn.addEventListener('click', () => {
          this.savePreferences({
            analytics: false,
            marketing: false,
            preferences: false
          });
          this.hideBanner();
        });
      }
    }

    /**
     * Hide and remove the banner
     */
    hideBanner() {
      const banner = document.getElementById('spopeer-cookie-banner');
      if (banner) {
        banner.style.animation = 'slideDownBanner 0.3s ease-in forwards';
        setTimeout(() => banner.remove(), 300);
      }
    }
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.spopeerCookieConsent = new CookieConsent();
      window.spopeerCookieConsent.onConsentChange();
      window.spopeerCookieConsent.renderBanner();
    });
  } else {
    window.spopeerCookieConsent = new CookieConsent();
    window.spopeerCookieConsent.onConsentChange();
    window.spopeerCookieConsent.renderBanner();
  }

  // Export for programmatic access
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CookieConsent;
  }
})();
