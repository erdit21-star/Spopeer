// Unit tests for public/js/profile-normalizer.js
// Run via: cd server && npx jest tests/profile-normalizer.test.js

const ProfileNormalizer = require('../../public/js/profile-normalizer.js');

describe('ProfileNormalizer', () => {
  describe('normalizeProfile', () => {
    test('mirrors sport to primarySport and vice versa', () => {
      const result = ProfileNormalizer.normalizeProfile({ sport: 'Football' });
      expect(result.primarySport).toBe('Football');
      expect(result.sport).toBe('Football');
    });

    test('mirrors primarySport to sport', () => {
      const result = ProfileNormalizer.normalizeProfile({ primarySport: 'Tennis' });
      expect(result.sport).toBe('Tennis');
      expect(result.primarySport).toBe('Tennis');
    });

    test('mirrors playingLevel to sportsLevel', () => {
      const result = ProfileNormalizer.normalizeProfile({ playingLevel: 'Pro' });
      expect(result.sportsLevel).toBe('Pro');
    });

    test('mirrors sportsLevel to playingLevel', () => {
      const result = ProfileNormalizer.normalizeProfile({ sportsLevel: 'Amateur' });
      expect(result.playingLevel).toBe('Amateur');
    });

    test('resolves experience from sportsYears', () => {
      const result = ProfileNormalizer.normalizeProfile({ sportsYears: 5 });
      expect(result.experience).toBe(5);
    });

    test('resolves experience from profExperience', () => {
      const result = ProfileNormalizer.normalizeProfile({ profExperience: 3 });
      expect(result.experience).toBe(3);
    });

    test('resolves experience from yearsOfExperience', () => {
      const result = ProfileNormalizer.normalizeProfile({ yearsOfExperience: 7 });
      expect(result.experience).toBe(7);
    });

    test('resolves experience from yearsOfCoaching', () => {
      const result = ProfileNormalizer.normalizeProfile({ yearsOfCoaching: 10 });
      expect(result.experience).toBe(10);
    });

    test('experience as string numeric converts to number', () => {
      const result = ProfileNormalizer.normalizeProfile({ experience: '8' });
      expect(result.experience).toBe(8);
    });

    test('experience returns empty string for empty input', () => {
      const result = ProfileNormalizer.normalizeProfile({});
      expect(result.experience).toBe('');
    });

    test('mirrors highestLevel to highestLevelAchieved', () => {
      const result = ProfileNormalizer.normalizeProfile({ highestLevel: 'National' });
      expect(result.highestLevelAchieved).toBe('National');
    });

    test('mirrors coaches to coachesTrainers', () => {
      const result = ProfileNormalizer.normalizeProfile({ coaches: 'John Doe' });
      expect(result.coachesTrainers).toBe('John Doe');
    });

    test('mirrors philosophy to coachingPhilosophy', () => {
      const result = ProfileNormalizer.normalizeProfile({ philosophy: 'Hard work' });
      expect(result.coachingPhilosophy).toBe('Hard work');
    });

    test('mirrors education to coachEducation', () => {
      const result = ProfileNormalizer.normalizeProfile({ education: 'BSc Sports' });
      expect(result.coachEducation).toBe('BSc Sports');
    });

    test('mirrors clubWebsite to website', () => {
      const result = ProfileNormalizer.normalizeProfile({ clubWebsite: 'https://myclub.com' });
      expect(result.website).toBe('https://myclub.com');
    });

    test('mirrors website to clubWebsite', () => {
      const result = ProfileNormalizer.normalizeProfile({ website: 'https://mysite.com' });
      expect(result.clubWebsite).toBe('https://mysite.com');
    });

    test('mirrors profEmail from contactEmail', () => {
      const result = ProfileNormalizer.normalizeProfile({ contactEmail: 'test@example.com' });
      expect(result.profEmail).toBe('test@example.com');
      expect(result.clubEmail).toBe('test@example.com');
    });

    test('preserves existing profEmail over contactEmail fallback', () => {
      const result = ProfileNormalizer.normalizeProfile({
        profEmail: 'me@example.com',
        contactEmail: 'other@example.com'
      });
      expect(result.profEmail).toBe('me@example.com');
    });

    test('handles null/undefined input gracefully', () => {
      const result = ProfileNormalizer.normalizeProfile(null);
      expect(result).toEqual(expect.objectContaining({ primarySport: '', sport: '' }));
    });

    test('handles empty object', () => {
      const result = ProfileNormalizer.normalizeProfile({});
      expect(result.primarySport).toBe('');
      expect(result.location).toBe('');
    });

    test('preserves unknown fields', () => {
      const result = ProfileNormalizer.normalizeProfile({ customField: 'value' });
      expect(result.customField).toBe('value');
    });
  });

  describe('normalizeLocation', () => {
    test('returns location field if present', () => {
      const result = ProfileNormalizer.normalizeLocation({ location: 'Madrid, Spain' });
      expect(result).toBe('Madrid, Spain');
    });

    test('builds location from city and country', () => {
      const result = ProfileNormalizer.normalizeLocation({ city: 'Barcelona', country: 'Spain' });
      expect(result).toBe('Barcelona, Spain');
    });

    test('returns city alone when country is absent', () => {
      const result = ProfileNormalizer.normalizeLocation({ city: 'Paris' });
      expect(result).toBe('Paris');
    });

    test('returns empty string when no location data', () => {
      const result = ProfileNormalizer.normalizeLocation({});
      expect(result).toBe('');
    });
  });

  describe('withProfileTimestamp', () => {
    test('adds _profileUpdatedAt field', () => {
      const result = ProfileNormalizer.withProfileTimestamp({ sport: 'Tennis' }, 12345);
      expect(result._profileUpdatedAt).toBe(12345);
    });

    test('normalizes profile while adding timestamp', () => {
      const result = ProfileNormalizer.withProfileTimestamp({ primarySport: 'Rugby' }, 1000);
      expect(result.sport).toBe('Rugby');
      expect(result._profileUpdatedAt).toBe(1000);
    });

    test('uses Date.now() when timestamp is omitted', () => {
      const before = Date.now();
      const result = ProfileNormalizer.withProfileTimestamp({ sport: 'Golf' });
      const after = Date.now();
      expect(result._profileUpdatedAt).toBeGreaterThanOrEqual(before);
      expect(result._profileUpdatedAt).toBeLessThanOrEqual(after);
    });

    test('handles null profile', () => {
      const result = ProfileNormalizer.withProfileTimestamp(null, 999);
      expect(result._profileUpdatedAt).toBe(999);
    });
  });

  describe('getProfileTimestamp', () => {
    test('returns _profileUpdatedAt as number', () => {
      expect(ProfileNormalizer.getProfileTimestamp({ _profileUpdatedAt: 5000 })).toBe(5000);
    });

    test('returns 0 for missing timestamp', () => {
      expect(ProfileNormalizer.getProfileTimestamp({})).toBe(0);
    });

    test('returns 0 for null', () => {
      expect(ProfileNormalizer.getProfileTimestamp(null)).toBe(0);
    });
  });

  describe('isIncomingNewer', () => {
    test('returns true when incoming is strictly newer', () => {
      expect(ProfileNormalizer.isIncomingNewer(2000, 1000)).toBe(true);
    });

    test('returns true when incoming equals current (same timestamp is accepted)', () => {
      expect(ProfileNormalizer.isIncomingNewer(1000, 1000)).toBe(true);
    });

    test('returns false when incoming is older', () => {
      expect(ProfileNormalizer.isIncomingNewer(500, 1000)).toBe(false);
    });

    test('returns true when current timestamp is 0', () => {
      expect(ProfileNormalizer.isIncomingNewer(1, 0)).toBe(true);
    });

    test('handles null/undefined gracefully', () => {
      expect(ProfileNormalizer.isIncomingNewer(null, null)).toBe(true);
    });
  });

  describe('matchesIdentifier', () => {
    const profile = { id: 42, userId: 99, email: 'user@example.com' };

    test('matches by numeric id', () => {
      expect(ProfileNormalizer.matchesIdentifier(profile, '42')).toBe(true);
    });

    test('matches by email (case-insensitive)', () => {
      expect(ProfileNormalizer.matchesIdentifier(profile, 'USER@EXAMPLE.COM')).toBe(true);
    });

    test('returns false for non-matching identifier', () => {
      expect(ProfileNormalizer.matchesIdentifier(profile, 'other@example.com')).toBe(false);
    });

    test('returns false for empty identifier', () => {
      expect(ProfileNormalizer.matchesIdentifier(profile, '')).toBe(false);
    });

    test('returns false for null profile', () => {
      expect(ProfileNormalizer.matchesIdentifier(null, 'user@example.com')).toBe(false);
    });
  });

  describe('getIdentifierSet', () => {
    test('returns array of all non-empty identifiers', () => {
      const profile = { id: 1, email: 'a@b.com', userEmail: 'a@b.com' };
      const set = ProfileNormalizer.getIdentifierSet(profile);
      expect(set).toContain('1');
      expect(set).toContain('a@b.com');
    });

    test('filters out empty/null values', () => {
      const profile = { id: null, userId: undefined, email: '' };
      const set = ProfileNormalizer.getIdentifierSet(profile);
      expect(set).toHaveLength(0);
    });

    test('returns empty array for null input', () => {
      expect(ProfileNormalizer.getIdentifierSet(null)).toHaveLength(0);
    });
  });
});
