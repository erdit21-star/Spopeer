// Global function for profile menu toggle
    window.toggleProfileMenuGlobal = function() {
        const menu = (window.getProfileMenuElement && typeof window.getProfileMenuElement === 'function') ? window.getProfileMenuElement() : (document.querySelector('[data-user-menu]') || document.getElementById('profileMenu'));
        if (menu) menu.classList.toggle('visible');
    };
