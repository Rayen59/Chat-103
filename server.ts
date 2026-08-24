import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { User, Message, Group, Conversation, ActiveCall, UserAnalytics, ChatRequest, Story, StoryComment, StoryAnonymousAnswer, Note, NoteMusic, UserReport } from "./src/types";

const app = express();
const PORT = 3000;

// Lazy Gemini AI client initialization
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

export const ADMIN_USER: User = {
  id: "user_admin_mk",
  email: "addmmin@gmail.com",
  username: "MK Admin 👑",
  avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=MKAdminMasterHQ&backgroundColor=3390ec,0e1621",
  bio: "Official System Administrator & Platform Overseer of MK Wavegram.",
  status: "online",
  role: "admin",
  createdAt: "2025-01-01T00:00:00.000Z",
  badges: ["Admin Panel", "System Overseer", "Verified"],
  hasAccount: true,
  acceptedPrivacyTerms: true,
  privacyAcceptedAt: "2025-01-01T00:00:00.000Z"
};

export const MK_AI_USER: User = {
  id: "user_mk_ia",
  email: "mk.ia@wavegram.internal",
  username: "MK.ia",
  avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=MKIAGemini&backgroundColor=3390ec,17212b",
  bio: "MK Wavegram Official AI Assistant ⚡ Tag @MK.ia or @mk.ia in any chat for deep, real-time Gemini intelligence!",
  status: "online",
  createdAt: new Date("2025-01-01").toISOString(),
  badges: ["MK.ia", "Gemini Deep AI", "Verified"],
  hasAccount: true,
  acceptedPrivacyTerms: true,
  privacyAcceptedAt: new Date("2025-01-01").toISOString()
};
// Backward compatibility alias
export const WIA_AI_USER = MK_AI_USER;

export function isUserAdmin(user?: User | null): boolean {
  if (!user) return false;
  const email = (user.email || "").toLowerCase().trim();
  return (
    user.role === "admin" ||
    user.id === "user_admin_mk" ||
    email === "addmmin@gmail.com" ||
    email === "admin@gmail.com" ||
    email === "admin@wavegram.com"
  );
}

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Persistent memory storage file helper
const DB_FILE = path.join(process.cwd(), "data_store.json");

interface DataStore {
  users: User[];
  conversations: Conversation[];
  messages: Message[];
  groups: Group[];
  passwords: { [email: string]: string };
  chatRequests: ChatRequest[];
  stories: Story[];
  notes: Note[];
  reports: UserReport[];
}

let store: DataStore = {
  users: [],
  conversations: [],
  messages: [],
  groups: [],
  passwords: {},
  chatRequests: [],
  stories: [],
  notes: [],
  reports: []
};

function ensureOfficialEntities() {
  // Ensure default demo contacts exist so users always see vibrant contacts
  const defaultUsers: User[] = [
    {
      id: "user_alex",
      email: "alex@wavegram.com",
      username: "Alex Morgan",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      bio: "Exploring the world with MK-wavegram 🚀",
      status: "online",
      createdAt: "2025-01-01T00:00:00.000Z",
      badges: ["VIP", "Verified"],
      hasAccount: true,
      acceptedPrivacyTerms: true,
      privacyAcceptedAt: "2025-01-01T00:00:00.000Z"
    },
    {
      id: "user_sarah",
      email: "sarah@wavegram.com",
      username: "Sarah Jenkins",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      bio: "Design lead @ MK-wavegram | Coffee enthusiast ☕",
      status: "online",
      createdAt: "2025-01-01T00:00:00.000Z",
      badges: ["Design Team"],
      hasAccount: true,
      acceptedPrivacyTerms: true,
      privacyAcceptedAt: "2025-01-01T00:00:00.000Z"
    },
    {
      id: "user_david",
      email: "david@wavegram.com",
      username: "David Chen",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      bio: "Audio engineer & podcaster 🎙️",
      status: "away",
      createdAt: "2025-01-01T00:00:00.000Z",
      badges: ["Voice Master"],
      hasAccount: true,
      acceptedPrivacyTerms: true,
      privacyAcceptedAt: "2025-01-01T00:00:00.000Z"
    }
  ];

  defaultUsers.forEach((du) => {
    if (!store.users.some((u) => u.id === du.id || u.email.toLowerCase() === du.email.toLowerCase())) {
      store.users.push(du);
    }
    if (!store.passwords[du.email]) {
      store.passwords[du.email] = "password123";
    }
  });

  // Ensure Admin User exists and is configured
  let adminUser = store.users.find(
    (u) =>
      u.email.toLowerCase() === "addmmin@gmail.com" ||
      u.email.toLowerCase() === "admin@gmail.com" ||
      u.id === "user_admin_mk"
  );
  if (!adminUser) {
    adminUser = { ...ADMIN_USER };
    store.users.unshift(adminUser);
  } else {
    adminUser.role = "admin";
    adminUser.badges = ["Admin Panel", "System Overseer", "Verified"];
    adminUser.isBanned = false;
  }
  // Store passwords for official admin email and common spelling aliases
  store.passwords["addmmin@gmail.com"] = "adminadmin12";
  store.passwords["admin@gmail.com"] = "adminadmin12";
  store.passwords["admin@wavegram.com"] = "adminadmin12";

  // Ensure MK.ia AI exists
  if (!store.users.some((u) => u.id === MK_AI_USER.id)) {
    store.users.push(MK_AI_USER);
  }

  // Ensure all users have hasAccount
  store.users.forEach((u) => {
    if (u.hasAccount === undefined) u.hasAccount = true;
    if (u.acceptedPrivacyTerms === undefined) u.acceptedPrivacyTerms = true;
  });

  const allUserIds = store.users.map((u) => u.id);

  // Ensure Official Group
  let officialGroup = store.groups.find((g) => g.id === "group_mk_official");
  if (!officialGroup) {
    officialGroup = {
      id: "group_mk_official",
      name: "MK Official ⚡",
      description: "Official MK Wavegram Announcement & News Channel. Pinned for all users.",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=MKOfficialChannel&backgroundColor=3390ec,0e1621",
      creatorId: "user_admin_mk",
      adminIds: ["user_admin_mk"],
      memberIds: allUserIds,
      isPrivate: false,
      announcementMode: true,
      inviteCode: "MK-OFFICIAL-2026",
      themeColor: "#3390ec",
      badges: [{ userId: "user_admin_mk", badgeName: "Owner / Admin", color: "#3390ec" }],
      createdAt: "2025-01-01T00:00:00.000Z"
    };
    store.groups.unshift(officialGroup);
  } else {
    officialGroup.name = "MK Official ⚡";
    officialGroup.announcementMode = true;
    officialGroup.creatorId = "user_admin_mk";
    if (!officialGroup.adminIds.includes("user_admin_mk")) {
      officialGroup.adminIds.push("user_admin_mk");
    }
    // Add any missing users to the official group
    allUserIds.forEach((uid) => {
      if (!officialGroup!.memberIds.includes(uid)) {
        officialGroup!.memberIds.push(uid);
      }
    });
  }

  // Ensure Official Conversation
  let officialConv = store.conversations.find((c) => c.id === "conv_mk_official");
  if (!officialConv) {
    officialConv = {
      id: "conv_mk_official",
      type: "group",
      participants: allUserIds,
      groupId: "group_mk_official",
      isOfficialChannel: true,
      lastMessage: {
        text: "⚡ Welcome to MK Wavegram! Stay tuned for official announcements and security updates.",
        senderId: "user_admin_mk",
        senderName: "MK Admin 👑",
        createdAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    };
    store.conversations.unshift(officialConv);
  } else {
    officialConv.isOfficialChannel = true;
    officialConv.groupId = "group_mk_official";
    allUserIds.forEach((uid) => {
      if (!officialConv!.participants.includes(uid)) {
        officialConv!.participants.push(uid);
      }
    });
  }

  // Ensure welcome message in official channel
  if (!store.messages.some((m) => m.conversationId === "conv_mk_official")) {
    const welcomeMsg: Message = {
      id: "msg_mk_welcome_1",
      conversationId: "conv_mk_official",
      senderId: "user_admin_mk",
      senderName: "MK Admin 👑",
      senderAvatar: ADMIN_USER.avatar,
      text: "⚡ **Welcome to MK Wavegram!**\n\nThis is the official announcement channel. All major platform security patches, AI feature updates, and notices will be broadcast here.\n\n🛡️ *Security tip*: MK Wavegram includes native end-to-end moderation, personal notes studio, 24h stories, and real-time AI capabilities.",
      type: "text",
      reactions: { "⚡": ["user_admin_mk"], "🚀": ["user_alex"] },
      likes: [],
      createdAt: new Date().toISOString()
    };
    store.messages.unshift(welcomeMsg);
  }
}

function loadStore() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      store = JSON.parse(data);
      if (!store.chatRequests) store.chatRequests = [];
      if (!store.notes) store.notes = [];
      if (!store.reports) store.reports = [];
      if (!store.stories || store.stories.length === 0) {
        seedInitialStories();
      }
      ensureOfficialEntities();
      if (store.notes.length === 0) {
        seedInitialNotes();
      }
      saveStore();
    } else {
      seedInitialData();
    }
  } catch (err) {
    console.error("Error loading DB file, re-initializing:", err);
    seedInitialData();
  }
}

export const REAL_MUSIC_CATALOG: NoteMusic[] = [
  {
    id: "track_1",
    title: "Midnight City Lights",
    artist: "Wavegram Lofi",
    coverUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&q=80",
    audioUrl: "https://cdn.freesound.org/previews/612/612628_5674468-lq.mp3",
    duration: 32
  },
  {
    id: "track_2",
    title: "Cyber Horizon Sunset",
    artist: "Synthwave Echo",
    coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&q=80",
    audioUrl: "https://cdn.freesound.org/previews/618/618218_11861866-lq.mp3",
    duration: 28
  },
  {
    id: "track_3",
    title: "Peaceful Piano Reflections",
    artist: "Aura Melodies",
    coverUrl: "https://images.unsplash.com/photo-1520523839898-507127054976?w=300&q=80",
    audioUrl: "https://cdn.freesound.org/previews/530/530415_11565251-lq.mp3",
    duration: 45
  },
  {
    id: "track_4",
    title: "Deep Chill Coffee Vibes",
    artist: "Downtown Beats",
    coverUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300&q=80",
    audioUrl: "https://cdn.freesound.org/previews/648/648604_11861866-lq.mp3",
    duration: 35
  },
  {
    id: "track_5",
    title: "Ocean Breeze Acoustic",
    artist: "Sunset Guitars",
    coverUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&q=80",
    audioUrl: "https://cdn.freesound.org/previews/573/573381_11861866-lq.mp3",
    duration: 40
  },
  {
    id: "track_6",
    title: "Tokyo Neon Drift",
    artist: "Future Bass",
    coverUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&q=80",
    audioUrl: "https://cdn.freesound.org/previews/653/653846_11861866-lq.mp3",
    duration: 30
  }
];

function seedInitialNotes() {
  const now = Date.now();
  store.notes = [
    {
      id: "note_demo_1",
      userId: "user_alex",
      userName: "Alex Rivers",
      userAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      title: "Late Night Coding & Beats 🎧",
      content: "Building the next generation of MK Wavegram with deep AI & story studios.",
      category: "Work",
      color: "#3390ec",
      moodEmoji: "⚡",
      music: REAL_MUSIC_CATALOG[0],
      isPinned: true,
      likes: ["user_sarah"],
      createdAt: new Date(now - 3600000 * 2).toISOString(),
      updatedAt: new Date(now - 3600000 * 1).toISOString(),
      expiresAt: new Date(now + 3600000 * 22).toISOString()
    },
    {
      id: "note_demo_2",
      userId: "user_sarah",
      userName: "Sarah Jenkins",
      userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      title: "Chill Coffee Break ☕",
      content: "Listening to peaceful piano melodies while sketching new UI concepts.",
      category: "Ideas",
      color: "#10b981",
      moodEmoji: "✨",
      music: REAL_MUSIC_CATALOG[2],
      isPinned: true,
      likes: ["user_alex"],
      createdAt: new Date(now - 3600000 * 5).toISOString(),
      updatedAt: new Date(now - 3600000 * 3).toISOString(),
      expiresAt: new Date(now + 3600000 * 19).toISOString()
    },
    {
      id: "note_demo_3",
      userId: "user_marcus",
      userName: "Marcus Vance",
      userAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
      title: "Weekend Road Trip 🚗💨",
      content: "On the road with acoustic tunes and great vibes!",
      category: "Personal",
      color: "#f59e0b",
      moodEmoji: "🌴",
      music: REAL_MUSIC_CATALOG[4],
      isPinned: false,
      likes: [],
      createdAt: new Date(now - 3600000 * 8).toISOString(),
      updatedAt: new Date(now - 3600000 * 8).toISOString(),
      expiresAt: new Date(now + 3600000 * 16).toISOString()
    }
  ];
}

function seedInitialStories() {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const demoStories: Story[] = [
    {
      id: "story_sarah_1",
      userId: "user_sarah",
      userName: "Sarah Jenkins",
      userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      type: "image",
      mediaUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1080&auto=format&fit=crop&q=80",
      caption: "Creative morning sprint at the design studio! Crafting new story filters ☕🎨✨",
      duration: 6,
      montage: {
        filter: "vivid",
        brightness: 105,
        contrast: 110,
        saturation: 115,
        sepia: 0,
        blur: 0,
        hueRotate: 0,
        aspectRatio: "9:16",
        stickers: [
          { id: "stk_1", emoji: "✨", x: 80, y: 15, scale: 1.4, rotation: 12 },
          { id: "stk_2", emoji: "🎨", x: 15, y: 75, scale: 1.3, rotation: -10 }
        ],
        textOverlays: [
          {
            id: "txt_1",
            text: "Design Sprint #42",
            color: "#ffffff",
            background: "rgba(14, 165, 233, 0.75)",
            x: 50,
            y: 20,
            scale: 1.1,
            font: "sans-serif"
          }
        ]
      },
      tags: [
        { id: "t1", type: "user", label: "Alex Morgan", value: "user_alex", userId: "user_alex" },
        { id: "t2", type: "hashtag", label: "#DesignThinking", value: "DesignThinking" },
        { id: "t3", type: "location", label: "📍 Blue Bottle Studio", value: "Blue Bottle Studio" },
        { id: "t4", type: "music", label: "🎵 Chill Vibes - Lofi Sunset", value: "Chill Vibes" }
      ],
      location: "Blue Bottle Studio, San Francisco",
      music: {
        title: "Chill Vibes",
        artist: "Lofi Sunset Studio"
      },
      reactions: {
        "❤️": ["user_alex", "user_david"],
        "🔥": ["user_alex"],
        "😍": ["user_david"]
      },
      comments: [
        {
          id: "sc_1",
          storyId: "story_sarah_1",
          userId: "user_alex",
          userName: "Alex Morgan",
          userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
          text: "Love the palette! Can't wait to release this feature 🚀",
          createdAt: new Date(now - 3600000).toISOString(),
          likes: ["user_sarah"]
        },
        {
          id: "sc_2",
          storyId: "story_sarah_1",
          userId: "user_sarah",
          userName: "Sarah Jenkins",
          userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
          text: "Thanks Alex! Full typography engine is ready too!",
          createdAt: new Date(now - 3000000).toISOString(),
          parentId: "sc_1",
          replyToUserName: "Alex Morgan"
        }
      ],
      viewers: [
        {
          userId: "user_alex",
          userName: "Alex Morgan",
          userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
          viewedAt: new Date(now - 4000000).toISOString(),
          reaction: "❤️"
        },
        {
          userId: "user_david",
          userName: "David Chen",
          userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
          viewedAt: new Date(now - 2500000).toISOString(),
          reaction: "😍"
        }
      ],
      createdAt: new Date(now - 5400000).toISOString(),
      expiresAt: new Date(now + dayMs).toISOString()
    },
    {
      id: "story_sarah_2",
      userId: "user_sarah",
      userName: "Sarah Jenkins",
      userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      type: "text",
      textContent: "Good design is as little design as possible. Less, but better – because it concentrates on the essential aspects.",
      textStyle: {
        template: "neon_glow",
        backgroundGradient: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #0f172a 100%)",
        textColor: "#38bdf8",
        fontSize: "lg",
        textAlign: "center",
        fontFamily: "sans-serif",
        highlightCard: true
      },
      duration: 6,
      tags: [
        { id: "t5", type: "hashtag", label: "#DieterRams", value: "DieterRams" },
        { id: "t6", type: "hashtag", label: "#Minimalism", value: "Minimalism" }
      ],
      reactions: {
        "⚡": ["user_alex"],
        "💯": ["user_david"]
      },
      comments: [],
      viewers: [
        {
          userId: "user_alex",
          userName: "Alex Morgan",
          userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
          viewedAt: new Date(now - 1200000).toISOString(),
          reaction: "⚡"
        }
      ],
      createdAt: new Date(now - 3600000).toISOString(),
      expiresAt: new Date(now + dayMs).toISOString()
    },
    {
      id: "story_alex_1",
      userId: "user_alex",
      userName: "Alex Morgan",
      userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      type: "image",
      mediaUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1080&auto=format&fit=crop&q=80",
      caption: "Sunset overlooking the Pacific Coast. Nature's ultimate high definition canvas 🌅",
      duration: 6,
      montage: {
        filter: "sunset",
        brightness: 108,
        contrast: 105,
        saturation: 120,
        sepia: 10,
        blur: 0,
        hueRotate: 0,
        aspectRatio: "9:16",
        stickers: [
          { id: "stk_3", emoji: "🌅", x: 50, y: 15, scale: 1.5, rotation: 0 },
          { id: "stk_4", emoji: "🏄", x: 80, y: 80, scale: 1.2, rotation: -15 }
        ]
      },
      tags: [
        { id: "t7", type: "location", label: "📍 Big Sur, California", value: "Big Sur" },
        { id: "t8", type: "hashtag", label: "#SunsetChaser", value: "SunsetChaser" },
        { id: "t9", type: "music", label: "🎵 Golden Hour - Wavescape", value: "Golden Hour" }
      ],
      location: "Big Sur, California",
      music: {
        title: "Golden Hour",
        artist: "Wavescape Ambient"
      },
      reactions: {
        "🔥": ["user_sarah", "user_david"],
        "❤️": ["user_sarah"]
      },
      comments: [
        {
          id: "sc_3",
          storyId: "story_alex_1",
          userId: "user_sarah",
          userName: "Sarah Jenkins",
          userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
          text: "Breathtaking colors! Did you use the sunset montage preset?",
          createdAt: new Date(now - 7000000).toISOString()
        }
      ],
      viewers: [
        {
          userId: "user_sarah",
          userName: "Sarah Jenkins",
          userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
          viewedAt: new Date(now - 7200000).toISOString(),
          reaction: "🔥"
        }
      ],
      createdAt: new Date(now - 8000000).toISOString(),
      expiresAt: new Date(now + dayMs).toISOString()
    },
    {
      id: "story_david_1",
      userId: "user_david",
      userName: "David Chen",
      userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      type: "text",
      textContent: "🎙️ Sound Check & Waveform Test: Spatial acoustics calibrated. New studio gear unlocked! 🎧",
      textStyle: {
        template: "cyberpunk",
        backgroundGradient: "linear-gradient(135deg, #05050d 0%, #0f172a 50%, #022c22 100%)",
        textColor: "#22c55e",
        fontSize: "lg",
        textAlign: "center",
        fontFamily: "monospace",
        highlightCard: true
      },
      duration: 6,
      tags: [
        { id: "t10", type: "hashtag", label: "#AudioEngineering", value: "AudioEngineering" },
        { id: "t11", type: "location", label: "📍 SoundLab Tokyo", value: "SoundLab Tokyo" }
      ],
      reactions: {
        "🚀": ["user_alex"],
        "👏": ["user_sarah"]
      },
      comments: [],
      viewers: [
        {
          userId: "user_alex",
          userName: "Alex Morgan",
          userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
          viewedAt: new Date(now - 15000000).toISOString(),
          reaction: "🚀"
        }
      ],
      createdAt: new Date(now - 16000000).toISOString(),
      expiresAt: new Date(now + dayMs).toISOString()
    }
  ];

  store.stories = demoStories;
}

function saveStore() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving DB file:", err);
  }
}

function seedInitialData() {
  // Demo users so the app immediately looks vibrant and alive
  const alex: User = {
    id: "user_alex",
    email: "alex@wavegram.com",
    username: "Alex Morgan",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    bio: "Exploring the world with MK-wavegram 🚀",
    status: "online",
    createdAt: new Date().toISOString(),
    badges: ["VIP", "Verified"],
    hasAccount: true,
    acceptedPrivacyTerms: true,
    privacyAcceptedAt: new Date().toISOString()
  };

  const sarah: User = {
    id: "user_sarah",
    email: "sarah@wavegram.com",
    username: "Sarah Jenkins",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    bio: "Design lead @ MK-wavegram | Coffee enthusiast ☕",
    status: "online",
    createdAt: new Date().toISOString(),
    badges: ["Design Team"],
    hasAccount: true,
    acceptedPrivacyTerms: true,
    privacyAcceptedAt: new Date().toISOString()
  };

  const david: User = {
    id: "user_david",
    email: "david@wavegram.com",
    username: "David Chen",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    bio: "Audio engineer & podcaster 🎙️",
    status: "away",
    createdAt: new Date().toISOString(),
    badges: ["Voice Master"],
    hasAccount: true,
    acceptedPrivacyTerms: true,
    privacyAcceptedAt: new Date().toISOString()
  };

  store.users = [alex, sarah, david];
  store.passwords["alex@wavegram.com"] = "password123";
  store.passwords["sarah@wavegram.com"] = "password123";
  store.passwords["david@wavegram.com"] = "password123";

  seedInitialNotes();

  // Initial group
  const techGroup: Group = {
    id: "group_tech",
    name: "Wavegram Tech Pioneers",
    description: "Official community group for tech updates and audio innovations!",
    avatar: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80",
    creatorId: "user_alex",
    adminIds: ["user_alex"],
    memberIds: ["user_alex", "user_sarah", "user_david"],
    isPrivate: false,
    inviteCode: "WAVE-TECH-2026",
    themeColor: "#ec4899",
    badges: [
      { userId: "user_alex", badgeName: "Founder", color: "#f59e0b" },
      { userId: "user_sarah", badgeName: "UI/UX", color: "#ec4899" }
    ],
    createdAt: new Date().toISOString()
  };

  store.groups = [techGroup];

  // Initial conversation for group
  const groupConv: Conversation = {
    id: "conv_group_tech",
    type: "group",
    participants: ["user_alex", "user_sarah", "user_david"],
    groupId: "group_tech",
    lastMessage: {
      text: "Welcome to Wavegram! Double tap any message to react ❤️",
      senderId: "user_alex",
      senderName: "Alex Morgan",
      createdAt: new Date().toISOString()
    },
    updatedAt: new Date().toISOString()
  };

  store.conversations = [groupConv];

  // Initial group message
  const msg1: Message = {
    id: "msg_init_1",
    conversationId: "conv_group_tech",
    senderId: "user_alex",
    senderName: "Alex Morgan",
    senderAvatar: alex.avatar,
    text: "Welcome to Wavegram! You can send HD audio voice notes, gifs, files, and start crystal clear voice calls!",
    type: "text",
    reactions: { "❤️": ["user_sarah"], "🚀": ["user_david"] },
    likes: ["user_sarah"],
    createdAt: new Date(Date.now() - 3600000).toISOString()
  };

  store.messages = [msg1];
  saveStore();
}

loadStore();

// Realtime Server-Sent Events subscribers
interface SSESubscriber {
  id: string;
  userId: string;
  res: Response;
}
let sseSubscribers: SSESubscriber[] = [];

function broadcastEvent(eventType: string, payload: any, targetUserIds?: string[]) {
  sseSubscribers.forEach((sub) => {
    try {
      if (!targetUserIds || targetUserIds.includes(sub.userId)) {
        sub.res.write(`event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`);
      }
    } catch (e) {
      // client disconnected
    }
  });
}

// Active call state memory
let currentActiveCalls: { [callId: string]: ActiveCall } = {};

// API ROUTES

// 1. SSE Endpoint for instantaneous message & status updates
app.get("/api/events", (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || "anonymous";
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const subId = Math.random().toString(36).substring(2);
  const subscriber: SSESubscriber = { id: subId, userId, res };
  sseSubscribers.push(subscriber);

  // Send initial handshake
  res.write(`event: connected\ndata: ${JSON.stringify({ status: "connected", subId })}\n\n`);

  req.on("close", () => {
    sseSubscribers = sseSubscribers.filter((s) => s.id !== subId);
  });
});

// 2. Auth: Register (enforce unique email & admin reservation)
app.post("/api/auth/register", (req: Request, res: Response) => {
  const { email, username, password, avatar, bio } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: "Email, display name, and password are required." });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // If user tries to register with admin credentials, smoothly authenticate them as the Admin
  const isAdminEmail =
    normalizedEmail === "addmmin@gmail.com" ||
    normalizedEmail === "admin@gmail.com" ||
    normalizedEmail === "admin@wavegram.com";

  if (isAdminEmail) {
    if (password === "adminadmin12") {
      let adminUser = store.users.find(
        (u) =>
          u.email.toLowerCase() === "addmmin@gmail.com" ||
          u.email.toLowerCase() === "admin@gmail.com" ||
          u.id === "user_admin_mk"
      );
      if (!adminUser) {
        adminUser = { ...ADMIN_USER };
        store.users.unshift(adminUser);
      }
      adminUser.role = "admin";
      adminUser.badges = ["Admin Panel", "System Overseer", "Verified"];
      adminUser.isBanned = false;
      adminUser.status = "online";
      saveStore();
      return res.json({ user: adminUser });
    } else {
      return res.status(400).json({
        error: "The administrator account requires the official admin password (adminadmin12)."
      });
    }
  }

  // Enforce single-use email check
  const existingUser = store.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existingUser) {
    return res.status(400).json({
      error: "This email address is already registered. Please sign in or use another email."
    });
  }

  const defaultAvatar =
    avatar ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;

  const newUser: User = {
    id: "user_" + Math.random().toString(36).substring(2, 10),
    email: normalizedEmail,
    username: username.trim(),
    avatar: defaultAvatar,
    bio: bio || "Hey there! I am using MK Wavegram.",
    status: "online",
    role: "user",
    createdAt: new Date().toISOString(),
    badges: ["Member"],
    hasAccount: true,
    acceptedPrivacyTerms: true,
    privacyAcceptedAt: new Date().toISOString()
  };

  store.users.push(newUser);
  store.passwords[normalizedEmail] = password;

  // Auto-subscribe new user to MK Official Channel
  const mkGroup = store.groups.find((g) => g.id === "group_mk_official");
  if (mkGroup && !mkGroup.memberIds.includes(newUser.id)) {
    mkGroup.memberIds.push(newUser.id);
  }
  const mkConv = store.conversations.find((c) => c.id === "conv_mk_official");
  if (mkConv && !mkConv.participants.includes(newUser.id)) {
    mkConv.participants.push(newUser.id);
  }

  saveStore();

  broadcastEvent("user_joined", newUser);

  return res.json({ user: newUser });
});

// 3. Auth: Login (with Ban & Admin enforcement)
app.post("/api/auth/login", (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if admin credentials with spelling aliases
  const isAdminEmail =
    normalizedEmail === "addmmin@gmail.com" ||
    normalizedEmail === "admin@gmail.com" ||
    normalizedEmail === "admin@wavegram.com";

  if (isAdminEmail) {
    if (password === "adminadmin12") {
      let adminUser = store.users.find(
        (u) =>
          u.email.toLowerCase() === "addmmin@gmail.com" ||
          u.email.toLowerCase() === "admin@gmail.com" ||
          u.id === "user_admin_mk"
      );
      if (!adminUser) {
        adminUser = { ...ADMIN_USER };
        store.users.unshift(adminUser);
      }
      adminUser.role = "admin";
      adminUser.badges = ["Admin Panel", "System Overseer", "Verified"];
      adminUser.isBanned = false;
      adminUser.status = "online";
      saveStore();
      broadcastEvent("user_status", { userId: adminUser.id, status: "online" });
      return res.json({ user: adminUser });
    } else {
      return res.status(401).json({
        error: "Invalid administrator password. Please check your credentials (adminadmin12)."
      });
    }
  }

  const user = store.users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user || store.passwords[normalizedEmail] !== password) {
    return res.status(401).json({ error: "Invalid email or password. Please verify your credentials." });
  }

  // Check Ban Status
  if (user.isBanned) {
    if (user.bannedUntil && user.bannedUntil !== "permanent") {
      const banExpiry = new Date(user.bannedUntil).getTime();
      const now = Date.now();
      if (now >= banExpiry) {
        // Ban expired, auto-unban
        user.isBanned = false;
        user.bannedUntil = null;
        user.banReason = undefined;
        user.bannedAt = undefined;
        saveStore();
      } else {
        const remainingMs = banExpiry - now;
        return res.status(403).json({
          isBanned: true,
          banReason: user.banReason || "Violation of platform community and safety guidelines.",
          bannedUntil: user.bannedUntil,
          bannedAt: user.bannedAt,
          remainingMs,
          error: "Your account is temporarily suspended."
        });
      }
    } else {
      return res.status(403).json({
        isBanned: true,
        isPermanent: true,
        banReason: user.banReason || "Permanent suspension for severe policy violations.",
        bannedAt: user.bannedAt,
        error: "Your account has been permanently suspended."
      });
    }
  }

  user.status = "online";
  saveStore();

  broadcastEvent("user_status", { userId: user.id, status: "online" });

  return res.json({ user });
});

// 4. Update Profile
app.post("/api/users/profile", (req: Request, res: Response) => {
  const { userId, username, avatar, bio, isPrivate, hideEmail, closeFriendsUserIds } = req.body;
  const user = store.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  if (username) user.username = username.trim();
  if (avatar) user.avatar = avatar;
  if (bio !== undefined) user.bio = bio;
  if (isPrivate !== undefined) user.isPrivate = isPrivate;
  if (hideEmail !== undefined) user.hideEmail = hideEmail;
  if (closeFriendsUserIds !== undefined && Array.isArray(closeFriendsUserIds)) {
    user.closeFriendsUserIds = closeFriendsUserIds;
  }

  saveStore();
  broadcastEvent("user_updated", user);

  return res.json({ user });
});

// 4a. Close Friends Management Endpoint
app.post("/api/users/close-friends", (req: Request, res: Response) => {
  const { userId, closeFriendsUserIds } = req.body;
  if (!userId || !Array.isArray(closeFriendsUserIds)) {
    return res.status(400).json({ error: "userId and closeFriendsUserIds array are required." });
  }

  const user = store.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  user.closeFriendsUserIds = closeFriendsUserIds;
  saveStore();
  broadcastEvent("user_updated", user);

  return res.json({ success: true, closeFriendsUserIds: user.closeFriendsUserIds });
});

// 4b. Chat Request Endpoints (Invitations for Private Profiles)
app.get("/api/requests", (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const incoming = (store.chatRequests || []).filter(
    (r) => r.toUserId === userId && r.status === "pending"
  );
  const outgoing = (store.chatRequests || []).filter(
    (r) => r.fromUserId === userId
  );
  return res.json({ incoming, outgoing, all: (store.chatRequests || []).filter((r) => r.toUserId === userId || r.fromUserId === userId) });
});

app.post("/api/requests/send", (req: Request, res: Response) => {
  const { fromUserId, toUserId, message } = req.body;
  if (!fromUserId || !toUserId) {
    return res.status(400).json({ error: "Missing user IDs" });
  }

  const sender = store.users.find((u) => u.id === fromUserId);
  const target = store.users.find((u) => u.id === toUserId);
  if (!sender || !target) {
    return res.status(404).json({ error: "User not found" });
  }

  if (target.blockedUserIds?.includes(fromUserId)) {
    return res.status(403).json({ error: "You cannot send a chat request to this user because you are blocked." });
  }

  // Check if they already have an existing conversation
  let conv = store.conversations.find(
    (c) =>
      c.type === "dm" &&
      c.participants.includes(fromUserId) &&
      c.participants.includes(toUserId)
  );
  if (conv) {
    return res.json({ success: true, conversation: conv, alreadyConnected: true });
  }

  if (!store.chatRequests) store.chatRequests = [];

  // Check if there's already a pending request
  let existingReq = store.chatRequests.find(
    (r) => r.fromUserId === fromUserId && r.toUserId === toUserId && r.status === "pending"
  );
  if (existingReq) {
    return res.json({ success: true, request: existingReq, alreadySent: true });
  }

  const newRequest: ChatRequest = {
    id: "req_" + Math.random().toString(36).substring(2, 10),
    fromUserId,
    fromUserName: sender.username,
    fromUserAvatar: sender.avatar,
    toUserId,
    toUserName: target.username,
    toUserAvatar: target.avatar,
    message: message?.trim() || "Hi! I would like to connect with you on Wavegram.",
    status: "pending",
    createdAt: new Date().toISOString()
  };

  store.chatRequests.push(newRequest);
  saveStore();

  broadcastEvent("new_chat_request", newRequest);

  return res.json({ success: true, request: newRequest });
});

app.post("/api/requests/respond", (req: Request, res: Response) => {
  const { requestId, action, userId } = req.body;
  if (!requestId || !action) {
    return res.status(400).json({ error: "Missing requestId or action" });
  }

  if (!store.chatRequests) store.chatRequests = [];
  const reqItem = store.chatRequests.find((r) => r.id === requestId);
  if (!reqItem) {
    return res.status(404).json({ error: "Request not found" });
  }

  if (userId && reqItem.toUserId !== userId) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  if (action === "accept") {
    reqItem.status = "accepted";

    // Find or create conversation
    let conv = store.conversations.find(
      (c) =>
        c.type === "dm" &&
        c.participants.includes(reqItem.fromUserId) &&
        c.participants.includes(reqItem.toUserId)
    );

    const fromUser = store.users.find((u) => u.id === reqItem.fromUserId);
    const toUser = store.users.find((u) => u.id === reqItem.toUserId);

    if (!conv) {
      conv = {
        id: "conv_dm_" + Math.random().toString(36).substring(2, 10),
        type: "dm",
        participants: [reqItem.fromUserId, reqItem.toUserId],
        updatedAt: new Date().toISOString()
      };
      store.conversations.push(conv);
    }

    // If there is an introductory message from the requester, add it to the conversation
    if (reqItem.message && fromUser) {
      const initMsg: Message = {
        id: "msg_req_" + Math.random().toString(36).substring(2, 10),
        conversationId: conv.id,
        senderId: fromUser.id,
        senderName: fromUser.username,
        senderAvatar: fromUser.avatar,
        text: reqItem.message,
        type: "text",
        reactions: {},
        likes: [],
        createdAt: new Date().toISOString()
      };
      store.messages.push(initMsg);
      conv.lastMessage = {
        text: initMsg.text,
        senderId: initMsg.senderId,
        senderName: initMsg.senderName,
        createdAt: initMsg.createdAt
      };
      conv.updatedAt = initMsg.createdAt;
    }

    saveStore();

    broadcastEvent("chat_request_accepted", { request: reqItem, conversation: conv });
    return res.json({ success: true, request: reqItem, conversation: conv });
  } else {
    reqItem.status = "declined";
    saveStore();
    broadcastEvent("chat_request_declined", { request: reqItem });
    return res.json({ success: true, request: reqItem });
  }
});

// 4b. Delete Account
app.post("/api/users/delete", (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId required" });
  }

  const userIdx = store.users.findIndex((u) => u.id === userId);
  if (userIdx !== -1) {
    const deletedUser = store.users[userIdx];
    store.users.splice(userIdx, 1);
    delete store.passwords[deletedUser.email];
    
    // Cleanup user from groups & conversations
    store.groups.forEach((g) => {
      g.memberIds = g.memberIds.filter((id) => id !== userId);
      g.adminIds = g.adminIds.filter((id) => id !== userId);
    });

    saveStore();
    broadcastEvent("user_deleted", { userId });
    return res.json({ success: true });
  }

  return res.status(404).json({ error: "User not found" });
});

// 5. Get all users (for People tab)
app.get("/api/users", (req: Request, res: Response) => {
  return res.json({ users: store.users });
});

// 6. Direct Conversation Setup (Click on user in People -> start chat)
app.post("/api/conversations/dm", (req: Request, res: Response) => {
  const { currentUserId, targetUserId } = req.body;
  if (!currentUserId || !targetUserId) {
    return res.status(400).json({ error: "Missing user IDs" });
  }

  // Find existing DM conversation
  let conv = store.conversations.find(
    (c) =>
      c.type === "dm" &&
      c.participants.includes(currentUserId) &&
      c.participants.includes(targetUserId)
  );

  const targetUser = store.users.find((u) => u.id === targetUserId);
  if (!conv && targetUser?.isPrivate) {
    // Check if there is an accepted request
    const acceptedReq = (store.chatRequests || []).find(
      (r) =>
        ((r.fromUserId === currentUserId && r.toUserId === targetUserId) ||
          (r.fromUserId === targetUserId && r.toUserId === currentUserId)) &&
        r.status === "accepted"
    );
    if (!acceptedReq) {
      return res.status(403).json({
        requiresRequest: true,
        error: "This user has a private profile. Please send a chat invitation request to connect."
      });
    }
  }

  if (!conv) {
    conv = {
      id: "conv_dm_" + Math.random().toString(36).substring(2, 10),
      type: "dm",
      participants: [currentUserId, targetUserId],
      updatedAt: new Date().toISOString()
    };
    store.conversations.push(conv);
    saveStore();
    broadcastEvent("conversation_created", conv);
  }

  return res.json({ conversation: conv });
});

// Delete conversation
app.post("/api/conversations/delete", (req: Request, res: Response) => {
  const { conversationId } = req.body;
  if (!conversationId) return res.status(400).json({ error: "Missing conversationId" });

  // Protect MK Official broadcast channel
  if (conversationId === "conv_mk_official") {
    return res.status(403).json({ error: "The MK Official channel is a permanent system channel and cannot be deleted." });
  }

  store.conversations = store.conversations.filter((c) => c.id !== conversationId);
  store.messages = store.messages.filter((m) => m.conversationId !== conversationId);
  saveStore();
  broadcastEvent("conversation_deleted", { conversationId });
  return res.json({ success: true });
});

// Block or unblock user
app.post("/api/users/block", (req: Request, res: Response) => {
  const { userId, targetUserId } = req.body;
  if (!userId || !targetUserId) return res.status(400).json({ error: "Missing user parameters" });

  const user = store.users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (!user.blockedUserIds) user.blockedUserIds = [];

  if (user.blockedUserIds.includes(targetUserId)) {
    user.blockedUserIds = user.blockedUserIds.filter((id) => id !== targetUserId);
  } else {
    user.blockedUserIds.push(targetUserId);
  }

  saveStore();
  broadcastEvent("user_blocked_status_changed", { userId, blockedUserIds: user.blockedUserIds });
  return res.json({ success: true, blockedUserIds: user.blockedUserIds });
});

// 7. Get conversations for a user
app.get("/api/conversations", (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  // Ensure MK official channel includes this user
  let mkConv = store.conversations.find((c) => c.id === "conv_mk_official" || c.isOfficialChannel);
  if (mkConv) {
    if (!mkConv.participants.includes(userId)) {
      mkConv.participants.push(userId);
      saveStore();
    }
  }

  const userConvs = store.conversations.filter((c) =>
    c.participants.includes(userId) || c.id === "conv_mk_official" || c.isOfficialChannel
  );

  return res.json({ conversations: userConvs });
});

// 8. Get messages for a conversation
app.get("/api/messages/:conversationId", (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const userId = req.query.userId as string;

  const conv = store.conversations.find((c) => c.id === conversationId);
  if (!conv) {
    return res.status(404).json({ error: "Conversation not found", messages: [] });
  }

  // Strictly enforce that if user is removed or not a participant, they cannot fetch any messages
  if (userId) {
    if (!conv.participants.includes(userId)) {
      return res.status(403).json({ error: "You are no longer a participant in this conversation.", messages: [] });
    }

    if (conv.type === "group" && conv.groupId) {
      const group = store.groups.find((g) => g.id === conv.groupId);
      if (!group || !group.memberIds.includes(userId)) {
        return res.status(403).json({ error: "You are no longer a member of this group.", messages: [] });
      }
    }
  }

  let messages = store.messages.filter(
    (m) => m.conversationId === conversationId
  );

  if (userId) {
    // Filter out messages deleted for this user
    messages = messages.filter(
      (m) => !m.deletedForUsers || !m.deletedForUsers.includes(userId)
    );

    // If this is a group
    if (conv.type === "group" && conv.groupId) {
      const group = store.groups.find((g) => g.id === conv.groupId);
      if (group) {
        const isAdmin = group.adminIds.includes(userId) || group.creatorId === userId;

        // Check if history is hidden for new members (non-admins)
        if (group.historyVisibleToNewMembers === false && !isAdmin) {
          const userJoinedAt = group.memberJoinedAt?.[userId] || group.createdAt;
          const joinedTime = new Date(userJoinedAt).getTime();
          messages = messages.filter(
            (m) => m.isSystem || new Date(m.createdAt).getTime() >= joinedTime
          );
        }

        // If this is a group with onlyAdminMessagesVisible enabled and user is not an admin
        if (group.onlyAdminMessagesVisible || group.announcementMode) {
          if (!isAdmin) {
            messages = messages.filter(
              (m) => m.isSystem || group.adminIds.includes(m.senderId) || m.senderId === userId
            );
          }
        }
      }
    }
  }

  return res.json({ messages });
});

// 9. Send Message (supports text, image, video, audio, voice, file, gif, poll)
app.post("/api/messages/send", (req: Request, res: Response) => {
  const {
    conversationId,
    senderId,
    text,
    type = "text",
    mediaUrl,
    mediaName,
    mediaSize,
    duration,
    replyTo,
    poll
  } = req.body;

  const sender = store.users.find((u) => u.id === senderId);
  if (!sender) return res.status(404).json({ error: "Sender not found" });

  if (sender.isBanned) {
    return res.status(403).json({ error: "Your account is currently suspended. You cannot send messages." });
  }

  const conv = store.conversations.find((c) => c.id === conversationId);
  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  // Strictly enforce that only MK Admins can send messages in the official channel
  if (conversationId === "conv_mk_official" && sender.role !== "admin" && sender.id !== "user_admin_mk") {
    return res.status(403).json({ error: "This is an official announcement channel. Only MK Admins can post broadcasts." });
  }

  // Strictly check participant membership
  if (!conv.participants.includes(senderId)) {
    return res.status(403).json({ error: "You cannot send messages to this conversation because you are not a member." });
  }

  // 1. If DM conversation, check if recipient has blocked sender or sender has blocked recipient
  if (conv.type === "dm") {
    const otherUserId = conv.participants.find((id) => id !== senderId);
    if (otherUserId) {
      const recipient = store.users.find((u) => u.id === otherUserId);
      if (recipient?.blockedUserIds?.includes(senderId)) {
        return res.status(403).json({ error: "You cannot message this user because you have been blocked." });
      }
      if (sender.blockedUserIds?.includes(otherUserId)) {
        return res.status(403).json({ error: "You cannot send messages to a user you have blocked. Please unblock them first." });
      }
    }
  }

  // 2. If Group conversation, check permissions
  if (conv.type === "group" && conv.groupId) {
    const group = store.groups.find((g) => g.id === conv.groupId);
    if (!group || !group.memberIds.includes(senderId)) {
      return res.status(403).json({ error: "You are no longer a member of this group." });
    }

    if (group) {
      const isAdmin = group.adminIds.includes(senderId) || group.creatorId === senderId;

      // Check Announcement Mode (only admins can post)
      if (group.announcementMode && !isAdmin) {
        return res.status(403).json({ error: "Announcement Channel: Only group admins can send messages." });
      }

      // Check specific user restriction (muted / read-only)
      if (group.restrictedMemberIds?.includes(senderId)) {
        return res.status(403).json({ error: "You have been restricted to read-only mode by a group admin." });
      }

      // If poll creation, strictly enforce ONLY group admins can create polls and votes
      if (type === "poll" && !isAdmin) {
        return res.status(403).json({ error: "Only group admins can create polls and votes." });
      }
    }
  } else if (type === "poll") {
    return res.status(400).json({ error: "Polls can only be created in group chats." });
  }

  let formattedPoll = undefined;
  if (type === "poll" && poll) {
    formattedPoll = {
      id: "poll_" + Math.random().toString(36).substring(2, 10),
      question: poll.question,
      options: (poll.options || []).map((opt: any, index: number) => ({
        id: opt.id || "opt_" + index + "_" + Math.random().toString(36).substring(2, 6),
        text: typeof opt === "string" ? opt : opt.text,
        voterIds: []
      })),
      creatorId: senderId,
      creatorName: sender.username,
      allowMultipleAnswers: !!poll.allowMultipleAnswers,
      isClosed: false,
      totalVotes: 0,
      createdAt: new Date().toISOString()
    };
  }

  const newMessage: Message = {
    id: "msg_" + Math.random().toString(36).substring(2, 10),
    conversationId,
    senderId,
    senderName: sender.username,
    senderAvatar: sender.avatar,
    text: text || (type === "poll" ? formattedPoll?.question || "Poll" : ""),
    type,
    mediaUrl,
    mediaName,
    mediaSize,
    duration,
    reactions: {},
    likes: [],
    replyTo,
    poll: formattedPoll,
    createdAt: new Date().toISOString()
  };

  store.messages.push(newMessage);

  // Update conversation last message
  let previewText = text || "Sent a media file";
  if (type === "voice") previewText = "🎤 Voice note";
  if (type === "image") previewText = "📷 Image";
  if (type === "gif") previewText = "👾 GIF";
  if (type === "sticker") previewText = `🪶 ${text || "Sticker"}`;
  if (type === "poll") previewText = `📊 Poll: ${formattedPoll?.question || "New Vote"}`;

  conv.lastMessage = {
    text: previewText,
    senderId,
    senderName: sender.username,
    createdAt: newMessage.createdAt
  };
  conv.updatedAt = newMessage.createdAt;

  saveStore();

  broadcastEvent("new_message", newMessage, conv.participants);

  // Check if this message triggers MK.ia (@MK.ia, @mk.ia, MK.ia, @mkai, @wia, @lia, @meta ai, @ai, @bot, @gemini) or if it's a DM with MK.ia
  const isMkAiTriggered =
    /@(mk\.ia|mkia|mk-ia|mk_ia|mk\s*ia|mk\s*ai|wia|lia|meta\s*ai|ai|bot|gemini)\b/i.test(text || "") ||
    /\b(MK\.ia|mk\.ia|@MK\.ia|@mk\.ia)\b/i.test(text || "") ||
    (conv.type === "dm" && (conv.participants.includes(MK_AI_USER.id) || conv.participants.includes("user_wia_ai") || conv.participants.includes("user_lia_ai")));

  if (isMkAiTriggered && senderId !== MK_AI_USER.id && senderId !== "user_wia_ai") {
    setTimeout(() => {
      triggerMkAiResponse(conv, newMessage, sender);
    }, 200);
  }

  return res.json({ message: newMessage });
});

// MK.ia intelligent assistant handler powered by Gemini with robust fallback
async function triggerMkAiResponse(conv: Conversation, userMsg: Message, sender: User) {
  try {
    const rawText = userMsg.text || "";
    // Clean tag prefix e.g. @MK.ia, MK.ia, @wia, @lia, @Meta AI, @meta, @ai, @bot, @gemini
    let prompt = rawText
      .replace(/@(mk\.ia|mkia|mk-ia|mk_ia|mk\s*ia|mk\s*ai|wia|lia|meta\s*ai|ai|bot|gemini)\b/gi, "")
      .replace(/\b(MK\.ia|mk\.ia|@MK\.ia|@mk\.ia)\b/gi, "")
      .trim();
    if (!prompt) {
      prompt = "Hello MK.ia! Please introduce yourself, your capabilities, and how you can assist me.";
    }

    // Get previous 16 messages for rich multi-turn conversational context
    const previousConversationMessages = store.messages
      .filter((m) => m.conversationId === conv.id && m.id !== userMsg.id)
      .slice(-16);

    const systemInstruction = `You are MK.ia, the elite intelligent AI assistant built natively into MK Wavegram, powered by Google Gemini.
Your mission is to provide exceptionally deep, articulate, comprehensive, structured, and insightful answers strictly in clean English (unless the user explicitly requests another language):
- Provide profound, well-reasoned, and multi-paragraph answers when needed (with clear Markdown headings, bullet points, structured tables, and concrete examples).
- For technical, mathematical, or coding tasks: provide robust, error-free TypeScript/React/Python/Node.js snippets with clear step-by-step explanations.
- For brainstorming, planning, stories, or strategic questions: deliver high-depth creative frameworks, actionable takeaways, and structured solutions.
- For conversations: be intelligent, polite, proactive, and deeply helpful. Maintain continuity with prior messages in this conversation.`;

    let replyText = "";
    const gemini = getGeminiClient();
    if (gemini) {
      // Build clean alternating multi-turn contents
      const rawTurns: Array<{ role: "user" | "model"; text: string }> = [];

      previousConversationMessages.forEach((m) => {
        const role: "user" | "model" = (m.senderId === MK_AI_USER.id || m.senderId === "user_wia_ai") ? "model" : "user";
        const text = m.text || `[${m.type}]`;
        if (text && text.trim()) {
          rawTurns.push({
            role,
            text: role === "model" ? text : `@${m.senderName}: ${text}`
          });
        }
      });

      rawTurns.push({
        role: "user",
        text: `@${sender.username}: ${prompt}`
      });

      // Filter leading model turns (Gemini requires first message in contents to be user)
      while (rawTurns.length > 0 && rawTurns[0].role === "model") {
        rawTurns.shift();
      }

      // Merge consecutive identical roles to adhere to strict Gemini turn rules
      const mergedTurns: Array<{ role: "user" | "model"; text: string }> = [];
      for (const turn of rawTurns) {
        if (mergedTurns.length > 0 && mergedTurns[mergedTurns.length - 1].role === turn.role) {
          mergedTurns[mergedTurns.length - 1].text += "\n\n" + turn.text;
        } else {
          mergedTurns.push({ role: turn.role, text: turn.text });
        }
      }

      const geminiContents = mergedTurns.map((t) => ({
        role: t.role,
        parts: [{ text: t.text }]
      }));

      // Attempt multi-tier model cascade with active, supported Gemini models
      const modelsToTry = ["gemini-3.7-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
      for (const candidateModel of modelsToTry) {
        try {
          const response = await gemini.models.generateContent({
            model: candidateModel,
            contents: geminiContents,
            config: {
              systemInstruction
            }
          });
          if (response.text && response.text.trim().length > 0) {
            replyText = response.text;
            break;
          }
        } catch (candidateErr) {
          console.warn(`Model ${candidateModel} attempt failed, trying next:`, candidateErr);
        }
      }
    }

    if (!replyText || replyText.trim().length === 0) {
      replyText = generateSmartFallbackReply(prompt, sender.username, conv);
    }

    const aiMessage: Message = {
      id: "msg_mkia_" + Math.random().toString(36).substring(2, 10),
      conversationId: conv.id,
      senderId: MK_AI_USER.id,
      senderName: MK_AI_USER.username,
      senderAvatar: MK_AI_USER.avatar,
      text: replyText.trim(),
      type: "text",
      reactions: {},
      likes: [],
      replyTo: {
        id: userMsg.id,
        senderName: sender.username,
        text: userMsg.text,
        type: userMsg.type
      },
      createdAt: new Date().toISOString()
    };

    store.messages.push(aiMessage);

    conv.lastMessage = {
      text: replyText.trim().slice(0, 100) + (replyText.length > 100 ? "..." : ""),
      senderId: MK_AI_USER.id,
      senderName: MK_AI_USER.username,
      createdAt: aiMessage.createdAt
    };
    conv.updatedAt = aiMessage.createdAt;
    saveStore();

    broadcastEvent("new_message", aiMessage, conv.participants);
  } catch (err: any) {
    console.error("Error generating MK.ia response:", err);
    const fallbackText = generateSmartFallbackReply(userMsg.text || "hello", sender.username, conv);
    const errMessage: Message = {
      id: "msg_mkia_fb_" + Math.random().toString(36).substring(2, 10),
      conversationId: conv.id,
      senderId: MK_AI_USER.id,
      senderName: MK_AI_USER.username,
      senderAvatar: MK_AI_USER.avatar,
      text: fallbackText,
      type: "text",
      reactions: {},
      likes: [],
      createdAt: new Date().toISOString()
    };
    store.messages.push(errMessage);
    saveStore();
    broadcastEvent("new_message", errMessage, conv.participants);
  }
}

// Smart contextual comprehensive fallback response generator for MK.ia
function generateSmartFallbackReply(prompt: string, username: string, conv?: Conversation): string {
  const p = prompt.toLowerCase();

  // Math expressions
  const mathMatch = prompt.match(/(\d+[\s\+\-\*\/\^\%]+\d+)/);
  if (mathMatch) {
    try {
      const sanitized = mathMatch[0].replace(/[^0-9\+\-\*\/\.]/g, "");
      // eslint-disable-next-line no-eval
      const result = Function(`'use strict'; return (${sanitized})`)();
      return `🔢 **MK.ia Mathematical Solution for @${username}**:\n\n### Equation\n\`${mathMatch[0]}\`\n\n### Computed Result\n**= ${result}** ✨\n\nIf you need multi-variable calculus, algorithmic proofs, or statistical modeling, feel free to tag \`@MK.ia\`!`;
    } catch (e) {}
  }

  // Code & Programming
  if (p.includes("code") || p.includes("javascript") || p.includes("typescript") || p.includes("python") || p.includes("react") || p.includes("html") || p.includes("css") || p.includes("bug") || p.includes("api") || p.includes("sql")) {
    return `💻 **MK.ia Deep Engineering & Code Assistant for @${username}**\n\nI can analyze, write, refactor, and benchmark code across **TypeScript, React, Python, Node.js, Next.js, and SQL**.\n\n### Architecture Best Practice Example:\n\`\`\`typescript\n// Secure Real-Time Event Dispatcher Pattern\ninterface EventPayload<T = unknown> {\n  type: string;\n  data: T;\n  timestamp: number;\n}\n\nexport class EventDispatcher {\n  private subscribers = new Map<string, Set<(data: any) => void>>();\n\n  subscribe<T>(eventType: string, handler: (data: T) => void): () => void {\n    if (!this.subscribers.has(eventType)) {\n      this.subscribers.set(eventType, new Set());\n    }\n    this.subscribers.get(eventType)!.add(handler);\n    return () => this.subscribers.get(eventType)?.delete(handler);\n  }\n\n  publish<T>(eventType: string, data: T): void {\n    this.subscribers.get(eventType)?.forEach((handler) => handler(data));\n  }\n}\n\`\`\`\n\n**Next Steps:** Send me your specific component, database query, or bug snippet, and I will provide an optimized, production-ready solution.`;
  }

  // Translation requests
  if (p.includes("traduis") || p.includes("traduire") || p.includes("translate") || p.includes("traduction")) {
    return `🌍 **MK.ia Multilingual Translation Engine**\n\nI provide high-fidelity contextual translation across:\n- **English, French, Spanish, German, Italian, Portuguese**\n- **Arabic (Modern Standard & Dialects: Tunisian, Egyptian, Moroccan, Levantine, Gulf)**\n- **Japanese, Korean, Chinese, Russian, Turkish**\n\n👉 Send me your sentence or transcript along with your desired target language!`;
  }

  // Greetings
  if (p.includes("hello") || p.includes("hi") || p.includes("hey") || p.includes("salut") || p.includes("bonjour")) {
    return `Hello @${username}! 👋 I am **MK.ia**, your native intelligent AI assistant on **MK Wavegram**, powered by Google Gemini.\n\n### How I can assist you:\n1. 🧠 **Deep Research & Analysis**: Thorough answers to complex queries in science, engineering, business, and philosophy.\n2. 💻 **Full-Stack Development**: Writing, debugging, and explaining React, TypeScript, Python, and backend APIs.\n3. 🎨 **Content Creation**: Drafting story captions, announcements, summaries, and creative brainstorming.\n4. 🌐 **Real-time Translation**: Instant translations across 50+ languages.\n\nTag me anytime with \`@MK.ia\` or \`@mk.ia\` in any chat! What would you like to explore today?`;
  }

  if (p.includes("who are you") || p.includes("what are you") || p.includes("what can you do") || p.includes("qui es-tu")) {
    return `I am **MK.ia** ⚡, the official high-intelligence AI assistant embedded directly into MK Wavegram, powered by Google Gemini.\n\n### Key Strengths:\n- **Deep Technical Understanding**: Architecture, algorithms, and full-stack development.\n- **Multi-Turn Context**: Maintaining coherent memory across long discussions.\n- **Analytical Depth**: Providing structured, actionable, and comprehensive breakdowns.\n\nFeel free to ask me anything or tag \`@MK.ia\` in any channel or direct chat!`;
  }

  // General insightful contextual reply
  return `⚡ **MK.ia Gemini Intelligence**: Greetings @${username}!\n\nRegarding your inquiry: **"${prompt}"**\n\n### Analysis & Insights:\nI have processed your request. Here are key points to consider:\n- **Context**: Tailoring the solution specifically to your workflow.\n- **Precision**: Providing verified, high-depth insights.\n\nWould you like me to elaborate on a specific angle, generate code, or outline a detailed action plan? Just reply with more details!`;
}

// Poll Vote Endpoint
app.post("/api/messages/poll/vote", (req: Request, res: Response) => {
  const { messageId, userId, optionId } = req.body;
  if (!messageId || !userId || !optionId) {
    return res.status(400).json({ error: "Missing required poll parameters." });
  }

  const msg = store.messages.find((m) => m.id === messageId);
  if (!msg || !msg.poll) return res.status(404).json({ error: "Poll message not found." });

  if (msg.poll.isClosed) {
    return res.status(400).json({ error: "This poll has been closed." });
  }

  const poll = msg.poll;
  const targetOption = poll.options.find((o) => o.id === optionId);
  if (!targetOption) return res.status(404).json({ error: "Option not found." });

  if (poll.allowMultipleAnswers) {
    // Toggle vote on this option
    if (targetOption.voterIds.includes(userId)) {
      targetOption.voterIds = targetOption.voterIds.filter((id) => id !== userId);
    } else {
      targetOption.voterIds.push(userId);
    }
  } else {
    // Single choice mode:
    const alreadyVotedTarget = targetOption.voterIds.includes(userId);
    // Remove user from all options
    poll.options.forEach((opt) => {
      opt.voterIds = opt.voterIds.filter((id) => id !== userId);
    });
    // If they were not already on this option, select it; if they were, it deselects
    if (!alreadyVotedTarget) {
      targetOption.voterIds.push(userId);
    }
  }

  // Recalculate unique total voters
  const allVoterIds = new Set<string>();
  poll.options.forEach((opt) => {
    opt.voterIds.forEach((id) => allVoterIds.add(id));
  });
  poll.totalVotes = allVoterIds.size;

  saveStore();
  broadcastEvent("message_updated", msg);
  return res.json({ message: msg });
});

// Poll Close Endpoint (Admin Only)
app.post("/api/messages/poll/close", (req: Request, res: Response) => {
  const { messageId, userId } = req.body;
  const msg = store.messages.find((m) => m.id === messageId);
  if (!msg || !msg.poll) return res.status(404).json({ error: "Poll not found." });

  const conv = store.conversations.find((c) => c.id === msg.conversationId);
  if (conv && conv.groupId) {
    const group = store.groups.find((g) => g.id === conv.groupId);
    const isAdmin = group?.adminIds.includes(userId) || group?.creatorId === userId || msg.senderId === userId;
    if (!isAdmin) {
      return res.status(403).json({ error: "Only admins can close the poll." });
    }
  }

  msg.poll.isClosed = true;
  saveStore();
  broadcastEvent("message_updated", msg);
  return res.json({ message: msg });
});

// 10. Message Interactions: Like / Double Click / Reactions (>20 emojis support)
app.post("/api/messages/react", (req: Request, res: Response) => {
  const { messageId, userId, emoji, isDoubleTapLike } = req.body;
  const msg = store.messages.find((m) => m.id === messageId);
  if (!msg) return res.status(404).json({ error: "Message not found" });

  if (isDoubleTapLike) {
    // Toggle like ❤️
    if (!msg.likes) msg.likes = [];
    if (msg.likes.includes(userId)) {
      msg.likes = msg.likes.filter((id) => id !== userId);
    } else {
      msg.likes.push(userId);
    }
    // Also update reactions map
    if (!msg.reactions["❤️"]) msg.reactions["❤️"] = [];
    if (!msg.reactions["❤️"].includes(userId)) {
      msg.reactions["❤️"].push(userId);
    }
  } else if (emoji) {
    if (!msg.reactions) msg.reactions = {};
    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];

    // Toggle reaction for this emoji
    if (msg.reactions[emoji].includes(userId)) {
      msg.reactions[emoji] = msg.reactions[emoji].filter((id) => id !== userId);
      if (msg.reactions[emoji].length === 0) {
        delete msg.reactions[emoji];
      }
    } else {
      msg.reactions[emoji].push(userId);
    }
  }

  saveStore();
  broadcastEvent("message_updated", msg);
  return res.json({ message: msg });
});

// 11. Edit Message
app.post("/api/messages/edit", (req: Request, res: Response) => {
  const { messageId, userId, newText } = req.body;
  const msg = store.messages.find((m) => m.id === messageId);
  if (!msg) return res.status(404).json({ error: "Message not found" });
  if (msg.senderId !== userId) {
    return res.status(403).json({ error: "You can only edit your own messages." });
  }

  msg.text = newText;
  msg.isEdited = true;
  msg.editedAt = new Date().toISOString();

  saveStore();
  broadcastEvent("message_updated", msg);
  return res.json({ message: msg });
});

// 12. Delete Message (For me vs For all)
app.post("/api/messages/delete", (req: Request, res: Response) => {
  const { messageId, userId, deleteType } = req.body; // deleteType: 'for_me' | 'for_all'
  const msg = store.messages.find((m) => m.id === messageId);
  if (!msg) return res.status(404).json({ error: "Message not found" });

  if (deleteType === "for_all") {
    let canDeleteForAll = msg.senderId === userId;
    const conv = store.conversations.find((c) => c.id === msg.conversationId);
    if (conv?.groupId) {
      const grp = store.groups.find((g) => g.id === conv.groupId);
      if (grp?.adminIds.includes(userId) || grp?.creatorId === userId) {
        canDeleteForAll = true;
      }
    }

    if (!canDeleteForAll) {
      return res.status(403).json({ error: "Only sender or group admin can delete for everyone." });
    }

    msg.isDeletedForAll = true;
    msg.text = "This message was deleted";
    msg.type = "text";
    delete msg.mediaUrl;
    delete msg.mediaName;
    delete msg.mediaSize;
    delete msg.duration;
    delete msg.poll;
    delete msg.voiceAnalysis;
    delete msg.customSticker;
    delete msg.storyShare;

    if (conv && conv.lastMessage) {
      conv.lastMessage.text = "This message was deleted";
    }
  } else {
    // for me
    if (!msg.deletedForUsers) msg.deletedForUsers = [];
    if (!msg.deletedForUsers.includes(userId)) {
      msg.deletedForUsers.push(userId);
    }
  }

  saveStore();
  broadcastEvent("message_updated", msg);
  return res.json({ message: msg });
});

// 12a. Batch Delete Messages (For me vs For all)
app.post("/api/messages/batch-delete", (req: Request, res: Response) => {
  const { messageIds, userId, deleteType } = req.body; // deleteType: 'for_me' | 'for_all'
  if (!Array.isArray(messageIds) || !userId) {
    return res.status(400).json({ error: "messageIds array and userId are required." });
  }

  const updatedMessages: Message[] = [];

  messageIds.forEach((msgId) => {
    const msg = store.messages.find((m) => m.id === msgId);
    if (!msg) return;

    if (deleteType === "for_all") {
      let canDeleteForAll = msg.senderId === userId;
      const conv = store.conversations.find((c) => c.id === msg.conversationId);
      if (conv?.groupId) {
        const grp = store.groups.find((g) => g.id === conv.groupId);
        if (grp?.adminIds.includes(userId) || grp?.creatorId === userId) {
          canDeleteForAll = true;
        }
      }
      if (canDeleteForAll) {
        msg.isDeletedForAll = true;
        msg.text = "This message was deleted";
        msg.type = "text";
        delete msg.mediaUrl;
        delete msg.mediaName;
        delete msg.mediaSize;
        delete msg.duration;
        delete msg.poll;
        delete msg.voiceAnalysis;
        delete msg.customSticker;
        delete msg.storyShare;

        if (conv && conv.lastMessage) {
          conv.lastMessage.text = "This message was deleted";
        }
        updatedMessages.push(msg);
      }
    } else {
      // for me
      if (!msg.deletedForUsers) msg.deletedForUsers = [];
      if (!msg.deletedForUsers.includes(userId)) {
        msg.deletedForUsers.push(userId);
      }
      updatedMessages.push(msg);
    }
  });

  saveStore();
  updatedMessages.forEach((msg) => broadcastEvent("message_updated", msg));
  return res.json({ success: true, updatedCount: updatedMessages.length, messages: updatedMessages });
});

// 12b. Batch Forward Messages
app.post("/api/messages/batch-forward", (req: Request, res: Response) => {
  const { messageIds, targetConversationIds, userId } = req.body;
  if (!Array.isArray(messageIds) || !Array.isArray(targetConversationIds) || !userId) {
    return res.status(400).json({ error: "messageIds, targetConversationIds and userId are required." });
  }

  const sender = store.users.find((u) => u.id === userId);
  if (!sender) return res.status(404).json({ error: "User not found." });

  const messagesToForward = store.messages.filter((m) => messageIds.includes(m.id) && !m.isDeletedForAll);
  const createdMessages: Message[] = [];

  targetConversationIds.forEach((convId) => {
    const conv = store.conversations.find((c) => c.id === convId);
    if (!conv || !conv.participants.includes(userId)) return;

    messagesToForward.forEach((origMsg) => {
      const forwardedMsg: Message = {
        id: "msg_" + Math.random().toString(36).substring(2, 10),
        conversationId: convId,
        senderId: userId,
        senderName: sender.username,
        senderAvatar: sender.avatar,
        text: origMsg.text,
        type: origMsg.type,
        mediaUrl: origMsg.mediaUrl,
        mediaName: origMsg.mediaName,
        mediaSize: origMsg.mediaSize,
        duration: origMsg.duration,
        poll: origMsg.poll,
        reactions: {},
        likes: [],
        replyTo: {
          id: origMsg.id,
          senderName: `Forwarded from ${origMsg.senderName}`,
          text: origMsg.text || "Media message",
          type: origMsg.type
        },
        createdAt: new Date().toISOString()
      };

      store.messages.push(forwardedMsg);
      createdMessages.push(forwardedMsg);

      conv.lastMessage = {
        text: forwardedMsg.text || "Forwarded message",
        senderId: userId,
        senderName: sender.username,
        createdAt: forwardedMsg.createdAt
      };
      conv.updatedAt = forwardedMsg.createdAt;

      broadcastEvent("new_message", forwardedMsg, conv.participants);
    });
  });

  saveStore();
  return res.json({ success: true, count: createdMessages.length, messages: createdMessages });
});

// 12c. Real Music & Notes API

// Get curated trending music catalog
app.get(["/api/music/catalog", "/api/music/trending"], (req: Request, res: Response) => {
  const query = ((req.query.q as string) || "").toLowerCase().trim();
  let tracks = REAL_MUSIC_CATALOG;
  if (query) {
    tracks = tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.artist.toLowerCase().includes(query)
    );
  }
  return res.json({ tracks });
});

// Get Notes (All active or user-specific)
app.get("/api/notes", (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const all = req.query.all === "true" || !userId;

  if (!store.notes) store.notes = [];

  let resultNotes = store.notes;
  if (!all && userId) {
    resultNotes = store.notes.filter((n) => n.userId === userId);
  }

  // Populate user information on notes if missing
  resultNotes = resultNotes.map((note) => {
    const user = store.users.find((u) => u.id === note.userId);
    return {
      ...note,
      userName: note.userName || user?.username || "Wavegram User",
      userAvatar: note.userAvatar || user?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${note.userId}`
    };
  });

  resultNotes.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return res.json({ notes: resultNotes });
});

// Create Note
app.post("/api/notes", (req: Request, res: Response) => {
  const { userId, title, content, category, color, moodEmoji, music, isPinned } = req.body;
  if (!userId || (!content?.trim() && !title?.trim())) {
    return res.status(400).json({ error: "userId and note content are required." });
  }

  const user = store.users.find((u) => u.id === userId);
  if (!store.notes) store.notes = [];

  const now = Date.now();
  const newNote: Note = {
    id: "note_" + Math.random().toString(36).substring(2, 10),
    userId,
    userName: user?.username || "Wavegram User",
    userAvatar: user?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${userId}`,
    title: (title || "").trim(),
    content: (content || title || "").trim(),
    category: category || "General",
    color: color || "#3390ec",
    moodEmoji: moodEmoji || undefined,
    music: music || undefined,
    isPinned: !!isPinned,
    likes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(now + 24 * 60 * 60 * 1000).toISOString()
  };

  store.notes.unshift(newNote);
  saveStore();
  broadcastEvent("note_created", newNote);

  return res.json({ success: true, note: newNote });
});

// Update / Modify Note (User can edit their own note)
app.put("/api/notes/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, title, content, category, color, moodEmoji, music, isPinned } = req.body;

  if (!store.notes) store.notes = [];
  const note = store.notes.find((n) => n.id === id);
  if (!note) return res.status(404).json({ error: "Note not found." });

  if (userId && note.userId !== userId) {
    return res.status(403).json({ error: "Unauthorized to edit this note." });
  }

  if (title !== undefined) note.title = title.trim();
  if (content !== undefined) note.content = content.trim();
  if (category !== undefined) note.category = category;
  if (color !== undefined) note.color = color;
  if (moodEmoji !== undefined) note.moodEmoji = moodEmoji;
  if (music !== undefined) note.music = music;
  if (isPinned !== undefined) note.isPinned = isPinned;
  note.updatedAt = new Date().toISOString();

  saveStore();
  broadcastEvent("note_updated", note);

  return res.json({ success: true, note });
});

// Delete Note (User can delete their own note)
app.delete("/api/notes/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.query.userId as string;

  if (!store.notes) store.notes = [];
  const noteIndex = store.notes.findIndex((n) => n.id === id);
  if (noteIndex === -1) return res.status(404).json({ error: "Note not found." });

  if (userId && store.notes[noteIndex].userId !== userId) {
    return res.status(403).json({ error: "Unauthorized to delete this note." });
  }

  const [deletedNote] = store.notes.splice(noteIndex, 1);
  saveStore();
  broadcastEvent("note_deleted", { id, userId: deletedNote.userId });

  return res.json({ success: true, id });
});

// Like / React to Note
app.post("/api/notes/:id/like", (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  if (!store.notes) store.notes = [];
  const note = store.notes.find((n) => n.id === id);
  if (!note) return res.status(404).json({ error: "Note not found." });

  if (!note.likes) note.likes = [];
  const idx = note.likes.indexOf(userId);
  if (idx > -1) {
    note.likes.splice(idx, 1);
  } else {
    note.likes.push(userId);
  }

  saveStore();
  broadcastEvent("note_updated", note);
  return res.json({ success: true, note, likesCount: note.likes.length, hasLiked: note.likes.includes(userId) });
});

// Share Note into a Chat Conversation
app.post("/api/notes/:id/share-to-chat", (req: Request, res: Response) => {
  const { id } = req.params;
  const { senderId, targetConversationId } = req.body;
  if (!senderId || !targetConversationId) {
    return res.status(400).json({ error: "senderId and targetConversationId are required." });
  }

  const sender = store.users.find((u) => u.id === senderId);
  const conv = store.conversations.find((c) => c.id === targetConversationId);
  const note = (store.notes || []).find((n) => n.id === id);

  if (!sender || !conv || !note) {
    return res.status(404).json({ error: "Sender, conversation, or note not found." });
  }

  const noteAuthor = store.users.find((u) => u.id === note.userId);

  const shareText = `📝 Note from ${noteAuthor?.username || note.userName || "User"}:\n"${note.content}"${
    note.music ? `\n🎵 Track: ${note.music.title} - ${note.music.artist}` : ""
  }`;

  const message: Message = {
    id: "msg_" + Math.random().toString(36).substring(2, 10),
    conversationId: targetConversationId,
    senderId,
    senderName: sender.username,
    senderAvatar: sender.avatar,
    text: shareText,
    type: "text",
    reactions: {},
    likes: [],
    createdAt: new Date().toISOString()
  };

  store.messages.push(message);
  conv.lastMessage = {
    text: `📝 Shared Note: "${note.content.slice(0, 40)}..."`,
    senderId,
    senderName: sender.username,
    createdAt: message.createdAt
  };
  conv.updatedAt = message.createdAt;

  saveStore();
  broadcastEvent("new_message", message, conv.participants);

  return res.json({ success: true, message });
});

// 13. Group Operations: Get Groups & Create Group
app.get(["/api/groups", "/api/groups/my-groups"], (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (userId) {
    const userGroups = store.groups.filter((g) => g.memberIds.includes(userId));
    return res.json({ groups: userGroups });
  }
  return res.json({ groups: store.groups });
});

app.post("/api/groups/create", (req: Request, res: Response) => {
  const {
    name,
    description,
    creatorId,
    avatar,
    isPrivate,
    password,
    themeColor,
    historyVisibleToNewMembers = true
  } = req.body;

  if (!name || !creatorId) {
    return res.status(400).json({ error: "Group name and creator ID required." });
  }

  const creator = store.users.find((u) => u.id === creatorId);
  const inviteCode = "WAVE-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  const now = new Date().toISOString();

  const newGroup: Group = {
    id: "group_" + Math.random().toString(36).substring(2, 10),
    name: name.trim(),
    description: description || "",
    avatar:
      avatar ||
      `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
    creatorId,
    adminIds: [creatorId],
    memberIds: [creatorId],
    isPrivate: !!isPrivate,
    password: password || undefined,
    inviteCode,
    themeColor: themeColor || "#ec4899",
    badges: [{ userId: creatorId, badgeName: "Owner", color: "#f59e0b" }],
    photoChangeHistory: [],
    historyVisibleToNewMembers: historyVisibleToNewMembers ?? true,
    memberJoinedAt: { [creatorId]: now },
    createdAt: now
  };

  store.groups.push(newGroup);

  // Create corresponding conversation
  const newConv: Conversation = {
    id: "conv_group_" + newGroup.id,
    type: "group",
    participants: [creatorId],
    groupId: newGroup.id,
    lastMessage: {
      text: `Group "${newGroup.name}" created! Invite code: ${inviteCode}`,
      senderId: creatorId,
      senderName: creator?.username || "Admin",
      createdAt: new Date().toISOString()
    },
    updatedAt: new Date().toISOString()
  };

  store.conversations.push(newConv);
  saveStore();

  broadcastEvent("group_created", { group: newGroup, conversation: newConv });

  return res.json({ group: newGroup, conversation: newConv });
});

// 14. Join Group via Invite Code or Password
app.post("/api/groups/join", (req: Request, res: Response) => {
  const { userId, inviteCode, password } = req.body;
  const group = store.groups.find(
    (g) => g.inviteCode.toUpperCase() === inviteCode?.trim()?.toUpperCase()
  );

  if (!group) {
    return res.status(404).json({ error: "Invalid group invite code." });
  }

  // Check if the user was removed/banned by an administrator
  if (group.removedMemberIds?.includes(userId)) {
    return res.status(403).json({
      error: "You were previously removed from this group by an admin. You cannot rejoin using an invite code or password unless an administrator re-adds you directly."
    });
  }

  if (group.isPrivate && group.password && group.password !== password) {
    return res.status(401).json({ error: "Incorrect group password." });
  }

  if (!group.memberJoinedAt) group.memberJoinedAt = {};

  if (!group.memberIds.includes(userId)) {
    group.memberIds.push(userId);
    group.memberJoinedAt[userId] = new Date().toISOString();

    // Add to conversation
    const conv = store.conversations.find((c) => c.groupId === group.id);
    if (conv && !conv.participants.includes(userId)) {
      conv.participants.push(userId);
    }
    saveStore();
    broadcastEvent("group_updated", group);
  }

  const conv = store.conversations.find((c) => c.groupId === group.id);
  return res.json({ group, conversation: conv });
});

// 14b. Permanently Delete Group (Admin & Creator Only)
app.post("/api/groups/delete", (req: Request, res: Response) => {
  const { groupId, requesterId } = req.body;
  const group = store.groups.find((g) => g.id === groupId);
  if (!group) return res.status(404).json({ error: "Group not found." });

  const isCreator = group.creatorId === requesterId;
  const isAdmin = group.adminIds.includes(requesterId);

  if (!isAdmin && !isCreator) {
    return res.status(403).json({ error: "Only group administrators or the owner can delete this group permanently." });
  }

  const conv = store.conversations.find((c) => c.groupId === group.id);
  const conversationId = conv?.id;

  // 1. Delete associated messages
  if (conversationId) {
    store.messages = store.messages.filter((m) => m.conversationId !== conversationId);
    store.conversations = store.conversations.filter((c) => c.id !== conversationId);
  }

  // 2. Delete group
  store.groups = store.groups.filter((g) => g.id !== groupId);
  saveStore();

  broadcastEvent("group_deleted", {
    groupId,
    conversationId,
    deletedBy: requesterId
  });

  return res.json({ success: true, groupId, conversationId });
});

// 15. Manage Group Members, Badges, Restrictions & Announcement Mode
app.post("/api/groups/members", (req: Request, res: Response) => {
  const { groupId, requesterId, targetUserId, targetUserIds, action, badgeName, badgeColor, avatar } = req.body;
  const group = store.groups.find((g) => g.id === groupId);
  if (!group) return res.status(404).json({ error: "Group not found" });

  const requester = store.users.find((u) => u.id === requesterId);
  const isCreator = group.creatorId === requesterId;
  const isAdmin = group.adminIds.includes(requesterId);

  if (!isAdmin && !isCreator) {
    return res.status(403).json({ error: "Only admins or creator can manage group settings." });
  }

  const conv = store.conversations.find((c) => c.groupId === group.id);
  const requesterName = requester?.username || "Admin";

  const addSystemMessage = (text: string) => {
    if (!conv) return;
    const sysMsg: Message = {
      id: "msg_sys_" + Math.random().toString(36).substring(2, 10),
      conversationId: conv.id,
      senderId: "system",
      senderName: "Wavegram System",
      senderAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=wavegram_sys",
      text,
      type: "text",
      reactions: {},
      likes: [],
      isSystem: true,
      createdAt: new Date().toISOString()
    };
    store.messages.push(sysMsg);
    conv.lastMessage = {
      text,
      senderId: "system",
      senderName: "System",
      createdAt: sysMsg.createdAt
    };
    conv.updatedAt = sysMsg.createdAt;
    broadcastEvent("new_message", sysMsg, conv.participants);
  };

  if (!group.removedMemberIds) group.removedMemberIds = [];

  if (action === "add") {
    if (!group.memberJoinedAt) group.memberJoinedAt = {};
    // Un-blacklist / clear from removedMemberIds since an admin explicitly added them
    group.removedMemberIds = group.removedMemberIds.filter((id) => id !== targetUserId);

    if (!group.memberIds.includes(targetUserId)) {
      group.memberIds.push(targetUserId);
      group.memberJoinedAt[targetUserId] = new Date().toISOString();
      if (conv && !conv.participants.includes(targetUserId)) {
        conv.participants.push(targetUserId);
      }
      const targetUser = store.users.find((u) => u.id === targetUserId);
      addSystemMessage(`${targetUser?.username || "New member"} was added to the group by ${requesterName}.`);
    }
  } else if (action === "add_bulk" && Array.isArray(targetUserIds)) {
    if (!group.memberJoinedAt) group.memberJoinedAt = {};
    const addedNames: string[] = [];

    targetUserIds.forEach((uid) => {
      // Clear from removedMemberIds
      group.removedMemberIds = group.removedMemberIds?.filter((id) => id !== uid) || [];
      if (!group.memberIds.includes(uid)) {
        group.memberIds.push(uid);
        group.memberJoinedAt![uid] = new Date().toISOString();
        if (conv && !conv.participants.includes(uid)) {
          conv.participants.push(uid);
        }
        const u = store.users.find((user) => user.id === uid);
        if (u) addedNames.push(u.username);
      }
    });

    if (addedNames.length > 0) {
      addSystemMessage(`${addedNames.join(", ")} were added to the group by ${requesterName}.`);
    }
  } else if (action === "update_avatar") {
    // 5 changes per 48 hours (2 days) rule
    if (!group.photoChangeHistory) group.photoChangeHistory = [];
    const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
    // Clean up timestamps older than 48 hours
    const recentChanges = group.photoChangeHistory.filter((ts) => new Date(ts).getTime() >= twoDaysAgo);

    if (recentChanges.length >= 5) {
      // Find when the oldest change within the window will expire
      const oldestChange = new Date(recentChanges[0]).getTime();
      const resetTimeRemainingHours = Math.ceil((oldestChange + 48 * 3600 * 1000 - Date.now()) / (3600 * 1000));
      return res.status(429).json({
        error: `Photo change limit reached: Group photo can only be changed 5 times every 2 days. Try again in ~${resetTimeRemainingHours} hour(s).`
      });
    }

    if (avatar) {
      group.avatar = avatar;
      recentChanges.push(new Date().toISOString());
      group.photoChangeHistory = recentChanges;
      addSystemMessage(`Admin ${requesterName} updated the group photo.`);
    }
  } else if (action === "toggle_history_visibility") {
    group.historyVisibleToNewMembers = group.historyVisibleToNewMembers === false ? true : false;
    if (group.historyVisibleToNewMembers) {
      addSystemMessage(`Admin ${requesterName} enabled past chat history for new members.`);
    } else {
      addSystemMessage(`Admin ${requesterName} hid past chat history for new members (only new messages will be visible).`);
    }
  } else if (action === "remove") {
    if (targetUserId === group.creatorId) {
      return res.status(400).json({ error: "Cannot remove the group owner." });
    }
    const targetUser = store.users.find((u) => u.id === targetUserId);
    const targetName = targetUser?.username || "Member";

    // Add to removedMemberIds so they cannot rejoin with an invite code
    if (!group.removedMemberIds.includes(targetUserId)) {
      group.removedMemberIds.push(targetUserId);
    }

    group.memberIds = group.memberIds.filter((id) => id !== targetUserId);
    group.adminIds = group.adminIds.filter((id) => id !== targetUserId);
    if (group.restrictedMemberIds) {
      group.restrictedMemberIds = group.restrictedMemberIds.filter((id) => id !== targetUserId);
    }
    if (conv) {
      conv.participants = conv.participants.filter((id) => id !== targetUserId);
    }

    addSystemMessage(`Admin ${requesterName} removed ${targetName} from the group.`);
    broadcastEvent("member_removed", {
      groupId: group.id,
      conversationId: conv?.id,
      removedUserIds: [targetUserId]
    });
  } else if (action === "remove_bulk" && Array.isArray(targetUserIds)) {
    const validTargets = targetUserIds.filter((id) => id !== group.creatorId);
    const targetNames: string[] = [];

    validTargets.forEach((id) => {
      const u = store.users.find((user) => user.id === id);
      if (u) targetNames.push(u.username);

      // Add to removedMemberIds
      if (!group.removedMemberIds!.includes(id)) {
        group.removedMemberIds!.push(id);
      }

      group.memberIds = group.memberIds.filter((mId) => mId !== id);
      group.adminIds = group.adminIds.filter((aId) => aId !== id);
      if (group.restrictedMemberIds) {
        group.restrictedMemberIds = group.restrictedMemberIds.filter((rId) => rId !== id);
      }
      if (conv) {
        conv.participants = conv.participants.filter((pId) => pId !== id);
      }
    });

    if (targetNames.length > 0) {
      addSystemMessage(`Admin ${requesterName} removed ${targetNames.join(", ")} from the group.`);
    }
    broadcastEvent("member_removed", {
      groupId: group.id,
      conversationId: conv?.id,
      removedUserIds: validTargets
    });
  } else if (action === "update_theme") {
    if (badgeColor) {
      group.themeColor = badgeColor;
      addSystemMessage(`Admin ${requesterName} updated the group theme color.`);
    }
  } else if (action === "restrict_member") {
    if (targetUserId === group.creatorId) {
      return res.status(400).json({ error: "Cannot restrict the group owner." });
    }
    if (!group.restrictedMemberIds) group.restrictedMemberIds = [];

    const isCurrentlyRestricted = group.restrictedMemberIds.includes(targetUserId);
    const targetUser = store.users.find((u) => u.id === targetUserId);
    const targetName = targetUser?.username || "Member";

    if (isCurrentlyRestricted) {
      group.restrictedMemberIds = group.restrictedMemberIds.filter((id) => id !== targetUserId);
      addSystemMessage(`Admin ${requesterName} removed read-only restriction for ${targetName}.`);
    } else {
      group.restrictedMemberIds.push(targetUserId);
      addSystemMessage(`Admin ${requesterName} restricted ${targetName} to read-only mode.`);
    }
  } else if (action === "toggle_announcement_mode") {
    group.announcementMode = !group.announcementMode;
    group.onlyAdminMessagesVisible = group.announcementMode;

    if (group.announcementMode) {
      addSystemMessage(`📢 Admin ${requesterName} enabled Announcement Mode (Only admins can send messages).`);
    } else {
      addSystemMessage(`📢 Admin ${requesterName} disabled Announcement Mode (All members can now send messages).`);
    }
  } else if (action === "toggle_admin") {
    if (group.adminIds.includes(targetUserId)) {
      if (targetUserId === group.creatorId) {
        return res.status(400).json({ error: "Cannot revoke admin from group owner." });
      }
      group.adminIds = group.adminIds.filter((id) => id !== targetUserId);
    } else {
      group.adminIds.push(targetUserId);
    }
  } else if (action === "add_badge") {
    if (badgeName) {
      group.badges = group.badges.filter((b) => b.userId !== targetUserId);
      group.badges.push({
        userId: targetUserId,
        badgeName,
        color: badgeColor || "#3b82f6"
      });
    }
  }

  saveStore();
  broadcastEvent("group_updated", group);
  return res.json({ group });
});

// 16. GIF Search / Trending Endpoint
// 16. Comprehensive GIF Search & Categorized Catalog
const COMPREHENSIVE_GIFS = [
  // Professional & Business
  { id: "g_pro_1", title: "Success & Cheering", category: "pro", tags: ["success", "work", "win", "celebrate", "pro"], url: "https://media.giphy.com/media/26tp15iV2r2R1yL3q/giphy.gif" },
  { id: "g_pro_2", title: "Cheers Leonardo DiCaprio", category: "pro", tags: ["cheers", "toast", "great job", "pro", "class"], url: "https://media.giphy.com/media/GCLlQnV7dXZ2E/giphy.gif" },
  { id: "g_pro_3", title: "High Five Teamwork", category: "pro", tags: ["high five", "team", "collab", "work", "pro"], url: "https://media.giphy.com/media/3oEjHV0z8S7WM4MwnK/giphy.gif" },
  { id: "g_pro_4", title: "Fast Coding Hacker", category: "tech", tags: ["code", "coding", "developer", "typing", "tech"], url: "https://media.giphy.com/media/ule4akeXnUSVa/giphy.gif" },
  { id: "g_pro_5", title: "Rocket Launch Off", category: "pro", tags: ["rocket", "launch", "startup", "growth", "boost"], url: "https://media.giphy.com/media/mi6DsSSKsJAaI/giphy.gif" },
  { id: "g_pro_6", title: "Standing Ovation Applause", category: "pro", tags: ["applause", "clapping", "bravo", "respect", "pro"], url: "https://media.giphy.com/media/fnK0jeA8vIh2QLq3IZ/giphy.gif" },
  { id: "g_pro_7", title: "Thumbs Up Approval", category: "reactions", tags: ["thumbs up", "agree", "yes", "approved", "ok"], url: "https://media.giphy.com/media/13G7rg64yjh3l6/giphy.gif" },
  { id: "g_pro_8", title: "Mind Blown Galaxy", category: "reactions", tags: ["mind blown", "wow", "amazing", "genius", "space"], url: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif" },
  { id: "g_pro_9", title: "Nodding in Agreement", category: "reactions", tags: ["nod", "agree", "yes", "understood", "listen"], url: "https://media.giphy.com/media/n4o4W99YdfSHK/giphy.gif" },
  { id: "g_pro_10", title: "Cyber Matrix Code Stream", category: "tech", tags: ["matrix", "cyber", "neon", "code", "tech"], url: "https://media.giphy.com/media/eIm624c8nnNbiG0V3g/giphy.gif" },
  { id: "g_pro_11", title: "Coffee Steam Focus", category: "vibe", tags: ["coffee", "morning", "work", "focus", "cafe"], url: "https://media.giphy.com/media/hPTZgtzfRIB5Nfb5rL/giphy.gif" },
  { id: "g_pro_12", title: "Popcorn Watching Drama", category: "reactions", tags: ["popcorn", "movie", "excited", "chat", "fun"], url: "https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif" },
  { id: "g_pro_13", title: "Dancing Carlton Celebration", category: "vibe", tags: ["dance", "party", "happy", "friday", "fun"], url: "https://media.giphy.com/media/3o7qDQ4kcSD1v8AEIQ/giphy.gif" },
  { id: "g_pro_14", title: "Cool Hacker Cat", category: "vibe", tags: ["cat", "hacker", "cool", "vibes", "cute"], url: "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" },
  { id: "g_pro_15", title: "Golden Sparkles Magic", category: "plumes", tags: ["sparkle", "gold", "feather", "magic", "plume", "art"], url: "https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif" },
  { id: "g_pro_16", title: "Floating Ink & Feather Quill", category: "plumes", tags: ["feather", "plume", "quill", "write", "poetry", "ink"], url: "https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif" },
  { id: "g_pro_17", title: "Neon Synthwave Ride", category: "tech", tags: ["synthwave", "neon", "retro", "future", "car"], url: "https://media.giphy.com/media/XIqCQx02E1U9W/giphy.gif" },
  { id: "g_pro_18", title: "Let's Go Hype", category: "reactions", tags: ["hype", "lets go", "win", "fire", "pumped"], url: "https://media.giphy.com/media/7WvAUvZZTRpSuudobh/giphy.gif" },
  { id: "g_pro_19", title: "Lofi Beats Relaxing Room", category: "vibe", tags: ["lofi", "relax", "music", "night", "study"], url: "https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif" },
  { id: "g_pro_20", title: "Peacock Royal Feathers Spread", category: "plumes", tags: ["peacock", "feather", "plume", "beauty", "nature"], url: "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif" },
  { id: "g_pro_21", title: "Laughing Out Loud LOL", category: "reactions", tags: ["laugh", "lol", "funny", "joke", "haha"], url: "https://media.giphy.com/media/l1J3pT777D3UsN2uA/giphy.gif" },
  { id: "g_pro_22", title: "Galaxy Nebula Swirl", category: "tech", tags: ["galaxy", "space", "stars", "universe", "glow"], url: "https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif" },
  { id: "g_pro_23", title: "Phoenix Rising Fire", category: "plumes", tags: ["phoenix", "fire", "feather", "plume", "epic"], url: "https://media.giphy.com/media/3o7TKTDnUxE0g2fSE8/giphy.gif" },
  { id: "g_pro_24", title: "Cute Panda Wave", category: "vibe", tags: ["panda", "hello", "cute", "wave", "welcome"], url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGZuaHM3N3E5NXg2azR6czgwOWUya3ByM3h6dHkzODUzc3Nwb3k1MCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/L13y8N9T7p8qA/giphy.gif" }
];

// Rich Stickers Collection with dedicated Plumes / Feathers & Multi-theme Packs
const COMPREHENSIVE_STICKERS = [
  // 🪶 THEME 1: Plumes & Feathers (Spécial Plumes Magnifiques & Animées)
  {
    id: "stk_feather_1",
    title: "Plume d'Or Luminescente",
    category: "plumes",
    tags: ["plume", "feather", "gold", "or", "luxe", "magic"],
    url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=80",
    isFeather: true,
    animationStyle: "gold"
  },
  {
    id: "stk_feather_2",
    title: "Plume de Paon Royale",
    category: "plumes",
    tags: ["plume", "feather", "paon", "peacock", "royal", "emerald"],
    url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=300&auto=format&fit=crop&q=80",
    isFeather: true,
    animationStyle: "feather-float"
  },
  {
    id: "stk_feather_3",
    title: "Plume de Phénix Flamboyante",
    category: "plumes",
    tags: ["plume", "feather", "phoenix", "fire", "flamme", "epic"],
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80",
    isFeather: true,
    animationStyle: "pulse"
  },
  {
    id: "stk_feather_4",
    title: "Plume d'Ange Céleste",
    category: "plumes",
    tags: ["plume", "feather", "ange", "angel", "celestial", "pure", "white"],
    url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&auto=format&fit=crop&q=80",
    isFeather: true,
    animationStyle: "feather-sway"
  },
  {
    id: "stk_feather_5",
    title: "Plume Calligraphie d'Encre",
    category: "plumes",
    tags: ["plume", "feather", "ink", "quill", "ecriture", "poesie"],
    url: "https://images.unsplash.com/photo-1583484963886-cfe2bff2945f?w=300&auto=format&fit=crop&q=80",
    isFeather: true,
    animationStyle: "feather-float"
  },
  {
    id: "stk_feather_6",
    title: "Plume Aurore Boréale",
    category: "plumes",
    tags: ["plume", "feather", "aurora", "cyan", "purple", "magic", "glow"],
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80",
    isFeather: true,
    animationStyle: "glow"
  },
  {
    id: "stk_feather_7",
    title: "Plume Néon Cyberpunk",
    category: "plumes",
    tags: ["plume", "feather", "neon", "cyber", "futur", "holo"],
    url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=300&auto=format&fit=crop&q=80",
    isFeather: true,
    animationStyle: "glow"
  },
  {
    id: "stk_feather_8",
    title: "Plume Féerique Pastel",
    category: "plumes",
    tags: ["plume", "feather", "pink", "pastel", "fairy", "douceur"],
    url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=300&auto=format&fit=crop&q=80",
    isFeather: true,
    animationStyle: "feather-sway"
  },
  // 💎 THEME 2: 3D Glossy Emojis & Gems
  {
    id: "stk_3d_1",
    title: "Golden Crown 3D",
    category: "3d",
    tags: ["crown", "king", "gold", "vip", "winner"],
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=crown3d",
    animationStyle: "gold"
  },
  {
    id: "stk_3d_2",
    title: "Flaming Heart 3D",
    category: "3d",
    tags: ["heart", "fire", "love", "passion"],
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=fireheart",
    animationStyle: "pulse"
  },
  {
    id: "stk_3d_3",
    title: "Crystal Diamond 3D",
    category: "3d",
    tags: ["diamond", "gem", "crystal", "rich"],
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=diamondgem",
    animationStyle: "glow"
  },
  {
    id: "stk_3d_4",
    title: "Rocket Boost 3D",
    category: "3d",
    tags: ["rocket", "boost", "speed", "launch"],
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=boostrocket",
    animationStyle: "bounce"
  },
  {
    id: "stk_3d_5",
    title: "Star Sparkle 3D",
    category: "3d",
    tags: ["star", "sparkle", "magic", "glow"],
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=starshine",
    animationStyle: "gold"
  },
  {
    id: "stk_3d_6",
    title: "Champion Trophy 3D",
    category: "3d",
    tags: ["trophy", "win", "1st", "champion"],
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=trophywin",
    animationStyle: "gold"
  },
  // ⚡ THEME 3: Cyberpunk & Neon Tech
  {
    id: "stk_cyber_1",
    title: "Cyber Visor Hologram",
    category: "cyber",
    tags: ["cyber", "visor", "vr", "future", "neon"],
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=cybervisor",
    animationStyle: "glow"
  },
  {
    id: "stk_cyber_2",
    title: "Neon Skull Pulse",
    category: "cyber",
    tags: ["neon", "skull", "cool", "cyberpunk"],
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=neonskull",
    animationStyle: "pulse"
  },
  {
    id: "stk_cyber_3",
    title: "Retro Gamepad Glitch",
    category: "cyber",
    tags: ["gamepad", "gaming", "retro", "arcade"],
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=glitchpad",
    animationStyle: "bounce"
  },
  {
    id: "stk_cyber_4",
    title: "Quantum Code Orb",
    category: "cyber",
    tags: ["quantum", "code", "ai", "tech"],
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=quantumai",
    animationStyle: "glow"
  },
  // 🐱 THEME 4: Cute Kawaii & Pets
  {
    id: "stk_cute_1",
    title: "Coder Cat Coffee",
    category: "cute",
    tags: ["cat", "coder", "coffee", "kawaii", "pet"],
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=catcoder",
    animationStyle: "bounce"
  },
  {
    id: "stk_cute_2",
    title: "Happy Shiba Inu",
    category: "cute",
    tags: ["shiba", "dog", "happy", "doge", "pet"],
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=shibadoge",
    animationStyle: "bounce"
  },
  {
    id: "stk_cute_3",
    title: "Panda Heart Hug",
    category: "cute",
    tags: ["panda", "hug", "love", "cute"],
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=pandahug",
    animationStyle: "pulse"
  },
  {
    id: "stk_cute_4",
    title: "Fluffy Bunny Star",
    category: "cute",
    tags: ["bunny", "star", "fluffy", "cute"],
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=bunnyfluff",
    animationStyle: "bounce"
  },
  // 🌸 THEME 5: Nature Zen & Aesthetic
  {
    id: "stk_zen_1",
    title: "Sakura Cherry Blossom",
    category: "zen",
    tags: ["sakura", "cherry", "flower", "spring", "zen"],
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=sakurazen",
    animationStyle: "feather-sway"
  },
  {
    id: "stk_zen_2",
    title: "Glowing Magic Lotus",
    category: "zen",
    tags: ["lotus", "glow", "meditation", "water"],
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=magiclotus",
    animationStyle: "glow"
  },
  {
    id: "stk_zen_3",
    title: "Crescent Moon & Stars",
    category: "zen",
    tags: ["moon", "night", "stars", "sleep", "calm"],
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=moonnight",
    animationStyle: "feather-float"
  },
  {
    id: "stk_zen_4",
    title: "Golden Sun Ray",
    category: "zen",
    tags: ["sun", "morning", "day", "warmth"],
    url: "https://api.dicebear.com/7.x/bottts/svg?seed=goldsun",
    animationStyle: "gold"
  }
];

app.get("/api/gifs/search", (req: Request, res: Response) => {
  const query = ((req.query.q as string) || "").toLowerCase().trim();
  const category = (req.query.category as string) || "all";

  let results = COMPREHENSIVE_GIFS;

  if (category !== "all") {
    results = results.filter((g) => g.category === category);
  }

  if (query) {
    results = results.filter(
      (g) =>
        g.title.toLowerCase().includes(query) ||
        (g.tags && g.tags.some((t) => t.toLowerCase().includes(query)))
    );
  }

  return res.json({ gifs: results });
});

// 16b. Stickers Endpoint
app.get("/api/stickers", (req: Request, res: Response) => {
  const query = ((req.query.q as string) || "").toLowerCase().trim();
  const category = (req.query.category as string) || "all";

  let results = COMPREHENSIVE_STICKERS;

  if (category !== "all") {
    results = results.filter((s) => s.category === category);
  }

  if (query) {
    results = results.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.tags.some((t) => t.toLowerCase().includes(query))
    );
  }

  return res.json({
    stickers: results,
    categories: [
      { id: "all", label: "✨ All Stickers", count: COMPREHENSIVE_STICKERS.length },
      { id: "plumes", label: "🪶 Feathers & Wings", count: COMPREHENSIVE_STICKERS.filter(s => s.category === "plumes").length },
      { id: "3d", label: "💎 3D Emojis & Gems", count: COMPREHENSIVE_STICKERS.filter(s => s.category === "3d").length },
      { id: "cyber", label: "⚡ Cyber & Neon", count: COMPREHENSIVE_STICKERS.filter(s => s.category === "cyber").length },
      { id: "cute", label: "🐱 Cute Kawaii", count: COMPREHENSIVE_STICKERS.filter(s => s.category === "cute").length },
      { id: "zen", label: "🌸 Nature & Zen", count: COMPREHENSIVE_STICKERS.filter(s => s.category === "zen").length }
    ]
  });
});

// 17. Voice & Video Calls Signaling
app.post("/api/calls/signal", (req: Request, res: Response) => {
  const { action, callId, callerId, targetId, type, callerName, callerAvatar } = req.body;

  if (action === "start") {
    const caller = store.users.find((u) => u.id === callerId);
    const target = store.users.find((u) => u.id === targetId);

    if (target?.blockedUserIds?.includes(callerId)) {
      return res.status(403).json({ error: "Cannot start call: You are blocked by this user." });
    }
    if (caller?.blockedUserIds?.includes(targetId)) {
      return res.status(400).json({ error: "Cannot start call: You have blocked this user. Unblock them first." });
    }

    const call: ActiveCall = {
      id: callId || "call_" + Math.random().toString(36).substring(2, 10),
      callerId,
      callerName: callerName || caller?.username || "Wavegram User",
      callerAvatar: callerAvatar || caller?.avatar || "",
      targetId,
      targetName: target?.username || "Recipient",
      type: type || "voice",
      status: "ringing",
      isVoiceEnhanced: true,
      startedAt: new Date().toISOString()
    };

    currentActiveCalls[call.id] = call;
    broadcastEvent("call_incoming", call);
    return res.json({ call });
  }

  if (action === "accept") {
    const call = currentActiveCalls[callId];
    if (call) {
      call.status = "connected";
      broadcastEvent("call_status", call);
    }
    return res.json({ call });
  }

  if (action === "end") {
    const call = currentActiveCalls[callId];
    if (call) {
      call.status = "ended";
      broadcastEvent("call_status", call);
      delete currentActiveCalls[callId];
    }
    return res.json({ status: "ended" });
  }

  return res.status(400).json({ error: "Unknown call action" });
});

// 18. Analytics Endpoint
app.get("/api/analytics/:userId", (req: Request, res: Response) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  let user = store.users.find((u) => u.id === userId);
  if (!user) {
    // Gracefully handle session or newly initialized users
    user = {
      id: userId,
      username: "Wavegram User",
      email: `${userId}@wavegram.io`,
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${userId}`,
      status: "online",
      bio: "Active on Wavegram",
      blockedUserIds: [],
      createdAt: new Date().toISOString()
    };
    store.users.push(user);
    saveStore();
  }

  const userMessages = store.messages.filter((m) => m.senderId === userId);
  const totalSent = userMessages.length;

  let totalReceived = 0;
  const contactMsgCounts: Record<string, { sent: number; received: number }> = {};

  store.messages.forEach((m) => {
    const conv = store.conversations.find((c) => c.id === m.conversationId);
    if (!conv || !conv.participants.includes(userId)) return;

    if (m.senderId === userId) {
      conv.participants.forEach((pId) => {
        if (pId !== userId) {
          if (!contactMsgCounts[pId]) contactMsgCounts[pId] = { sent: 0, received: 0 };
          contactMsgCounts[pId].sent++;
        }
      });
    } else {
      totalReceived++;
      if (!contactMsgCounts[m.senderId]) contactMsgCounts[m.senderId] = { sent: 0, received: 0 };
      contactMsgCounts[m.senderId].received++;
    }
  });

  const voiceNotesCount = userMessages.filter((m) => m.type === "voice").length;
  const imageVideoCount = userMessages.filter((m) => m.type === "image" || m.type === "video").length;
  const gifFileCount = userMessages.filter((m) => m.type === "gif" || m.type === "file").length;
  const mediaCount = imageVideoCount + gifFileCount;

  // Calculate actual daily trends over the last 7 days
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  const dailyTrends: { date: string; sent: number; received: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayLabel = dayNames[d.getDay()];
    const dateStr = d.toISOString().split("T")[0];

    const sentOnDay = userMessages.filter((m) => m.createdAt && m.createdAt.startsWith(dateStr)).length;
    let recvOnDay = 0;
    store.messages.forEach((m) => {
      if (m.senderId !== userId && m.createdAt && m.createdAt.startsWith(dateStr)) {
        const conv = store.conversations.find((c) => c.id === m.conversationId);
        if (conv && conv.participants.includes(userId)) recvOnDay++;
      }
    });

    // If no dated messages exist for previous days, allocate a baseline or keep exact
    dailyTrends.push({
      date: dayLabel,
      sent: i === 0 ? sentOnDay : sentOnDay,
      received: i === 0 ? recvOnDay : recvOnDay
    });
  }

  // Active hours distribution
  const hourBuckets = [
    { hour: "00:00", count: 0 },
    { hour: "04:00", count: 0 },
    { hour: "08:00", count: 0 },
    { hour: "12:00", count: 0 },
    { hour: "16:00", count: 0 },
    { hour: "20:00", count: 0 }
  ];

  userMessages.forEach((m) => {
    try {
      const date = new Date(m.createdAt);
      const h = date.getHours();
      if (h >= 0 && h < 4) hourBuckets[0].count++;
      else if (h >= 4 && h < 8) hourBuckets[1].count++;
      else if (h >= 8 && h < 12) hourBuckets[2].count++;
      else if (h >= 12 && h < 16) hourBuckets[3].count++;
      else if (h >= 16 && h < 20) hourBuckets[4].count++;
      else hourBuckets[5].count++;
    } catch (e) {}
  });

  const mediaBreakdown = [
    { name: "Text Messages", value: Math.max(0, totalSent - voiceNotesCount - mediaCount) },
    { name: "Voice Notes", value: voiceNotesCount },
    { name: "Images & Video", value: imageVideoCount },
    { name: "GIFs & Files", value: gifFileCount }
  ];

  // Top contacts list
  const topContacts = Object.entries(contactMsgCounts)
    .map(([cUserId, counts]) => {
      const cUser = store.users.find((u) => u.id === cUserId);
      const totalExchanged = counts.sent + counts.received;
      return {
        name: cUser ? cUser.username : "Wavegram Member",
        avatar: cUser ? cUser.avatar : `https://api.dicebear.com/7.x/identicon/svg?seed=${cUserId}`,
        messages: totalExchanged,
        hoursSpent: `${(totalExchanged * 0.05).toFixed(1)}h spent`,
        responseTime: `~${Math.max(12, Math.floor(45 - totalExchanged))}s response time`
      };
    })
    .sort((a, b) => b.messages - a.messages)
    .slice(0, 4);

  // If topContacts empty, populate with other users
  if (topContacts.length === 0) {
    store.users
      .filter((u) => u.id !== userId)
      .slice(0, 3)
      .forEach((u) => {
        topContacts.push({
          name: u.username,
          avatar: u.avatar,
          messages: 0,
          hoursSpent: "0.0h spent",
          responseTime: "N/A"
        });
      });
  }

  const hoursSpent = Number(((totalSent * 0.08) + (totalReceived * 0.05) + (voiceNotesCount * 0.1)).toFixed(1));
  const totalMsgs = totalSent + totalReceived;
  const streak = totalSent > 0 ? Math.min(30, Math.ceil(totalSent / 2)) : 0;
  const engagement = totalMsgs > 0 ? Math.min(100, 50 + totalMsgs * 3) : 10;

  const analyticsData: UserAnalytics = {
    userId,
    hoursSpent,
    totalMessagesSent: totalSent,
    totalMessagesReceived: totalReceived,
    totalMessages: totalMsgs,
    totalVoiceNotes: voiceNotesCount,
    totalMediaShared: mediaCount,
    totalCallsMade: Math.floor(totalSent / 5),
    totalCallDurationMinutes: Math.floor(totalSent * 1.5),
    activeStreakDays: streak,
    activeHours: hourBuckets,
    dailyTrends,
    mediaBreakdown,
    engagementScore: engagement,
    topContacts
  };

  return res.json({ analytics: analyticsData });
});

// ==========================================
// STORIES API ENDPOINTS
// ==========================================

// 1. Get all active stories with privacy filtering
app.get("/api/stories", (req: Request, res: Response) => {
  if (!store.stories) store.stories = [];
  const now = Date.now();
  const viewerId = req.query.viewerId as string;
  
  // Clean up expired stories older than 48 hours to prevent unbounded memory growth
  store.stories = store.stories.filter((s) => {
    const expires = s.expiresAt ? new Date(s.expiresAt).getTime() : new Date(s.createdAt).getTime() + 24 * 60 * 60 * 1000;
    return expires > now - 24 * 60 * 60 * 1000;
  });

  // Filter based on privacy:
  const filteredStories = store.stories.filter((story) => {
    // If hidden from viewer:
    if (viewerId && Array.isArray(story.hiddenFromUserIds) && story.hiddenFromUserIds.includes(viewerId)) {
      return false;
    }

    const author = store.users.find((u) => u.id === story.userId);

    // If Close Friends Only story:
    if (story.isCloseFriendsOnly) {
      if (viewerId && viewerId !== story.userId) {
        if (!author?.closeFriendsUserIds || !author.closeFriendsUserIds.includes(viewerId)) {
          return false;
        }
      }
    }

    // If author has private profile and viewer is different user
    if (viewerId && viewerId !== story.userId) {
      if (author && author.isPrivate) {
        // If viewer is blocked by author, hide
        if (author.blockedUserIds?.includes(viewerId)) {
          return false;
        }
        // Must share a direct conversation (contact/DM)
        const hasDirectChat = (store.conversations || []).some(
          (c) => c.type === "dm" && c.participants.includes(viewerId) && c.participants.includes(story.userId)
        );
        if (!hasDirectChat) return false;
      }
    }
    return true;
  });

  return res.json({ stories: filteredStories });
});

// 2. Create new story (image, video up to 60s, styled text story, or NGL anonymous Q&A)
app.post("/api/stories", (req: Request, res: Response) => {
  const {
    userId,
    userName,
    userAvatar,
    type,
    mediaUrl,
    videoDuration,
    textContent,
    textStyle,
    caption,
    captionPosition,
    isCloseFriendsOnly,
    disableSharing,
    hiddenFromUserIds,
    montage,
    tags,
    location,
    music,
    duration,
    anonymousPrompt,
    sharedAnswerData
  } = req.body;

  if (!userId || !type) {
    return res.status(400).json({ error: "userId and type are required." });
  }

  // Validate user exists
  const user = store.users.find((u) => u.id === userId);
  const authorName = userName || user?.username || "Wavegram User";
  const authorAvatar = userAvatar || user?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${userId}`;

  // Video duration ceiling rule: max 60 seconds (1 minute)
  let validatedVideoDuration = videoDuration;
  if (type === "video") {
    if (validatedVideoDuration && validatedVideoDuration > 60) {
      validatedVideoDuration = 60; // strictly capped at 60 seconds
    }
  }

  const newStory: Story = {
    id: "story_" + Math.random().toString(36).substring(2, 11),
    userId,
    userName: authorName,
    userAvatar: authorAvatar,
    type,
    mediaUrl: mediaUrl || undefined,
    videoDuration: validatedVideoDuration,
    textContent: textContent || undefined,
    textStyle: textStyle || undefined,
    caption: caption ? caption.trim() : undefined,
    captionPosition: captionPosition || { x: 50, y: 88 },
    isCloseFriendsOnly: !!isCloseFriendsOnly,
    disableSharing: !!disableSharing,
    hiddenFromUserIds: Array.isArray(hiddenFromUserIds) ? hiddenFromUserIds : [],
    montage: montage || undefined,
    tags: Array.isArray(tags) ? tags : [],
    location: location ? location.trim() : undefined,
    music: music || undefined,
    anonymousPrompt: anonymousPrompt || undefined,
    anonymousAnswers: [],
    sharedAnswerData: sharedAnswerData || undefined,
    reactions: {},
    comments: [],
    viewers: [],
    duration: type === "video" ? (validatedVideoDuration ? Math.min(60, Math.max(3, validatedVideoDuration)) : 10) : (duration || 6),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };

  if (!store.stories) store.stories = [];
  store.stories.unshift(newStory);
  saveStore();

  broadcastEvent("story_created", newStory);

  return res.json({ story: newStory });
});

// 3. Edit / Modify story (Creator only)
app.put("/api/stories/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, caption, captionPosition, isCloseFriendsOnly, disableSharing, hiddenFromUserIds, textContent, textStyle, tags, location, music, montage } = req.body;

  if (!store.stories) store.stories = [];
  const story = store.stories.find((s) => s.id === id);

  if (!story) {
    return res.status(404).json({ error: "Story not found." });
  }

  if (story.userId !== userId) {
    return res.status(403).json({ error: "Only the story creator can modify this story." });
  }

  if (caption !== undefined) story.caption = caption;
  if (captionPosition !== undefined) story.captionPosition = captionPosition;
  if (isCloseFriendsOnly !== undefined) story.isCloseFriendsOnly = !!isCloseFriendsOnly;
  if (disableSharing !== undefined) story.disableSharing = !!disableSharing;
  if (hiddenFromUserIds !== undefined) story.hiddenFromUserIds = Array.isArray(hiddenFromUserIds) ? hiddenFromUserIds : [];
  if (textContent !== undefined) story.textContent = textContent;
  if (textStyle !== undefined) story.textStyle = textStyle;
  if (tags !== undefined) story.tags = tags;
  if (location !== undefined) story.location = location;
  if (music !== undefined) story.music = music;
  if (montage !== undefined) story.montage = montage;

  story.isEdited = true;
  story.editedAt = new Date().toISOString();

  saveStore();
  broadcastEvent("story_updated", story);

  return res.json({ story });
});

// 4. Delete story (Creator only)
app.delete("/api/stories/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.query.userId as string;

  if (!store.stories) store.stories = [];
  const index = store.stories.findIndex((s) => s.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Story not found." });
  }

  const story = store.stories[index];
  if (userId && story.userId !== userId) {
    return res.status(403).json({ error: "Only the creator can delete this story." });
  }

  store.stories.splice(index, 1);
  saveStore();

  broadcastEvent("story_deleted", { storyId: id });

  return res.json({ success: true, storyId: id });
});

// 5. Record Story View
app.post("/api/stories/:id/view", (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, userName, userAvatar } = req.body;

  if (!store.stories) store.stories = [];
  const story = store.stories.find((s) => s.id === id);

  if (!story) {
    return res.status(404).json({ error: "Story not found." });
  }

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const existingViewer = story.viewers.find((v) => v.userId === userId);
  if (!existingViewer) {
    const user = store.users.find((u) => u.id === userId);
    const viewerRecord = {
      userId,
      userName: userName || user?.username || "Wavegram User",
      userAvatar: userAvatar || user?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${userId}`,
      viewedAt: new Date().toISOString()
    };
    story.viewers.push(viewerRecord);
    saveStore();
    broadcastEvent("story_viewed", { storyId: id, viewer: viewerRecord });
  }

  return res.json({ viewers: story.viewers });
});

// 6. React / Toggle emoji reaction on story
app.post("/api/stories/:id/react", (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, emoji } = req.body;

  if (!store.stories) store.stories = [];
  const story = store.stories.find((s) => s.id === id);

  if (!story) {
    return res.status(404).json({ error: "Story not found." });
  }

  if (!userId || !emoji) {
    return res.status(400).json({ error: "userId and emoji are required." });
  }

  if (!story.reactions) story.reactions = {};

  const currentReactors = story.reactions[emoji] || [];
  if (currentReactors.includes(userId)) {
    // remove reaction
    story.reactions[emoji] = currentReactors.filter((u) => u !== userId);
    if (story.reactions[emoji].length === 0) {
      delete story.reactions[emoji];
    }
  } else {
    // add reaction
    story.reactions[emoji] = [...currentReactors, userId];
  }

  // Update viewer's reaction if present
  const viewer = story.viewers.find((v) => v.userId === userId);
  if (viewer) {
    viewer.reaction = story.reactions[emoji]?.includes(userId) ? emoji : undefined;
  }

  saveStore();
  broadcastEvent("story_reaction", { storyId: id, reactions: story.reactions, emoji, userId });

  return res.json({ reactions: story.reactions });
});

// 7. Add Comment or Reply on Story
app.post("/api/stories/:id/comments", (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, userName, userAvatar, text, parentId, replyToUserName } = req.body;

  if (!store.stories) store.stories = [];
  const story = store.stories.find((s) => s.id === id);

  if (!story) {
    return res.status(404).json({ error: "Story not found." });
  }

  if (!userId || !text || !text.trim()) {
    return res.status(400).json({ error: "userId and text are required." });
  }

  const user = store.users.find((u) => u.id === userId);
  const newComment: StoryComment = {
    id: "sc_" + Math.random().toString(36).substring(2, 11),
    storyId: id,
    userId,
    userName: userName || user?.username || "Wavegram User",
    userAvatar: userAvatar || user?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${userId}`,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    parentId: parentId || undefined,
    replyToUserName: replyToUserName || undefined,
    likes: []
  };

  if (!story.comments) story.comments = [];
  story.comments.push(newComment);

  // Requirement: When someone replies to a story, ALSO send it directly to their DM chat!
  if (userId !== story.userId) {
    let dmConv = store.conversations.find(
      (c) =>
        c.type === "dm" &&
        c.participants.includes(userId) &&
        c.participants.includes(story.userId)
    );

    if (!dmConv) {
      dmConv = {
        id: "conv_dm_" + Math.random().toString(36).substring(2, 10),
        type: "dm",
        participants: [userId, story.userId],
        updatedAt: new Date().toISOString()
      };
      store.conversations.push(dmConv);
      broadcastEvent("conversation_created", dmConv);
    }

    const replyChatText = `Replied to your story: "${text.trim()}"`;
    const storySnippet = story.caption || story.textContent || (story.anonymousPrompt ? story.anonymousPrompt.question : "Story Snapshot");

    const chatMsg: Message = {
      id: "msg_story_reply_" + Math.random().toString(36).substring(2, 11),
      conversationId: dmConv.id,
      senderId: userId,
      senderName: newComment.userName,
      senderAvatar: newComment.userAvatar,
      text: replyChatText,
      type: story.type === "video" ? "video" : story.type === "image" ? "image" : "text",
      mediaUrl: story.mediaUrl,
      reactions: {},
      likes: [],
      replyTo: {
        id: story.id,
        senderName: story.userName,
        text: storySnippet,
        type: "story"
      },
      createdAt: new Date().toISOString()
    };

    store.messages.push(chatMsg);
    dmConv.lastMessage = {
      text: replyChatText,
      senderId: userId,
      senderName: chatMsg.senderName,
      createdAt: chatMsg.createdAt
    };
    dmConv.updatedAt = chatMsg.createdAt;
    broadcastEvent("new_message", chatMsg, dmConv.participants);
  }

  saveStore();
  broadcastEvent("story_comment", { storyId: id, comment: newComment });

  return res.json({ comment: newComment, comments: story.comments });
});

// 7b. Submit 100% Anonymous Answer to Story (NGL Style)
app.post("/api/stories/:id/anonymous-answers", (req: Request, res: Response) => {
  const { id } = req.params;
  const { text } = req.body;

  if (!store.stories) store.stories = [];
  const story = store.stories.find((s) => s.id === id);

  if (!story) {
    return res.status(404).json({ error: "Story not found." });
  }

  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Text response cannot be empty." });
  }

  const ANONYMOUS_TITLES = [
    "Secret Admirer", "Anonymous Friend", "Ghost Reader", "Mysterious Contact",
    "Honest Stranger", "Night Owl", "Silent Fan", "Whispering Star", "Anonymous Secret"
  ];
  const randomLabel = ANONYMOUS_TITLES[Math.floor(Math.random() * ANONYMOUS_TITLES.length)] + " #" + Math.floor(100 + Math.random() * 900);

  const answer: StoryAnonymousAnswer = {
    id: "anon_" + Math.random().toString(36).substring(2, 11),
    storyId: id,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    anonymousLabel: randomLabel
  };

  if (!story.anonymousAnswers) story.anonymousAnswers = [];
  story.anonymousAnswers.unshift(answer);
  saveStore();

  // Send SSE event for real-time notification to the story creator
  broadcastEvent("story_anonymous_answer", { storyId: id, answer });

  return res.json({ success: true, answer });
});

// 7c. Get Anonymous Answers (Story Creator Only)
app.get("/api/stories/:id/anonymous-answers", (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.query.userId as string;

  if (!store.stories) store.stories = [];
  const story = store.stories.find((s) => s.id === id);

  if (!story) {
    return res.status(404).json({ error: "Story not found." });
  }

  if (userId && story.userId !== userId) {
    return res.status(403).json({ error: "Only the story creator can access private anonymous answers." });
  }

  return res.json({ answers: story.anonymousAnswers || [] });
});

// 7d. Share an Anonymous Answer publicly to a New Story
app.post("/api/stories/:id/share-anonymous-answer", (req: Request, res: Response) => {
  const { id } = req.params;
  const { answerId, userId, backgroundPreset } = req.body;

  if (!store.stories) store.stories = [];
  const story = store.stories.find((s) => s.id === id);

  if (!story) {
    return res.status(404).json({ error: "Story not found." });
  }

  if (story.userId !== userId) {
    return res.status(403).json({ error: "Only the story creator can share anonymous answers." });
  }

  const answer = (story.anonymousAnswers || []).find((a) => a.id === answerId);
  if (!answer) {
    return res.status(404).json({ error: "Anonymous answer not found." });
  }

  const questionTitle = story.anonymousPrompt?.question || "Anonymous Question";

  const newStory: Story = {
    id: "story_shared_anon_" + Math.random().toString(36).substring(2, 11),
    userId: story.userId,
    userName: story.userName,
    userAvatar: story.userAvatar,
    type: "anonymous_qa",
    sharedAnswerData: {
      question: questionTitle,
      answerText: answer.text,
      anonymousLabel: answer.anonymousLabel,
      originalStoryId: story.id,
      stickerStyle: backgroundPreset || story.anonymousPrompt?.stickerStyle || "ngl-gradient"
    },
    reactions: {},
    comments: [],
    viewers: [],
    duration: 7,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };

  answer.isSharedToStory = true;
  answer.sharedStoryId = newStory.id;

  store.stories.unshift(newStory);
  saveStore();

  broadcastEvent("story_created", newStory);
  broadcastEvent("story_anonymous_answer_shared", { storyId: id, answerId, sharedStoryId: newStory.id });

  return res.json({ success: true, story: newStory });
});

// 8. Delete Story Comment
app.delete("/api/stories/:id/comments/:commentId", (req: Request, res: Response) => {
  const { id, commentId } = req.params;
  const userId = req.query.userId as string;

  if (!store.stories) store.stories = [];
  const story = store.stories.find((s) => s.id === id);

  if (!story) {
    return res.status(404).json({ error: "Story not found." });
  }

  const commentIndex = story.comments.findIndex((c) => c.id === commentId);
  if (commentIndex === -1) {
    return res.status(404).json({ error: "Comment not found." });
  }

  const comment = story.comments[commentIndex];
  if (userId && comment.userId !== userId && story.userId !== userId) {
    return res.status(403).json({ error: "Not authorized to delete this comment." });
  }

  story.comments.splice(commentIndex, 1);
  saveStore();

  broadcastEvent("story_comment_deleted", { storyId: id, commentId });

  return res.json({ success: true });
});

// 9. Share story snapshot directly to chat conversation
app.post("/api/stories/:id/share-to-chat", (req: Request, res: Response) => {
  const { id } = req.params;
  let { conversationId, targetUserId, senderId, customNote } = req.body;

  if (!store.stories) store.stories = [];
  const story = store.stories.find((s) => s.id === id);

  if (!story) {
    return res.status(404).json({ error: "Story not found." });
  }

  const sender = store.users.find((u) => u.id === senderId);
  if (!sender) {
    return res.status(400).json({ error: "Invalid sender." });
  }

  // If no conversationId but targetUserId is provided, find or create DM conversation
  if (!conversationId && targetUserId) {
    let dmConv = store.conversations.find(
      (c) =>
        c.type === "dm" &&
        c.participants.includes(senderId) &&
        c.participants.includes(targetUserId)
    );
    if (!dmConv) {
      dmConv = {
        id: "conv_dm_" + Math.random().toString(36).substring(2, 10),
        type: "dm",
        participants: [senderId, targetUserId],
        updatedAt: new Date().toISOString()
      };
      store.conversations.push(dmConv);
      broadcastEvent("conversation_created", dmConv);
    }
    conversationId = dmConv.id;
  }

  if (!conversationId) {
    return res.status(400).json({ error: "conversationId or targetUserId is required." });
  }

  const storySnippet = story.caption || story.textContent || (story.anonymousPrompt ? story.anonymousPrompt.question : "Story Snapshot");
  const shareText = customNote
    ? `${customNote}\n\n📱 Shared @${story.userName}'s story`
    : `Shared @${story.userName}'s story: "${storySnippet}" 📱✨`;

  const newMsg: Message = {
    id: "msg_story_share_" + Math.random().toString(36).substring(2, 11),
    conversationId,
    senderId,
    senderName: sender.username,
    senderAvatar: sender.avatar,
    text: shareText,
    type: story.type === "video" ? "video" : story.type === "image" ? "image" : "text",
    mediaUrl: story.mediaUrl,
    reactions: {},
    likes: [],
    replyTo: {
      id: story.id,
      senderName: story.userName,
      text: storySnippet,
      type: "story"
    },
    createdAt: new Date().toISOString()
  };

  store.messages.push(newMsg);
  const conv = store.conversations.find((c) => c.id === conversationId);
  if (conv) {
    conv.lastMessage = {
      text: shareText,
      senderId,
      senderName: sender.username,
      createdAt: newMsg.createdAt
    };
    conv.updatedAt = newMsg.createdAt;
  }

  saveStore();
  broadcastEvent("new_message", newMsg, conv ? conv.participants : undefined);

  return res.json({ success: true, message: newMsg, conversationId });
});

// ----------------------------------------------------
// MODERATION, MUTING, REPORTING & ADMIN SYSTEM ROUTES
// ----------------------------------------------------

// 1. Mute / Unmute any conversation or group for current user
app.post("/api/conversations/mute", (req: Request, res: Response) => {
  const { userId, conversationId, isMuted } = req.body;
  if (!userId || !conversationId) {
    return res.status(400).json({ error: "Missing userId or conversationId" });
  }

  const user = store.users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (!user.mutedConversationIds) user.mutedConversationIds = [];
  const conv = store.conversations.find((c) => c.id === conversationId);

  if (isMuted) {
    if (!user.mutedConversationIds.includes(conversationId)) {
      user.mutedConversationIds.push(conversationId);
    }
    if (conv) {
      if (!conv.mutedByUsers) conv.mutedByUsers = [];
      if (!conv.mutedByUsers.includes(userId)) conv.mutedByUsers.push(userId);
    }
  } else {
    user.mutedConversationIds = user.mutedConversationIds.filter((id) => id !== conversationId);
    if (conv && conv.mutedByUsers) {
      conv.mutedByUsers = conv.mutedByUsers.filter((id) => id !== userId);
    }
  }

  saveStore();
  broadcastEvent("user_updated", user, [userId]);
  return res.json({ success: true, isMuted: !!isMuted, mutedConversationIds: user.mutedConversationIds });
});

// 2. Submit a report (User, Message, Group)
app.post("/api/reports/submit", (req: Request, res: Response) => {
  const { reporterId, targetType, targetId, reason, customExplanation, targetDetails } = req.body;
  if (!reporterId || !targetType || !targetId || !reason) {
    return res.status(400).json({ error: "Missing required report information." });
  }

  const reporter = store.users.find((u) => u.id === reporterId);
  const newReport: UserReport = {
    id: "rep_" + Math.random().toString(36).substring(2, 10),
    reporterId,
    reporterName: reporter?.username || "Wavegram User",
    reporterAvatar: reporter?.avatar,
    targetType,
    targetId,
    targetName: targetDetails?.username || targetDetails?.groupName || "Reported Item",
    targetDetails,
    reason,
    customExplanation: customExplanation?.trim() || undefined,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  if (!store.reports) store.reports = [];
  store.reports.unshift(newReport);
  saveStore();

  broadcastEvent("new_report", newReport);
  return res.json({ success: true, report: newReport });
});

// 3. Admin: Fetch all reports
app.get("/api/admin/reports", (req: Request, res: Response) => {
  const adminId = req.query.adminId as string;
  const admin = store.users.find((u) => u.id === adminId || u.email.toLowerCase() === (adminId || "").toLowerCase());
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: "Unauthorized. Admin privileges required." });
  }

  return res.json({ reports: store.reports || [] });
});

// 4. Admin: Resolve / Dismiss Report
app.post("/api/admin/reports/resolve", (req: Request, res: Response) => {
  const { adminId, reportId, status, adminNotes } = req.body;
  const admin = store.users.find((u) => u.id === adminId || u.email.toLowerCase() === (adminId || "").toLowerCase());
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: "Unauthorized. Admin privileges required." });
  }

  const rep = (store.reports || []).find((r) => r.id === reportId);
  if (!rep) return res.status(404).json({ error: "Report not found" });

  rep.status = status || "resolved";
  if (adminNotes !== undefined) rep.adminNotes = adminNotes;
  rep.updatedAt = new Date().toISOString();

  saveStore();
  broadcastEvent("report_updated", rep);
  return res.json({ success: true, report: rep });
});

// 5. Admin: AI Moderation Assistant on a Report (using Gemini)
app.post("/api/admin/ai-analyze-report", async (req: Request, res: Response) => {
  const { adminId, reportId } = req.body;
  const admin = store.users.find((u) => u.id === adminId || u.email.toLowerCase() === (adminId || "").toLowerCase());
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: "Unauthorized. Admin privileges required." });
  }

  const rep = (store.reports || []).find((r) => r.id === reportId);
  if (!rep) return res.status(404).json({ error: "Report not found" });

  const gemini = getGeminiClient();
  let aiResult = {
    severity: "medium" as "low" | "medium" | "high" | "critical",
    summary: `User report flagged as "${rep.reason}". Notes: ${rep.customExplanation || "No additional text"}`,
    suggestedAction: "Examine conversation history and take moderation action if necessary.",
    confidenceScore: 85,
    reasoning: "Analysis generated based on category severity and user provided explanation."
  };

  if (gemini) {
    try {
      const prompt = `You are the MK Wavegram AI Moderation Engine. Analyze this user complaint and provide a structured JSON assessment:
Report Target Type: ${rep.targetType}
Target Subject: ${rep.targetName || "N/A"}
Reason: ${rep.reason}
User's handwritten explanation: ${rep.customExplanation || "None"}
Details: ${JSON.stringify(rep.targetDetails || {})}

Return valid JSON strictly matching this schema:
{
  "severity": "low" | "medium" | "high" | "critical",
  "summary": "Brief 1-2 sentence overview of the issue",
  "suggestedAction": "e.g., Issue warning / 3-day ban / 7-day ban / 30-day ban / Permanent ban / Dismiss",
  "confidenceScore": 88,
  "reasoning": "Clear explanation for the admin"
}`;
      const response = await gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      if (response.text) {
        const parsed = JSON.parse(response.text);
        aiResult = {
          severity: parsed.severity || "medium",
          summary: parsed.summary || aiResult.summary,
          suggestedAction: parsed.suggestedAction || aiResult.suggestedAction,
          confidenceScore: parsed.confidenceScore || 88,
          reasoning: parsed.reasoning || ""
        };
      }
    } catch (aiErr) {
      console.warn("AI Moderation analysis fallback:", aiErr);
    }
  }

  rep.aiAnalysis = aiResult;
  saveStore();
  broadcastEvent("report_updated", rep);
  return res.json({ success: true, aiAnalysis: aiResult, report: rep });
});

// 6. Admin: Ban User (3d, 7d, 10d, 30d, permanent)
app.post("/api/admin/users/ban", (req: Request, res: Response) => {
  const { adminId, targetUserId, duration, reason } = req.body;
  const admin = store.users.find((u) => u.id === adminId || u.email.toLowerCase() === (adminId || "").toLowerCase());
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: "Unauthorized. Admin privileges required." });
  }

  const targetUser = store.users.find((u) => u.id === targetUserId);
  if (!targetUser) return res.status(404).json({ error: "Target user not found." });

  if (isUserAdmin(targetUser)) {
    return res.status(400).json({ error: "Cannot ban an administrator account." });
  }

  const now = Date.now();
  let bannedUntil: string | null = null;
  if (duration === "3_days") {
    bannedUntil = new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString();
  } else if (duration === "7_days") {
    bannedUntil = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (duration === "10_days") {
    bannedUntil = new Date(now + 10 * 24 * 60 * 60 * 1000).toISOString();
  } else if (duration === "30_days") {
    bannedUntil = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
  } else {
    bannedUntil = "permanent";
  }

  targetUser.isBanned = true;
  targetUser.bannedUntil = bannedUntil;
  targetUser.banReason = reason || "Violation of MK Wavegram safety and community standards.";
  targetUser.bannedAt = new Date().toISOString();
  targetUser.status = "offline";

  saveStore();

  broadcastEvent("user_banned", {
    userId: targetUserId,
    bannedUntil,
    banReason: targetUser.banReason,
    bannedAt: targetUser.bannedAt
  });
  broadcastEvent("user_updated", targetUser);

  return res.json({ success: true, user: targetUser });
});

// 7. Admin: Unban User
app.post("/api/admin/users/unban", (req: Request, res: Response) => {
  const { adminId, targetUserId } = req.body;
  const admin = store.users.find((u) => u.id === adminId || u.email.toLowerCase() === (adminId || "").toLowerCase());
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: "Unauthorized. Admin privileges required." });
  }

  const targetUser = store.users.find((u) => u.id === targetUserId);
  if (!targetUser) return res.status(404).json({ error: "Target user not found." });

  targetUser.isBanned = false;
  targetUser.bannedUntil = null;
  targetUser.banReason = undefined;
  targetUser.bannedAt = undefined;

  saveStore();

  broadcastEvent("user_unbanned", { userId: targetUserId });
  broadcastEvent("user_updated", targetUser);

  return res.json({ success: true, user: targetUser });
});

// 8. Admin: Get user activity & context inspection
app.get("/api/admin/users/:userId/activity", (req: Request, res: Response) => {
  const adminId = req.query.adminId as string;
  const admin = store.users.find((u) => u.id === adminId || u.email.toLowerCase() === (adminId || "").toLowerCase());
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: "Unauthorized. Admin privileges required." });
  }

  const { userId } = req.params;
  const user = store.users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found." });

  const userMessages = store.messages.filter((m) => m.senderId === userId).slice(-50);
  const reportsAgainst = (store.reports || []).filter(
    (r) => r.targetId === userId || r.targetDetails?.userId === userId
  );
  const userStories = (store.stories || []).filter((s) => s.userId === userId);

  return res.json({
    user,
    recentMessages: userMessages,
    reportsAgainst,
    storiesCount: userStories.length,
    totalMessages: store.messages.filter((m) => m.senderId === userId).length
  });
});

// 9. Admin: Get reported message context
app.get("/api/admin/messages/context/:messageId", (req: Request, res: Response) => {
  const adminId = req.query.adminId as string;
  const admin = store.users.find((u) => u.id === adminId || u.email.toLowerCase() === (adminId || "").toLowerCase());
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: "Unauthorized. Admin privileges required." });
  }

  const { messageId } = req.params;
  const targetMsg = store.messages.find((m) => m.id === messageId);
  if (!targetMsg) return res.status(404).json({ error: "Message not found." });

  const convMessages = store.messages.filter((m) => m.conversationId === targetMsg.conversationId);
  const targetIdx = convMessages.findIndex((m) => m.id === messageId);
  const start = Math.max(0, targetIdx - 6);
  const end = Math.min(convMessages.length, targetIdx + 7);
  const contextSlice = convMessages.slice(start, end);
  const conv = store.conversations.find((c) => c.id === targetMsg.conversationId);

  return res.json({
    targetMessage: targetMsg,
    conversation: conv,
    contextMessages: contextSlice
  });
});

// 10. Admin: Push official broadcast notification to MK Official Channel
app.post("/api/admin/broadcast", (req: Request, res: Response) => {
  const { adminId, title, message, priority = "high" } = req.body;
  const admin = store.users.find((u) => u.id === adminId || u.email.toLowerCase() === (adminId || "").toLowerCase());
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: "Unauthorized. Admin privileges required." });
  }

  const conv = store.conversations.find((c) => c.id === "conv_mk_official" || c.isOfficialChannel);
  if (!conv) return res.status(404).json({ error: "Official channel not found." });

  const broadcastMsg: Message = {
    id: "msg_bc_" + Math.random().toString(36).substring(2, 10),
    conversationId: conv.id,
    senderId: admin.id,
    senderName: "MK Admin Official 👑",
    senderAvatar: admin.avatar,
    text: `📢 **${title || "MK Official Announcement"}**\n\n${message}`,
    type: "text",
    reactions: { "⚡": [admin.id] },
    likes: [],
    isSystem: false,
    createdAt: new Date().toISOString()
  };

  store.messages.push(broadcastMsg);
  conv.lastMessage = {
    text: `📢 ${title || "MK Official Announcement"}`,
    senderId: admin.id,
    senderName: admin.username,
    createdAt: broadcastMsg.createdAt
  };
  conv.updatedAt = broadcastMsg.createdAt;
  saveStore();

  // Send to all connected subscribers
  broadcastEvent("new_message", broadcastMsg);
  broadcastEvent("official_broadcast", {
    id: broadcastMsg.id,
    title,
    message,
    priority,
    createdAt: broadcastMsg.createdAt
  });

  return res.json({ success: true, message: broadcastMsg });
});

// Fallback 404 for unhandled API routes
app.all("/api/*", (req: Request, res: Response) => {
  res.status(404).json({ error: `API route ${req.method} ${req.path} not found` });
});

// START EXPRESS & VITE SERVER
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Wavegram server running on http://0.0.0.0:${PORT}`);
  });
}

start();
