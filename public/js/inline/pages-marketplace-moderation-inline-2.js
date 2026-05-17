ProfileSyncService.init();

    let allFlags = [];
    let currentFilter = 'all';
    let selectedFlagId = null;

    // Build moderation list from listings with real report metadata.
    async function generateFlaggedListings() {
      try {
        const response = await fetch('/api/marketplace/listings?limit=100');
        const data = await response.json();
        const listings = data.listings || [];

        const flags = listings
          .filter((listing) => Number(listing.flagCount || listing.reportCount || 0) > 0 || !!listing.moderationStatus)
          .slice(0, 50)
          .map((listing) => ({
          id: listing.id,
          listingId: listing.id,
          title: listing.title,
          image: listing.images?.[0] || '',
          seller: listing.seller,
          price: listing.price,
          currency: listing.currency,
          reason: listing.flagReason || listing.reportReason || 'User report',
          reportedBy: listing.reportedBy || 'Marketplace user',
          reportedAt: listing.flaggedAt || listing.updatedAt || listing.createdAt || new Date().toISOString(),
          status: (listing.moderationStatus || (Number(listing.flagCount || listing.reportCount || 0) > 0 ? 'pending' : 'reviewed')).toLowerCase(),
          flagCount: Number(listing.flagCount || listing.reportCount || 0) || 1,
          category: 'suspected-violation'
        }));

        return flags;
      } catch (error) {
        console.error('Error loading flagged listings:', error);
        return [];
      }
    }

    async function loadFlaggedListings() {
      try {
        allFlags = await generateFlaggedListings();
        updateStats();
        renderTable();
      } catch (error) {
        console.error('Error loading flagged listings:', error);
      }
    }

    function updateStats() {
      document.getElementById('totalFlagged').textContent = allFlags.length;
      document.getElementById('pendingReview').textContent = allFlags.filter(f => f.status === 'pending').length;
      document.getElementById('suspendedSellers').textContent = allFlags.filter(f => f.status === 'removed').length;
    }

    function renderTable() {
      const tbody = document.getElementById('flaggedListingsTable');
      const filtered = currentFilter === 'all' 
        ? allFlags 
        : allFlags.filter(f => {
            if (currentFilter === 'pending') return f.status === 'pending';
            if (currentFilter === 'reviewed') return f.status !== 'pending';
            if (currentFilter === 'suspicious-seller') return Number(f.flagCount || 0) >= 3;
            return true;
          });

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5">
              <div class="empty-state" style="padding: 40px 20px;">
                <div class="empty-state-icon"><i class="fa-solid fa-check-circle"></i></div>
                <div class="empty-state-title">No flagged listings</div>
                <div class="empty-state-text">All marketplace content is in good standing</div>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = filtered.map(flag => `
        <tr>
          <td>
            <div class="item-preview">
              <div class="item-image">
                ${flag.image ? `<img src="${flag.image}" alt="${flag.title}">` : '<i class="fa-solid fa-image"></i>'}
              </div>
              <div class="item-info">
                <div class="item-title">${flag.title}</div>
                <div class="item-meta">€${flag.price} • ${flag.flagCount} reports</div>
              </div>
            </div>
          </td>
          <td>${flag.seller.displayName || [flag.seller.firstName, flag.seller.lastName].filter(Boolean).join(' ') || 'Unknown'}</td>
          <td><span class="flag-reason">${flag.reason}</span></td>
          <td><span class="status-badge status-${flag.status === 'pending' ? 'pending' : flag.status === 'reviewed' ? 'reviewed' : 'flagged'}">${flag.status}</span></td>
          <td>
            <div class="action-buttons">
              <button class="btn-action btn-approve" onclick="openModal(${flag.id})">Review</button>
              <button class="btn-action btn-reject" onclick="removeListing(${flag.id})">Remove</button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    function filterListings(filter, btn) {
      currentFilter = filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTable();
    }

    function openModal(flagId) {
      selectedFlagId = flagId;
      const flag = allFlags.find(f => f.id === flagId);
      if (!flag) return;

      const reportedDate = new Date(flag.reportedAt).toLocaleDateString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric' 
      });

      document.getElementById('modalBody').innerHTML = `
        <div class="detail-section">
          <h3>Listing Information</h3>
          <div class="detail-row">
            <div class="detail-label">Title</div>
            <div class="detail-value">${flag.title}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Price</div>
            <div class="detail-value">€${flag.price} ${flag.currency}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Seller</div>
            <div class="detail-value">${flag.seller.displayName || [flag.seller.firstName, flag.seller.lastName].filter(Boolean).join(' ') || 'Unknown'} (${flag.seller.role || flag.seller.userType || 'user'})</div>
          </div>
        </div>

        <div class="detail-section">
          <h3>Flag Details</h3>
          <div class="detail-row">
            <div class="detail-label">Reason</div>
            <div class="detail-value">${flag.reason}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Report Count</div>
            <div class="detail-value">${flag.flagCount} reports</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Reported Date</div>
            <div class="detail-value">${reportedDate}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Reported By</div>
            <div class="detail-value">${flag.reportedBy}</div>
          </div>
        </div>

        <div class="detail-section">
          <h3>Status</h3>
          <div class="detail-row">
            <div class="detail-label">Current Status</div>
            <div class="detail-value"><span class="status-badge status-${flag.status}">${flag.status}</span></div>
          </div>
        </div>
      `;

      document.getElementById('detailModal').classList.add('show');
    }

    function closeModal() {
      document.getElementById('detailModal').classList.remove('show');
      selectedFlagId = null;
    }

    function approveAndClose() {
      if (!selectedFlagId) return;
      const flag = allFlags.find(f => f.id === selectedFlagId);
      if (flag) {
        flag.status = 'approved';
        renderTable();
        closeModal();
        if (window.SpopeerToast) window.SpopeerToast.success('Listing approved. Flag resolved.');
      }
    }

    function rejectAndClose() {
      if (!selectedFlagId) return;
      const flag = allFlags.find(f => f.id === selectedFlagId);
      if (flag) {
        flag.status = 'removed';
        renderTable();
        closeModal();
        if (window.SpopeerToast) window.SpopeerToast.success('Listing removed from marketplace. Seller notified.');
      }
    }

    function removeListing(flagId) {
      if (confirm('Are you sure you want to remove this listing?')) {
        const flag = allFlags.find(f => f.id === flagId);
        if (flag) {
          flag.status = 'removed';
          renderTable();
          if (window.SpopeerToast) window.SpopeerToast.success('Listing removed from marketplace.');
        }
      }
    }

    loadFlaggedListings();
