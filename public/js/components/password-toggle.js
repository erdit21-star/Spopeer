/**
 * Password toggle component.
 * Drop-in replacement for the inline toggle code repeated across auth pages.
 *
 * Usage:
 *   <div class="pw-wrap">
 *     <input type="password" … />
 *     <button type="button" class="pw-toggle" aria-label="Toggle password" aria-pressed="false">
 *       <i class="fa-solid fa-eye"></i>
 *     </button>
 *   </div>
 */
(function () {
  'use strict';

  function togglePassword(btn) {
    var wrap = btn.closest('.pw-wrap');
    if (!wrap) return;
    var input = wrap.querySelector('input');
    if (!input) return;

    var shown = input.type === 'text';
    input.type = shown ? 'password' : 'text';
    btn.innerHTML = shown
      ? '<i class="fa-solid fa-eye"></i>'
      : '<i class="fa-solid fa-eye-slash"></i>';
    btn.setAttribute('aria-pressed', String(!shown));
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.pw-toggle');
    if (btn) togglePassword(btn);
  });

  document.addEventListener('keydown', function (e) {
    var btn = document.activeElement;
    if (!btn || !btn.classList.contains('pw-toggle')) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      togglePassword(btn);
    }
  });
})();
