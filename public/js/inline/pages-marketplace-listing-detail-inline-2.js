ProfileSyncService.init();

    const api = window.SpopeerAPI || window.API || {
      request: async (path, options) => {
        const response = await fetch(path, {
          credentials: 'include',
          ...(options || {})
        });
        if (!response.ok) {
          let message = 'Request failed';
          try {
            const payload = await response.json();
            message = payload && (payload.message || payload.error?.message || payload.code) ? (payload.message || payload.error?.message || payload.code) : message;
          } catch (_) {
            // Keep generic fallback message.
          }
          throw new Error(message);
        }
        return response;
      },
      showNotification: (message, type) => {
        if (window.SpopeerToast && typeof window.SpopeerToast[type] === 'function') {
          window.SpopeerToast[type](message);
          return;
        }
        if (window.SpopeerToast && type === 'error' && typeof window.SpopeerToast.error === 'function') {
          window.SpopeerToast.error(message);
          return;
        }
        console[type === 'error' ? 'error' : 'log'](message);
      }
    };

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
        
        const totalNotifications = unreadCount;
        if (totalNotifications > 0) {
          notificationsBadge.textContent = totalNotifications;
          notificationsBadge.style.display = 'flex';
        }
      } catch (error) {
        console.debug('Could not fetch notification counts');
      }
    }

    // Update badges on load and every 30 seconds
    updateNotificationBadges();
    setInterval(updateNotificationBadges, 30000);

    const params = new URLSearchParams(window.location.search);
    const listingId = params.get('id');
    let currentListing = null;

    if (!listingId) {
      window.location.href = 'marketplace.html';
    }

    async function loadListing() {
      try {
        const response = await fetch(`/api/marketplace/listings/${listingId}`);
        if (!response.ok) throw new Error('Listing not found');
        currentListing = await response.json();
        currentSellerId = currentListing.seller_id;

        renderListing();
        loadRelatedListings();
      } catch (error) {
        console.error('Error loading listing:', error);
        document.getElementById('pageContent').innerHTML = '<div class="loading"><div style="font-size:32px; color:var(--muted-2);">⚠️</div><div style="font-size:18px; font-weight:700; margin-top:16px;">Listing not found</div></div>';
      }
    }

    function renderListing() {
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('pageContent').style.display = 'block';

      const listing = currentListing;

      // Header
      document.getElementById('panelTitle').textContent = listing.title;
      document.getElementById('breadcrumbTitle').textContent = listing.title;
      document.getElementById('breadcrumbCategory').textContent = listing.category;
      document.getElementById('categoryBadge').textContent = listing.category;

      // Gallery
      const mainImage = document.getElementById('mainImage');
      if (listing.images && listing.images.length > 0) {
        mainImage.innerHTML = `<img src="${listing.images[0]}" alt="${listing.title}">`;
      }

      const thumbnailRow = document.getElementById('thumbnailRow');
      if (listing.images && listing.images.length > 1) {
        listing.images.forEach((img, idx) => {
          const thumb = document.createElement('div');
          thumb.className = idx === 0 ? 'thumbnail active' : 'thumbnail';
          thumb.innerHTML = `<img src="${img}" alt="Image ${idx+1}">`;
          thumb.onclick = () => {
            document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
            mainImage.innerHTML = `<img src="${img}">`;
          };
          thumbnailRow.appendChild(thumb);
        });
      }

      // Price & Details
      document.getElementById('panelPrice').textContent = `€${listing.price.toFixed(2)}`;
      document.getElementById('panelPriceType').textContent = listing.price_type.toUpperCase();
      document.getElementById('descriptionText').textContent = listing.description || 'No description provided.';

      // Statistics
      document.getElementById('viewsCount').textContent = listing.views_count;
      document.getElementById('inquiriesCount').textContent = listing.inquiries_count;
      document.getElementById('listedDate').textContent = new Date(listing.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      // Condition
      if (listing.condition) {
        document.getElementById('conditionSection').style.display = 'block';
        document.getElementById('conditionValue').textContent = listing.condition;
      }

      // Details Grid
      const detailsGrid = document.getElementById('detailsGrid');
      detailsGrid.innerHTML = '';
      const details = [
        { label: 'Type', value: listing.listing_type },
        { label: 'Category', value: listing.category },
        { label: 'Location', value: listing.location || '-' },
        ...(listing.sport_tags && listing.sport_tags.length > 0 ? [{ label: 'Sports', value: listing.sport_tags.join(', ') }] : [])
      ];

      details.forEach(detail => {
        const item = document.createElement('div');
        item.className = 'info-item';
        item.innerHTML = `<div class="info-label">${detail.label}</div><div class="info-value">${detail.value}</div>`;
        detailsGrid.appendChild(item);
      });

      // Seller Info
      const _sn = listing.seller.displayName || [listing.seller.firstName, listing.seller.lastName].filter(Boolean).join(' ') || 'Unknown';
      document.getElementById('sellerName').textContent = _sn;
      document.getElementById('sellerType').textContent = listing.seller.role || listing.seller.userType || 'user';
      document.getElementById('sellerAvatar').textContent = _sn.split(' ').map(n => n[0]).join('').toUpperCase();

      // Pre-fill buyer info
      const _bu = JSON.parse(localStorage.getItem('spopeer_user') || '{}');
      document.getElementById('buyerName').value = _bu.displayName || [_bu.firstName, _bu.lastName].filter(Boolean).join(' ') || 'You';

      const followBtn = document.getElementById('followBtn');
      if (followBtn && listing.seller?.id) {
        followBtn.setAttribute('data-seller-id', String(listing.seller.id));
        const sellerIsCurrentUser = _bu && (_bu.id === listing.seller.id || String(_bu.id) === String(listing.seller.id));
        followBtn.style.display = sellerIsCurrentUser ? 'none' : 'inline-flex';
      }

      // Price recommendation
      if (listing.price_type === 'contact') {
        document.getElementById('messageText').value = `Hi! I'm interested in your listing '${listing.title}'. What's your asking price?`;
      }
    }

    async function loadRelatedListings() {
      try {
        const response = await fetch(`/api/marketplace/listings?category=${encodeURIComponent(currentListing.category)}&limit=6`);
        if (!response.ok) return;
        const data = await response.json();

        const related = data.listings.filter(l => l.id !== currentListing.id).slice(0, 6);
        if (related.length === 0) return;

        document.getElementById('relatedSection').style.display = 'block';
        const relatedGrid = document.getElementById('relatedGrid');

        related.forEach(listing => {
          const card = document.createElement('div');
          card.className = 'related-card';
          const img = listing.images && listing.images.length > 0 ? listing.images[0] : '';
          card.innerHTML = `
            <div class="related-thumb">${img ? `<img src="${img}" alt="${listing.title}">` : '📦'}</div>
            <div class="related-info">
              <div class="related-title">${listing.title}</div>
              <div class="related-price">€${listing.price.toFixed(2)}</div>
            </div>
          `;
          card.onclick = () => window.location.href = `listing-detail.html?id=${listing.id}`;
          relatedGrid.appendChild(card);
        });
      } catch (error) {
        console.error('Error loading related listings:', error);
      }
    }

    // Event Listeners
    document.getElementById('contactBtn').onclick = () => {
      document.getElementById('contactModal').classList.add('visible');
    };

    document.getElementById('contactForm').onsubmit = async (e) => {
      e.preventDefault();
      try {
        const response = await fetch('/api/marketplace/inquiries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            listing_id: listingId,
            message: document.getElementById('messageText').value
          })
        });

        if (response.ok) {
          // Show success message with link to messages
          const modal = document.getElementById('contactModal');
          const form = document.getElementById('contactForm');
          form.innerHTML = `
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 48px; margin-bottom: 16px;">✓</div>
              <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: var(--ink);">Inquiry Sent!</h3>
              <p style="font-size: 14px; color: var(--muted); margin-bottom: 24px;">Your message has been sent to the seller. You can continue the conversation in your messages.</p>
              <div style="display: flex; gap: 12px;">
                <button type="button" class="btn-secondary" onclick="document.getElementById('contactModal').classList.remove('visible'); document.getElementById('contactForm').innerHTML = '<form id=\\\"contactForm\\\"></form>'; location.reload();" style="flex: 1;">Close</button>
                <button type="button" class="btn-primary" onclick="window.location.href='./messages.html';" style="flex: 1;">View Messages</button>
              </div>
            </div>
          `;
        } else {
          if (window.SpopeerToast) window.SpopeerToast.error('Error sending inquiry. Please try again.');
        }
      } catch (error) {
        console.error('Error sending inquiry:', error);
        if (window.SpopeerToast) window.SpopeerToast.error('Error sending inquiry');
      }
    };

    document.getElementById('saveBtn').onclick = async () => {
      try {
        const response = await fetch(`/api/marketplace/saved/${listingId}`, {
          method: 'POST',
          credentials: 'include'
        });
        const data = await response.json();
        const btn = document.getElementById('saveBtn');
        btn.classList.toggle('saved', data.saved);
        btn.innerHTML = data.saved ? '<i class="fa-solid fa-heart"></i> Saved' : '<i class="fa-regular fa-heart"></i> Save Listing';
      } catch (error) {
        console.error('Error saving listing:', error);
      }
    };

    document.getElementById('flagBtn').onclick = (e) => {
      e.preventDefault();
      const reason = prompt('Tell us why you\'re reporting this listing:');
      if (reason) {
        fetch(`/api/marketplace/listings/${listingId}/flag`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ reason })
        }).then(() => { if (window.SpopeerToast) window.SpopeerToast.success('Thank you for reporting. We\'ll review this listing.'); }).catch(() => { if (window.SpopeerToast) window.SpopeerToast.error('Error reporting listing'); });
      }
    };

    let currentSellerId = null;

    function getCurrentSellerId() {
      return currentSellerId;
    }

    async function openSellerModal(sellerId) {
      currentSellerId = sellerId;
      const modal = document.getElementById('sellerModal');
      if (!modal) {
        console.error('Seller modal not found');
        return;
      }

      try {
        // Fetch seller data from API
        const response = await fetch(`/api/marketplace/seller/${sellerId}`);
        const sellerData = await response.json();

        // Render seller info
        const _sn2 = sellerData.seller.displayName || [sellerData.seller.firstName, sellerData.seller.lastName].filter(Boolean).join(' ') || 'Unknown';
        const initials = _sn2.split(' ').map(n => n[0]).join('').toUpperCase();
        document.getElementById('sellerAvatar').textContent = initials;
        document.getElementById('sellerName').textContent = _sn2;
        document.getElementById('sellerType').textContent = sellerData.seller.role || sellerData.seller.userType || 'user';
        document.getElementById('sellerListings').textContent = sellerData.listings.length;
        document.getElementById('sellerAbout').textContent = sellerData.seller.bio || 'No bio provided';
        document.getElementById('sellerLocation').textContent = sellerData.seller.location || 'Not specified';

        const memberSince = new Date(sellerData.seller.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        document.getElementById('sellerSince').textContent = `Member since ${memberSince}`;

        // Use seller metrics from API when available.
        const avgRating = Number(sellerData.seller?.averageRating || sellerData.seller?.rating || 0);
        const totalSold = Number(sellerData.seller?.soldCount || sellerData.seller?.totalSales || sellerData.seller?.completedSales || 0);
        document.getElementById('sellerRating').textContent = avgRating > 0 ? avgRating.toFixed(1) : 'N/A';
        document.getElementById('sellerSold').textContent = totalSold > 0 ? String(totalSold) : '0';

        // Render active listings grid
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

        // Reviews endpoint is not available yet.
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

    async function toggleFollow() {
      const btn = document.getElementById('followBtn');
      if (!btn) return;
      const sellerId = btn.getAttribute('data-seller-id');
      
      if (!sellerId) {
        api.showNotification('Error: seller ID not found', 'error');
        return;
      }

      const isFollowing = btn.classList.contains('following');
      
      try {
        const method = isFollowing ? 'DELETE' : 'POST';
        const endpoint = `/api/follows/${sellerId}`;
        
        await api.request(endpoint, { method });
        
        btn.classList.toggle('following');
        const label = btn.querySelector('.btn-label');
        if (label) {
          label.textContent = isFollowing ? 'Follow' : 'Following';
        } else {
          btn.innerHTML = isFollowing
            ? '<i class="fa-solid fa-user-plus"></i> Follow'
            : '<i class="fa-solid fa-user-check"></i> Following';
        }
        
        api.showNotification(
          isFollowing ? 'Unfollowed successfully' : 'Followed successfully',
          'success'
        );
      } catch (error) {
        btn.classList.toggle('following'); // Revert on error
        api.showNotification(
          error.message || 'Failed to update follow status',
          'error'
        );
      }
    }

    // Close modal on background click
    document.addEventListener('click', (e) => {
      const modal = document.getElementById('sellerModal');
      if (modal && e.target.id === 'sellerModal') {
        closeSellerModal();
      }
    });

    window.toggleFollow = toggleFollow;

    loadListing();
