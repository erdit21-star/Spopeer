(function () {
  var params = new URLSearchParams(window.location.search || '');
  var token = params.get('token') || '';
  var button = document.getElementById('submitBtn');
  var errorBox = document.getElementById('fpError');
  var successBox = document.getElementById('fpSuccess');

  function showError(message) {
    errorBox.textContent = message;
    errorBox.style.display = 'block';
    successBox.style.display = 'none';
  }

  function showSuccess(message) {
    successBox.textContent = message;
    successBox.style.display = 'block';
    errorBox.style.display = 'none';
  }

  if (token) {
    document.title = 'Spopeer | Reset Password';
    document.querySelector('.page-title').textContent = 'Set a New Password';
    document.querySelector('.page-sub').textContent = 'Choose a new secure password for your Spopeer account.';
    var intro = document.querySelector('.fp-intro');
    if (intro) intro.remove();
    var emailLabel = document.querySelector('label[for="email"]');
    var emailInput = document.getElementById('email');
    if (emailLabel) { emailLabel.textContent = 'New password'; emailLabel.htmlFor = 'newPassword'; }
    emailInput.type = 'password';
    emailInput.id = 'newPassword';
    emailInput.name = 'newPassword';
    emailInput.autocomplete = 'new-password';
    emailInput.placeholder = 'At least 8 characters';
    var confirm = document.createElement('input');
    confirm.className = 'input';
    confirm.id = 'confirmPassword';
    confirm.type = 'password';
    confirm.autocomplete = 'new-password';
    confirm.placeholder = 'Confirm new password';
    confirm.style.marginTop = '10px';
    emailInput.insertAdjacentElement('afterend', confirm);
    button.textContent = 'Reset Password';
    button.addEventListener('click', async function () {
      var password = emailInput.value;
      if (!password || password.length < 8) {
        showError('Your new password must contain at least 8 characters.');
        return;
      }
      if (password !== confirm.value) {
        showError('The passwords do not match.');
        return;
      }
      button.disabled = true;
      button.textContent = 'Updating...';
      try {
        var response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token, password: password })
        });
        var data = await response.json().catch(function () { return {}; });
        if (!response.ok) throw new Error((data.error && data.error.message) || 'The reset link is invalid or has expired.');
        showSuccess('Your password has been updated. You can now sign in.');
        button.textContent = 'Password Updated';
        button.disabled = true;
        button.insertAdjacentHTML('afterend', '<a class="btn btn-primary" href="/mobile-login.html" style="display:block;text-align:center;margin-top:10px">Go to Sign In</a>');
      } catch (error) {
        showError(error.message || 'Could not reset your password. Please request a new link.');
        button.disabled = false;
        button.textContent = 'Reset Password';
      }
    });
    return;
  }

  button.addEventListener('click', async function () {
    var email = document.getElementById('email').value.trim();
    errorBox.style.display = 'none';
    successBox.style.display = 'none';
    if (!email) {
      showError('Please enter your email address.');
      return;
    }
    button.disabled = true;
    button.textContent = 'Sending...';
    try {
      var response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error((data.error && data.error.message) || 'Could not send reset instructions.');
      showSuccess('If an account exists for ' + email + ', reset instructions were sent. Check inbox and spam.');
    } catch (error) {
      showError(error.message || 'Network error. Please try again.');
    } finally {
      button.disabled = false;
      button.textContent = 'Send Reset Link';
    }
  });
})();