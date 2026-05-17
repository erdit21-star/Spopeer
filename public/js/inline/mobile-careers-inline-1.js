document.getElementById('careerSubmit').addEventListener('click', async function () {
    var btn = this;
    var errorBox = document.getElementById('careerError');
    var successBox = document.getElementById('careerSuccess');
    errorBox.style.display = 'none';
    successBox.style.display = 'none';

    var payload = {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      position: document.getElementById('position').value.trim(),
      resume: document.getElementById('resume').value.trim(),
      portfolio: document.getElementById('portfolio').value.trim(),
      coverLetter: document.getElementById('coverLetter').value.trim()
    };

    if (!payload.name || !payload.email || !payload.position || !payload.resume || !payload.coverLetter) {
      errorBox.textContent = 'Please fill all required fields.';
      errorBox.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Submitting...';
    try {
      var res = await fetch('/api/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var data = await res.json().catch(function(){ return {}; });
      if (!res.ok) throw new Error(data.error || 'Failed to submit application.');
      successBox.textContent = 'Application submitted successfully. Our team will contact you soon.';
      successBox.style.display = 'block';
      ['name','email','phone','position','resume','portfolio','coverLetter'].forEach(function (id) { document.getElementById(id).value = ''; });
    } catch (err) {
      errorBox.textContent = err.message || 'Failed to submit application.';
      errorBox.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit Application';
    }
  });
