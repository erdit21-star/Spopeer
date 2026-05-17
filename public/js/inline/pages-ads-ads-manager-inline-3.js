window.toggleProfileMenuGlobal = function() {
      const menu = document.querySelector('[data-user-menu]') || document.getElementById('profileMenu');
      if (menu) menu.classList.toggle('visible');
    };
