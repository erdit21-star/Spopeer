/**
 * Public Profile Preview Module
 * Handles unauthenticated profile viewing with login/signup CTAs
 * Shows profile preview and encourages users to join the platform
 */

(function () {
  'use strict';

  // Check if user is authenticated
  function isAuthenticated() {
    try {
      const user = JSON.parse(localStorage.getItem('spopeer_user') || '{}');
      return !!(user && user.id);
    } catch {
      return false;
    }
  }

  // Get current user info
  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('spopeer_user') || '{}');
    } catch {
      return {};
    }
  }

  // Create and show the preview CTA modal
  function createPreviewCTAModal(profile) {
    // Don't show for authenticated users
    if (isAuthenticated()) {
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'profilePreviewCTA';
    modal.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, var(--accent, #001f3f) 0%, var(--accent-mid, #003366) 100%);
      color: white;
      padding: 24px;
      z-index: 1000;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
      animation: slideUpCTA 0.4s ease-out;
    `;

    const userName = profile.firstName 
      ? `${profile.firstName}${profile.lastName ? ' ' + profile.lastName : ''}`
      : profile.displayName
      ? profile.displayName
      : 'This user';

    const profileType = {
      athlete: '🏃 Athlete',
      coach: '⚽ Coach',
      club: '🛡️ Club',
      supportive_professional: '⭐ Sports Pro'
    }[profile.userType] || '👤 Member';

    modal.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr auto; gap: 20px; align-items: center;">
        <div>
          <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 800; font-family: 'Syne', Arial, sans-serif;">
            Want to connect with ${userName}?
          </h3>
          <p style="margin: 0; font-size: 14px; opacity: 0.9; line-height: 1.5;">
            Join Spopeer to message, follow, and collaborate with ${profileType} in the global sports network. 
            Sign up in seconds to unlock your sports career.
          </p>
        </div>
        <div style="display: flex; gap: 12px; flex-shrink: 0;">
          <button id="ctaSignup" style="
            padding: 12px 24px;
            background: white;
            color: var(--accent, #001f3f);
            border: none;
            border-radius: 999px;
            font-weight: 700;
            font-size: 14px;
            font-family: 'Plus Jakarta Sans', Arial, sans-serif;
            cursor: pointer;
            transition: all 0.2s;
          ">Sign Up</button>
          <button id="ctaLogin" style="
            padding: 12px 24px;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 1.5px solid white;
            border-radius: 999px;
            font-weight: 700;
            font-size: 14px;
            font-family: 'Plus Jakarta Sans', Arial, sans-serif;
            cursor: pointer;
            transition: all 0.2s;
          ">Log In</button>
        </div>
      </div>
      <style>
        @keyframes slideUpCTA {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        #ctaSignup:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        #ctaLogin:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }
      </style>
    `;

    document.body.appendChild(modal);

    // Handle button clicks
    document.getElementById('ctaSignup').addEventListener('click', function () {
      // Get the current profile URL to redirect back after signup
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = '/pages/auth/signup.html?redirect=' + returnUrl;
    });

    document.getElementById('ctaLogin').addEventListener('click', function () {
      // Get the current profile URL to redirect back after login
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = '/pages/auth/login.html?redirect=' + returnUrl;
    });

    return modal;
  }

  // Add visual indicator that this is a preview
  function addPreviewIndicator() {
    if (isAuthenticated()) {
      return;
    }

    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      top: 76px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(100, 116, 139, 0.95);
      backdrop-filter: blur(10px);
      color: white;
      padding: 12px 20px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      z-index: 999;
      pointer-events: none;
      max-width: 90%;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      animation: fadeInDown 0.3s ease-out;
    `;

    indicator.innerHTML = `
      <i class="fa-solid fa-info-circle" style="margin-right: 6px;"></i>
      You're viewing a public profile preview. <strong>Sign up to unlock full access.</strong>
    `;

    document.body.appendChild(indicator);
  }

  // Add subtle overlay to sections that should be hidden for non-authenticated users
  function addPreviewOverlays(profile) {
    if (isAuthenticated()) {
      return;
    }

    // Add overlay to messages section if visible
    const messageBtn = document.querySelector('[onclick*="message"]');
    if (messageBtn) {
      messageBtn.style.opacity = '0.6';
      messageBtn.style.pointerEvents = 'none';
      messageBtn.setAttribute('title', 'Sign up to message this user');
    }

    // Add subtle blur to sensitive sections
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @media (max-width: 600px) {
        #profilePreviewCTA {
          padding: 16px;
        }
        #profilePreviewCTA > div {
          grid-template-columns: 1fr !important;
          gap: 12px !important;
        }
      }
    `;
    document.head.appendChild(styleSheet);
  }

  // Initialize when DOM is ready
  window.addEventListener('DOMContentLoaded', function () {
    // Wait for profile data to be loaded
    const waitForProfile = setInterval(function () {
      // Check if profile data exists in the DOM
      const profileName = document.getElementById('name');
      const profileFound = profileName && profileName.textContent && profileName.textContent.trim() !== '';

      if (profileFound) {
        clearInterval(waitForProfile);

        // Extract minimal profile info from DOM for the CTA
        const profile = {
          firstName: (document.getElementById('name')?.textContent || '').split(' ')[0] || '',
          lastName: (document.getElementById('name')?.textContent || '').split(' ').slice(1).join(' ') || '',
          displayName: document.getElementById('name')?.textContent || 'User',
          userType: document.body.textContent.includes('Athlete') ? 'athlete' 
                  : document.body.textContent.includes('Coach') ? 'coach'
                  : document.body.textContent.includes('Club') ? 'club'
                  : 'user'
        };

        if (!isAuthenticated()) {
          // Add preview indicator
          addPreviewIndicator();

          // Add subtle overlays
          addPreviewOverlays(profile);

          // Show CTA modal after a brief delay
          setTimeout(function () {
            createPreviewCTAModal(profile);
          }, 800);
        }
      }
    }, 100);

    // Timeout after 5 seconds if profile doesn't load
    setTimeout(function () {
      clearInterval(waitForProfile);
    }, 5000);
  });

  // Also listen for profile sync updates
  window.addEventListener('profileSync', function (event) {
    if (event.detail && event.detail.profile && !isAuthenticated()) {
      const profile = event.detail.profile;
      
      // Check if CTA already exists
      if (!document.getElementById('profilePreviewCTA')) {
        createPreviewCTAModal(profile);
      }
    }
  });

  // Expose utility functions globally
  window.ProfilePreview = {
    isAuthenticated: isAuthenticated,
    getCurrentUser: getCurrentUser,
    showCTA: createPreviewCTAModal
  };

})();
