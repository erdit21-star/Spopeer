function buildSuggestedConnections({ viewer, users = [], existingConnectionIds = new Set(), limit = 8 }) {
  const safeViewer = viewer || {};
  const rawIds = existingConnectionIds && typeof existingConnectionIds === 'object' && typeof existingConnectionIds.forEach === 'function'
    ? Array.from(existingConnectionIds)
    : Array.isArray(existingConnectionIds)
      ? existingConnectionIds
      : [];
  const normalizedExisting = new Set(rawIds.map((id) => Number(id)).filter(Boolean));
  const viewerSport = String(safeViewer.sport || safeViewer.primarySport || '').toLowerCase();
  const viewerRole = String(safeViewer.role || safeViewer.userType || '').toLowerCase();
  const viewerLocation = String(safeViewer.location || '').toLowerCase();

  return users
    .filter((user) => Number(user.id) !== Number(safeViewer.id))
    .filter((user) => !normalizedExisting.has(Number(user.id)))
    .map((user) => {
      const userSport = String(user.sport || user.primarySport || '').toLowerCase();
      const userRole = String(user.role || user.userType || '').toLowerCase();
      const userLocation = String(user.location || '').toLowerCase();
      const sameSport = viewerSport && userSport && viewerSport === userSport ? 5 : 0;
      const sameRole = viewerRole && userRole && viewerRole === userRole ? 3 : 0;
      const sameLocation = viewerLocation && userLocation && viewerLocation === userLocation ? 2 : 0;
      const popularity = Math.min(4, Math.max(0, Number(user.followersCount || user.followingCount || 0) / 25));
      const score = sameSport + sameRole + sameLocation + popularity;
      return { ...user, _score: score };
    })
    .sort((a, b) => b._score - a._score || (Number(b.followersCount || 0) - Number(a.followersCount || 0)))
    .slice(0, limit)
    .map(({ _score, ...user }) => user);
}

module.exports = { buildSuggestedConnections };
