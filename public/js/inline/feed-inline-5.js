// Helper to prefer data-attribute menu elements but keep id fallback
    window.getProfileMenuElement = function() {
      return document.querySelector('[data-user-menu]') || document.getElementById('profileMenu');
    };
