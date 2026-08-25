import React, { useState } from "react";
import { User, Conversation, Group, ChatRequest, Story } from "../types";
import { StoriesBar } from "./StoriesBar";
import {
  MessageSquare,
  Users,
  Search,
  Plus,
  BarChart2,
  Lock,
  LogOut,
  Trash2,
  UserPlus,
  Check,
  X,
  Clock,
  FileText,
  BadgeCheck,
  MoreVertical,
  Edit3,
  Bookmark,
  Moon,
  Sparkles,
  KeyRound,
  CheckCheck,
  Check as CheckIcon,
  Camera,
  Layers,
  VolumeX,
  Volume2,
  ShieldAlert,
  ShieldCheck,
  Radio
} from "lucide-react";

interface SidebarProps {
  currentUser: User;
  allUsers: User[];
  conversations: Conversation[];
  groups: Group[];
  chatRequests?: ChatRequest[];
  stories?: Story[];
  activeConversationId: string | null;
  activeTab: "chats" | "people" | "groups" | "requests";
  setActiveTab: (tab: "chats" | "people" | "groups" | "requests") => void;
  onSelectConversation: (convId: string) => void;
  onStartDMWithUser: (targetUserId: string) => void;
  onSelectUserProfile?: (user: User) => void;
  onAcceptRequest?: (requestId: string) => void;
  onDeclineRequest?: (requestId: string) => void;
  onCreateGroupClick: () => void;
  onJoinGroupClick: () => void;
  onOpenAnalytics: () => void;
  onOpenNotes?: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  onDeleteConversation?: (convId: string) => void;
  onOpenStoryCreator: () => void;
  onOpenStoryViewer: (targetUserId: string, initialStoryIndex?: number) => void;
  onOpenAdminPanel?: () => void;
  onToggleMuteConversation?: (convId: string, isMuted: boolean) => void;
  onOpenReportModal?: (type: "user" | "group" | "message", target: any) => void;
}

// MK Wavegram Signature vibrant Avatar color palette based on name hash
export const getWavegramAvatarColor = (name: string): string => {
  const colors = [
    "bg-[#e57b32]", // Amber / Orange
    "bg-[#2fa6e4]", // Cyan / Sky blue
    "bg-[#d7447e]", // Magenta / Pink
    "bg-[#42ab58]", // Green
    "bg-[#8a4fff]", // Purple / Violet
    "bg-[#3390ec]", // MK Wavegram Blue
    "bg-[#e85375]", // Coral / Rose
    "bg-[#f08535]"  // Warm Orange
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export const getWavegramInitials = (name: string): string => {
  if (!name) return "MK";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

// Aliases for compatibility
export const getTelegramAvatarColor = getWavegramAvatarColor;
export const getTelegramInitials = getWavegramInitials;

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  allUsers,
  conversations,
  groups,
  chatRequests = [],
  stories = [],
  activeConversationId,
  activeTab,
  setActiveTab,
  onSelectConversation,
  onStartDMWithUser,
  onSelectUserProfile,
  onAcceptRequest,
  onDeclineRequest,
  onCreateGroupClick,
  onJoinGroupClick,
  onOpenAnalytics,
  onOpenNotes,
  onOpenProfile,
  onLogout,
  onDeleteConversation,
  onOpenStoryCreator,
  onOpenStoryViewer,
  onOpenAdminPanel,
  onToggleMuteConversation,
  onOpenReportModal
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);

  const isAdmin =
    currentUser.role === "admin" ||
    currentUser.id === "user_admin_mk" ||
    currentUser.email?.toLowerCase().startsWith("admin@") ||
    currentUser.email === "addmmin@gmail.com" ||
    currentUser.email === "admin@gmail.com" ||
    currentUser.email === "admin@wavegram.com";

  const pendingIncomingRequests = chatRequests.filter(
    (r) => r.toUserId === currentUser.id && r.status === "pending"
  );
  const pendingOutgoingRequests = chatRequests.filter(
    (r) => r.fromUserId === currentUser.id
  );

  const filteredUsers = allUsers.filter((u) => {
    if (!u || u.id === currentUser.id) return false;
    const query = (searchQuery || "").toLowerCase().trim();
    if (!query) return true;
    const nameMatch = (u.username || "").toLowerCase().includes(query);
    const emailMatch = !u.hideEmail && (u.email || "").toLowerCase().includes(query);
    const bioMatch = (u.bio || "").toLowerCase().includes(query);
    return nameMatch || emailMatch || bioMatch;
  });

  const filteredConversations = conversations.filter((c) => {
    if (c.id === "conv_mk_official" || c.isOfficialChannel) return true;
    if (c.type === "group") {
      const g = groups.find((grp) => grp.id === c.groupId);
      return g?.name.toLowerCase().includes(searchQuery.toLowerCase());
    } else {
      const otherUserId = c.participants.find((id) => id !== currentUser.id);
      const otherUser = allUsers.find((u) => u.id === otherUserId);
      return otherUser?.username.toLowerCase().includes(searchQuery.toLowerCase());
    }
  }).sort((a, b) => {
    if (a.id === "conv_mk_official" || a.isOfficialChannel) return -1;
    if (b.id === "conv_mk_official" || b.isOfficialChannel) return 1;
    const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.updatedAt || 0).getTime();
    const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.updatedAt || 0).getTime();
    return timeB - timeA;
  });

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format Telegram-style timestamp (e.g., Fri, Aug 13, 10:46 AM)
  const formatTelegramTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      } else if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: "short" });
      } else {
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
      }
    } catch {
      return "";
    }
  };

  return (
    <div className="w-full md:w-80 lg:w-[380px] bg-[#17212b] border-r border-[#101921] flex flex-col h-full shrink-0 select-none relative">
      
      {/* Telegram Top Header */}
      <div className="h-14 px-4 bg-[#17212b] flex items-center justify-between border-b border-[#101921]/70 shrink-0 z-20">
        {showSearchInput ? (
          <div className="flex items-center w-full gap-2">
            <Search className="w-5 h-5 text-[#7d8b99] shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder={
                activeTab === "chats"
                  ? "Search chats..."
                  : activeTab === "people"
                  ? "Search contacts..."
                  : activeTab === "requests"
                  ? "Search invitations..."
                  : "Search groups..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-white placeholder-[#7d8b99] outline-none font-normal"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-[#7d8b99] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => {
                setShowSearchInput(false);
                setSearchQuery("");
              }}
              className="text-[#3390ec] text-xs font-semibold px-2 py-1 hover:bg-[#202b36] rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <h1 className="text-[20px] font-bold text-white tracking-wide flex items-center gap-2">
                <span>MK Wavegram</span>
              </h1>
              {isAdmin && (
                <button
                  onClick={onOpenAdminPanel}
                  title="Admin Command Center"
                  className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center gap-1 hover:bg-amber-500/30 transition"
                >
                  <span>👑 Admin</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSearchInput(true)}
                title="Search"
                className="w-9 h-9 flex items-center justify-center rounded-full text-[#7d8b99] hover:text-white hover:bg-[#202b36] transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowDropdownMenu((prev) => !prev)}
                  title="Menu"
                  className="w-9 h-9 flex items-center justify-center rounded-full text-[#7d8b99] hover:text-white hover:bg-[#202b36] transition-colors"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {/* Telegram 3-dots Dropdown Menu */}
                {showDropdownMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowDropdownMenu(false)}
                    />
                    <div className="absolute right-0 top-11 w-56 bg-[#242f3d] border border-[#101921] rounded-xl shadow-2xl py-1.5 z-40 text-sm text-white animate-in fade-in zoom-in-95 duration-100">
                      {onOpenAdminPanel && (
                        <button
                          onClick={() => {
                            setShowDropdownMenu(false);
                            onOpenAdminPanel();
                          }}
                          className="w-full px-4 py-2.5 flex items-center gap-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-colors text-left border-b border-[#101921]"
                        >
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          <span className="font-bold">{isAdmin ? "MK Admin Panel 👑" : "Admin Panel & Moderation 👑"}</span>
                        </button>
                      )}

                      {onOpenReportModal && (
                        <button
                          onClick={() => {
                            setShowDropdownMenu(false);
                            onOpenReportModal("user", currentUser);
                          }}
                          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#17212b] text-red-300 transition-colors text-left"
                        >
                          <ShieldAlert className="w-4 h-4 text-red-400" />
                          <span>Trust & Safety Center 🛡️</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setShowDropdownMenu(false);
                          onOpenProfile();
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#17212b] transition-colors text-left"
                      >
                        <img
                          src={currentUser.avatar}
                          alt={currentUser.username}
                          className="w-6 h-6 rounded-full object-cover bg-slate-800"
                        />
                        <span className="font-medium">Settings & Profile</span>
                      </button>

                      {onOpenNotes && (
                        <button
                          onClick={() => {
                            setShowDropdownMenu(false);
                            onOpenNotes();
                          }}
                          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#17212b] transition-colors text-left"
                        >
                          <FileText className="w-4 h-4 text-[#3390ec]" />
                          <span>Notes & Music Studio</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setShowDropdownMenu(false);
                          onCreateGroupClick();
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#17212b] transition-colors text-left"
                      >
                        <Users className="w-4 h-4 text-[#3390ec]" />
                        <span>New Group</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowDropdownMenu(false);
                          onJoinGroupClick();
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#17212b] transition-colors text-left"
                      >
                        <Search className="w-4 h-4 text-cyan-400" />
                        <span>Explore Public Groups</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowDropdownMenu(false);
                          onOpenStoryCreator();
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#17212b] transition-colors text-left"
                      >
                        <Camera className="w-4 h-4 text-amber-400" />
                        <span>Create Story</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowDropdownMenu(false);
                          onOpenAnalytics();
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#17212b] transition-colors text-left"
                      >
                        <BarChart2 className="w-4 h-4 text-[#3390ec]" />
                        <span>Activity Analytics</span>
                      </button>

                      <div className="h-[1px] bg-[#101921] my-1" />

                      <button
                        onClick={() => {
                          setShowDropdownMenu(false);
                          onLogout();
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#17212b] text-rose-400 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Stories & Notes Bar */}
      <StoriesBar
        currentUser={currentUser}
        allUsers={allUsers}
        stories={stories}
        conversations={conversations}
        onOpenCreator={onOpenStoryCreator}
        onOpenStoryViewer={onOpenStoryViewer}
        onOpenNotes={onOpenNotes}
        className="bg-[#17212b] border-b border-[#101921]/70"
      />

      {/* Tab List Content */}
      <div className="flex-1 overflow-y-auto scrollbar-none bg-[#0e1621] relative">
        
        {/* CHATS TAB */}
        {activeTab === "chats" && (
          <div className="divide-y divide-[#101921]/40">
            {pendingIncomingRequests.length > 0 && (
              <div
                onClick={() => setActiveTab("requests")}
                className="p-3.5 bg-[#17212b] hover:bg-[#202b36] flex items-center justify-between cursor-pointer transition-colors border-b border-[#101921]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#3390ec]/20 text-[#3390ec] flex items-center justify-center font-bold">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold text-white">
                      Chat Invitations
                    </div>
                    <div className="text-[13px] text-[#7d8b99]">
                      {pendingIncomingRequests.length} pending request{pendingIncomingRequests.length > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#3390ec] text-white text-xs font-bold">
                  {pendingIncomingRequests.length}
                </span>
              </div>
            )}

            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-[#7d8b99]">
                <div className="w-16 h-16 rounded-full bg-[#17212b] flex items-center justify-center mb-3 text-[#3390ec]">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">No chats yet</h3>
                <p className="text-xs text-[#7d8b99] max-w-xs mb-4">
                  Select a contact from People to start a conversation or create a group.
                </p>
                <button
                  onClick={() => setActiveTab("people")}
                  className="px-4 py-2 bg-[#3390ec] hover:bg-[#2481cc] text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Find Contacts
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isGroup = conv.type === "group";
                const isOfficial = conv.id === "conv_mk_official" || conv.isOfficialChannel;
                const isMuted = currentUser.mutedConversationIds?.includes(conv.id);

                let name = "Conversation";
                let avatar = "";
                let online = false;
                let isVerified = false;
                let targetUserObj: User | undefined;
                let targetGroupObj: Group | undefined;

                if (isGroup) {
                  const grp = groups.find((g) => g.id === conv.groupId);
                  targetGroupObj = grp;
                  name = grp?.name || (isOfficial ? "MK Wavegram Official ⚡" : "Group Chat");
                  avatar = grp?.avatar || "";
                  isVerified = isOfficial || !!grp?.isVerified;
                } else {
                  const otherUserId = conv.participants.find((id) => id !== currentUser.id);
                  const otherUser = allUsers.find((u) => u.id === otherUserId);
                  targetUserObj = otherUser;
                  name = otherUser?.username || (isOfficial ? "MK Admin Official 👑" : "MK Wavegram User");
                  avatar = otherUser?.avatar || "";
                  online = otherUser?.status === "online";
                  isVerified = isOfficial || otherUser?.hasAccount !== false;
                }

                const isActive = conv.id === activeConversationId;
                const avatarColor = isOfficial ? "bg-gradient-to-tr from-[#3390ec] to-[#8a4fff]" : getTelegramAvatarColor(name);
                const initials = isOfficial ? "MK" : getTelegramInitials(name);

                return (
                  <div
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    className={`w-full px-3.5 py-3 flex items-center gap-3.5 cursor-pointer transition-colors group relative ${
                      isActive
                        ? "bg-[#2b5278] text-white"
                        : isOfficial
                        ? "bg-[#1f2c3a]/70 hover:bg-[#202b36] border-l-4 border-[#3390ec]"
                        : "hover:bg-[#202b36] bg-[#0e1621] text-white"
                    }`}
                  >
                    {/* Telegram Avatar Circle */}
                    <div className="relative shrink-0">
                      {avatar && !avatar.includes("default-avatar") ? (
                        <img
                          src={avatar}
                          alt={name}
                          className={`w-12 h-12 rounded-full object-cover bg-[#242f3d] ${isOfficial ? "ring-2 ring-[#3390ec]" : ""}`}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div
                          className={`w-12 h-12 rounded-full ${avatarColor} text-white flex items-center justify-center font-bold text-base shadow-sm ${isOfficial ? "ring-2 ring-[#3390ec]" : ""}`}
                        >
                          {initials}
                        </div>
                      )}
                      {online && !isGroup && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#42ab58] border-2 border-[#0e1621]" />
                      )}
                    </div>

                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0 pr-2">
                          <span className="font-semibold text-[15px] truncate text-white">
                            {name}
                          </span>
                          {isOfficial && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-[#3390ec]/20 text-[#3390ec] border border-[#3390ec]/40 rounded font-bold uppercase shrink-0">
                              Official
                            </span>
                          )}
                          {isVerified && !isOfficial && (
                            <BadgeCheck className="w-4 h-4 text-[#3390ec] shrink-0" />
                          )}
                          {isMuted && (
                            <VolumeX className="w-3.5 h-3.5 text-slate-400 shrink-0" title="Muted Conversation" />
                          )}
                        </div>
                        {conv.lastMessage && (
                          <div className="flex items-center gap-1 shrink-0">
                            {conv.lastMessage.senderId === currentUser.id && (
                              <CheckCheck className="w-3.5 h-3.5 text-[#3390ec]" />
                            )}
                            <span className="text-[12px] text-[#7d8b99]">
                              {formatTelegramTime(conv.lastMessage.createdAt)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-[14px] text-[#7d8b99] truncate pr-2">
                          {conv.lastMessage ? (
                            <>
                              {conv.lastMessage.senderId === currentUser.id && (
                                <span className="text-[#3390ec]">You: </span>
                              )}
                              {isGroup && conv.lastMessage.senderId !== currentUser.id && (
                                <span className="text-white font-medium">{conv.lastMessage.senderName}: </span>
                              )}
                              <span>{conv.lastMessage.text || "Media message"}</span>
                            </>
                          ) : (
                            <span className="italic text-[#7d8b99]">No messages yet</span>
                          )}
                        </p>

                        {/* Unread badge or action button */}
                        {isGroup && (
                          <span className="px-2 py-0.5 bg-[#2481cc] text-white text-[11px] font-semibold rounded-full shrink-0">
                            Open
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons on hover */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 shrink-0 transition-all">
                      {onToggleMuteConversation && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleMuteConversation(conv.id, !isMuted);
                          }}
                          title={isMuted ? "Unmute conversation" : "Mute conversation"}
                          className={`p-1.5 rounded-full transition ${
                            isMuted
                              ? "text-amber-400 hover:bg-amber-500/20"
                              : "text-[#7d8b99] hover:text-white hover:bg-[#17212b]"
                          }`}
                        >
                          {isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        </button>
                      )}

                      {!isOfficial && onOpenReportModal && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenReportModal(
                              isGroup ? "group" : "user",
                              isGroup ? targetGroupObj : targetUserObj
                            );
                          }}
                          title="Report & Safety Flag"
                          className="p-1.5 rounded-full text-[#7d8b99] hover:text-red-400 hover:bg-[#17212b] transition-all"
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                      )}

                      {!isOfficial && onDeleteConversation && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete chat with ${name}?`)) {
                              onDeleteConversation(conv.id);
                            }
                          }}
                          title="Delete Chat"
                          className="p-1.5 rounded-full text-[#7d8b99] hover:text-rose-400 hover:bg-[#17212b] transition-all shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* PEOPLE / CONTACTS TAB */}
        {activeTab === "people" && (
          <div className="divide-y divide-[#101921]/40">
            <div className="px-4 py-2 text-[12px] font-semibold text-[#3390ec] uppercase tracking-wider bg-[#17212b]">
              All Contacts ({filteredUsers.length})
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center py-16 text-[#7d8b99] text-xs">
                No contacts found.
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isUserPrivate = !!user.isPrivate;
                const hasConv = conversations.some(
                  (c) =>
                    c.type === "dm" &&
                    c.participants.includes(currentUser.id) &&
                    c.participants.includes(user.id)
                );
                const hasPendingReq = chatRequests.some(
                  (r) =>
                    r.fromUserId === currentUser.id &&
                    r.toUserId === user.id &&
                    r.status === "pending"
                );

                const avatarColor = getTelegramAvatarColor(user.username);
                const initials = getTelegramInitials(user.username);

                return (
                  <div
                    key={user.id}
                    onClick={() => {
                      if (onSelectUserProfile) {
                        onSelectUserProfile(user);
                      } else {
                        onStartDMWithUser(user.id);
                      }
                    }}
                    className="w-full px-3.5 py-3 flex items-center gap-3.5 hover:bg-[#202b36] cursor-pointer transition-colors text-left"
                  >
                    <div className="relative shrink-0">
                      {user.avatar && !user.avatar.includes("default-avatar") ? (
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className="w-12 h-12 rounded-full object-cover bg-[#242f3d]"
                        />
                      ) : (
                        <div
                          className={`w-12 h-12 rounded-full ${avatarColor} text-white flex items-center justify-center font-bold text-base shadow-sm`}
                        >
                          {initials}
                        </div>
                      )}
                      <span
                        className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#0e1621] ${
                          user.status === "online" ? "bg-[#42ab58]" : "bg-[#7d8b99]"
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-semibold text-[15px] text-white truncate">
                          {user.username}
                        </span>
                        {user.hasAccount !== false && (
                          <BadgeCheck className="w-4 h-4 text-[#3390ec] shrink-0" />
                        )}
                        {isUserPrivate && (
                          <span className="text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.2 rounded font-medium">
                            Private
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-[#7d8b99] truncate">
                        {user.status === "online" ? (
                          <span className="text-[#3390ec]">online</span>
                        ) : (
                          user.bio || "last seen recently"
                        )}
                      </p>
                    </div>

                    {isUserPrivate && !hasConv ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectUserProfile) onSelectUserProfile(user);
                        }}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 transition-colors ${
                          hasPendingReq
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : "bg-[#2481cc] text-white hover:bg-[#3390ec]"
                        }`}
                      >
                        {hasPendingReq ? "Pending" : "Request"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartDMWithUser(user.id);
                        }}
                        className="text-xs font-semibold text-white bg-[#2481cc] hover:bg-[#3390ec] px-3.5 py-1.5 rounded-lg shrink-0 transition-colors"
                      >
                        Message
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* GROUPS TAB */}
        {activeTab === "groups" && (
          <div className="divide-y divide-[#101921]/40">
            <div className="p-3 bg-[#17212b] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#3390ec] uppercase tracking-wider">
                Public & Private Groups ({filteredGroups.length})
              </span>
              <div className="flex gap-2">
                <button
                  onClick={onCreateGroupClick}
                  className="px-3 py-1 bg-[#3390ec] hover:bg-[#2481cc] text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create</span>
                </button>
                <button
                  onClick={onJoinGroupClick}
                  className="px-3 py-1 bg-[#202b36] hover:bg-[#242f3d] text-[#3390ec] text-xs font-semibold rounded-lg border border-[#3390ec]/30 flex items-center gap-1 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Join</span>
                </button>
              </div>
            </div>

            {filteredGroups.length === 0 ? (
              <div className="text-center py-16 text-[#7d8b99] text-xs">
                No groups found.
              </div>
            ) : (
              filteredGroups.map((group) => {
                const isMember = group.memberIds.includes(currentUser.id);
                const conv = conversations.find((c) => c.groupId === group.id);
                const avatarColor = getTelegramAvatarColor(group.name);
                const initials = getTelegramInitials(group.name);

                const targetConvId = conv ? conv.id : (group.conversationId || group.id);

                return (
                  <div
                    key={group.id}
                    onClick={() => {
                      if (isMember) {
                        onSelectConversation(targetConvId);
                      }
                    }}
                    className={`w-full px-3.5 py-3 flex items-center justify-between gap-3.5 hover:bg-[#202b36] transition-colors ${
                      isMember ? "cursor-pointer" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {group.avatar ? (
                        <img
                          src={group.avatar}
                          alt={group.name}
                          className="w-12 h-12 rounded-full object-cover bg-[#242f3d] shrink-0"
                        />
                      ) : (
                        <div
                          className={`w-12 h-12 rounded-full ${avatarColor} text-white flex items-center justify-center font-bold text-base shrink-0`}
                        >
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-[15px] text-white truncate">
                            {group.name}
                          </h3>
                          {group.isPrivate && (
                            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[13px] text-[#7d8b99] truncate">
                          {group.description || `${group.memberIds.length} members`}
                        </p>
                      </div>
                    </div>

                    {isMember ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectConversation(targetConvId);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[#2481cc] hover:bg-[#3390ec] text-white text-xs font-semibold shrink-0 transition-colors cursor-pointer"
                      >
                        Open
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onJoinGroupClick();
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[#202b36] hover:bg-[#242f3d] text-white text-xs font-semibold shrink-0 border border-[#101921] transition-colors cursor-pointer"
                      >
                        Join
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* INVITATIONS / REQUESTS TAB */}
        {activeTab === "requests" && (
          <div className="divide-y divide-[#101921]/40">
            <div className="p-3 bg-[#17212b]">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Incoming Invitations ({pendingIncomingRequests.length})
              </span>
            </div>

            {pendingIncomingRequests.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#7d8b99]">
                No pending chat requests at the moment.
              </div>
            ) : (
              pendingIncomingRequests.map((req) => (
                <div key={req.id} className="p-4 bg-[#17212b] space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={req.fromUserAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                      alt={req.fromUserName}
                      className="w-11 h-11 rounded-full object-cover bg-slate-800 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-white truncate">
                          {req.fromUserName}
                        </span>
                        <span className="text-[11px] text-[#7d8b99]">
                          {new Date(req.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <div className="text-xs text-[#7d8b99]">
                        Requested a direct conversation
                      </div>
                    </div>
                  </div>

                  {req.message && (
                    <div className="p-2.5 rounded-lg bg-[#0e1621] text-xs text-slate-300 italic border border-[#101921]">
                      "{req.message}"
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onAcceptRequest && onAcceptRequest(req.id)}
                      className="flex-1 py-2 rounded-lg bg-[#3390ec] hover:bg-[#2481cc] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>Accept</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeclineRequest && onDeclineRequest(req.id)}
                      className="py-2 px-4 rounded-lg bg-[#202b36] hover:bg-[#242f3d] text-[#7d8b99] hover:text-rose-400 text-xs font-semibold transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Sent Requests */}
            <div className="p-3 bg-[#17212b] border-t border-[#101921]">
              <span className="text-xs font-semibold text-[#7d8b99] uppercase tracking-wider">
                Sent Invitations ({pendingOutgoingRequests.length})
              </span>
            </div>

            {pendingOutgoingRequests.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#7d8b99]">
                You haven't sent any invitations.
              </div>
            ) : (
              pendingOutgoingRequests.map((req) => (
                <div key={req.id} className="p-3.5 flex items-center justify-between gap-3 bg-[#0e1621]">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={req.toUserAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                      alt={req.toUserName || "User"}
                      className="w-9 h-9 rounded-full object-cover bg-slate-800 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-white truncate">
                        {req.toUserName || "Private User"}
                      </div>
                      <div className="text-[11px] text-[#7d8b99] truncate">
                        {req.message || "Invitation sent"}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      req.status === "accepted"
                        ? "bg-[#42ab58]/20 text-[#42ab58]"
                        : req.status === "declined"
                        ? "bg-rose-500/20 text-rose-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {req.status === "accepted" ? "Accepted" : req.status === "declined" ? "Declined" : "Pending"}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* Floating Action Button (FAB) at bottom-right of list */}
      <div className="absolute right-4 bottom-18 z-30">
        <button
          onClick={() => {
            if (activeTab === "groups") {
              onCreateGroupClick();
            } else if (activeTab === "people") {
              // Open contacts / focus
            } else {
              setShowFabMenu((prev) => !prev);
            }
          }}
          title="Compose / New Chat"
          className="w-14 h-14 rounded-full bg-[#2481cc] hover:bg-[#3390ec] text-white flex items-center justify-center shadow-2xl shadow-blue-500/40 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
        >
          <Edit3 className="w-6 h-6" />
        </button>

        {/* Quick FAB Menu */}
        {showFabMenu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowFabMenu(false)} />
            <div className="absolute right-0 bottom-16 w-52 bg-[#242f3d] border border-[#101921] rounded-2xl shadow-2xl py-2 z-40 text-sm text-white animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  setShowFabMenu(false);
                  onCreateGroupClick();
                }}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#17212b] transition-colors text-left"
              >
                <Users className="w-4 h-4 text-[#3390ec]" />
                <span className="font-medium">New Group</span>
              </button>
              <button
                onClick={() => {
                  setShowFabMenu(false);
                  setActiveTab("people");
                }}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#17212b] transition-colors text-left"
              >
                <UserPlus className="w-4 h-4 text-[#3390ec]" />
                <span className="font-medium">New Direct Chat</span>
              </button>
              <button
                onClick={() => {
                  setShowFabMenu(false);
                  onOpenStoryCreator();
                }}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#17212b] transition-colors text-left"
              >
                <Camera className="w-4 h-4 text-[#3390ec]" />
                <span className="font-medium">New Story</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Telegram Bottom Navigation Bar (Chats, Contacts/People, Groups, Requests, Profile/Settings) */}
      <div className="h-16 bg-[#17212b] border-t border-[#101921] flex items-center justify-around px-2 shrink-0 z-20">
        
        {/* Chats Tab */}
        <button
          onClick={() => setActiveTab("chats")}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors relative ${
            activeTab === "chats" ? "text-[#3390ec]" : "text-[#7d8b99] hover:text-white"
          }`}
        >
          <div className="relative">
            <div className={`p-1 rounded-full ${activeTab === "chats" ? "bg-[#3390ec]/20" : ""}`}>
              <MessageSquare className="w-5 h-5" />
            </div>
            {conversations.length > 0 && (
              <span className="absolute -top-1 -right-2 px-1.5 py-0.2 text-[10px] rounded-full bg-[#3390ec] text-white font-bold min-w-[16px] text-center">
                {conversations.length}
              </span>
            )}
          </div>
          <span className="text-[11px] font-medium mt-0.5">Chats</span>
        </button>

        {/* Contacts / People Tab */}
        <button
          onClick={() => setActiveTab("people")}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors relative ${
            activeTab === "people" ? "text-[#3390ec]" : "text-[#7d8b99] hover:text-white"
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === "people" ? "bg-[#3390ec]/20" : ""}`}>
            <Users className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-medium mt-0.5">Contacts</span>
        </button>

        {/* Groups Tab */}
        <button
          onClick={() => setActiveTab("groups")}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors relative ${
            activeTab === "groups" ? "text-[#3390ec]" : "text-[#7d8b99] hover:text-white"
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === "groups" ? "bg-[#3390ec]/20" : ""}`}>
            <Layers className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-medium mt-0.5">Groups</span>
        </button>

        {/* Invitations / Requests Tab */}
        <button
          onClick={() => setActiveTab("requests")}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors relative ${
            activeTab === "requests" ? "text-[#3390ec]" : "text-[#7d8b99] hover:text-white"
          }`}
        >
          <div className="relative">
            <div className={`p-1 rounded-full ${activeTab === "requests" ? "bg-[#3390ec]/20" : ""}`}>
              <UserPlus className="w-5 h-5" />
            </div>
            {pendingIncomingRequests.length > 0 && (
              <span className="absolute -top-1 -right-2 px-1.5 py-0.2 text-[10px] rounded-full bg-[#e57b32] text-white font-bold min-w-[16px] text-center animate-pulse">
                {pendingIncomingRequests.length}
              </span>
            )}
          </div>
          <span className="text-[11px] font-medium mt-0.5">Invites</span>
        </button>

        {/* Profile / Settings Tab */}
        <button
          onClick={onOpenProfile}
          className="flex flex-col items-center justify-center flex-1 py-1 text-[#7d8b99] hover:text-white transition-colors"
        >
          <div className="p-0.5 rounded-full ring-1 ring-[#7d8b99]/40 hover:ring-[#3390ec]">
            <img
              src={currentUser.avatar}
              alt={currentUser.username}
              className="w-5 h-5 rounded-full object-cover bg-slate-800"
            />
          </div>
          <span className="text-[11px] font-medium mt-0.5">Profile</span>
        </button>

      </div>

    </div>
  );
};
