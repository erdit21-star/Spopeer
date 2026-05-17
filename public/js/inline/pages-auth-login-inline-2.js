// Show verified banner if redirected from email verification
    (function() {
      var params = new URLSearchParams(window.location.search);
      if (params.get('verified') === '1') {
        var banner = document.getElementById('verifiedBanner');
        if (banner) banner.style.display = 'block';
        // Clean up URL
        history.replaceState(null, '', window.location.pathname);
      }
    })();

    function handleSocialLogin(provider) {
      window.SpopeerAPI.showNotification(`Social login with ${provider.charAt(0).toUpperCase() + provider.slice(1)} is not yet available. Please use email/password to log in.`, 'info');
    }

    document.getElementById('loginForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      const errorBox = document.getElementById('loginError');
      const loginBtn = e.target.querySelector('.login-btn');

      if (!window.SpopeerAuthFlow || typeof window.SpopeerAuthFlow.loginWithEmail !== 'function') {
        if (errorBox) {
          errorBox.textContent = 'Login is temporarily unavailable. Please refresh and try again.';
          errorBox.style.display = 'block';
        }
        return;
      }

      await window.SpopeerAuthFlow.loginWithEmail({
        email: emailInput ? emailInput.value : '',
        password: passwordInput ? passwordInput.value : '',
        errorEl: errorBox,
        submitButton: loginBtn,
        idleText: 'Log In',
        loadingText: 'Signing in...',
        fallbackTarget: '/feed.html'
      });
    });
