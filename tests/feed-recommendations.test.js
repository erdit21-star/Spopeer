const test = require('node:test');
const assert = require('node:assert/strict');
const { rankPostsForUser } = require('../server/utils/feedRecommendations');

test('ranks followed and interest-matched posts ahead of unrelated ones', () => {
  const user = {
    id: 10,
    sport: 'football',
    primarySport: 'football',
    role: 'athlete',
    profession: 'striker',
    bio: 'Football training and match prep'
  };

  const posts = [
    {
      id: 1,
      content: 'Basketball training and recovery tips for athletes',
      sport: 'basketball',
      author: { id: 1, sport: 'basketball', role: 'coach' }
    },
    {
      id: 2,
      content: 'Football drills for strikers and quick finishing',
      sport: 'football',
      author: { id: 2, sport: 'football', role: 'athlete' }
    },
    {
      id: 3,
      content: 'New training camp with football mindset and recovery',
      sport: 'football',
      author: { id: 3, sport: 'football', role: 'coach' }
    }
  ];

  const ranked = rankPostsForUser({
    user,
    posts,
    followedIds: [3]
  });

  assert.deepEqual(ranked.map((post) => post.id), [3, 2, 1]);
});
