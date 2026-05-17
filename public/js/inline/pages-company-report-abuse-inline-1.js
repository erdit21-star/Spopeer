async function handleSubmit(event) {
      event.preventDefault();
      const form = event.target;
      const submitBtn = form.querySelector('.submit-btn');

      const reporterName  = (form.querySelector('#name')?.value || '').trim();
      const reporterEmail = (form.querySelector('#email')?.value || '').trim();
      const reportedUser  = (form.querySelector('#reported-user')?.value || '').trim();
      const reason        = (form.querySelector('#report-type')?.value || '').trim();
      const details       = (form.querySelector('#description')?.value || '').trim();
      const reportedUrl   = (form.querySelector('#evidence')?.value || '').trim();

      if (!reporterName || !reporterEmail || !reportedUser || !reason || !details) {
        alert('Please fill in all required fields.');
        return;
      }

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting�'; }

      try {
        const res = await fetch('/api/reports/abuse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reporterName, reporterEmail, reportedUser, reportedUrl, reason, details })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to submit report.');

        form.reset();
        const container = form.closest('.form-section') || form.parentElement;
        container.innerHTML = '<div style="text-align:center;padding:40px 20px;">' +
          '<i class="fas fa-check-circle" style="font-size:48px;color:#059669;margin-bottom:16px;display:block;"></i>' +
          '<h3 style="font-size:22px;margin-bottom:8px;color:#111;">Report submitted</h3>' +
          '<p style="color:#555;">Thank you for helping keep Spopeer safe. Our moderation team will review your report.</p>' +
          '</div>';
      } catch (err) {
        alert(err.message || 'Failed to submit report. Please try again.');
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Report'; }
      }
    }
