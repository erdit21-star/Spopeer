function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function scorePostForUser({ user, post, followedIds = [] }) {
  const userSport = (user?.sport || user?.primarySport || '').toLowerCase();
  const userRole = (user?.role || '').toLowerCase();
  const userProfession = (user?.profession || '').toLowerCase();
  const userBio = (user?.bio || '').toLowerCase();

  const postSport = (post?.sport || '').toLowerCase();
  const postContent = (post?.content || '').toLowerCase();
  const authorSport = (post?.author?.sport || '').toLowerCase();
  const authorRole = (post?.author?.role || '').toLowerCase();

  let score = 0;

  if (Array.isArray(followedIds) && followedIds.includes(post?.author?.id)) {
    score += 80;
  }

  if (userSport && postSport && userSport === postSport) {
    score += 50;
  }

  if (userSport && authorSport && userSport === authorSport) {
    score += 20;
  }

  const contentTokens = normalizeText(postContent);
  const interestTokens = normalizeText(`${userSport} ${userProfession} ${userBio}`);

  const sharedTokens = contentTokens.filter((token) => interestTokens.includes(token));
  if (sharedTokens.length > 0) {
    score += sharedTokens.length * 8;
  }

  if (userRole && authorRole && userRole === authorRole) {
    score += 6;
  }

  if (post?.likesCount > 0) {
    score += Math.min(post.likesCount, 20) / 4;
  }

  if (post?.commentsCount > 0) {
    score += Math.min(post.commentsCount, 15) / 3;
  }

  if (post?.createdAt) {
    const ageHours = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
    if (ageHours < 24) score += 5;
    else if (ageHours < 72) score += 2;
  }

  return score;
}

function rankPostsForUser({ user, posts, followedIds = [] }) {
  if (!Array.isArray(posts)) return [];

  return posts
    .map((post) => ({ post, score: scorePostForUser({ user, post, followedIds }) }))
    .sort((a, b) => b.score - a.score)
    .map(({ post }) => post);
}

module.exports = {
  scorePostForUser,
  rankPostsForUser
};
