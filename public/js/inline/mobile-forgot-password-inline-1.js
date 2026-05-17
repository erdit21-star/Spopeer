document.getElementById('submitBtn').addEventListener('click', async function () {
    var btn = this;
    var email = document.getElementById('email').value.trim();
    var errorBox = document.getElementById('fpError');
    var successBox = document.getElementById('fpSuccess');
    errorBox.style.display = 'none';
    successBox.style.display = 'none';

    if (!email) {
      errorBox.textContent = 'Please enter your email address.';
      errorBox.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Sending...';
    try {
      var res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      });
      var data = await res.json().catch(function(){ return {}; });
      if (!res.ok) throw new Error((data.error && data.error.message) || 'Could not send reset instructions.');
      successBox.textContent = 'If an account exists for ' + email + ', reset instructions were sent. Check inbox and spam.';
      successBox.style.display = 'block';
    } catch (err) {
      errorBox.textContent = err.message || 'Network error. Please try again.';
      errorBox.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send Reset Link';
    }
  });
