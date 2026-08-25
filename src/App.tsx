import React, { useState, useEffect, useRef } from "react";
import { User, Message, Conversation, Group, ActiveCall, ReplyToMessage, ChatRequest, Story } from "./types";
import { AuthModal } from "./components/AuthModal";
import { Sidebar } from "./components/Sidebar";
import { ChatRoom } from "./components/ChatRoom";
import { GroupModal } from "./components/GroupModal";
import { CallOverlay } from "./components/CallOverlay";
import { AnalyticsView } from "./components/AnalyticsView";
import { ProfileModal } from "./components/ProfileModal";
import { UserProfileModal } from "./components/UserProfileModal";
import { IncomingCallModal } from "./components/IncomingCallModal";
import { StoryCreatorModal } from "./components/StoryCreatorModal";
import { StoryViewerModal } from "./components/StoryViewerModal";
import { NotesModal } from "./components/NotesModal";
import { NotificationToast, AppNotification } from "./components/NotificationToast";
import { AdminPanelModal } from "./components/AdminPanelModal";
import { ReportModal } from "./components/ReportModal";
import { MessageSquare } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("wavegram_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [chatRequests, setChatRequests] = useState<ChatRequest[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  const [sidebarTab, setSidebarTab] = useState<"chats" | "people" | "groups" | "requests">("chats");
  const [viewMode, setViewMode] = useState<"chat" | "analytics">("chat");
  const [mobileShowChat, setMobileShowChat] = useState<boolean>(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [reportModalState, setReportModalState] = useState<{
    open: boolean;
    type: "user" | "message" | "group";
    target: any;
    conversationId?: string;
  } | null>(null);

  // Stories Modals State
  const [storyCreatorOpen, setStoryCreatorOpen] = useState(false);
  const [storyToEdit, setStoryToEdit] = useState<Story | null>(null);
  const [storyViewerState, setStoryViewerState] = useState<{
    open: boolean;
    targetUserId: string;
    initialIndex: number;
  } | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Synthesize notification sound
  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  };

  // Modals
  const [groupModalState, setGroupModalState] = useState<{
    open: boolean;
    mode: "create" | "join" | "manage";
  }>({ open: false, mode: "create" });

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<User | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<ActiveCall | null>(null);

  // Keep fresh refs for SSE event handler
  const activeConversationIdRef = useRef<string | null>(activeConversationId);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const currentUserRef = useRef<User | null>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const conversationsRef = useRef<Conversation[]>(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const allUsersRef = useRef<User[]>(allUsers);
  useEffect(() => {
    allUsersRef.current = allUsers;
  }, [allUsers]);

  // Helper for safe JSON fetching
  const safeFetchJson = async (url: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await res.json();
      }
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  };

  // Load initial dataset
  const fetchData = async () => {
    try {
      const [usersData, convsData, groupsData, requestsData, storiesData] = await Promise.all([
        safeFetchJson("/api/users"),
        currentUser ? safeFetchJson(`/api/conversations?userId=${currentUser.id}`) : Promise.resolve(null),
        currentUser ? safeFetchJson(`/api/groups?userId=${currentUser.id}`) : safeFetchJson("/api/groups"),
        currentUser ? safeFetchJson(`/api/requests?userId=${currentUser.id}`) : Promise.resolve(null),
        currentUser ? safeFetchJson(`/api/stories?viewerId=${currentUser.id}`) : safeFetchJson("/api/stories")
      ]);

      if (usersData && usersData.users) {
        setAllUsers(usersData.users);
        if (currentUser) {
          const freshMe = (usersData.users as User[]).find((u: User) => u.id === currentUser.id);
          if (freshMe) {
            setCurrentUser(freshMe);
            localStorage.setItem("wavegram_user", JSON.stringify(freshMe));
          }
        }
      }

      if (storiesData && storiesData.stories) {
        setStories(storiesData.stories);
      }

      if (convsData && convsData.conversations) {
        const convList: Conversation[] = convsData.conversations;
        setConversations(convList);

        if (!activeConversationId && convList.length > 0) {
          setActiveConversationId(convList[0].id);
        }
      }

      if (groupsData && groupsData.groups) {
        setGroups(groupsData.groups);
      }

      if (requestsData && requestsData.all) {
        setChatRequests(requestsData.all);
      }
    } catch (err) {
      console.warn("Initial data sync note:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser?.id]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId || !currentUser) return;

    fetch(`/api/messages/${activeConversationId}?userId=${currentUser.id}`)
      .then((res) => (res.ok ? res.json() : { messages: [] }))
      .then((data) => {
        setMessages(data.messages || []);
      })
      .catch((err) => console.error("Error fetching messages:", err));
  }, [activeConversationId, currentUser?.id]);

  // Mute / Unmute conversation
  const handleToggleMuteConversation = async (convId: string, isMuted: boolean) => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/conversations/mute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          conversationId: convId,
          isMuted
        })
      });
      if (res.ok) {
        const data = await res.json();
        const updated = {
          ...currentUser,
          mutedConversationIds: data.mutedConversationIds
        };
        setCurrentUser(updated);
        localStorage.setItem("wavegram_user", JSON.stringify(updated));

        const notif: AppNotification = {
          id: Math.random().toString(),
          type: "system",
          title: isMuted ? "Conversation Muted" : "Notifications Restored",
          senderName: "MK System",
          text: isMuted ? "This conversation is now muted." : "You will receive notifications for this chat.",
          createdAt: new Date().toISOString()
        };
        setNotifications((prev) => [...prev, notif]);
      }
    } catch (err) {
      console.error("Toggle mute error:", err);
    }
  };

  // Open Report Modal
  const handleOpenReportModal = (type: "user" | "message" | "group", target: any) => {
    setReportModalState({
      open: true,
      type,
      target,
      conversationId: activeConversationId || undefined
    });
  };

  const handleReportSubmitted = () => {
    const notif: AppNotification = {
      id: Math.random().toString(),
      type: "system",
      title: "Signalement envoyé",
      senderName: "Système MK",
      text: "Votre signalement a été transmis à l'équipe de modération de MK Wavegram.",
      createdAt: new Date().toISOString()
    };
    setNotifications((prev) => [...prev, notif]);
  };

  // Auto-open MK Official channel for Admin or ensure it is readily accessible
  useEffect(() => {
    if (
      currentUser &&
      (currentUser.role === "admin" ||
        currentUser.email === "addmmin@gmail.com" ||
        currentUser.email === "admin@gmail.com")
    ) {
      if (!activeConversationId) {
        setActiveConversationId("conv_mk_official");
      }
    }
  }, [currentUser?.id, currentUser?.role]);
  useEffect(() => {
    if (!currentUser) return;

    const eventSource = new EventSource(`/api/events?userId=${currentUser.id}`);

    eventSource.addEventListener("new_message", (e: any) => {
      const newMsg: Message = JSON.parse(e.data);
      const activeId = activeConversationIdRef.current;
      const isViewingThisChat = activeId === newMsg.conversationId;
      const currentUserId = currentUserRef.current?.id;

      // Trigger notification ONLY if message is from another user AND user is not currently in this chat
      if (currentUserId && newMsg.senderId !== currentUserId && !isViewingThisChat) {
        playNotificationSound();
        const sender = allUsersRef.current.find((u) => u.id === newMsg.senderId);
        const notif: AppNotification = {
          id: Math.random().toString(),
          type: "message",
          title: "Nouveau message",
          senderName: newMsg.senderName || sender?.username || "Utilisateur MK",
          senderAvatar: newMsg.senderAvatar || sender?.avatar,
          text:
            newMsg.type === "voice"
              ? "🎤 Message vocal"
              : newMsg.type === "image"
              ? "📷 Photo envoyée"
              : newMsg.type === "video"
              ? "🎥 Vidéo envoyée"
              : newMsg.type === "file"
              ? "📎 Fichier joint"
              : newMsg.type === "gif"
              ? "👾 GIF envoyé"
              : newMsg.type === "sticker"
              ? "🪶 Sticker animé"
              : newMsg.type === "poll"
              ? "📊 Sondage créé"
              : newMsg.text || "Nouveau message",
          conversationId: newMsg.conversationId,
          createdAt: newMsg.createdAt
        };
        setNotifications((prev) => [...prev, notif]);
      }

      if (isViewingThisChat) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          // Clean up temp optimistic messages if matched
          const filtered = prev.filter(
            (m) => !m.id.startsWith("temp_") || m.text !== newMsg.text
          );
          return [...filtered, newMsg];
        });
      }
      // Update conversations list last message
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === newMsg.conversationId) {
            return {
              ...c,
              lastMessage: {
                text: newMsg.text || (newMsg.type === "sticker" ? "Animated sticker" : "Media file"),
                senderId: newMsg.senderId,
                senderName: newMsg.senderName,
                createdAt: newMsg.createdAt
              },
              updatedAt: newMsg.createdAt
            };
          }
          return c;
        })
      );
    });

    // Official broadcast alert event listener
    eventSource.addEventListener("official_broadcast", (e: any) => {
      const data = JSON.parse(e.data);
      playNotificationSound();
      const notif: AppNotification = {
        id: Math.random().toString(),
        type: "system",
        title: "📢 Official MK Broadcast",
        senderName: "MK Official",
        text: data.text || "New official announcement received.",
        conversationId: "conv_mk_official",
        createdAt: new Date().toISOString()
      };
      setNotifications((prev) => [...prev, notif]);
    });

    eventSource.addEventListener("message_updated", (e: any) => {
      const updatedMsg: Message = JSON.parse(e.data);
      setMessages((prev) => prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)));
    });

    eventSource.addEventListener("call_incoming", (e: any) => {
      const call: ActiveCall = JSON.parse(e.data);
      if (call.targetId === currentUser.id) {
        playNotificationSound();
        setIncomingCall(call);
        const notif: AppNotification = {
          id: Math.random().toString(),
          type: "call",
          title: "Incoming Call",
          senderName: call.callerName,
          senderAvatar: call.callerAvatar,
          text: `Incoming ${call.type === "video" ? "video" : "audio"} call...`,
          createdAt: new Date().toISOString()
        };
        setNotifications((prev) => [...prev, notif]);
      }
    });

    eventSource.addEventListener("call_status", (e: any) => {
      const call: ActiveCall = JSON.parse(e.data);
      if (call.status === "ended") {
        setActiveCall(null);
        setIncomingCall(null);
      } else if (call.status === "connected") {
        setActiveCall(call);
        setIncomingCall(null);
      }
    });

    // Instant update when a new user registers!
    eventSource.addEventListener("user_joined", (e: any) => {
      const newUser: User = JSON.parse(e.data);
      setAllUsers((prev) => {
        if (prev.some((u) => u.id === newUser.id)) return prev;
        return [...prev, newUser];
      });
    });

    // Instant update when a group is updated
    eventSource.addEventListener("group_updated", (e: any) => {
      const updatedGroup: Group = JSON.parse(e.data);
      setGroups((prev) => prev.map((g) => (g.id === updatedGroup.id ? updatedGroup : g)));
    });

    // Instant update when a group is permanently deleted
    eventSource.addEventListener("group_deleted", (e: any) => {
      const data: { groupId: string; conversationId?: string; deletedBy: string } = JSON.parse(e.data);
      setGroups((prev) => prev.filter((g) => g.id !== data.groupId));
      if (data.conversationId) {
        setConversations((prev) => prev.filter((c) => c.id !== data.conversationId));
        if (activeConversationId === data.conversationId) {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
      setGroupModalState((prev) => (prev.group?.id === data.groupId ? { open: false, mode: "create" } : prev));
      const notif: AppNotification = {
        id: Math.random().toString(),
        type: "system",
        title: "Group Deleted",
        senderName: "Wavegram System",
        text: "A group you were a member of has been removed by an administrator.",
        createdAt: new Date().toISOString()
      };
      setNotifications((prev) => [...prev, notif]);
    });

    // Instant update when a member or group of members is removed
    eventSource.addEventListener("member_removed", (e: any) => {
      const data: { groupId: string; conversationId?: string; removedUserIds: string[] } = JSON.parse(e.data);
      if (data.removedUserIds.includes(currentUser.id)) {
        // Current user was removed from the group!
        setGroups((prev) => prev.filter((g) => g.id !== data.groupId));
        if (data.conversationId) {
          setConversations((prev) => prev.filter((c) => c.id !== data.conversationId));
          if (activeConversationId === data.conversationId) {
            setActiveConversationId(null);
            setMessages([]);
          }
        }
        const notif: AppNotification = {
          id: Math.random().toString(),
          type: "system",
          title: "Group Access Revoked",
          senderName: "Wavegram Security",
          text: "You have been removed from this group by an administrator.",
          createdAt: new Date().toISOString()
        };
        setNotifications((prev) => [...prev, notif]);
      } else {
        setGroups((prev) =>
          prev.map((g) => {
            if (g.id === data.groupId) {
              return {
                ...g,
                memberIds: g.memberIds.filter((id) => !data.removedUserIds.includes(id)),
                adminIds: g.adminIds.filter((id) => !data.removedUserIds.includes(id))
              };
            }
            return g;
          })
        );
      }
    });

    // Instant update when an account is deleted!
    eventSource.addEventListener("user_deleted", (e: any) => {
      const { userId } = JSON.parse(e.data);
      setAllUsers((prev) => prev.filter((u) => u.id !== userId));
      if (currentUser.id === userId) {
        handleLogout();
      }
    });

    // Instant update when a user updates their profile & privacy settings
    eventSource.addEventListener("user_updated", (e: any) => {
      const updatedUser: User = JSON.parse(e.data);
      setAllUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      if (currentUser?.id === updatedUser.id) {
        setCurrentUser(updatedUser);
        localStorage.setItem("wavegram_user", JSON.stringify(updatedUser));
      }
    });

    // Disciplinary warning notification
    eventSource.addEventListener("user_warning", (e: any) => {
      const data = JSON.parse(e.data);
      if (data.userId === currentUser.id) {
        playNotificationSound();
        const notif: AppNotification = {
          id: Math.random().toString(),
          type: "system",
          title: "⚠️ Official Moderation Warning",
          senderName: "MK Safety Team",
          text: data.reason || "You have received an official warning regarding community standards.",
          createdAt: new Date().toISOString()
        };
        setNotifications((prev) => [...prev, notif]);
      }
    });

    // Admin report response notification to reporter
    eventSource.addEventListener("report_replied", (e: any) => {
      const { report, reporterId } = JSON.parse(e.data);
      if (reporterId === currentUser.id) {
        playNotificationSound();
        const notif: AppNotification = {
          id: Math.random().toString(),
          type: "system",
          title: "🛡️ Update on Your Report",
          senderName: "MK Admin Team",
          text: report.adminReply ? `Response: "${report.adminReply}"` : "An administrator has reviewed your report.",
          createdAt: new Date().toISOString()
        };
        setNotifications((prev) => [...prev, notif]);
      }
    });

    // Chat requests / private invitations
    eventSource.addEventListener("new_report", (e: any) => {
      const rep = JSON.parse(e.data);
      const isCurrAdmin =
        currentUser.role === "admin" ||
        currentUser.id === "user_admin_mk" ||
        currentUser.email.toLowerCase().includes("admin") ||
        currentUser.email.toLowerCase() === "addmmin@gmail.com" ||
        currentUser.email.toLowerCase() === "admin@gmail.com";

      if (isCurrAdmin) {
        playNotificationSound();
        const notif: AppNotification = {
          id: Math.random().toString(),
          type: "system",
          title: "🚨 New User Report Received",
          senderName: rep.reporterName || "MK Member",
          senderAvatar: rep.reporterAvatar,
          text: `Report against ${rep.targetType} (${rep.targetName}): ${rep.reason}`,
          createdAt: rep.createdAt || new Date().toISOString()
        };
        setNotifications((prev) => [...prev, notif]);
      }
    });

    eventSource.addEventListener("new_chat_request", (e: any) => {
      const newReq: ChatRequest = JSON.parse(e.data);
      setChatRequests((prev) => {
        if (prev.some((r) => r.id === newReq.id)) return prev;
        return [newReq, ...prev];
      });
      if (newReq.toUserId === currentUser.id) {
        playNotificationSound();
        const notif: AppNotification = {
          id: Math.random().toString(),
          type: "message",
          title: "New Chat Invitation",
          senderName: newReq.fromUserName || "Member",
          senderAvatar: newReq.fromUserAvatar,
          text: newReq.message ? `Invitation: "${newReq.message}"` : "Wants to start a conversation with you",
          createdAt: newReq.createdAt
        };
        setNotifications((prev) => [...prev, notif]);
      }
    });

    eventSource.addEventListener("chat_request_accepted", (e: any) => {
      const data: { request: ChatRequest; conversation: Conversation } = JSON.parse(e.data);
      setChatRequests((prev) =>
        prev.map((r) => (r.id === data.request.id ? data.request : r))
      );
      if (data.conversation) {
        setConversations((prev) => {
          if (prev.some((c) => c.id === data.conversation.id)) return prev;
          return [data.conversation, ...prev];
        });
      }
      if (data.request.fromUserId === currentUser.id) {
        playNotificationSound();
        const notif: AppNotification = {
          id: Math.random().toString(),
          type: "system",
          title: "Invitation Accepted!",
          senderName: data.request.toUserName || "Member",
          text: "Your chat request has been accepted! The conversation is now open.",
          conversationId: data.conversation?.id,
          createdAt: new Date().toISOString()
        };
        setNotifications((prev) => [...prev, notif]);
      }
    });

    eventSource.addEventListener("chat_request_declined", (e: any) => {
      const data: { request: ChatRequest } = JSON.parse(e.data);
      setChatRequests((prev) =>
        prev.map((r) => (r.id === data.request.id ? data.request : r))
      );
    });

    // Story SSE Events
    eventSource.addEventListener("story_created", (e: any) => {
      const newStory: Story = JSON.parse(e.data);
      setStories((prev) => {
        if (prev.some((s) => s.id === newStory.id)) return prev;
        return [newStory, ...prev];
      });
      if (newStory.userId !== currentUser.id) {
        const notif: AppNotification = {
          id: Math.random().toString(),
          type: "system",
          title: "New Story",
          senderName: newStory.userName,
          senderAvatar: newStory.userAvatar,
          text: `Shared a new ${newStory.type} story!`,
          createdAt: newStory.createdAt
        };
        setNotifications((prev) => [...prev, notif]);
      }
    });

    eventSource.addEventListener("story_updated", (e: any) => {
      const updatedStory: Story = JSON.parse(e.data);
      setStories((prev) => prev.map((s) => (s.id === updatedStory.id ? updatedStory : s)));
    });

    eventSource.addEventListener("story_deleted", (e: any) => {
      const data: { storyId: string } = JSON.parse(e.data);
      setStories((prev) => prev.filter((s) => s.id !== data.storyId));
    });

    eventSource.addEventListener("story_viewed", (e: any) => {
      const data: { storyId: string; viewer: any } = JSON.parse(e.data);
      setStories((prev) =>
        prev.map((s) => {
          if (s.id === data.storyId) {
            const hasViewer = s.viewers.some((v) => v.userId === data.viewer.userId);
            if (!hasViewer) {
              return { ...s, viewers: [...s.viewers, data.viewer] };
            }
          }
          return s;
        })
      );
    });

    eventSource.addEventListener("story_reaction", (e: any) => {
      const data: { storyId: string; reactions: Record<string, string[]>; emoji: string; userId: string } = JSON.parse(e.data);
      setStories((prev) =>
        prev.map((s) => (s.id === data.storyId ? { ...s, reactions: data.reactions } : s))
      );
    });

    eventSource.addEventListener("story_comment", (e: any) => {
      const data: { storyId: string; comment: any } = JSON.parse(e.data);
      setStories((prev) =>
        prev.map((s) => {
          if (s.id === data.storyId) {
            if (s.comments?.some((c) => c.id === data.comment.id)) return s;
            return { ...s, comments: [...(s.comments || []), data.comment] };
          }
          return s;
        })
      );
    });

    eventSource.addEventListener("story_comment_deleted", (e: any) => {
      const data: { storyId: string; commentId: string } = JSON.parse(e.data);
      setStories((prev) =>
        prev.map((s) => {
          if (s.id === data.storyId) {
            return { ...s, comments: (s.comments || []).filter((c) => c.id !== data.commentId) };
          }
          return s;
        })
      );
    });

    return () => {
      eventSource.close();
    };
  }, [currentUser?.id, activeConversationId, activeCall?.id]);

  // Auth Handlers
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("wavegram_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    localStorage.removeItem("wavegram_user");
    setCurrentUser(null);
    setActiveConversationId(null);
    setViewMode("chat");
    setShowProfileModal(false);
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    try {
      await fetch("/api/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });
      handleLogout();
    } catch (err) {
      console.error("Delete account error:", err);
    }
  };

  // Start DM conversation with target user
  const handleStartDMWithUser = async (targetUserId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/conversations/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentUserId: currentUser.id, targetUserId })
      });
      const data = await res.json();
      if (data.conversation) {
        setConversations((prev) => {
          if (prev.some((c) => c.id === data.conversation.id)) return prev;
          return [data.conversation, ...prev];
        });
        setActiveConversationId(data.conversation.id);
        setSidebarTab("chats");
        setViewMode("chat");
        setMobileShowChat(true);
        setSelectedUserProfile(null);
      } else if (data.needsRequest) {
        const target = allUsers.find((u) => u.id === targetUserId);
        if (target) setSelectedUserProfile(target);
      }
    } catch (err) {
      console.error("Start DM error:", err);
    }
  };

  // Chat Request Handlers
  const handleSendChatRequest = async (targetUserId: string, message?: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/requests/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId: currentUser.id,
          toUserId: targetUserId,
          message
        })
      });
      const data = await res.json();
      if (data.request) {
        setChatRequests((prev) => {
          const filtered = prev.filter((r) => r.id !== data.request.id);
          return [data.request, ...filtered];
        });
        const notif: AppNotification = {
          id: Math.random().toString(),
          type: "system",
          title: "Invitation Sent",
          senderName: "Wavegram",
          text: "Your chat invitation has been sent.",
          createdAt: new Date().toISOString()
        };
        setNotifications((prev) => [...prev, notif]);
      }
    } catch (err) {
      console.error("Send request error:", err);
    }
  };

  const handleAcceptChatRequest = async (requestId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/requests/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          userId: currentUser.id,
          action: "accept"
        })
      });
      const data = await res.json();
      if (data.request) {
        setChatRequests((prev) =>
          prev.map((r) => (r.id === data.request.id ? data.request : r))
        );
      }
      if (data.conversation) {
        setConversations((prev) => {
          if (prev.some((c) => c.id === data.conversation.id)) return prev;
          return [data.conversation, ...prev];
        });
        setActiveConversationId(data.conversation.id);
        setSidebarTab("chats");
        setViewMode("chat");
        setMobileShowChat(true);
      }
    } catch (err) {
      console.error("Accept request error:", err);
    }
  };

  const handleDeclineChatRequest = async (requestId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/requests/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          userId: currentUser.id,
          action: "decline"
        })
      });
      const data = await res.json();
      if (data.request) {
        setChatRequests((prev) =>
          prev.map((r) => (r.id === data.request.id ? data.request : r))
        );
      }
    } catch (err) {
      console.error("Decline request error:", err);
    }
  };

  // Instant Message Sending (Optimistic local render + server broadcast)
  const handleSendMessage = async (payload: {
    text?: string;
    type?: "text" | "image" | "video" | "audio" | "voice" | "file" | "gif";
    mediaUrl?: string;
    mediaName?: string;
    mediaSize?: string;
    duration?: number;
    replyTo?: ReplyToMessage;
  }) => {
    if (!activeConversationId || !currentUser) return;

    // 1. Client Optimistic Update (0ms latency for sender)
    const tempId = "temp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const optimisticMsg: Message = {
      id: tempId,
      conversationId: activeConversationId,
      senderId: currentUser.id,
      senderName: currentUser.username,
      senderAvatar: currentUser.avatar,
      text: payload.text || "",
      type: payload.type || "text",
      mediaUrl: payload.mediaUrl,
      mediaName: payload.mediaName,
      mediaSize: payload.mediaSize,
      duration: payload.duration,
      reactions: {},
      likes: [],
      replyTo: payload.replyTo,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    // Update conversation lastMessage preview
    let previewText = payload.text || "Media attachment";
    if (payload.type === "voice") previewText = "🎤 Voice note";
    if (payload.type === "image") previewText = "📷 Image";
    if (payload.type === "gif") previewText = "👾 GIF";

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConversationId) {
          return {
            ...c,
            lastMessage: {
              text: previewText,
              senderId: currentUser.id,
              senderName: currentUser.username,
              createdAt: optimisticMsg.createdAt
            },
            updatedAt: optimisticMsg.createdAt
          };
        }
        return c;
      })
    );

    // 2. Post to API
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId,
          senderId: currentUser.id,
          ...payload
        })
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempId && m.id !== data.message.id),
          data.message
        ]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // React to Message
  const handleReactMessage = async (messageId: string, emoji?: string, isDoubleTapLike?: boolean) => {
    if (!currentUser) return;
    try {
      await fetch("/api/messages/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, userId: currentUser.id, emoji, isDoubleTapLike })
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Edit Message
  const handleEditMessage = async (messageId: string, newText: string) => {
    if (!currentUser) return;
    try {
      await fetch("/api/messages/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, userId: currentUser.id, newText })
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Message
  const handleDeleteMessage = async (messageId: string, deleteType: "for_me" | "for_all") => {
    if (!currentUser) return;
    try {
      await fetch("/api/messages/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, userId: currentUser.id, deleteType })
      });
      if (deleteType === "for_me") {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Group
  const handleCreateGroup = async (payload: any) => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/groups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId: currentUser.id, ...payload })
      });
      const data = await res.json();
      if (data.group && data.conversation) {
        setGroups((prev) => [...prev, data.group]);
        setConversations((prev) => [data.conversation, ...prev]);
        setActiveConversationId(data.conversation.id);
        setGroupModalState({ open: false, mode: "create" });
        setSidebarTab("chats");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Conversation
  const handleDeleteConversation = async (conversationId: string) => {
    if (!currentUser) return;
    try {
      await fetch("/api/conversations/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId })
      });
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
      }
    } catch (err) {
      console.error("Delete conversation error:", err);
    }
  };

  // Block or Unblock User
  const handleBlockUser = async (targetUserId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/users/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, targetUserId })
      });
      const data = await res.json();
      if (data.success && data.blockedUserIds) {
        const updatedUser = { ...currentUser, blockedUserIds: data.blockedUserIds };
        setCurrentUser(updatedUser);
        localStorage.setItem("wavegram_user", JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error("Block user error:", err);
    }
  };

  // Join Group
  const handleJoinGroup = async (inviteCode: string, password?: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, inviteCode, password })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to join group.");
        return;
      }
      if (data.group && data.conversation) {
        setGroups((prev) => [...prev.filter((g) => g.id !== data.group.id), data.group]);
        setConversations((prev) => [...prev.filter((c) => c.id !== data.conversation.id), data.conversation]);
        setActiveConversationId(data.conversation.id);
        setGroupModalState({ open: false, mode: "join" });
        setSidebarTab("chats");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Manage Group Members
  const handleManageMembers = async (
    action:
      | "add"
      | "add_bulk"
      | "remove"
      | "toggle_admin"
      | "add_badge"
      | "restrict_member"
      | "toggle_announcement_mode"
      | "toggle_history_visibility"
      | "update_avatar"
      | "update_theme"
      | "remove_bulk",
    targetUserId: string,
    badgeName?: string,
    badgeColor?: string,
    targetUserIds?: string[],
    avatar?: string
  ) => {
    const activeConv = conversations.find((c) => c.id === activeConversationId);
    if (!activeConv || !activeConv.groupId || !currentUser) return;

    try {
      const res = await fetch("/api/groups/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: activeConv.groupId,
          requesterId: currentUser.id,
          targetUserId,
          targetUserIds,
          action,
          badgeName,
          badgeColor,
          avatar
        })
      });
      const data = await res.json();
      if (!res.ok) {
        const notif: AppNotification = {
          id: Math.random().toString(),
          type: "system",
          title: "Group Setting Notice",
          senderName: "Wavegram Security",
          text: data.error || "Action could not be completed.",
          createdAt: new Date().toISOString()
        };
        setNotifications((prev) => [...prev, notif]);
        return;
      }
      if (data.group) {
        setGroups((prev) => prev.map((g) => (g.id === data.group.id ? data.group : g)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Permanently Delete Group (Admin / Creator Only)
  const handleDeleteGroup = async (groupId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/groups/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, requesterId: currentUser.id })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete group.");
        return;
      }
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (data.conversationId) {
        setConversations((prev) => prev.filter((c) => c.id !== data.conversationId));
        if (activeConversationId === data.conversationId) {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
      setGroupModalState({ open: false, mode: "create" });
    } catch (err) {
      console.error("Delete group error:", err);
    }
  };

  // Calls
  const handleStartCall = async (type: "voice" | "video") => {
    if (!activeConversationId || !currentUser) return;
    const activeConv = conversations.find((c) => c.id === activeConversationId);
    if (!activeConv) return;

    const otherUserId = activeConv.participants.find((id) => id !== currentUser.id) || "target";

    try {
      const res = await fetch("/api/calls/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          callerId: currentUser.id,
          callerName: currentUser.username,
          callerAvatar: currentUser.avatar,
          targetId: otherUserId,
          type
        })
      });
      const data = await res.json();
      if (data.call) {
        setActiveCall(data.call);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEndCall = async () => {
    if (!activeCall) return;
    try {
      await fetch("/api/calls/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end", callId: activeCall.id })
      });
      setActiveCall(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    try {
      await fetch("/api/calls/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", callId: incomingCall.id })
      });
      setActiveCall({ ...incomingCall, status: "connected" });
      setIncomingCall(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeclineCall = async () => {
    if (!incomingCall) return;
    try {
      await fetch("/api/calls/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end", callId: incomingCall.id })
      });
      setIncomingCall(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleForwardMessage = async (targetConvId: string, text: string, mediaUrl?: string, type?: string) => {
    if (!currentUser) return;
    try {
      await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: targetConvId,
          senderId: currentUser.id,
          text: text ? `[Forwarded]: ${text}` : "[Forwarded Media]",
          mediaUrl,
          type: type || "text"
        })
      });
      setActiveConversationId(targetConvId);
      setViewMode("chat");
      setMobileShowChat(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBatchForwardMessages = async (targetConvId: string, messageIds: string[]) => {
    if (!currentUser || messageIds.length === 0) return;
    try {
      await fetch("/api/messages/batch-forward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageIds,
          targetConversationIds: [targetConvId],
          userId: currentUser.id
        })
      });
      setActiveConversationId(targetConvId);
      setViewMode("chat");
      setMobileShowChat(true);
      fetchData();
    } catch (err) {
      console.error("Batch forward error:", err);
    }
  };

  const handleBatchDeleteMessages = async (messageIds: string[], deleteType: "for_me" | "for_all") => {
    if (!currentUser || messageIds.length === 0) return;
    try {
      const res = await fetch("/api/messages/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageIds,
          userId: currentUser.id,
          deleteType
        })
      });
      if (res.ok) {
        if (deleteType === "for_me") {
          setMessages((prev) => prev.filter((m) => !messageIds.includes(m.id)));
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              messageIds.includes(m.id)
                ? { ...m, isDeletedForAll: true, text: "This message was deleted" }
                : m
            )
          );
        }
      }
    } catch (err) {
      console.error("Batch delete error:", err);
    }
  };

  // Stories Handlers
  const handleOpenStoryCreator = () => {
    setStoryToEdit(null);
    setStoryCreatorOpen(true);
  };

  const handleOpenStoryViewer = (targetUserId: string, initialIndex: number = 0) => {
    setStoryViewerState({
      open: true,
      targetUserId,
      initialIndex
    });
  };

  const handleEditStory = (story: Story) => {
    setStoryViewerState(null);
    setStoryToEdit(story);
    setStoryCreatorOpen(true);
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!currentUser) return;
    try {
      await fetch(`/api/stories/${storyId}?userId=${currentUser.id}`, {
        method: "DELETE"
      });
      setStories((prev) => prev.filter((s) => s.id !== storyId));
    } catch (err) {
      console.error("Delete story error:", err);
    }
  };

  const handleShareStoryToChat = async (story: Story, targetConvId?: string) => {
    if (!currentUser) return;
    const destConvId = targetConvId || activeConversationId || conversations[0]?.id;
    if (!destConvId) return;

    try {
      await fetch(`/api/stories/${story.id}/share-to-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: destConvId,
          senderId: currentUser.id
        })
      });
      setStoryViewerState(null);
      setActiveConversationId(destConvId);
      setViewMode("chat");
      setMobileShowChat(true);
    } catch (err) {
      console.error("Share story error:", err);
    }
  };

  if (!currentUser) {
    return <AuthModal onLoginSuccess={handleLoginSuccess} />;
  }

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const activeGroup = activeConv?.groupId
    ? groups.find((g) => g.id === activeConv.groupId)
    : undefined;

  return (
    <div className="fixed inset-0 flex h-[100dvh] max-h-[100dvh] w-full bg-[#050814] text-slate-100 overflow-hidden font-sans select-none">
      
      {/* Sidebar Navigation */}
      <div className={mobileShowChat ? "hidden md:flex shrink-0 h-full" : "flex w-full md:w-80 lg:w-96 shrink-0 h-full"}>
        <Sidebar
          currentUser={currentUser}
          allUsers={allUsers}
          conversations={conversations}
          groups={groups}
          chatRequests={chatRequests}
          stories={stories}
          activeConversationId={activeConversationId}
          activeTab={sidebarTab}
          setActiveTab={setSidebarTab}
          onSelectConversation={(id) => {
            setActiveConversationId(id);
            setViewMode("chat");
            setMobileShowChat(true);
          }}
          onStartDMWithUser={handleStartDMWithUser}
          onSelectUserProfile={(user) => setSelectedUserProfile(user)}
          onAcceptRequest={handleAcceptChatRequest}
          onDeclineRequest={handleDeclineChatRequest}
          onCreateGroupClick={() => setGroupModalState({ open: true, mode: "create" })}
          onJoinGroupClick={() => setGroupModalState({ open: true, mode: "join" })}
          onOpenAnalytics={() => {
            setViewMode("analytics");
            setMobileShowChat(true);
          }}
          onOpenProfile={() => setShowProfileModal(true)}
          onOpenNotes={() => setShowNotesModal(true)}
          onLogout={handleLogout}
          onDeleteConversation={handleDeleteConversation}
          onOpenStoryCreator={handleOpenStoryCreator}
          onOpenStoryViewer={handleOpenStoryViewer}
          onOpenAdminPanel={() => setShowAdminPanel(true)}
          onToggleMuteConversation={handleToggleMuteConversation}
          onOpenReportModal={handleOpenReportModal}
        />
      </div>

      {/* Main View Area */}
      <div className={mobileShowChat ? "flex-1 flex flex-col h-full overflow-hidden bg-[#030612] relative w-full" : "hidden md:flex flex-1 flex-col h-full overflow-hidden bg-[#030612] relative"}>
        {viewMode === "analytics" ? (
          <AnalyticsView currentUser={currentUser} onBack={() => {
            setViewMode("chat");
            setMobileShowChat(false);
          }} />
        ) : activeConv ? (
          <ChatRoom
            currentUser={currentUser}
            conversation={activeConv}
            messages={messages}
            allUsers={allUsers}
            allConversations={conversations}
            allGroups={groups}
            group={activeGroup}
            onSendMessage={handleSendMessage}
            onReactMessage={handleReactMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onForwardMessage={handleForwardMessage}
            onStartCall={handleStartCall}
            onOpenGroupSettings={() => setGroupModalState({ open: true, mode: "manage" })}
            onSelectUserProfile={(user) => setSelectedUserProfile(user)}
            onBackMobile={() => {
              setMobileShowChat(false);
              setActiveConversationId(null);
            }}
            onDeleteConversation={handleDeleteConversation}
            onBlockUser={handleBlockUser}
            onToggleMute={handleToggleMuteConversation}
            onOpenReportModal={handleOpenReportModal}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-[#0e1621]">
            <div className="max-w-sm w-full p-6 rounded-2xl bg-[#17212b] border border-[#242f3d] shadow-xl flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-[#242f3d] flex items-center justify-center mb-3.5 text-[#3390ec] shadow-inner">
                <MessageSquare className="w-8 h-8 text-[#3390ec]" />
              </div>
              <h2 className="text-base font-bold text-white mb-1">MK Wavegram</h2>
              <p className="text-xs text-[#7d8b99] leading-relaxed mb-4">
                Select a chat from the left panel to start messaging or ask <span className="text-[#3390ec] font-semibold">@MK.ia</span>.
              </p>
              {conversations.length > 0 && (
                <button
                  onClick={() => {
                    setActiveConversationId(conversations[0].id);
                    setMobileShowChat(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#3390ec] hover:bg-[#2481cc] text-white text-xs font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Open Recent Chat
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Story Creator Modal */}
      {storyCreatorOpen && (
        <StoryCreatorModal
          currentUser={currentUser}
          allUsers={allUsers}
          storyToEdit={storyToEdit}
          onClose={() => {
            setStoryCreatorOpen(false);
            setStoryToEdit(null);
          }}
          onStoryCreated={(newStory) => {
            setStories((prev) => [newStory, ...prev.filter((s) => s.id !== newStory.id)]);
          }}
          onStoryUpdated={(updatedStory) => {
            setStories((prev) => prev.map((s) => (s.id === updatedStory.id ? updatedStory : s)));
          }}
        />
      )}

      {/* Story Viewer Modal */}
      {storyViewerState?.open && (
        <StoryViewerModal
          currentUser={currentUser}
          allUsers={allUsers}
          stories={stories}
          conversations={conversations}
          groups={groups}
          initialUserId={storyViewerState.targetUserId}
          initialStoryIndex={storyViewerState.initialIndex}
          onClose={() => setStoryViewerState(null)}
          onEditStory={handleEditStory}
          onDeleteStory={handleDeleteStory}
          onSelectUserProfile={(user) => setSelectedUserProfile(user)}
          onShareToChat={handleShareStoryToChat}
          onStoryCreated={(newStory) => {
            setStories((prev) => [newStory, ...prev.filter((s) => s.id !== newStory.id)]);
          }}
        />
      )}

      {/* Group Modal */}
      {groupModalState.open && (
        <GroupModal
          mode={groupModalState.mode}
          currentUser={currentUser}
          group={activeGroup}
          allUsers={allUsers}
          conversations={conversations}
          onClose={() => setGroupModalState({ open: false, mode: "create" })}
          onCreateGroup={handleCreateGroup}
          onJoinGroup={handleJoinGroup}
          onManageMembers={handleManageMembers}
          onDeleteGroup={handleDeleteGroup}
          onBlockUser={handleBlockUser}
        />
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <ProfileModal
          currentUser={currentUser}
          onClose={() => setShowProfileModal(false)}
          onUpdateProfile={(updated) => {
            setCurrentUser((prev) => (prev ? { ...prev, ...updated } : prev));
          }}
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
        />
      )}

      {/* Notes & Music Studio Modal */}
      {showNotesModal && currentUser && (
        <NotesModal
          currentUser={currentUser}
          conversations={conversations}
          onClose={() => setShowNotesModal(false)}
          onShareToChat={(convId) => {
            setActiveConversationId(convId);
            setViewMode("chat");
            setMobileShowChat(true);
            fetchData();
          }}
        />
      )}

      {/* User Profile Modal */}
      {selectedUserProfile && (
        <UserProfileModal
          user={selectedUserProfile}
          currentUser={currentUser}
          conversations={conversations}
          chatRequests={chatRequests}
          onClose={() => setSelectedUserProfile(null)}
          onStartDM={(targetUserId) => {
            handleStartDMWithUser(targetUserId);
          }}
          onSendChatRequest={handleSendChatRequest}
          onBlockUser={handleBlockUser}
        />
      )}

      {/* Incoming Call Popup Modal */}
      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />
      )}

      {/* Voice & Video Call Overlay */}
      {activeCall && (
        <CallOverlay
          call={activeCall}
          currentUser={currentUser}
          onEndCall={handleEndCall}
        />
      )}

      {/* Admin Panel Modal */}
      {showAdminPanel && currentUser && (
        <AdminPanelModal
          currentUser={currentUser}
          allUsers={allUsers}
          onClose={() => setShowAdminPanel(false)}
          onUserUpdated={(updated) => {
            setCurrentUser((prev) => (prev ? { ...prev, ...updated } : prev));
            localStorage.setItem("wavegram_user", JSON.stringify({ ...currentUser, ...updated }));
          }}
          onOpenMKChannel={() => {
            setShowAdminPanel(false);
            setActiveConversationId("conv_mk_official");
            setViewMode("chat");
            setMobileShowChat(true);
          }}
          onOpenConversation={(convId) => {
            setShowAdminPanel(false);
            setActiveConversationId(convId);
            setViewMode("chat");
            setMobileShowChat(true);
          }}
          onOpenGroup={(groupId) => {
            setShowAdminPanel(false);
            const targetGroup = groups.find((g) => g.id === groupId);
            const conv = conversations.find((c) => c.groupId === groupId || c.id === targetGroup?.conversationId);
            if (conv) {
              setActiveConversationId(conv.id);
            } else if (targetGroup?.conversationId) {
              setActiveConversationId(targetGroup.conversationId);
            }
            setViewMode("chat");
            setMobileShowChat(true);
          }}
        />
      )}

      {/* Report Modal */}
      {reportModalState?.open && currentUser && (
        <ReportModal
          currentUser={currentUser}
          targetType={reportModalState.type}
          targetUser={reportModalState.type === "user" ? reportModalState.target : undefined}
          targetMessage={reportModalState.type === "message" ? reportModalState.target : undefined}
          targetGroup={reportModalState.type === "group" ? reportModalState.target : undefined}
          conversationId={reportModalState.conversationId}
          onClose={() => setReportModalState(null)}
          onSuccess={handleReportSubmitted}
        />
      )}

      {/* Realtime Notification Toasts */}
      <NotificationToast
        notifications={notifications}
        onDismiss={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
        onSelectNotification={(notif) => {
          if (notif.conversationId) {
            setActiveConversationId(notif.conversationId);
            setViewMode("chat");
            setMobileShowChat(true);
          }
          setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
        }}
      />
    </div>
  );
}
