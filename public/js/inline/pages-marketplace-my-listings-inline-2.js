ProfileSyncService.init();

    let allMyListings = [];
    let currentFilter = 'all';
    let deleteTargetId = null;

    async function loadMyListings() {
      try {
        const listings = await MarketplaceService.getMyListings();
        allMyListings = listings;
        
        renderListings();
        loadStats();
        loadSavedListings();
      } catch (error) {
        console.error('Error loading listings:', error);
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('listingsContainer').style.display = 'none';
      }
    }

    function renderListings() {
      const tbody = document.getElementById('listingsTableBody');
      tbody.innerHTML = '';

      const filtered = allMyListings.filter(listing => {
        if (currentFilter === 'all') return true;
        return listing.status === currentFilter;
      });

      if (filtered.length === 0) {
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('listingsContainer').style.display = 'none';
        return;
      }

      document.getElementById('emptyState').style.display = 'none';
      document.getElementById('listingsContainer').style.display = 'block';

      filtered.forEach(listing => {
        const row = document.createElement('tr');
        const image = listing.images && listing.images.length > 0 ? listing.images[0] : '';
        const imgHtml = image ? `<img src="${image}" alt="${listing.title}">` : `<i class="fa-solid fa-image"></i>`;
        const date = new Date(listing.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        let statusBadge = '';
        if (listing.status === 'active') {
          statusBadge = '<span class="badge badge-active">Active</span>';
        } else if (listing.status === 'paused') {
          statusBadge = '<span class="badge badge-paused">Paused</span>';
        } else if (listing.status === 'sold') {
          statusBadge = '<span class="badge badge-sold">Sold</span>';
        }

        row.innerHTML = `
          <td>
            <div class="listing-cell-info">
              <div class="listing-cell-image">${imgHtml}</div>
              <div>
                <div class="listing-title">${listing.title}</div>
                <div class="listing-category">€${listing.price.toFixed(2)} • ${listing.category}</div>
              </div>
            </div>
          </td>
          <td>${statusBadge}</td>
          <td><span class="stat-number">${listing.views_count || 0}</span></td>
          <td><span class="stat-number">${listing.inquiries_count || 0}</span></td>
          <td>${date}</td>
          <td>
            <div class="actions-cell">
              <button class="action-btn" onclick="editListing(${listing.id})" title="Edit">
                <i class="fa-solid fa-pencil"></i>
              </button>
              <button class="action-btn" onclick="toggleListingStatus(${listing.id}, '${listing.status}')" title="${listing.status === 'active' ? 'Pause' : 'Activate'}">
                <i class="fa-solid fa-${listing.status === 'active' ? 'pause' : 'play'}"></i>
              </button>
              <button class="action-btn danger" onclick="showDeleteModal(${listing.id})" title="Delete">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        `;

        tbody.appendChild(row);
      });
    }

    async function loadStats() {
      const totalListings = allMyListings.length;
      const totalViews = allMyListings.reduce((sum, l) => sum + (l.views_count || 0), 0);
      const totalInquiries = allMyListings.reduce((sum, l) => sum + (l.inquiries_count || 0), 0);

      document.getElementById('totalListings').textContent = totalListings;
      document.getElementById('totalViews').textContent = totalViews;
      document.getElementById('totalInquiries').textContent = totalInquiries;

      try {
        const saved = await MarketplaceService.getSavedListings();
        document.getElementById('totalSaved').textContent = saved.length;
      } catch (error) {
        console.error('Error loading saved count:', error);
      }
    }

    async function loadSavedListings() {
      try {
        const saved = await MarketplaceService.getSavedListings();
        const grid = document.getElementById('savedGrid');
        grid.innerHTML = '';

        if (saved.length === 0) {
          grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--muted); font-size: 13px;">You haven\'t saved any listings yet</p>';
          return;
        }

        saved.forEach(listing => {
          const image = listing.images && listing.images.length > 0 ? listing.images[0] : '';
          const imgHtml = image ? `<img src="${image}" alt="${listing.title}">` : `<i class="fa-solid fa-image"></i>`;
          
          const card = document.createElement('div');
          card.className = 'saved-card';
          card.onclick = () => window.location.href = `listing-detail.html?id=${listing.id}`;
          
          card.innerHTML = `
            <div class="saved-image">${imgHtml}</div>
            <div class="saved-info">
              <div class="saved-title">${listing.title}</div>
              <div class="saved-price">€${listing.price.toFixed(2)}</div>
            </div>
          `;
          
          grid.appendChild(card);
        });
      } catch (error) {
        console.error('Error loading saved listings:', error);
      }
    }

    function filterByStatus(status) {
      currentFilter = status;
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelector(`[data-status="${status}"]`).classList.add('active');
      renderListings();
    }

    function editListing(id) {
      window.location.href = `create-listing.html?edit=${id}`;
    }

    async function toggleListingStatus(id, currentStatus) {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      try {
        await MarketplaceService.updateStatus(id, newStatus);
        loadMyListings();
      } catch (error) {
        console.error('Error updating status:', error);
        if (window.SpopeerToast) window.SpopeerToast.error('Error updating listing status');
      }
    }

    function showDeleteModal(id) {
      deleteTargetId = id;
      document.getElementById('deleteModal').classList.add('show');
    }

    function closeDeleteModal() {
      document.getElementById('deleteModal').classList.remove('show');
      deleteTargetId = null;
    }

    async function confirmDelete() {
      if (!deleteTargetId) return;

      try {
        await MarketplaceService.deleteListing(deleteTargetId);
        closeDeleteModal();
        loadMyListings();
      } catch (error) {
        console.error('Error deleting listing:', error);
        if (window.SpopeerToast) window.SpopeerToast.error('Error deleting listing');
      }
    }

    // Close modal on background click
    document.getElementById('deleteModal').addEventListener('click', (e) => {
      if (e.target.id === 'deleteModal') {
        closeDeleteModal();
      }
    });

    // Initial load
    loadMyListings();
