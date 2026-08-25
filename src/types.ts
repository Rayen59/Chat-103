export interface User {
  id: string;
  email: string;
  username: string;
  avatar: string;
  bio?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: string;
  createdAt: string;
  badges?: string[];
  role?: 'admin' | 'user';
  isBanned?: boolean;
  bannedUntil?: string | null; // ISO timestamp or 'permanent'
  banReason?: string;
  bannedAt?: string;
  mutedConversationIds?: string[]; // IDs of conversations/groups muted by this user
  blockedUserIds?: string[];
  closeFriendsUserIds?: string[]; // User IDs in user's Close Friends list
  isPrivate?: boolean;
  hideEmail?: boolean;
  hasAccount?: boolean;
  acceptedPrivacyTerms?: boolean;
  privacyAcceptedAt?: string;
  warnings?: {
    id: string;
    reason: string;
    date: string;
    adminId?: string;
  }[];
}

export interface NoteMusic {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl?: string;
  duration?: number;
}

export interface Note {
  id: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  title?: string;
  content: string;
  category?: 'General' | 'Work' | 'Personal' | 'Ideas' | 'Urgent' | 'Drafts';
  color?: string; // Hex or theme identifier
  moodEmoji?: string;
  music?: NoteMusic;
  isPinned?: boolean;
  likes?: string[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface ChatRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string;
  toUserId: string;
  toUserName?: string;
  toUserAvatar?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface ReactionMap {
  [emoji: string]: string[]; // emoji -> array of userIds who reacted
}

export interface ReplyToMessage {
  id: string;
  senderName: string;
  text: string;
  type: string;
}

export interface PollOption {
  id: string;
  text: string;
  voterIds: string[]; // user IDs who voted for this option
}

export interface PollData {
  id: string;
  question: string;
  options: PollOption[];
  creatorId: string;
  creatorName: string;
  allowMultipleAnswers?: boolean;
  isClosed?: boolean;
  totalVotes: number;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  groupId?: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'voice' | 'file' | 'gif' | 'poll' | 'sticker';
  mediaUrl?: string;
  mediaName?: string;
  mediaSize?: string;
  duration?: number; // for audio/video/voice in seconds
  reactions: ReactionMap;
  likes: string[]; // array of userIds who double-clicked / liked
  replyTo?: ReplyToMessage;
  poll?: PollData;
  voiceAnalysis?: any;
  customSticker?: any;
  storyShare?: any;
  isEdited?: boolean;
  editedAt?: string;
  isDeletedForAll?: boolean;
  deletedForUsers?: string[]; // array of userIds who deleted for themselves
  isSystem?: boolean;
  createdAt: string;
}

export interface GroupBadge {
  userId: string;
  badgeName: string;
  color: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  avatar: string;
  creatorId: string;
  adminIds: string[];
  memberIds: string[];
  removedMemberIds?: string[]; // Banned/removed members who cannot rejoin via invite code unless re-added by an admin
  restrictedMemberIds?: string[]; // Members restricted to read-only mode
  announcementMode?: boolean; // When true, only admins can post
  onlyAdminMessagesVisible?: boolean; // When true, members only see admin & system messages
  isPrivate: boolean;
  password?: string;
  inviteCode: string;
  themeColor: string; // e.g. '#ec4899', '#3b82f6', '#10b981'
  badges: GroupBadge[];
  photoChangeHistory?: string[]; // ISO timestamps of photo updates (max 5 per 48h)
  historyVisibleToNewMembers?: boolean; // When false, new members only see messages from after they joined
  memberJoinedAt?: { [userId: string]: string }; // Timestamp when user joined the group
  createdAt: string;
}

export interface Conversation {
  id: string;
  type: 'dm' | 'group';
  participants: string[]; // user IDs
  groupId?: string;
  isOfficialChannel?: boolean; // When true, pinned official MK broadcast channel
  mutedByUsers?: string[]; // Array of user IDs who have muted this conversation
  lastMessage?: {
    text: string;
    senderId: string;
    senderName: string;
    createdAt: string;
  };
  updatedAt: string;
}

export interface ActiveCall {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  targetId: string;
  targetName: string;
  type: 'voice' | 'video';
  status: 'ringing' | 'connected' | 'ended';
  isMuted?: boolean;
  isVideoOff?: boolean;
  isVoiceEnhanced?: boolean; // AI Voice Clarity feature
  startedAt?: string;
}

export interface TopContact {
  name: string;
  avatar: string;
  messages: number;
  hoursSpent: string;
  responseTime: string;
}

export interface UserAnalytics {
  userId: string;
  hoursSpent: number;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  totalMessages: number;
  totalVoiceNotes: number;
  totalMediaShared: number;
  totalCallsMade: number;
  totalCallDurationMinutes: number;
  activeStreakDays: number;
  activeHours: { hour: string; count: number }[];
  dailyTrends: { date: string; sent: number; received: number }[];
  mediaBreakdown: { name: string; value: number }[];
  engagementScore: number; // 0 - 100
  topContacts: TopContact[];
}

export interface GifItem {
  id: string;
  title: string;
  url: string;
  category?: string;
  tags?: string[];
  aspect?: string;
}

export interface StickerItem {
  id: string;
  title: string;
  url: string;
  category: string;
  tags: string[];
  isFeather?: boolean;
  animationStyle?: "feather-float" | "feather-sway" | "glow" | "gold" | "pulse" | "bounce" | "none";
  isCustom?: boolean;
  shape?: "circle" | "rounded" | "heart" | "star" | "feather" | "stamp";
  outlineStyle?: "white" | "cyan" | "gold" | "none";
  caption?: string;
}

export interface StoryComment {
  id: string;
  storyId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: string;
  parentId?: string; // For nested reply threads
  replyToUserName?: string;
  likes?: string[]; // user IDs who liked the comment
}

export interface StoryViewer {
  userId: string;
  userName: string;
  userAvatar: string;
  viewedAt: string;
  reaction?: string;
}

export interface StoryStickerOverlay {
  id: string;
  emoji?: string;
  url?: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  scale: number;
  rotation: number;
}

export interface StoryTextOverlay {
  id: string;
  text: string;
  color?: string;
  background?: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  scale?: number;
  font?: string;
  fontSize?: number;
  fontFamily?: string;
  bgStyle?: string;
  align?: string;
  shadow?: boolean;
}

export interface StoryMediaMontage {
  filter: 'none' | 'vivid' | 'cyberpunk' | 'vintage' | 'noir' | 'sunset' | 'glacier' | 'dramatic' | 'golden' | 'retro_vhs';
  brightness: number; // 50 - 150 (default 100)
  contrast: number; // 50 - 150 (default 100)
  saturation: number; // 0 - 200 (default 100)
  sepia: number; // 0 - 100 (default 0)
  blur: number; // 0 - 10 (default 0)
  hueRotate: number; // 0 - 360 (default 0)
  aspectRatio: '9:16' | '1:1' | '4:5' | 'free';
  videoTrimStart?: number; // seconds
  videoTrimEnd?: number; // seconds (max 60)
  videoSpeed?: number; // 0.5, 1, 1.25, 1.5, 2
  isMuted?: boolean;
  stickers?: StoryStickerOverlay[];
  textOverlays?: StoryTextOverlay[];
  drawingDataUrl?: string;
}

export type StoryTypographyTemplate =
  | 'lite_minimal'
  | 'neon_glow'
  | 'editorial_serif'
  | 'gradient_bold'
  | 'typewriter'
  | 'cyberpunk'
  | 'golden_luxury'
  | 'midnight_poetry'
  | 'breaking_news';

export interface StoryTextStyle {
  template: StoryTypographyTemplate;
  backgroundGradient: string;
  textColor: string;
  fontSize: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  textAlign: 'left' | 'center' | 'right';
  fontFamily: string;
  highlightCard?: boolean;
}

export interface StoryTag {
  id: string;
  type: 'user' | 'hashtag' | 'location' | 'music';
  label: string;
  value: string;
  userId?: string;
}

export interface StoryAnonymousPrompt {
  id: string;
  question: string; // e.g. "Send me anonymous messages!", "Ask me anything honestly 🤫"
  stickerStyle?: "ngl-gradient" | "neon-cyan" | "gold-luxury" | "dark-glass" | "bubble-gum";
  themeColor?: string;
  placeholder?: string;
}

export interface StoryAnonymousAnswer {
  id: string;
  storyId: string;
  text: string;
  createdAt: string;
  anonymousLabel: string; // e.g. "Anonymous #1", "Secret Admirer", "Mysterious Friend"
  isSharedToStory?: boolean;
  sharedStoryId?: string;
}

export interface StorySharedAnswerData {
  question: string;
  answerText: string;
  anonymousLabel: string;
  originalStoryId?: string;
  stickerStyle?: string;
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: 'image' | 'video' | 'text' | 'anonymous_qa';
  mediaUrl?: string;
  videoDuration?: number; // max 60s
  textContent?: string;
  textStyle?: StoryTextStyle;
  caption?: string;
  captionPosition?: { x: number; y: number };
  isCloseFriendsOnly?: boolean; // When true, only users in creator's closeFriendsUserIds list can view (green ring badge)
  disableSharing?: boolean; // When true, recipients cannot forward/share story to chats
  hiddenFromUserIds?: string[]; // Specific users hidden from viewing this story
  montage?: StoryMediaMontage;
  tags?: StoryTag[];
  location?: string;
  music?: {
    title: string;
    artist: string;
    previewUrl?: string;
  };
  anonymousPrompt?: StoryAnonymousPrompt;
  anonymousAnswers?: StoryAnonymousAnswer[];
  sharedAnswerData?: StorySharedAnswerData;
  reactions: { [emoji: string]: string[] }; // emoji -> array of userIds
  comments: StoryComment[];
  viewers: StoryViewer[];
  duration: number; // in seconds (for display slide duration)
  createdAt: string;
  expiresAt: string;
  isEdited?: boolean;
  editedAt?: string;
}

export interface UserStoriesGroup {
  user: User;
  stories: Story[];
  hasUnviewed: boolean;
  lastUpdated: string;
}

export interface UserReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterAvatar?: string;
  targetType: 'user' | 'message' | 'group';
  targetId: string;
  targetName?: string;
  targetDetails?: {
    username?: string;
    userId?: string;
    userAvatar?: string;
    messageText?: string;
    messageType?: string;
    conversationId?: string;
    groupId?: string;
    groupName?: string;
  };
  reason: string; // 'Harassment' | 'Inappropriate Content' | 'Spam / Scam' | 'Hate Speech' | 'Violence' | 'Other'
  customExplanation?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  aiAnalysis?: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    summary: string;
    suggestedAction: string;
    confidenceScore?: number;
    reasoning?: string;
  };
  adminNotes?: string;
  adminReply?: string;
  adminReplyAt?: string;
  actionTaken?: string;
  createdAt: string;
  updatedAt?: string;
}

