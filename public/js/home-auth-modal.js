(function () {
  'use strict';

  var GOOGLE_CLIENT_ID = '527976493846-99g74l8eqmiui9fro2e1fgf19c27qjii.apps.googleusercontent.com';

  function getCookieValue(name) {
    var escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var match = document.cookie.match(new RegExp('(^|;\\s*)' + escapedName + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : '';
  }

  async function ensureCsrfToken() {
    var token = getCookieValue('csrf_token');
    if (token) return token;
    try {
      await fetch('/api/auth/csrf', { method: 'GET', credentials: 'include' });
    } catch (err) {
      console.debug('Failed to prefetch CSRF token on homepage', err);
    }
    return getCookieValue('csrf_token');
  }

  async function csrfFetch(url, options) {
    var config = options || {};
    var method = String(config.method || 'GET').toUpperCase();
    var headers = Object.assign({}, config.headers || {});
    if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
      var csrfToken = await ensureCsrfToken();
      if (csrfToken && !headers['X-CSRF-Token']) {
        headers['X-CSRF-Token'] = csrfToken;
      }
    }

    return fetch(url, Object.assign({}, config, {
      credentials: 'include',
      headers: headers
    }));
  }

  function openAuth(type) {
    var modal = document.getElementById('authModal');
    if (!modal) return;
    modal.style.display = 'flex';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    switchAuth(type || 'login');
  }

  function closeAuth() {
    var modal = document.getElementById('authModal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function switchAuth(type) {
    var lp = document.getElementById('loginPanel');
    var sp = document.getElementById('signupPanel');
    var fp = document.getElementById('forgotPanel');
    var ll = document.getElementById('authLeftLogin');
    var ls = document.getElementById('authLeftSignup');
    var lf = document.getElementById('authLeftForgot');

    if (lp) lp.style.display = type === 'login' ? 'block' : 'none';
    if (sp) sp.style.display = type === 'signup' ? 'block' : 'none';
    if (fp) fp.style.display = type === 'forgot' ? 'block' : 'none';
    if (ll) ll.style.display = type === 'login' ? 'block' : 'none';
    if (ls) ls.style.display = type === 'signup' ? 'block' : 'none';
    if (lf) lf.style.display = type === 'forgot' ? 'block' : 'none';

    ['modalLoginError', 'modalSignupError', 'modalForgotError', 'modalForgotSuccess'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.textContent = '';
        el.style.display = 'none';
      }
    });

    if (type !== 'forgot') {
      var ff = document.getElementById('modalForgotForm');
      if (ff) ff.reset();
      var fe = document.getElementById('modalForgotEmailGroup');
      if (fe) fe.style.display = 'block';
      var fb = document.getElementById('modalForgotBtn');
      if (fb) {
        fb.disabled = false;
        fb.textContent = 'Send Reset Link';
        fb.style.display = '';
      }
    }
  }

  function handleGoogleCredential(response) {
    csrfFetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (r) {
        if (!r.ok) {
          throw new Error((r.data && (r.data.message || (r.data.error && r.data.error.message))) || 'Google sign-in failed.');
        }
        var user = (r.data.data && r.data.data.user) || r.data.user || null;

        // Some API paths may authenticate via cookie but omit user payload.
        // Confirm a usable profile before redirecting into the authenticated app shell.
        if (!user && window.SpopeerAPI && typeof window.SpopeerAPI.me === 'function') {
          return window.SpopeerAPI.me().then(function (me) {
            var meUser = (me && (me.user || (me.data && me.data.user) || me.payload || (me.payload && me.payload.user))) || null;
            if (!meUser) {
              throw new Error('Google sign-in finished, but your profile could not be loaded. Please try again.');
            }
            if (window.Auth) window.Auth.login(meUser);
            closeAuth();
            window.location.assign('/app.html');
          });
        }

        if (!user) {
          throw new Error('Google sign-in finished, but your profile could not be loaded. Please try again.');
        }

        if (window.Auth) window.Auth.login(user);
        closeAuth();
        window.location.assign('/app.html');
      })
      .catch(function (err) {
        var lp = document.getElementById('loginPanel');
        var box = document.getElementById(lp && lp.style.display !== 'none' ? 'modalLoginError' : 'modalSignupError');
        if (box) {
          box.textContent = err.message || 'Google sign-in failed.';
          box.style.display = 'block';
        }
      });
  }

  function showGoogleFallbackError(message) {
    var lp = document.getElementById('loginPanel');
    var targetId = lp && lp.style.display !== 'none' ? 'modalLoginError' : 'modalSignupError';
    var box = document.getElementById(targetId);
    if (!box) return;
    box.textContent = message || 'Google sign-in is unavailable right now. Please allow pop-ups and try again, or use email/password.';
    box.style.display = 'block';
  }

  function requestGooglePrompt() {
    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
      showGoogleFallbackError('Google sign-in is still loading. Please wait a moment and try again.');
      return;
    }

    try {
      window.google.accounts.id.prompt(function (notification) {
        var isNotDisplayed = notification && typeof notification.isNotDisplayed === 'function' && notification.isNotDisplayed();
        var isSkipped = notification && typeof notification.isSkippedMoment === 'function' && notification.isSkippedMoment();
        var notDisplayedReason = notification && typeof notification.getNotDisplayedReason === 'function'
          ? notification.getNotDisplayedReason()
          : '';
        var skippedReason = notification && typeof notification.getSkippedReason === 'function'
          ? notification.getSkippedReason()
          : '';

        // Only show a hard fallback when the browser truly blocks or cannot display Google sign-in.
        // Normal skipped moments (dismissed/auto-cancelled/no-session) are expected and not actionable.
        var hardBlocked = isNotDisplayed && [
          'browser_not_supported',
          'invalid_client',
          'missing_client_id',
          'opt_out_or_no_session',
          'secure_http_required',
          'suppressed_by_user',
          'unregistered_origin'
        ].indexOf(notDisplayedReason) !== -1;
        var hardSkipped = isSkipped && skippedReason === 'tap_outside';

        if (hardBlocked || hardSkipped) {
          showGoogleFallbackError('Google sign-in was blocked or unavailable in this browser. Please allow pop-ups and retry, or use email/password.');
        }
      });
    } catch (err) {
      showGoogleFallbackError('Google sign-in could not start. Please try again, or use email/password.');
    }
  }

  function initGoogleButtons() {
    if (!window.google || !window.google.accounts || !window.google.accounts.id) return;
    window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential });
    ['modalLoginGoogleBtn', 'modalSignupGoogleBtn'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn && !btn._gBound) {
        btn._gBound = true;
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          requestGooglePrompt();
        });
      }
    });
  }

  function bindLoginForm() {
    var loginForm = document.getElementById('modalLoginForm');
    if (!loginForm) return;
    if (loginForm.dataset.bound === 'true') return;
    loginForm.dataset.bound = 'true';

    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var email = (document.getElementById('modalLoginEmail').value || '').trim();
      var password = document.getElementById('modalLoginPassword').value || '';
      var errorBox = document.getElementById('modalLoginError');
      var btn = document.getElementById('modalLoginBtn');

      errorBox.textContent = '';
      errorBox.style.display = 'none';
      if (!email || !password) {
        errorBox.textContent = 'Please fill in both fields.';
        errorBox.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Signing in...';
      try {
        var result = await window.SpopeerAPI.login({ email: email, password: password });
        var user = (result.data && result.data.user) || result.user;
        if (user && window.Auth) window.Auth.login(user);
        window.location.href = '/app.html';
      } catch (err) {
        errorBox.textContent = err.message || 'Login failed.';
        errorBox.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Log In';
      }
    });
  }

  function bindSignupForm() {
    fetch('/data/list-of-sports.txt')
      .then(function (r) { return r.text(); })
      .then(function (text) {
        var sel = document.getElementById('modalPrimarySport');
        if (!sel) return;
        var sports = text.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
        sel.innerHTML = '<option value="">Select your sport</option>';
        sports.forEach(function (s) {
          var o = document.createElement('option');
          o.value = s;
          o.textContent = s;
          sel.appendChild(o);
        });
        var other = document.createElement('option');
        other.value = 'other';
        other.textContent = 'Other';
        sel.appendChild(other);
      })
      .catch(function () {});

    var roleEl = document.getElementById('modalRoleSelect');
    if (roleEl) {
      roleEl.addEventListener('change', function () {
        var g = document.getElementById('modalSportGroup');
        if (g) g.style.display = this.value ? 'block' : 'none';
      });
    }

    var sportEl = document.getElementById('modalPrimarySport');
    if (sportEl) {
      sportEl.addEventListener('change', function () {
        var w = document.getElementById('modalCustomSportWrap');
        if (w) w.style.display = this.value === 'other' ? 'block' : 'none';
      });
    }

    var signupForm = document.getElementById('modalSignupForm');
    if (!signupForm) return;
    if (signupForm.dataset.bound === 'true') return;
    signupForm.dataset.bound = 'true';

    signupForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var firstName = (document.getElementById('modalFirstName').value || '').trim();
      var lastName = (document.getElementById('modalLastName').value || '').trim();
      var email = (document.getElementById('modalSignupEmail').value || '').trim();
      var pass = document.getElementById('modalSignupPassword').value || '';
      var confirm = document.getElementById('modalConfirmPassword').value || '';
      var roleVal = document.getElementById('modalRoleSelect').value;
      var sEl = document.getElementById('modalPrimarySport');
      var sport = sEl ? sEl.value : '';
      if (sport === 'other') {
        var cEl = document.getElementById('modalCustomSportInput');
        sport = cEl ? (cEl.value || '').trim() : '';
      }
      var secondary = (document.getElementById('modalSecondarySports').value || '').trim();
      var errorBox = document.getElementById('modalSignupError');
      var btn = document.getElementById('modalSignupBtn');

      errorBox.textContent = '';
      errorBox.style.display = 'none';
      errorBox.style.background = '';
      errorBox.style.color = '';

      if (!firstName || !lastName || !email || !pass || !roleVal) {
        errorBox.textContent = 'Please fill all required fields.';
        errorBox.style.display = 'block';
        return;
      }
      if (pass.length < 10) {
        errorBox.textContent = 'Password must be at least 10 characters.';
        errorBox.style.display = 'block';
        return;
      }
      if (pass !== confirm) {
        errorBox.textContent = 'Passwords do not match.';
        errorBox.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Creating Account...';
      try {
        var result = await window.SpopeerAPI.signup({
          email: email,
          password: pass,
          firstName: firstName,
          lastName: lastName,
          role: roleVal,
          sport: sport || '',
          profession: secondary
        });
        var user = (result.data && result.data.user) || result.user;
        if (user && window.Auth) {
          window.Auth.login(user);
          window.location.href = '/app.html';
        } else {
          errorBox.style.background = '#dcfce7';
          errorBox.style.color = '#166534';
          errorBox.textContent = 'Account created! Please verify your email, then sign in.';
          errorBox.style.display = 'block';
          signupForm.reset();
        }
      } catch (err) {
        errorBox.textContent = err.message || 'Signup failed. Please try again.';
        errorBox.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Create Account';
      }
    });
  }

  function bindForgotPasswordForm() {
    var forgotForm = document.getElementById('modalForgotForm');
    if (!forgotForm) return;
    if (forgotForm.dataset.bound === 'true') return;
    forgotForm.dataset.bound = 'true';

    forgotForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var email = (document.getElementById('modalForgotEmail').value || '').trim();
      var errorBox = document.getElementById('modalForgotError');
      var successBox = document.getElementById('modalForgotSuccess');
      var btn = document.getElementById('modalForgotBtn');
      var emailGrp = document.getElementById('modalForgotEmailGroup');

      errorBox.textContent = '';
      errorBox.style.display = 'none';
      successBox.textContent = '';
      successBox.style.display = 'none';

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errorBox.textContent = 'Please enter a valid email address.';
        errorBox.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Sending...';
      successBox.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right:6px"></i>Sending reset email...';
      successBox.style.display = 'block';

      var timeoutId = null;
      try {
        var requestPromise = csrfFetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email })
        });
        var timeoutPromise = new Promise(function (_, reject) {
          timeoutId = window.setTimeout(function () {
            reject(new Error('Request timed out. Please try again.'));
          }, 20000);
        });
        var res = await Promise.race([requestPromise, timeoutPromise]);
        var data = await res.json();

        if (!res.ok) {
          var msg = (data.error && data.error.message) || data.message || 'Something went wrong. Please try again.';
          errorBox.textContent = msg;
          errorBox.style.display = 'block';
          successBox.style.display = 'none';
          btn.disabled = false;
          btn.textContent = 'Send Reset Link';
          return;
        }

        if (emailGrp) emailGrp.style.display = 'none';
        btn.style.display = 'none';
        successBox.innerHTML = '<i class="fa-solid fa-circle-check" style="margin-right:6px"></i>If an account exists for <strong>' + email + '</strong>, we\'ve sent reset instructions. Check your inbox (and spam folder). The link expires in 30 minutes.';
        successBox.style.display = 'block';
      } catch (err) {
        errorBox.textContent = err.message || 'Network error. Please check your connection and try again.';
        errorBox.style.display = 'block';
        successBox.style.display = 'none';
        btn.disabled = false;
        btn.textContent = 'Send Reset Link';
      } finally {
        if (timeoutId) window.clearTimeout(timeoutId);
      }
    });
  }

  function bindSharedInteractions() {
    var modal = document.getElementById('authModal');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === this) closeAuth();
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAuth();
    });

    document.querySelectorAll('.pw-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = this.closest('.pw-wrap') && this.closest('.pw-wrap').querySelector('input');
        if (!input) return;
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        var icon = this.querySelector('i');
        if (icon) icon.className = show ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
      });
    });
  }

  document.addEventListener('DOMContentLoaded', async function () {
    await ensureCsrfToken();

    bindSharedInteractions();
    bindLoginForm();
    bindSignupForm();
    bindForgotPasswordForm();

    if (window.google && window.google.accounts && window.google.accounts.id) {
      initGoogleButtons();
    } else {
      window.onGoogleLibraryLoad = initGoogleButtons;
    }

    var h = window.location.hash;
    if (h === '#login' || h === '#signup') openAuth(h.slice(1));
  });

  window.openAuth = openAuth;
  window.closeAuth = closeAuth;
  window.switchAuth = switchAuth;
})();
