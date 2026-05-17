ProfileSyncService.init();

    let allListings = [];
    let receivedInquiries = [];
    let currentPeriod = 30;
    let currentUserProfile = null;

    function normalizeRoleLabel(role) {
      var value = String(role || 'seller').trim();
      if (!value) return 'Seller';
      return value.replace(/_/g, ' ').replace(/\b\w/g, function(ch) { return ch.toUpperCase(); });
    }

    function loadCurrentUserProfile() {
      var user = null;
      try {
        if (window.CurrentUserStore && typeof window.CurrentUserStore.getCurrentUser === 'function') {
          user = window.CurrentUserStore.getCurrentUser();
        }
      } catch (err) {
        console.debug('CurrentUserStore.getCurrentUser failed in analytics page', err);
      }
      if (!user) {
        try { user = JSON.parse(localStorage.getItem('spopeer_user') || localStorage.getItem('user') || 'null'); } catch (e) { user = null; }
      }
      return user || null;
    }

    function hydrateSellerSummary() {
      currentUserProfile = loadCurrentUserProfile();
      var user = currentUserProfile || {};
      var name = user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username || 'Seller';
      var role = normalizeRoleLabel(user.role);
      var location = user.location || user.country || user.city || 'Marketplace';
      var email = user.email || user.userEmail || 'No email available';
      var initials = String(name || 'S').split(' ').filter(Boolean).slice(0, 2).map(function(part) { return part.charAt(0); }).join('').toUpperCase() || 'S';
      var avatarUrl = user.avatarUrl || user.profilePicture || user.profileImage || '';

      var avatarEl = document.getElementById('sellerAvatar');
      var nameEl = document.getElementById('sellerName');
      var roleEl = document.getElementById('sellerRole');
      var locationEl = document.getElementById('sellerLocation');
      var emailEl = document.getElementById('sellerEmail');

      if (nameEl) nameEl.textContent = name;
      if (roleEl) roleEl.textContent = role;
      if (locationEl) locationEl.textContent = location;
      if (emailEl) emailEl.textContent = email;
      if (avatarEl) {
        avatarEl.innerHTML = avatarUrl
          ? '<img src="' + escapeAttr(avatarUrl) + '" alt="' + escapeAttr(name) + ' profile picture">'
          : escapeHtml(initials);
      }
    }

    function getDateValue(record) {
      if (!record) return null;
      return record.createdAt || record.created_at || record.updatedAt || record.updated_at || null;
    }

    function isWithinCurrentPeriod(record) {
      if (currentPeriod === 'all') return true;
      var rawDate = getDateValue(record);
      if (!rawDate) return true;
      var date = new Date(rawDate);
      if (Number.isNaN(date.getTime())) return true;
      var now = new Date();
      var cutoff = new Date(now);
      cutoff.setDate(now.getDate() - Number(currentPeriod || 30));
      return date >= cutoff;
    }

    function getVisibleListings() {
      return allListings.filter(isWithinCurrentPeriod);
    }

    function getVisibleInquiries() {
      return receivedInquiries.filter(isWithinCurrentPeriod);
    }

    function getMetricValue(record, keys) {
      for (var i = 0; i < keys.length; i += 1) {
        var value = record && record[keys[i]];
        if (value !== undefined && value !== null && value !== '') {
          var num = Number(value);
          return Number.isFinite(num) ? num : 0;
        }
      }
      return 0;
    }

    function getListingImages(listing) {
      if (!listing) return [];
      if (Array.isArray(listing.images)) return listing.images.filter(Boolean);
      if (Array.isArray(listing.imageUrls)) return listing.imageUrls.filter(Boolean);
      return [];
    }

    function getDisplayName(user) {
      if (!user) return 'Unknown User';
      return user.displayName || user.name || [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || 'Unknown User';
    }

    function getInitials(name) {
      return String(name || 'U').split(' ').filter(Boolean).slice(0, 2).map(function(part) { return part.charAt(0); }).join('').toUpperCase() || 'U';
    }

    function normalizeListings(rows) {
      return (Array.isArray(rows) ? rows : []).map(function(listing) {
        var images = getListingImages(listing);
        return Object.assign({}, listing, {
          images: images,
          imageUrls: images,
          views_count: getMetricValue(listing, ['views_count', 'viewCount']),
          saves_count: getMetricValue(listing, ['saves_count']),
          inquiries_count: getMetricValue(listing, ['inquiries_count'])
        });
      });
    }

    function normalizeInquiries(rows) {
      return (Array.isArray(rows) ? rows : []).map(function(inquiry) {
        var buyer = inquiry.buyer || inquiry.user || inquiry.sender || null;
        return Object.assign({}, inquiry, {
          buyer: buyer,
          created_at: inquiry.created_at || inquiry.createdAt || null,
          listing: inquiry.listing || null
        });
      });
    }

    async function loadAnalytics() {
      try {
        const [listings, inquiries] = await Promise.all([
          MarketplaceService.getMyListings(),
          MarketplaceService.getReceivedInquiries()
        ]);

        allListings = normalizeListings(listings || []);
        receivedInquiries = normalizeInquiries(inquiries || []);

        // Load time-series data for each listing
        await Promise.all(allListings.map(async function(listing) {
          try {
            const timeSeriesData = await MarketplaceService.getTimeSeriesAnalytics(listing.id, currentPeriod);
            listing.analyticsEvents = [];
            if (timeSeriesData && timeSeriesData.timeSeries) {
              timeSeriesData.timeSeries.forEach(function(day) {
                if (day.view > 0) {
                  listing.analyticsEvents.push({ date: day.date, eventType: 'view' });
                }
                for (let i = 0; i < day.inquiry; i++) {
                  listing.analyticsEvents.push({ date: day.date, eventType: 'inquiry' });
                }
              });
            }
          } catch (err) {
            console.debug('Failed to load time-series for listing ' + listing.id, err);
            listing.analyticsEvents = [];
          }
        }));

        if (allListings.length === 0) {
          document.getElementById('emptyState').style.display = 'block';
          document.querySelector('.stats-row').style.display = 'none';
          document.querySelector('.analytics-grid').style.display = 'none';
          return;
        }

        document.getElementById('emptyState').style.display = 'none';
        document.querySelector('.stats-row').style.display = '';
        document.querySelector('.analytics-grid').style.display = '';

        renderStats();
        renderViewsChart();
        renderStatusDonut();
        renderTopListings();
        renderRecentInquiries();
      } catch (error) {
        console.error('Error loading analytics:', error);
        document.getElementById('emptyState').style.display = 'block';
      }
    }

    function renderStats() {
      var visibleListings = getVisibleListings();
      var visibleInquiries = getVisibleInquiries();
      var active = visibleListings.filter(function(l) { return l.status === 'active'; }).length;
      var totalViews = visibleListings.reduce(function(s, l) { return s + getMetricValue(l, ['views_count', 'viewCount']); }, 0);
      var totalInquiries = visibleInquiries.length;
      var totalSaved = visibleListings.reduce(function(s, l) { return s + getMetricValue(l, ['saves_count']); }, 0);
      var avgViews = visibleListings.length ? (totalViews / visibleListings.length) : 0;
      var inquiryRate = totalViews ? ((totalInquiries / totalViews) * 100) : 0;
      var now = new Date();
      var weekCutoff = new Date(now);
      weekCutoff.setDate(now.getDate() - 7);
      var weekInquiries = visibleInquiries.filter(function(inquiry) {
        var dt = new Date(getDateValue(inquiry) || 0);
        return !Number.isNaN(dt.getTime()) && dt >= weekCutoff;
      }).length;

      document.getElementById('statActive').textContent = active;
      document.getElementById('statViews').textContent = totalViews.toLocaleString();
      document.getElementById('statInquiries').textContent = totalInquiries;
      document.getElementById('statSaved').textContent = totalSaved.toLocaleString();
      document.getElementById('insightAvgViews').textContent = avgViews.toFixed(avgViews >= 10 ? 0 : 1);
      document.getElementById('insightInquiryRate').textContent = inquiryRate.toFixed(inquiryRate >= 10 ? 0 : 1) + '%';
      document.getElementById('insightWeekInquiries').textContent = weekInquiries + ' inquiries';
    }

    function renderViewsChart() {
      var chart = document.getElementById('viewsChart');
      chart.innerHTML = '';

      var visibleListings = getVisibleListings();
      if (visibleListings.length === 0) {
        chart.innerHTML = '<p style="margin:auto;color:var(--muted);font-size:13px;">No data yet</p>';
        return;
      }

      // Aggregate time-series data across all visible listings
      var timeSeriesData = {};
      var maxViewsPerDay = 0;
      var maxInquiriesPerDay = 0;

      visibleListings.forEach(function(listing) {
        if (!listing.analyticsEvents) return;
        listing.analyticsEvents.forEach(function(event) {
          if (!timeSeriesData[event.date]) {
            timeSeriesData[event.date] = { views: 0, inquiries: 0 };
          }
          if (event.eventType === 'view') {
            timeSeriesData[event.date].views++;
          } else if (event.eventType === 'inquiry') {
            timeSeriesData[event.date].inquiries++;
          }
          maxViewsPerDay = Math.max(maxViewsPerDay, timeSeriesData[event.date].views);
          maxInquiriesPerDay = Math.max(maxInquiriesPerDay, timeSeriesData[event.date].inquiries);
        });
      });

      var dates = Object.keys(timeSeriesData).sort();
      if (dates.length === 0) {
        // Fallback: show top listings by views
        var sorted = visibleListings.slice().sort(function(a, b) { return getMetricValue(b, ['views_count', 'viewCount']) - getMetricValue(a, ['views_count', 'viewCount']); });
        var top = sorted.slice(0, 8);
        var maxViews = Math.max.apply(null, top.map(function(l) { return getMetricValue(l, ['views_count', 'viewCount']); })) || 1;
        top.forEach(function(listing) {
          var views = getMetricValue(listing, ['views_count', 'viewCount']);
          var pct = (views / maxViews) * 100;
          var col = document.createElement('div');
          col.className = 'bar-col';
          col.innerHTML =
            '<div class="bar-value">' + views + '</div>' +
            '<div class="bar" style="height:' + Math.max(pct, 2) + '%"></div>' +
            '<div class="bar-label">' + truncate(listing.title, 8) + '</div>';
          chart.appendChild(col);
        });
        return;
      }

      // Show last 14 dates or fewer
      var displayDates = dates.slice(-14);
      var maxValue = Math.max(maxViewsPerDay, maxInquiriesPerDay) || 1;

      displayDates.forEach(function(date) {
        var data = timeSeriesData[date];
        var viewsPct = (data.views / maxValue) * 100;
        var inquiriesPct = (data.inquiries / maxValue) * 100;

        var col = document.createElement('div');
        col.className = 'bar-col-timeseries';
        col.innerHTML =
          '<div class="bar-value-ts">' +
          '<span class="view-count" title="Views">' + data.views + '</span>' +
          '<span class="inquiry-count" title="Inquiries">' + data.inquiries + '</span>' +
          '</div>' +
          '<div class="bar-container-ts">' +
          '<div class="bar-views" style="height:' + Math.max(viewsPct, 1) + '%"></div>' +
          '<div class="bar-inquiries" style="height:' + Math.max(inquiriesPct, 1) + '%"></div>' +
          '</div>' +
          '<div class="bar-label-ts">' + date.substring(5) + '</div>';
        chart.appendChild(col);
      });

      // Add legend
      var legend = document.createElement('div');
      legend.className = 'timeseries-legend';
      legend.innerHTML =
        '<div><span class="legend-color views"></span> Views</div>' +
        '<div><span class="legend-color inquiries"></span> Inquiries</div>';
      chart.appendChild(legend);
    }

    function renderStatusDonut() {
      var visibleListings = getVisibleListings();
      var active = visibleListings.filter(function(l) { return l.status === 'active'; }).length;
      var paused = visibleListings.filter(function(l) { return l.status === 'paused'; }).length;
      var sold = visibleListings.filter(function(l) { return l.status === 'sold'; }).length;
      var total = visibleListings.length;

      var donut = document.getElementById('statusDonut');
      var legend = document.getElementById('statusLegend');

      // Build conic gradient
      var segments = [];
      var colors = { active: '#16a34a', paused: '#eab308', sold: '#8b5cf6' };
      var pctActive = total ? (active / total * 100) : 0;
      var pctPaused = total ? (paused / total * 100) : 0;
      var pctSold = total ? (sold / total * 100) : 0;

      var gradient = 'conic-gradient(' +
        colors.active + ' 0% ' + pctActive + '%, ' +
        colors.paused + ' ' + pctActive + '% ' + (pctActive + pctPaused) + '%, ' +
        colors.sold + ' ' + (pctActive + pctPaused) + '% 100%)';

      donut.style.background = gradient;
      donut.innerHTML = '<div class="donut-center"><span class="num">' + total + '</span><span class="lbl">Total</span></div>';

      legend.innerHTML =
        '<div class="legend-item"><span class="legend-dot" style="background:' + colors.active + '"></span> Active <span class="legend-val">' + active + '</span></div>' +
        '<div class="legend-item"><span class="legend-dot" style="background:' + colors.paused + '"></span> Paused <span class="legend-val">' + paused + '</span></div>' +
        '<div class="legend-item"><span class="legend-dot" style="background:' + colors.sold + '"></span> Sold <span class="legend-val">' + sold + '</span></div>';
    }

    function renderTopListings() {
      var tbody = document.getElementById('topListingsBody');
      tbody.innerHTML = '';

      var visibleListings = getVisibleListings();
      var sorted = visibleListings.slice().sort(function(a, b) { return getMetricValue(b, ['views_count', 'viewCount']) - getMetricValue(a, ['views_count', 'viewCount']); });
      var top = sorted.slice(0, 5);

      if (top.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:24px;">No listings</td></tr>';
        return;
      }

      top.forEach(function(listing) {
        var images = getListingImages(listing);
        var image = images.length > 0 ? images[0] : '';
        var imgHtml = image
          ? '<img src="' + escapeAttr(image) + '" alt="' + escapeAttr(listing.title) + '">'
          : '<i class="fa-solid fa-image" style="color:var(--muted)"></i>';

        var row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.onclick = function() { window.location.href = 'listing-detail.html?id=' + listing.id; };
        row.innerHTML =
          '<td><div class="listing-cell"><div class="listing-thumb">' + imgHtml + '</div>' +
          '<span class="listing-name">' + escapeHtml(listing.title) + '</span></div></td>' +
          '<td>' + getMetricValue(listing, ['views_count', 'viewCount']) + '</td>' +
          '<td>' + getMetricValue(listing, ['inquiries_count']) + '</td>';
        tbody.appendChild(row);
      });
    }

    function renderRecentInquiries() {
      var container = document.getElementById('recentInquiries');
      container.innerHTML = '';

      var visibleInquiries = getVisibleInquiries();

      if (visibleInquiries.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--muted);font-size:13px;padding:24px;">No inquiries received yet</p>';
        return;
      }

      var recent = visibleInquiries.slice().sort(function(a, b) {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }).slice(0, 8);
      recent.forEach(function(inq) {
        var name = getDisplayName(inq.buyer);
        var initials = getInitials(name);
        var createdAt = inq.created_at || inq.createdAt || null;
        var date = createdAt ? new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown date';
        var status = inq.status || 'pending';
        var badgeClass = status === 'replied' ? 'badge-replied' : 'badge-pending';
        var avatarUrl = inq.buyer && (inq.buyer.avatarUrl || inq.buyer.avatar);
        var avatarHtml = avatarUrl
          ? '<img src="' + escapeAttr(avatarUrl) + '" alt="' + escapeAttr(name) + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">'
          : escapeHtml(initials);
        var messageText = inq.message || ((inq.listing && inq.listing.title) ? ('Inquiry about ' + inq.listing.title) : 'No message');

        var item = document.createElement('div');
        item.className = 'inquiry-item';
        item.innerHTML =
          '<div class="inquiry-avatar">' + avatarHtml + '</div>' +
          '<div class="inquiry-info">' +
            '<div class="inquiry-name">' + escapeHtml(name) + '</div>' +
            '<div class="inquiry-text">' + escapeHtml(messageText) + '</div>' +
          '</div>' +
          '<span class="badge ' + badgeClass + '">' + escapeHtml(status) + '</span>' +
          '<span class="inquiry-date">' + date + '</span>';
        container.appendChild(item);
      });
    }

    async function setPeriod(p) {
      currentPeriod = p;
      document.querySelectorAll('.period-btn').forEach(function(btn) { btn.classList.remove('active'); });
      document.querySelector('[data-period="' + p + '"]').classList.add('active');
      
      // Reload time-series data with new period
      try {
        await Promise.all(allListings.map(async function(listing) {
          try {
            const timeSeriesData = await MarketplaceService.getTimeSeriesAnalytics(listing.id, p);
            listing.analyticsEvents = [];
            if (timeSeriesData && timeSeriesData.timeSeries) {
              timeSeriesData.timeSeries.forEach(function(day) {
                if (day.view > 0) {
                  for (let i = 0; i < day.view; i++) {
                    listing.analyticsEvents.push({ date: day.date, eventType: 'view' });
                  }
                }
                if (day.inquiry > 0) {
                  for (let i = 0; i < day.inquiry; i++) {
                    listing.analyticsEvents.push({ date: day.date, eventType: 'inquiry' });
                  }
                }
              });
            }
          } catch (err) {
            console.debug('Failed to load time-series for listing ' + listing.id, err);
            listing.analyticsEvents = [];
          }
        }));
      } catch (err) {
        console.error('Error reloading period data:', err);
      }
      
      // Re-render with period filter
      renderStats();
      renderViewsChart();
      renderStatusDonut();
      renderTopListings();
      renderRecentInquiries();
    }

    function truncate(str, len) {
      if (!str) return '';
      return str.length > len ? str.substring(0, len) + '…' : str;
    }

    function escapeHtml(text) {
      var div = document.createElement('div');
      div.textContent = text || '';
      return div.innerHTML;
    }

    function escapeAttr(text) {
      return (text || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Initial load
    hydrateSellerSummary();
    loadAnalytics();

    window.addEventListener('currentUserChanged', function() {
      hydrateSellerSummary();
    });
