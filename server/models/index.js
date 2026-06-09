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
const Event = require('./Event')(sequelize);
const EventResponse = require('./EventResponse')(sequelize);
const SavedListing = require('./SavedListing')(sequelize);
const Inquiry = require('./Inquiry')(sequelize);
const Story = require('./Story')(sequelize);
const MarketplaceAnalyticsEvent = require('./MarketplaceAnalyticsEvent')(sequelize);
const BreachIncident = require('./BreachIncident')(sequelize);
const PostMedia = require('./PostMedia')(sequelize);
const PostShare = require('./PostShare')(sequelize);
const UserPrivacySettings = require('./UserPrivacySettings')(sequelize);

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
User.hasMany(Inquiry, { foreignKey: 'buyerId', as: 'sentMarketplaceInquiries' });
User.hasMany(Inquiry, { foreignKey: 'sellerId', as: 'receivedMarketplaceInquiries' });
Inquiry.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });
Inquiry.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });
Listing.hasMany(Inquiry, { foreignKey: 'listingId', as: 'inquiries' });
Inquiry.belongsTo(Listing, { foreignKey: 'listingId', as: 'listing' });
User.hasMany(SavedListing, { foreignKey: 'userId', as: 'savedListings' });
SavedListing.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Listing.hasMany(SavedListing, { foreignKey: 'listingId', as: 'savedBy' });
SavedListing.belongsTo(Listing, { foreignKey: 'listingId', as: 'listing' });

// Marketplace Analytics Events
Listing.hasMany(MarketplaceAnalyticsEvent, { foreignKey: 'listingId', as: 'analyticsEvents' });
MarketplaceAnalyticsEvent.belongsTo(Listing, { foreignKey: 'listingId', as: 'listing' });
User.hasMany(MarketplaceAnalyticsEvent, { foreignKey: 'userId', as: 'analyticsEvents' });
MarketplaceAnalyticsEvent.belongsTo(User, { foreignKey: 'userId', as: 'user' });

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

// User <-> Story
User.hasMany(Story, { foreignKey: 'userId', as: 'stories' });
Story.belongsTo(User, { foreignKey: 'userId', as: 'author' });

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

// Post <-> PostMedia
Post.hasMany(PostMedia, { foreignKey: 'postId', as: 'postMedia' });
PostMedia.belongsTo(Post, { foreignKey: 'postId', as: 'post' });
User.hasMany(PostMedia, { foreignKey: 'userId', as: 'postMedia' });
PostMedia.belongsTo(User, { foreignKey: 'userId', as: 'uploader' });

// Post <-> PostShare
Post.hasMany(PostShare, { foreignKey: 'postId', as: 'shares' });
PostShare.belongsTo(Post, { foreignKey: 'postId', as: 'originalPost' });
User.hasMany(PostShare, { foreignKey: 'userId', as: 'postShares' });
PostShare.belongsTo(User, { foreignKey: 'userId', as: 'sharer' });

// Post <-> Group
Group.hasMany(Post, { foreignKey: 'groupId', as: 'posts' });
Post.belongsTo(Group, { foreignKey: 'groupId', as: 'group' });

// User <-> UserPrivacySettings (1:1)
User.hasOne(UserPrivacySettings, { foreignKey: 'userId', as: 'privacySettings' });
UserPrivacySettings.belongsTo(User, { foreignKey: 'userId', as: 'user' });

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
  RefreshSession,
  Event,
  EventResponse,
  SavedListing,
  Inquiry,
  Story,
  MarketplaceAnalyticsEvent,
  BreachIncident,
  PostMedia,
  PostShare,
  UserPrivacySettings
};

