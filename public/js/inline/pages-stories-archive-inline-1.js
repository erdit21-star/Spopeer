(function () {
      async function initArchive() {
        try {
          const stories = await window.storiesManager.fetchArchivedStories();
          const container = document.getElementById('archiveContainer');

          if (stories.length === 0) {
            container.innerHTML = `
              <div class="stories-empty">
                <p>No archived stories yet.</p>
              </div>
            `;
            return;
          }

          const grid = document.createElement('div');
          grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 1rem;
          `;

          stories.forEach(story => {
            const card = document.createElement('div');
            card.innerHTML = window.storiesManager.renderStoryCard(story);
            grid.appendChild(card.firstElementChild);
          });

          container.innerHTML = '';
          container.appendChild(grid);
        } catch (err) {
          console.error('Error loading archived stories:', err);
          document.getElementById('archiveContainer').innerHTML = `
            <div class="stories-empty">
              <p>Error loading archived stories</p>
            </div>
          `;
        }
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initArchive);
      } else {
        initArchive();
      }
    })();
