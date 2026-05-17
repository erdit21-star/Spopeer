function toggleMenu(){
  const m=document.getElementById('mobileMenu');
  const i=document.getElementById('menuIcon');
  const open=m.classList.toggle('open');
  i.className=open?'fa-solid fa-xmark':'fa-solid fa-bars';
}

document.addEventListener('click', function (event) {
  var openBtn = event.target && event.target.closest('[data-auth-open]');
  if (openBtn) {
    var mode = openBtn.getAttribute('data-auth-open');
    if (typeof window.openAuth === 'function') {
      window.openAuth(mode || 'login');
    }
    return;
  }

  var switchLink = event.target && event.target.closest('[data-auth-switch]');
  if (switchLink) {
    event.preventDefault();
    var panel = switchLink.getAttribute('data-auth-switch');
    if (typeof window.switchAuth === 'function') {
      window.switchAuth(panel || 'login');
    }
    return;
  }

  var closeBtn = event.target && event.target.closest('[data-auth-action="close"]');
  if (closeBtn) {
    if (typeof window.closeAuth === 'function') {
      window.closeAuth();
    }
    return;
  }

  var navBtn = event.target && event.target.closest('[data-nav-action="toggle-menu"]');
  if (navBtn) {
    if (typeof window.toggleMenu === 'function') {
      window.toggleMenu();
    }
  }
});
