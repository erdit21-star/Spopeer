let usersData = [];
let postsData = [];
let reportsData = [];
let analyticsData = {};
let dashboardData = {};
let currentReportTab = 'pending';
let currentUsersPage = 1;
let currentPostsPage = 1;
let currentReportsPage = 1;
const PAGE_SIZE = 20;

let usersFilter = { search: '', role: '', active: '' };
let postsFilter = { search: '', isActive: 'true' };

function apiUnwrap(res) {
  if (!res || typeof res !== 'object') return res;
  if (res.data !== undefined) return res.data;
  if (res.payload !== undefined) return res.payload;
  if (res.results !== undefined) return res.results;
  if (res.user !== undefined) return res.user;
  return res;
}

function showToast(msg, type) {
  const stack = document.getElementById('toast-stack');
  const t = document.createElement('div');
  t.className = 'toast ' + (type || '');
  const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-circle-xmark' : type === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-info';
  t.innerHTML = '<i class="fa-solid ' + icon + '"></i> ' + msg;
  stack.appendChild(t);
  setTimeout(function () { t.remove(); }, 3500);
}

function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

function fmtNum(n) {
  if (n == null) return '-';
  return Number(n).toLocaleString();
}

function initials(u) {
  const f = ((u && u.firstName) || '?').charAt(0);
  const l = ((u && u.lastName) || '?').charAt(0);
  return (f + l).toUpperCase();
}

function roleChip(role) {
  const map = { athlete:'blue', coach:'green', club:'amber', supportive_professional:'purple', admin:'red' };
  const labels = { athlete:'Athlete', coach:'Coach', club:'Club', supportive_professional:'Professional', admin:'Admin' };
  return '<span class="chip chip-' + (map[role] || 'gray') + '">' + (labels[role] || role || 'Unknown') + '</span>';
}

function subChip(s) {
  const c = s === 'pro' ? 'blue' : s === 'elite' ? 'amber' : 'gray';
  return '<span class="chip chip-' + c + '">' + (s || 'free') + '</span>';
}

function statusChip(active) {
  return active ? '<span class="chip chip-green">Active</span>' : '<span class="chip chip-red">Suspended</span>';
}

function reportStatusChip(status) {
  const map = { pending:'amber', reviewed:'blue', resolved:'green', dismissed:'gray' };
  return '<span class="chip chip-' + (map[status] || 'gray') + '">' + (status || 'unknown') + '</span>';
}

function findSidebarButton(key) {
  return Array.from(document.querySelectorAll('.sidebar-link')).find(function (btn) {
    return btn.textContent.toLowerCase().indexOf(key.toLowerCase()) !== -1;
  });
}

function switchSection(id, btn) {
  document.querySelectorAll('.section').forEach(function (s) { s.classList.remove('active'); });
  document.querySelectorAll('.sidebar-link').forEach(function (b) { b.classList.remove('active'); });
  const target = document.getElementById('section-' + id);
  if (target) target.classList.add('active');
  if (btn) btn.classList.add('active');

  if (id === 'users' && !usersData.length) loadUsers();
  if (id === 'content' && !postsData.length) loadPosts();
  if (id === 'reports') loadReports();
  if (id === 'analytics' && !analyticsData.topPosters) loadAnalytics();
  if (id === 'marketplace') loadMarketplace('listings');
  if (id === 'auditlog') renderAuditLog();
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

document.addEventListener('click', function (e) {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
});

async function loadAdminHeaderUser() {
  try {
    const user = await window.Auth.syncUserFromBackend();
    if (!user) return;
    const name = ((user.firstName || '') + ' ' + (user.lastName || '')).trim() || user.email || 'Admin User';
    const role = user.role || 'admin';
    document.getElementById('adminUserName').textContent = name;
    document.getElementById('adminUserRole').textContent = role;
    document.getElementById('adminAvatar').textContent = initials(user);
  } catch (err) {
    console.warn('Failed to load admin header user', err);
  }
}

async function adminSignOut() {
  try {
    await window.Auth.logout();
  } catch (err) {
    showToast('Logout failed', 'error');
  }
}

async function loadDashboard() {
  try {
    const res = await window.SpopeerAPI.adminDashboard();
    const d = apiUnwrap(res) || {};
    dashboardData = d;
    document.getElementById('kpi-users').textContent = fmtNum(d.totalUsers || 0);
    document.getElementById('kpi-posts').textContent = fmtNum(d.totalPosts || 0);
    document.getElementById('kpi-connections').textContent = fmtNum(d.totalConnections || 0);
    document.getElementById('kpi-messages').textContent = fmtNum(d.totalMessages || 0);
    document.getElementById('kpi-users-today').textContent = '+' + (d.newUsersToday || 0) + ' today';
    document.getElementById('kpi-posts-today').textContent = '+' + (d.newPostsToday || 0) + ' today';
    document.getElementById('kpi-live-users').textContent = 'Live users: ' + fmtNum(d.liveUsersNow || 0);
    document.getElementById('kpi-connections-live').textContent = 'Live listings: ' + fmtNum(d.liveListings || 0);
    renderDonut(d.usersByRole || []);
    renderSubBreakdown(d.usersBySubscription || []);
  } catch (err) {
    console.warn('Dashboard API unavailable, using fallback:', err);
    const fallback = {
      totalUsers: 0,
      totalPosts: 0,
      totalConnections: 0,
      totalMessages: 0,
      newUsersToday: 0,
      newPostsToday: 0,
      liveUsersNow: 0,
      liveListings: 0,
      usersByRole: [],
      usersBySubscription: [],
      registrationsLast6Months: []
    };
    dashboardData = fallback;
    document.getElementById('kpi-live-users').textContent = 'Live users: 0';
    document.getElementById('kpi-connections-live').textContent = 'Live listings: 0';
    renderDonut(fallback.usersByRole);
    renderSubBreakdown(fallback.usersBySubscription);
  }

  await loadReportCounts();
  renderBarChart();
}

function renderBarChart() {
  const wrap = document.getElementById('reg-chart');
  const monthly = Array.isArray(dashboardData.registrationsLast6Months) ? dashboardData.registrationsLast6Months : [];
  const months = monthly.length ? monthly.map(function (m) { return m.label; }) : ['Nov','Dec','Jan','Feb','Mar','Apr'];
  const vals = monthly.length ? monthly.map(function (m) { return Number(m.count || 0); }) : [0, 0, 0, 0, 0, 0];
  const max = Math.max.apply(null, vals);
  wrap.innerHTML = months.map(function (m, i) {
    var h = max > 0 ? (Math.round((vals[i] / max) * 140) + 4) : 4;
    return '<div class="bar-col"><div class="bar" style="height:' + h + 'px"></div><div class="bar-label">' + m + '</div></div>';
  }).join('');
}

function renderDonut(roles) {
  const colors = { athlete:'#1a6bff', coach:'#16a34a', club:'#d97706', supportive_professional:'#7c3aed', admin:'#b91c1c' };
  const labels = { athlete:'Athlete', coach:'Coach', club:'Club', supportive_professional:'Professional', admin:'Admin' };
  const total = roles.reduce(function (s, r) { return s + Number(r.count || 0); }, 0) || 1;
  const R = 46;
  const C = 2 * Math.PI * R;
  let offset = 0;
  let arcs = '';

  roles.forEach(function (r) {
    const frac = Number(r.count || 0) / total;
    const dash = frac * C;
    arcs += '<circle cx="60" cy="60" r="46" fill="none" stroke="' + (colors[r.role] || '#aaa') + '" stroke-width="16" stroke-dasharray="' + dash + ' ' + (C - dash) + '" stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 60 60)"></circle>';
    offset += dash;
  });

  document.getElementById('donut-svg').innerHTML = '<circle cx="60" cy="60" r="46" fill="none" stroke="var(--surface-2)" stroke-width="16"></circle>' + arcs + '<text x="60" y="65" text-anchor="middle" font-family="Syne,sans-serif" font-size="13" font-weight="800" fill="var(--ink)">' + fmtNum(total) + '</text>';

  document.getElementById('donut-legend').innerHTML = roles.length ? roles.map(function (r) {
    return '<div class="legend-item"><div class="legend-dot" style="background:' + (colors[r.role] || '#aaa') + '"></div><span>' + (labels[r.role] || r.role) + '</span><span style="margin-left:auto;font-weight:700;">' + fmtNum(r.count || 0) + '</span></div>';
  }).join('') : '<span style="color:var(--muted)">No role data yet</span>';
}

function renderSubBreakdown(subs) {
  const total = subs.reduce(function (s, r) { return s + Number(r.count || 0); }, 0) || 1;
  const colors = { free:'var(--muted)', pro:'var(--blue)', elite:'var(--amber)' };
  const host = document.getElementById('sub-breakdown');
  if (!subs.length) {
    host.innerHTML = '<span style="color:var(--muted)">No subscription data yet.</span>';
    return;
  }
  host.innerHTML = subs.map(function (s) {
    const pct = Math.round((Number(s.count || 0) / total) * 100);
    return '<div style="margin-bottom:14px;"><div style="display:flex;justify-content:space-between;font-size:.835rem;margin-bottom:5px;"><span style="font-weight:600;text-transform:capitalize;">' + (s.subscription || 'free') + '</span><span style="color:var(--muted);">' + fmtNum(s.count || 0) + ' (' + pct + '%)</span></div><div style="height:7px;background:var(--surface-2);border-radius:999px;overflow:hidden;"><div style="height:100%;width:' + pct + '%;background:' + (colors[s.subscription] || 'var(--blue)') + ';border-radius:999px"></div></div></div>';
  }).join('');
}

async function refreshDashboard() {
  await loadDashboard();
  showToast('Dashboard refreshed', 'success');
}

async function loadUsers(page) {
  currentUsersPage = page || 1;
  const params = { page: currentUsersPage, limit: PAGE_SIZE };
  if (usersFilter.search) params.search = usersFilter.search;
  if (usersFilter.role) params.role = usersFilter.role;
  if (usersFilter.active !== '') params.isActive = usersFilter.active;

  try {
    const res = await window.SpopeerAPI.adminUsers(params);
    usersData = apiUnwrap(res) || [];
    renderUsersTable(usersData, (res && res.pagination) || {});
  } catch (err) {
    console.warn('Users API failed', err);
    usersData = [];
    renderUsersTable([], { total: 0, page: 1, pages: 1 });
  }
}

function renderUsersTable(rows, pagination) {
  rows = Array.isArray(rows) ? rows : [];
  const tbody = document.getElementById('users-tbody');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-users-slash"></i><p>No users found</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(function (u) {
    const name = ((u.firstName || '') + ' ' + (u.lastName || '')).trim() || 'Unknown';
    const sport = u.sport || u.primarySport || '-';
    return '<tr><td><div class="user-cell"><div class="u-avatar">' + initials(u) + '</div><div><div class="u-name">' + name + '</div><div class="u-email">' + (u.email || '-') + '</div></div></div></td><td>' + roleChip(u.role) + '</td><td>' + subChip(u.subscription) + '</td><td>' + sport + '</td><td>' + statusChip(u.isActive) + '</td><td>' + fmtDate(u.createdAt) + '</td><td><div style="display:flex;gap:6px;"><button class="btn btn-secondary btn-sm" onclick="editUser(' + Number(u.id) + ')"><i class="fa-solid fa-pen"></i></button><button class="btn btn-danger btn-sm" onclick="toggleUserActive(' + Number(u.id) + ', ' + (!!u.isActive) + ')"><i class="fa-solid fa-' + (u.isActive ? 'ban' : 'check') + '"></i></button></div></td></tr>';
  }).join('');

  const total = pagination.total || rows.length;
  const pages = pagination.pages || pagination.totalPages || 1;
  document.getElementById('users-pagination-info').textContent = 'Showing ' + rows.length + ' of ' + fmtNum(total) + ' users';
  renderPagination('users-page-btns', pages, currentUsersPage, loadUsers);
}

function filterUsers(search, role, active) {
  if (search !== null && search !== undefined) usersFilter.search = search;
  if (role !== undefined && role !== null) usersFilter.role = role || '';
  if (active !== undefined && active !== null) usersFilter.active = active;
  loadUsers(1);
}

function editUser(id) {
  const u = usersData.find(function (x) { return String(x.id) === String(id); });
  if (!u) return;
  document.getElementById('edit-user-id').value = id;
  document.getElementById('edit-user-role').value = u.role || 'athlete';
  document.getElementById('edit-user-sub').value = u.subscription || 'free';
  document.getElementById('edit-user-active').value = String(!!u.isActive);
  document.getElementById('edit-user-verified').value = String(!!u.verified);
  openModal('modal-edit-user');
}

async function saveUserEdit() {
  const id = document.getElementById('edit-user-id').value;
  const payload = {
    role: document.getElementById('edit-user-role').value,
    subscription: document.getElementById('edit-user-sub').value,
    isActive: document.getElementById('edit-user-active').value === 'true',
    verified: document.getElementById('edit-user-verified').value === 'true'
  };
  try {
    await window.SpopeerAPI.adminUpdateUser(id, payload);
    showToast('User updated', 'success');
  } catch (err) {
    showToast('Failed to update user', 'error');
  }
  closeModal('modal-edit-user');
  loadUsers(currentUsersPage);
}

async function toggleUserActive(id, isActive) {
  try {
    if (isActive) {
      await window.SpopeerAPI.adminDeactivateUser(id);
    } else {
      await window.SpopeerAPI.adminUpdateUser(id, { isActive: true });
    }
    showToast('User status updated', 'success');
  } catch (err) {
    showToast('Failed to update user status', 'error');
  }
  loadUsers(currentUsersPage);
}

async function loadPosts(page) {
  currentPostsPage = page || 1;
  const params = { page: currentPostsPage, limit: PAGE_SIZE, isActive: postsFilter.isActive };
  if (postsFilter.search) params.search = postsFilter.search;

  try {
    const res = await window.SpopeerAPI.adminPosts(params);
    postsData = apiUnwrap(res) || [];
    renderPostsTable(postsData, (res && res.pagination) || {});
  } catch (err) {
    console.warn('Posts API failed', err);
    postsData = [];
    renderPostsTable([], { total: 0, pages: 1 });
  }
}

function renderPostsTable(rows, pagination) {
  document.getElementById('tc-posts').textContent = rows.filter(function (p) { return !!p.isActive; }).length;
  document.getElementById('tc-removed').textContent = rows.filter(function (p) { return !p.isActive; }).length;

  const tbody = document.getElementById('posts-tbody');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-newspaper"></i><p>No posts found</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(function (p) {
    const a = p.author || {};
    const authorName = ((a.firstName || '') + ' ' + (a.lastName || '')).trim() || 'Unknown';
    return '<tr><td><div class="user-cell"><div class="u-avatar">' + initials(a) + '</div><div><div class="u-name">' + authorName + '</div><div class="u-email">' + roleChip(a.role) + '</div></div></div></td><td><div class="content-preview">' + (p.content || '') + '</div></td><td>' + (p.sport ? '<span class="chip chip-blue">' + p.sport + '</span>' : '-') + '</td><td>' + fmtNum(p.likesCount || 0) + '</td><td>' + fmtNum(p.commentsCount || 0) + '</td><td>' + fmtDate(p.createdAt) + '</td><td>' + (p.isActive ? '<span class="chip chip-green">Live</span>' : '<span class="chip chip-red">Removed</span>') + '</td><td>' + (p.isActive ? '<button class="btn btn-danger btn-sm" onclick="removePost(' + p.id + ')"><i class="fa-solid fa-trash"></i></button>' : '-') + '</td></tr>';
  }).join('');

  const total = pagination.total || rows.length;
  const pages = pagination.pages || pagination.totalPages || 1;
  document.getElementById('posts-pagination-info').textContent = 'Showing ' + rows.length + ' of ' + fmtNum(total) + ' posts';
  renderPagination('posts-page-btns', pages, currentPostsPage, loadPosts);
}

function filterPosts(search) {
  postsFilter.search = search || '';
  loadPosts(1);
}

function switchContentTab(tab, btn) {
  document.querySelectorAll('#section-content .tab-btn').forEach(function (b) { b.classList.remove('active'); });
  btn.classList.add('active');
  postsFilter.isActive = tab === 'removed' ? 'false' : 'true';
  loadPosts(1);
}

async function removePost(id) {
  try {
    if (window.SpopeerAPI && typeof window.SpopeerAPI.moderationRemovePost === 'function') {
      await window.SpopeerAPI.moderationRemovePost(id, 'Removed by admin dashboard content moderation');
    } else {
      await window.SpopeerAPI.adminDeletePost(id);
    }
    showToast('Post removed', 'success');
    loadPosts(currentPostsPage);
  } catch (err) {
    showToast('Failed to remove post', 'error');
  }
}

function readModActionValues(type) {
  if (type === 'post') {
    return {
      id: parseInt(document.getElementById('mod-post-id').value, 10),
      reason: (document.getElementById('mod-post-reason').value || '').trim()
    };
  }
  return {
    id: parseInt(document.getElementById('mod-user-id').value, 10),
    reason: (document.getElementById('mod-user-reason').value || '').trim()
  };
}

async function adminHidePostAction() {
  const vals = readModActionValues('post');
  if (!vals.id) return showToast('Enter a valid post ID', 'warn');
  try {
    await window.SpopeerAPI.moderationHidePost(vals.id, vals.reason || 'Hidden by admin dashboard');
    showToast('Post hidden', 'success');
    loadPosts(currentPostsPage);
  } catch (_err) {
    showToast('Failed to hide post', 'error');
  }
}

async function adminRemovePostAction() {
  const vals = readModActionValues('post');
  if (!vals.id) return showToast('Enter a valid post ID', 'warn');
  try {
    await window.SpopeerAPI.moderationRemovePost(vals.id, vals.reason || 'Removed by admin dashboard');
    showToast('Post removed', 'success');
    loadPosts(currentPostsPage);
  } catch (_err) {
    showToast('Failed to remove post', 'error');
  }
}

async function adminWarnUserAction() {
  const vals = readModActionValues('user');
  if (!vals.id) return showToast('Enter a valid user ID', 'warn');
  try {
    await window.SpopeerAPI.moderationWarnUser(vals.id, vals.reason || 'Please review community guidelines.');
    showToast('User warned', 'success');
  } catch (_err) {
    showToast('Failed to warn user', 'error');
  }
}

async function adminSuspendUserAction() {
  const vals = readModActionValues('user');
  if (!vals.id) return showToast('Enter a valid user ID', 'warn');
  try {
    await window.SpopeerAPI.moderationSuspendUser(vals.id, vals.reason || 'Suspended by admin dashboard');
    showToast('User suspended', 'success');
    loadUsers(currentUsersPage);
  } catch (_err) {
    showToast('Failed to suspend user', 'error');
  }
}

async function loadReportCounts() {
  const statuses = ['pending', 'reviewed', 'resolved', 'dismissed'];
  const counts = { pending: 0, reviewed: 0, resolved: 0, dismissed: 0 };

  await Promise.all(statuses.map(async function (status) {
    try {
      const res = await window.SpopeerAPI.moderationReports({ status: status, page: 1, limit: 1 });
      const pg = res && res.pagination ? res.pagination : {};
      counts[status] = Number(pg.total || 0);
    } catch (err) {
      counts[status] = 0;
    }
  }));

  document.getElementById('rt-pending').textContent = String(counts.pending);
  document.getElementById('rt-reviewed').textContent = String(counts.reviewed);
  document.getElementById('rt-resolved').textContent = String(counts.resolved);
  document.getElementById('rt-dismissed').textContent = String(counts.dismissed);
  document.getElementById('sb-reports').textContent = String(counts.pending);
  document.getElementById('qa-report-count').textContent = String(counts.pending);
  document.getElementById('kpi-reports').textContent = String(counts.pending);
}

async function loadReports(page) {
  currentReportsPage = page || 1;
  try {
    const res = await window.SpopeerAPI.moderationReports({ status: currentReportTab, page: currentReportsPage, limit: PAGE_SIZE });
    reportsData = apiUnwrap(res) || [];
    renderReportsTable(reportsData, (res && res.pagination) || {});
  } catch (err) {
    console.warn('Reports API failed', err);
    reportsData = [];
    renderReportsTable([], { total: 0, pages: 1 });
  }
  loadReportCounts();
}

function renderReportsTable(rows, pagination) {
  const tbody = document.getElementById('reports-tbody');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-flag"></i><p>No ' + currentReportTab + ' reports</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(function (r) {
    const rep = r.reporter || {};
    return '<tr><td>#' + r.id + '</td><td><div class="user-cell"><div class="u-avatar">' + initials(rep) + '</div><div><div class="u-name">' + (((rep.firstName || '') + ' ' + (rep.lastName || '')).trim() || 'Unknown') + '</div><div class="u-email">' + (rep.email || '') + '</div></div></div></td><td><span class="chip chip-blue">' + (r.targetType || 'unknown') + '</span> #' + (r.targetId || '-') + '</td><td><span class="chip chip-amber">' + (r.reason || '-') + '</span></td><td><div class="content-preview">' + (r.description || '-') + '</div></td><td>' + fmtDate(r.createdAt) + '</td><td>' + reportStatusChip(r.status) + '</td><td>' + (r.status === 'pending' ? '<button class="btn btn-primary btn-sm" onclick="openReportReview(' + r.id + ')"><i class="fa-solid fa-gavel"></i> Review</button>' : '-') + '</td></tr>';
  }).join('');

  const total = pagination.total || rows.length;
  const pages = pagination.pages || pagination.totalPages || 1;
  document.getElementById('reports-pagination-info').textContent = 'Showing ' + rows.length + ' of ' + fmtNum(total) + ' reports';
  renderPagination('reports-page-btns', pages, currentReportsPage, loadReports);
}

function switchReportTab(tab, btn) {
  document.querySelectorAll('#section-reports .tab-btn').forEach(function (b) { b.classList.remove('active'); });
  btn.classList.add('active');
  currentReportTab = tab;
  loadReports(1);
}

function openReportReview(id) {
  document.getElementById('resolve-report-id').value = id;
  document.getElementById('resolve-notes').value = '';
  openModal('modal-resolve-report');
}

async function submitReportReview() {
  const id = document.getElementById('resolve-report-id').value;
  const status = document.getElementById('resolve-status').value;
  const resolution = document.getElementById('resolve-notes').value;
  try {
    await window.SpopeerAPI.moderationReviewReport(id, { status: status, resolution: resolution });
    showToast('Report updated', 'success');
  } catch (err) {
    showToast('Failed to update report', 'error');
  }
  closeModal('modal-resolve-report');
  loadReports(currentReportsPage);
}

async function loadAnalytics() {
  try {
    const res = await window.SpopeerAPI.adminAnalytics();
    analyticsData = apiUnwrap(res) || {};
  } catch (err) {
    analyticsData = { newUsersLast30Days: 0, newPostsLast30Days: 0, totalLikes: 0, totalComments: 0, topPosters: [], mostFollowed: [] };
  }

  document.getElementById('an-users').textContent = fmtNum(analyticsData.newUsersLast30Days || 0);
  document.getElementById('an-posts').textContent = fmtNum(analyticsData.newPostsLast30Days || 0);
  document.getElementById('an-likes').textContent = fmtNum(analyticsData.totalLikes || 0);
  document.getElementById('an-comments').textContent = fmtNum(analyticsData.totalComments || 0);

  renderRankTable('top-posters-tbody', analyticsData.topPosters || [], 'postsCount');
  renderRankTable('most-followed-tbody', analyticsData.mostFollowed || [], 'followersCount');
}

function renderRankTable(tbodyId, rows, valueKey) {
  const el = document.getElementById(tbodyId);
  if (!rows.length) {
    el.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--muted);">No data</td></tr>';
    return;
  }
  el.innerHTML = rows.map(function (u, i) {
    return '<tr><td>' + (i + 1) + '</td><td><div class="user-cell"><div class="u-avatar">' + initials(u) + '</div><div><div class="u-name">' + (((u.firstName || '') + ' ' + (u.lastName || '')).trim() || 'Unknown') + '</div></div></div></td><td>' + roleChip(u.role) + '</td><td style="font-weight:700;">' + fmtNum(u[valueKey] || 0) + '</td></tr>';
  }).join('');
}

async function loadMarketplace(type) {
  const thead = document.getElementById('market-thead');
  const tbody = document.getElementById('market-tbody');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:28px;color:var(--muted);">Loading...</td></tr>';

  let res;
  try {
    if (type === 'listings') {
      res = await window.SpopeerAPI.adminMarketplaceListings({ page: 1, limit: 50 });
      const rows = apiUnwrap(res) || [];
      thead.innerHTML = '<tr><th>#</th><th>Title</th><th>Category</th><th>Sport</th><th>Price</th><th>Status</th></tr>';
      tbody.innerHTML = rows.length ? rows.map(function (l) {
        const price = l.price != null ? ('EUR ' + Number(l.price).toFixed(2)) : '-';
        const statusClass = l.status === 'active' ? 'green' : l.status === 'sold' ? 'blue' : 'amber';
        return '<tr><td>' + l.id + '</td><td>' + (l.title || '-') + '</td><td>' + (l.category || '-') + '</td><td>' + (l.sport ? '<span class="chip chip-blue">' + l.sport + '</span>' : '-') + '</td><td>' + price + '</td><td><span class="chip chip-' + statusClass + '">' + (l.status || '-') + '</span></td></tr>';
      }).join('') : '<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--muted);">No listings found</td></tr>';
      document.getElementById('market-info').textContent = 'Showing ' + rows.length + ' listings';
      return;
    }

    if (type === 'sponsorships') {
      res = await window.SpopeerAPI.adminMarketplaceSponsorships({ page: 1, limit: 50 });
      const rows = apiUnwrap(res) || [];
      thead.innerHTML = '<tr><th>#</th><th>Title</th><th>Mode</th><th>Sport</th><th>Status</th><th>Posted</th></tr>';
      tbody.innerHTML = rows.length ? rows.map(function (s) {
        const statusClass = s.status === 'active' ? 'green' : s.status === 'closed' ? 'red' : 'amber';
        return '<tr><td>' + s.id + '</td><td>' + (s.title || '-') + '</td><td><span class="chip chip-purple">' + (s.mode || '-') + '</span></td><td>' + (s.sport ? '<span class="chip chip-blue">' + s.sport + '</span>' : '-') + '</td><td><span class="chip chip-' + statusClass + '">' + (s.status || '-') + '</span></td><td>' + fmtDate(s.createdAt) + '</td></tr>';
      }).join('') : '<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--muted);">No sponsorships found</td></tr>';
      document.getElementById('market-info').textContent = 'Showing ' + rows.length + ' sponsorships';
      return;
    }

    if (type === 'jobs') {
      res = await window.SpopeerAPI.adminMarketplaceJobs({ page: 1, limit: 50 });
      const rows = apiUnwrap(res) || [];
      thead.innerHTML = '<tr><th>#</th><th>Title</th><th>Type</th><th>Sport</th><th>Location</th><th>Status</th></tr>';
      tbody.innerHTML = rows.length ? rows.map(function (j) {
        return '<tr><td>' + j.id + '</td><td>' + (j.title || '-') + '</td><td><span class="chip chip-blue">' + (j.type || '-') + '</span></td><td>' + (j.sport ? '<span class="chip chip-green">' + j.sport + '</span>' : '-') + '</td><td>' + (j.location || '-') + '</td><td>' + (j.isActive ? '<span class="chip chip-green">Active</span>' : '<span class="chip chip-red">Inactive</span>') + '</td></tr>';
      }).join('') : '<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--muted);">No jobs found</td></tr>';
      document.getElementById('market-info').textContent = 'Showing ' + rows.length + ' jobs';
      return;
    }

    res = await window.SpopeerAPI.adminMarketplaceInquiries({ page: 1, limit: 50 });
    const rows = apiUnwrap(res) || [];
    thead.innerHTML = '<tr><th>#</th><th>Status</th><th>Listing</th><th>Message</th><th>Date</th><th>Actions</th></tr>';
    tbody.innerHTML = rows.length ? rows.map(function (q) {
      const statusClass = q.status === 'pending' ? 'amber' : q.status === 'accepted' ? 'green' : q.status === 'declined' ? 'red' : 'gray';
      const actions = q.status === 'pending'
        ? '<div style="display:flex;gap:6px;"><button class="btn btn-success btn-sm" onclick="adminSetInquiryStatus(' + Number(q.id) + ',\'accepted\')">Accept</button><button class="btn btn-danger btn-sm" onclick="adminSetInquiryStatus(' + Number(q.id) + ',\'declined\')">Decline</button></div>'
        : '-';
      return '<tr><td>' + q.id + '</td><td><span class="chip chip-' + statusClass + '">' + (q.status || '-') + '</span></td><td>' + (q.listingTitle || ('Listing #' + (q.listingId || '-'))) + '</td><td class="content-preview">' + (q.message || '-') + '</td><td>' + fmtDate(q.createdAt) + '</td><td>' + actions + '</td></tr>';
    }).join('') : '<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--muted);">No inquiries found</td></tr>';
    document.getElementById('market-info').textContent = 'Showing ' + rows.length + ' inquiries';
  } catch (err) {
    console.error('Marketplace admin load failed:', err);
    thead.innerHTML = '';
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:28px;color:var(--red);">Failed to load marketplace data.</td></tr>';
    document.getElementById('market-info').textContent = 'Failed to load ' + type;
  }
}

async function adminSetInquiryStatus(inquiryId, status) {
  try {
    await window.SpopeerAPI.adminMarketplaceUpdateInquiryStatus(inquiryId, status);
    showToast('Inquiry ' + status, 'success');
    loadMarketplace('inquiries');
  } catch (err) {
    showToast('Failed to update inquiry', 'error');
  }
}

function switchMarketTab(type, btn) {
  document.querySelectorAll('#section-marketplace .tab-btn').forEach(function (b) { b.classList.remove('active'); });
  btn.classList.add('active');
  loadMarketplace(type);
}

async function renderAuditLog() {
  const body = document.getElementById('audit-log-body');
  body.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--muted);">Loading audit logs...</td></tr>';
  try {
    const res = await window.SpopeerAPI.adminAuditLogs({ page: 1, limit: 50 });
    const rows = apiUnwrap(res) || [];
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--muted);">No audit logs yet</td></tr>';
      return;
    }
    body.innerHTML = rows.map(function (r) {
      const admin = r.admin || {};
      const adminName = ((admin.firstName || '') + ' ' + (admin.lastName || '')).trim() || admin.email || ('Admin #' + (r.adminId || '-'));
      const target = r.targetType ? (r.targetType + ' #' + (r.targetId || '-')) : '-';
      return '<tr><td>' + (r.action || '-') + '</td><td>' + target + '</td><td>' + adminName + '</td><td>' + fmtDate(r.createdAt) + '</td></tr>';
    }).join('');
  } catch (err) {
    console.error('Audit log load failed:', err);
    body.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--red);">Failed to load audit logs.</td></tr>';
  }
}

function renderPagination(containerId, pages, current, onPage) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!pages || pages <= 1) {
    el.innerHTML = '';
    return;
  }
  let html = '';
  if (current > 1) html += '<button class="page-btn" onclick="' + onPage.name + '(' + (current - 1) + ')"><i class="fa-solid fa-chevron-left"></i></button>';
  const start = Math.max(1, current - 2);
  const end = Math.min(pages, current + 2);
  for (let p = start; p <= end; p++) {
    html += '<button class="page-btn' + (p === current ? ' active' : '') + '" onclick="' + onPage.name + '(' + p + ')">' + p + '</button>';
  }
  if (current < pages) html += '<button class="page-btn" onclick="' + onPage.name + '(' + (current + 1) + ')"><i class="fa-solid fa-chevron-right"></i></button>';
  el.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', async function () {
  await loadAdminHeaderUser();
  await loadDashboard();
});
