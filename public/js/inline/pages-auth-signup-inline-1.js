(function(){
      const role = document.getElementById('roleSelect');
      const sportGroup = document.getElementById('sportGroup');
      const createBtn = document.getElementById('createAccountBtn');
      const sportSelect = document.getElementById('primarySport');
      const customSportWrap = document.getElementById('customSportWrap');
      const customSportInput = document.getElementById('customSportInput');
      const errorBox = document.getElementById('signupError');

      let sportsList = [];

      async function loadSports(){
        try {
          const res = await fetch('/data/list-of-sports.txt');
          const text = await res.text();
          sportsList = text.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
        } catch (err) {
          sportsList = [];
        }
        populateSports();
      }
      function populateSports(){
        sportSelect.innerHTML = '<option value="">Select your sport</option>';
        sportsList.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s; opt.textContent = s;
          sportSelect.appendChild(opt);
        });
        const opt = document.createElement('option');
        opt.value = 'other'; opt.textContent = 'Other';
        sportSelect.appendChild(opt);
      }
      loadSports();
      if(!role) return;
      role.addEventListener('change',()=>{
        sportGroup.style.display = role.value ? 'block' : 'none';
      });
      sportSelect.addEventListener('change',()=>{
        if(sportSelect.value === 'other') customSportWrap.style.display = 'block';
        else customSportWrap.style.display = 'none';
      });

      document.getElementById('signupForm').addEventListener('submit', async (e)=>{
        e.preventDefault();

        const firstName = document.getElementById('firstName')?.value.trim() || '';
        const lastName = document.getElementById('lastName')?.value.trim() || '';
        const email = document.getElementById('email')?.value.trim() || '';
        const pass = document.getElementById('password')?.value || '';
        const confirm = document.getElementById('confirmPassword')?.value || '';
        const roleVal = role.value;
        let sport = sportSelect.value;
        if(sport === 'other') sport = customSportInput.value.trim();

        if (errorBox) {
          errorBox.textContent = '';
          errorBox.style.display = 'none';
        }

        if(!firstName || !lastName || !email || !pass || !roleVal) {
          if (errorBox) {
            errorBox.textContent = 'Please fill all required fields.';
            errorBox.style.display = 'block';
          }
          return;
        }
        if(pass.length < 10) {
          if (errorBox) {
            errorBox.textContent = 'Password must be at least 10 characters.';
            errorBox.style.display = 'block';
          }
          return;
        }
        if(pass !== confirm) {
          if (errorBox) {
            errorBox.textContent = 'Passwords do not match.';
            errorBox.style.display = 'block';
          }
          return;
        }

        createBtn.disabled = true;
        createBtn.textContent = 'Creating Account...';

        try {
          const payload = {
            email,
            password: pass,
            firstName,
            lastName,
            role: roleVal,
            sport: sport || '',
            profession: (document.getElementById('secondarySports')?.value || '').trim()
          };
          const result = await window.SpopeerAPI.signup(payload);
          const user = (result.data && result.data.user) || result.user;
          if (user) {
            window.Auth.login(user);
            window.location.href = '/feed.html';
          } else {
            // Account created � user object missing from response (edge case)
            if (errorBox) {
              errorBox.style.background = '#dcfce7';
              errorBox.style.color = '#166534';
              errorBox.textContent = 'Account created! Please verify your email to secure your account, then log in.';
              errorBox.style.display = 'block';
            }
            document.getElementById('signupForm').reset();
          }
        } catch (err) {
          console.error('[Spopeer] Signup failed:', err);
          if (errorBox) {
            errorBox.textContent = err.message || 'Signup failed. Please try again.';
            errorBox.style.display = 'block';
          }
        } finally {
          createBtn.disabled = false;
          createBtn.textContent = 'Create Account';
        }
      });
    })();
