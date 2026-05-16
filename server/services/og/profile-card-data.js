const slugify = require('slugify');
const { Op } = require('sequelize');
const { User } = require('../../models');

function getDefaultStyleForType(userType) {
  const map = {
    athlete: 'athlete_neon',
    coach: 'coach_tactical',
    club: 'club_legacy',
    professional: 'professional_premium',
    supportive_professional: 'professional_premium'
  };

  return map[userType] || 'athlete_neon';
}

function deriveUserType(profile) {
  return String(profile.userType || profile.role || 'athlete').toLowerCase();
}

function deriveSlug(profile) {
  if (profile.publicSlug) return String(profile.publicSlug);
  if (profile.username) return String(profile.username);
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
  if (name) {
    return slugify(name, { lower: true, strict: true, trim: true });
  }
  return String(profile.id);
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function normalizeProfileForCard(profile) {
  const userType = deriveUserType(profile);
  const publicSlug = deriveSlug(profile);
  const ext = profile.extendedProfile && typeof profile.extendedProfile === 'object' ? profile.extendedProfile : {};
  const stats = profile.stats && typeof profile.stats === 'object' ? profile.stats : {};

  return {
    id: profile.id,
    userId: profile.id,
    publicSlug,
    userType,
    cardStyle: profile.cardStyle || ext.cardStyle || getDefaultStyleForType(userType),

    fullName: profile.displayName || [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() || 'Spopeer Member',
    headline: profile.headline || ext.headline || profile.profession || '',
    sport: profile.sport || profile.primarySport || ext.sport || '',
    position: profile.position || ext.position || '',
    clubName: profile.clubName || profile.currentTeam || ext.clubName || '',
    country: profile.country || profile.nationality || ext.country || '',
    city: profile.city || ext.city || profile.location || '',
    age: profile.age || ext.age || '',
    height: profile.height || ext.height || '',
    weight: profile.weight || ext.weight || '',
    dominantSide: profile.dominantSide || ext.dominantSide || '',

    verified: Boolean(profile.verified),
    followersCount: Number(profile.followersCount || 0),
    rating: Number(profile.rating || ext.rating || 0),

    profilePhotoUrl: profile.profilePhotoUrl || profile.avatarUrl || ext.profilePhotoUrl || '',
    clubLogoUrl: profile.clubLogoUrl || ext.clubLogoUrl || '',

    stats,
    achievements: toArray(profile.achievements || ext.achievements),
    services: toArray(profile.services || ext.services),

    ogImageUrl: profile.ogImageUrl || '',
    profileUrl: `${process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL || process.env.APP_URL || 'https://spopeer.onrender.com'}/u/${publicSlug}`
  };
}

async function getProfileCardDataBySlug(slug) {
  const input = String(slug || '').trim();
  if (!input) return null;

  const profile = await User.findOne({
    where: {
      isActive: true,
      [Op.or]: [
        { publicSlug: input },
        { username: input },
        { id: /^\d+$/.test(input) ? Number(input) : -1 }
      ]
    },
    attributes: { exclude: ['password'] }
  });

  if (!profile) return null;
  return normalizeProfileForCard(profile);
}

async function updateProfileOgImage(profileId, imageUrl) {
  await User.update(
    {
      ogImageUrl: imageUrl,
      ogImageUpdatedAt: new Date()
    },
    {
      where: { id: profileId }
    }
  );
}

module.exports = {
  getProfileCardDataBySlug,
  updateProfileOgImage,
  normalizeProfileForCard,
  getDefaultStyleForType
};
