document.addEventListener('DOMContentLoaded', async function () {
    if (window.CurrentUserStore) await window.CurrentUserStore.refreshCurrentUser();
    if (window.UserUI) window.UserUI.bindAllChips();
  });

document.addEventListener('click', function(e) {
  if (e.target.closest('[data-action="prev-story"]')) { if (window.prevStory) window.prevStory(); }
  else if (e.target.closest('[data-action="next-story"]')) { if (window.nextStory) window.nextStory(); }
  else if (e.target.closest('[data-action="close-stories"]')) { if (window.closeStories) window.closeStories(); }
});
