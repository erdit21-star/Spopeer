/**
 * Follow/Unfollow Feature
 * Manages follow relationships between users
 * Uses backend API only
 */

class FollowManager {
  constructor() {
    this.token = localStorage.getItem('spopeer_token');
    this.currentUser = this.parseUser();
  }

  parseUser() {
    const userStr = localStorage.getItem('spopeer_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  applyCurrentUserFollowingDelta(delta) {
    try {
      const user = this.parseUser() || {};
      const currentFollowing = Number(user.following || 0);
      const nextFollowing = Math.max(0, currentFollowing + delta);
      const updated = { ...user, following: nextFollowing };
      localStorage.setItem('spopeer_user', JSON.stringify(updated));
      this.currentUser = updated;
      window.dispatchEvent(new CustomEvent('profileUpdated', {
        detail: {
          profile: updated,
          source: 'FollowManager'
        }
      }));
    } catch (e) {
      console.warn('Unable to apply following delta:', e);
    }
  }

  emitFollowRelationChanged(targetUserId, deltaFollowers, deltaFollowing, action) {
    window.dispatchEvent(new CustomEvent('followRelationChanged', {
      detail: {
        targetUserId,
        deltaFollowers,
        deltaFollowing,
        action,
        actorEmail: this.currentUser?.email || this.currentUser?.userEmail || ''
      }
    }));
  }

  async getFollowStatus(userId) {
    if (this.token) {
      try {
        const data = await window.SpopeerAPI.getFollowStatus(userId);
        return data.relation || 'none';
      } catch (err) {
        console.error('Follow status request failed:', err);
      }
    }

    return 'none';
  }

  async follow(userId) {
        const existingStatus = await this.getFollowStatus(userId);
        if (existingStatus === 'accepted' || existingStatus === 'pending') {
          return true;
        }

    // Require login for following
    if (!this.token) {
      alert('Please log in to follow users');
      window.location.href = '/pages/auth/login.html';
      return false;
    }

    try {
      await window.SpopeerAPI.followUser(userId);
      this.applyCurrentUserFollowingDelta(1);
      this.emitFollowRelationChanged(userId, 1, 1, 'follow');
      return true;
    } catch (err) {
      console.error('Follow error:', err);
    }
    
    alert('Error following user');
    return false;
  }

  async unfollow(userId) {
        const existingStatus = await this.getFollowStatus(userId);
        if (existingStatus !== 'accepted') {
          return true;
        }

    if (!this.token) {
      alert('Please log in to unfollow users');
      return false;
    }

    try {
      await window.SpopeerAPI.unfollowUser(userId);
      this.applyCurrentUserFollowingDelta(-1);
      this.emitFollowRelationChanged(userId, -1, -1, 'unfollow');
      return true;
    } catch (err) {
      console.error('Unfollow error:', err);
    }
    
    return false;
  }

  async acceptFollowRequest(connectionId) {
    console.warn('Accept follow request is not implemented on the current backend.', connectionId);
    return false;
  }

  async rejectFollowRequest(connectionId) {
    console.warn('Reject follow request is not implemented on the current backend.', connectionId);
    return false;
  }

  async getFollowers(userId) {
    if (this.token) {
      try {
        const data = await window.SpopeerAPI.getFollowers(userId);
        return data.users || [];
      } catch (err) {
        console.error('Get followers error:', err);
      }
    }

    return [];
  }

  async getFollowing(userId) {
    if (this.token) {
      try {
        const data = await window.SpopeerAPI.getFollowing(userId);
        return data.users || [];
      } catch (err) {
        console.error('Get following error:', err);
      }
    }

    return [];
  }

  async getPendingRequests() {
    if (!this.token) return [];
    console.warn('Pending follow requests are not implemented on the current backend.');
    return [];
  }

  isLoggedIn() {
    return !!this.token && !!this.currentUser;
  }
}

// Create global instance
const followManager = new FollowManager();

// Helper to render follow button
function renderFollowButton(userId, className = 'follow-btn') {
  const button = document.createElement('button');
  button.className = className;
  button.textContent = 'Follow';

  // Initialize the button state on first render.
  updateFollowButtonStatus(button, userId);

  button.onclick = async function(e) {
    e.preventDefault();
    e.stopPropagation();

    const isFollowing = button.classList.contains('following');
    if (isFollowing) {
      const success = await followManager.unfollow(userId);
      if (success) {
        button.textContent = 'Follow';
        button.classList.remove('following', 'pending');
        button.disabled = false;
      }
      return;
    }

    const success = await followManager.follow(userId);
    if (success) {
      button.textContent = 'Following';
      button.classList.add('following');
      button.classList.remove('pending');
      button.disabled = false;
    }
  };
  
  return button;
}

// Helper to update follow button status
async function updateFollowButtonStatus(button, userId) {
  if (!button) return;

  if (!followManager.isLoggedIn()) {
    button.textContent = 'Follow';
    button.classList.remove('following', 'pending');
    button.disabled = false;
    return;
  }
  
  const status = await followManager.getFollowStatus(userId);
  if (status === 'accepted') {
    button.textContent = 'Following';
    button.classList.add('following');
    button.classList.remove('pending');
    button.disabled = false;
  } else if (status === 'pending') {
    button.textContent = 'Requested';
    button.classList.add('pending');
    button.classList.remove('following');
    button.disabled = true;
  } else {
    button.textContent = 'Follow';
    button.classList.remove('following', 'pending');
    button.disabled = false;
  }
}

