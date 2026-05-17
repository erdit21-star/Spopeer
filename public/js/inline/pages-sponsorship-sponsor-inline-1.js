(function () {
      'use strict';

      /* ── API helpers ── */
      var API_BASE = '/api/sponsorships';

      function apiHeaders() {
        return {
          'Content-Type': 'application/json'
        };
      }

      async function apiGet(path) {
        var res = await fetch(API_BASE + (path || ''), { headers: apiHeaders(), credentials: 'include' });
        if (!res.ok) throw new Error('API error ' + res.status);
        return res.json();
      }

      async function apiPost(path, body) {
        var res = await fetch(API_BASE + (path || ''), {
          method: 'POST',
          headers: apiHeaders(),
          credentials: 'include',
          body: JSON.stringify(body)
        });
        if (!res.ok) {
          var err = await res.json().catch(function () { return {}; });
          throw new Error(err.error || 'API error ' + res.status);
        }
        return res.json();
      }

      async function apiDelete(path) {
        var res = await fetch(API_BASE + (path || ''), {
          method: 'DELETE',
          headers: apiHeaders()
        });
        if (!res.ok) throw new Error('API error ' + res.status);
        return res.json();
      }

      /* ── State ── */
      var user = getUser();
      var activeView = 'offers';
      var activeMode = 'request';

      function getUser() {
        if (window.CurrentUserStore && typeof window.CurrentUserStore.getCurrentUser === 'function') {
          return window.CurrentUserStore.getCurrentUser() || {};
        }
        try {
          return JSON.parse(localStorage.getItem('spopeer_user') || '{}') || {};
        } catch (e) {
          return {};
        }
      }

      function normalizeRole(value) {
        var raw = String(value || user.role || user.userType || user.accountType || 'athlete').toLowerCase();
        if (raw.indexOf('support') !== -1 || raw.indexOf('professional') !== -1 || raw.indexOf('brand') !== -1 || raw.indexOf('company') !== -1) return 'supportive_professional';
        if (raw.indexOf('club') !== -1) return 'club';
        if (raw.indexOf('coach') !== -1) return 'coach';
        return 'athlete';
      }

      function roleLabel(role) {
        return {
          athlete: 'Athlete',
          coach: 'Coach',
          club: 'Club',
          supportive_professional: 'Supportive professional'
        }[normalizeRole(role)] || 'Athlete';
      }

      function userName() {
        var full = user.displayName || user.name || [user.firstName, user.lastName].filter(Boolean).join(' ');
        return full || (user.email ? user.email.split('@')[0] : 'Spopeer user');
      }

      function initials() {
        var full = userName().trim().split(/\s+/).filter(Boolean);
        return ((full[0] || 'S')[0] + (full[1] || 'P')[0]).toUpperCase();
      }

      function escapeHtml(value) {
        return String(value || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      /* ── Role-specific copy ── */
      function roleSpecificCopy() {
        var role = normalizeRole();
        var title = document.getElementById('heroTitle');
        var copy = document.getElementById('heroCopy');
        var intro = document.getElementById('composerIntro');
        var requestTab = document.querySelector('.composer-tab[data-mode="request"]');
        var offerTab = document.querySelector('.composer-tab[data-mode="offer"]');

        var content = {
          athlete: {
            title: 'Discover sponsor support for your next game, tournament or season.',
            copy: 'Athletes can search sponsor offers by sport, pitch sponsorship needs for travel, kits or tournament entry, and move real sponsor conversations into a secure private thread.',
            intro: 'Publish the support you need for tournaments, travel, equipment, kits, nutrition or season goals.',
            requestLabel: 'I need a sponsor',
            offerLabel: 'I offer sponsorship'
          },
          coach: {
            title: 'Find sponsorship support for your coaching work, camps and team development.',
            copy: 'Coaches can search sponsor offers, announce sponsorship needs for sessions, games, camps and programs, and move accepted sponsor matches into a secure conversation.',
            intro: 'Post sponsor needs for sessions, travel, camps, staffing, video analysis or growth initiatives.',
            requestLabel: 'I need a sponsor',
            offerLabel: 'I offer sponsorship'
          },
          club: {
            title: 'Build sponsor partnerships for your teams, tournaments and club operations.',
            copy: 'Clubs can search sponsorship opportunities, publish sponsor needs for matches, tournaments, facilities and player support, and keep each sponsor relationship inside a dedicated chat.',
            intro: 'Describe the club activity, tournament or season package you want sponsors to support.',
            requestLabel: 'We need a sponsor',
            offerLabel: 'We offer sponsorship'
          },
          supportive_professional: {
            title: 'Publish sponsor offers and discover who is actively looking for sponsorship.',
            copy: 'Brands, agencies, apparel companies and other supportive professionals can publish sponsor offers, filter live sponsorship requests, and move accepted opportunities into a secure sponsor chat.',
            intro: 'Describe the sponsor package you offer and who it is best for.',
            requestLabel: 'We need a sponsor',
            offerLabel: 'We offer sponsorship'
          }
        }[role];

        if (title) title.textContent = content.title;
        if (copy) copy.textContent = content.copy;
        if (intro) intro.textContent = content.intro;
        if (requestTab) requestTab.textContent = content.requestLabel;
        if (offerTab) offerTab.textContent = content.offerLabel;
        document.getElementById('postAudience').value = role === 'supportive_professional' ? 'all' : role;
      }

      /* ── Create post (API-backed) ── */
      async function createPost(event) {
        event.preventDefault();
        var form = document.getElementById('sponsorForm');
        var payload = {
          mode: activeMode,
          title: form.title.value.trim(),
          sport: form.sport.value.trim(),
          sponsorType: form.sponsorType.value,
          targetAudience: form.targetAudience.value,
          location: form.location.value.trim(),
          timeline: form.timeline.value.trim(),
          summary: form.summary.value.trim()
        };

        if (!payload.title || !payload.sport) {
          showStatus('Add at least a title and sport before publishing.');
          return;
        }

        try {
          await apiPost('', payload);
          form.reset();
          document.getElementById('postAudience').value = normalizeRole() === 'supportive_professional' ? 'all' : normalizeRole();
          showStatus((activeMode === 'offer' ? 'Sponsor offer' : 'Sponsor request') + ' published successfully.');
          activeView = activeMode === 'offer' ? 'offers' : 'requests';
          syncTabs();
          renderBoard();
        } catch (err) {
          showStatus('Error: ' + err.message);
        }
      }

      function showStatus(message) {
        var node = document.getElementById('runtimeStatus');
        if (!node) return;
        node.textContent = message;
        node.hidden = false;
        node.style.display = 'block';
        clearTimeout(showStatus.timer);
        showStatus.timer = setTimeout(function () {
          node.hidden = true;
          node.style.display = 'none';
        }, 4000);
      }

      function syncTabs() {
        document.querySelectorAll('.board-tab').forEach(function (button) {
          button.classList.toggle('active', button.dataset.view === activeView);
        });
        document.querySelectorAll('.composer-tab').forEach(function (button) {
          button.classList.toggle('active', button.dataset.mode === activeMode);
        });
      }

      function formatDate(value) {
        if (!value) return 'No date';
        try {
          return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) {
          return value;
        }
      }

      /* ── Secure thread ── */
      async function createSecureThread(sourceItem) {
        try {
          var body = {
            mode: 'secure',
            title: sourceItem ? sourceItem.title : 'New sponsor conversation',
            sport: sourceItem ? sourceItem.sport : '',
            sponsorType: sourceItem ? sourceItem.sponsorType : '',
            summary: 'Secure sponsor chat for: ' + (sourceItem ? sourceItem.title : 'General sponsorship discussion'),
            targetAudience: 'all'
          };
          await apiPost('', body);
          activeView = 'secure';
          syncTabs();
          renderBoard();
          showStatus('Secure sponsor chat draft created.');
        } catch (err) {
          showStatus('Error creating thread: ' + err.message);
        }
      }

      /* ── Board rendering (API-backed) ── */
      function buildQueryString() {
        var params = new URLSearchParams();
        var term = document.getElementById('filterTerm').value.trim();
        var role = document.getElementById('filterRole').value;
        var sport = document.getElementById('filterSport').value.trim();
        var sponsorType = document.getElementById('filterType').value;

        params.set('mode', activeView === 'offers' ? 'offer' : activeView === 'requests' ? 'request' : 'secure');
        if (term) params.set('search', term);
        if (role !== 'all') params.set('targetAudience', role);
        if (sport) params.set('sport', sport);
        if (sponsorType !== 'all') params.set('sponsorType', sponsorType);
        return '?' + params.toString();
      }

      async function renderBoard() {
        var resultPill = document.getElementById('resultPill');
        if (resultPill) {
          resultPill.innerHTML = activeView === 'offers'
            ? '<i class="fa-solid fa-hand-holding-heart"></i><span>Sponsor offers</span>'
            : activeView === 'requests'
              ? '<i class="fa-solid fa-bullhorn"></i><span>Sponsor requests</span>'
              : '<i class="fa-solid fa-lock"></i><span>Secure chats</span>';
        }

        try {
          var data = await apiGet(buildQueryString());
          var items = data.sponsorships || data || [];
          renderCards(items, activeView);
        } catch (err) {
          renderEmpty(activeView);
        }
      }

      function renderEmpty(view) {
        var list = document.getElementById('boardList');
        var emptyCopy = {
          offers: {
            title: 'No sponsor offers published yet',
            copy: 'Supportive professionals, brands and clubs can start posting sponsorship packages here. You can publish the first offer from the composer on the right.'
          },
          requests: {
            title: 'No sponsorship requests published yet',
            copy: 'Athletes, coaches and clubs can publish what they need for games, camps, tournaments and growth plans. Use the composer to post the first request.'
          },
          secure: {
            title: 'No secure sponsor chats yet',
            copy: 'As soon as an offer is accepted or an invitation gets a serious response, create a dedicated sponsor thread so negotiations stay private and separate from everyday messaging.'
          }
        }[view];

        list.innerHTML = '<div class="empty-state"><h3>' + escapeHtml(emptyCopy.title) + '</h3><p>' + escapeHtml(emptyCopy.copy) + '</p></div>';
      }

      function renderCards(items, view) {
        var list = document.getElementById('boardList');
        if (!items.length) {
          renderEmpty(view);
          return;
        }

        list.innerHTML = items.map(function (item) {
          var ownerName = item.ownerName || (item.author ? (item.author.displayName || item.author.firstName || 'User') : 'User');
          var ownerRole = item.ownerRole || (item.author ? (item.author.role || item.author.userType) : 'athlete');

          if (view === 'secure') {
            return '<article class="board-card">'
              + '<div class="board-top"><div class="board-title-wrap">'
              + '<h3 class="board-title">' + escapeHtml(item.title) + '</h3>'
              + '<p class="board-meta">' + escapeHtml(ownerName) + ' &middot; ' + escapeHtml(roleLabel(ownerRole)) + ' &middot; Created ' + escapeHtml(formatDate(item.createdAt)) + '</p>'
              + '</div><span class="status-pill green"><i class="fa-solid fa-lock"></i><span>' + escapeHtml(item.status || 'active') + '</span></span></div>'
              + '<div class="board-tags">'
              + (item.sport ? '<span class="tag"><i class="fa-solid fa-medal"></i><span>' + escapeHtml(item.sport) + '</span></span>' : '')
              + (item.sponsorType ? '<span class="tag"><i class="fa-solid fa-tag"></i><span>' + escapeHtml(item.sponsorType) + '</span></span>' : '')
              + '</div>'
              + '<p class="board-copy">Use this dedicated sponsor conversation for agreement terms, files, sponsor deliverables, event updates and post-campaign review.</p>'
              + '<div class="board-actions"><button class="btn btn-strong" type="button" data-open-inbox="1"><i class="fa-regular fa-comments"></i><span>Open secure chat</span></button></div>'
              + '</article>';
          }

          var topPill = view === 'offers'
            ? '<span class="status-pill blue"><i class="fa-solid fa-hand-holding-heart"></i><span>Offer</span></span>'
            : '<span class="status-pill amber"><i class="fa-solid fa-bullhorn"></i><span>Request</span></span>';

          var ctaText = view === 'offers' ? 'Accept offer in secure chat' : 'Invite to secure chat';

          return '<article class="board-card">'
            + '<div class="board-top"><div class="board-title-wrap">'
            + '<h3 class="board-title">' + escapeHtml(item.title) + '</h3>'
            + '<p class="board-meta">' + escapeHtml(ownerName) + ' &middot; ' + escapeHtml(roleLabel(ownerRole)) + ' &middot; Published ' + escapeHtml(formatDate(item.createdAt)) + '</p>'
            + '</div>' + topPill + '</div>'
            + '<p class="board-copy">' + escapeHtml(item.summary || 'No additional details were added yet.') + '</p>'
            + '<div class="board-tags">'
            + '<span class="tag"><i class="fa-solid fa-medal"></i><span>' + escapeHtml(item.sport || 'Any sport') + '</span></span>'
            + '<span class="tag"><i class="fa-solid fa-tag"></i><span>' + escapeHtml(item.sponsorType || 'General sponsorship') + '</span></span>'
            + (item.location ? '<span class="tag"><i class="fa-solid fa-location-dot"></i><span>' + escapeHtml(item.location) + '</span></span>' : '')
            + (item.timeline ? '<span class="tag"><i class="fa-regular fa-clock"></i><span>' + escapeHtml(item.timeline) + '</span></span>' : '')
            + '<span class="tag"><i class="fa-regular fa-user"></i><span>For ' + escapeHtml(item.targetAudience === 'all' ? 'all users' : roleLabel(item.targetAudience)) + '</span></span>'
            + '</div>'
            + '<div class="board-actions">'
            + '<button class="btn btn-soft" type="button" data-contact-id="' + escapeHtml(String(item.userId || '')) + '"><i class="fa-regular fa-envelope"></i><span>Contact profile</span></button>'
            + '<button class="btn btn-strong" type="button" data-create-secure="' + escapeHtml(String(item.id || '')) + '"><i class="fa-solid fa-lock"></i><span>' + escapeHtml(ctaText) + '</span></button>'
            + '</div>'
            + '</article>';
        }).join('');
      }

      /* ── Event binding ── */
      function bindEvents() {
        document.getElementById('jumpToComposer').addEventListener('click', function () {
          document.getElementById('composerSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        document.getElementById('jumpToBoard').addEventListener('click', function () {
          document.getElementById('boardSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        document.getElementById('openSecureChatBtn').addEventListener('click', function () {
          createSecureThread();
        });
        document.getElementById('createSecureDraft').addEventListener('click', function () {
          createSecureThread();
        });
        document.getElementById('resetSponsorForm').addEventListener('click', function () {
          document.getElementById('sponsorForm').reset();
          document.getElementById('postAudience').value = normalizeRole() === 'supportive_professional' ? 'all' : normalizeRole();
        });
        document.getElementById('sponsorForm').addEventListener('submit', createPost);

        document.querySelectorAll('.board-tab').forEach(function (button) {
          button.addEventListener('click', function () {
            activeView = button.dataset.view;
            syncTabs();
            renderBoard();
          });
        });
        document.querySelectorAll('.composer-tab').forEach(function (button) {
          button.addEventListener('click', function () {
            activeMode = button.dataset.mode;
            syncTabs();
          });
        });
        ['filterTerm', 'filterRole', 'filterSport', 'filterType', 'hubSearch'].forEach(function (id) {
          var node = document.getElementById(id);
          if (!node) return;
          var debounceTimer;
          node.addEventListener('input', function () {
            if (id === 'hubSearch') {
              document.getElementById('filterTerm').value = node.value;
            }
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(renderBoard, 300);
          });
          node.addEventListener('change', renderBoard);
        });

        document.getElementById('boardList').addEventListener('click', function (event) {
          var secureButton = event.target.closest('[data-create-secure]');
          if (secureButton) {
            var id = secureButton.getAttribute('data-create-secure');
            apiGet('/' + encodeURIComponent(id)).then(function (data) {
              var item = data.sponsorship || data;
              createSecureThread(item);
            }).catch(function () {
              createSecureThread({ title: 'Sponsorship #' + id });
            });
            return;
          }

          var inboxButton = event.target.closest('[data-open-inbox]');
          if (inboxButton) {
            window.location.href = '/pages/messaging/inbox.html';
            return;
          }

          var contactButton = event.target.closest('[data-contact-id]');
          if (contactButton) {
            var contactId = contactButton.getAttribute('data-contact-id');
            if (contactId) {
              window.location.href = '/pages/profiles/public-profile.html?userId=' + encodeURIComponent(contactId);
            } else {
              showStatus('Use the secure sponsor chat action once the sponsorship interest is confirmed.');
            }
          }
        });
      }

      /* ── Profile link in sidebar ── */
      function wireProfileLink() {
        var link = document.getElementById('sidebarProfileLink');
        if (link && window.SpopeerProfileIdentity) {
          link.href = window.SpopeerProfileIdentity.buildProfileUrl('/');
        }
      }

      /* ── Init ── */
      if (typeof ProfileSyncService !== 'undefined') ProfileSyncService.init();
      roleSpecificCopy();
      bindEvents();
      syncTabs();
      renderBoard();
      wireProfileLink();

      if (window.sharedUi && typeof window.sharedUi.setupSocialFeedRuntime === 'function') {
        window.sharedUi.setupSocialFeedRuntime({ basePath: '../../', statusId: 'runtimeStatus' });
      }
    })();
