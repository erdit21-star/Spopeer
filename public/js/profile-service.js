// Updated
/**
 * PROFILE SERVICE
 * Centralized profile data management and synchronization across all pages
 * This service handles loading, updating, and syncing profile data globally
 */

class ProfileService {
  constructor() {
    this.currentProfile = null;
    this.isLoading = false;
    this.observers = [];
    this.cacheKey = 'spopeer_profile_cache';
    this.cacheTTL = 10000; // 10 second cache
    this.lastFetch = 0;

    // Listen for profile updates
    window.addEventListener('profileUpdated', (e) => this.onProfileUpdated(e));
    window.addEventListener('storage', (e) => this.onStorageChanged(e));
  }

  /**
   * Subscribe to profile changes
   * @param {Function} callback - Called with updated profile data
   */
  subscribe(callback) {
    this.observers.push(callback);
    // Send current profile if available
    if (this.currentProfile) {
      callback(this.currentProfile);
    }
  }

  /**
   * Unsubscribe from profile changes
   * @param {Function} callback - The callback to remove
   */
  unsubscribe(callback) {
    this.observers = this.observers.filter(obs => obs !== callback);
  }

  /**
   * Notify all subscribers of profile changes
   * @param {Object} profile - Updated profile data
   */
  notifySubscribers(profile) {
    this.observers.forEach(callback => {
      try {
        callback(profile);
      } catch (error) {
        console.error('Error in profile observer:', error);
      }
    });
  }

  /**
   * Load profile for current user
   * @returns {Promise<Object>} Profile data
   */
  async loadProfile() {
    try {
      const storedUser = JSON.parse(localStorage.getItem('spopeer_user') || localStorage.getItem('spopeerUser') || '{}');
      const cacheKeyIdentity = storedUser.email || String(storedUser.id || 'me');
      const cached = this.getFromCache(cacheKeyIdentity);
      if (cached) {
        this.currentProfile = cached;
        this.notifySubscribers(cached);
        return cached;
      }

      this.isLoading = true;

      const data = window.SpopeerAPI && typeof window.SpopeerAPI.getProfile === 'function'
        ? await window.SpopeerAPI.getProfile()
        : await fetch('/api/profile/me', { credentials: 'include' }).then(function (response) {
            if (!response.ok) {
              throw new Error('Failed to load persisted profile');
            }
            return response.json();
          });
      const profileData = ((data.data && data.data.user) || data.user || {});

      // Cache the result
      this.saveToCache(cacheKeyIdentity, profileData);
      this.currentProfile = profileData;
      this.isLoading = false;

      // Notify all subscribers
      this.notifySubscribers(profileData);

      return profileData;
    } catch (error) {
      console.error('Error loading profile:', error);
      this.isLoading = false;
      throw error;
    }
  }

  /**
   * Update profile with new data
   * @param {Object} profileData - Updated profile data
   * @returns {Promise<Object>} Updated profile
   */
  async updateProfile(profileData) {
    try {
      if (!window.SpopeerAPI || typeof window.SpopeerAPI.updateProfile !== 'function') {
        throw new Error('Not authenticated');
      }

      const result = await window.SpopeerAPI.updateProfile(profileData);
      const updatedProfile = (result.data && result.data.user) || result.user || profileData;

      // Update current profile
      this.currentProfile = updatedProfile;

      // Clear cache to force refresh
      this.clearCache();

      // Notify subscribers
      this.notifySubscribers(updatedProfile);

      return updatedProfile;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Get current profile synchronously (if already loaded)
   * @returns {Object|null} Current profile or null
   */
  getProfile() {
    return this.currentProfile;
  }

  /**
   * Get specific field from profile
   * @param {String} fieldName - Field to retrieve
   * @returns {*} Field value or undefined
   */
  getField(fieldName) {
    return this.currentProfile?.[fieldName];
  }

  /**
   * Get user display name
   * @returns {String} Full name or 'User'
   */
  getDisplayName() {
    if (!this.currentProfile) return 'User';
    return `${this.currentProfile.firstName || ''} ${this.currentProfile.lastName || ''}`.trim() || 'User';
  }

  /**
   * Get user initials for avatar
   * @returns {String} Two letter initials
   */
  getInitials() {
    const name = this.getDisplayName();
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return (name.substring(0, 2)).toUpperCase() || '?';
  }

  /**
   * Get user type display name
   * @returns {String} Formatted user type
   */
  getUserTypeDisplay() {
    const type = this.currentProfile?.role || this.currentProfile?.userType || 'user';
    return type.replace('-', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  /**
   * Check if profile needs to be refreshed
   * @returns {Boolean} True if cached data is stale
   */
  isCacheStale() {
    return Date.now() - this.lastFetch > this.cacheTTL;
  }

  /**
   * Refresh profile from server
   * @returns {Promise<Object>} Updated profile
   */
  async refreshProfile() {
    this.clearCache();
    return this.loadProfile();
  }

  /**
   * Cache management - Get from localStorage cache
   * @private
   */
  getFromCache(email) {
    try {
      const cacheKey = `${this.cacheKey}_${email}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < this.cacheTTL) {
          return data.profile;
        }
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }
    return null;
  }

  /**
   * Cache management - Save to localStorage cache
   * @private
   */
  saveToCache(email, profile) {
    try {
      const cacheKey = `${this.cacheKey}_${email}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        profile,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  /**
   * Clear profile cache
   * @private
   */
  clearCache() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.cacheKey)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Handle profile update event
   * @private
   */
  onProfileUpdated(event) {
    // Skip events emitted by ProfileSync to break the infinite loop:
    //   loadProfile -> notifySubscribers -> emitProfileChangeEvent -> onProfileUpdated -> notifySubscribers ...
    if (event?.detail?.source === 'ProfileSync' || event?.detail?.source === 'ProfileSyncService') {
      return;
    }
    const profileData = event?.detail?.profile || event?.detail || event?.data;
    if (profileData && typeof profileData === 'object') {
      this.currentProfile = profileData;
      this.clearCache();
      this.notifySubscribers(profileData);
    }
  }

  /**
   * Handle localStorage changes (cross-tab sync)
   * @private
   */
  onStorageChanged(event) {
    if (event.key && event.key.startsWith(this.cacheKey)) {
      // Cache was changed in another tab
      this.clearCache();
      this.loadProfile();
    }
  }
}

// Create singleton instance
const profileService = new ProfileService();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = profileService;
}

