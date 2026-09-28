// Updated
(function () {
  function isLoggedIn() {
    return !!(window.CurrentUserStore && typeof window.CurrentUserStore.isLoggedIn === 'function' && window.CurrentUserStore.isLoggedIn());
})();
