document.addEventListener('DOMContentLoaded', async function () {
      if (window.CurrentUserStore) await window.CurrentUserStore.refreshCurrentUser();
      if (window.UserUI) window.UserUI.bindAllChips();

      var navSearchInput = document.getElementById('articlesNavSearch');
      if (navSearchInput) {
        navSearchInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            var query = navSearchInput.value.trim();
            if (query) {
              window.location.href = '/pages/search/search.html?term=' + encodeURIComponent(query);
            }
          }
        });
      }
    });

    function openArticleComposer() {
      document.getElementById('articleComposer').classList.add('open');
      document.getElementById('articleTitle').focus();
    }

    function closeArticleComposer() {
      document.getElementById('articleComposer').classList.remove('open');
      document.getElementById('composerError').style.display = 'none';
    }

    // Close on backdrop click
    document.getElementById('articleComposer').addEventListener('click', function (e) {
      if (e.target === this) closeArticleComposer();
    });

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeArticleComposer();
    });

    function publishArticle() {
      var esc = window.SpopeerSanitize ? window.SpopeerSanitize.escapeHtml : function (s) { return String(s).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[c]; }); };

      var type     = document.getElementById('articleType').value;
      var audience = document.getElementById('articleAudience').value;
      var title    = document.getElementById('articleTitle').value.trim();
      var body     = document.getElementById('articleBody').value.trim();
      var errorEl  = document.getElementById('composerError');

      if (!title || !body) {
        errorEl.textContent = 'Please add a title and article text before publishing.';
        errorEl.style.display = 'block';
        return;
      }

      errorEl.style.display = 'none';

      var article = document.createElement('article');
      article.className = 'article-card new-article';
      article.dataset.type = type;

      // Use escapeHtml for all user-supplied values — prevents XSS
      article.innerHTML =
        '<div class="article-meta">' +
          '<span>' + esc(type) + '</span>' +
          '<span><i class="fa-solid fa-eye"></i> ' + esc(audience) + '</span>' +
        '</div>' +
        '<h2>' + esc(title) + '</h2>' +
        '<p>' + esc(body).replace(/\n/g, '<br>') + '</p>' +
        '<div class="article-author">' +
          '<strong>You</strong>' +
          '<span>Spopeer User</span>' +
        '</div>' +
        '<div class="article-actions">' +
          '<button data-action="like-article"><i class="fa-regular fa-thumbs-up"></i> Like <span class="action-count">0</span></button>' +
          '<button data-action="vote-article"><i class="fa-solid fa-trophy"></i> Vote <span class="action-count">0</span></button>' +
          '<button data-action="repost-article"><i class="fa-solid fa-retweet"></i> Repost</button>' +
          '<button data-action="share-article"><i class="fa-solid fa-arrow-up-from-bracket"></i> Share</button>' +
        '</div>';

      var feed = document.getElementById('articlesFeed');
      feed.insertBefore(article, feed.firstChild);

      // Scroll new article into view
      article.scrollIntoView({ behavior: 'smooth', block: 'start' });

      document.getElementById('articleTitle').value = '';
      document.getElementById('articleBody').value = '';
      closeArticleComposer();
    }

    function likeArticle(button) {
      var span = button.querySelector('.action-count');
      span.textContent = Number(span.textContent) + 1;
      button.classList.toggle('active-action');
    }

    function voteArticle(button) {
      var span = button.querySelector('.action-count');
      span.textContent = Number(span.textContent) + 1;
      button.classList.toggle('active-action');
    }

    function repostArticle() {
      alert('Repost feature will connect with the Spopeer feed in a future update.');
    }

    function shareArticle() {
      if (navigator.share) {
        navigator.share({ title: 'Spopeer Article', url: window.location.href }).catch(function () {});
      } else {
        navigator.clipboard && navigator.clipboard.writeText(window.location.href)
          .then(function () { alert('Link copied to clipboard!'); })
          .catch(function () { alert('Share feature will connect with public article links in a future update.'); });
      }
    }

    function filterArticles(type, btn) {
      document.querySelectorAll('.articles-filters .filter-btn').forEach(function (b) {
        b.classList.remove('active');
      });
      if (btn) btn.classList.add('active');

      document.querySelectorAll('.article-card').forEach(function (article) {
        article.style.display = (type === 'All' || article.dataset.type === type) ? '' : 'none';
      });
    }

/* -- DELEGATED EVENTS -- */
document.addEventListener('click', function(e) {
  var t = e.target;

  if (t.closest('[data-action="open-composer"]')) { openArticleComposer(); return; }
  if (t.closest('[data-action="close-composer"]')) { closeArticleComposer(); return; }
  if (t.closest('[data-action="publish-article"]')) { publishArticle(); return; }

  var filterBtn = t.closest('[data-filter]');
  if (filterBtn) { filterArticles(filterBtn.dataset.filter, filterBtn); return; }

  var likeBtn = t.closest('[data-action="like-article"]');
  if (likeBtn) { likeArticle(likeBtn); return; }

  var voteBtn = t.closest('[data-action="vote-article"]');
  if (voteBtn) { voteArticle(voteBtn); return; }

  if (t.closest('[data-action="repost-article"]')) { repostArticle(); return; }
  if (t.closest('[data-action="share-article"]')) { shareArticle(); return; }
});
