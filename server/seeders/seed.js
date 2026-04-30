// Updated
/**
 * Database Seed Script
 * Run: node seeders/seed.js
 * Creates default admin user and sample data
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { sequelize } = require('../config/database');
const User = require('../models/User')(sequelize);
const Post = require('../models/Post')(sequelize);
const Connection = require('../models/Connection')(sequelize);
const Message = require('../models/Message')(sequelize);

// Set up associations
User.hasMany(Post, { foreignKey: 'userId' });
Post.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Connection, { foreignKey: 'followerId' });
User.hasMany(Connection, { foreignKey: 'followingId' });
User.hasMany(Message, { foreignKey: 'senderId' });
User.hasMany(Message, { foreignKey: 'receiverId' });

async function seed() {
  try {
    console.log('🌱 Starting database seed...\n');
    const isProduction = process.env.NODE_ENV === 'production';
    const allowDestructiveSeed = process.env.ALLOW_DESTRUCTIVE_SEED === 'true';

    if (isProduction && !allowDestructiveSeed) {
      throw new Error('Refusing to run destructive seed in production. Set ALLOW_DESTRUCTIVE_SEED=true only for intentional one-off resets.');
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const athleteEmail = process.env.SEED_ATHLETE_EMAIL;
    const coachEmail = process.env.SEED_COACH_EMAIL;
    const clubEmail = process.env.SEED_CLUB_EMAIL;
    const professionalEmail = process.env.SEED_PROFESSIONAL_EMAIL;
    const seedUserPassword = process.env.SEED_USER_PASSWORD;

    if (!adminEmail || !adminPassword || !athleteEmail || !coachEmail || !clubEmail || !professionalEmail || !seedUserPassword) {
      throw new Error('Missing seed credentials. Set ADMIN_EMAIL, ADMIN_PASSWORD, SEED_ATHLETE_EMAIL, SEED_COACH_EMAIL, SEED_CLUB_EMAIL, SEED_PROFESSIONAL_EMAIL, and SEED_USER_PASSWORD.');
    }

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connected.');

    // Sync tables
    await sequelize.sync({ force: true }); // WARNING: drops all tables
    console.log('✅ Tables created.\n');

    // ─── CREATE USERS ───
    console.log('Creating users...');

    const admin = await User.create({
      email: adminEmail,
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'Spopeer',
      role: 'admin',
      sport: 'General',
      bio: 'Spopeer Platform Administrator',
      location: 'Global',
      verified: true,
      subscription: 'elite'
    });
    console.log(`  ✅ Admin: ${admin.email}`);

    const athlete = await User.create({
      email: athleteEmail,
      password: seedUserPassword,
      firstName: 'John',
      lastName: 'Smith',
      role: 'athlete',
      sport: 'Running',
      bio: 'Passionate runner, always pushing limits. Looking for coaching and training partners.',
      location: 'New York, USA',
      verified: true,
      subscription: 'free'
    });
    console.log(`  ✅ Athlete: ${athlete.email}`);

    const coach = await User.create({
      email: coachEmail,
      password: seedUserPassword,
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'coach',
      sport: 'Soccer',
      bio: 'Certified soccer coach with 10+ years of experience. Specializing in youth development.',
      location: 'Los Angeles, USA',
      verified: true,
      subscription: 'pro'
    });
    console.log(`  ✅ Coach: ${coach.email}`);

    const club = await User.create({
      email: clubEmail,
      password: seedUserPassword,
      firstName: 'Elite',
      lastName: 'Sports Club',
      role: 'club',
      sport: 'Basketball',
      bio: 'Premier basketball club. Training top talent, building champions.',
      location: 'Chicago, USA',
      verified: true,
      subscription: 'elite'
    });
    console.log(`  ✅ Club: ${club.email}`);

    const professional = await User.create({
      email: professionalEmail,
      password: seedUserPassword,
      firstName: 'Emma',
      lastName: 'Wilson',
      role: 'supportive_professional',
      sport: 'General',
      profession: 'Sports Nutritionist',
      bio: 'Certified sports nutritionist helping athletes optimize performance.',
      location: 'Boston, USA',
      verified: true,
      subscription: 'pro'
    });
    console.log(`  ✅ Professional: ${professional.email}`);

    // ─── CREATE POSTS ───
    console.log('\nCreating posts...');

    const seededPosts = [
      // Athlete
      { userId: athlete.id, content: 'Personal best today! Breaking my previous record feels amazing. Thanks coach! 🏃‍♂️', sport: 'Running', likesCount: 56, commentsCount: 15 },
      { userId: athlete.id, content: 'Easy recovery run this morning. Keeping the legs fresh for race day.', sport: 'Running', likesCount: 14, commentsCount: 3 },
      { userId: athlete.id, content: 'Strength day complete: squats, lunges, core. Consistency beats motivation.', sport: 'Running', likesCount: 22, commentsCount: 6 },
      { userId: athlete.id, content: 'Any tips for pacing the first 2k of a 10k race?', sport: 'Running', likesCount: 10, commentsCount: 9 },
      { userId: athlete.id, content: 'Weekend target: 18km long run and mobility session.', sport: 'Running', likesCount: 19, commentsCount: 4 },
      // Coach
      { userId: coach.id, content: 'Just finished an amazing training session with my team! The energy was incredible. 💪', sport: 'Soccer', likesCount: 24, commentsCount: 5 },
      { userId: coach.id, content: 'Drill of the day: 3v2 transition game for better decision making in the final third.', sport: 'Soccer', likesCount: 31, commentsCount: 7 },
      { userId: coach.id, content: 'Reminder for youth players: first touch and scanning are non-negotiable fundamentals.', sport: 'Soccer', likesCount: 18, commentsCount: 5 },
      { userId: coach.id, content: 'Looking for two assistant coaches for our summer camp in LA.', sport: 'Soccer', likesCount: 12, commentsCount: 6 },
      { userId: coach.id, content: 'If your team struggles in build-up, simplify the first pass and body shape.', sport: 'Soccer', likesCount: 26, commentsCount: 8 },
      // Club
      { userId: club.id, content: 'Excited to announce our new partnership with Elite Sports Academy! 🎉', sport: 'Basketball', likesCount: 45, commentsCount: 12 },
      { userId: club.id, content: 'Open tryouts this Saturday at 10:00 AM. Guards and forwards welcome.', sport: 'Basketball', likesCount: 38, commentsCount: 11 },
      { userId: club.id, content: 'Our U18 team is heading to the regional finals. Proud of the work this season.', sport: 'Basketball', likesCount: 52, commentsCount: 14 },
      { userId: club.id, content: 'Hiring: strength & conditioning coach (part-time).', sport: 'Basketball', likesCount: 16, commentsCount: 5 },
      { userId: club.id, content: 'Community clinic highlights are now live. Thanks to everyone who joined!', sport: 'Basketball', likesCount: 27, commentsCount: 7 },
      // Supportive professional
      { userId: professional.id, content: 'New blog post: How nutrition impacts athletic performance.', sport: 'General', likesCount: 18, commentsCount: 8 },
      { userId: professional.id, content: 'Pre-training snack idea: banana + greek yogurt + honey + pinch of salt.', sport: 'General', likesCount: 21, commentsCount: 6 },
      { userId: professional.id, content: 'Hydration tip: don’t wait for thirst during sessions longer than 60 minutes.', sport: 'General', likesCount: 25, commentsCount: 4 },
      { userId: professional.id, content: 'Athletes: track sleep quality for 2 weeks and compare with training output.', sport: 'General', likesCount: 13, commentsCount: 3 },
      { userId: professional.id, content: 'Q&A tonight: supplements that actually matter vs hype.', sport: 'General', likesCount: 17, commentsCount: 10 }
    ];

    await Post.bulkCreate(seededPosts);
    console.log('  ✅ ' + seededPosts.length + ' posts created.');

    // Update post counts
    await athlete.update({ postsCount: seededPosts.filter((p) => p.userId === athlete.id).length });
    await coach.update({ postsCount: seededPosts.filter((p) => p.userId === coach.id).length });
    await club.update({ postsCount: seededPosts.filter((p) => p.userId === club.id).length });
    await professional.update({ postsCount: seededPosts.filter((p) => p.userId === professional.id).length });

    // ─── CREATE CONNECTIONS ───
    console.log('\nCreating connections...');

    const connections = [
      { followerId: athlete.id, followingId: coach.id },
      { followerId: athlete.id, followingId: club.id },
      { followerId: athlete.id, followingId: professional.id },
      { followerId: coach.id, followingId: athlete.id },
      { followerId: coach.id, followingId: club.id },
      { followerId: club.id, followingId: coach.id },
      { followerId: club.id, followingId: professional.id },
      { followerId: professional.id, followingId: athlete.id },
      { followerId: professional.id, followingId: coach.id }
    ];

    await Connection.bulkCreate(connections);
    console.log(`  ✅ ${connections.length} connections created.`);

    // Update follower/following counts
    await athlete.update({ followingCount: 3, followersCount: 2 });
    await coach.update({ followingCount: 2, followersCount: 3 });
    await club.update({ followingCount: 2, followersCount: 2 });
    await professional.update({ followingCount: 2, followersCount: 2 });

    // ─── CREATE MESSAGES ───
    console.log('\nCreating messages...');

    await Message.bulkCreate([
      {
        senderId: coach.id,
        receiverId: athlete.id,
        content: 'Hey John! Great performance today!',
        read: true
      },
      {
        senderId: athlete.id,
        receiverId: coach.id,
        content: 'Thanks Sarah! Your coaching really paid off.',
        read: true
      },
      {
        senderId: coach.id,
        receiverId: athlete.id,
        content: 'Keep it up! Same time next week?',
        read: false
      },
      {
        senderId: club.id,
        receiverId: athlete.id,
        content: 'Interested in joining our club? We think you would be a great fit.',
        read: true
      },
      {
        senderId: athlete.id,
        receiverId: club.id,
        content: 'I am very interested! Can we schedule a trial?',
        read: true
      }
    ]);
    console.log('  ✅ 5 messages created.');

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('─── Seed Users ───');
    console.log(`Admin:        ${admin.email}`);
    console.log(`Athlete:      ${athlete.email}`);
    console.log(`Coach:        ${coach.email}`);
    console.log(`Club:         ${club.email}`);
    console.log(`Professional: ${professional.email}`);
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();

