ProfileSyncService.init();

    let allSearchResults = [];

    // Load saved searches on page load
    function loadSavedSearchesUI() {
      const container = document.getElementById('savedSearchesList');
      const saved = MarketplaceService.getSavedSearches();
      const entries = Object.entries(saved);

      if (entries.length === 0) {
        container.innerHTML = '<div style="padding: 8px; font-size: 11px; color: var(--muted);">No saved searches yet</div>';
        return;
      }

      container.innerHTML = entries.map(([name, data]) => `
        <div class="saved-search-item" onclick="loadSavedSearch('${name}')">
          <span>${name}</span>
          <button onclick="event.stopPropagation(); deleteSavedSearch('${name}')">×</button>
        </div>
      `).join('');
    }

    async function performSearch() {
      const filters = {
        search: document.getElementById('searchTerm').value.trim(),
        min_price: document.getElementById('minPrice').value,
        max_price: document.getElementById('maxPrice').value,
        category: document.getElementById('category').value,
        sort: document.getElementById('sortSelect').value || document.getElementById('sortBy').value,
        listing_type: Array.from(document.querySelectorAll('input[name="type"]:checked')).map(el => el.value).join(','),
        condition: Array.from(document.querySelectorAll('input[name="condition"]:checked')).map(el => el.value).join(','),
        seller_type: Array.from(document.querySelectorAll('input[name="sellerType"]:checked')).map(el => el.value).join(',')
      };

      const grid = document.getElementById('resultsGrid');
      grid.innerHTML = '<div class="loading" style="grid-column: 1/-1;"><div class="loading-spinner"></div></div>';

      try {
        const response = await fetch(`/api/marketplace/listings?${new URLSearchParams(filters)}`);
        const data = await response.json();
        allSearchResults = data.listings || [];

        renderResults();
      } catch (error) {
        console.error('Search error:', error);
        grid.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fa-solid fa-exclamation-triangle"></i></div>
            <div class="empty-state-title">Search Error</div>
            <div class="empty-state-text">Please try again</div>
          </div>
        `;
      }
    }

    function renderResults() {
      const grid = document.getElementById('resultsGrid');
      const count = document.getElementById('resultsCount');

      if (allSearchResults.length === 0) {
        grid.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fa-solid fa-search"></i></div>
            <div class="empty-state-title">No Results Found</div>
            <div class="empty-state-text">Try adjusting your filters or search terms</div>
          </div>
        `;
        count.textContent = 'No results';
        return;
      }

      count.textContent = `${allSearchResults.length} result${allSearchResults.length !== 1 ? 's' : ''} found`;

      grid.innerHTML = allSearchResults.map(listing => `
        <div class="result-card" onclick="window.location.href='./listing-detail.html?id=${listing.id}'">
          <div class="result-image">
            ${listing.images && listing.images.length > 0 
              ? `<img src="${listing.images[0]}" alt="${listing.title}">` 
              : '<i class="fa-solid fa-image"></i>'}
          </div>
          <div class="result-content">
            <div class="result-title">${listing.title}</div>
            <div class="result-price">€${listing.price.toFixed(2)}</div>
            <div class="result-meta">${listing.category} • ${listing.price_type}</div>
            ${listing.sport_tags && listing.sport_tags.length > 0 
              ? `<div class="result-tags">
                  ${listing.sport_tags.slice(0, 3).map(tag => `<span class="result-tag">${tag}</span>`).join('')}
                </div>`
              : ''}
          </div>
        </div>
      `).join('');
    }

    function resetFilters() {
      document.getElementById('searchTerm').value = '';
      document.getElementById('minPrice').value = '';
      document.getElementById('maxPrice').value = '';
      document.getElementById('category').value = '';
      document.getElementById('sortBy').value = 'newest';
      document.querySelectorAll('input[type="checkbox"]').forEach(el => el.checked = false);
      document.getElementById('resultsGrid').innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fa-solid fa-filter"></i></div>
          <div class="empty-state-title">Advanced Search</div>
          <div class="empty-state-text">Use the filters to find the perfect item</div>
        </div>
      `;
      document.getElementById('resultsCount').textContent = 'Use filters to search';
    }

    function loadSavedSearch(searchName) {
      const saved = MarketplaceService.getSavedSearches();
      if (saved[searchName]) {
        const filters = saved[searchName].filters;
        document.getElementById('searchTerm').value = filters.search || '';
        document.getElementById('minPrice').value = filters.min_price || '';
        document.getElementById('maxPrice').value = filters.max_price || '';
        document.getElementById('category').value = filters.category || '';
        document.getElementById('sortBy').value = filters.sort || 'newest';
        performSearch();
      }
    }

    function saveCurrentSearch() {
      const searchName = document.getElementById('searchTerm').value.trim();
      if (searchName) {
        const filters = {
          search: searchName,
          min_price: document.getElementById('minPrice').value,
          max_price: document.getElementById('maxPrice').value,
          category: document.getElementById('category').value,
          sort: document.getElementById('sortBy').value,
          listing_type: Array.from(document.querySelectorAll('input[name="type"]:checked')).map(el => el.value).join(','),
          condition: Array.from(document.querySelectorAll('input[name="condition"]:checked')).map(el => el.value).join(','),
          seller_type: Array.from(document.querySelectorAll('input[name="sellerType"]:checked')).map(el => el.value).join(',')
        };
        MarketplaceService.saveSearch(searchName, filters);
        if (window.SpopeerToast) window.SpopeerToast.success(`Saved search: "${searchName}"`);
        // Reload saved searches list
        location.reload();
      } else {
        if (window.SpopeerToast) window.SpopeerToast.warning('Please enter a search term');
      }
    }

    function deleteSavedSearch(searchName) {
      if (confirm(`Delete saved search: "${searchName}"?`)) {
        MarketplaceService.deleteSavedSearch(searchName);
        location.reload();
      }
    }

    // Initialize
    resetFilters();
    loadSavedSearchesUI();
