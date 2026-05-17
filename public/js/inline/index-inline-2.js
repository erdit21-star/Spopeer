function toggleMenu(){
  const m=document.getElementById('mobileMenu');
  const i=document.getElementById('menuIcon');
  const open=m.classList.toggle('open');
  i.className=open?'fa-solid fa-xmark':'fa-solid fa-bars';
}
