import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Story,
  StoryComment,
  StoryViewer,
  StoryAnonymousAnswer,
  Conversation,
  Group
} from "../types";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Eye,
  Share2,
  Trash2,
  Edit3,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Send,
  MoreVertical,
  Music,
  MapPin,
  Sparkles,
  Smile,
  CornerDownRight,
  Lock,
  Inbox,
  CheckCircle2,
  HelpCircle,
  Star,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw
} from "lucide-react";
import { ShareStoryModal } from "./ShareStoryModal";

interface StoryViewerModalProps {
  currentUser: User;
  allUsers: User[];
  stories: Story[];
  conversations?: Conversation[];
  groups?: Group[];
  initialUserId: string;
  initialStoryIndex?: number;
  onClose: () => void;
  onEditStory: (story: Story) => void;
  onDeleteStory: (storyId: string) => void;
  onSelectUserProfile?: (user: User) => void;
  onShareToChat?: (story: Story, targetConvId?: string) => void;
  onStoryCreated?: (story: Story) => void;
}

const REACTION_EMOJIS = ["❤️", "🔥", "😂", "😮", "😢", "👏", "🎉", "💯", "🚀", "😍", "⚡"];

interface FloatingParticle {
  id: number;
  emoji: string;
  x: number;
  y: number;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  currentUser,
  allUsers,
  stories,
  conversations = [],
  groups = [],
  initialUserId,
  initialStoryIndex = 0,
  onClose,
  onEditStory,
  onDeleteStory,
  onSelectUserProfile,
  onShareToChat,
  onStoryCreated
}) => {
  // Group all active stories by user
  const userStoriesMap = new Map<string, { user: User; stories: Story[] }>();
  stories.forEach((story) => {
    let entry = userStoriesMap.get(story.userId);
    if (!entry) {
      const userObj = allUsers.find((u) => u.id === story.userId) || {
        id: story.userId,
        username: story.userName,
        avatar: story.userAvatar,
        email: "",
        status: "online",
        createdAt: story.createdAt
      };
      entry = { user: userObj, stories: [] };
      userStoriesMap.set(story.userId, entry);
    }
    entry.stories.push(story);
  });

  const userEntries = Array.from(userStoriesMap.values());
  const initialUserIndex = Math.max(
    0,
    userEntries.findIndex((e) => e.user.id === initialUserId)
  );

  const [currentUserIndex, setCurrentUserIndex] = useState<number>(initialUserIndex);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(initialStoryIndex);

  const currentUserEntry = userEntries[currentUserIndex] || userEntries[0];
  const userSlideCount = currentUserEntry?.stories.length || 0;
  const currentStory: Story | undefined = currentUserEntry?.stories[currentSlideIndex];

  // Playback & progress timer state
  const [progress, setProgress] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [pauseToast, setPauseToast] = useState<string>("");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [videoSpeed, setVideoSpeed] = useState<number>(1);
  const [isHolding, setIsHolding] = useState<boolean>(false);

  // Manual Zoom and Pan state
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanningRef = useRef<boolean>(false);
  const panStartPosRef = useRef<{ clientX: number; clientY: number; initialOffsetX: number; initialOffsetY: number }>({
    clientX: 0,
    clientY: 0,
    initialOffsetX: 0,
    initialOffsetY: 0
  });

  // Drawers & Sheets state
  const [showComments, setShowComments] = useState<boolean>(false);
  const [showViewers, setShowViewers] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showAnonymousInbox, setShowAnonymousInbox] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  // Anonymous Q&A state
  const [anonymousAnswers, setAnonymousAnswers] = useState<StoryAnonymousAnswer[]>([]);
  const [anonymousInputText, setAnonymousInputText] = useState("");
  const [isSendingAnonymous, setIsSendingAnonymous] = useState(false);
  const [anonymousSuccessToast, setAnonymousSuccessToast] = useState("");

  // Comment input
  const [commentText, setCommentText] = useState("");
  const [inlineReplyText, setInlineReplyText] = useState("");
  const [replyToComment, setReplyToComment] = useState<StoryComment | null>(null);

  // Floating emoji reaction animations
  const [floatingParticles, setFloatingParticles] = useState<FloatingParticle[]>([]);

  // Video ref
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const slideDurationMs = (currentStory?.duration || 6) * 1000;

  // Is current user the creator of this story?
  const isCreator = currentStory?.userId === currentUser.id;

  // Mark story as viewed
  useEffect(() => {
    if (!currentStory) return;
    fetch(`/api/stories/${currentStory.id}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        userName: currentUser.username,
        userAvatar: currentUser.avatar
      })
    }).catch((err) => console.error("Error logging story view:", err));
  }, [currentStory?.id, currentUser.id]);

  // Load anonymous answers if creator
  useEffect(() => {
    if (!currentStory || !isCreator || (!currentStory.anonymousPrompt && currentStory.type !== "anonymous_qa")) return;

    fetch(`/api/stories/${currentStory.id}/anonymous-answers?userId=${currentUser.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.answers) setAnonymousAnswers(data.answers);
      })
      .catch((err) => console.error("Error fetching anonymous answers:", err));
  }, [currentStory?.id, isCreator, currentUser.id]);

  // Track elapsed time across pauses
  const elapsedBeforePauseRef = useRef<number>(0);
  const isHoldingRef = useRef<boolean>(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pressStartTimeRef = useRef<number>(0);
  const isLongPressRef = useRef<boolean>(false);

  // Navigation handlers
  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    } else if (currentUserIndex > 0) {
      const prevUserStories = userEntries[currentUserIndex - 1].stories;
      setCurrentUserIndex(currentUserIndex - 1);
      setCurrentSlideIndex(prevUserStories.length - 1);
    } else {
      setProgress(0);
      startTimeRef.current = Date.now();
      elapsedBeforePauseRef.current = 0;
    }
  };

  const handleNextSlide = () => {
    if (currentSlideIndex < userSlideCount - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else if (currentUserIndex < userEntries.length - 1) {
      setCurrentUserIndex(currentUserIndex + 1);
      setCurrentSlideIndex(0);
    } else {
      onClose();
    }
  };

  const startPress = () => {
    pressStartTimeRef.current = Date.now();
    isLongPressRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setIsHolding(true);
      isHoldingRef.current = true;
    }, 180);
  };

  const endPress = (zone: "left" | "middle" | "right") => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    const pressDuration = Date.now() - pressStartTimeRef.current;
    setIsHolding(false);
    isHoldingRef.current = false;

    // If held for >= 180ms or flagged as long press, hold pause occurred - do not navigate on release
    if (isLongPressRef.current || pressDuration >= 180) {
      isLongPressRef.current = false;
      return;
    }

    // Single click / single tap dispatching:
    if (zone === "left") {
      // Left side: Previous story
      handlePrevSlide();
    } else if (zone === "right") {
      // Right side: Next story
      handleNextSlide();
    } else {
      // Middle zone: Toggle pause / play with immediate visual feedback
      setIsPaused((prev) => {
        const nextState = !prev;
        setPauseToast(nextState ? "Paused ⏸️" : "Playing ▶️");
        setTimeout(() => setPauseToast(""), 1100);
        return nextState;
      });
    }
  };

  // Reset slide timer and zoom on slide change
  useEffect(() => {
    setProgress(0);
    startTimeRef.current = Date.now();
    elapsedBeforePauseRef.current = 0;
    setIsPaused(false);
    setIsHolding(false);
    isHoldingRef.current = false;
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setShowDeleteConfirm(false);
    setShowAnonymousInbox(false);
    setAnonymousSuccessToast("");
    setAnonymousInputText("");
    setInlineReplyText("");
  }, [currentUserIndex, currentSlideIndex]);

  // Handle slide progress animation loop with smooth auto-progression
  useEffect(() => {
    const isOverlayOpen = showComments || showViewers || showDeleteConfirm || showAnonymousInbox || Boolean(anonymousInputText.trim());
    const isZoomed = zoomScale > 1;

    if (!currentStory || isPaused || isHolding || isOverlayOpen || isZoomed) {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      return;
    }

    if (currentStory.type === "video" && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }

    // Adjust start time based on any time elapsed prior to pausing
    startTimeRef.current = Date.now() - elapsedBeforePauseRef.current;

    const updateProgress = () => {
      if (currentStory.type === "video" && videoRef.current) {
        const vid = videoRef.current;
        if (vid.duration && vid.duration > 0) {
          const currentPct = (vid.currentTime / vid.duration) * 100;
          setProgress(Math.min(100, currentPct));
          elapsedBeforePauseRef.current = vid.currentTime * 1000;
          if (vid.currentTime >= vid.duration) {
            handleNextSlide();
            return;
          }
        }
      } else {
        const elapsed = Date.now() - startTimeRef.current;
        elapsedBeforePauseRef.current = elapsed;
        const currentPct = (elapsed / slideDurationMs) * 100;
        setProgress(Math.min(100, currentPct));

        if (elapsed >= slideDurationMs) {
          handleNextSlide();
          return;
        }
      }

      animationFrameRef.current = requestAnimationFrame(updateProgress);
    };

    animationFrameRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    currentUserIndex,
    currentSlideIndex,
    isPaused,
    isHolding,
    showComments,
    showViewers,
    showDeleteConfirm,
    showAnonymousInbox,
    slideDurationMs,
    currentStory
  ]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showComments || showAnonymousInbox) return;
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrevSlide();
      } else if (e.key === "ArrowRight") {
        handleNextSlide();
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      } else if (e.key.toLowerCase() === "m") {
        setIsMuted((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentUserIndex, currentSlideIndex, showComments, showAnonymousInbox, userSlideCount, userEntries.length]);

  // Emoji Reaction Handler
  const handleReact = async (emoji: string) => {
    if (!currentStory) return;

    const particleId = Date.now() + Math.random();
    setFloatingParticles((prev) => [
      ...prev,
      {
        id: particleId,
        emoji,
        x: 40 + Math.random() * 20,
        y: 80
      }
    ]);

    setTimeout(() => {
      setFloatingParticles((prev) => prev.filter((p) => p.id !== particleId));
    }, 1800);

    try {
      await fetch(`/api/stories/${currentStory.id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          emoji
        })
      });
    } catch (err) {
      console.error("Error reacting to story:", err);
    }
  };

  // Submit Comment (Automatically mirrors into direct DM chat)
  const handleSendComment = async (textToSend?: string) => {
    const finalContent = (textToSend !== undefined ? textToSend : commentText).trim();
    if (!currentStory || !finalContent) return;

    try {
      const res = await fetch(`/api/stories/${currentStory.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.username,
          userAvatar: currentUser.avatar,
          text: finalContent,
          parentId: replyToComment ? replyToComment.id : undefined,
          replyToUserName: replyToComment ? replyToComment.userName : undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (currentStory) {
          currentStory.comments = data.comments;
        }
        setCommentText("");
        setInlineReplyText("");
        setReplyToComment(null);
      }
    } catch (err) {
      console.error("Error posting comment:", err);
    }
  };

  // Submit Anonymous Answer (NGL feature)
  const handleSendAnonymousAnswer = async () => {
    if (!currentStory || !anonymousInputText.trim() || isSendingAnonymous) return;
    setIsSendingAnonymous(true);

    try {
      const res = await fetch(`/api/stories/${currentStory.id}/anonymous-answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: anonymousInputText.trim()
        })
      });

      if (res.ok) {
        setAnonymousInputText("");
        setAnonymousSuccessToast("🔒 Secret message sent anonymously!");
        setTimeout(() => setAnonymousSuccessToast(""), 4000);
      }
    } catch (err) {
      console.error("Error sending anonymous response:", err);
    } finally {
      setIsSendingAnonymous(false);
    }
  };

  // Share Anonymous Answer as a new story
  const handleShareAnonymousAnswer = async (answer: StoryAnonymousAnswer) => {
    if (!currentStory) return;

    try {
      const res = await fetch(`/api/stories/${currentStory.id}/share-anonymous-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          answerId: answer.id
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.story && onStoryCreated) {
          onStoryCreated(data.story);
        }
        setShowAnonymousInbox(false);
        onClose();
      }
    } catch (err) {
      console.error("Error sharing anonymous answer to story:", err);
    }
  };

  // Delete Comment
  const handleDeleteComment = async (commentId: string) => {
    if (!currentStory) return;
    try {
      await fetch(`/api/stories/${currentStory.id}/comments/${commentId}?userId=${currentUser.id}`, {
        method: "DELETE"
      });
      currentStory.comments = currentStory.comments.filter((c) => c.id !== commentId);
    } catch (err) {
      console.error("Error deleting comment:", err);
    }
  };

  // Confirm Delete Story
  const handleConfirmDeleteStory = () => {
    if (!currentStory) return;
    onDeleteStory(currentStory.id);
    if (userSlideCount > 1) {
      if (currentSlideIndex > 0) {
        setCurrentSlideIndex(currentSlideIndex - 1);
      } else {
        setCurrentSlideIndex(0);
      }
    } else {
      onClose();
    }
  };

  if (!currentStory) {
    return null;
  }

  const montage = currentStory.montage;
  const combinedFilterStyle = montage
    ? `brightness(${montage.brightness || 100}%) contrast(${montage.contrast || 100}%) saturate(${montage.saturation || 100}%) sepia(${montage.sepia || 0}%) blur(${montage.blur || 0}px) hue-rotate(${montage.hueRotate || 0}deg)`
    : "none";

  return (
    <div
      id="story-viewer-modal"
      onContextMenu={(e) => {
        e.preventDefault();
        handleNextSlide();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none backdrop-blur-2xl animate-in fade-in"
    >
      {/* Background Dim Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Floating Left/Right Navigation Desktop Arrows */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handlePrevSlide();
        }}
        className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 z-40 p-3.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/80 shadow-2xl backdrop-blur-md transition-transform hover:scale-110 active:scale-95"
        title="Previous Story"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleNextSlide();
        }}
        className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 z-40 p-3.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/80 shadow-2xl backdrop-blur-md transition-transform hover:scale-110 active:scale-95"
        title="Next Story"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Floating Emoji Reaction Particles Layer */}
      {floatingParticles.map((p) => (
        <div
          key={p.id}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`
          }}
          className="fixed pointer-events-none z-50 text-4xl animate-float-up drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]"
        >
          {p.emoji}
        </div>
      ))}

      {/* Main Story Screen Stage */}
      <div
        id="story-stage-container"
        className="relative z-10 w-full max-w-[540px] sm:max-w-[600px] md:max-w-[680px] h-[95vh] max-h-[960px] rounded-[32px] sm:rounded-[36px] overflow-hidden bg-slate-950 border border-slate-800/80 shadow-2xl flex flex-col justify-between"
        style={{
          background:
            currentStory.type === "text"
              ? currentStory.textStyle?.backgroundGradient || "#09112a"
              : currentStory.type === "anonymous_qa"
              ? "linear-gradient(135deg, #180828 0%, #2e0854 50%, #030612 100%)"
              : "#050814"
        }}
      >
        {/* ==================================================== */}
        {/* 1. MEDIA & TEXT CANVAS RENDER WITH ZOOM & PAN */}
        {/* ==================================================== */}
        <div
          className="absolute inset-0 overflow-hidden select-none"
          onPointerDown={(e) => {
            if (zoomScale > 1) {
              isPanningRef.current = true;
              panStartPosRef.current = {
                clientX: e.clientX,
                clientY: e.clientY,
                initialOffsetX: panOffset.x,
                initialOffsetY: panOffset.y
              };
            }
          }}
          onPointerMove={(e) => {
            if (isPanningRef.current && zoomScale > 1) {
              const deltaX = e.clientX - panStartPosRef.current.clientX;
              const deltaY = e.clientY - panStartPosRef.current.clientY;
              const maxPan = (zoomScale - 1) * 220;
              setPanOffset({
                x: Math.max(-maxPan, Math.min(maxPan, panStartPosRef.current.initialOffsetX + deltaX)),
                y: Math.max(-maxPan, Math.min(maxPan, panStartPosRef.current.initialOffsetY + deltaY))
              });
            }
          }}
          onPointerUp={() => {
            isPanningRef.current = false;
          }}
          onPointerCancel={() => {
            isPanningRef.current = false;
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setZoomScale((prev) => {
              const next = prev > 1 ? 1 : 2;
              setPauseToast(next > 1 ? "Zoomed 2.0x 🔍" : "Normal 1.0x");
              setTimeout(() => setPauseToast(""), 1000);
              return next;
            });
            setPanOffset({ x: 0, y: 0 });
          }}
          style={{
            transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)`,
            transformOrigin: "center center",
            transition: isPanningRef.current ? "none" : "transform 0.22s cubic-bezier(0.2, 0, 0, 1)"
          }}
        >
          {/* Photo Story */}
          {currentStory.type === "image" && currentStory.mediaUrl && (
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={currentStory.mediaUrl}
                alt="Story media"
                className="w-full h-full object-cover select-none pointer-events-none"
                style={{ filter: combinedFilterStyle }}
              />
            </div>
          )}

          {/* Video Story */}
          {currentStory.type === "video" && currentStory.mediaUrl && (
            <div className="absolute inset-0 overflow-hidden">
              <video
                ref={videoRef}
                src={currentStory.mediaUrl}
                className="w-full h-full object-cover select-none pointer-events-none"
                style={{ filter: combinedFilterStyle }}
                autoPlay
                playsInline
                muted={isMuted}
                playbackRate={videoSpeed}
              />
            </div>
          )}
        </div>

        {/* Text Story Typography Render */}
        {currentStory.type === "text" && (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center z-10">
            <div
              className={`max-w-full p-5 rounded-3xl backdrop-blur-md ${
                currentStory.textStyle?.template === "neon_glow"
                  ? "font-bold text-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.6)]"
                  : currentStory.textStyle?.template === "editorial_serif"
                  ? "font-serif italic text-amber-100 drop-shadow-xl"
                  : currentStory.textStyle?.template === "cyberpunk"
                  ? "font-mono font-black text-lime-400 uppercase tracking-widest"
                  : currentStory.textStyle?.template === "golden_luxury"
                  ? "font-serif font-bold text-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.6)]"
                  : "font-sans font-medium text-white drop-shadow-md"
              } ${
                currentStory.textStyle?.fontSize === "sm"
                  ? "text-lg"
                  : currentStory.textStyle?.fontSize === "md"
                  ? "text-xl"
                  : currentStory.textStyle?.fontSize === "lg"
                  ? "text-2xl font-bold"
                  : currentStory.textStyle?.fontSize === "xl"
                  ? "text-3xl font-black"
                  : "text-4xl font-black"
              }`}
              style={{
                textAlign: currentStory.textStyle?.textAlign || "center",
                fontFamily: currentStory.textStyle?.fontFamily
              }}
            >
              {currentStory.textContent}
            </div>
          </div>
        )}

        {/* Anonymous Q&A (NGL Style) Card */}
        {(currentStory.type === "anonymous_qa" || currentStory.anonymousPrompt) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 z-20">
            {currentStory.mediaUrl && (
              <img
                src={currentStory.mediaUrl}
                alt="Background"
                className="absolute inset-0 w-full h-full object-cover opacity-40"
              />
            )}
            
            <div
              className={`w-full max-w-[340px] rounded-3xl p-5 flex flex-col items-center text-center shadow-2xl relative border border-white/20 animate-in zoom-in-95 duration-200 ${
                currentStory.anonymousPrompt?.stickerStyle === "neon-cyan"
                  ? "bg-gradient-to-tr from-[#0284c7] via-[#06b6d4] to-[#3b82f6] text-white shadow-cyan-500/30"
                  : currentStory.anonymousPrompt?.stickerStyle === "gold-luxury"
                  ? "bg-gradient-to-tr from-[#78350f] via-[#d97706] to-[#fbbf24] text-slate-950 shadow-amber-500/30"
                  : currentStory.anonymousPrompt?.stickerStyle === "dark-glass"
                  ? "bg-slate-900/90 border border-slate-700/80 text-white shadow-black/60"
                  : currentStory.anonymousPrompt?.stickerStyle === "bubble-gum"
                  ? "bg-gradient-to-tr from-[#7c3aed] via-[#a855f7] to-[#ec4899] text-white shadow-purple-500/30"
                  : "bg-gradient-to-tr from-[#ec4899] via-[#f43f5e] to-[#f97316] text-white shadow-pink-500/40"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-2.5 shadow-inner">
                <Lock className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest opacity-90 mb-1.5 flex items-center gap-1">
                <span>100% Anonymous Q&A</span>
              </span>
              <h3 className="text-base font-black leading-snug break-words px-2 mb-3">
                {currentStory.anonymousPrompt?.question || "Send me anonymous messages!"}
              </h3>

              {/* Viewers Interactive Anonymous Input */}
              {!isCreator && (
                <div className="w-full mt-2 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                  <div className="relative">
                    <textarea
                      value={anonymousInputText}
                      onChange={(e) => setAnonymousInputText(e.target.value)}
                      placeholder="Send secret message anonymously... (no one will ever know who sent it)"
                      rows={2}
                      className="w-full p-3 rounded-2xl bg-black/40 border border-white/30 text-white placeholder-white/60 text-xs focus:outline-none focus:border-white resize-none"
                    />
                  </div>
                  <button
                    onClick={handleSendAnonymousAnswer}
                    disabled={!anonymousInputText.trim() || isSendingAnonymous}
                    className="w-full py-2.5 rounded-xl bg-white text-slate-950 font-bold text-xs shadow-lg hover:bg-slate-100 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                  >
                    {isSendingAnonymous ? (
                      <span>Sending Secret...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Anonymously 🤫</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Creator Anonymous Inbox Control */}
              {isCreator && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAnonymousInbox(true);
                  }}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl bg-black/40 hover:bg-black/60 text-white font-bold text-xs border border-white/20 flex items-center justify-center gap-2 shadow-lg backdrop-blur-md active:scale-95 transition-all"
                >
                  <Inbox className="w-4 h-4 text-cyan-300" />
                  <span>View Anonymous Inbox ({anonymousAnswers.length})</span>
                </button>
              )}
            </div>

            {/* Success Toast */}
            {anonymousSuccessToast && (
              <div className="mt-3 px-4 py-2 rounded-2xl bg-emerald-500 text-white text-xs font-bold shadow-lg animate-in fade-in flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{anonymousSuccessToast}</span>
              </div>
            )}
          </div>
        )}

        {/* Shared Anonymous Q&A Answer Card */}
        {currentStory.sharedAnswerData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 z-20">
            <div className="w-full max-w-[340px] rounded-3xl p-5 bg-gradient-to-tr from-indigo-900 via-purple-900 to-pink-900 border border-purple-400/40 text-white flex flex-col items-center text-center shadow-2xl">
              <div className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                <span>Anonymous Question</span>
              </div>
              <h4 className="text-xs text-slate-300 font-semibold mb-3 italic">
                "{currentStory.sharedAnswerData.question}"
              </h4>

              <div className="w-full p-4 rounded-2xl bg-black/40 border border-white/20 text-left">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 font-bold">
                    {currentStory.sharedAnswerData.anonymousLabel}
                  </span>
                </div>
                <p className="text-sm font-bold text-white leading-relaxed">
                  "{currentStory.sharedAnswerData.answerText}"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Drawing layer */}
        {montage?.drawingDataUrl && (
          <img
            src={montage.drawingDataUrl}
            alt="Doodle layer"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20"
          />
        )}

        {/* Stickers & Emojis Overlays */}
        {montage?.stickers?.map((stk) => (
          <div
            key={stk.id}
            style={{
              left: `${stk.x}%`,
              top: `${stk.y}%`,
              transform: `translate(-50%, -50%) scale(${stk.scale}) rotate(${stk.rotation}deg)`
            }}
            className="absolute z-20 text-4xl select-none pointer-events-none drop-shadow-lg"
          >
            {stk.emoji}
          </div>
        ))}

        {/* Positioned Story Caption Overlay */}
        {currentStory.caption && currentStory.captionPosition && (
          <div
            style={{
              left: `${currentStory.captionPosition.x}%`,
              top: `${currentStory.captionPosition.y}%`,
              transform: "translate(-50%, -50%)"
            }}
            className="absolute z-20 max-w-[85%] px-3.5 py-1.5 rounded-2xl bg-black/70 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-semibold text-white shadow-2xl pointer-events-none select-none text-center"
          >
            {currentStory.caption}
          </div>
        )}

        {/* Text Overlays */}
        {montage?.textOverlays?.map((txt) => (
          <div
            key={txt.id}
            style={{
              left: `${txt.x}%`,
              top: `${txt.y}%`,
              transform: "translate(-50%, -50%)",
              color: txt.color,
              backgroundColor: txt.background
            }}
            className="absolute z-20 px-3.5 py-1.5 rounded-xl text-sm font-bold shadow-lg pointer-events-none select-none"
          >
            {txt.text}
          </div>
        ))}

        {/* ==================================================== */}
        {/* INTERACTIVE TAP ZONES (Left 35% = Prev, Center 30% = Pause/Play, Right 35% = Next, Hold = Pause) */}
        {/* ==================================================== */}
        <div className="absolute inset-0 flex z-10 select-none">
          {/* Left Zone (35%): Single tap for previous story, Hold to Pause */}
          <div
            onMouseDown={startPress}
            onMouseUp={() => endPress("left")}
            onMouseLeave={() => {
              if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
              setIsHolding(false);
              isHoldingRef.current = false;
            }}
            onTouchStart={startPress}
            onTouchEnd={() => endPress("left")}
            className="w-[35%] h-full cursor-pointer hover:bg-white/[0.02] transition-colors"
            title="Single click left: Previous story • Hold: Pause"
          />

          {/* Center Zone (30%): Single tap for pause / resume, Hold to Pause */}
          <div
            onMouseDown={startPress}
            onMouseUp={() => endPress("middle")}
            onMouseLeave={() => {
              if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
              setIsHolding(false);
              isHoldingRef.current = false;
            }}
            onTouchStart={startPress}
            onTouchEnd={() => endPress("middle")}
            className="w-[30%] h-full cursor-pointer hover:bg-white/[0.02] transition-colors flex items-center justify-center"
            title="Single click middle: Pause / Resume • Hold: Pause"
          />

          {/* Right Zone (35%): Single tap for next story, Hold to Pause */}
          <div
            onMouseDown={startPress}
            onMouseUp={() => endPress("right")}
            onMouseLeave={() => {
              if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
              setIsHolding(false);
              isHoldingRef.current = false;
            }}
            onTouchStart={startPress}
            onTouchEnd={() => endPress("right")}
            className="w-[35%] h-full cursor-pointer hover:bg-white/[0.02] transition-colors"
            title="Single click right: Next story • Hold: Pause"
          />
        </div>

        {/* Center Pause/Play feedback toast */}
        {pauseToast && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 px-4 py-2.5 rounded-2xl bg-black/85 backdrop-blur-md border border-white/20 text-white text-sm font-bold shadow-2xl flex items-center gap-2.5 animate-in zoom-in-90 duration-150 pointer-events-none">
            {pauseToast.includes("Paused") ? (
              <Pause className="w-5 h-5 fill-amber-400 text-amber-400" />
            ) : (
              <Play className="w-5 h-5 fill-cyan-400 text-cyan-400" />
            )}
            <span>{pauseToast}</span>
          </div>
        )}

        {/* Hold to Pause Indicator */}
        {isHolding && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-full bg-black/85 backdrop-blur-md border border-amber-400/50 text-amber-300 text-xs font-bold flex items-center gap-2 shadow-2xl animate-pulse pointer-events-none">
            <Pause className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>Holding: Story Paused</span>
          </div>
        )}

        {/* Zoomed Mode Floating Indicator & Reset Helper */}
        {zoomScale > 1 && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
            <button
              onClick={() => {
                setZoomScale(1);
                setPanOffset({ x: 0, y: 0 });
              }}
              className="px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-cyan-500/50 backdrop-blur-md text-xs font-bold shadow-xl flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Zoom {zoomScale.toFixed(1)}x • Reset to 1x</span>
            </button>
          </div>
        )}

        {/* ==================================================== */}
        {/* 2. TOP PROGRESS BARS & HEADER */}
        {/* ==================================================== */}
        <div className={`relative z-30 p-4 flex flex-col gap-2.5 bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-opacity ${isHolding ? "opacity-0" : "opacity-100"}`}>
          
          {/* Progress Bar Segments */}
          <div className="flex items-center gap-1.5 w-full">
            {currentUserEntry.stories.map((s, idx) => {
              const isPast = idx < currentSlideIndex;
              const isCurrent = idx === currentSlideIndex;
              const barWidth = isPast ? 100 : isCurrent ? progress : 0;

              return (
                <div
                  key={s.id}
                  className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden backdrop-blur-sm"
                >
                  <div
                    className="h-full bg-white transition-all ease-linear"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Author Header */}
          <div className="flex items-center justify-between mt-1">
            <div
              onClick={() => {
                const userObj = allUsers.find((u) => u.id === currentStory.userId);
                if (userObj && onSelectUserProfile) onSelectUserProfile(userObj);
              }}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <img
                src={currentStory.userAvatar}
                alt={currentStory.userName}
                className={`w-9 h-9 rounded-full object-cover shadow-md ${
                  currentStory.isCloseFriendsOnly
                    ? "border-2 border-emerald-400 ring-2 ring-emerald-500/40 shadow-emerald-500/30"
                    : "border-2 border-cyan-400 shadow-cyan-400/20"
                }`}
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {currentStory.userName}
                  </span>
                  {currentStory.isCloseFriendsOnly && (
                    <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 text-slate-950 font-black text-[9px] flex items-center gap-0.5 shadow-sm">
                      <Star className="w-2.5 h-2.5 fill-slate-950 text-slate-950" />
                      <span>Close Friends</span>
                    </span>
                  )}
                  {currentStory.isEdited && (
                    <span className="text-[9px] text-slate-400 font-normal">(edited)</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-300">
                  {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>

            {/* Top Right Action Controls */}
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {/* Manual Zoom Button */}
              <button
                onClick={() => {
                  setZoomScale((prev) => {
                    const next = prev >= 3 ? 1 : prev === 1 ? 1.5 : prev === 1.5 ? 2 : prev === 2 ? 3 : 1;
                    setPanOffset({ x: 0, y: 0 });
                    setPauseToast(next > 1 ? `Zoom ${next}x 🔍` : "Normal 1x");
                    setTimeout(() => setPauseToast(""), 1000);
                    return next;
                  });
                }}
                className={`p-2 rounded-full backdrop-blur-md border transition-all active:scale-95 flex items-center justify-center ${
                  zoomScale > 1
                    ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/30"
                    : "bg-black/50 hover:bg-black/80 text-white border-white/10"
                }`}
                title={`Current Zoom: ${zoomScale}x (Click to cycle 1x / 1.5x / 2x / 3x)`}
              >
                {zoomScale > 1 ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
              </button>

              {/* Share Story Button or Sharing Disabled Lock Badge */}
              {currentStory.disableSharing && !isCreator ? (
                <div
                  className="px-2.5 py-1.5 rounded-full bg-black/60 border border-slate-700/80 text-slate-400 text-[11px] font-medium flex items-center gap-1 shadow-sm"
                  title="Story sharing is disabled by author"
                >
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span className="hidden sm:inline">Sharing disabled</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setShowShareModal(true);
                    setIsPaused(true);
                  }}
                  className="px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/30 active:scale-95 transition-all flex items-center gap-1.5"
                  title="Share this story to your chats or copy link"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
                  <span className="text-slate-950 font-black">Share</span>
                </button>
              )}

              {/* Video Mute Toggle */}
              {currentStory.type === "video" && (
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 transition-transform active:scale-95"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                </button>
              )}

              {/* Creator Edit Control */}
              {isCreator && (
                <button
                  onClick={() => onEditStory(currentStory)}
                  className="p-2 rounded-full bg-black/50 hover:bg-black/80 text-cyan-300 backdrop-blur-md border border-white/10 transition-transform active:scale-95"
                  title="Edit story caption, tags, and filters"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}

              {/* Creator Delete Control */}
              {isCreator && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 rounded-full bg-black/50 hover:bg-red-500/80 text-red-400 hover:text-white backdrop-blur-md border border-white/10 transition-all active:scale-95"
                  title="Delete story"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 transition-transform active:scale-95"
                title="Close viewer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* 3. BOTTOM OVERLAYS & INTERACTION BAR */}
        {/* ==================================================== */}
        <div className={`relative z-30 p-4 flex flex-col gap-2 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity ${isHolding ? "opacity-0" : "opacity-100"}`}>
          
          {/* Music Track Badge */}
          {currentStory.music && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-amber-400/30 text-amber-300 text-xs font-semibold w-fit">
              <Music className="w-3.5 h-3.5 text-amber-400 animate-bounce shrink-0" />
              <span className="truncate max-w-[240px]">
                {currentStory.music.title} {currentStory.music.artist ? `• ${currentStory.music.artist}` : ""}
              </span>
            </div>
          )}

          {/* Location & Tags Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            {currentStory.location && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-cyan-400/30 text-cyan-300 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{currentStory.location}</span>
              </span>
            )}

            {currentStory.tags?.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  if (t.type === "user" && t.userId) {
                    const u = allUsers.find((user) => user.id === t.userId);
                    if (u && onSelectUserProfile) onSelectUserProfile(u);
                  }
                }}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-blue-600/80 hover:bg-blue-500 text-white shadow-sm transition-transform active:scale-95"
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Story Caption (if not positioned) */}
          {currentStory.caption && !currentStory.captionPosition && (
            <p className="text-sm font-medium text-white/95 leading-snug drop-shadow-md">
              {currentStory.caption}
            </p>
          )}

          {/* Quick Reaction Emojis Ribbon */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none" onClick={(e) => e.stopPropagation()}>
            {REACTION_EMOJIS.map((emoji) => {
              const count = (currentStory.reactions && currentStory.reactions[emoji]?.length) || 0;
              const hasReacted = currentStory.reactions && currentStory.reactions[emoji]?.includes(currentUser.id);

              return (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className={`px-2.5 py-1 rounded-2xl flex items-center gap-1 text-base transition-all shrink-0 active:scale-90 ${
                    hasReacted
                      ? "bg-cyan-500/30 border-2 border-cyan-400 scale-105 shadow-md shadow-cyan-400/30"
                      : "bg-black/50 hover:bg-black/80 border border-white/10"
                  }`}
                >
                  <span>{emoji}</span>
                  {count > 0 && (
                    <span className="text-[10px] font-bold text-cyan-300">{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Direct Reply Bar (Sends reply automatically to DM chat) */}
          <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1 flex items-center bg-black/60 backdrop-blur-md rounded-full border border-white/20 px-3 py-1.5 focus-within:border-cyan-400 transition-colors">
              <input
                type="text"
                value={inlineReplyText}
                onChange={(e) => setInlineReplyText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendComment(inlineReplyText)}
                placeholder="Reply to story (sends to chat)..."
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
              />
              <button
                onClick={() => handleSendComment(inlineReplyText)}
                disabled={!inlineReplyText.trim()}
                className="p-1 rounded-full text-cyan-400 hover:text-white disabled:opacity-40 transition-colors"
                title="Send reply to chat"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Dedicated Manual Like Button */}
            <button
              onClick={() => handleReact("❤️")}
              className={`px-3 py-1.5 rounded-full font-bold text-xs border active:scale-90 flex items-center gap-1.5 transition-all shrink-0 ${
                currentStory.reactions?.["❤️"]?.includes(currentUser.id)
                  ? "bg-red-500/25 border-red-500/60 text-red-400 shadow-md shadow-red-500/30 scale-105"
                  : "bg-black/60 hover:bg-black/80 border-white/15 text-white"
              }`}
              title="Like story"
            >
              <Heart
                className={`w-3.5 h-3.5 transition-transform ${
                  currentStory.reactions?.["❤️"]?.includes(currentUser.id)
                    ? "fill-red-500 text-red-500 scale-110"
                    : "text-slate-300 hover:text-red-400"
                }`}
              />
              <span className="text-[11px] font-bold">
                {(currentStory.reactions && currentStory.reactions["❤️"]?.length) || 0}
              </span>
            </button>

            <button
              onClick={() => setShowComments(true)}
              className="px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-white/10 active:scale-95 flex items-center gap-1.5 transition-all shrink-0"
              title="View & post comments"
            >
              <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>{currentStory.comments?.length || 0}</span>
            </button>

            {currentStory.disableSharing && !isCreator ? (
              <div
                className="px-2.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/80 text-slate-400 text-xs font-medium flex items-center gap-1 shadow-sm"
                title="Story author disabled sharing"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Locked</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowShareModal(true);
                  setIsPaused(true);
                }}
                className="px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/30 active:scale-95 flex items-center gap-1.5 transition-all"
                title="Share story to chats & friends"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
                <span className="font-black">Share</span>
              </button>
            )}
          </div>
        </div>

        {/* ==================================================== */}
        {/* 4. COMMENTS & REPLIES DRAWER */}
        {/* ==================================================== */}
        {showComments && (
          <div
            className="absolute inset-0 z-40 bg-black/95 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Comments Header */}
            <div className="p-4 border-b border-blue-950 flex items-center justify-between bg-[#09112a]">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  Story Comments ({currentStory.comments?.length || 0})
                </h3>
              </div>
              <button
                onClick={() => setShowComments(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {currentStory.comments?.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Smile className="w-10 h-10 text-slate-600 mb-2" />
                  <p className="text-xs font-semibold text-slate-300">No comments yet</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Replies will also be sent directly to the creator's chat!</p>
                </div>
              ) : (
                currentStory.comments?.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-1.5 ${
                      comment.parentId ? "ml-4 border-l-2 border-l-cyan-400" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={comment.userAvatar}
                          alt={comment.userName}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="text-xs font-bold text-white">{comment.userName}</span>
                        {comment.replyToUserName && (
                          <span className="text-[10px] text-cyan-400 flex items-center gap-0.5">
                            <CornerDownRight className="w-3 h-3" />
                            <span>@{comment.replyToUserName}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">
                          {new Date(comment.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {(comment.userId === currentUser.id || isCreator) && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-slate-500 hover:text-red-400 transition-colors"
                            title="Delete comment"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-200 pl-8">{comment.text}</p>

                    <div className="pl-8 pt-1">
                      <button
                        onClick={() => {
                          setReplyToComment(comment);
                          setCommentText(`@${comment.userName} `);
                        }}
                        className="text-[10px] font-semibold text-cyan-400 hover:underline"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Composer */}
            <div className="p-3 border-t border-blue-950 bg-[#09112a]">
              {replyToComment && (
                <div className="flex items-center justify-between px-2 py-1 mb-1 text-[11px] text-cyan-400 bg-cyan-950/40 rounded-lg">
                  <span>Replying to <strong>@{replyToComment.userName}</strong></span>
                  <button onClick={() => setReplyToComment(null)}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                  placeholder="Type a comment or message..."
                  className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={() => handleSendComment()}
                  disabled={!commentText.trim()}
                  className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 disabled:opacity-40 transition-all font-bold"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 pl-1">
                💡 Comments also get delivered directly to the creator's DM in chat.
              </p>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* 5. ANONYMOUS INBOX DRAWER (Creator Only) */}
        {/* ==================================================== */}
        {showAnonymousInbox && (
          <div
            className="absolute inset-0 z-40 bg-black/95 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-pink-950 flex items-center justify-between bg-gradient-to-r from-pink-950/80 to-purple-950/80">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-pink-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Anonymous Responses ({anonymousAnswers.length})
                  </h3>
                  <p className="text-[10px] text-pink-200">
                    Received secretly via your Q&A sticker
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAnonymousInbox(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {anonymousAnswers.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Lock className="w-10 h-10 text-pink-500/50 mb-2 animate-pulse" />
                  <p className="text-xs font-semibold text-slate-200">No anonymous messages yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">When friends reply secretly to your sticker, they will appear here!</p>
                </div>
              ) : (
                anonymousAnswers.map((ans) => (
                  <div
                    key={ans.id}
                    className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/70 to-pink-950/70 border border-pink-500/30 flex flex-col gap-2 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/30 text-pink-200 border border-pink-400/40">
                        {ans.anonymousLabel || "Anonymous User"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(ans.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-white leading-relaxed">
                      "{ans.text}"
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                      <button
                        onClick={() => handleShareAnonymousAnswer(ans)}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share to Story 📲</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal Overlay */}
        {showDeleteConfirm && (
          <div
            className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 rounded-3xl bg-[#09112a] border border-red-500/40 text-center flex flex-col items-center gap-3 max-w-xs shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Delete Story?</h4>
                <p className="text-xs text-slate-400 mt-1">
                  This story will be permanently removed for all viewers.
                </p>
              </div>
              <div className="flex items-center gap-2 w-full mt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteStory}
                  className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/30"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share Story Modal */}
        {showShareModal && (
          <ShareStoryModal
            story={currentStory}
            currentUser={currentUser}
            conversations={conversations}
            groups={groups}
            allUsers={allUsers}
            onClose={() => {
              setShowShareModal(false);
              setIsPaused(false);
            }}
            onShareComplete={(targetConvId) => {
              setShowShareModal(false);
              if (onShareToChat) {
                onShareToChat(currentStory, targetConvId);
              }
            }}
          />
        )}

      </div>
    </div>
  );
};
