function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatNumber(value) {
  const number = Number(value || 0);
  if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(1)}K`;
  return String(number);
}

function getTheme(style, userType) {
  const themes = {
    athlete_neon: {
      accent: '#9DFF3A',
      accent2: '#18E6FF',
      background: 'radial-gradient(circle at 18% 30%, rgba(157,255,58,.24), transparent 34%), linear-gradient(135deg, #050806 0%, #0B1410 45%, #020403 100%)',
      label: 'ATHLETE PROFILE'
    },
    athlete_elite: {
      accent: '#FF7A1A',
      accent2: '#FFD166',
      background: 'radial-gradient(circle at 20% 20%, rgba(255,122,26,.26), transparent 34%), linear-gradient(135deg, #070504 0%, #16100B 48%, #030202 100%)',
      label: 'ELITE PLAYER CARD'
    },
    coach_tactical: {
      accent: '#22E87B',
      accent2: '#48B6FF',
      background: 'radial-gradient(circle at 22% 24%, rgba(34,232,123,.18), transparent 34%), linear-gradient(135deg, #04110B 0%, #071A13 50%, #020605 100%)',
      label: 'COACHING PROFILE'
    },
    club_legacy: {
      accent: '#FFD166',
      accent2: '#FFFFFF',
      background: 'radial-gradient(circle at 22% 25%, rgba(255,209,102,.22), transparent 35%), linear-gradient(135deg, #100D06 0%, #1B160C 48%, #030302 100%)',
      label: 'CLUB PROFILE'
    },
    professional_premium: {
      accent: '#B968FF',
      accent2: '#43F7D7',
      background: 'radial-gradient(circle at 22% 25%, rgba(185,104,255,.23), transparent 35%), linear-gradient(135deg, #0A0610 0%, #15101D 48%, #030205 100%)',
      label: 'SPORTS PROFESSIONAL'
    }
  };

  return themes[style] || themes[`${userType}_neon`] || themes.athlete_neon;
}

function getFallbackPhoto() {
  return 'https://res.cloudinary.com/demo/image/upload/v1690000000/sample.jpg';
}

function statBox(label, value) {
  return `\n    <div class="stat-box">\n      <div class="stat-label">${escapeHtml(label)}</div>\n      <div class="stat-value">${escapeHtml(value || '-')}</div>\n    </div>\n  `;
}

function miniInfo(label, value) {
  return `\n    <div class="mini-info">\n      <div class="mini-label">${escapeHtml(label)}</div>\n      <div class="mini-value">${escapeHtml(value || '-')}</div>\n    </div>\n  `;
}

function renderAthleteContent(profile, theme) {
  const stats = profile.stats || {};

  return `
    <div class="content-grid">
      <div class="photo-panel">
        <img class="profile-photo" src="${escapeHtml(profile.profilePhotoUrl || getFallbackPhoto())}" />
        <div class="photo-glow"></div>
      </div>

      <div class="info-panel">
        <div class="card-label">${theme.label}</div>
        <div class="name-row">
          <h1>${escapeHtml(profile.fullName)}</h1>
          ${profile.verified ? '<span class="verified">✓</span>' : ''}
        </div>
        <h2>${escapeHtml(profile.sport || 'Sport')}${profile.position ? ' / ' + escapeHtml(profile.position) : ''}</h2>

        <div class="mini-grid">
          ${miniInfo('Club', profile.clubName)}
          ${miniInfo('Country', profile.country)}
          ${miniInfo('Age', profile.age)}
          ${miniInfo('Height', profile.height)}
          ${miniInfo('Side', profile.dominantSide)}
          ${miniInfo('Rating', profile.rating ? `${profile.rating}/5` : '-')}
        </div>

        <div class="stats-title">Key stats</div>
        <div class="stats-grid">
          ${statBox('Matches', stats.matches)}
          ${statBox('Goals', stats.goals)}
          ${statBox('Assists', stats.assists)}
          ${statBox('Pass Acc.', stats.passAccuracy ? `${stats.passAccuracy}%` : '')}
        </div>
      </div>
    </div>
  `;
}

function renderCoachContent(profile, theme) {
  const stats = profile.stats || {};

  return `
    <div class="content-grid coach-layout">
      <div class="photo-panel">
        <img class="profile-photo" src="${escapeHtml(profile.profilePhotoUrl || getFallbackPhoto())}" />
        <div class="tactical-lines"></div>
      </div>

      <div class="info-panel">
        <div class="card-label">${theme.label}</div>
        <div class="name-row">
          <h1>${escapeHtml(profile.fullName)}</h1>
          ${profile.verified ? '<span class="verified">✓</span>' : ''}
        </div>
        <h2>${escapeHtml(profile.sport || 'Sport')} Coach</h2>

        <div class="mini-grid">
          ${miniInfo('Experience', stats.experience || profile.headline)}
          ${miniInfo('Specialty', stats.specialty || 'Player Development')}
          ${miniInfo('Country', profile.country)}
          ${miniInfo('Club', profile.clubName)}
        </div>

        <div class="stats-title">Coaching highlights</div>
        <div class="stats-grid">
          ${statBox('Teams', stats.teamsCoached)}
          ${statBox('Players', stats.playersDeveloped)}
          ${statBox('Trophies', stats.trophies)}
          ${statBox('Licenses', stats.licenses)}
        </div>
      </div>
    </div>
  `;
}

function renderClubContent(profile, theme) {
  const stats = profile.stats || {};

  return `
    <div class="club-layout">
      <div class="club-logo-wrap">
        <img class="club-logo" src="${escapeHtml(profile.clubLogoUrl || profile.profilePhotoUrl || getFallbackPhoto())}" />
      </div>

      <div class="club-info">
        <div class="card-label">${theme.label}</div>
        <div class="name-row">
          <h1>${escapeHtml(profile.fullName || profile.clubName || 'Sports Club')}</h1>
          ${profile.verified ? '<span class="verified">✓</span>' : ''}
        </div>
        <h2>${escapeHtml(profile.sport || 'Sports Club')}${profile.country ? ' / ' + escapeHtml(profile.country) : ''}</h2>

        <div class="mini-grid">
          ${miniInfo('League', stats.league)}
          ${miniInfo('Founded', stats.founded)}
          ${miniInfo('City', profile.city)}
          ${miniInfo('Country', profile.country)}
        </div>

        <div class="stats-title">Club profile</div>
        <div class="stats-grid">
          ${statBox('Players', stats.players)}
          ${statBox('Teams', stats.teams)}
          ${statBox('Titles', stats.titles)}
          ${statBox('Open Trials', stats.openTrials)}
        </div>
      </div>
    </div>
  `;
}

function renderProfessionalContent(profile, theme) {
  const stats = profile.stats || {};
  const services = Array.isArray(profile.services) ? profile.services.slice(0, 4) : [];

  return `
    <div class="content-grid professional-layout">
      <div class="info-panel professional-info">
        <div class="card-label">${theme.label}</div>
        <div class="name-row">
          <h1>${escapeHtml(profile.fullName)}</h1>
          ${profile.verified ? '<span class="verified">✓</span>' : ''}
        </div>
        <h2>${escapeHtml(profile.headline || 'Sports Professional')}</h2>

        <div class="mini-grid">
          ${miniInfo('Specialty', stats.specialty || profile.position)}
          ${miniInfo('Experience', stats.experience)}
          ${miniInfo('Based in', profile.country)}
          ${miniInfo('Sport', profile.sport)}
        </div>

        <div class="stats-title">Expertise</div>
        <div class="service-grid">
          ${
            services.length
              ? services.map((service) => `<div class="service-pill">${escapeHtml(service)}</div>`).join('')
              : `
                <div class="service-pill">Performance</div>
                <div class="service-pill">Recovery</div>
                <div class="service-pill">Development</div>
                <div class="service-pill">Support</div>
              `
          }
        </div>
      </div>

      <div class="photo-panel">
        <img class="profile-photo" src="${escapeHtml(profile.profilePhotoUrl || getFallbackPhoto())}" />
      </div>
    </div>
  `;
}

function renderProfileCardHtml(profile) {
  const theme = getTheme(profile.cardStyle, profile.userType);

  let mainContent = '';
  if (profile.userType === 'coach') {
    mainContent = renderCoachContent(profile, theme);
  } else if (profile.userType === 'club') {
    mainContent = renderClubContent(profile, theme);
  } else if (profile.userType === 'professional' || profile.userType === 'supportive_professional') {
    mainContent = renderProfessionalContent(profile, theme);
  } else {
    mainContent = renderAthleteContent(profile, theme);
  }

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #000; font-family: Arial, Helvetica, sans-serif; color: #fff; }
    .card { position: relative; width: 1200px; height: 630px; padding: 34px; background: ${theme.background}; border: 2px solid ${theme.accent}; overflow: hidden; }
    .card::before { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,.035) 1px, transparent 1px); background-size: 42px 42px; opacity: .55; }
    .card::after { content: ''; position: absolute; right: -130px; top: -120px; width: 520px; height: 520px; border: 2px solid ${theme.accent}; border-radius: 50%; opacity: .18; }
    .topbar { position: relative; z-index: 2; display: flex; align-items: center; gap: 22px; height: 58px; }
    .brand-mark { width: 54px; height: 38px; border-radius: 12px; background: linear-gradient(135deg, #fff, ${theme.accent}); color: #030303; font-size: 26px; font-weight: 950; display: flex; align-items: center; justify-content: center; transform: skew(-10deg); }
    .brand-name { font-size: 25px; font-weight: 950; letter-spacing: 1px; }
    .tagline { margin-left: 18px; padding-left: 22px; border-left: 1px solid rgba(255,255,255,.26); font-size: 14px; letter-spacing: 2px; line-height: 1.25; text-transform: uppercase; color: rgba(255,255,255,.82); }
    .tagline strong { color: ${theme.accent}; }
    .content-grid { position: relative; z-index: 2; display: grid; grid-template-columns: 420px 1fr; gap: 36px; height: 430px; margin-top: 30px; }
    .photo-panel { position: relative; min-height: 410px; border-radius: 28px; overflow: hidden; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.16); box-shadow: inset 0 0 70px rgba(255,255,255,.06); }
    .profile-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: saturate(1.04) contrast(1.05); }
    .photo-glow { position: absolute; inset: auto -30px -70px -30px; height: 180px; background: linear-gradient(0deg, ${theme.accent}, transparent); opacity: .34; }
    .tactical-lines { position: absolute; inset: 20px; border: 1px dashed rgba(255,255,255,.22); border-radius: 24px; }
    .info-panel, .club-info { position: relative; padding-top: 8px; }
    .card-label { display: inline-flex; padding: 9px 13px; border-radius: 999px; border: 1px solid ${theme.accent}; color: ${theme.accent}; background: rgba(0,0,0,.35); text-transform: uppercase; font-size: 13px; letter-spacing: 2px; font-weight: 800; margin-bottom: 18px; }
    .name-row { display: flex; align-items: center; gap: 18px; }
    h1 { margin: 0; font-size: 66px; line-height: .92; letter-spacing: 2px; font-weight: 950; text-transform: uppercase; text-shadow: 0 10px 28px rgba(0,0,0,.38); }
    h2 { margin: 16px 0 26px; font-size: 27px; line-height: 1.15; color: ${theme.accent}; text-transform: uppercase; letter-spacing: 2px; font-weight: 850; }
    .verified { width: 36px; height: 36px; border-radius: 50%; background: ${theme.accent}; color: #050505; display: flex; align-items: center; justify-content: center; font-weight: 950; font-size: 23px; flex: 0 0 auto; }
    .mini-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid rgba(255,255,255,.14); border-bottom: 1px solid rgba(255,255,255,.14); margin-bottom: 22px; }
    .mini-info { padding: 14px 16px; border-right: 1px solid rgba(255,255,255,.12); }
    .mini-label { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(255,255,255,.55); margin-bottom: 7px; }
    .mini-value { font-size: 17px; line-height: 1.15; text-transform: uppercase; font-weight: 850; }
    .stats-title { margin: 18px 0 12px; color: ${theme.accent}; font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.6px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .stat-box { min-height: 83px; padding: 16px 12px; border-radius: 15px; border: 1px solid rgba(255,255,255,.12); background: rgba(0,0,0,.28); display: flex; flex-direction: column; justify-content: center; }
    .stat-label { font-size: 11px; letter-spacing: 1.2px; text-transform: uppercase; color: rgba(255,255,255,.62); margin-bottom: 8px; }
    .stat-value { font-size: 30px; font-weight: 950; line-height: 1; }
    .club-layout { position: relative; z-index: 2; display: grid; grid-template-columns: 360px 1fr; gap: 44px; align-items: center; height: 430px; margin-top: 32px; }
    .club-logo-wrap { width: 340px; height: 340px; border-radius: 48px; background: rgba(0,0,0,.35); border: 1px solid rgba(255,255,255,.15); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 80px rgba(0,0,0,.38), 0 0 120px ${theme.accent}33; }
    .club-logo { width: 245px; height: 245px; object-fit: contain; }
    .professional-layout { grid-template-columns: 1fr 380px; }
    .service-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .service-pill { padding: 18px 16px; border-radius: 16px; border: 1px solid ${theme.accent}; background: rgba(0,0,0,.30); color: #fff; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; font-weight: 850; }
    .footer { position: absolute; left: 34px; right: 34px; bottom: 24px; z-index: 3; height: 72px; border-top: 1px solid rgba(255,255,255,.16); display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 20px; }
    .footer-item { display: flex; align-items: center; gap: 14px; color: rgba(255,255,255,.86); font-size: 16px; font-weight: 850; text-transform: uppercase; letter-spacing: 1.3px; }
    .footer-item small { display: block; color: rgba(255,255,255,.54); font-size: 10px; letter-spacing: 1.4px; margin-top: 2px; }
    .url-box { text-align: right; font-size: 15px; color: rgba(255,255,255,.75); letter-spacing: 1px; text-transform: uppercase; }
    .qr-fake { width: 58px; height: 58px; border: 4px solid #fff; border-radius: 10px; background: linear-gradient(90deg, #000 10px, transparent 10px) 0 0/18px 18px, linear-gradient(#000 10px, transparent 10px) 0 0/18px 18px, #fff; box-shadow: 0 0 0 2px rgba(255,255,255,.22); }
    .accent-line { position: absolute; left: 0; right: 0; bottom: 103px; z-index: 2; height: 2px; background: linear-gradient(90deg, transparent, ${theme.accent}, transparent); opacity: .8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="topbar">
      <div class="brand-mark">S</div>
      <div class="brand-name">SPOPEER</div>
      <div class="tagline">Passport to the<br><strong>world of sports</strong></div>
    </div>
    ${mainContent}
    <div class="accent-line"></div>
    <div class="footer">
      <div class="footer-item">
        <div style="font-size:28px;color:${theme.accent};">◉</div>
        <div>
          ${formatNumber(profile.followersCount)} followers
          <small>${profile.verified ? 'Verified profile' : 'Sports network profile'}</small>
        </div>
      </div>
      <div class="footer-item">
        <div style="font-size:28px;color:${theme.accent};">◆</div>
        <div>
          Connect. Compete. Grow.
          <small>One profile. Endless opportunities.</small>
        </div>
      </div>
      <div class="footer-item" style="justify-content:flex-end;">
        <div class="url-box">${escapeHtml(String(profile.profileUrl || '').replace(/^https?:\/\//, ''))}</div>
        <div class="qr-fake"></div>
      </div>
    </div>
  </div>
</body>
</html>
`;
}

module.exports = {
  renderProfileCardHtml,
  escapeHtml
};
