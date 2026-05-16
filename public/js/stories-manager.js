/**
 * Stories Manager
 * Handles 24-hour story uploads, display, and expiry countdown
 */
(function () {
  'use strict';

  class StoriesManager {
    constructor() {
      this.stories = [];
      this.archivedStories = [];
      this.currentUserStories = [];
      this.updateInterval = null;
    }

    /**
     * Upload a new story
     */
    async uploadStory(mediaFile, caption, sport) {
      try {
        if (!mediaFile) throw new Error('Media file is required');

        const formData = new FormData();
        formData.append('media', mediaFile);
        formData.append('caption', caption || '');
        formData.append('sport', sport || '');
        formData.append('type', mediaFile.type.startsWith('video/') ? 'video' : 'image');

        // Route through SpopeerAPI so auth, CSRF, and token refresh are handled
        if (window.SpopeerAPI && typeof window.SpopeerAPI.createStory === 'function') {
          const result = await window.SpopeerAPI.createStory(formData);
          if (window.SpopeerToast) {
            window.SpopeerToast.success('Story uploaded! It will expire in 24 hours.');
          }
          return (result && result.data) || result;
        }

        const response = await fetch('/api/stories', {
          method: 'POST',
          credentials: 'include',
          body: formData
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error((error.error && error.error.message) || error.message || 'Upload failed');
        }

        const result = await response.json();
        if (window.SpopeerToast) {
          window.SpopeerToast.success('Story uploaded! It will expire in 24 hours.');
        }
        return result.data;
      } catch (err) {
        console.error('Story upload error:', err);
        if (window.SpopeerToast) {
          window.SpopeerToast.error(err.message || 'Failed to upload story');
        }
        throw err;
      }
    }

    /**
     * Fetch active stories from feed
     */
    async fetchFeedStories() {
      try {
        const response = await fetch('/api/stories', {
          credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to fetch stories');

        const result = await response.json();
        this.stories = result.data || [];
        return this.stories;
      } catch (err) {
        console.error('Error fetching feed stories:', err);
        return [];
      }
    }

    /**
     * Fetch user's active stories
     */
    async fetchUserStories(userId) {
      try {
        const response = await fetch(`/api/stories/user/${userId}`, {
          credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to fetch user stories');

        const result = await response.json();
        this.currentUserStories = result.data || [];
        return this.currentUserStories;
      } catch (err) {
        console.error('Error fetching user stories:', err);
        return [];
      }
    }

    /**
     * Fetch archived stories
     */
    async fetchArchivedStories() {
      try {
        const response = await fetch('/api/stories/archived/list', {
          credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to fetch archived stories');

        const result = await response.json();
        this.archivedStories = result.data || [];
        return this.archivedStories;
      } catch (err) {
        console.error('Error fetching archived stories:', err);
        return [];
      }
    }

    /**
     * Like a story
     */
    async likeStory(storyId) {
      try {
        const response = await fetch(`/api/stories/${storyId}/like`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error('Failed to like story');

        const result = await response.json();
        return result.data;
      } catch (err) {
        console.error('Error liking story:', err);
        throw err;
      }
    }

    /**
     * View a story (register view)
     */
    async viewStory(storyId) {
      try {
        await fetch(`/api/stories/${storyId}/view`, {
          method: 'POST',
          credentials: 'include'
        });
      } catch (err) {
        console.error('Error registering story view:', err);
      }
    }

    /**
     * Delete a story
     */
    async deleteStory(storyId) {
      try {
        const response = await fetch(`/api/stories/${storyId}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to delete story');

        if (window.SpopeerToast) {
          window.SpopeerToast.success('Story deleted');
        }
        return true;
      } catch (err) {
        console.error('Error deleting story:', err);
        if (window.SpopeerToast) {
          window.SpopeerToast.error('Failed to delete story');
        }
        throw err;
      }
    }

    /**
     * Calculate time remaining for a story (ms)
     */
    getTimeRemaining(expiresAt) {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const remaining = expiry - now;
      return Math.max(0, remaining);
    }

    /**
     * Format time remaining as human-readable
     */
    formatTimeRemaining(ms) {
      if (ms <= 0) return 'Expired';
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    }

    /**
     * Render story card
     */
    renderStoryCard(story, compact = false) {
      if (!story) return '';

      const timeRemaining = this.getTimeRemaining(story.expiresAt);
      const formattedTime = this.formatTimeRemaining(timeRemaining);
      const isExpired = timeRemaining <= 0;

      const author = story.author || {};
      const authorName = `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'User';
      const avatarUrl = author.avatarUrl || '';
      const initials = avatarUrl ? '' : (author.firstName ? author.firstName[0] : 'U') + (author.lastName ? author.lastName[0] : '');

      return `
        <div class="story-card ${isExpired ? 'expired' : ''}" data-story-id="${story.id}">
          <div class="story-media-container">
            ${story.type === 'video'
              ? `<video src="${story.mediaUrl}" class="story-media" controls></video>`
              : `<img src="${story.mediaUrl}" alt="Story" class="story-media" />`
            }
            <div class="story-overlay">
              <div class="story-header">
                <div class="story-author">
                  ${avatarUrl
                    ? `<img src="${avatarUrl}" alt="${authorName}" class="story-avatar" />`
                    : `<div class="story-avatar-initials">${initials}</div>`
                  }
                  <span class="story-author-name">${authorName}</span>
                </div>
                <span class="story-timer ${isExpired ? 'expired' : ''}">${formattedTime}</span>
              </div>
              ${story.caption ? `<div class="story-caption">${this.escapeHtml(story.caption)}</div>` : ''}
            </div>
          </div>
          <div class="story-footer">
            <div class="story-stats">
              <span class="story-stat">
                <span class="icon">👁</span>
                <span class="count">${story.viewsCount || 0}</span>
              </span>
              <span class="story-stat">
                <span class="icon">❤</span>
                <span class="count">${story.likesCount || 0}</span>
              </span>
            </div>
            <button class="story-action-btn like-btn" data-action="like">Like</button>
          </div>
        </div>
      `;
    }

    /**
     * Render stories carousel
     */
    renderStoriesCarousel(stories, containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;

      if (stories.length === 0) {
        container.innerHTML = '<div class="stories-empty">No active stories</div>';
        return;
      }

      const carousel = document.createElement('div');
      carousel.className = 'stories-carousel';
      carousel.innerHTML = `
        <button class="carousel-prev" aria-label="Previous stories">‹</button>
        <div class="carousel-content">
          ${stories.map(s => this.renderStoryCard(s, true)).join('')}
        </div>
        <button class="carousel-next" aria-label="Next stories">›</button>
      `;

      container.innerHTML = '';
      container.appendChild(carousel);

      // Setup carousel navigation
      const content = carousel.querySelector('.carousel-content');
      const prevBtn = carousel.querySelector('.carousel-prev');
      const nextBtn = carousel.querySelector('.carousel-next');

      prevBtn.addEventListener('click', () => {
        content.scrollBy({ left: -300, behavior: 'smooth' });
      });

      nextBtn.addEventListener('click', () => {
        content.scrollBy({ left: 300, behavior: 'smooth' });
      });
    }

    /**
     * Escape HTML for safe rendering
     */
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  }

  window.StoriesManager = StoriesManager;
  window.storiesManager = new StoriesManager();
})();
