(function() {
      var params = new URLSearchParams(window.location.search);
      var token = params.get('token');

      if (!token) {
        document.getElementById('resetFormView').style.display = 'none';
        document.getElementById('invalidTokenView').style.display = 'block';
        return;
      }

      var form = document.getElementById('resetForm');
      var passwordInput = document.getElementById('password');
      var confirmInput = document.getElementById('confirmPassword');
      var passwordError = document.getElementById('passwordError');
      var confirmError = document.getElementById('confirmError');
      var resetError = document.getElementById('resetError');
      var submitBtn = document.getElementById('submitBtn');
      var checklist = {
        len: document.querySelector('[data-rule="len"]'),
        upper: document.querySelector('[data-rule="upper"]'),
        lower: document.querySelector('[data-rule="lower"]'),
        number: document.querySelector('[data-rule="number"]'),
        match: document.querySelector('[data-rule="match"]')
      };
      var togglePasswordBtn = document.getElementById('togglePassword');
      var toggleConfirmBtn = document.getElementById('toggleConfirmPassword');

      function setRuleState(ruleEl, isValid) {
        if (!ruleEl) return;
        var icon = ruleEl.querySelector('i');
        ruleEl.classList.toggle('done', !!isValid);
        if (icon) {
          icon.className = isValid ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle';
        }
      }

      function getValidationState() {
        var password = passwordInput.value;
        var confirm = confirmInput.value;
        return {
          len: password.length >= 10,
          upper: /[A-Z]/.test(password),
          lower: /[a-z]/.test(password),
          number: /[0-9]/.test(password),
          match: password.length > 0 && password === confirm
        };
      }

      function refreshChecklist() {
        var state = getValidationState();
        setRuleState(checklist.len, state.len);
        setRuleState(checklist.upper, state.upper);
        setRuleState(checklist.lower, state.lower);
        setRuleState(checklist.number, state.number);
        setRuleState(checklist.match, state.match);
        submitBtn.disabled = !(state.len && state.upper && state.lower && state.number && state.match);
      }

      function bindPasswordToggle(button, input) {
        if (!button || !input) return;
        button.addEventListener('click', function () {
          var reveal = input.type === 'password';
          input.type = reveal ? 'text' : 'password';
          button.setAttribute('aria-pressed', reveal ? 'true' : 'false');
          button.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
          button.innerHTML = reveal
            ? '<i class="fa-regular fa-eye-slash"></i>'
            : '<i class="fa-regular fa-eye"></i>';
        });
      }

      bindPasswordToggle(togglePasswordBtn, passwordInput);
      bindPasswordToggle(toggleConfirmBtn, confirmInput);

      passwordInput.addEventListener('input', refreshChecklist);
      confirmInput.addEventListener('input', refreshChecklist);
      refreshChecklist();

      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        passwordError.style.display = 'none';
        confirmError.style.display = 'none';
        resetError.style.display = 'none';

        var password = passwordInput.value;
        var confirm = confirmInput.value;

        if (password.length < 10) {
          passwordError.textContent = 'Password must be at least 10 characters';
          passwordError.style.display = 'block';
          return;
        }
        if (password.length > 128) {
          passwordError.textContent = 'Password must be 128 characters or fewer';
          passwordError.style.display = 'block';
          return;
        }
        if (!/[A-Z]/.test(password)) {
          passwordError.textContent = 'Password must include at least one uppercase letter';
          passwordError.style.display = 'block';
          return;
        }
        if (!/[a-z]/.test(password)) {
          passwordError.textContent = 'Password must include at least one lowercase letter';
          passwordError.style.display = 'block';
          return;
        }
        if (!/[0-9]/.test(password)) {
          passwordError.textContent = 'Password must include at least one number';
          passwordError.style.display = 'block';
          return;
        }
        if (password !== confirm) {
          confirmError.textContent = 'Passwords do not match';
          confirmError.style.display = 'block';
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';

        try {
          var res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token, password: password })
          });
          var data = await res.json();

          if (!res.ok) {
            var errorMsg = (data.error && data.error.message) || 'Something went wrong. Please try again.';
            if (data.error && (data.error.code === 'TOKEN_INVALID' || errorMsg.toLowerCase().includes('expired') || errorMsg.toLowerCase().includes('invalid'))) {
              document.getElementById('resetFormView').style.display = 'none';
              document.getElementById('invalidTokenView').style.display = 'block';
              document.querySelector('.invalid-token p').textContent = errorMsg;
            } else {
              resetError.textContent = errorMsg;
              resetError.style.display = 'block';
            }
            return;
          }

          // Success � replace form with success card and redirect countdown
          document.getElementById('resetFormView').innerHTML =
            '<div class="success-card">' +
              '<i class="fa-solid fa-circle-check"></i>' +
              '<h3>Your password has been changed</h3>' +
              '<p>Security update complete. You can log in with your new password now.</p>' +
              '<a href="login.html" class="reset-btn" style="display:inline-block;max-width:260px;text-decoration:none;line-height:1.2;">Continue to Log In</a>' +
              '<p style="margin-top:14px;color:#5b7b66;font-size:12px;">Redirecting in 3 seconds...</p>' +
            '</div>';

          setTimeout(function() {
            window.location.href = 'login.html';
          }, 3000);
        } catch (err) {
          resetError.textContent = 'Network error. Please check your connection and try again.';
          resetError.style.display = 'block';
        } finally {
          if (document.getElementById('submitBtn')) {
            submitBtn.textContent = 'Create Password';
            refreshChecklist();
          }
        }
      });
    })();
