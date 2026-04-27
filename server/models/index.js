// Updated
/**
 * Models Index - Initialize all models and set up associations
 */
const { sequelize } = require('../config/database');

// Initialize models
const User = require('./User')(sequelize);
const Post = require('./Post')(sequelize);
const Connection = require('./Connection')(sequelize);
const Message = require('./Message')(sequelize);
const Conversation = require('./Conversation')(sequelize);
const ConversationParticipant = require('./ConversationParticipant')(sequelize);
const Job = require('./Job')(sequelize);
const Like = require('./Like')(sequelize);
const Comment = require('./Comment')(sequelize);
const Notification = require('./Notification')(sequelize);
const Group = require('./Group')(sequelize);
const GroupMember = require('./GroupMember')(sequelize);
const Listing = require('./Listing')(sequelize);
const Thread = require('./Thread')(sequelize);
const Reply = require('./Reply')(sequelize);
const Reel = require('./Reel')(sequelize);
const SavedPost = require('./SavedPost')(sequelize);
const Sponsorship = require('./Sponsorship')(sequelize);
const PasswordResetToken = require('./PasswordResetToken')(sequelize);
const Media = require('./Media')(sequelize);
const Report = require('./Report')(sequelize);
const Block = require('./Block')(sequelize);
const AdminAuditLog = require('./AdminAuditLog')(sequelize);
const RefreshSession = require('./RefreshSession')(sequelize);

// ─── ASSOCIATIONS ───

// User <-> Post
User.hasMany(Post, { foreignKey: 'userId', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'userId', as: 'author' });

// User <-> Connection (follower/following)
User.hasMany(Connection, { foreignKey: 'followerId', as: 'following' });
User.hasMany(Connection, { foreignKey: 'followingId', as: 'followers' });
Connection.belongsTo(User, { foreignKey: 'followerId', as: 'follower' });
Connection.belongsTo(User, { foreignKey: 'followingId', as: 'followedUser' });

// User <-> Message
User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
User.hasMany(Message, { foreignKey: 'receiverId', as: 'receivedMessages' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

// Conversation messaging
Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });
Conversation.hasMany(ConversationParticipant, { foreignKey: 'conversationId', as: 'participants' });
ConversationParticipant.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });
User.hasMany(ConversationParticipant, { foreignKey: 'userId', as: 'conversationMemberships' });
ConversationParticipant.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.belongsToMany(Conversation, {
  through: ConversationParticipant,
  foreignKey: 'userId',
  otherKey: 'conversationId',
  as: 'conversations'
});
Conversation.belongsToMany(User, {
  through: ConversationParticipant,
  foreignKey: 'conversationId',
  otherKey: 'userId',
  as: 'users'
});

// User <-> Job
User.hasMany(Job, { foreignKey: 'clubId', as: 'jobs' });
Job.belongsTo(User, { foreignKey: 'clubId', as: 'club' });

// User <-> Like <-> Post
User.hasMany(Like, { foreignKey: 'userId' });
Post.hasMany(Like, { foreignKey: 'postId', as: 'likes' });
Like.belongsTo(User, { foreignKey: 'userId' });
Like.belongsTo(Post, { foreignKey: 'postId' });

// User <-> Comment <-> Post
User.hasMany(Comment, { foreignKey: 'userId' });
Post.hasMany(Comment, { foreignKey: 'postId', as: 'comments' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'author' });
Comment.belongsTo(Post, { foreignKey: 'postId' });

// User <-> Notification
User.hasMany(Notification, { foreignKey: 'recipientId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });
Notification.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// User <-> Group <-> GroupMember
User.hasMany(Group, { foreignKey: 'createdBy', as: 'ownedGroups' });
Group.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Group.hasMany(GroupMember, { foreignKey: 'groupId', as: 'members' });
GroupMember.belongsTo(Group, { foreignKey: 'groupId' });
User.hasMany(GroupMember, { foreignKey: 'userId', as: 'groupMemberships' });
GroupMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> Listing (marketplace)
User.hasMany(Listing, { foreignKey: 'sellerId', as: 'listings' });
Listing.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });

// User <-> Thread <-> Reply (forums)
User.hasMany(Thread, { foreignKey: 'userId', as: 'threads' });
Thread.belongsTo(User, { foreignKey: 'userId', as: 'author' });
Group.hasMany(Thread, { foreignKey: 'groupId', as: 'threads' });
Thread.belongsTo(Group, { foreignKey: 'groupId', as: 'group' });
Thread.hasMany(Reply, { foreignKey: 'threadId', as: 'replies' });
Reply.belongsTo(Thread, { foreignKey: 'threadId' });
User.hasMany(Reply, { foreignKey: 'userId', as: 'replies' });
Reply.belongsTo(User, { foreignKey: 'userId', as: 'author' });

// User <-> Reel (highlights)
User.hasMany(Reel, { foreignKey: 'userId', as: 'reels' });
Reel.belongsTo(User, { foreignKey: 'userId', as: 'creator' });

// User <-> SavedPost <-> Post
User.hasMany(SavedPost, { foreignKey: 'userId', as: 'saved' });
SavedPost.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Post.hasMany(SavedPost, { foreignKey: 'postId', as: 'savedBy' });
SavedPost.belongsTo(Post, { foreignKey: 'postId', as: 'post' });

// User <-> Sponsorship
User.hasMany(Sponsorship, { foreignKey: 'userId', as: 'sponsorships' });
Sponsorship.belongsTo(User, { foreignKey: 'userId', as: 'author' });

// User <-> PasswordResetToken
User.hasMany(PasswordResetToken, { foreignKey: 'userId', as: 'passwordResetTokens' });
PasswordResetToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> Media
User.hasMany(Media, { foreignKey: 'userId', as: 'media' });
Media.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

// User <-> Report
User.hasMany(Report, { foreignKey: 'reporterId', as: 'reports' });
Report.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });

// User <-> Block
User.hasMany(Block, { foreignKey: 'blockerId', as: 'blocksGiven' });
User.hasMany(Block, { foreignKey: 'blockedId', as: 'blocksReceived' });
Block.belongsTo(User, { foreignKey: 'blockerId', as: 'blocker' });
Block.belongsTo(User, { foreignKey: 'blockedId', as: 'blocked' });

// AdminAuditLog -> User
AdminAuditLog.belongsTo(User, { foreignKey: 'adminId', as: 'admin' });

// User <-> RefreshSession
User.hasMany(RefreshSession, { foreignKey: 'userId', as: 'refreshSessions' });
RefreshSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  User,
  Post,
  Connection,
  Message,
  Conversation,
  ConversationParticipant,
  Job,
  Like,
  Comment,
  Notification,
  Group,
  GroupMember,
  Listing,
  Thread,
  Reply,
  Reel,
  SavedPost,
  Sponsorship,
  PasswordResetToken,
  Media,
  Report,
  Block,
  AdminAuditLog,
  RefreshSession
};

