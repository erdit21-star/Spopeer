function toggleMenu(){
  const m=document.getElementById('mobileMenu');
  const i=document.getElementById('menuIcon');
  const open=m.classList.toggle('open');
  i.className=open?'fa-solid fa-xmark':'fa-solid fa-bars';
}

document.getElementById('contactForm').addEventListener('submit', async function(e){
  e.preventDefault();
  const f = this;
  const firstName = f.firstName.value.trim();
  const lastName  = f.lastName.value.trim();
  const email     = f.email.value.trim();
  const subject   = f.subject.value;
  const message   = f.message.value.trim();

  if(!firstName || !lastName || !email || !subject || !message){
    if(window.SpopeerToast) SpopeerToast.warning('Please fill in all fields.');
    return;
  }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    if(window.SpopeerToast) SpopeerToast.warning('Please enter a valid email address.');
    return;
  }

  const submitBtn = f.querySelector('[type="submit"]');
  const originalText = submitBtn ? submitBtn.textContent : '';
  if(submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Sending�'; }

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, subject, message })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Failed to send message.');
    f.style.display = 'none';
    document.getElementById('formSuccess').style.display = 'flex';
  } catch(err) {
    if(window.SpopeerToast) SpopeerToast.error(err.message || 'Failed to send. Please try again.');
    else alert(err.message || 'Failed to send. Please try again.');
  } finally {
    if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = originalText; }
  }
});
