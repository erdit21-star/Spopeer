// Updated
/**
 * Profile Sync Service - Real-time profile synchronization across all pages
 * Ensures that when a user updates their profile anywhere, it updates everywhere:
 * - Profile card on feed.html
 * - Profile menu dropdown
 * - Public profile page
 * - Any other pages showing profile info
 */

const ProfileSyncService = {
  PROFILE_UPDATED_EVENT: 'profileUpdated',
  
  // Key for localStorage updates
  PROFILE_UPDATE_KEY: '_profileLastUpdated_',
  PROFILE_STORAGE_KEY: 'spopeer_user',
  lastUpdateToken: null,
  
  /**
   * Initialize sync listeners on page load
   * Call this on every page that displays profile info
   */
  init() {
    console.log('ProfileSyncService: Initializing...');
    
    // Listen for storage changes from other tabs/windows
    window.addEventListener('storage', this.onStorageChange.bind(this));
    
    // Listen for profile updates from same page
    window.addEventListener('profileUpdated', this.onProfileUpdated.bind(this));

    // Wire sidebar cover upload if elements exist
    this.wireCoverUpload();
    this.syncShareButton();
    
    console.log('ProfileSyncService: Initialized successfully');
  },
  
  /**
   * Handle storage change events (from other tabs)
   */
  onStorageChange(event) {
    if (event.key === this.PROFILE_UPDATE_KEY && event.newValue && event.newValue === this.lastUpdateToken) {
      return;
    }

    if (event.key === this.PROFILE_STORAGE_KEY || event.key === this.PROFILE_UPDATE_KEY) {
      if (event.key === this.PROFILE_UPDATE_KEY) {
        this.lastUpdateToken = event.newValue;
      }
      console.log('ProfileSyncService: Detected profile change from storage event');
      this.broadcastProfileUpdate();
    }
  },
  
  /**
   * Handle profile update custom events (from same page)
   */
  onProfileUpdated(event) {
    if (event?.detail?.source === 'ProfileSyncService') {
      return;
    }
    console.log('ProfileSyncService: Detected profile updated event', event.detail);
    this.broadcastProfileUpdate();
  },
  
  /**
   * Get current profile from localStorage
   */
  getProfile() {
    const profile = localStorage.getItem(this.PROFILE_STORAGE_KEY);
    if (!profile) return null;

    try {
      return JSON.parse(profile);
    } catch (error) {
      console.warn('ProfileSyncService: Invalid profile JSON in storage. Returning null.', error);
      return null;
    }
  },

  /** Alias for getProfile — preferred public name */
  getStoredProfile() {
    return this.getProfile();
  },

  /** Alias for saveProfile — preferred public name */
  saveStoredProfile(profileData) {
    return this.saveProfile(profileData);
  },

  /**
   * Resolve the user's full display name from a profile object.
   * Priority: fullName → name → firstName+lastName → 'User'
   */
  getProfileFullName(profile) {
    const p = profile || this.getStoredProfile() || {};
    if (p.fullName) return p.fullName;
    if (p.name) return p.name;
    const composed = ((p.firstName || '') + ' ' + (p.lastName || '')).trim();
    return composed || 'User';
  },
  
  /**
   * Save profile to localStorage and broadcast update
   */
  async saveProfile(profileData) {
    console.log('ProfileSyncService: Saving profile', profileData);

    const currentProfile = this.getProfile() || {};
    let mergedProfile = { ...currentProfile, ...profileData };

    if (window.SpopeerAPI && typeof window.SpopeerAPI.updateProfile === 'function') {
      const result = await window.SpopeerAPI.updateProfile(profileData);
      mergedProfile = { ...mergedProfile, ...(result.user || {}) };
    }

    localStorage.setItem(this.PROFILE_STORAGE_KEY, JSON.stringify(mergedProfile));

    const updateToken = Date.now().toString();
    this.lastUpdateToken = updateToken;
    localStorage.setItem(this.PROFILE_UPDATE_KEY, updateToken);

    this.broadcastProfileUpdate();

    return mergedProfile;
  },
  
  /**
   * Broadcast profile update to all listeners on this page
   */
  broadcastProfileUpdate() {
    const profile = this.getProfile();
    
    if (!profile) {
      console.warn('ProfileSyncService: No profile found to broadcast');
      return;
    }
    
    // Dispatch the canonical event and keep the legacy event for compatibility.
    const detail = {
      profile: profile,
      timestamp: Date.now(),
      source: 'ProfileSyncService'
    };
    window.dispatchEvent(new CustomEvent(this.PROFILE_UPDATED_EVENT, { detail }));
    window.dispatchEvent(new CustomEvent('profileSyncUpdated', { detail }));
    
    // Update the DOM
    this.updatePageElements(profile);
    this.updateDataAttributes(profile);
    this.syncShareButton();
  },
  
  /**
   * Update all profile-related elements on the page
   */
  updatePageElements(profile) {
    console.log('ProfileSyncService: Updating page elements with profile:', profile);
    
    if (!profile) return;
    
    // Helper: Get initials
    const fullName = this.getProfileFullName(profile);
    const initials = fullName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
    
    // Update all avatar elements
    const avatarElements = [
      'chipAvatar', 'createAvatar', 'sidebarAvatar', 'composerAvatar',
      'userAvatar', 'profileAvatar', 'navAvatar', 'avatar'
    ];
    
    avatarElements.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      
      if (profile.avatarUrl) {
        // Use image avatar
        const existingImg = el.querySelector('img');
        const normalizedAvatarUrl = new URL(profile.avatarUrl, window.location.href).href;
        if (!existingImg || existingImg.src !== normalizedAvatarUrl) {
          el.innerHTML = '';
          const img = document.createElement('img');
          img.src = profile.avatarUrl;
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          img.style.borderRadius = '50%';
          el.appendChild(img);
        }
      } else {
        // Use initials
        el.textContent = initials;
      }
    });

    // Apply cover photo on sidebar card
    const coverEl = document.querySelector('.sp-cover');
    if (coverEl) {
      if (profile.coverPhoto) {
        coverEl.style.backgroundImage = `url("${profile.coverPhoto}")`;
        coverEl.style.backgroundSize = 'cover';
        coverEl.style.backgroundPosition = 'center';
        coverEl.classList.add('has-cover');
      } else {
        coverEl.style.backgroundImage = '';
        coverEl.classList.remove('has-cover');
      }
    }

    // Apply avatar styling preferences
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    if (sidebarAvatar) {
      sidebarAvatar.style.setProperty('--avatar-color', profile.avatarColor || '#001f3f');
      sidebarAvatar.style.setProperty('--avatar-accent', profile.avatarAccent || '#1a6bff');

      sidebarAvatar.classList.remove('avatar-style-gradient', 'avatar-style-neon', 'avatar-style-soft');
      sidebarAvatar.classList.add(`avatar-style-${profile.avatarStyle || 'gradient'}`);
    }
    
    // Update name elements
    const nameElements = {
      'chipName': fullName,
      'sidebarName': fullName,
      'composerName': fullName,
      'userName': fullName,
      'profileName': fullName,
      'name': fullName
    };
    
    Object.entries(nameElements).forEach(([id, text]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    });
    
    // Update handle/username
    const username = profile.username || (profile.email?.split('@')[0]) || 'user';
    const handleElements = ['chipHandle', 'userHandle', 'profileHandle', 'composerHandle', 'sidebarHandle'];
    handleElements.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '@' + username;
    });
    
    // Also update by class
    const handleByClass = document.querySelector('.sp-handle');
    if (handleByClass) handleByClass.textContent = '@' + username;
    
    // Update role badge
    const roleMap = {
      'athlete': { cls: 'athlete', icon: 'fa-person-running', label: 'Athlete' },
      'coach': { cls: 'coach', icon: 'fa-bullseye', label: 'Coach' },
      'club': { cls: 'club', icon: 'fa-shield-halved', label: 'Club' },
      'supportive_professional': { cls: 'pro', icon: 'fa-star', label: 'Pro' }
    };
    
    const roleInfo = roleMap[profile.userType] || roleMap.athlete;
    const roleBadgeElements = ['profileRole', 'userRole', 'sidebarRole', 'userType'];
    roleBadgeElements.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.className = `role-badge ${roleInfo.cls}`;
        el.innerHTML = `<i class="fa-solid ${roleInfo.icon}" style="font-size:9px"></i> ${roleInfo.label}`;
      }
    });
    
    // Update location
    const locationFallback = `${profile.city || ''}, ${profile.country || ''}`
      .replace(/^,\s*/, '')
      .replace(/,\s*$/, '')
      .trim();
    const location = profile.location || locationFallback;
    const locationElements = ['profileLocation', 'userLocation', 'location'];
    locationElements.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = location || '-';
    });
    
    // Update sport
    const sport = profile.primarySport || profile.sport || '-';
    const sportElements = ['profileSport', 'userSport', 'sport'];
    sportElements.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = sport;
    });
    
    // Update bio
    const bioElements = ['profileBio', 'userBio', 'bio'];
    bioElements.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (profile.bio) {
          el.textContent = profile.bio;
          el.style.display = 'block';
        } else {
          el.style.display = 'none';
        }
      }
    });
    
    console.log('ProfileSyncService: Page elements updated successfully');
  },

  /**
   * Update elements with data-profile-* attributes (consolidated from profile-sync.js)
   */
  updateDataAttributes(profile) {
    if (!profile) return;

    const fullName = this.getProfileFullName(profile);
    const initials = fullName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

    document.querySelectorAll('[data-profile-avatar]').forEach(el => { el.textContent = initials; });
    document.querySelectorAll('[data-profile-name]').forEach(el => { el.textContent = fullName; });
    document.querySelectorAll('[data-profile-type]').forEach(el => {
      el.textContent = profile.userType?.replace('-', ' ') || 'User';
    });
    document.querySelectorAll('[data-profile-sport]').forEach(el => {
      el.textContent = profile.sport || profile.primarySport || '-';
    });
    document.querySelectorAll('[data-profile-location]').forEach(el => {
      const loc = profile.location || `${profile.city || ''}, ${profile.country || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, '').trim();
      el.textContent = loc || '-';
    });
    document.querySelectorAll('[data-profile-bio]').forEach(el => { el.textContent = profile.bio || ''; });
    document.querySelectorAll('[data-profile-experience]').forEach(el => {
      const exp = profile.experience || 0;
      el.textContent = exp ? `${exp} years` : 'N/A';
    });
  },

  /**
   * Wire cover photo upload functionality (consolidated from sidebar-profile-ui.js)
   */
  wireCoverUpload() {
    const coverEditBtn = document.querySelector('.sp-cover-edit');
    const coverInput = document.getElementById('spCoverInput');
    if (!coverEditBtn || !coverInput) return;

    coverEditBtn.addEventListener('click', () => { coverInput.click(); });

    coverInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const profile = this.getProfile() || {};
        profile.coverPhoto = evt.target.result;
        localStorage.setItem(this.PROFILE_STORAGE_KEY, JSON.stringify(profile));
        this.broadcastProfileUpdate();
      };
      reader.readAsDataURL(file);
    });
  },

  /**
   * Show share profile button if present
   */
  syncShareButton() {
    const shareBtn = document.getElementById('shareProfileBtn');
    if (shareBtn) shareBtn.style.display = 'inline-flex';
  },

  /**
   * Create an "Edit Profile" button and append to container
   */
  createEditProfileButton(container, className) {
    const button = document.createElement('button');
    button.className = ('btn-edit-profile ' + (className || '')).trim();
    button.innerHTML = '<i class="fa-solid fa-edit"></i> Edit Profile';
    button.onclick = () => { window.location.href = '/pages/profiles/edit-profile.html'; };
    button.style.cssText = 'padding:10px 16px;background:var(--accent,#001f3f);color:white;border:none;border-radius:var(--rS,10px);font-family:var(--fB,\'Plus Jakarta Sans\',sans-serif);font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;transition:background 0.2s;';
    button.onmouseover = () => { button.style.background = 'var(--accent-hover,#003366)'; };
    button.onmouseout = () => { button.style.background = 'var(--accent,#001f3f)'; };
    if (container) container.appendChild(button);
    return button;
  },
  
  /**
   * Get profile stats
   */
  getStats() {
    const profile = this.getProfile();
    if (!profile) return null;
    
    return {
      postsCount: profile.postsCount || 0,
      followersCount: profile.followersCount || 0,
      followingCount: profile.followingCount || 0,
      completionPercentage: this.calculateCompletion(profile)
    };
  },
  
  /**
   * Calculate profile completion percentage
   */
  calculateCompletion(profile) {
    const fields = [
      'firstName', 'lastName', 'bio', 'avatarUrl', 'sport', 
      'city', 'country', 'userType', 'primarySport'
    ];
    
    const filled = fields.filter(field => {
      const value = profile[field];
      return value !== null && value !== undefined && value !== '';
    }).length;
    
    return Math.round((filled / fields.length) * 100);
  },
  
  /**
   * Watch for specific profile field changes
   */
  onFieldChange(fieldName, callback) {
    window.addEventListener(this.PROFILE_UPDATED_EVENT, (event) => {
      const profile = event?.detail?.profile || event?.detail;
      if (!profile) return;
      callback(profile[fieldName], profile);
    });
  }
};

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ProfileSyncService.init());
} else {
  ProfileSyncService.init();
}

