(function () {
  try {
    if (window.Auth && typeof window.Auth.requireAuth === 'function') {
      window.Auth.requireAuth();
    }
  } catch (err) {
    console.error('require-auth.js failed:', err && err.message ? err.message : err);
  }
})();
