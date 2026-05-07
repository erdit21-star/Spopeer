(function () {
  const MENU_LINKS = [
    { href: '/mobile-who-its-for.html', label: "Who It's For", icon: 'users' },
    { href: '/mobile-how-it-works.html', label: 'How It Works', icon: 'route' },
    { href: '/mobile-features.html', label: 'Features', icon: 'spark' },
    { href: '/mobile-about.html', label: 'About Us', icon: 'info' },
    { href: '/mobile-careers.html', label: 'Careers', icon: 'briefcase' },
    { href: '/mobile-blog.html', label: 'Blog', icon: 'pen' },
    { href: '/mobile-help-center.html', label: 'Help Center', icon: 'help' },
    { href: '/mobile-contact.html', label: 'Contact Us', icon: 'mail' },
    { href: '/mobile-privacy.html', label: 'Privacy Policy', icon: 'shield' },
    { href: '/mobile-terms.html', label: 'Terms of Use', icon: 'doc' },
    { href: '/mobile-report-abuse.html', label: 'Report Abuse', icon: 'flag' }
  ];

  function iconSvg(name) {
    const icons = {
      users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      route: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h5a4 4 0 0 0 4-4V7"/></svg>',
      spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l1.8 3.8L18 8.5l-3.1 2.8.8 4.2L12 13.6 8.3 15.5l.8-4.2L6 8.5l4.2-1.7L12 3z"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v4h1"/></svg>',
      briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></svg>',
      pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
      help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4"/><path d="M12 17h.01"/></svg>',
      mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
      shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z"/></svg>',
      doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
      flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 3v18"/><path d="M5 4h11l-2 3 2 3H5"/></svg>'
    };
    return icons[name] || icons.spark;
  }

  function menuLinksHtml() {
    return MENU_LINKS.map(function (item) {
      return '<a class="spm-explore-link" href="' + item.href + '"><span aria-hidden="true">' + iconSvg(item.icon) + '</span><span>' + item.label + '</span></a>';
    }).join('');
  }

  function hostNode() {
    return document.querySelector('.spm-auth-hero') || document.querySelector('.hero');
  }

  function injectMenu() {
    const host = hostNode();
    if (!host || host.querySelector('.spm-explore-menu')) return;

    const menu = document.createElement('div');
    menu.className = 'spm-explore-menu';
    menu.innerHTML = '' +
      '<button type="button" class="spm-explore-toggle" aria-haspopup="true" aria-expanded="false" aria-label="Open Explore menu">' +
      '<span>Explore</span>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>' +
      '</button>' +
      '<nav class="spm-explore-panel" aria-label="Explore Spopeer pages">' + menuLinksHtml() + '</nav>';

    host.appendChild(menu);

    const toggle = menu.querySelector('.spm-explore-toggle');
    const panel = menu.querySelector('.spm-explore-panel');

    function closeMenu() {
      menu.classList.remove('is-open');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    function openMenu() {
      menu.classList.add('is-open');
      toggle.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    }

    toggle.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (menu.classList.contains('is-open')) closeMenu();
      else openMenu();
    });

    document.addEventListener('click', function (event) {
      if (!menu.classList.contains('is-open')) return;
      if (!menu.contains(event.target)) closeMenu();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu();
    });

    panel.addEventListener('click', function (event) {
      const target = event.target.closest('a');
      if (target) closeMenu();
    });
  }

  document.addEventListener('DOMContentLoaded', injectMenu);
})();
