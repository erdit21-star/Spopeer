document.addEventListener('DOMContentLoaded', function () {
  const layout = document.querySelector('.app-layout');
  const toggle = document.getElementById('sidebarToggle');

  if (!layout || !toggle) return;

  // Load saved state
  if (localStorage.getItem('spopeer_left_sidebar_collapsed') === '1') {
    layout.classList.add('left-sidebar-collapsed');
  }

  toggle.addEventListener('click', function () {
    layout.classList.toggle('left-sidebar-collapsed');

    const collapsed = layout.classList.contains('left-sidebar-collapsed');

    localStorage.setItem(
      'spopeer_left_sidebar_collapsed',
      collapsed ? '1' : '0'
    );
  });
});
