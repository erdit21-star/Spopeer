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
    ['heroState','skeletonList','resultsList','marketplaceResultsList','emptyState','errorState'].forEach(id=>{
      const el = document.getElementById(id); if(el) el.style.display='none';
    });
    document.getElementById('resultsHeader').style.display='none';
    document.getElementById('paginationRow').style.display='none';
    const tabBar = document.getElementById('resultsTabBar');
    if(tabBar) tabBar.style.display='none';
    if(!which) return;
    const target = document.getElementById(which);
    if(!target) return;
    target.style.display = (which==='resultsList'||which==='marketplaceResultsList'||which==='skeletonList') ? 'flex' : 'block';
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

    showState('skeletonList');
    isLoading = true;
    document.getElementById('searchBtn').disabled = true;

    let peopleResults = null;
    let marketplaceResults = null;

    try {
      // Use the general search API so term, sport, and role filters all apply.
      const searchParams = {};
      if(term) searchParams.term = term;
      if(sport) searchParams.sport = sport;
      if(userType) searchParams.userType = userType;
      searchParams.page = currentPage;
      searchParams.pageSize = PAGE_SIZE;
      peopleResults = await window.SpopeerAPI.searchPeople(searchParams);
    } catch(err){
      console.error('API search failed:', err);
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

    // Pass both results to handler
    if(peopleResults || marketplaceResults) {
      handleSearchResults(peopleResults, marketplaceResults, currentPage, PAGE_SIZE);
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
  function handleSearchResults(peopleJson, marketplaceJson, currentPage, PAGE_SIZE){
    const peopleResults = Array.isArray(peopleJson?.results)
      ? peopleJson.results
      : (Array.isArray(peopleJson?.data) ? peopleJson.data : []);
    const peopleTotal = peopleJson?.pagination?.total || 0;
    const peoplePages = peopleJson?.pagination?.pages || 1;
    const peoplePg = peopleJson?.pagination?.page || currentPage;

    const mpResults = Array.isArray(marketplaceJson?.data) ? marketplaceJson.data : [];
    const mpTotal = marketplaceJson?.pagination?.total || 0;
    const mpPages = marketplaceJson?.pagination?.pages || 1;
    const mpPg = marketplaceJson?.pagination?.page || currentPage;

    // Check if at least one result type exists
    if(peopleResults.length === 0 && mpResults.length === 0){
      showState('emptyState');
      isLoading = false;
      document.getElementById('searchBtn').disabled = false;
      return;
    }

    // Show tab bar if both result types exist
    const tabBar = document.getElementById('resultsTabBar');
    if(tabBar){
      if(peopleResults.length > 0 && mpResults.length > 0){
        tabBar.style.display = 'flex';
      } else {
        tabBar.style.display = 'none';
      }
    }

    // Build people results
    if(peopleResults.length > 0){
      const list = document.getElementById('resultsList');
      list.innerHTML = '';
      currentResultsTab = peopleResults.length > 0 ? 'people' : 'marketplace';
      
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
            <button class="btn-view" onclick="window.location.href='../profiles/public-profile.html?userId=${encodeURIComponent(String(r.id))}'">
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

    // Build marketplace results
    if(mpResults.length > 0){
      const mpList = document.getElementById('marketplaceResultsList');
      mpList.innerHTML = '';
      
      mpResults.forEach(listing=>{
        const card = document.createElement('div');
        card.className = 'marketplace-result-card';
        const image = listing.images && listing.images.length > 0 ? listing.images[0] : '/assets/images/placeholder.png';
        const price = listing.price ? `$${parseFloat(listing.price).toFixed(2)}` : 'Contact';
        card.innerHTML = `
          <img src="${image}" alt="${listing.title}" class="marketplace-result-image" onclick="window.location.href='../marketplace/listing-detail.html?id=${listing.id}'">
          <div class="marketplace-result-content">
            <div class="marketplace-result-title">${listing.title || 'Untitled'}</div>
            <div class="marketplace-result-price">${price}</div>
            <div class="marketplace-result-seller">${listing.seller_name || 'Unknown Seller'}</div>
          </div>`;
        mpList.appendChild(card);
      });
    }

    showState('resultsList');
    if(peopleResults.length > 0) document.getElementById('resultsList').style.display = 'flex';
    if(mpResults.length > 0) document.getElementById('marketplaceResultsList').style.display = 'grid';

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

    /* pagination - use people pagination if people results exist, else marketplace */
    if(peopleResults.length > 0){
      buildPagination(peoplePg, peoplePages);
    } else if(mpResults.length > 0){
      buildPagination(mpPg, mpPages);
    }
    
    isLoading = false;
    document.getElementById('searchBtn').disabled = false;
  }

  // Switch between people and marketplace results tabs
  let currentResultsTab = 'people';
  function switchResultsTab(tab){
    currentResultsTab = tab;
    document.querySelectorAll('.result-tab').forEach(b => b.classList.remove('active'));
    const activeBtn = tab === 'people' ? document.getElementById('peopleTab') : document.getElementById('marketplaceTab');
    if(activeBtn) activeBtn.classList.add('active');
    
    const peopleList = document.getElementById('resultsList');
    const mpList = document.getElementById('marketplaceResultsList');
    
    if(tab === 'people'){
      if(peopleList) peopleList.style.display = 'flex';
      if(mpList) mpList.style.display = 'none';
    } else {
      if(peopleList) peopleList.style.display = 'none';
      if(mpList) mpList.style.display = 'grid';
    }
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
