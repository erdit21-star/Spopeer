// Updated
/* ========================================
   SPOPEER - Master JavaScript File
   ======================================== */

// ===== Constants =====
const TOKEN_KEY = 'spopeer_token';
const API_BASE = '/api';

// ===== DOM Ready Handler =====
document.addEventListener('DOMContentLoaded', function() {
  initializeNavigation();
  initializeForms();
  populateSportSelects();
  initializeSmoothScroll();
});

// inject inbox link and user meta if token present
document.addEventListener('DOMContentLoaded', function() {
  tryInjectUserMetaAndInbox();
});

function tryInjectUserMetaAndInbox() {
  const header = document.querySelector('.header-content');
  if (!header) return;

  const userId = getUserIdFromToken();
  if (userId) {
    // insert meta if not present
    if (!document.querySelector('meta[name="user-id"]')) {
      const m = document.createElement('meta');
      m.name = 'user-id';
      m.content = userId;
      document.head.appendChild(m);
    }

    // create inbox link (only once)
    if (!document.getElementById('inbox-link')) {
      const a = document.createElement('a');
      a.href = '/pages/messaging/inbox.html';
      a.id = 'inbox-link';
      a.style.marginLeft = '12px';
      a.innerHTML = '� Inbox <span id="inbox-badge" style="background:#ef4444;color:white;padding:2px 6px;border-radius:999px;margin-left:8px;font-size:12px;display:none">0</span>';
      header.appendChild(a);
    }

    // register socket if available later in notifications initializer
  }
}

function getUserIdFromToken() {
  try {
    const userStr = localStorage.getItem('spopeer_user') || localStorage.getItem('user');
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return user && (user.id || user.userId) ? String(user.id || user.userId) : null;
  } catch (e) {
    return null;
  }
}

// ===== Sports List Injection =====
function populateSportSelects() {
  const sports = [
    "Aerobatics",
    "Aerobic gymnastics",
    "Aeromodeling",
    "Air racing",
    "Airsoft",
    "American football",
    "American handball",
    "Angling",
    "Aquathlon",
    "Archery",
    "Arena football",
    "Arm wrestling",
    "Artistic gymnastics",
    "Artistic roller skating",
    "Backgammon",
    "Badminton",
    "Baguazhang",
    "Bandy",
    "Baseball",
    "Basketball",
    "Baton twirling",
    "Beach handball",
    "Beach soccer",
    "Beach tennis",
    "Beach volleyball",
    "Biathlon",
    "Bicycle polo",
    "Bicycling",
    "Billiards",
    "Bocce",
    "Bodybuilding",
    "Bokator",
    "Bolas criollas",
    "Bossaball",
    "Bowls",
    "Boxing",
    "Brazilian jiu-jitsu",
    "Breakdancing",
    "Broomball",
    "Bullfighting",
    "Caber toss",
    "Calisthenics",
    "Camogie",
    "Canoeing",
    "Canyoning",
    "Capoeira",
    "Capture the flag",
    "Carom billiards",
    "Caving",
    "Cheerleading",
    "Chess",
    "Chinese martial arts",
    "Chōsen-jūdō",
    "Clout archery",
    "Cockfighting",
    "Combat robot",
    "Cross-country equestrianism",
    "Cross-country running",
    "Cross-country skiing",
    "Crossfit",
    "Curling",
    "Cycling",
    "Dancesport",
    "Darts",
    "Decathlon",
    "Disc golf",
    "Discus throw",
    "Diving",
    "Dodgeball",
    "Dog agility",
    "Dog racing",
    "Downhill skiing",
    "Dragon boat racing",
    "Duathlon",
    "Equestrian vaulting",
    "Equitation",
    "European handball",
    "Extreme ironing",
    "Fencing",
    "Field archery",
    "Field hockey",
    "Figure skating",
    "Finnish baseball",
    "Fistball",
    "Fishing",
    "Five-a-side football",
    "Floorball",
    "Flying disc",
    "Foosball",
    "Football",
    "Footvolley",
    "Formula One racing",
    "Freestyle football",
    "Freestyle skiing",
    "Freestyle wrestling",
    "Frisbee golf",
    "Gaelic football",
    "Gansu Rhythmic Gymnastics",
    "Gateball",
    "Geocaching",
    "Goalball",
    "Golf",
    "Greyhound racing",
    "Gymkhana",
    "Gymnastics",
    "Hammer throw",
    "Handball",
    "Hapkido",
    "Harness racing",
    "Heptathlon",
    "Highland games",
    "Hill climbing",
    "Hiking",
    "Hockey",
    "Horse racing",
    "Horseball",
    "Horseshoe pitching",
    "Hunting",
    "Hurling",
    "Ice climbing",
    "Ice hockey",
    "Ice skating",
    "Inline hockey",
    "Inline skating",
    "Insanity",
    "Jet Skiing",
    "Jiu-jitsu",
    "Javelin throw",
    "Jōdō",
    "Judo",
    "Jūkendō",
    "Kabaddi",
    "Kalaripayattu",
    "Karts",
    "Kendo",
    "Kho kho",
    "Kickboxing",
    "Kiteboarding",
    "Kitesurfing",
    "Kneeboarding",
    "Korfball",
    "Krav Maga",
    "Kubb",
    "Kung Fu",
    "Lacrosse",
    "Land sailing",
    "Lapidary",
    "Lasso throwing",
    "Lumberjack sports",
    "Mahjong",
    "Marathon",
    "Martial arts",
    "Modern pentathlon",
    "Motor sports",
    "Mountain biking",
    "Mountain climbing",
    "Netball",
    "Nordic combined",
    "Orienteering",
    "Paintball",
    "Parachuting",
    "Paragliding",
    "Paddleboarding",
    "Padel",
    "Paintball",
    "Paralympic sports",
    "Parkour",
    "Polo",
    "Powerlifting",
    "Quidditch",
    "Racquetball",
    "Racketlon",
    "Rhythmic gymnastics",
    "Road cycling",
    "Road racing (motorsport)",
    "Roller derby",
    "Roller hockey",
    "Roller skating",
    "Rope climbing",
    "Rowing",
    "Rugby",
    "Running",
    "Sabre fencing",
    "Sailing",
    "Sambo",
    "Sandboarding",
    "Sandboarding",
    "Sepaktakraw",
    "Shinty",
    "Shogi",
    "Shooting",
    "Short track speed skating",
    "Skateboarding",
    "Skeleton",
    "Ski jumping",
    "Ski mountaineering",
    "Ski-orienteering",
    "Skibob",
    "Skiing",
    "Skimboarding",
    "Skydiving",
    "Slamball",
    "Sleddog sports",
    "Snooker",
    "Snowboarding",
    "Snowkiting",
    "Snowmobile racing",
    "Snowshoe running",
    "Soccer",
    "Softball",
    "Sombo wrestling",
    "Speed golf",
    "Speed skiing",
    "Speedball",
    "Speedway",
    "Speedcubing",
    "Speedskating",
    "Spearfishing",
    "Squash",
    "Ssireum",
    "Stand up paddle surfing",
    "Stickball",
    "Street football",
    "Street hockey",
    "Streetball",
    "Strength athletics",
    "Sumo wrestling",
    "Surf lifesaving",
    "Surfing",
    "Swamp football",
    "Swedish football",
    "Swimming",
    "Synchronized skating",
    "Synchronized swimming",
    "Table football",
    "Table tennis",
    "Taekkyeon",
    "Taekwondo",
    "Tag rugby",
    "Takraw",
    "Tang Soo Do",
    "Target archery",
    "Team handball",
    "Team penning",
    "Tennis",
    "Tennis polo",
    "Tent pegging",
    "Tetherball",
    "Thang-ta",
    "Three-legged race",
    "Time attack",
    "Tipcat",
    "Topiary",
    "Touch football",
    "Tour skating",
    "Tower running",
    "Track cycling",
    "Track and field",
    "Tractor pulling",
    "Trail running",
    "Trampolining",
    "Trapshooting",
    "Triathlon",
    "Tug of war",
    "Ultimate",
    "Ultramarathon",
    "Underwater football",
    "Underwater hockey",
    "Underwater ice hockey",
    "Underwater orienteering",
    "Unicycle basketball",
    "Va'a",
    "Valencian pilota",
    "Vaulting",
    "Vehicle acrobatics",
    "Venery",
    "Vertical dance",
    "Vigoro",
    "Vintage base ball",
    "Volleyball",
    "Wakeboarding",
    "Walking",
    "Walking football",
    "Wallball",
    "Wallrunning",
    "Water basketball",
    "Water polo",
    "Water skiing",
    "Water volleyball",
    "Weightlifting",
    "Wheelchair basketball",
    "Wheelchair curling",
    "Wheelchair fencing",
    "Wheelchair football",
    "Wheelchair rugby",
    "Wheelchair tennis",
    "White water canoeing",
    "White water rafting",
    "Wiffleball",
    "Windsurfing",
    "Wing Chun",
    "Winter Guard",
    "Wireball",
    "Wood chopping",
    "Wrestling",
    "Wushu",
    "Xare",
    "Xiangqi",
    "Xingyiquan",
    "Xtreme gene",
    "Yoga",
    "Yubi Lakpi (Manipur traditional game)",
    "Yukigassen (Snowball fighting)",
    "Zourkhaneh (Persian traditional sport)",
    "Zumba (Fitness activity)"
  ];

  const selects = document.querySelectorAll('select.sport-select');
  selects.forEach(select => {
    // keep the first placeholder option if present
    select.innerHTML = '<option value="">Select your primary sport</option>';
    sports.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      select.appendChild(opt);
    });
  });
}

// ===== Simple Notifications Polling =====
function initializeNotifications() {
  const meta = document.querySelector('meta[name="user-id"]');
  const userId = meta ? meta.getAttribute('content') : null;
  if (!userId) return; // no user id available on this page

  async function checkUnread() {
    try {
      const res = await fetch('/api/messages/unread/' + encodeURIComponent(userId), { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.unread && data.unread > 0) showToast('You have ' + data.unread + ' unread message(s)');
    } catch (err) {
      // silent
    }
  }

  // simple toast
  function showToast(text) {
    const t = document.createElement('div');
    t.textContent = text;
    t.style.position = 'fixed';
    t.style.bottom = '20px';
    t.style.right = '20px';
    t.style.background = '#111827';
    t.style.color = 'white';
    t.style.padding = '12px 16px';
    t.style.borderRadius = '8px';
    t.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
    document.body.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity 0.4s'; t.style.opacity = '0'; }, 3500);
    setTimeout(() => t.remove(), 3900);
  }

  checkUnread();
  setInterval(checkUnread, 20000); // poll every 20s
}

// initialize notifications after other inits
document.addEventListener('DOMContentLoaded', initializeNotifications);
// augment notifications with socket.io realtime if available
document.addEventListener('DOMContentLoaded', function() {
  const userId = (document.querySelector('meta[name="user-id"]') || {}).content;
  if (!userId) return;
  // try to connect socket.io if script available
  if (window.io) {
    try {
      const socket = io();
      socket.on('connect', () => {
        socket.emit('register', userId);
      });

      socket.on('new_message', (msg) => {
        showToast('New message from ' + msg.fromId);
        const badge = document.getElementById('inbox-badge');
        if (badge) { badge.style.display = 'inline-block'; badge.textContent = (parseInt(badge.textContent||'0')+1); }
      });
    } catch (e) {
      // ignore socket errors
    }
  }
});

// ===== Navigation Functions =====
function initializeNavigation() {
  // Mobile menu toggle
  const navToggle = document.querySelector('.nav-toggle');
  if (navToggle) {
    navToggle.addEventListener('click', toggleMobileMenu);
  }

  // Active link highlighting
  updateActiveNavLink();
  window.addEventListener('scroll', updateActiveNavLink);
}

function updateActiveNavLink() {
  const navLinks = document.querySelectorAll('.nav-links a');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      const sectionId = href.substring(1);
      const section = document.getElementById(sectionId);
      
      if (section) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 150) {
          navLinks.forEach(l => l.style.color = '');
          link.style.color = '#0066cc';
        }
      }
    }
  });
}

function toggleMobileMenu() {
  const navLinks = document.querySelector('.nav-links');
  if (navLinks) {
    navLinks.style.display = navLinks.style.display === 'none' ? 'flex' : 'none';
  }
}

// ===== Form Functions =====
function initializeForms() {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    // Skip auth forms — they have their own dedicated handlers
    if (form.id === 'loginForm' || form.id === 'signupForm') return;
    form.addEventListener('submit', handleFormSubmit);
  });

  // Form validation on input
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    input.addEventListener('blur', validateField);
    input.addEventListener('change', validateField);
  });
}

// ===== Site Header Injection =====
// DISABLED: Header injection removed per user request
// Each page now uses its own navigation as defined in the original layout
function initializeHeader() { // eslint-disable-line no-unused-vars
  // Placeholder - header injection disabled
}

function renderUserArea() { // eslint-disable-line no-unused-vars
  // Placeholder - header injection disabled
}

// ===== Pagination Helper for Search =====
function renderPaginatedResults(container, results, page, pageSize) { // eslint-disable-line no-unused-vars
  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const end = Math.min(total, start + pageSize);
  container.innerHTML = '';
  const slice = results.slice(start, end);
  slice.forEach(r => {
    const d = document.createElement('div'); d.className = 'card';
    d.style.marginBottom = '8px';
    const esc = window.SpopeerSanitize ? window.SpopeerSanitize.escapeHtml : (s => s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])));
    d.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-weight:700">${esc(r.displayName || [r.firstName, r.lastName].filter(Boolean).join(' ') || '')}</div>
        <div style="color:#6b7280;font-size:13px">${esc(r.role || r.userType || '')} • ${esc(r.sport || '')} • ${esc(r.location || '')}</div>
      </div>
      <div><a href="/pages/profiles/public-profile.html?userId=${encodeURIComponent(r.id)}" style="text-decoration:none"><button style="padding:8px 10px;border-radius:8px;border:none;background:#0066cc;color:white;cursor:pointer">View</button></a></div>
    </div>`;
    container.appendChild(d);
  });

  // pagination controls
  const pager = document.createElement('div'); pager.style.display='flex'; pager.style.justifyContent='center'; pager.style.gap='8px'; pager.style.marginTop='12px';
  const prev = document.createElement('button'); prev.textContent='Prev'; prev.disabled = page<=1; prev.style.padding='6px 10px'; prev.style.borderRadius='8px';
  const next = document.createElement('button'); next.textContent='Next'; next.disabled = page>=totalPages; next.style.padding='6px 10px'; next.style.borderRadius='8px';
  pager.appendChild(prev);
  const info = document.createElement('span'); info.textContent = `${start+1}-${end} of ${total}`; info.style.alignSelf='center'; info.style.color='#6b7280'; info.style.margin='0 8px';
  pager.appendChild(info);
  pager.appendChild(next);
  container.appendChild(pager);

  prev.addEventListener('click', () => { renderPaginatedResults(container, results, page-1, pageSize); });
  next.addEventListener('click', () => { renderPaginatedResults(container, results, page+1, pageSize); });
}

// Auto-initialize header on DOM ready (DISABLED - header injection removed)
// document.addEventListener('DOMContentLoaded', function() { initializeHeader(); });

function validateField(event) {
  const field = event.target;
  const value = field.value.trim();
  const type = field.type;

  // Remove previous error styling
  field.style.borderColor = '';

  // Validation rules
  if (!value && field.required) {
    field.style.borderColor = '#ef4444';
    return false;
  }

  if (type === 'email' && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      field.style.borderColor = '#ef4444';
      return false;
    }
  }

  if (type === 'password' && value) {
    if (value.length < 6) {
      field.style.borderColor = '#ef4444';
      return false;
    }
  }

  return true;
}

function handleFormSubmit(event) {
  // Validate all fields
  const form = event.target;
  const fields = form.querySelectorAll('input, textarea, select');
  let isValid = true;

  fields.forEach(field => {
    if (!validateField({ target: field })) {
      isValid = false;
    }
  });

  if (!isValid) {
    event.preventDefault();
    showNotification('Please fill in all required fields correctly', 'error');
    return false;
  }

  // Allow form submission or redirect as needed
  return true;
}

// ===== Smooth Scroll =====
function initializeSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href !== '#' && href !== '#!') {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
}

// ===== Notification System =====
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#0066cc'};
    color: white;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ===== Helper Functions =====
function getUrlParameter(name) { // eslint-disable-line no-unused-vars
  const url = new URL(window.location);
  return url.searchParams.get(name);
}

function setUrlParameter(name, value) { // eslint-disable-line no-unused-vars
  const url = new URL(window.location);
  url.searchParams.set(name, value);
  window.history.pushState({}, '', url);
}

// ===== Logout Function =====
async function logout() { // eslint-disable-line no-unused-vars
  if (window.Auth && typeof window.Auth.logout === 'function') {
    await window.Auth.logout();
    return;
  }

  if (window.SpopeerAPI && typeof window.SpopeerAPI.logout === 'function') {
    await window.SpopeerAPI.logout();
    return;
  }

  ['spopeer_token', 'spopeer_user', 'spopeer_loggedIn', 'authToken', 'token', 'user', 'userToken', 'userData'].forEach(k => localStorage.removeItem(k));
  window.location.replace('/index.html');
}

// ===== Format Functions =====
function formatDate(date) { // eslint-disable-line no-unused-vars
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatTime(date) { // eslint-disable-line no-unused-vars
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ===== Animation Styles =====
const style = document.createElement('style');
style.innerHTML = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);
// ===== API INTEGRATION FUNCTIONS =====

// Get auth token from localStorage (deprecated — auth is cookie-based)
function _getAuthToken() {
  return null;
}

// Set auth token in localStorage (deprecated — auth is cookie-based)
function setAuthToken(_token) {
  // no-op
}

// Clear auth token
function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Generic fetch wrapper with cookie auth
async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `API Error: ${response.status}`);
  }
  return data;
}

// AUTH API FUNCTIONS
const AuthAPI = {
  signup: async (firstName, lastName, email, password, userType, sport) => {
    const result = await apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ firstName, lastName, email, password, role: userType, sport })
    });
    if (result.token) {
      setAuthToken(result.token);
    }
    return result;
  },

  login: async (email, password) => {
    const result = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (result.token) {
      setAuthToken(result.token);
    }
    return result;
  },

  logout: () => {
    clearAuthToken();
  },

  getUserByEmail: async (email) => {
    return await apiFetch(`/auth/user-by-email?email=${encodeURIComponent(email)}`);
  }
};

// PROFILE API FUNCTIONS
const ProfileAPI = {
  save: async (payload) => {
    return await apiFetch('/profiles', {
      method: 'POST',
      body: JSON.stringify({ payload })
    });
  },

  get: async (userId) => {
    return await apiFetch(`/profiles/${userId}`);
  }
};

// CONNECTIONS API FUNCTIONS
const ConnectionsAPI = {
  sendRequest: async (receiverId, receiverEmail) => {
    return await apiFetch('/connections/request', {
      method: 'POST',
      body: JSON.stringify({ 
        ...(receiverId && { receiverId }),
        ...(receiverEmail && { receiverEmail })
      })
    });
  },

  respond: async (connectionId, action) => {
    return await apiFetch('/connections/respond', {
      method: 'POST',
      body: JSON.stringify({ connectionId, action })
    });
  },

  list: async (filter = 'all') => {
    return await apiFetch(`/connections?filter=${filter}`);
  }
};

// SEARCH API FUNCTIONS
const SearchAPI = {
  search: async (term, sport, userType, page = 1, pageSize = 10) => {
    const params = new URLSearchParams();
    if (term) params.append('term', term);
    if (sport) params.append('sport', sport);
    if (userType) params.append('userType', userType);
    params.append('page', page);
    params.append('pageSize', pageSize);
    
    return await apiFetch(`/search?${params.toString()}`);
  }
};

// MESSAGES API FUNCTIONS
const MessagesAPI = {
  send: async (toId, text) => {
    return await apiFetch('/messages/send', {
      method: 'POST',
      body: JSON.stringify({ toId, text })
    });
  },

  getConversation: async (otherId) => {
    return await apiFetch(`/messages/conversation/${getUserIdFromToken()}/${otherId}`);
  },

  getConversations: async () => {
    return await apiFetch('/messages/conversations');
  },

  getUnread: async () => {
    const userId = getUserIdFromToken();
    return await apiFetch(`/messages/unread/${userId}`);
  },

  markRead: async (fromId) => {
    return await apiFetch('/messages/mark-read', {
      method: 'POST',
      body: JSON.stringify({ fromId })
    });
  }
};

// MEDIA API FUNCTIONS
const MediaAPI = {
  upload: async (file, caption = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('caption', caption);
    
    const response = await fetch(`${API_BASE}/media/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }
    return data;
  },

  getUserMedia: async (userId) => {
    return await apiFetch(`/media/user/${userId}`);
  },

  deleteMedia: async (mediaId) => {
    return await apiFetch(`/media/${mediaId}`, {
      method: 'DELETE'
    });
  }
};
