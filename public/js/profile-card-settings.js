(function () {
  const CARD_STYLES = {
    athlete: [
      { id: 'athlete_neon', name: 'Athlete Neon', description: 'Fast, modern, high-energy card for athletes.', accent: '#9DFF3A', background: 'linear-gradient(135deg, #061008, #101B12)' },
      { id: 'athlete_elite', name: 'Athlete Elite', description: 'Premium orange stadium-style card for elite players.', accent: '#FF7A1A', background: 'linear-gradient(135deg, #120905, #201107)' }
    ],
    coach: [
      { id: 'coach_tactical', name: 'Coach Tactical', description: 'Strategic green/blue card for coaches and trainers.', accent: '#22E87B', background: 'linear-gradient(135deg, #04110B, #071A13)' }
    ],
    club: [
      { id: 'club_legacy', name: 'Club Legacy', description: 'Strong official card for clubs and academies.', accent: '#FFD166', background: 'linear-gradient(135deg, #100D06, #1B160C)' }
    ],
    professional: [
      { id: 'professional_premium', name: 'Professional Premium', description: 'Premium purple card for support professionals.', accent: '#B968FF', background: 'linear-gradient(135deg, #0A0610, #15101D)' }
    ],
    supportive_professional: [
      { id: 'professional_premium', name: 'Professional Premium', description: 'Premium purple card for support professionals.', accent: '#B968FF', background: 'linear-gradient(135deg, #0A0610, #15101D)' }
    ]
  };

  let selectedCardStyle = null;
  let currentProfile = null;

  function getAllowedStyles(userType) {
    return CARD_STYLES[userType] || CARD_STYLES.athlete;
  }

  function normalizeProfile(data) {
    return data?.data?.user || data?.data || data?.user || data?.payload || data || {};
  }

  async function loadCurrentProfileForCardSettings() {
    const response = await fetch('/api/profile/me', { credentials: 'include' });
    if (!response.ok) throw new Error('Could not load profile');
    const data = await response.json();
    return normalizeProfile(data);
  }

  function ensureSettingsSection() {
    if (document.getElementById('spopeerProfileCardSettings')) return;

    const privacyCard = document.getElementById('section-privacy');
    if (!privacyCard) return;

    const section = document.createElement('section');
    section.id = 'spopeerProfileCardSettings';
    section.className = 'profile-card-settings';
    section.innerHTML = `
      <div class="settings-header">
        <h2>Social Preview Card</h2>
        <p>This card appears when your profile is shared on social media and chat apps.</p>
      </div>
      <div id="cardStyleOptions" class="card-style-grid"></div>
      <div class="card-preview-actions">
        <button id="saveCardStyleBtn" class="primary-btn" type="button">Save card style</button>
        <button id="regenerateCardBtn" class="secondary-btn" type="button">Regenerate preview image</button>
      </div>
      <div id="cardStyleStatus" class="settings-status"></div>
    `;

    const body = privacyCard.querySelector('.card-body-inner');
    if (body) body.appendChild(section);
  }

  function renderCardStyleOptions(profile) {
    const container = document.getElementById('cardStyleOptions');
    if (!container) return;

    const userType = profile.userType || profile.role || 'athlete';
    const styles = getAllowedStyles(userType);
    const currentStyle = profile.cardStyle || styles[0].id;
    selectedCardStyle = currentStyle;

    container.innerHTML = styles.map((style) => `
      <button
        type="button"
        class="card-style-option-og ${style.id === currentStyle ? 'is-selected' : ''}"
        data-card-style="${style.id}"
        style="--card-accent:${style.accent};--card-bg:${style.background};"
      >
        <h3>${style.name}</h3>
        <p>${style.description}</p>
        <div class="mini-card-preview"></div>
      </button>
    `).join('');

    container.querySelectorAll('.card-style-option-og').forEach((button) => {
      button.addEventListener('click', () => {
        selectedCardStyle = button.dataset.cardStyle;
        container.querySelectorAll('.card-style-option-og').forEach((item) => item.classList.remove('is-selected'));
        button.classList.add('is-selected');
      });
    });
  }

  async function saveCardStyle() {
    const status = document.getElementById('cardStyleStatus');
    const button = document.getElementById('saveCardStyleBtn');

    if (!selectedCardStyle) return;

    try {
      button.disabled = true;
      status.textContent = 'Saving card style...';

      const response = await fetch('/api/profile/me/card-style', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardStyle: selectedCardStyle })
      });

      if (!response.ok) throw new Error('Failed to save card style');

      status.textContent = 'Card style saved.';
      if (currentProfile) currentProfile.cardStyle = selectedCardStyle;
    } catch (error) {
      console.error(error);
      status.textContent = 'Could not save card style. Please try again.';
    } finally {
      button.disabled = false;
    }
  }

  async function regenerateProfileCard() {
    const status = document.getElementById('cardStyleStatus');
    const button = document.getElementById('regenerateCardBtn');

    try {
      button.disabled = true;
      status.textContent = 'Generating new social preview image...';

      const slug = currentProfile.publicSlug || currentProfile.username || currentProfile.id;
      if (!slug) throw new Error('Missing profile slug');

      const response = await fetch(`/api/og/profile/${encodeURIComponent(slug)}/regenerate`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to regenerate card');

      const data = await response.json();
      status.textContent = 'New social preview image generated.';
      if (currentProfile) currentProfile.ogImageUrl = data.ogImageUrl || '';
    } catch (error) {
      console.error(error);
      status.textContent = 'Could not regenerate preview image. Please try again.';
    } finally {
      button.disabled = false;
    }
  }

  async function initProfileCardSettings() {
    if (!window.location.pathname.includes('/pages/profiles/edit-profile.html')) return;

    try {
      ensureSettingsSection();
      currentProfile = await loadCurrentProfileForCardSettings();
      renderCardStyleOptions(currentProfile);

      document.getElementById('saveCardStyleBtn')?.addEventListener('click', saveCardStyle);
      document.getElementById('regenerateCardBtn')?.addEventListener('click', regenerateProfileCard);
    } catch (error) {
      console.error(error);
      const status = document.getElementById('cardStyleStatus');
      if (status) status.textContent = 'Could not load card settings.';
    }
  }

  document.addEventListener('DOMContentLoaded', initProfileCardSettings);
})();
