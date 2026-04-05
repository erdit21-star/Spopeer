// Updated
/* Search Widget - Add to header for quick search from any page */

document.addEventListener('DOMContentLoaded', function() {
  injectSearchWidget();
});

function injectSearchWidget() {
  const headerContent = document.querySelector('.header-content');
  if (!headerContent) return;

  // Create search container
  const searchContainer = document.createElement('div');
  searchContainer.id = 'search-widget-container';
  searchContainer.style.cssText = `
    position: relative;
    flex: 1;
    max-width: 400px;
    margin: 0 24px;
  `;

  // Create search input
  const searchInput = document.createElement('input');
  searchInput.id = 'search-widget-input';
  searchInput.type = 'text';
  searchInput.placeholder = 'Search people... (or @ for mentions)';
  searchInput.style.cssText = `
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 14px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  `;

  // Create suggestions dropdown
  const suggestionsBox = document.createElement('div');
  suggestionsBox.id = 'search-suggestions';
  suggestionsBox.style.cssText = `
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-top: none;
    border-radius: 0 0 8px 8px;
    max-height: 300px;
    overflow-y: auto;
    display: none;
    z-index: 1000;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  `;

  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(suggestionsBox);

  // Insert search after logo (before skip button)
  const logo = headerContent.querySelector('.logo');
  if (logo && logo.nextSibling) {
    headerContent.insertBefore(searchContainer, logo.nextSibling);
  } else {
    headerContent.insertBefore(searchContainer, headerContent.children[1]);
  }

  // Handle input
  let searchTimeout;
  let _lastQuery = '';

  searchInput.addEventListener('input', async function(e) {
    const query = this.value.trim();
    
    clearTimeout(searchTimeout);
    
    // Handle @ mentions
    if (query.startsWith('@')) {
      const mentionQuery = query.substring(1).trim();
      if (mentionQuery.length > 0) {
        searchTimeout = setTimeout(() => fetchMentions(mentionQuery, suggestionsBox), 300);
      } else if (mentionQuery.length === 0) {
        showAllProfiles(suggestionsBox);
      }
    } else if (query.length === 0) {
      suggestionsBox.style.display = 'none';
    } else {
      // Regular search
      searchTimeout = setTimeout(() => fetchSuggestions(query, suggestionsBox), 300);
    }
  });

  // Handle Enter key
  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      const query = this.value.trim();
      if (query) {
        const cleanQuery = query.replace(/^@/, '').trim();
        window.location.href = `/pages/search/search.html?term=${encodeURIComponent(cleanQuery)}`;
      }
    }
  });

  // Close suggestions on click outside
  document.addEventListener('click', function(e) {
    if (!searchContainer.contains(e.target)) {
      suggestionsBox.style.display = 'none';
    }
  });
}

async function fetchSuggestions(query, suggestionsBox) {
  if (query.length < 1) {
    suggestionsBox.style.display = 'none';
    return;
  }

  try {
    const url = `/api/search?term=${encodeURIComponent(query)}&pageSize=8`;
    console.log('Fetching suggestions from:', url);
    const res = await fetch(url);
    
    if (!res.ok) {
      console.error('Search API error:', res.status, res.statusText);
      suggestionsBox.innerHTML = '<div style="padding: 12px 16px; color: #ef4444; font-size: 13px;">Error loading suggestions</div>';
      suggestionsBox.style.display = 'block';
      return;
    }
    
    const data = await res.json();
    console.log('Search results:', data);
    displaySuggestions(data.results || [], suggestionsBox, query);
  } catch (err) {
    console.error('Fetch error:', err);
    suggestionsBox.innerHTML = '<div style="padding: 12px 16px; color: #ef4444; font-size: 13px;">Connection error</div>';
    suggestionsBox.style.display = 'block';
  }
}

async function fetchMentions(query, suggestionsBox) {
  try {
    const url = `/api/search?term=${encodeURIComponent(query)}&pageSize=8`;
    const res = await fetch(url);
    
    if (!res.ok) {
      console.error('Mentions API error:', res.status);
      suggestionsBox.style.display = 'none';
      return;
    }
    
    const data = await res.json();
    displayMentions(data.results || [], suggestionsBox, query);
  } catch (err) {
    console.error('Mentions error:', err);
    suggestionsBox.style.display = 'none';
  }
}

async function showAllProfiles(suggestionsBox) {
  try {
    const url = `/api/search?pageSize=8`;
    const res = await fetch(url);
    
    if (!res.ok) {
      console.error('API error:', res.status);
      suggestionsBox.style.display = 'none';
      return;
    }
    
    const data = await res.json();
    displayMentions(data.results || [], suggestionsBox, '');
  } catch (err) {
    console.error('Error:', err);
    suggestionsBox.style.display = 'none';
  }
}

function displaySuggestions(results, suggestionsBox, query) {
  if (!results || results.length === 0) {
    suggestionsBox.innerHTML = '<div style="padding: 12px 16px; color: #9ca3af; font-size: 13px;">No results found</div>';
    suggestionsBox.style.display = 'block';
    return;
  }

  let html = '';
  results.forEach(r => {
    const name = r.name || r.email || 'User';
    const type = r.userType || 'User';
    const sport = r.sport || 'N/A';
    
    html += `
      <div class="search-suggestion-item" style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; cursor: pointer; hover-opacity: 0.8; transition: background 0.15s;"
           onmouseover="this.style.background='#f9fafb'"
           onmouseout="this.style.background='white'"
           onclick="goToProfile('${r.id}')">
        <div style="font-weight: 500; color: #111827;">${escapeHtml(name)}</div>
        <div style="font-size: 12px; color: #6b7280;">${escapeHtml(type)} • ${escapeHtml(sport)}</div>
      </div>
    `;
  });

  html += `
    <div style="padding: 12px 16px; background: #f3f4f6; text-align: center; cursor: pointer; font-size: 13px; color: #0066cc; font-weight: 500;"
         onclick="window.location.href='/pages/search/search.html?term=${encodeURIComponent(query)}'">
      View all results for "${escapeHtml(query)}"
    </div>
  `;

  suggestionsBox.innerHTML = html;
  suggestionsBox.style.display = 'block';
}

function displayMentions(results, suggestionsBox, _query) {
  if (!results || results.length === 0) {
    suggestionsBox.innerHTML = '<div style="padding: 12px 16px; color: #9ca3af; font-size: 13px;">No people found</div>';
    suggestionsBox.style.display = 'block';
    return;
  }

  let html = '';
  results.forEach(r => {
    const name = r.name || r.email || 'User';
    const type = r.userType || 'User';
    const sport = r.sport || 'N/A';
    
    html += `
      <div class="search-mention-item" style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; cursor: pointer; transition: background 0.15s;"
           onmouseover="this.style.background='#f9fafb'"
           onmouseout="this.style.background='white'"
           onclick="insertMention('${escapeHtml(name)}')">
        <div style="font-weight: 500; color: #111827;">@${escapeHtml(name.split(' ')[0])}</div>
        <div style="font-size: 12px; color: #6b7280;">${escapeHtml(type)} • ${escapeHtml(sport)}</div>
      </div>
    `;
  });

  suggestionsBox.innerHTML = html;
  suggestionsBox.style.display = 'block';
}

function goToProfile(userId) { // eslint-disable-line no-unused-vars
  window.location.href = `/pages/profiles/public-profile.html?userId=${encodeURIComponent(userId)}`;
}

function insertMention(name) { // eslint-disable-line no-unused-vars
  const input = document.getElementById('search-widget-input');
  const firstName = name.split(' ')[0];
  input.value = `@${firstName} `;
  input.focus();
  document.getElementById('search-suggestions').style.display = 'none';
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

