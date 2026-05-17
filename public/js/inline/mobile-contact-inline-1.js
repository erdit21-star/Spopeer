document.getElementById('contactSubmit').addEventListener('click', async function () {
    var btn = this;
    var errorBox = document.getElementById('contactError');
    var successBox = document.getElementById('contactSuccess');
    errorBox.style.display = 'none';
    successBox.style.display = 'none';

    var payload = {
      firstName: document.getElementById('firstName').value.trim(),
      lastName: document.getElementById('lastName').value.trim(),
      email: document.getElementById('email').value.trim(),
      subject: document.getElementById('subject').value,
      message: document.getElementById('message').value.trim()
    };

    if (!payload.firstName || !payload.lastName || !payload.email || !payload.subject || !payload.message) {
      errorBox.textContent = 'Please fill all required fields.';
      errorBox.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Sending...';
    try {
      var res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var data = await res.json().catch(function(){ return {}; });
      if (!res.ok) throw new Error(data.error || 'Failed to send message.');
      successBox.textContent = 'Message sent successfully. We will get back to you soon.';
      successBox.style.display = 'block';
      ['firstName','lastName','email','subject','message'].forEach(function (id) { document.getElementById(id).value = ''; });
    } catch (err) {
      errorBox.textContent = err.message || 'Failed to send message.';
      errorBox.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send Message';
    }
  });
