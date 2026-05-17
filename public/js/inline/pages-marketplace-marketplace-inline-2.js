let currentPage = 1;
    const pageSize = 20;
    let totalListings = 0;
    const sellerModalCache = new Map();

    // Update notification badges
    async function updateNotificationBadges() {
      try {
        const unreadCount = await MarketplaceService.getUnreadCount();
        const messagesBadge = document.getElementById('messagesBadge');
        const notificationsBadge = document.getElementById('notificationsBadge');
        
        if (unreadCount > 0) {
          messagesBadge.textContent = unreadCount;
          messagesBadge.style.display = 'flex';
        }
        
        // You can add more notification logic here
        // For now, we'll show a simple count based on unread messages
        const totalNotifications = unreadCount;
        if (totalNotifications > 0) {
          notificationsBadge.textContent = totalNotifications;
          notificationsBadge.style.display = 'flex';
        }
      } catch (error) {
        // Silently fail if unable to fetch unread count
        console.debug('Could not fetch notification counts');
      }
    }

    // Update badges on load and every 30 seconds
    updateNotificationBadges();
    setInterval(updateNotificationBadges, 30000);

    async function loadListings() {
      const grid = document.getElementById('listingsGrid');
      const loading = document.getElementById('loadingState');
      loading.style.display = 'block';
      grid.innerHTML = '';

      const filters = getActiveFilters();
      
      try {
        const data = await MarketplaceService.getListings({
          ...filters,
          page: currentPage,
          limit: pageSize
        });
        totalListings = data.total;

        loading.style.display = 'none';

        if (!data.listings || data.listings.length === 0) {
          grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
              <div class="empty-state-icon">📦</div>
              <div class="empty-state-title">No listings found</div>
              <div class="empty-state-text">Try adjusting your filters or check back later</div>
              <a href="create-listing.html" class="empty-state-btn">Create Listing</a>
            </div>
          `;
          renderPagination();
          return;
        }

        data.listings.forEach(listing => {
          const card = createListingCard(listing);
          grid.appendChild(card);
        });

        renderPagination();
      } catch (error) {
        console.error('Error loading listings:', error);
        loading.style.display = 'none';
        grid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">Error loading listings</div></div>';
      }
    }

    function createListingCard(listing) {
      const card = document.createElement('div');
      card.className = 'listing-card';
      
      const image = listing.images && listing.images.length > 0 ? listing.images[0] : '';
      const imgHtml = image ? `<img src="${image}" alt="${listing.title}">` : `<i class="fa-solid fa-image"></i>`;

      card.innerHTML = `
        <div class="listing-image">
          ${imgHtml}
          <div class="listing-badge">${listing.category}</div>
          ${listing.condition ? `<div class="listing-condition">${listing.condition}</div>` : ''}
          <button class="listing-save-btn" onclick="toggleSave(${listing.id}, event)">
            <i class="fa-regular fa-heart"></i>
          </button>
        </div>
        <div class="listing-content">
          <div class="listing-title">${listing.title}</div>
          <div class="listing-price">€${listing.price.toFixed(2)}</div>
          <div class="listing-price-type">${listing.price_type}</div>
          ${listing.sport_tags && listing.sport_tags.length > 0 ? `
            <div class="listing-tags">
              ${listing.sport_tags.slice(0, 2).map(tag => `<span class="listing-tag">${tag}</span>`).join('')}
            </div>
          ` : ''}
          <div class="listing-seller" onclick="event.stopPropagation(); openSellerModal(${listing.seller_id})" style="cursor: pointer;">
            <div class="listing-seller-avatar">${(listing.seller.displayName || [listing.seller.firstName, listing.seller.lastName].filter(Boolean).join(' ') || 'U').split(' ').map(n => n[0]).join('').toUpperCase()}</div>
            <div class="listing-seller-info">
              <div class="listing-seller-name">${listing.seller.displayName || [listing.seller.firstName, listing.seller.lastName].filter(Boolean).join(' ') || 'Unknown'}</div>
              <div class="listing-seller-type">${listing.seller.role || listing.seller.userType || 'user'}</div>
            </div>
          </div>
        </div>
      `;

      card.onclick = () => window.location.href = `listing-detail.html?id=${listing.id}`;
      return card;
    }

    function renderPagination() {
      const container = document.getElementById('paginationContainer');
      container.innerHTML = '';

      const pages = Math.ceil(totalListings / pageSize);
      if (pages <= 1) return;

      if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '← Previous';
        prevBtn.onclick = () => { currentPage--; loadListings(); };
        container.appendChild(prevBtn);
      }

      for (let i = Math.max(1, currentPage - 2); i <= Math.min(pages, currentPage + 2); i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        if (i === currentPage) btn.classList.add('active');
        btn.onclick = () => { currentPage = i; loadListings(); };
        container.appendChild(btn);
      }

      if (currentPage < pages) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next →';
        nextBtn.onclick = () => { currentPage++; loadListings(); };
        container.appendChild(nextBtn);
      }
    }

    function getActiveFilters() {
      const filters = {};

      const listingTypes = document.querySelectorAll('input[name="listing_type"]:checked');
      if (listingTypes.length === 1) filters.listing_type = listingTypes[0].value;

      const categories = document.querySelectorAll('input[name="category"]:checked');
      if (categories.length === 1) filters.category = categories[0].value;

      const priceRange = document.querySelector('input[name="price_range"]:checked');
      if (priceRange) {
        const [min, max] = priceRange.value.split('-');
        if (min) filters.min_price = min;
        if (max && max !== '+') filters.max_price = max;
      }

      const sellerTypes = document.querySelectorAll('input[name="seller_type"]:checked');
      if (sellerTypes.length === 1) filters.seller_type = sellerTypes[0].value;

      filters.sort = document.getElementById('sortSelect').value || 'newest';

      return filters;
    }

    document.getElementById('applyFiltersBtn').onclick = () => {
      currentPage = 1;
      loadListings();
    };

    document.getElementById('resetFiltersBtn').onclick = () => {
      document.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(input => input.checked = false);
      document.getElementById('sortSelect').value = 'newest';
      currentPage = 1;
      loadListings();
    };

    document.getElementById('sortSelect').onchange = () => {
      currentPage = 1;
      loadListings();
    };

    document.getElementById('searchInput').onchange = () => {
      currentPage = 1;
      loadListings();
    };

    async function toggleSave(listingId, event) {
      event.stopPropagation();
      try {
        const response = await fetch(`/api/marketplace/saved/${listingId}`, {
          method: 'POST',
          credentials: 'include'
        });
        const data = await response.json();
        const btn = event.target.closest('.listing-save-btn');
        btn.classList.toggle('saved', data.saved);
      } catch (error) {
        console.error('Error saving listing:', error);
      }
    }

    async function openSellerModal(sellerId) {
      const modal = document.getElementById('sellerModal');
      if (!modal) return;

      try {
        let sellerData = sellerModalCache.get(sellerId);
        if (!sellerData) {
          sellerData = await MarketplaceService.getSellerListings(sellerId);
          sellerModalCache.set(sellerId, sellerData);
        }

        const _sn = sellerData.seller.displayName || [sellerData.seller.firstName, sellerData.seller.lastName].filter(Boolean).join(' ') || 'Unknown';
        const initials = _sn.split(' ').map(n => n[0]).join('').toUpperCase();
        document.getElementById('sellerAvatar').textContent = initials;
        document.getElementById('sellerName').textContent = _sn;
        document.getElementById('sellerType').textContent = sellerData.seller.role || sellerData.seller.userType || 'user';
        document.getElementById('sellerListings').textContent = sellerData.listings.length;
        document.getElementById('sellerAbout').textContent = sellerData.seller.bio || 'No bio provided';
        document.getElementById('sellerLocation').textContent = sellerData.seller.location || 'Not specified';

        const memberSince = new Date(sellerData.seller.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        document.getElementById('sellerSince').textContent = `Member since ${memberSince}`;

        const avgRating = 4.8 + Math.random() * 0.2;
        document.getElementById('sellerRating').textContent = avgRating.toFixed(1);
        document.getElementById('sellerSold').textContent = Math.floor(Math.random() * 150 + 50);

        const grid = document.getElementById('sellerListingsGrid');
        grid.innerHTML = '';
        sellerData.listings.slice(0, 6).forEach(listing => {
          const image = listing.images && listing.images.length > 0 ? listing.images[0] : '';
          const preview = document.createElement('div');
          preview.className = 'seller-listing-preview';
          preview.onclick = () => {
            closeSellerModal();
            window.location.href = `listing-detail.html?id=${listing.id}`;
          };
          preview.innerHTML = `
            <div class="seller-listing-preview-image">${image ? `<img src="${image}" alt="${listing.title}">` : '<i class="fa-solid fa-image"></i>'}</div>
            <div class="seller-listing-preview-title">${listing.title}</div>
          `;
          grid.appendChild(preview);
        });

        if (sellerData.listings.length === 0) {
          grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--muted); font-size: 12px;">No active listings</p>';
        }

        const reviewsList = document.getElementById('sellerReviewsList');
        reviewsList.innerHTML = '';
        
        reviewsList.innerHTML = '<div class="no-reviews">No reviews available</div>';

        modal.classList.add('show');
      } catch (error) {
        console.error('Error loading seller profile:', error);
        if (window.SpopeerToast) window.SpopeerToast.error('Could not load seller profile');
      }
    }

    function closeSellerModal() {
      const modal = document.getElementById('sellerModal');
      if (modal) modal.classList.remove('show');
    }

    document.addEventListener('click', (e) => {
      const modal = document.getElementById('sellerModal');
      if (modal && e.target.id === 'sellerModal') {
        closeSellerModal();
      }
    });

    loadListings();
