import React, { useState, useRef, useEffect } from "react";
import {
  User,
  Message,
  Conversation,
  Group,
  ReplyToMessage
} from "../types";
import {
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Mic,
  Send,
  Heart,
  CornerUpLeft,
  Copy,
  Trash2,
  Edit2,
  Share2,
  Lock,
  Volume2,
  VolumeX,
  Sparkles,
  X,
  Play,
  Pause,
  Info,
  CheckCheck,
  FileText,
  Image as ImageIcon,
  Film,
  ArrowLeft,
  Download,
  ShieldAlert,
  UserX,
  UserCheck,
  Megaphone,
  BarChart2,
  Check,
  Plus,
  Trash,
  ShieldCheck,
  Crown,
  ChevronDown,
  Feather,
  Zap,
  Camera,
  PlusCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  CheckCircle,
  Sliders,
  Move,
  Hand,
  RefreshCw,
  Paintbrush,
  CheckSquare,
  Square
} from "lucide-react";

import { ForwardModal } from "./ForwardModal";
import { GifStickerModal } from "./GifStickerModal";
import { PhotoEditorModal } from "./PhotoEditorModal";
import { GifItem, StickerItem } from "../types";

interface ChatRoomProps {
  currentUser: User;
  conversation: Conversation;
  messages: Message[];
  allUsers: User[];
  allConversations?: Conversation[];
  allGroups?: Group[];
  group?: Group;
  onSendMessage: (payload: {
    text?: string;
    type?: "text" | "image" | "video" | "audio" | "voice" | "file" | "gif" | "poll";
    mediaUrl?: string;
    mediaName?: string;
    mediaSize?: string;
    duration?: number;
    replyTo?: ReplyToMessage;
    poll?: {
      question: string;
      options: { text: string }[] | string[];
      allowMultipleAnswers?: boolean;
    };
  }) => void;
  onReactMessage: (messageId: string, emoji?: string, isDoubleTapLike?: boolean) => void;
  onEditMessage: (messageId: string, newText: string) => void;
  onDeleteMessage: (messageId: string, deleteType: "for_me" | "for_all") => void;
  onForwardMessage?: (targetConvId: string, text: string, mediaUrl?: string, type?: string) => void;
  onBatchDeleteMessages?: (messageIds: string[], deleteType: "for_me" | "for_all") => void;
  onBatchForwardMessages?: (targetConvId: string, messageIds: string[]) => void;
  onStartCall: (type: "voice" | "video") => void;
  onOpenGroupSettings: () => void;
  onSelectUserProfile?: (user: User) => void;
  onBackMobile?: () => void;
  onDeleteConversation?: (convId: string) => void;
  onBlockUser?: (targetUserId: string) => void;
}

const EMOJI_LIST = [
  "❤️", "👍", "👎", "😂", "😮", "😢", "🔥", "🎉",
  "👏", "💩", "🚀", "💯", "🙈", "🤡", "🥳", "🤯",
  "🙏", "⚡", "💎", "💡", "🦄", "🏆"
];

export const ChatRoom: React.FC<ChatRoomProps> = ({
  currentUser,
  conversation,
  messages,
  allUsers,
  allConversations = [],
  allGroups = [],
  group,
  onSendMessage,
  onReactMessage,
  onEditMessage,
  onDeleteMessage,
  onForwardMessage,
  onBatchDeleteMessages,
  onBatchForwardMessages,
  onStartCall,
  onOpenGroupSettings,
  onSelectUserProfile,
  onBackMobile,
  onDeleteConversation,
  onBlockUser
}) => {
  const [inputText, setInputText] = useState("");
  const [replyTo, setReplyTo] = useState<ReplyToMessage | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null); // messageId
  const [showGifStickerModal, setShowGifStickerModal] = useState(false);
  const [gifStickerTab, setGifStickerTab] = useState<"gifs" | "stickers" | "maker">("stickers");
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null);
  const [forwardBatchMessages, setForwardBatchMessages] = useState<Message[]>([]);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [contextMenuMsg, setContextMenuMsg] = useState<Message | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);
  const [copiedToastText, setCopiedToastText] = useState("Copied to clipboard! ✓");
  const [heartParticles, setHeartParticles] = useState<{ id: string; msgId: string; emoji: string; x: number; y: number }[]>([]);

  // Multi-Message Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);

  const toggleMessageSelection = (msgId: string) => {
    setSelectedMessageIds((prev) =>
      prev.includes(msgId) ? prev.filter((id) => id !== msgId) : [...prev, msgId]
    );
  };

  const selectAllMessages = () => {
    const validIds = messages.filter((m) => !m.isSystem).map((m) => m.id);
    setSelectedMessageIds(validIds);
  };

  const clearSelection = () => {
    setSelectedMessageIds([]);
    setSelectionMode(false);
  };

  const selectedMessages = messages.filter((m) => selectedMessageIds.includes(m.id));

  const handleCopySelected = () => {
    if (selectedMessages.length === 0) return;
    const textToCopy = selectedMessages
      .map((m) => {
        const time = new Date(m.createdAt || Date.now()).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        });
        const content = m.text || (m.mediaUrl ? `[${m.type || "Media"}]` : "");
        return `[${time}] ${m.senderName}: ${content}`;
      })
      .join("\n");
    navigator.clipboard.writeText(textToCopy);
    setCopiedToastText(`Copied ${selectedMessages.length} message(s) to clipboard! ✓`);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2200);
  };

  const handleForwardSelected = () => {
    if (selectedMessages.length === 0) return;
    setForwardBatchMessages(selectedMessages);
  };

  const handleBatchDeleteClick = () => {
    if (selectedMessages.length === 0) return;
    setShowBatchDeleteModal(true);
  };

  // Poll state variables
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [activePollMsg, setActivePollMsg] = useState<Message | null>(null);

  // @ Mention auto-complete state (featuring MK.ia AI and chat members)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState<number>(0);
  const [selectedMentionIdx, setSelectedMentionIdx] = useState<number>(0);

  // Scroll & UX states
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [unreadBelowCount, setUnreadBelowCount] = useState(0);
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  // Photo / Media Lightbox Viewer State with Continuous Manual Zoom & Pan
  const [viewingPhoto, setViewingPhoto] = useState<{
    url: string;
    caption?: string;
    senderName?: string;
    timestamp?: number;
  } | null>(null);
  const [photoZoom, setPhotoZoom] = useState<number>(1);
  const [photoPan, setPhotoPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [photoRotation, setPhotoRotation] = useState<number>(0);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState<boolean>(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [touchPinchDist, setTouchPinchDist] = useState<number | null>(null);
  const [touchInitialZoom, setTouchInitialZoom] = useState<number>(1);
  const [savedPhotoToast, setSavedPhotoToast] = useState(false);
  const [showChatPhotoEditor, setShowChatPhotoEditor] = useState(false);

  // Manual Photo Zoom & Pan Helpers
  const handleResetPhotoView = () => {
    setPhotoZoom(1);
    setPhotoPan({ x: 0, y: 0 });
    setPhotoRotation(0);
  };

  const handlePhotoWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = -e.deltaY * 0.0018;
    setPhotoZoom((prev) => {
      const next = Math.min(5, Math.max(0.5, +(prev + delta).toFixed(2)));
      if (next <= 1 && prev > 1) {
        setPhotoPan({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handlePhotoMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(true);
    setDragStartPos({
      x: e.clientX - photoPan.x,
      y: e.clientY - photoPan.y
    });
  };

  const handlePhotoMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingPhoto) return;
    setPhotoPan({
      x: e.clientX - dragStartPos.x,
      y: e.clientY - dragStartPos.y
    });
  };

  const handlePhotoMouseUp = () => {
    setIsDraggingPhoto(false);
  };

  const handlePhotoTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchPinchDist(dist);
      setTouchInitialZoom(photoZoom);
    } else if (e.touches.length === 1) {
      setIsDraggingPhoto(true);
      setDragStartPos({
        x: e.touches[0].clientX - photoPan.x,
        y: e.touches[0].clientY - photoPan.y
      });
    }
  };

  const handlePhotoTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchPinchDist !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / touchPinchDist;
      const nextZoom = Math.min(5, Math.max(0.5, +(touchInitialZoom * ratio).toFixed(2)));
      setPhotoZoom(nextZoom);
      if (nextZoom <= 1) {
        setPhotoPan({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isDraggingPhoto) {
      setPhotoPan({
        x: e.touches[0].clientX - dragStartPos.x,
        y: e.touches[0].clientY - dragStartPos.y
      });
    }
  };

  const handlePhotoTouchEnd = () => {
    setIsDraggingPhoto(false);
    setTouchPinchDist(null);
  };

  const handlePhotoDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photoZoom > 1.2) {
      setPhotoZoom(1);
      setPhotoPan({ x: 0, y: 0 });
    } else {
      setPhotoZoom(2.2);
    }
  };

  // Keyboard shortcut listener for manual image viewer (Escape to exit, 0 / R to reset)
  useEffect(() => {
    if (!viewingPhoto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setViewingPhoto(null);
        handleResetPhotoView();
      } else if (e.key === "0" || e.key.toLowerCase() === "r") {
        handleResetPhotoView();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewingPhoto]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef<number>(messages.length);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const longPressTimerRef = useRef<any>(null);
  const touchStartPosRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchMovedRef = useRef<boolean>(false);
  const recordingSecondsRef = useRef<number>(0);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Pure TypeScript synthetic voice note generator fallback
  const generateSyntheticVoiceDataUrl = (durationSec = 3) => {
    const sampleRate = 8000;
    const numSamples = sampleRate * Math.max(1, durationSec);
    const buffer = new Uint8Array(44 + numSamples);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) buffer[offset + i] = str.charCodeAt(i);
    };
    const writeUint32 = (offset: number, val: number) => {
      buffer[offset] = val & 0xff;
      buffer[offset + 1] = (val >> 8) & 0xff;
      buffer[offset + 2] = (val >> 16) & 0xff;
      buffer[offset + 3] = (val >> 24) & 0xff;
    };
    const writeUint16 = (offset: number, val: number) => {
      buffer[offset] = val & 0xff;
      buffer[offset + 1] = (val >> 8) & 0xff;
    };

    writeString(0, "RIFF");
    writeUint32(4, 36 + numSamples);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    writeUint32(16, 16);
    writeUint16(20, 1);
    writeUint16(22, 1);
    writeUint32(24, sampleRate);
    writeUint32(28, sampleRate);
    writeUint16(32, 1);
    writeUint16(34, 8);
    writeString(36, "data");
    writeUint32(40, numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const freq = 440 + Math.sin(t * 8) * 100 + Math.sin(t * 15) * 50;
      const sample = Math.floor(128 + Math.sin(2 * Math.PI * freq * t) * 60 * Math.exp(-t / 3));
      buffer[44 + i] = Math.max(0, Math.min(255, sample));
    }

    let binary = "";
    for (let i = 0; i < buffer.length; i++) binary += String.fromCharCode(buffer[i]);
    return "data:audio/wav;base64," + btoa(binary);
  };

  // Toggle Audio Playback
  const handleTogglePlayAudio = (msg: Message) => {
    if (activeAudioId === msg.id) {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      setActiveAudioId(null);
      setAudioProgress(0);
    } else {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      const src = msg.mediaUrl || generateSyntheticVoiceDataUrl(msg.duration || 3);
      const audio = new Audio(src);
      audioElementRef.current = audio;
      setActiveAudioId(msg.id);
      setAudioProgress(0);

      audio.ontimeupdate = () => {
        if (audio.duration > 0) {
          setAudioProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onended = () => {
        setActiveAudioId(null);
        setAudioProgress(0);
      };

      audio.play().catch(() => {
        // Fallback simulation if autoplay blocked
        setActiveAudioId(msg.id);
        const duration = (msg.duration || 3) * 1000;
        const start = Date.now();
        const interval = setInterval(() => {
          const elapsed = Date.now() - start;
          if (elapsed >= duration) {
            clearInterval(interval);
            setActiveAudioId(null);
            setAudioProgress(0);
          } else {
            setAudioProgress((elapsed / duration) * 100);
          }
        }, 100);
      });
    }
  };

  // Other participant in DM
  const otherUserId = conversation.participants.find((id) => id !== currentUser.id);
  const otherUser = allUsers.find((u) => u.id === otherUserId);

  const isGroupAdmin = conversation.type === "group" && group ? (group.adminIds.includes(currentUser.id) || group.creatorId === currentUser.id) : false;
  const isRestrictedInGroup = conversation.type === "group" && group ? (group.restrictedMemberIds || []).includes(currentUser.id) : false;
  const isAnnouncementOnly = conversation.type === "group" && group ? (!!group.announcementMode && !isGroupAdmin) : false;
  const isOtherUserBlocked = conversation.type === "dm" && otherUserId ? (currentUser.blockedUserIds || []).includes(otherUserId) : false;
  const isMeBlockedByOther = conversation.type === "dm" && otherUser ? (otherUser.blockedUserIds || []).includes(currentUser.id) : false;

  const title = conversation.type === "group" ? group?.name || "Group Chat" : otherUser?.username || "Chat";
  const avatar = conversation.type === "group" ? group?.avatar : otherUser?.avatar;
  const isOnline = conversation.type === "dm" && otherUser?.status === "online";

  // Auto focus input when switching conversations
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [conversation.id]);

  // Mobile virtual keyboard viewport height and scroll auto-adjustment
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const handleViewportChange = () => {
      if (document.activeElement === textareaRef.current) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 60);
      }
    };
    vv.addEventListener("resize", handleViewportChange);
    vv.addEventListener("scroll", handleViewportChange);
    return () => {
      vv.removeEventListener("resize", handleViewportChange);
      vv.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  // Handle scrolling detection
  const handleScroll = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchMovedRef.current = true;
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isUp = distanceFromBottom > 120;
    setIsScrolledUp(isUp);
    if (!isUp) {
      setUnreadBelowCount(0);
    }
  };

  // Smart scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isNearBottom = distanceFromBottom <= 160;

      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        setUnreadBelowCount(0);
      } else if (messages.length > prevMsgCountRef.current) {
        // Increment unread count while reading earlier history
        const diff = messages.length - prevMsgCountRef.current;
        setUnreadBelowCount((prev) => prev + diff);
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMsgCountRef.current = messages.length;
  }, [messages]);

  // Handlers for sending rich GIFs & Stickers
  const handleSendGif = (gif: GifItem) => {
    if (isOtherUserBlocked || isMeBlockedByOther || isRestrictedInGroup || isAnnouncementOnly) {
      return;
    }
    onSendMessage({
      type: "gif",
      mediaUrl: gif.url,
      text: gif.title,
      replyTo: replyTo || undefined
    });
    setReplyTo(null);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 40);
  };

  const handleSendSticker = (sticker: StickerItem) => {
    if (isOtherUserBlocked || isMeBlockedByOther || isRestrictedInGroup || isAnnouncementOnly) {
      return;
    }
    onSendMessage({
      type: "sticker",
      mediaUrl: sticker.url,
      text: sticker.title,
      replyTo: replyTo || undefined
    });
    setReplyTo(null);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 40);
  };

  const handleSend = (e?: React.MouseEvent | React.TouchEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    if (isOtherUserBlocked || isMeBlockedByOther || isRestrictedInGroup || isAnnouncementOnly) {
      return;
    }

    onSendMessage({
      text: inputText.trim(),
      type: "text",
      replyTo: replyTo || undefined
    });

    setInputText("");
    setReplyTo(null);

    // CRITICAL: Keep focus so mobile virtual keyboard does not hide/dismiss!
    if (textareaRef.current) {
      textareaRef.current.style.height = "42px";
      textareaRef.current.focus();
    }

    // Scroll directly to latest message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setIsScrolledUp(false);
      setUnreadBelowCount(0);
    }, 40);
  };

  // Poll Handlers
  const handleVotePollOption = async (messageId: string, optionId: string) => {
    try {
      await fetch("/api/messages/poll/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, userId: currentUser.id, optionId })
      });
    } catch (err) {
      console.error("Poll vote error:", err);
    }
  };

  const handleClosePoll = async (messageId: string) => {
    try {
      const res = await fetch("/api/messages/poll/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, userId: currentUser.id })
      });
      const data = await res.json();
      if (data.message && activePollMsg?.id === messageId) {
        setActivePollMsg(data.message);
      }
    } catch (err) {
      console.error("Poll close error:", err);
    }
  };

  const handleCreatePoll = () => {
    if (!isGroupAdmin) {
      alert("Only group administrators can create polls and votes.");
      return;
    }
    const trimmedQ = pollQuestion.trim();
    const validOptions = pollOptions.map((o) => o.trim()).filter((o) => o.length > 0);
    if (!trimmedQ || validOptions.length < 2) return;

    onSendMessage({
      text: `📊 Poll: ${trimmedQ}`,
      type: "poll",
      poll: {
        question: trimmedQ,
        options: validOptions.map((optText, idx) => ({
          id: "opt_" + idx + "_" + Math.random().toString(36).substring(2, 6),
          text: optText,
          voterIds: []
        })),
        allowMultipleAnswers: pollAllowMultiple
      }
    });

    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollAllowMultiple(false);
    setShowCreatePollModal(false);
  };

  // Mention Candidate List computation (MK.ia AI is always prioritized on top)
  const mkAiUser: User = {
    id: "user_mk_ai",
    email: "mk.ia@wavegram.internal",
    username: "MK.ia",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=MKIAGemini&backgroundColor=3390ec,17212b",
    bio: "MK Wavegram Official Gemini AI Assistant ⚡",
    status: "online",
    createdAt: new Date("2025-01-01").toISOString(),
    hasAccount: true,
    badges: ["MK.ia", "Gemini Deep AI"]
  };

  const getMentionCandidates = () => {
    if (mentionQuery === null) return [];
    const query = mentionQuery.toLowerCase();

    const candidates: Array<{ user: User; isAi?: boolean; description?: string }> = [
      {
        user: mkAiUser,
        isAi: true,
        description: "Deep Gemini AI Assistant (Code, Math, Analysis, Brainstorming)"
      }
    ];

    // Add other chat participants
    allUsers.forEach((u) => {
      if (u.id !== currentUser.id && u.id !== mkAiUser.id && u.username) {
        if (!candidates.some((c) => c.user.id === u.id)) {
          candidates.push({
            user: u,
            isAi: false,
            description: u.bio || `@${u.username}`
          });
        }
      }
    });

    if (!query) return candidates.slice(0, 6);

    return candidates
      .filter(
        (c) =>
          c.user.username.toLowerCase().includes(query) ||
          (c.description && c.description.toLowerCase().includes(query)) ||
          (c.isAi && (query === "m" || query === "mk" || query === "ai" || query === "gemini" || query === "ia"))
      )
      .slice(0, 6);
  };

  const mentionCandidates = getMentionCandidates();

  const handleSelectMention = (candidate: { user: User; isAi?: boolean }) => {
    const textBefore = inputText.slice(0, mentionIndex);
    const textAfter = inputText.slice(mentionIndex);
    // Find where the query token ends
    const match = textAfter.match(/^[a-zA-Z0-9._]*/);
    const tokenLength = match ? match[0].length : 0;
    const rest = textAfter.slice(tokenLength);

    const tagToInsert = candidate.isAi ? "@MK.ia " : `@${candidate.user.username} `;
    const newText = textBefore + tagToInsert + (rest.startsWith(" ") ? rest.slice(1) : rest);

    setInputText(newText);
    setMentionQuery(null);

    if (textareaRef.current) {
      textareaRef.current.focus();
      const newCursorPos = textBefore.length + tagToInsert.length;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd = newCursorPos;
        }
      }, 20);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;

    // Check cursor position for @ trigger
    const cursorPos = e.target.selectionStart || val.length;
    const textUpToCursor = val.slice(0, cursorPos);
    const lastAtIndex = textUpToCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      // Check that @ is either at start or preceded by whitespace
      const charBeforeAt = lastAtIndex > 0 ? textUpToCursor[lastAtIndex - 1] : " ";
      if (/\s/.test(charBeforeAt)) {
        const query = textUpToCursor.slice(lastAtIndex + 1);
        if (!/\s/.test(query)) {
          setMentionQuery(query);
          setMentionIndex(lastAtIndex);
          setSelectedMentionIdx(0);
          return;
        }
      }
    }

    setMentionQuery(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && mentionCandidates.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIdx((prev) => (prev + 1) % mentionCandidates.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIdx((prev) => (prev - 1 + mentionCandidates.length) % mentionCandidates.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const candidate = mentionCandidates[selectedMentionIdx] || mentionCandidates[0];
        if (candidate) {
          handleSelectMention(candidate);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (isOtherUserBlocked || isMeBlockedByOther || isRestrictedInGroup || isAnnouncementOnly) {
      return;
    }
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onloadend = () => {
              const isGif = file.type.includes("gif") || file.name?.endsWith(".gif");
              onSendMessage({
                text: isGif ? "👾 Keyboard GIF" : "📷 Pasted Image",
                type: isGif ? "gif" : "image",
                mediaUrl: reader.result as string,
                mediaName: file.name || (isGif ? "keyboard.gif" : "pasted.png")
              });
            };
            reader.readAsDataURL(file);
            return;
          }
        }
      }
    }
  };

  // Double Click handler for instant Like ❤️ (desktop only, disabled during mobile touch/scroll)
  const handleDoubleClick = (msg: Message, e?: React.MouseEvent) => {
    if (touchMovedRef.current) return;
    if (e && (e.nativeEvent as any)?.pointerType === "touch") return;

    onReactMessage(msg.id, "❤️", true);

    const emojis = ["❤️", "💖", "💘", "💕", "💓", "✨", "🔥"];
    const particles = Array.from({ length: 7 }).map((_, i) => ({
      id: Math.random().toString(),
      msgId: msg.id,
      emoji: emojis[i % emojis.length],
      x: (Math.random() - 0.5) * 100,
      y: -Math.random() * 50 - 20
    }));

    setHeartParticles((prev) => [...prev, ...particles]);
    setTimeout(() => {
      setHeartParticles((prev) => prev.filter((p) => !particles.some((np) => np.id === p.id)));
    }, 1200);
  };

  // Long press for touch devices with active scroll detection
  const handleTouchStart = (e: React.TouchEvent, msg: Message) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    const touch = e.touches[0];
    if (!touch) return;
    touchMovedRef.current = false;
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };

    longPressTimerRef.current = setTimeout(() => {
      // Only open context menu if user hasn't moved their finger or scrolled
      if (!touchMovedRef.current) {
        setContextMenuMsg(msg);
      }
    }, 650);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartPosRef.current && e.touches[0]) {
      const dx = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
      // If moved by more than 6px, the user is scrolling -> cancel immediately
      if (dx > 6 || dy > 6) {
        touchMovedRef.current = true;
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
    setTimeout(() => {
      touchMovedRef.current = false;
    }, 150);
  };

  const handleTouchCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
    touchMovedRef.current = false;
  };

  // Media Attachment Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isOtherUserBlocked || isMeBlockedByOther || isRestrictedInGroup || isAnnouncementOnly) {
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = () => {
      const url = fileReader.result as string;
      let type: "image" | "video" | "file" = "file";
      if (file.type.startsWith("image/")) type = "image";
      else if (file.type.startsWith("video/")) type = "video";

      onSendMessage({
        text: file.name,
        type,
        mediaUrl: url,
        mediaName: file.name,
        mediaSize: (file.size / 1024).toFixed(1) + " KB",
        replyTo: replyTo || undefined
      });
      setReplyTo(null);
    };
    fileReader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Voice Recording
  const startRecording = async () => {
    if (isOtherUserBlocked || isMeBlockedByOther || isRestrictedInGroup || isAnnouncementOnly) {
      return;
    }
    setIsRecording(true);
    setRecordingSeconds(0);
    recordingSecondsRef.current = 0;

    timerIntervalRef.current = setInterval(() => {
      recordingSecondsRef.current += 1;
      setRecordingSeconds(recordingSecondsRef.current);
    }, 1000);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
      if (stream) {
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const finalDuration = Math.max(1, recordingSecondsRef.current);
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            const reader = new FileReader();
            reader.onloadend = () => {
              onSendMessage({
                text: "🎤 Voice Note",
                type: "voice",
                mediaUrl: reader.result as string,
                duration: finalDuration,
                replyTo: replyTo || undefined
              });
              setReplyTo(null);
            };
            reader.readAsDataURL(audioBlob);
          } else {
            onSendMessage({
              text: "🎤 Voice Note",
              type: "voice",
              mediaUrl: generateSyntheticVoiceDataUrl(finalDuration),
              duration: finalDuration,
              replyTo: replyTo || undefined
            });
            setReplyTo(null);
          }
          stream.getTracks().forEach((track) => track.stop());
        };

        recorder.start();
      } else {
        mediaRecorderRef.current = null;
      }
    } catch (err) {
      mediaRecorderRef.current = null;
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    clearInterval(timerIntervalRef.current);
    const finalDuration = Math.max(1, recordingSecondsRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    } else {
      onSendMessage({
        text: "🎤 Voice Note",
        type: "voice",
        mediaUrl: generateSyntheticVoiceDataUrl(finalDuration),
        duration: finalDuration,
        replyTo: replyTo || undefined
      });
      setReplyTo(null);
    }
  };

  const cancelRecording = () => {
    setIsRecording(false);
    clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
  };

  const formatDateSeparator = (dateStr?: string | number) => {
    if (!dateStr) return "Today";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Today";

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Save / Download Photo to Device Gallery
  const handleSavePhotoToGallery = async (photoUrl: string, customName?: string) => {
    try {
      const fileName = customName ? `Plume_${customName.replace(/[^a-zA-Z0-9]/g, "_")}.jpg` : `Plume_Photo_${Date.now()}.jpg`;

      // If it's a data URL or blob URL, download directly
      if (photoUrl.startsWith("data:") || photoUrl.startsWith("blob:")) {
        const link = document.createElement("a");
        link.href = photoUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Fetch to blob for external cross-origin images
        const res = await fetch(photoUrl);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }

      setSavedPhotoToast(true);
      setTimeout(() => setSavedPhotoToast(false), 2500);
    } catch (err) {
      // Fallback
      const link = document.createElement("a");
      link.href = photoUrl;
      link.download = `Plume_Photo_${Date.now()}.jpg`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSavedPhotoToast(true);
      setTimeout(() => setSavedPhotoToast(false), 2500);
    }
  };

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && viewingPhoto) {
        setViewingPhoto(null);
        setPhotoZoom(1);
        setPhotoRotation(0);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewingPhoto]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e1621] relative overflow-hidden select-none wavegram-chat-bg">
      {/* Header */}
      <div className="p-2.5 sm:p-3 px-4 border-b border-[#101921] bg-[#17212b] flex items-center justify-between z-10 shadow-sm shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className="p-1.5 -ml-1 rounded-full text-[#7d8b99] hover:text-white hover:bg-[#202b36] transition-colors flex items-center justify-center shrink-0 cursor-pointer"
              title="Back to chats"
            >
              <ArrowLeft className="w-5 h-5 text-[#3390ec]" />
            </button>
          )}

          <div
            onClick={() => {
              if (conversation.type === "dm" && otherUser && onSelectUserProfile) {
                onSelectUserProfile(otherUser);
              } else if (conversation.type === "group") {
                onOpenGroupSettings();
              }
            }}
            className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-opacity"
          >
            <div className="relative shrink-0">
              <img
                src={avatar}
                alt={title}
                className="w-10 h-10 rounded-full object-cover bg-[#242f3d] ring-1 ring-[#101921] group-hover:scale-105 transition-transform"
              />
              {isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#42ab58] border-2 border-[#17212b]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-white text-sm group-hover:text-[#3390ec] transition-colors leading-tight">{title}</h2>
                {group?.announcementMode && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold flex items-center gap-0.5 border border-amber-500/30">
                    <Megaphone className="w-2.5 h-2.5" />
                    Channel
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#7d8b99] leading-tight mt-0.5">
                {conversation.type === "group"
                  ? `${group?.memberIds.length || 1} members`
                  : isOnline
                  ? "online"
                  : "last seen recently"}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 relative">
          <button
            onClick={() => {
              if (selectionMode) {
                clearSelection();
              } else {
                setSelectionMode(true);
              }
            }}
            title={selectionMode ? "Cancel selection" : "Select messages"}
            className={`p-2 rounded-full transition-colors ${
              selectionMode || selectedMessageIds.length > 0
                ? "bg-[#3390ec] text-white"
                : "text-[#7d8b99] hover:text-white hover:bg-[#202b36]"
            }`}
          >
            <CheckSquare className="w-4 h-4" />
          </button>
          <button
            onClick={() => onStartCall("voice")}
            title="Voice Call"
            className="p-2 rounded-full text-[#7d8b99] hover:text-white hover:bg-[#202b36] transition-colors"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            onClick={() => onStartCall("video")}
            title="Video Call"
            className="p-2 rounded-full text-[#7d8b99] hover:text-white hover:bg-[#202b36] transition-colors"
          >
            <Video className="w-4 h-4" />
          </button>
          {conversation.type === "group" ? (
            <button
              onClick={onOpenGroupSettings}
              title="Group Info"
              className="p-2 rounded-full text-[#7d8b99] hover:text-white hover:bg-[#202b36] transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                title="Options"
                className="p-2 rounded-full text-[#7d8b99] hover:text-white hover:bg-[#202b36] transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showHeaderMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#17212b] border border-[#101921] rounded-xl p-1.5 shadow-2xl z-30 space-y-0.5">
                  <button
                    onClick={() => {
                      setSelectionMode(true);
                      setShowHeaderMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-[#202b36] text-white transition-colors"
                  >
                    <CheckSquare className="w-4 h-4 text-[#3390ec]" />
                    <span>Select Messages</span>
                  </button>

                  {otherUserId && onBlockUser && (
                    <button
                      onClick={() => {
                        onBlockUser(otherUserId);
                        setShowHeaderMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-[#202b36] text-white transition-colors"
                    >
                      {currentUser.blockedUserIds?.includes(otherUserId) ? (
                        <>
                          <UserCheck className="w-4 h-4 text-[#42ab58]" />
                          <span>Unblock User</span>
                        </>
                      ) : (
                        <>
                          <UserX className="w-4 h-4 text-amber-400" />
                          <span>Block User</span>
                        </>
                      )}
                    </button>
                  )}

                  {onDeleteConversation && (
                    <button
                      onClick={() => {
                        setShowHeaderMenu(false);
                        setShowDeleteConfirmModal(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-rose-950/40 text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                      <span>Delete Chat</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Multi-Message Selection Action Bar */}
      {(selectionMode || selectedMessageIds.length > 0) && (
        <div className="p-2.5 sm:p-3 px-4 bg-[#0a1435] border-b border-cyan-500/40 shadow-xl flex items-center justify-between z-20 shrink-0 select-none">
          <div className="flex items-center gap-3">
            <button
              onClick={clearSelection}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-blue-900/40 transition-colors"
              title="Cancel selection"
            >
              <X className="w-5 h-5 text-cyan-400" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-xs sm:text-sm">
                {selectedMessageIds.length} Selected
              </span>
              <button
                onClick={
                  selectedMessageIds.length === messages.filter((m) => !m.isSystem).length
                    ? () => setSelectedMessageIds([])
                    : selectAllMessages
                }
                className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-500/20 text-cyan-300 font-semibold hover:bg-blue-500/30 transition-colors"
              >
                {selectedMessageIds.length === messages.filter((m) => !m.isSystem).length
                  ? "Deselect all"
                  : "Select all"}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleCopySelected}
              disabled={selectedMessageIds.length === 0}
              title="Copy selected messages"
              className="px-3 py-1.5 rounded-xl bg-blue-900/50 hover:bg-blue-800/60 disabled:opacity-40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 border border-blue-800/50"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copy</span>
            </button>

            <button
              onClick={handleForwardSelected}
              disabled={selectedMessageIds.length === 0}
              title="Forward selected messages"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/30 transition-all active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Forward ({selectedMessageIds.length})</span>
            </button>

            <button
              onClick={handleBatchDeleteClick}
              disabled={selectedMessageIds.length === 0}
              title="Delete selected messages"
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-40 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Messages Feed */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-2.5 scrollbar-thin scrollbar-thumb-blue-900/30 relative chat-doodle-bg"
      >
        {/* End-to-End Encryption Notice Banner (WhatsApp Security Standard) */}
        <div className="flex justify-center my-2 select-none px-2">
          <div className="max-w-md w-full bg-[#162035]/85 border border-amber-500/30 rounded-2xl p-2.5 sm:p-3 text-center shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-center gap-1.5 text-amber-300 text-xs font-bold mb-1">
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>End-to-end encrypted</span>
            </div>
            <p className="text-[11px] text-amber-100/80 leading-relaxed">
              Messages and calls are end-to-end encrypted. No one outside of this chat, not even MK-wavegram, can read or listen to them.
            </p>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-xs my-auto">
            <div className="w-14 h-14 rounded-3xl bg-[#09112a] border border-blue-900/50 flex items-center justify-center mb-2.5 text-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.2)]">
              <Sparkles className="w-7 h-7 animate-pulse" />
            </div>
            <p className="font-semibold text-slate-300">No messages here yet</p>
            <p className="text-[11px] mt-0.5 text-slate-500">Say hello or send a voice note!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const msgDate = new Date(msg.createdAt || Date.now()).toDateString();
            const prevDate = prevMsg ? new Date(prevMsg.createdAt || Date.now()).toDateString() : null;
            const showDateSeparator = msgDate !== prevDate;

            // Render System Announcements
            if (msg.isSystem) {
              return (
                <React.Fragment key={msg.id}>
                  {showDateSeparator && (
                    <div className="flex justify-center my-2 sticky top-1 z-10 select-none">
                      <span className="px-3 py-1 rounded-full bg-[#0b1329]/90 text-slate-300 text-[10px] font-semibold border border-blue-900/60 shadow-md backdrop-blur-md">
                        {formatDateSeparator(msg.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-center my-2 select-none">
                    <div className="px-3.5 py-1.5 rounded-full bg-[#09112a]/90 border border-blue-900/50 text-slate-300 text-[11px] flex items-center gap-1.5 shadow-sm max-w-md text-center">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{msg.text}</span>
                    </div>
                  </div>
                </React.Fragment>
              );
            }

            const isMe = msg.senderId === currentUser.id;
            const isMkAi = msg.senderId === "user_mk_ia" || msg.senderId === "user_wia_ai";
            const hasLiked = msg.likes?.includes(currentUser.id);
            const isSelected = selectedMessageIds.includes(msg.id);
            const canDeleteForAll = isMe || (conversation.type === "group" && (group?.adminIds.includes(currentUser.id) || group?.creatorId === currentUser.id));

            return (
              <React.Fragment key={msg.id}>
                {showDateSeparator && (
                  <div className="flex justify-center my-2 sticky top-1 z-10 select-none">
                    <span className="px-3 py-1 rounded-full bg-[#0b1329]/90 text-slate-300 text-[10px] font-semibold border border-blue-900/60 shadow-md backdrop-blur-md">
                      {formatDateSeparator(msg.createdAt)}
                    </span>
                  </div>
                )}
                <div
                  className={`flex items-center gap-2.5 w-full ${isMe ? "justify-end" : "justify-start"} ${
                    isSelected ? "bg-cyan-500/10 rounded-2xl p-1 -mx-1" : ""
                  }`}
                >
                  {(selectionMode || selectedMessageIds.length > 0) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMessageSelection(msg.id);
                      }}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 select-none ${
                        isSelected
                          ? "bg-gradient-to-tr from-cyan-400 to-blue-600 text-white shadow-lg shadow-cyan-500/40 ring-2 ring-cyan-300 scale-105"
                          : "border-2 border-slate-500 hover:border-cyan-400 bg-[#09112a]"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                  )}
                  <div
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"} group relative max-w-[88%] sm:max-w-[75%]`}
                  >
                  {/* Sender Name or AI Badge */}
                  {isMkAi ? (
                    <div className="flex items-center gap-1.5 mb-1 ml-1 select-none">
                      <div className="w-5 h-5 rounded-full p-[1.5px] bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-500 shadow-[0_0_12px_rgba(51,144,236,0.5)] flex items-center justify-center">
                        <div className="w-full h-full rounded-full bg-[#080d1e] flex items-center justify-center">
                          <Sparkles className="w-2.5 h-2.5 text-cyan-300 animate-pulse" />
                        </div>
                      </div>
                      <span className="text-[11px] font-black bg-gradient-to-r from-cyan-300 via-blue-200 to-indigo-300 bg-clip-text text-transparent">
                        MK.ia
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                        Gemini AI Assistant
                      </span>
                    </div>
                  ) : (
                    !isMe && conversation.type === "group" && (
                      <button
                        onClick={() => {
                          const senderUser = allUsers.find((u) => u.id === msg.senderId);
                          if (senderUser && onSelectUserProfile) {
                            onSelectUserProfile(senderUser);
                          }
                        }}
                        style={{ color: group?.themeColor || "#60a5fa" }}
                        className="text-[10px] font-bold hover:underline mb-0.5 ml-1 text-left flex items-center gap-1"
                      >
                        <span>{msg.senderName}</span>
                        {group && (group.creatorId === msg.senderId || group.adminIds?.includes(msg.senderId)) && (
                          <ShieldCheck className="w-3 h-3 text-cyan-400 inline" />
                        )}
                      </button>
                    )
                  )}

                  {/* Quoted Reply if any */}
                  {msg.replyTo && (
                    <div
                      style={group?.themeColor ? { borderLeftColor: group.themeColor } : undefined}
                      className={`max-w-[80%] text-[11px] p-2 rounded-xl mb-1 border-l-2 bg-[#09112a] text-slate-300 ${
                        isMe ? "border-blue-500" : isMkAi ? "border-cyan-400" : "border-indigo-500"
                      }`}
                    >
                      <p className="font-bold text-[10px] text-blue-400 flex items-center gap-1">
                        {msg.replyTo.type === "story" && <Sparkles className="w-3 h-3 text-cyan-400" />}
                        <span>{msg.replyTo.senderName}</span>
                      </p>
                      <p className="truncate opacity-80">{msg.replyTo.text}</p>
                    </div>
                  )}

                  {/* Floating Heart Particles Animation */}
                  {heartParticles
                    .filter((p) => p.msgId === msg.id)
                    .map((particle) => (
                      <div
                        key={particle.id}
                        style={{
                          transform: `translate(${particle.x}px, ${particle.y}px)`,
                        }}
                        className="absolute top-2 z-40 text-2xl animate-bounce pointer-events-none transition-all duration-1000 opacity-90 scale-125 drop-shadow-[0_0_12px_rgba(59,130,246,0.9)]"
                      >
                        {particle.emoji}
                      </div>
                    ))}

                  {/* Main Bubble */}
                  <div
                    onClick={(e) => {
                      if (selectionMode || selectedMessageIds.length > 0) {
                        e.stopPropagation();
                        toggleMessageSelection(msg.id);
                      }
                    }}
                    onDoubleClick={(e) => handleDoubleClick(msg, e)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenuMsg(msg);
                    }}
                    onTouchStart={(e) => handleTouchStart(e, msg)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchCancel}
                    className={`relative w-full rounded-2xl p-2.5 text-sm shadow-sm transition-all select-none sm:select-text ${
                      isSelected
                        ? "ring-2 ring-[#3390ec]"
                        : ""
                    } ${
                      isMe
                        ? "bg-[#2b5278] text-white rounded-tr-xs"
                        : isMkAi
                        ? "bg-[#17212b] border border-[#3390ec]/40 text-slate-100 rounded-tl-xs"
                        : "bg-[#182533] border border-[#101921]/60 text-slate-100 rounded-tl-xs"
                    }`}
                  >
                  {/* Edited indicator */}
                  {msg.isEdited && (
                    <span className="text-[9px] italic opacity-60 mr-1">(edited)</span>
                  )}

                  {/* Editing inline state */}
                  {editingMsgId === msg.id ? (
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full bg-black/30 border border-white/20 rounded-lg p-1.5 text-xs text-white focus:outline-none"
                      />
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setEditingMsgId(null)}
                          className="px-2 py-0.5 rounded text-[10px] bg-slate-700 hover:bg-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            onEditMessage(msg.id, editingText);
                            setEditingMsgId(null);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] bg-blue-500 hover:bg-blue-400 font-bold"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* TEXT CONTENT */}
                      {msg.type === "text" && <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>}

                      {/* POLL & VOTE CONTENT */}
                      {msg.type === "poll" && msg.poll && (
                        <div className="w-full min-w-[260px] sm:min-w-[320px] p-3 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                          {/* Poll Header */}
                          <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5">
                            <div className="flex items-center gap-2">
                              <div
                                className="p-1.5 rounded-lg text-white shrink-0"
                                style={{ backgroundColor: group?.themeColor || "#3b82f6" }}
                              >
                                <BarChart2 className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-sm text-white leading-snug">{msg.poll.question}</h4>
                                <p className="text-[10px] text-slate-400">
                                  Poll by <span className="font-medium text-slate-300">{msg.poll.creatorName}</span>
                                </p>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                                msg.poll.isClosed
                                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              }`}
                            >
                              {msg.poll.isClosed ? "Closed" : "Live"}
                            </span>
                          </div>

                          {/* Options List */}
                          <div className="space-y-2">
                            {msg.poll.options.map((option) => {
                              const totalVotes = msg.poll!.totalVotes || 0;
                              const optionVotes = option.voterIds?.length || 0;
                              const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                              const hasVoted = option.voterIds?.includes(currentUser.id);

                              return (
                                <button
                                  key={option.id}
                                  disabled={msg.poll!.isClosed}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVotePollOption(msg.id, option.id);
                                  }}
                                  className={`w-full relative overflow-hidden rounded-xl p-2.5 text-left border transition-all ${
                                    hasVoted
                                      ? "border-blue-400 bg-blue-950/40 ring-1 ring-blue-400/50"
                                      : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/25"
                                  } ${msg.poll!.isClosed ? "cursor-default opacity-90" : "cursor-pointer active:scale-[0.99]"}`}
                                >
                                  {/* Background animated percentage fill bar */}
                                  <div
                                    className="absolute left-0 top-0 bottom-0 opacity-30 transition-all duration-500"
                                    style={{
                                      width: `${percentage}%`,
                                      backgroundColor: group?.themeColor || "#3b82f6"
                                    }}
                                  />

                                  <div className="relative flex items-center justify-between z-10 gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div
                                        className={`w-4 h-4 rounded-${
                                          msg.poll!.allowMultipleAnswers ? "md" : "full"
                                        } border flex items-center justify-center shrink-0 transition-colors ${
                                          hasVoted
                                            ? "border-transparent text-white"
                                            : "border-white/40 bg-transparent"
                                        }`}
                                        style={{
                                          backgroundColor: hasVoted ? (group?.themeColor || "#3b82f6") : undefined
                                        }}
                                      >
                                        {hasVoted && <Check className="w-3 h-3 stroke-[3]" />}
                                      </div>
                                      <span className="text-xs font-semibold text-white truncate">{option.text}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 text-right">
                                      <span className="text-[11px] font-bold text-white/90">{percentage}%</span>
                                      <span className="text-[10px] text-slate-400">
                                        ({optionVotes})
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Footer Info & Admin/Members Stats Toggle */}
                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
                            <span>
                              {msg.poll.totalVotes} voter{msg.poll.totalVotes !== 1 ? "s" : ""} •{" "}
                              {msg.poll.allowMultipleAnswers ? "Multiple votes" : "Single choice"}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePollMsg(msg);
                              }}
                              className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline"
                            >
                              <BarChart2 className="w-3.5 h-3.5" />
                              <span>{isGroupAdmin ? "Admin Details & Stats" : "View Numbers"}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* IMAGE CONTENT */}
                      {msg.type === "image" && msg.mediaUrl && (
                        <div
                          onClick={() => {
                            handleResetPhotoView();
                            setViewingPhoto({
                              url: msg.mediaUrl!,
                              caption: msg.text,
                              senderName: msg.senderName || (isMe ? currentUser.name : (otherUser?.name || "Photo")),
                              timestamp: msg.timestamp
                            });
                          }}
                          className="rounded-2xl overflow-hidden my-1 bg-black/30 relative group/img cursor-pointer transition-all hover:ring-2 hover:ring-cyan-400/50 shadow-md"
                          title="Click to view full screen and save photo to gallery"
                        >
                          <img
                            src={msg.mediaUrl}
                            alt="Attached"
                            className="max-h-72 object-cover w-full group-hover/img:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
                            <div className="flex justify-end">
                              <span className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white shadow-md">
                                <Maximize2 className="w-4 h-4 text-cyan-400" />
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-slate-100 text-xs font-bold flex items-center gap-1.5 shadow-lg border border-white/10">
                                <Download className="w-3.5 h-3.5 text-cyan-400" /> Save / Full Screen
                              </span>
                            </div>
                          </div>
                          {msg.text && <p className="mt-1 text-xs px-2 py-1">{msg.text}</p>}
                        </div>
                      )}

                      {/* VIDEO CONTENT */}
                      {msg.type === "video" && msg.mediaUrl && (
                        <div className="rounded-xl overflow-hidden my-1 bg-black/30">
                          <video src={msg.mediaUrl} controls className="max-h-64 w-full" />
                        </div>
                      )}

                      {/* VOICE NOTE CONTENT */}
                      {msg.type === "voice" && (
                        <div className="flex items-center gap-3 p-1 min-w-[200px]">
                          <button
                            onClick={() => handleTogglePlayAudio(msg)}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition-all shadow-md active:scale-95"
                          >
                            {activeAudioId === msg.id ? (
                              <Pause className="w-5 h-5 fill-white" />
                            ) : (
                              <Play className="w-5 h-5 fill-white ml-0.5" />
                            )}
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center gap-1 mb-1.5 h-3">
                              {[10, 24, 16, 32, 20, 12, 28, 18, 30, 14, 22].map((height, idx) => (
                                <span
                                  key={idx}
                                  style={{ height: `${height}px` }}
                                  className={`w-1 rounded-full transition-all duration-300 ${
                                    activeAudioId === msg.id && (idx / 11) * 100 <= audioProgress
                                      ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                                      : "bg-white/30"
                                  }`}
                                />
                              ))}
                            </div>
                            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                              <div
                                style={{
                                  width: `${activeAudioId === msg.id ? audioProgress : 0}%`
                                }}
                                className="h-full bg-white transition-all duration-100"
                              />
                            </div>
                            <div className="flex items-center justify-between mt-1 text-[10px] opacity-90 font-mono">
                              <span>0:0{msg.duration || 3}</span>
                              <span className="flex items-center gap-0.5 text-cyan-300 font-semibold font-sans">
                                <Sparkles className="w-2.5 h-2.5" /> HD Audio
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* GIF CONTENT */}
                      {msg.type === "gif" && msg.mediaUrl && (
                        <div
                          onClick={() => {
                            handleResetPhotoView();
                            setViewingPhoto({
                              url: msg.mediaUrl!,
                              caption: msg.text || "Animated GIF",
                              senderName: msg.senderName || (isMe ? currentUser.name : (otherUser?.name || "GIF")),
                              timestamp: msg.timestamp
                            });
                          }}
                          className="rounded-xl overflow-hidden my-1 bg-black/20 relative group/gif cursor-pointer hover:ring-2 hover:ring-cyan-400/40"
                          title="Click to enlarge and save GIF"
                        >
                          <img src={msg.mediaUrl} alt="GIF" className="max-h-56 w-full object-cover group-hover/gif:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/gif:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="p-1.5 px-3 rounded-full bg-black/75 text-white backdrop-blur-md text-xs font-bold flex items-center gap-1 shadow-lg border border-white/10">
                              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Enlarge / Save</span>
                            </span>
                          </div>
                        </div>
                      )}

                      {/* STICKER CONTENT (Animated Feathers & Stickers) */}
                      {msg.type === "sticker" && msg.mediaUrl && (
                        <div
                          onClick={() => {
                            handleResetPhotoView();
                            setViewingPhoto({
                              url: msg.mediaUrl!,
                              caption: msg.text || "Animated Sticker",
                              senderName: msg.senderName || (isMe ? currentUser.name : (otherUser?.name || "Sticker")),
                              timestamp: msg.timestamp
                            });
                          }}
                          className="my-1.5 flex flex-col items-center group/stk relative py-1 cursor-pointer"
                          title="Click to view and save sticker to gallery"
                        >
                          {(() => {
                            const titleLower = (msg.text || "").toLowerCase();
                            const isFeather = titleLower.includes("plume") || titleLower.includes("feather");
                            const isGold = titleLower.includes("or") || titleLower.includes("gold") || titleLower.includes("royal");
                            const isCyber = titleLower.includes("cyber") || titleLower.includes("glow") || titleLower.includes("neon");
                            const isHeart = titleLower.includes("cœur") || titleLower.includes("heart") || titleLower.includes("love");
                            const isBounce = titleLower.includes("bounce") || titleLower.includes("jump");

                            let animClass = isFeather
                              ? "animate-feather-float"
                              : isGold
                              ? "animate-sticker-gold"
                              : isCyber
                              ? "animate-sticker-glow"
                              : isHeart
                              ? "animate-sticker-pulse"
                              : isBounce
                              ? "animate-sticker-bounce"
                              : "animate-feather-float";

                            return (
                              <div className="relative rounded-3xl p-3 bg-gradient-to-b from-white/10 via-black/20 to-black/40 backdrop-blur-md border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.5)] group-hover/stk:scale-105 transition-all">
                                <div className={animClass}>
                                  <img
                                    src={msg.mediaUrl}
                                    alt={msg.text || "Sticker"}
                                    className="w-40 h-40 sm:w-48 sm:h-48 object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)] transition-transform duration-300"
                                    loading="lazy"
                                  />
                                </div>
                                {isFeather && (
                                  <span className="absolute -top-2 -right-2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-[#030612] text-[10px] font-black shadow-lg flex items-center gap-1 border border-white/80 ring-2 ring-cyan-400/40">
                                    <Feather className="w-3 h-3 text-[#030612]" /> Animated Feather
                                  </span>
                                )}
                                {!isFeather && isGold && (
                                  <span className="absolute -top-2 -right-2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 text-black text-[10px] font-black shadow-lg flex items-center gap-1 border border-white/80 ring-2 ring-amber-400/40">
                                    <Sparkles className="w-3 h-3 text-black" /> Royal Gold
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                          {msg.text && (
                            <span className="mt-2 text-[11px] font-bold text-slate-200 px-3 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 shadow-sm group-hover/stk:border-cyan-400/50">
                              {msg.text}
                            </span>
                          )}
                        </div>
                      )}

                      {/* FILE / DOCUMENT CONTENT */}
                      {msg.type === "file" && (
                        <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/30 border border-white/10 text-xs my-1 shadow-inner">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300 shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold truncate text-white">{msg.mediaName || "Document"}</p>
                              <span className="text-[10px] opacity-75 font-medium">{msg.mediaSize || "Attachment"}</span>
                            </div>
                          </div>
                          {msg.mediaUrl ? (
                            <a
                              href={msg.mediaUrl}
                              download={msg.mediaName || "document.pdf"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg flex items-center gap-1 font-bold text-[11px] shadow-md shadow-blue-500/20 transition-all shrink-0 active:scale-95 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-amber-400 font-semibold">No URL</span>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Reaction Badges */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(msg.reactions).map(([emoji, users]) => {
                        const usersList = (users as string[]) || [];
                        return (
                          <button
                            key={emoji}
                            onClick={() => onReactMessage(msg.id, emoji)}
                            className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 border transition-all ${
                              usersList.includes(currentUser.id)
                                ? "bg-blue-500/20 border-blue-400 text-blue-200"
                                : "bg-[#050a1b] border-blue-900/60 text-slate-300"
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="text-[10px] font-bold">{usersList.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Double tap Heart Overlay */}
                  {hasLiked && (
                    <div className="absolute -bottom-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-lg ring-2 ring-[#09112a] animate-bounce">
                      <Heart className="w-3 h-3 fill-current" />
                    </div>
                  )}

                  {/* Timestamp & Status */}
                  <div className="flex items-center justify-end gap-1 text-[10px] opacity-70 mt-1">
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                    {isMe && <CheckCheck className="w-3 h-3 text-blue-200" />}
                  </div>
                </div>

                {/* Message Hover Actions Toolbar (Desktop hover only) */}
                <div
                  className={`absolute top-0 ${
                    isMe ? "right-full mr-2" : "left-full ml-2"
                  } hidden md:group-hover:flex items-center gap-1 bg-[#09112a] border border-blue-900/50 rounded-2xl p-1 shadow-xl z-20`}
                >
                  <button
                    onClick={() => setContextMenuMsg(msg)}
                    title="More Options & Reactions"
                    className="p-1.5 hover:bg-blue-900/40 rounded-xl text-slate-300 hover:text-blue-400 text-xs"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                    title="React with Emoji"
                    className="p-1.5 hover:bg-blue-900/40 rounded-xl text-slate-300 hover:text-blue-400 text-xs"
                  >
                    <Smile className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() =>
                      setReplyTo({
                        id: msg.id,
                        senderName: msg.senderName,
                        text: msg.text || "Media message",
                        type: msg.type
                      })
                    }
                    title="Reply"
                    className="p-1.5 hover:bg-blue-900/40 rounded-xl text-slate-300 hover:text-blue-400"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setForwardMsg(msg);
                    }}
                    title="Forward Message"
                    className="p-1.5 hover:bg-blue-900/40 rounded-xl text-slate-300 hover:text-blue-400"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (msg.text) {
                        navigator.clipboard.writeText(msg.text);
                        setCopiedToast(true);
                        setTimeout(() => setCopiedToast(false), 2000);
                      }
                    }}
                    title="Copy Text"
                    className="p-1.5 hover:bg-blue-900/40 rounded-xl text-slate-300 hover:text-blue-400"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {isMe && (
                    <button
                      onClick={() => {
                        setEditingMsgId(msg.id);
                        setEditingText(msg.text);
                      }}
                      title="Edit"
                      className="p-1.5 hover:bg-blue-900/40 rounded-xl text-slate-300 hover:text-blue-400"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteMessage(msg.id, canDeleteForAll ? "for_all" : "for_me")}
                    title={canDeleteForAll ? "Delete for everyone" : "Delete for me"}
                    className="p-1.5 hover:bg-blue-900/40 rounded-xl text-rose-400 hover:text-rose-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 20+ Emojis reaction popup */}
                {showEmojiPicker === msg.id && (
                  <div
                    className={`absolute bottom-full mb-2 ${
                      isMe ? "right-0" : "left-0"
                    } z-30 bg-[#09112a] border border-blue-900/60 rounded-2xl p-2 shadow-2xl grid grid-cols-8 gap-1.5 max-w-[280px] animate-in zoom-in-95`}
                  >
                    {EMOJI_LIST.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          onReactMessage(msg.id, emoji);
                          setShowEmojiPicker(null);
                        }}
                        className="text-lg hover:scale-125 transition-transform p-1 rounded-lg hover:bg-blue-900/40 flex items-center justify-center"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
                </div>
              </div>
            </React.Fragment>
          );
        })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Smart Scroll-To-Bottom Button */}
      {isScrolledUp && (
        <div className="absolute bottom-20 right-6 z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            type="button"
            onClick={() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              setIsScrolledUp(false);
              setUnreadBelowCount(0);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#09112a]/95 hover:bg-blue-600 border border-blue-500/50 hover:border-cyan-400 text-slate-100 shadow-[0_8px_25px_rgba(37,99,235,0.4)] text-xs font-bold transition-all duration-200 backdrop-blur-xl group hover:scale-105 active:scale-95"
          >
            <ChevronDown className="w-4 h-4 text-cyan-400 group-hover:text-white group-hover:translate-y-0.5 transition-all" />
            <span>Scroll down</span>
            {unreadBelowCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-cyan-400 text-[#030612] text-[10px] font-black animate-pulse">
                +{unreadBelowCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Reply Preview Bar */}
      {replyTo && (
        <div className="px-4 py-2 bg-[#09112a] border-t border-blue-950/70 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2 border-l-2 border-blue-500 pl-2">
            <CornerUpLeft className="w-4 h-4 text-blue-400" />
            <div>
              <p className="font-bold text-blue-400 text-[11px]">{replyTo.senderName}</p>
              <p className="truncate text-slate-400 text-[10px] max-w-xs">{replyTo.text}</p>
            </div>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="p-1 text-slate-400 hover:text-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Bar or Restricted/Blocked Notice */}
      {isRestrictedInGroup ? (
        <div className="p-3.5 bg-rose-950/40 border-t border-rose-900/40 flex items-center justify-center gap-2 text-rose-300 text-xs font-semibold">
          <VolumeX className="w-4 h-4 text-rose-400 shrink-0" />
          <span>You have been restricted to read-only mode by group administrators.</span>
        </div>
      ) : isAnnouncementOnly ? (
        <div className="p-3.5 bg-amber-950/40 border-t border-amber-900/40 flex items-center justify-center gap-2 text-amber-300 text-xs font-semibold">
          <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Broadcast Channel: Only group admins can send messages.</span>
        </div>
      ) : isOtherUserBlocked ? (
        <div className="p-3 sm:p-3.5 bg-[#09112a] border-t border-amber-900/50 flex items-center justify-between px-4 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <UserX className="w-4 h-4 text-amber-400 shrink-0" />
            <span>You have blocked this contact. Unblock to send messages.</span>
          </div>
          {onBlockUser && otherUserId && (
            <button
              onClick={() => onBlockUser(otherUserId)}
              className="px-3.5 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-xl text-xs font-bold border border-blue-500/30 transition-colors cursor-pointer shrink-0"
            >
              Unblock User
            </button>
          )}
        </div>
      ) : isMeBlockedByOther ? (
        <div className="p-3.5 bg-[#09112a] border-t border-rose-950/70 flex items-center justify-center gap-2 text-rose-300/90 text-xs font-medium">
          <Lock className="w-4 h-4 text-rose-400 shrink-0" />
          <span>You cannot send messages to this contact because they have blocked you.</span>
        </div>
      ) : (
        <div className="shrink-0 z-20 sticky bottom-0 p-2 sm:p-2.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] bg-[#17212b] border-t border-[#101921] shadow-lg relative w-full">
          {/* Circular Attachment Grid Menu */}
          {showPlusMenu && (
            <div className="absolute bottom-full right-4 sm:right-14 mb-2 w-[280px] sm:w-[300px] bg-[#17212b] border border-[#101921] rounded-2xl p-3 shadow-2xl text-slate-200 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="text-[11px] font-bold text-[#7d8b99] uppercase tracking-wider mb-2 px-1 flex items-center justify-between">
                <span>Attach</span>
                <button
                  onClick={() => setShowPlusMenu(false)}
                  className="p-1 rounded-full text-[#7d8b99] hover:text-white hover:bg-[#202b36]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                {/* 1. Document */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPlusMenu(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex flex-col items-center gap-1.5 p-1 rounded-xl hover:bg-[#202b36] transition-all group active:scale-95 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-[#3390ec] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-[#7d8b99] font-medium truncate w-full">Document</span>
                </button>

                {/* 2. Camera */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPlusMenu(false);
                    cameraInputRef.current?.click();
                  }}
                  className="flex flex-col items-center gap-1.5 p-1 rounded-xl hover:bg-[#202b36] transition-all group active:scale-95 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-[#e53935] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                    <Camera className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-[#7d8b99] font-medium truncate w-full">Camera</span>
                </button>

                {/* 3. Gallery */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPlusMenu(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex flex-col items-center gap-1.5 p-1 rounded-xl hover:bg-[#202b36] transition-all group active:scale-95 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-[#0088cc] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-[#7d8b99] font-medium truncate w-full">Gallery</span>
                </button>

                {/* 4. Photo Studio */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPlusMenu(false);
                    setShowChatPhotoEditor(true);
                  }}
                  className="flex flex-col items-center gap-1.5 p-1 rounded-xl hover:bg-[#202b36] transition-all group active:scale-95 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-[#43a047] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                    <Paintbrush className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-[#7d8b99] font-medium truncate w-full">Draw</span>
                </button>

                {/* 5. Poll (Group Chats & Admins Only) */}
                {conversation.type === "group" && isGroupAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowPlusMenu(false);
                      setShowCreatePollModal(true);
                    }}
                    className="flex flex-col items-center gap-1.5 p-1 rounded-xl hover:bg-[#202b36] transition-all group active:scale-95 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#fb8c00] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                      <BarChart2 className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] text-[#7d8b99] font-medium truncate w-full">Poll</span>
                  </button>
                )}

                {/* 6. Sticker Maker */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPlusMenu(false);
                    setGifStickerTab("maker");
                    setShowGifStickerModal(true);
                  }}
                  className="flex flex-col items-center gap-1.5 p-1 rounded-xl hover:bg-[#202b36] transition-all group active:scale-95 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-[#fbc02d] flex items-center justify-center text-black shadow-md group-hover:scale-105 transition-transform">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-[#7d8b99] font-medium truncate w-full">Stickers</span>
                </button>

                {/* 7. Stickers */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPlusMenu(false);
                    setGifStickerTab("stickers");
                    setShowGifStickerModal(true);
                  }}
                  className="flex flex-col items-center gap-1.5 p-1 rounded-xl hover:bg-[#202b36] transition-all group active:scale-95 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-[#8e24aa] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                    <Feather className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-[#7d8b99] font-medium truncate w-full">Emoji</span>
                </button>

                {/* 8. GIFs */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPlusMenu(false);
                    setGifStickerTab("gifs");
                    setShowGifStickerModal(true);
                  }}
                  className="flex flex-col items-center gap-1.5 p-1 rounded-xl hover:bg-[#202b36] transition-all group active:scale-95 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-[#00acc1] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-[#7d8b99] font-medium truncate w-full">GIFs</span>
                </button>
              </div>
            </div>
          )}

          {/* Hidden File Inputs */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <input
            type="file"
            ref={cameraInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Active Reply Banner */}
          {replyTo && (
            <div className="max-w-4xl mx-auto mb-2 px-3 py-1.5 rounded-xl bg-[#0e1621] border border-[#101921] flex items-center justify-between text-xs text-[#7d8b99] animate-in fade-in slide-in-from-bottom-1">
              <div className="flex items-center gap-2 overflow-hidden">
                <CornerUpLeft className="w-4 h-4 text-[#3390ec] shrink-0" />
                <div className="truncate">
                  <span className="text-[#3390ec] font-bold mr-1.5">Reply to {replyTo.senderName}:</span>
                  <span className="text-white">{replyTo.text}</span>
                </div>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="p-1 text-[#7d8b99] hover:text-white hover:bg-[#202b36] rounded-full transition-colors shrink-0 ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* @ Mention Suggestions Popup (MK.ia AI + Members) */}
          {mentionQuery !== null && mentionCandidates.length > 0 && (
            <div className="max-w-4xl mx-auto mb-2 bg-[#09112a]/95 border border-cyan-500/40 rounded-2xl p-2 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 z-30">
              <div className="flex items-center justify-between px-2.5 py-1 mb-1 border-b border-blue-950/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Mention in Chat</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  Use ↑ ↓ to navigate, Enter or Tab to select
                </span>
              </div>
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {mentionCandidates.map((candidate, idx) => {
                  const isHighlighted = idx === selectedMentionIdx;
                  return (
                    <button
                      key={candidate.user.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectMention(candidate);
                      }}
                      onMouseEnter={() => setSelectedMentionIdx(idx)}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-all cursor-pointer ${
                        isHighlighted
                          ? "bg-cyan-950/70 border border-cyan-500/50 shadow-md"
                          : "hover:bg-[#0c1636] border border-transparent"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={candidate.user.avatar}
                          alt={candidate.user.username}
                          className={`w-8 h-8 rounded-full object-cover bg-slate-800 ${
                            candidate.isAi
                              ? "ring-2 ring-cyan-400 shadow-sm shadow-cyan-400/50"
                              : "ring-1 ring-white/10"
                          }`}
                        />
                        {candidate.isAi && (
                          <div className="absolute -bottom-1 -right-1 p-0.5 bg-cyan-500 text-[#02040a] rounded-full">
                            <Zap className="w-2.5 h-2.5 fill-current" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-xs ${candidate.isAi ? "text-cyan-300" : "text-slate-200"}`}>
                            @{candidate.user.username}
                          </span>
                          {candidate.isAi ? (
                            <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-gradient-to-r from-cyan-500 to-blue-500 text-black rounded-md">
                              AI GEMINI
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Member</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {candidate.description || candidate.user.bio || `@${candidate.user.username}`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* RECORDING MODE BANNER */}
          {isRecording ? (
            <div className="max-w-4xl mx-auto w-full bg-[#0e1621] border border-rose-500/40 rounded-full px-4 py-2 flex items-center justify-between text-rose-300 text-xs shadow-2xl backdrop-blur-lg">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                <span className="font-bold tracking-wide">Recording voice note... 0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelRecording}
                  title="Cancel recording"
                  className="p-2 rounded-full text-[#7d8b99] hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-4 py-1.5 bg-[#3390ec] hover:bg-[#2481cc] text-white font-bold rounded-full shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full flex items-end gap-2">
              
              {/* CAPSULE CONTAINER */}
              <div className="flex-1 min-w-0 flex items-end bg-[#0e1621] border border-[#101921] focus-within:border-[#3390ec] rounded-[22px] px-2 py-1 transition-all">
                
                {/* Left: Emoji / Sticker Picker Button */}
                <button
                  type="button"
                  onClick={() => {
                    setGifStickerTab("stickers");
                    setShowGifStickerModal(true);
                  }}
                  title="Emojis & Stickers"
                  className="w-9 h-9 rounded-full text-[#7d8b99] hover:text-[#3390ec] hover:bg-[#202b36] flex items-center justify-center shrink-0 mb-0.5 transition-colors cursor-pointer"
                >
                  <Smile className="w-5 h-5" />
                </button>

                {/* Middle: Auto-expanding Textarea */}
                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder="Message (type @ for MK.ia & members)"
                  value={inputText}
                  onFocus={() => {
                    setTimeout(() => {
                      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                    }, 120);
                  }}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  style={{ minHeight: "26px", maxHeight: "120px" }}
                  className="flex-1 min-w-0 bg-transparent text-white placeholder-[#7d8b99] text-sm focus:outline-none resize-none px-2 py-1.5 leading-relaxed overflow-y-auto scrollbar-thin scrollbar-thumb-[#242f3d] self-center"
                />

                {/* Right inside capsule: Paperclip Attachment Button */}
                <button
                  type="button"
                  onClick={() => setShowPlusMenu((prev) => !prev)}
                  title="Attach files"
                  className={`w-9 h-9 rounded-full text-[#7d8b99] hover:text-white hover:bg-[#202b36] flex items-center justify-center shrink-0 mb-0.5 transition-all cursor-pointer ${
                    showPlusMenu ? "text-[#3390ec] bg-[#202b36] rotate-45" : ""
                  }`}
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                {/* Right inside capsule: Camera Button */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  title="Camera"
                  className="w-9 h-9 rounded-full text-[#7d8b99] hover:text-white hover:bg-[#202b36] flex items-center justify-center shrink-0 mb-0.5 transition-colors cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              {/* Right: Standalone Action Button */}
              {inputText.trim() ? (
                <button
                  type="button"
                  onClick={handleSend}
                  title="Send Message"
                  className="w-10 h-10 rounded-full bg-[#3390ec] hover:bg-[#2481cc] text-white flex items-center justify-center shrink-0 shadow-md transition-transform active:scale-90 cursor-pointer mb-0.5"
                >
                  <Send className="w-5 h-5 ml-0.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  title="Record Voice Note"
                  className="w-10 h-10 rounded-full bg-[#3390ec] hover:bg-[#2481cc] text-white flex items-center justify-center shrink-0 shadow-md transition-transform active:scale-90 cursor-pointer mb-0.5"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}

            </div>
          )}

        </div>
      )}

      {/* Rich GIFs & Stickers Modal (with Feather / Plumes Themes) */}
      <GifStickerModal
        isOpen={showGifStickerModal}
        onClose={() => setShowGifStickerModal(false)}
        onSendGif={handleSendGif}
        onSendSticker={handleSendSticker}
        initialTab={gifStickerTab}
      />

      {/* Admin Create Poll Modal */}
      {showCreatePollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030612]/85 backdrop-blur-md p-4">
          <div className="bg-[#09112a] border border-cyan-500/40 rounded-3xl p-6 w-full max-w-md text-slate-100 shadow-[0_0_50px_rgba(6,182,212,0.25)] space-y-4">
            <div className="flex items-center justify-between border-b border-blue-950 pb-3">
              <div className="flex items-center gap-2">
                <div
                  className="p-2 rounded-xl text-white shadow-md"
                  style={{ backgroundColor: group?.themeColor || "#06b6d4" }}
                >
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">Create Group Poll</h3>
                  <p className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Admin Exclusive Feature
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreatePollModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Question input */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1.5">Poll Question</label>
              <input
                type="text"
                placeholder="e.g. When should we schedule our team meetup?"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                className="w-full bg-[#050a1b] border border-blue-900/60 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Options list */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                Options (Min 2, Max 6)
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {pollOptions.map((opt, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Option ${index + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...pollOptions];
                        newOpts[index] = e.target.value;
                        setPollOptions(newOpts);
                      }}
                      className="flex-1 bg-[#050a1b] border border-blue-900/50 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        onClick={() => {
                          setPollOptions(pollOptions.filter((_, i) => i !== index));
                        }}
                        className="p-2 text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {pollOptions.length < 6 && (
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, ""])}
                  className="mt-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-cyan-950/30 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Option</span>
                </button>
              )}
            </div>

            {/* Poll Configuration */}
            <div className="pt-2 border-t border-blue-950 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Multiple Answers</span>
                <span className="text-[10px] text-slate-400">Allow members to select more than one choice</span>
              </div>
              <input
                type="checkbox"
                checked={pollAllowMultiple}
                onChange={(e) => setPollAllowMultiple(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-[#050a1b] border-blue-900 cursor-pointer"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                disabled={!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2}
                onClick={handleCreatePoll}
                style={
                  group?.themeColor
                    ? {
                        background: `linear-gradient(135deg, ${group.themeColor}, #0284c7)`
                      }
                    : undefined
                }
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 disabled:opacity-40 transition-all active:scale-95"
              >
                Launch Poll & Vote
              </button>
              <button
                onClick={() => setShowCreatePollModal(false)}
                className="px-4 py-2.5 rounded-xl bg-[#050a1b] hover:bg-[#0c1636] text-slate-300 font-semibold text-xs border border-blue-950 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Poll Statistics & Voter Breakdown Modal (Admins see detailed names/avatars; members see aggregated numbers) */}
      {activePollMsg && activePollMsg.poll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030612]/85 backdrop-blur-md p-4">
          <div className="bg-[#09112a] border border-blue-500/30 rounded-3xl p-6 w-full max-w-lg text-slate-100 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-blue-950 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="p-2.5 rounded-2xl text-white shadow-lg shrink-0"
                  style={{ backgroundColor: group?.themeColor || "#3b82f6" }}
                >
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white leading-snug">{activePollMsg.poll.question}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-400">
                      {activePollMsg.poll.totalVotes} total voter{activePollMsg.poll.totalVotes !== 1 ? "s" : ""}
                    </span>
                    <span className="text-[10px] text-slate-500">•</span>
                    <span
                      className={`px-2 py-0.2 text-[9px] font-bold rounded-full border ${
                        activePollMsg.poll.isClosed
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      }`}
                    >
                      {activePollMsg.poll.isClosed ? "Closed" : "Live Poll"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActivePollMsg(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Member vs Admin Banner */}
            {isGroupAdmin ? (
              <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 flex items-center gap-2 text-cyan-300 text-[11px] shrink-0">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  <strong>Admin View:</strong> You have full visibility into voter identities, timestamps, and individual option selections.
                </span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 flex items-center gap-2 text-blue-300 text-[11px] shrink-0">
                <Lock className="w-4 h-4 text-blue-400 shrink-0" />
                <span>
                  <strong>Confidential Poll:</strong> Only numerical statistics are displayed. Voter identities are private to group administrators.
                </span>
              </div>
            )}

            {/* Options Breakdown List */}
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {activePollMsg.poll.options.map((option) => {
                const totalVotes = activePollMsg.poll!.totalVotes || 0;
                const optionVotes = option.voterIds?.length || 0;
                const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;

                return (
                  <div key={option.id} className="p-3.5 rounded-2xl bg-[#050a1b] border border-blue-950 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">{option.text}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-cyan-400 font-bold">{percentage}%</span>
                        <span className="text-slate-400 text-[11px]">
                          ({optionVotes} vote{optionVotes !== 1 ? "s" : ""})
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: group?.themeColor || "#06b6d4"
                        }}
                      />
                    </div>

                    {/* Admin detailed voters list */}
                    {isGroupAdmin && option.voterIds && option.voterIds.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-blue-950/70 space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Voters ({option.voterIds.length}):
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {option.voterIds.map((voterId) => {
                            const voterUser = allUsers.find((u) => u.id === voterId);
                            const isVoterCreator = group?.creatorId === voterId;
                            const isVoterAdmin = group?.adminIds?.includes(voterId);

                            return (
                              <div
                                key={voterId}
                                className="flex items-center gap-2 p-1.5 rounded-xl bg-blue-950/30 border border-blue-900/40 text-xs"
                              >
                                <img
                                  src={
                                    voterUser?.avatar ||
                                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${voterId}`
                                  }
                                  alt={voterUser?.username || "Voter"}
                                  className="w-6 h-6 rounded-full object-cover bg-slate-800 shrink-0 ring-1 ring-white/10"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1">
                                    <span className="font-semibold text-slate-200 truncate text-[11px]">
                                      {voterUser?.username || "User " + voterId.slice(0, 5)}
                                    </span>
                                    {isVoterCreator ? (
                                      <span title="Group Creator">
                                        <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                                      </span>
                                    ) : isVoterAdmin ? (
                                      <span title="Group Admin">
                                        <ShieldCheck className="w-3 h-3 text-cyan-400 shrink-0" />
                                      </span>
                                    ) : null}
                                  </div>
                                  <span className="text-[9px] text-slate-500 truncate block">
                                    {voterUser?.email || "Participant"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer Admin Actions */}
            <div className="pt-2 border-t border-blue-950 flex items-center justify-between shrink-0">
              {isGroupAdmin && !activePollMsg.poll.isClosed ? (
                <button
                  onClick={() => handleClosePoll(activePollMsg.id)}
                  className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-bold text-xs border border-rose-500/30 transition-colors flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Close Poll Now</span>
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => setActivePollMsg(null)}
                className="px-4 py-2 rounded-xl bg-[#050a1b] hover:bg-[#0c1636] text-slate-200 font-semibold text-xs border border-blue-950 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Long Click / Context Menu Overlay Modal */}
      {contextMenuMsg && (
        <div
          onClick={() => setContextMenuMsg(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#030612]/80 backdrop-blur-md p-4 select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#09112a] border border-blue-500/30 rounded-3xl p-5 text-slate-100 shadow-[0_0_50px_rgba(37,99,235,0.25)] flex flex-col gap-4 animate-in zoom-in-95"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-blue-950 pb-2">
              <span className="text-xs font-bold text-blue-400">Message Options</span>
              <button
                onClick={() => setContextMenuMsg(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick 24 Emoji Reactions Bar */}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 mb-2">Reactions (24+ Emojis)</p>
              <div className="grid grid-cols-6 gap-2 bg-[#050a1b] p-3 rounded-2xl border border-blue-950 max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-900/40">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReactMessage(contextMenuMsg.id, emoji);
                      setContextMenuMsg(null);
                    }}
                    className="text-xl p-1.5 rounded-xl hover:bg-blue-900/40 hover:scale-125 transition-all flex items-center justify-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Action Items */}
            <div className="space-y-1 text-xs">
              <button
                onClick={() => {
                  setSelectionMode(true);
                  if (!selectedMessageIds.includes(contextMenuMsg.id)) {
                    setSelectedMessageIds((prev) => [...prev, contextMenuMsg.id]);
                  }
                  setContextMenuMsg(null);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-900/30 text-cyan-300 transition-colors"
              >
                <CheckSquare className="w-4 h-4 text-cyan-400" />
                <span>Select message</span>
              </button>

              <button
                onClick={() => {
                  setReplyTo({
                    id: contextMenuMsg.id,
                    senderName: contextMenuMsg.senderName,
                    text: contextMenuMsg.text || "Media message",
                    type: contextMenuMsg.type
                  });
                  setContextMenuMsg(null);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-900/30 text-slate-200 transition-colors"
              >
                <CornerUpLeft className="w-4 h-4 text-blue-400" />
                <span>Reply to message</span>
              </button>

              <button
                onClick={() => {
                  if (contextMenuMsg.text) {
                    navigator.clipboard.writeText(contextMenuMsg.text);
                    setCopiedToastText("Copied to clipboard! ✓");
                    setCopiedToast(true);
                    setTimeout(() => setCopiedToast(false), 2000);
                  }
                  setContextMenuMsg(null);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-900/30 text-slate-200 transition-colors"
              >
                <Copy className="w-4 h-4 text-indigo-400" />
                <span>Copy text</span>
              </button>

              <button
                onClick={() => {
                  setForwardMsg(contextMenuMsg);
                  setContextMenuMsg(null);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-900/30 text-slate-200 transition-colors"
              >
                <Share2 className="w-4 h-4 text-cyan-400" />
                <span>Forward message</span>
              </button>

              {contextMenuMsg.senderId === currentUser.id && (
                <button
                  onClick={() => {
                    setEditingMsgId(contextMenuMsg.id);
                    setEditingText(contextMenuMsg.text);
                    setContextMenuMsg(null);
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-900/30 text-slate-200 transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-amber-400" />
                  <span>Edit message</span>
                </button>
              )}

              <button
                onClick={() => {
                  onDeleteMessage(contextMenuMsg.id, "for_me");
                  setContextMenuMsg(null);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-900/30 text-rose-300 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Delete for me</span>
              </button>

              {(contextMenuMsg.senderId === currentUser.id ||
                (conversation.type === "group" &&
                  (group?.adminIds.includes(currentUser.id) || group?.creatorId === currentUser.id))) && (
                <button
                  onClick={() => {
                    onDeleteMessage(contextMenuMsg.id, "for_all");
                    setContextMenuMsg(null);
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-rose-950/40 text-rose-400 font-bold transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>Delete for everyone</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Copy Toast Alert */}
      {copiedToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-xl border border-emerald-400 animate-in fade-in slide-in-from-top-4">
          {copiedToastText}
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030612]/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-[#09112a] border border-rose-500/40 rounded-3xl p-6 w-full max-w-sm text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400 font-extrabold text-base">
              <Trash2 className="w-5 h-5 shrink-0" />
              <span>Delete {selectedMessageIds.length} Message(s)?</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Choose how you would like to delete the selected messages:
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  if (onBatchDeleteMessages) {
                    onBatchDeleteMessages(selectedMessageIds, "for_me");
                  } else {
                    selectedMessageIds.forEach((id) => onDeleteMessage(id, "for_me"));
                  }
                  setShowBatchDeleteModal(false);
                  clearSelection();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0c1636] hover:bg-blue-900/40 border border-blue-900/50 text-slate-200 font-bold text-xs flex items-center justify-between transition-colors"
              >
                <span>Delete for me only</span>
                <span className="text-[10px] text-slate-400">This device</span>
              </button>

              {(isGroupAdmin || selectedMessages.every((m) => m.senderId === currentUser.id)) && (
                <button
                  onClick={() => {
                    if (onBatchDeleteMessages) {
                      onBatchDeleteMessages(selectedMessageIds, "for_all");
                    } else {
                      selectedMessageIds.forEach((id) => onDeleteMessage(id, "for_all"));
                    }
                    setShowBatchDeleteModal(false);
                    clearSelection();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-between shadow-lg shadow-rose-600/30 transition-colors"
                >
                  <span>Delete for everyone</span>
                  <span className="text-[10px] text-rose-200">All members</span>
                </button>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowBatchDeleteModal(false)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Forward Modal */}
      {forwardBatchMessages.length > 0 && (
        <ForwardModal
          messages={forwardBatchMessages}
          conversations={allConversations}
          groups={allGroups}
          allUsers={allUsers}
          currentUser={currentUser}
          onClose={() => {
            setForwardBatchMessages([]);
            clearSelection();
          }}
          onForwardToConversation={(targetConvId, text, mediaUrl, type) => {
            if (onForwardMessage) {
              onForwardMessage(targetConvId, text, mediaUrl, type);
            }
          }}
          onBatchForwardToConversation={(targetConvId, messageIds) => {
            if (onBatchForwardMessages) {
              onBatchForwardMessages(targetConvId, messageIds);
            } else if (onForwardMessage) {
              forwardBatchMessages.forEach((m) => {
                onForwardMessage(targetConvId, m.text || "", m.mediaUrl, m.type);
              });
            }
            setForwardBatchMessages([]);
            clearSelection();
          }}
        />
      )}

      {/* Single Forward Modal */}
      {forwardMsg && (
        <ForwardModal
          message={forwardMsg}
          conversations={allConversations}
          groups={allGroups}
          allUsers={allUsers}
          currentUser={currentUser}
          onClose={() => setForwardMsg(null)}
          onForwardToConversation={(targetConvId, text, mediaUrl, type) => {
            if (onForwardMessage) {
              onForwardMessage(targetConvId, text, mediaUrl, type);
            }
          }}
        />
      )}

      {/* Delete Chat Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030612]/80 backdrop-blur-md p-4">
          <div className="bg-[#09112a] border border-rose-500/40 rounded-3xl p-6 w-full max-w-sm text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400 font-extrabold text-base">
              <Trash2 className="w-5 h-5 shrink-0" />
              <span>Delete Chat Conversation?</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete this conversation? All messages in this chat will be removed permanently.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  if (onDeleteConversation) {
                    onDeleteConversation(conversation.id);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all active:scale-95"
              >
                Yes, Delete Chat
              </button>
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl bg-[#050a1b] hover:bg-[#0c1636] text-slate-300 font-semibold text-xs border border-blue-950 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN PHOTO & MEDIA VIEWER (MANUAL ZOOM & PAN LIGHTBOX) */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-50 bg-[#02040a]/95 backdrop-blur-2xl flex flex-col justify-between animate-in fade-in duration-200 select-none overflow-hidden touch-none">
          {/* Top Bar Header */}
          <div className="p-3 sm:p-4 px-4 sm:px-6 bg-gradient-to-b from-black/90 via-black/60 to-transparent flex items-center justify-between z-20 shrink-0 gap-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setViewingPhoto(null);
                  handleResetPhotoView();
                }}
                className="p-2 sm:px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md border border-white/10"
                title="Exit / Close (Esc)"
              >
                <ArrowLeft className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold hidden sm:inline">Back to chat</span>
              </button>

              <div className="flex flex-col min-w-0">
                <span className="text-white text-sm font-bold flex items-center gap-1.5 truncate">
                  <ImageIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="truncate">{viewingPhoto.senderName || "Chat Media"}</span>
                </span>
                {viewingPhoto.timestamp && (
                  <span className="text-slate-400 text-[11px]">
                    {new Date(viewingPhoto.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Manual Zoom Controls & Actions in Header */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Header Manual Zoom Slider (visible on sm+ screens) */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-md">
                <Sliders className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-300">Manual Zoom</span>
                <input
                  type="range"
                  min="0.5"
                  max="4.5"
                  step="0.05"
                  value={photoZoom}
                  onChange={(e) => {
                    const next = parseFloat(e.target.value);
                    setPhotoZoom(next);
                    if (next <= 1) setPhotoPan({ x: 0, y: 0 });
                  }}
                  className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  title="Drag slider for manual zoom"
                />
                <span className="text-xs font-mono font-bold text-cyan-300 w-10 text-right">
                  {Math.round(photoZoom * 100)}%
                </span>
              </div>

              {/* Reset View Button */}
              <button
                onClick={handleResetPhotoView}
                className="px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-white/10"
                title="Reset zoom & center image"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-300" />
                <span className="hidden sm:inline">Reset</span>
              </button>

              {/* Rotate 90° */}
              <button
                onClick={() => setPhotoRotation((r) => (r + 90) % 360)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer border border-white/10"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4 text-cyan-400" />
              </button>

              {/* Primary Save Button in Header */}
              <button
                onClick={() => handleSavePhotoToGallery(viewingPhoto.url, viewingPhoto.caption)}
                className="px-3 sm:px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Save this photo to your gallery"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Save</span>
              </button>

              {/* Exit / Close */}
              <button
                onClick={() => {
                  setViewingPhoto(null);
                  handleResetPhotoView();
                }}
                className="p-2 rounded-full bg-white/10 hover:bg-rose-500 hover:text-white text-slate-300 transition-colors cursor-pointer border border-white/10"
                title="Close photo viewer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Central Interactive Canvas Viewport with Wheel, Drag & Touch Pinch Listeners */}
          <div
            onWheel={handlePhotoWheel}
            onMouseDown={handlePhotoMouseDown}
            onMouseMove={handlePhotoMouseMove}
            onMouseUp={handlePhotoMouseUp}
            onMouseLeave={handlePhotoMouseUp}
            onTouchStart={handlePhotoTouchStart}
            onTouchMove={handlePhotoTouchMove}
            onTouchEnd={handlePhotoTouchEnd}
            onClick={(e) => {
              if (e.target === e.currentTarget && photoZoom <= 1 && photoPan.x === 0 && photoPan.y === 0) {
                setViewingPhoto(null);
                handleResetPhotoView();
              }
            }}
            className={`flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden relative ${
              isDraggingPhoto ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            {/* Interactive Image Container */}
            <div
              onDoubleClick={handlePhotoDoubleClick}
              style={{
                transform: `translate3d(${photoPan.x}px, ${photoPan.y}px, 0px) scale(${photoZoom}) rotate(${photoRotation}deg)`,
                transition: isDraggingPhoto ? "none" : "transform 0.15s cubic-bezier(0.2, 0.8, 0.4, 1)"
              }}
              className="relative max-w-full max-h-full flex items-center justify-center will-change-transform select-none"
            >
              <img
                src={viewingPhoto.url}
                alt="Photo preview"
                draggable={false}
                className="max-w-[92vw] max-h-[68vh] object-contain rounded-2xl shadow-2xl drop-shadow-[0_25px_60px_rgba(0,0,0,0.95)] pointer-events-none"
              />
            </div>

            {/* Floating Subtle Manual Zoom Gesture Hint */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/65 backdrop-blur-md border border-white/10 text-[11px] text-slate-300 font-medium flex items-center gap-2 shadow-xl pointer-events-none animate-in fade-in duration-300">
              <Hand className="w-3.5 h-3.5 text-cyan-400" />
              <span>Scroll wheel or pinch to zoom • Drag to pan • Double-click to toggle</span>
            </div>
          </div>

          {/* Bottom Bar Footer with Manual Zoom Slider, Presets & Actions */}
          <div className="p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex flex-col items-center gap-3 z-20 shrink-0">
            {viewingPhoto.caption && (
              <p className="text-slate-200 text-xs sm:text-sm font-medium bg-black/70 backdrop-blur-md px-4 py-2 rounded-2xl max-w-xl text-center border border-white/10 shadow-lg">
                {viewingPhoto.caption}
              </p>
            )}

            {/* Continuous Manual Zoom Range Control Bar */}
            <div className="w-full max-w-xl px-4 py-2.5 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/15 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl">
              {/* Manual Zoom Slider with Live Percentage */}
              <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 shrink-0">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>Manual Zoom:</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4.5"
                  step="0.05"
                  value={photoZoom}
                  onChange={(e) => {
                    const next = parseFloat(e.target.value);
                    setPhotoZoom(next);
                    if (next <= 1) setPhotoPan({ x: 0, y: 0 });
                  }}
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <span className="text-xs font-mono font-extrabold text-cyan-400 min-w-[45px] text-right">
                  {Math.round(photoZoom * 100)}%
                </span>
              </div>

              {/* Preset Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {[
                  { label: "Fit", zoom: 1 },
                  { label: "150%", zoom: 1.5 },
                  { label: "200%", zoom: 2 },
                  { label: "300%", zoom: 3 }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setPhotoZoom(preset.zoom);
                      if (preset.zoom === 1) setPhotoPan({ x: 0, y: 0 });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer ${
                      Math.abs(photoZoom - preset.zoom) < 0.05
                        ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30"
                        : "bg-white/10 hover:bg-white/20 text-slate-300"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}

                <button
                  onClick={handleResetPhotoView}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  title="Reset zoom and center position"
                >
                  <RefreshCw className="w-3 h-3 text-cyan-300" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {/* Save to Gallery */}
              <button
                onClick={() => handleSavePhotoToGallery(viewingPhoto.url, viewingPhoto.caption)}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer ring-2 ring-cyan-400/30"
              >
                <Download className="w-4 h-4" />
                <span>Save to gallery</span>
              </button>

              {/* Exit Button */}
              <button
                onClick={() => {
                  setViewingPhoto(null);
                  handleResetPhotoView();
                }}
                className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-slate-200 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
              >
                <X className="w-4 h-4" />
                <span>Exit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Photo Toast Alert */}
      {savedPhotoToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full bg-emerald-600 text-white text-xs sm:text-sm font-extrabold shadow-2xl border border-emerald-300 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="w-4 h-4 text-emerald-200" />
          <span>Photo successfully saved to your gallery!</span>
        </div>
      )}

      {/* In-Chat Photo Studio Overlay */}
      {showChatPhotoEditor && (
        <PhotoEditorModal
          currentUser={currentUser}
          onClose={() => setShowChatPhotoEditor(false)}
          onSendToChat={(mediaUrl, caption) => {
            setShowChatPhotoEditor(false);
            onSendMessage({
              type: "image",
              mediaUrl,
              text: caption || undefined
            });
          }}
        />
      )}
    </div>
  );
};
