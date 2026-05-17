document.getElementById('abuseSubmit').addEventListener('click', async function () {
    var btn = this;
    var errorBox = document.getElementById('abuseError');
    var successBox = document.getElementById('abuseSuccess');
    errorBox.style.display = 'none';
    successBox.style.display = 'none';

    var payload = {
      reporterName: document.getElementById('name').value.trim(),
      reporterEmail: document.getElementById('email').value.trim(),
      reportedUser: document.getElementById('reportedUser').value.trim(),
      reportedUrl: document.getElementById('evidence').value.trim(),
      reason: document.getElementById('reportType').value,
      details: document.getElementById('details').value.trim()
    };

    if (!payload.reporterName || !payload.reporterEmail || !payload.reportedUser || !payload.reason || !payload.details) {
      errorBox.textContent = 'Please fill all required fields.';
      errorBox.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Submitting...';
    try {
      var res = await fetch('/api/reports/abuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var data = await res.json().catch(function(){ return {}; });
      if (!res.ok) throw new Error(data.error || 'Failed to submit report.');
      successBox.textContent = 'Report submitted. Our moderation team will review it.';
      successBox.style.display = 'block';
      ['name','email','reportedUser','evidence','reportType','details'].forEach(function (id) { document.getElementById(id).value = ''; });
    } catch (err) {
      errorBox.textContent = err.message || 'Failed to submit report.';
      errorBox.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit Report';
    }
  });
