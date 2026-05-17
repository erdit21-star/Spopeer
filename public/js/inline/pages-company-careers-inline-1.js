async function handleSubmit(event) {
      event.preventDefault();
      const form = event.target;
      const submitBtn = form.querySelector('.submit-btn');

      const name       = (form.querySelector('#name')?.value || '').trim();
      const email      = (form.querySelector('#email')?.value || '').trim();
      const phone      = (form.querySelector('#phone')?.value || '').trim();
      const position   = (form.querySelector('#position')?.value || '').trim();
      const resume     = (form.querySelector('#resume')?.value || '').trim();
      const portfolio  = (form.querySelector('#portfolio')?.value || '').trim();
      const coverLetter = (form.querySelector('#cover-letter')?.value || '').trim();

      if (!name || !email || !position || !resume || !coverLetter) {
        alert('Please fill in all required fields.');
        return;
      }

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting�'; }

      try {
        const res = await fetch('/api/careers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone, position, resume, portfolio, coverLetter })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to submit application.');

        const section = form.closest('.application-form') || form.parentElement;
        section.innerHTML =
          '<div style="text-align:center;padding:40px 20px;">' +
          '<i class="fas fa-check-circle" style="font-size:48px;color:#059669;margin-bottom:16px;display:block;"></i>' +
          '<h3 style="font-size:24px;margin-bottom:10px;color:#111;font-family:var(--font-display);">Application Submitted!</h3>' +
          '<p style="color:#555;font-size:16px;">Thank you for your interest in joining Spopeer. We\'ll review your application and be in touch soon.</p>' +
          '</div>';
      } catch (err) {
        alert(err.message || 'Failed to submit application. Please try again.');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Application'; }
      }
    }
