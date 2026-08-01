const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSuggestedConnections } = require('../server/utils/connectionsSuggestions');

test('buildSuggestedConnections ranks similar users higher and excludes existing connections', () => {
  const viewer = { id: 1, sport: 'Basketball', role: 'Athlete', location: 'Seattle' };
  const existingConnectionIds = new Set([2, 3]);
  const users = [
    { id: 2, firstName: 'Existing', sport: 'Basketball', role: 'Athlete', location: 'Seattle', followersCount: 30 },
    { id: 3, firstName: 'Another', sport: 'Tennis', role: 'Coach', location: 'Portland', followersCount: 12 },
    { id: 4, firstName: 'Similar', sport: 'Basketball', role: 'Athlete', location: 'Seattle', followersCount: 80 },
    { id: 5, firstName: 'Near Match', sport: 'Basketball', role: 'Coach', location: 'Seattle', followersCount: 40 },
    { id: 6, firstName: 'Different', sport: 'Volleyball', role: 'Trainer', location: 'Boston', followersCount: 5 }
  ];

  const suggestions = buildSuggestedConnections({ viewer, users, existingConnectionIds, limit: 4 });

  assert.equal(suggestions.length, 3);
  assert.equal(suggestions[0].id, 4);
  assert.equal(suggestions[1].id, 5);
  assert.equal(suggestions[2].id, 6);
});
