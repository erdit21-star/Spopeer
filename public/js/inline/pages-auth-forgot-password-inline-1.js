async function handleForgotPassword(event) {
      event.preventDefault();

      const email = document.getElementById('email').value;
      const emailError = document.getElementById('emailError');
      const submitBtn = document.getElementById('submitBtn');
      const form = document.getElementById('forgotForm');

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        emailError.style.display = 'block';
        return;
      }

      emailError.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email })
        });
        const data = await res.json();

        // Non-200 means a real error (CAPTCHA, server crash, etc.) � show it
        if (!res.ok) {
          const msg = (data.error && data.error.message) || 'Something went wrong. Please try again.';
          emailError.textContent = msg;
          emailError.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Reset Link';
          return;
        }

        // 200 always means "processed" � never reveal whether the email exists
        form.style.display = 'none';
        submitBtn.style.display = 'none';
        const formGroup = document.querySelector('.form-group');
        formGroup.innerHTML = '<div class="info-box" style="background:#ecfdf5;border-left-color:#059669;color:#047857;">' +
          '<strong style="color:#059669;">Check your inbox</strong>' +
          '<p>If an account exists for <strong>' + email + '</strong>, we\'ve sent password reset instructions. The link expires in 30 minutes.</p>' +
          '<p style="margin-top:10px;">Didn\'t get it? Check your spam folder.</p>' +
          '</div>';
      } catch (err) {
        emailError.textContent = 'Network error. Please try again.';
        emailError.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Reset Link';
      }
    }

    // Real-time email validation
    const emailInput = document.getElementById('email');
    emailInput.addEventListener('blur', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const emailError = document.getElementById('emailError');
      if (emailInput.value && !emailRegex.test(emailInput.value)) {
        emailError.style.display = 'block';
      } else {
        emailError.style.display = 'none';
      }
    });
