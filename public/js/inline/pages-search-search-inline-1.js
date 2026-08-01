(function(){
  const PAGE_SIZE = 10;
  let currentPage = 1;
  let selectedRole = '';
  let isLoading = false;
  let lastSearchPage = 1;
  let searchTimer = null;

  /* ── hydrate user: handled by CurrentUserStore + UserUI ── */


  /* – user chip & profile menu: handled by shared-ui.js – */

  /* – sync both search inputs – */
  const mainInput   = document.getElementById('mainSearchInput');
  const sideInput   = document.getElementById('sidebarTerm');
  mainInput?.addEventListener('input', ()=>{ sideInput.value = mainInput.value; });
  sideInput?.addEventListener('input', ()=>{ mainInput.value = sideInput.value; });
  mainInput?.addEventListener('keydown', e=>{ if(e.key==='Enter') doSearch(1); });
  sideInput?.addEventListener('keydown', e=>{ if(e.key==='Enter') doSearch(1); });

  /* ── role toggle ── */
  document.querySelectorAll('#roleGrid .role-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const val = btn.dataset.value;
      if(selectedRole === val){ selectedRole=''; btn.classList.remove('selected'); }
      else {
        document.querySelectorAll('#roleGrid .role-btn').forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedRole = val;
      }
      renderActiveTags();
      scheduleSearch();
    });
  });
  document.getElementById('clearRole')?.addEventListener('click', ()=>{
    selectedRole='';
    document.querySelectorAll('#roleGrid .role-btn').forEach(b=>b.classList.remove('selected'));
    renderActiveTags();
    scheduleSearch();
  });

  /* ── populate sports ── */
  const sportSel = document.getElementById('sport');
  if(window.masterSports && Array.isArray(window.masterSports)){
    window.masterSports.forEach(s=>{ const o=document.createElement('option'); o.value=s; o.textContent=s; sportSel.appendChild(o); });
  } else {
    ['Football','Basketball','Running','Swimming','Tennis','Cycling','Boxing','Volleyball','Athletics','Rugby','Cricket'].forEach(s=>{
      const o=document.createElement('option'); o.value=s.toLowerCase(); o.textContent=s; sportSel.appendChild(o);
    });
  }
  sportSel?.addEventListener('change', ()=>{
    renderActiveTags();
    scheduleSearch();
  });

  /* ── active filter tags ── */
  function renderActiveTags(){
    const wrap = document.getElementById('activeFilters');
    wrap.innerHTML = '';
    if(selectedRole){
      const map={'athlete':'Athlete','coach':'Coach','club':'Club','supportive_professional':'Professional'};
      addTag(wrap, map[selectedRole]||selectedRole, ()=>{
        selectedRole='';
        document.querySelectorAll('#roleGrid .role-btn').forEach(b=>b.classList.remove('selected'));
        renderActiveTags();
        scheduleSearch();
      });
    }
    const sp = document.getElementById('sport')?.value;
    if(sp){ addTag(wrap, sp, ()=>{ document.getElementById('sport').value=''; renderActiveTags(); scheduleSearch(); }); }
  }
  function addTag(wrap, label, onRemove){
    const t = document.createElement('div'); t.className='active-tag';
    t.innerHTML = `${label} <button title="Remove"><i class="fa-solid fa-xmark" style="font-size:10px"></i></button>`;
    t.querySelector('button').addEventListener('click', onRemove);
    wrap.appendChild(t);
  }

  /* ── quick search ── */
  window.quickSearch = function(term){
    document.getElementById('sidebarTerm').value  = term;
    document.getElementById('mainSearchInput').value = term;
    doSearch(1);
  };

  window.quickRole = function(role){
    selectedRole = role;
    document.querySelectorAll('#roleGrid .role-btn').forEach(btn=>{
      btn.classList.toggle('selected', btn.dataset.value === role);
    });
    renderActiveTags();
    doSearch(1);
  };

  window.quickSport = function(sport){
    document.getElementById('sport').value = sport;
    renderActiveTags();
    doSearch(1);
  };

  /* ── avatar class by role ── */
  function avClass(role){
    return {athlete:'',coach:'av-coach',club:'av-club','supportive_professional':'av-pro'}[role]||'av-mixed';
  }
  function initials(name){ return (name||'?').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2); }
  function escapeHtml(value){
    if (window.SpopeerSanitize && typeof window.SpopeerSanitize.escapeHtml === 'function') {
      return window.SpopeerSanitize.escapeHtml(value);
    }
    if (typeof value !== 'string') return '';
    return value.replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[c];
    });
  }

  /* ── role tag html ── */
  function roleTagHTML(type){
    const map={
      athlete:{cls:'tag-athlete',icon:'fa-person-running',label:'Athlete'},
      coach:{cls:'tag-coach',icon:'fa-bullseye',label:'Coach'},
      club:{cls:'tag-club',icon:'fa-shield-halved',label:'Club'},
      'supportive_professional':{cls:'tag-pro',icon:'fa-star',label:'Support Pro'}
    };
    const d = map[type]||{cls:'tag-sport',icon:'fa-user',label:type||'User'};
    return `<span class="rc-tag ${d.cls}"><i class="fa-solid ${d.icon}" style="font-size:10px"></i> ${d.label}</span>`;
  }

  /* ── show/hide UI states ── */
  function showState(which){
    ['heroState','skeletonList','resultsList','eventResultsList','groupResultsList','marketplaceResultsList','emptyState','errorState'].forEach(id=>{
      const el = document.getElementById(id); if(el) el.style.display='none';
    });
    document.getElementById('resultsHeader').style.display='none';
    document.getElementById('paginationRow').style.display='none';
    const tabBar = document.getElementById('resultsTabBar');
    if(tabBar) tabBar.style.display='none';
    if(!which) return;
    const target = document.getElementById(which);
    if(!target) return;
    target.style.display = (which==='resultsList'||which==='eventResultsList'||which==='groupResultsList'||which==='skeletonList') ? 'flex' : 'block';
    if(which==='skeletonList') target.style.flexDirection='column';
    if(which==='marketplaceResultsList') target.style.display='grid';
  }

  /* ── main search function with API + marketplace integration ── */
  async function doSearch(page){
    if(isLoading) return;
    currentPage = page||1;
    lastSearchPage = currentPage;

    const term     = document.getElementById('sidebarTerm').value.trim();
    const sport    = document.getElementById('sport').value;
    const userType = selectedRole;
    const location = document.getElementById('location') ? document.getElementById('location').value.trim() : '';
    const level    = document.getElementById('level') ? document.getElementById('level').value : '';

    showState('skeletonList');
    isLoading = true;
    document.getElementById('searchBtn').disabled = true;

    let searchResults = null;
    let marketplaceResults = null;

    try {
      const searchParams = {};
      if(term) searchParams.term = term;
      if(sport) searchParams.sport = sport;
      if(userType) searchParams.userType = userType;
      if(location) searchParams.location = location;
      if(level) searchParams.level = level;
      searchParams.page = currentPage;
      searchParams.pageSize = PAGE_SIZE;
      searchResults = await window.SpopeerAPI.searchAll(searchParams);
    } catch(err){
      console.error('Unified search failed:', err);
    }

    // Fetch marketplace listings via SpopeerAPI (includes credentials)
    try {
      const mpParams = { page: currentPage, limit: PAGE_SIZE };
      if(term) mpParams.search = term;
      if(sport) mpParams.category = sport;
      marketplaceResults = await window.SpopeerAPI.listMarketplaceListings(mpParams);
    } catch(err){
      console.log('Marketplace search failed:', err && err.message);
    }

    if(searchResults || marketplaceResults) {
      handleSearchResults(searchResults, marketplaceResults, currentPage, PAGE_SIZE);
      return;
    }

    // If both fail, show error
    document.getElementById('errorMsg').textContent = 'Unable to load results.';
    showState('errorState');
    isLoading = false;
    document.getElementById('searchBtn').disabled = false;
  }

  function scheduleSearch(){
    clearTimeout(searchTimer);
    searchTimer = setTimeout(()=>doSearch(1), 150);
  }

  // Helper function to handle search results (API + Marketplace)
  function handleSearchResults(searchJson, marketplaceJson, currentPage, PAGE_SIZE){
    const peopleResults = Array.isArray(searchJson?.data?.users)
      ? searchJson.data.users
      : Array.isArray(searchJson?.users) ? searchJson.users : [];
    const eventResults = Array.isArray(searchJson?.data?.events)
      ? searchJson.data.events
      : Array.isArray(searchJson?.events) ? searchJson.events : [];
    const groupResults = Array.isArray(searchJson?.data?.groups)
      ? searchJson.data.groups
      : Array.isArray(searchJson?.groups) ? searchJson.groups : [];

    const peoplePagination = searchJson?.pagination?.users || searchJson?.pagination || {};
    const eventPagination = searchJson?.pagination?.events || { total: eventResults.length, page: currentPage, pages: 1 };
    const groupPagination = searchJson?.pagination?.groups || { total: groupResults.length, page: currentPage, pages: 1 };
    const peoplePg = peoplePagination.page || currentPage;
    const peoplePages = peoplePagination.pages || 1;

    const mpResults = Array.isArray(marketplaceJson?.data) ? marketplaceJson.data : [];
    const mpTotal = marketplaceJson?.pagination?.total || 0;
    const mpPages = marketplaceJson?.pagination?.pages || 1;
    const mpPg = marketplaceJson?.pagination?.page || currentPage;

    if(peopleResults.length === 0 && eventResults.length === 0 && groupResults.length === 0 && mpResults.length === 0){
      showState('emptyState');
      isLoading = false;
      document.getElementById('searchBtn').disabled = false;
      return;
    }

    const tabBar = document.getElementById('resultsTabBar');
    const visibleSections = [peopleResults.length, eventResults.length, groupResults.length, mpResults.length].filter(count=>count>0).length;
    if(tabBar){
      tabBar.style.display = visibleSections > 1 ? 'flex' : 'none';
    }

    let defaultTab = 'people';
    if(peopleResults.length > 0) {
      defaultTab = 'people';
    } else if(eventResults.length > 0) {
      defaultTab = 'events';
    } else if(groupResults.length > 0) {
      defaultTab = 'groups';
    } else if(mpResults.length > 0) {
      defaultTab = 'marketplace';
    }

    if(peopleResults.length > 0){
      const list = document.getElementById('resultsList');
      list.innerHTML = '';      
      peopleResults.forEach(r=>{
        const card = document.createElement('div');
        card.className = 'result-card';
        const displayName = r.displayName || [r.firstName, r.lastName].filter(Boolean).join(' ') || 'User';
        const roleLabel = r.role || r.userType || 'User';
        const sportTag = r.sport ? `<span class="rc-tag tag-sport"><i class="fa-solid fa-dumbbell" style="font-size:10px"></i> ${escapeHtml(r.sport)}</span>` : '';
        const locTag = r.location ? `<span class="rc-tag tag-location"><i class="fa-solid fa-location-dot" style="font-size:10px"></i> ${escapeHtml(r.location)}</span>` : '';
        const bioText = r.bio ? `<div class="rc-handle" style="margin-top:7px;max-width:560px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(r.bio)}</div>` : '';
        card.innerHTML = `
          <div class="rc-av ${avClass(roleLabel)}">${initials(displayName)}</div>
          <div class="rc-body">
            <div class="rc-name">${escapeHtml(displayName)}${r.verified ? '<i class="fa-solid fa-circle-check verified"></i>' : ''}</div>
            <div class="rc-handle">${escapeHtml(roleLabel)} · ${escapeHtml(r.sport||'N/A')}</div>
            <div class="rc-tags">${roleTagHTML(roleLabel)}${sportTag}${locTag}</div>
            ${bioText}
          </div>
          <div class="rc-right">
            <button class="btn-view" data-search-action="view-profile" data-user-id="${encodeURIComponent(String(r.id))}">
              View Profile
            </button>
            <button class="btn-connect" data-id="${r.id}">Follow</button>
          </div>`;
        list.appendChild(card);
      });

      /* connect toggle — wire to FollowManager (uses numeric ids)
        Uses real API calls. */
      list.querySelectorAll('.btn-connect').forEach(btn => {
        btn.addEventListener('click', async function () {
          const userId = this.dataset.id;
          const isFollowing = this.classList.contains('connected');

          this.disabled = true;

          try {
            if (!isFollowing) {
              const success = await followManager.follow(userId);
              if (success) {
                this.classList.add('connected');
                this.textContent = 'Following';
              }
            } else {
              const success = await followManager.unfollow(userId);
              if (success) {
                this.classList.remove('connected');
                this.textContent = 'Follow';
              }
            }
          } catch (err) {
            console.error('Search follow toggle failed:', err);
          } finally {
            this.disabled = false;
          }
        });
      });

      /* Initialize follow button state from server so buttons show correct label */
      list.querySelectorAll('.btn-connect').forEach(async btn => {
        const userId = btn.dataset.id;

        try {
          const status = await followManager.getFollowStatus(userId);

          if (status === 'accepted') {
            btn.classList.add('connected');
            btn.textContent = 'Following';
            btn.disabled = false;
          } else if (status === 'pending') {
            btn.textContent = 'Requested';
            btn.disabled = true;
          } else {
            btn.classList.remove('connected');
            btn.textContent = 'Follow';
            btn.disabled = false;
          }
        } catch (err) {
          console.error('Failed to initialize follow button:', err);
        }
      });
    }

    if(eventResults.length > 0){
      const list = document.getElementById('eventResultsList');
      list.innerHTML = '';
      eventResults.forEach(event => {
        const card = document.createElement('div');
        card.className = 'result-card';
        const eventTitle = event.title || 'Untitled Event';
        const sportTag = event.sport ? `<span class="rc-tag tag-sport"><i class="fa-solid fa-dumbbell" style="font-size:10px"></i> ${escapeHtml(event.sport)}</span>` : '';
        const locationTag = event.location ? `<span class="rc-tag tag-location"><i class="fa-solid fa-location-dot" style="font-size:10px"></i> ${escapeHtml(event.location)}</span>` : '';
        const dateText = event.startDate ? `<div class="rc-handle">${new Date(event.startDate).toLocaleDateString()}</div>` : '';
        const descriptionText = event.description ? `<div class="rc-handle" style="margin-top:7px;max-width:560px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(event.description)}</div>` : '';
        card.innerHTML = `
          <div class="rc-av av-mixed">${initials(eventTitle)}</div>
          <div class="rc-body">
            <div class="rc-name">${escapeHtml(eventTitle)}</div>
            <div class="rc-handle">Event · ${escapeHtml(event.sport || 'Sports')}</div>
            <div class="rc-tags">${sportTag}${locationTag}</div>
            ${dateText}
            ${descriptionText}
          </div>
          <div class="rc-right">
            <button class="btn-view" data-search-action="view-event" data-event-id="${encodeURIComponent(String(event.id))}">View Event</button>
          </div>`;
        list.appendChild(card);
      });
    }

    if(groupResults.length > 0){
      const list = document.getElementById('groupResultsList');
      list.innerHTML = '';
      groupResults.forEach(group => {
        const card = document.createElement('div');
        card.className = 'result-card';
        const groupName = group.name || 'Group';
        const sportTag = group.sport ? `<span class="rc-tag tag-sport"><i class="fa-solid fa-dumbbell" style="font-size:10px"></i> ${escapeHtml(group.sport)}</span>` : '';
        const memberCount = group.memberCount != null ? `${group.memberCount} members` : '';
        const creator = group.creator ? `${escapeHtml(group.creator.firstName || '')} ${escapeHtml(group.creator.lastName || '')}`.trim() : '';
        const descriptionText = group.description ? `<div class="rc-handle" style="margin-top:7px;max-width:560px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(group.description)}</div>` : '';
        card.innerHTML = `
          <div class="rc-av av-club">${initials(groupName)}</div>
          <div class="rc-body">
            <div class="rc-name">${escapeHtml(groupName)}</div>
            <div class="rc-handle">Team / Club ${memberCount ? '· ' + memberCount : ''}</div>
            <div class="rc-tags">${sportTag}</div>
            ${descriptionText}
            ${creator ? `<div class="rc-handle">Created by ${creator}</div>` : ''}
          </div>
          <div class="rc-right">
            <button class="btn-view" data-search-action="view-group" data-group-id="${encodeURIComponent(String(group.id))}">View Team</button>
          </div>`;
        list.appendChild(card);
      });
    }

    if(mpResults.length > 0){
      const mpList = document.getElementById('marketplaceResultsList');
      mpList.innerHTML = '';
      
      mpResults.forEach(listing=>{
        const card = document.createElement('div');
        card.className = 'marketplace-result-card';
        const image = listing.images && listing.images.length > 0 ? listing.images[0] : '/assets/images/placeholder.png';
        const price = listing.price ? `$${parseFloat(listing.price).toFixed(2)}` : 'Contact';
        const listingId = encodeURIComponent(String(listing.id || ''));
        card.innerHTML = `
          <img src="${image}" alt="${listing.title}" class="marketplace-result-image" data-search-action="view-listing" data-listing-id="${listingId}">
          <div class="marketplace-result-content">
            <div class="marketplace-result-title">${listing.title || 'Untitled'}</div>
            <div class="marketplace-result-price">${price}</div>
            <div class="marketplace-result-seller">${listing.seller_name || 'Unknown Seller'}</div>
          </div>`;
        mpList.appendChild(card);
      });
    }

    const activeTab = defaultTab;
    const stateMap = {
      people: 'resultsList',
      events: 'eventResultsList',
      groups: 'groupResultsList',
      marketplace: 'marketplaceResultsList'
    };
    showState(stateMap[activeTab] || 'resultsList');
    switchResultsTab(activeTab);

    /* header */
    const totalResults = peopleResults.length + mpResults.length;
    document.getElementById('resultsHeader').style.display = 'flex';
    const term = document.getElementById('sidebarTerm').value.trim();
    const sport = document.getElementById('sport').value;
    const parts = [];
    if(term) parts.push(`"${escapeHtml(term)}"`);
    if(selectedRole) parts.push(selectedRole === 'supportive_professional' ? 'Professional' : selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1));
    if(sport) parts.push(sport);
    document.getElementById('resultsMeta').innerHTML =
      `Found <strong>${totalResults}</strong> results${parts.length ? ` for ${parts.join(' · ')}` : ''}`;

    /* pagination by active tab */
    if(currentResultsTab === 'people'){
      buildPagination(peoplePg, peoplePages);
    } else if(currentResultsTab === 'events'){
      buildPagination(eventPagination.page, eventPagination.pages);
    } else if(currentResultsTab === 'groups'){
      buildPagination(groupPagination.page, groupPagination.pages);
    } else if(currentResultsTab === 'marketplace'){
      buildPagination(mpPg, mpPages);
    }
    
    isLoading = false;
    document.getElementById('searchBtn').disabled = false;
  }

  // Switch between search tabs
  let currentResultsTab = 'people';
  function switchResultsTab(tab){
    currentResultsTab = tab;
    document.querySelectorAll('.result-tab').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`${tab}Tab`);
    if(activeBtn) activeBtn.classList.add('active');

    const peopleList = document.getElementById('resultsList');
    const eventList = document.getElementById('eventResultsList');
    const groupList = document.getElementById('groupResultsList');
    const mpList = document.getElementById('marketplaceResultsList');

    if(peopleList) peopleList.style.display = tab === 'people' ? 'flex' : 'none';
    if(eventList) eventList.style.display = tab === 'events' ? 'flex' : 'none';
    if(groupList) groupList.style.display = tab === 'groups' ? 'flex' : 'none';
    if(mpList) mpList.style.display = tab === 'marketplace' ? 'grid' : 'none';
  }

  /* ── pagination ── */
  function buildPagination(pg, total){
    const row = document.getElementById('paginationRow');
    row.innerHTML = '';
    if(total <= 1){ row.style.display='none'; return; }
    row.style.display = 'flex';

    addArrow(row,'←', pg<=1, ()=>doSearch(pg-1));

    const start = Math.max(1, pg-2), end = Math.min(total, pg+2);
    if(start>1){ addPageBtn(row,1,pg); if(start>2) addEllipsis(row); }
    for(let i=start;i<=end;i++) addPageBtn(row,i,pg);
    if(end<total){ if(end<total-1) addEllipsis(row); addPageBtn(row,total,pg); }

    addArrow(row,'→', pg>=total, ()=>doSearch(pg+1));
  }
  function addPageBtn(row,i,active){
    const b=document.createElement('button');
    b.className='page-btn'+(i===active?' active':'');
    b.textContent=i;
    b.addEventListener('click',()=>doSearch(i));
    row.appendChild(b);
  }
  function addArrow(row,text,disabled,fn){
    const b=document.createElement('button'); b.className='page-btn'; b.textContent=text; b.disabled=disabled;
    b.addEventListener('click',fn); row.appendChild(b);
  }
  function addEllipsis(row){
    const s=document.createElement('span'); s.className='page-ellipsis'; s.textContent='…'; row.appendChild(s);
  }

  /* ── reset ── */
  window.resetAll = function(){
    document.getElementById('sidebarTerm').value='';
    document.getElementById('mainSearchInput').value='';
    document.getElementById('sport').value='';
    selectedRole='';
    document.querySelectorAll('#roleGrid .role-btn').forEach(b=>b.classList.remove('selected'));
    renderActiveTags();
    showState('heroState');
  };

  /* ── retry ── */
  document.getElementById('retryBtn')?.addEventListener('click',()=>doSearch(lastSearchPage));

  document.addEventListener('click', function (event) {
    const actionNode = event.target && event.target.closest('[data-search-action]');
    if (!actionNode) return;

    const action = actionNode.getAttribute('data-search-action');
    if (!action) return;

    if (action === 'quick-search') {
      const term = actionNode.getAttribute('data-search-term') || '';
      window.quickSearch(term);
      return;
    }

    if (action === 'quick-role') {
      const role = actionNode.getAttribute('data-search-role') || '';
      if (role) window.quickRole(role);
      return;
    }

    if (action === 'quick-sport') {
      const sport = actionNode.getAttribute('data-search-sport') || '';
      if (sport) window.quickSport(sport);
      return;
    }

    if (action === 'switch-tab') {
      const tab = actionNode.getAttribute('data-search-tab') || 'people';
      switchResultsTab(tab);
      return;
    }

    if (action === 'reset-all') {
      window.resetAll();
      return;
    }

    if (action === 'view-profile') {
      const userId = actionNode.getAttribute('data-user-id') || '';
      if (userId) {
        window.location.href = '../profiles/public-profile.html?userId=' + userId;
      }
      return;
    }

    if (action === 'view-event') {
      const eventId = actionNode.getAttribute('data-event-id') || '';
      if (eventId) {
        window.location.href = '../events/event.html?id=' + eventId;
      }
      return;
    }

    if (action === 'view-group') {
      const groupId = actionNode.getAttribute('data-group-id') || '';
      if (groupId) {
        window.location.href = '../community/community.html?groupId=' + groupId;
      }
      return;
    }

    if (action === 'view-listing') {
      const listingId = actionNode.getAttribute('data-listing-id') || '';
      if (listingId) {
        window.location.href = '../marketplace/listing-detail.html?id=' + listingId;
      }
    }
  });

  /* ── search button ── */
  document.getElementById('searchBtn')?.addEventListener('click',()=>doSearch(1));

  /* ── URL param handling (preserved from original) ── */
  (function(){
    const q = new URLSearchParams(window.location.search);
    const t = q.get('term');
    if(t){
      document.getElementById('sidebarTerm').value     = t;
      document.getElementById('mainSearchInput').value = t;
      doSearch(1);
    }
  })();

})();
