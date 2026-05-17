document.addEventListener('DOMContentLoaded', async function () {
      if (window.CurrentUserStore) await window.CurrentUserStore.refreshCurrentUser();
      if (window.UserUI) window.UserUI.bindAllChips();
      
      // Initialize stories carousel
      if (window.storiesManager) {
        const stories = await window.storiesManager.fetchFeedStories();
        window.storiesManager.renderStoriesCarousel(stories, 'storiesCarousel');
      }
    });
