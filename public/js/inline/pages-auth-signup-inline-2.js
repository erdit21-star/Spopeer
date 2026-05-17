async function handleGoogleCredential(response) {
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: response.credential })
        });
        const data = await res.json();
        if (!res.ok) {
          const errMsg = (data.error && data.error.message) || 'Google sign-in failed.';
          console.error('[Google Auth] Error:', data);
          throw new Error(errMsg);
        }

        let userData = (data.data && data.data.user) || data.user || null;
        const accessToken = data.data && data.data.accessToken;
        if (accessToken) localStorage.setItem('spopeerToken', accessToken);

        if (!userData && window.SpopeerAPI && typeof window.SpopeerAPI.me === 'function') {
          const me = await window.SpopeerAPI.me();
          userData = (me && (me.user || (me.data && me.data.user) || me.payload || (me.payload && me.payload.user))) || null;
        }

        if (!userData) {
          throw new Error('Google sign-in finished, but your profile could not be loaded. Please try again.');
        }

        if (window.Auth) window.Auth.login(userData);
        window.location.assign('/feed.html');
      } catch (err) {
        console.error('[Google Auth]', err);
        const errorBox = document.getElementById('signupError');
        if (errorBox) {
          errorBox.textContent = err.message || 'Google sign-in failed. Please try email/password.';
          errorBox.style.display = 'block';
          errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          alert('Google sign-in error: ' + (err.message || 'Unknown error'));
        }
      }
    }
