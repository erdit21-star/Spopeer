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

    await Post.bulkCreate([
      {
        userId: coach.id,
        content: 'Just finished an amazing training session with my team! The energy was incredible. 💪',
        sport: 'Soccer',
        likesCount: 24,
        commentsCount: 5
      },
      {
        userId: club.id,
        content: 'Excited to announce our new partnership with Elite Sports Academy! 🎉 More opportunities coming soon.',
        sport: 'Basketball',
        likesCount: 45,
        commentsCount: 12
      },
      {
        userId: professional.id,
        content: 'New blog post: How nutrition impacts athletic performance. Check it out!',
        sport: 'General',
        likesCount: 18,
        commentsCount: 8
      },
      {
        userId: athlete.id,
        content: 'Personal best today! Breaking my previous record feels amazing. Thanks to my coach for the guidance! 🏃‍♂️',
        sport: 'Running',
        likesCount: 56,
        commentsCount: 15
      }
    ]);
    console.log('  ✅ 4 posts created.');

    // Update post counts
    await athlete.update({ postsCount: 1 });
    await coach.update({ postsCount: 1 });
    await club.update({ postsCount: 1 });
    await professional.update({ postsCount: 1 });

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

