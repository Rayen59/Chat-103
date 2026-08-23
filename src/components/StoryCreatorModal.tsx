import React, { useState, useRef, useEffect } from "react";
import {
  User,
  Story,
  StoryTag,
  StoryTypographyTemplate,
  StoryMediaMontage,
  StoryStickerOverlay,
  StoryTextOverlay,
  StoryAnonymousPrompt
} from "../types";
import { PhotoEditorModal } from "./PhotoEditorModal";
import {
  X,
  Sparkles,
  Image as ImageIcon,
  Video,
  Type,
  Sliders,
  Paintbrush,
  Smile,
  AtSign,
  MapPin,
  Music,
  Scissors,
  Volume2,
  VolumeX,
  Play,
  Upload,
  Check,
  Trash2,
  Plus,
  RefreshCw,
  Eye,
  Camera,
  HelpCircle,
  Lock,
  MessageCircle,
  HeartHandshake,
  EyeOff,
  Shield,
  Move,
  Star,
  Users,
  Globe,
  MessageSquare,
  CheckCheck
} from "lucide-react";

interface StoryCreatorModalProps {
  currentUser: User;
  allUsers: User[];
  storyToEdit?: Story | null;
  onClose: () => void;
  onStoryCreated: (story: Story) => void;
  onStoryUpdated?: (story: Story) => void;
}

const TYPOGRAPHY_TEMPLATES: {
  id: StoryTypographyTemplate;
  name: string;
  desc: string;
  previewClass: string;
  fontFamily: string;
}[] = [
  {
    id: "lite_minimal",
    name: "Lite Minimal",
    desc: "Clean modern sans-serif with glass backdrop",
    previewClass: "font-sans font-medium tracking-tight text-white drop-shadow-md",
    fontFamily: "system-ui, -apple-system, sans-serif"
  },
  {
    id: "neon_glow",
    name: "Neon Glow",
    desc: "Vibrant electric typography with ambient glow",
    previewClass: "font-bold tracking-wide text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.7)]",
    fontFamily: "'Trebuchet MS', sans-serif"
  },
  {
    id: "editorial_serif",
    name: "Editorial Serif",
    desc: "Refined luxury magazine typography",
    previewClass: "font-serif italic font-semibold text-amber-100 drop-shadow-lg",
    fontFamily: "Georgia, 'Times New Roman', serif"
  },
  {
    id: "gradient_bold",
    name: "Gradient Bold",
    desc: "High-impact vibrant multi-stop gradient",
    previewClass: "font-black tracking-tighter bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent",
    fontFamily: "Impact, 'Arial Black', sans-serif"
  },
  {
    id: "typewriter",
    name: "Typewriter",
    desc: "Vintage retro monospace paper tag style",
    previewClass: "font-mono font-medium text-emerald-300 tracking-normal",
    fontFamily: "'Courier New', Courier, monospace"
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    desc: "Futuristic neon green tech layout",
    previewClass: "font-mono font-black text-lime-400 uppercase tracking-widest",
    fontFamily: "monospace"
  },
  {
    id: "golden_luxury",
    name: "Golden Luxury",
    desc: "Warm metallic gold with radiant aura",
    previewClass: "font-serif font-bold text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.6)]",
    fontFamily: "Georgia, serif"
  },
  {
    id: "midnight_poetry",
    name: "Midnight Poetry",
    desc: "Deep starry romantic lettering",
    previewClass: "font-sans font-light tracking-widest text-indigo-200",
    fontFamily: "system-ui, sans-serif"
  },
  {
    id: "breaking_news",
    name: "Breaking News",
    desc: "High-contrast urgency ticker",
    previewClass: "font-black uppercase tracking-tight text-red-400",
    fontFamily: "'Arial Black', sans-serif"
  }
];

const GRADIENTS = [
  "linear-gradient(135deg, #09112a 0%, #1e1b4b 50%, #030712 100%)",
  "linear-gradient(135deg, #4338ca 0%, #3b82f6 50%, #06b6d4 100%)",
  "linear-gradient(135deg, #831843 0%, #db2777 50%, #f43f5e 100%)",
  "linear-gradient(135deg, #064e3b 0%, #059669 50%, #10b981 100%)",
  "linear-gradient(135deg, #78350f 0%, #d97706 50%, #fbbf24 100%)",
  "linear-gradient(135deg, #581c87 0%, #7c3aed 50%, #c084fc 100%)",
  "linear-gradient(135deg, #111827 0%, #374151 50%, #1f2937 100%)",
  "linear-gradient(135deg, #164e63 0%, #0284c7 50%, #38bdf8 100%)"
];

const FILTER_PRESETS: { id: StoryMediaMontage["filter"]; name: string; css: string }[] = [
  { id: "none", name: "Normal", css: "none" },
  { id: "vivid", name: "Vivid", css: "contrast(115%) saturate(130%) brightness(105%)" },
  { id: "cyberpunk", name: "Cyberpunk", css: "hue-rotate(290deg) saturate(160%) contrast(120%)" },
  { id: "vintage", name: "Vintage", css: "sepia(45%) contrast(90%) brightness(95%)" },
  { id: "noir", name: "Noir (B&W)", css: "grayscale(100%) contrast(130%) brightness(90%)" },
  { id: "sunset", name: "Sunset", css: "sepia(30%) saturate(140%) hue-rotate(-20deg)" },
  { id: "glacier", name: "Glacier", css: "hue-rotate(180deg) saturate(110%) brightness(105%)" },
  { id: "dramatic", name: "Dramatic", css: "contrast(140%) brightness(85%) saturate(120%)" },
  { id: "golden", name: "Golden Hour", css: "sepia(20%) saturate(150%) brightness(110%)" },
  { id: "retro_vhs", name: "Retro VHS", css: "contrast(125%) saturate(85%) brightness(110%)" }
];

const QUICK_EMOJIS = ["❤️", "🔥", "✨", "🚀", "🎉", "😍", "⚡", "💯", "👏", "☕", "🌴", "🎨", "🎙️", "🕶️", "💎", "🌟"];

const POPULAR_LOCATIONS = [
  "Silicon Valley, CA",
  "Paris, France",
  "Tokyo, Japan",
  "New York City",
  "Creative Studio",
  "Sunset Beach",
  "Coffee Lab",
  "Audio Waves HQ"
];

const HD_PHOTO_PRESETS = [
  { title: "Neon City", url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&auto=format&fit=crop&q=80", category: "City" },
  { title: "Sunset Waves", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80", category: "Nature" },
  { title: "Cyber Lights", url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=80", category: "Cyber" },
  { title: "Golden Dune", url: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&auto=format&fit=crop&q=80", category: "Warm" },
  { title: "Cosmic Galaxy", url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80", category: "Space" },
  { title: "Moody Studio", url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80", category: "Art" }
];

const HD_VIDEO_PRESETS = [
  { title: "Ocean Waves", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", duration: 15 },
  { title: "Nature Trail", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", duration: 12 },
  { title: "Joy Ride", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4", duration: 10 }
];

const NGL_QUESTION_PRESETS = [
  "Send me anonymous messages!",
  "Ask me anything honestly 🤫",
  "What is one secret you never told me? 💌",
  "Rate my vibe from 1 to 10 🔥",
  "Drop your best piece of advice for me 💡",
  "Send a secret song recommendation 🎵"
];

const NGL_STYLES: { id: "ngl-gradient" | "neon-cyan" | "gold-luxury" | "dark-glass" | "bubble-gum"; name: string; class: string }[] = [
  { id: "ngl-gradient", name: "NGL Sunset", class: "bg-gradient-to-tr from-[#ec4899] via-[#f43f5e] to-[#f97316] text-white shadow-pink-500/30" },
  { id: "neon-cyan", name: "Electric Cyan", class: "bg-gradient-to-tr from-[#0284c7] via-[#06b6d4] to-[#3b82f6] text-white shadow-cyan-500/30" },
  { id: "gold-luxury", name: "Royal Gold", class: "bg-gradient-to-tr from-[#78350f] via-[#d97706] to-[#fbbf24] text-slate-950 shadow-amber-500/30" },
  { id: "dark-glass", name: "Dark Obsidian", class: "bg-slate-900/90 border border-slate-700/80 text-white shadow-black/50" },
  { id: "bubble-gum", name: "Bubblegum", class: "bg-gradient-to-tr from-[#7c3aed] via-[#a855f7] to-[#ec4899] text-white shadow-purple-500/30" }
];

export const StoryCreatorModal: React.FC<StoryCreatorModalProps> = ({
  currentUser,
  allUsers,
  storyToEdit,
  onClose,
  onStoryCreated,
  onStoryUpdated
}) => {
  const isEditing = !!storyToEdit;

  // Active Mode: 'image' | 'video' | 'text' | 'anonymous_qa'
  const [mode, setMode] = useState<"image" | "video" | "text" | "anonymous_qa">(
    storyToEdit ? storyToEdit.type : "image"
  );

  // Media state
  const [mediaUrl, setMediaUrl] = useState<string>(storyToEdit?.mediaUrl || "");
  const [videoDuration, setVideoDuration] = useState<number>(storyToEdit?.videoDuration || 0);
  const [videoTrimStart, setVideoTrimStart] = useState<number>(storyToEdit?.montage?.videoTrimStart || 0);
  const [videoTrimEnd, setVideoTrimEnd] = useState<number>(storyToEdit?.montage?.videoTrimEnd || (storyToEdit?.videoDuration ? Math.min(60, storyToEdit.videoDuration) : 60));
  const [videoSpeed, setVideoSpeed] = useState<number>(storyToEdit?.montage?.videoSpeed || 1);
  const [isMuted, setIsMuted] = useState<boolean>(storyToEdit?.montage?.isMuted || false);

  // Text Story state
  const [textContent, setTextContent] = useState<string>(storyToEdit?.textContent || "");
  const [selectedTemplate, setSelectedTemplate] = useState<StoryTypographyTemplate>(storyToEdit?.textStyle?.template || "lite_minimal");
  const [bgGradient, setBgGradient] = useState<string>(storyToEdit?.textStyle?.backgroundGradient || GRADIENTS[0]);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">(storyToEdit?.textStyle?.textAlign || "center");
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg" | "xl" | "2xl">(storyToEdit?.textStyle?.fontSize || "lg");

  // Anonymous Q&A (NGL) State
  const [qaQuestion, setQaQuestion] = useState<string>(
    storyToEdit?.anonymousPrompt?.question || "Send me anonymous messages!"
  );
  const [qaStyle, setQaStyle] = useState<"ngl-gradient" | "neon-cyan" | "gold-luxury" | "dark-glass" | "bubble-gum">(
    storyToEdit?.anonymousPrompt?.stickerStyle || "ngl-gradient"
  );

  // Montage state
  const [activeFilter, setActiveFilter] = useState<StoryMediaMontage["filter"]>(storyToEdit?.montage?.filter || "none");
  const [brightness, setBrightness] = useState<number>(storyToEdit?.montage?.brightness || 100);
  const [contrast, setContrast] = useState<number>(storyToEdit?.montage?.contrast || 100);
  const [saturation, setSaturation] = useState<number>(storyToEdit?.montage?.saturation || 100);
  const [sepia, setSepia] = useState<number>(storyToEdit?.montage?.sepia || 0);
  const [blur, setBlur] = useState<number>(storyToEdit?.montage?.blur || 0);
  const [hueRotate, setHueRotate] = useState<number>(storyToEdit?.montage?.hueRotate || 0);

  // Overlays
  const [stickers, setStickers] = useState<StoryStickerOverlay[]>(storyToEdit?.montage?.stickers || []);
  const [textOverlays, setTextOverlays] = useState<StoryTextOverlay[]>(storyToEdit?.montage?.textOverlays || []);
  const [newOverlayText, setNewOverlayText] = useState("");
  const [newOverlayColor, setNewOverlayColor] = useState("#ffffff");
  const [newOverlayBg, setNewOverlayBg] = useState("rgba(0,0,0,0.6)");

  // Drawing state
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [brushColor, setBrushColor] = useState("#22d3ee");
  const [brushSize, setBrushSize] = useState(4);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(!!storyToEdit?.montage?.drawingDataUrl);

  // Tags & Metadata
  const [caption, setCaption] = useState<string>(storyToEdit?.caption || "");
  const [captionPosition, setCaptionPosition] = useState<{ x: number; y: number }>(
    storyToEdit?.captionPosition || { x: 50, y: 84 }
  );
  const [isCloseFriendsOnly, setIsCloseFriendsOnly] = useState<boolean>(
    storyToEdit?.isCloseFriendsOnly || false
  );
  const [closeFriends, setCloseFriends] = useState<string[]>(
    currentUser.closeFriendsUserIds || []
  );
  const [closeFriendsSearch, setCloseFriendsSearch] = useState("");
  const [closeFriendsSavedToast, setCloseFriendsSavedToast] = useState("");

  const [disableSharing, setDisableSharing] = useState<boolean>(
    storyToEdit?.disableSharing || false
  );
  const [hiddenFromUserIds, setHiddenFromUserIds] = useState<string[]>(() => {
    if (storyToEdit?.hiddenFromUserIds && storyToEdit.hiddenFromUserIds.length > 0) {
      return storyToEdit.hiddenFromUserIds;
    }
    try {
      const cached = localStorage.getItem(`wavegram_hidden_story_${currentUser.id}`);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [hideSearch, setHideSearch] = useState("");
  const [hiddenSavedToast, setHiddenSavedToast] = useState("");

  const handleToggleCloseFriend = async (targetUserId: string) => {
    const updated = closeFriends.includes(targetUserId)
      ? closeFriends.filter((id) => id !== targetUserId)
      : [...closeFriends, targetUserId];
    setCloseFriends(updated);
    currentUser.closeFriendsUserIds = updated;
    try {
      await fetch("/api/users/close-friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, closeFriendsUserIds: updated })
      });
      setCloseFriendsSavedToast(
        updated.includes(targetUserId) ? "Added to Close Friends ⭐" : "Removed from Close Friends"
      );
      setTimeout(() => setCloseFriendsSavedToast(""), 2500);
    } catch (err) {
      console.error("Failed to update close friends:", err);
    }
  };

  const handleSaveCloseFriendsList = async () => {
    try {
      currentUser.closeFriendsUserIds = closeFriends;
      await fetch("/api/users/close-friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, closeFriendsUserIds: closeFriends })
      });
    } catch (err) {
      console.error("Failed to update close friends:", err);
    }
    setCloseFriendsSavedToast(`✓ Saved! Close Friends list updated with ${closeFriends.length} friend${closeFriends.length === 1 ? '' : 's'}.`);
    setTimeout(() => setCloseFriendsSavedToast(""), 3000);
    setStudioTab("gallery");
  };

  const handleSaveHiddenList = () => {
    try {
      localStorage.setItem(`wavegram_hidden_story_${currentUser.id}`, JSON.stringify(hiddenFromUserIds));
    } catch {}
    setHiddenSavedToast(`✓ Saved! Story hidden from ${hiddenFromUserIds.length} contact${hiddenFromUserIds.length === 1 ? '' : 's'}.`);
    setTimeout(() => setHiddenSavedToast(""), 3000);
    setStudioTab("gallery");
  };

  const [tags, setTags] = useState<StoryTag[]>(storyToEdit?.tags || []);
  const [locationTag, setLocationTag] = useState<string>(storyToEdit?.location || "");
  const [customLocationInput, setCustomLocationInput] = useState("");
  const [musicTitle, setMusicTitle] = useState<string>(storyToEdit?.music?.title || "");
  const [musicArtist, setMusicArtist] = useState<string>(storyToEdit?.music?.artist || "");
  const [hashtagInput, setHashtagInput] = useState("");

  // Sub-tabs in creator studio
  const [studioTab, setStudioTab] = useState<"gallery" | "templates" | "ngl" | "filters" | "adjust" | "stickers" | "draw" | "tags" | "video" | "privacy">("gallery");

  // Dragging active target on phone preview canvas
  const phonePreviewRef = useRef<HTMLDivElement>(null);
  const [dragTarget, setDragTarget] = useState<{ type: "caption" | "textOverlay" | "sticker"; id?: string } | null>(null);

  const handlePointerDown = (type: "caption" | "textOverlay" | "sticker", id?: string, e?: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setDragTarget({ type, id });
  };

  const handleCanvasMove = (clientX: number, clientY: number) => {
    if (!dragTarget || !phonePreviewRef.current) return;
    const rect = phonePreviewRef.current.getBoundingClientRect();
    const x = Math.round(Math.max(8, Math.min(92, ((clientX - rect.left) / rect.width) * 100)));
    const y = Math.round(Math.max(8, Math.min(92, ((clientY - rect.top) / rect.height) * 100)));

    if (dragTarget.type === "caption") {
      setCaptionPosition({ x, y });
    } else if (dragTarget.type === "textOverlay" && dragTarget.id) {
      setTextOverlays((prev) =>
        prev.map((t) => (t.id === dragTarget.id ? { ...t, x, y } : t))
      );
    } else if (dragTarget.type === "sticker" && dragTarget.id) {
      setStickers((prev) =>
        prev.map((s) => (s.id === dragTarget.id ? { ...s, x, y } : s))
      );
    }
  };

  // Global window listeners for frictionless, professional drag and drop
  useEffect(() => {
    if (!dragTarget) return;

    const onPointerMove = (e: PointerEvent) => {
      handleCanvasMove(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleCanvasMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onPointerUp = () => {
      setDragTarget(null);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onPointerUp);
    };
  }, [dragTarget]);

  const handleCanvasRelease = () => {
    setDragTarget(null);
  };

  // Quick alignment helpers for caption / overlays / stickers
  const setElementAlignment = (target: "caption" | "lastOverlay", pos: { x?: number; y?: number }) => {
    if (target === "caption") {
      setCaptionPosition((prev) => ({
        x: pos.x !== undefined ? pos.x : prev.x,
        y: pos.y !== undefined ? pos.y : prev.y
      }));
    } else if (target === "lastOverlay" && textOverlays.length > 0) {
      const lastId = textOverlays[textOverlays.length - 1].id;
      setTextOverlays((prev) =>
        prev.map((t) =>
          t.id === lastId
            ? {
                ...t,
                x: pos.x !== undefined ? pos.x : t.x,
                y: pos.y !== undefined ? pos.y : t.y
              }
            : t
        )
      );
    }
  };

  // Tag friend picker
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [mobileTab, setMobileTab] = useState<"preview" | "studio">("preview");

  // File Inputs & Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const [uploadSuccessToast, setUploadSuccessToast] = useState("");

  // Video metadata probe
  const handleVideoLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const duration = e.currentTarget.duration;
    if (duration) {
      const rounded = Math.round(duration);
      setVideoDuration(rounded);
      setVideoTrimStart(0);
      setVideoTrimEnd(Math.min(60, rounded));
      if (rounded > 60) {
        setErrorMessage("Notice: Video stories are strictly capped at 60s max. The video will play the first 60 seconds.");
      }
    }
  };

  // File Upload Handlers (Handles both Photo & Video from Gallery / Camera)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage("");
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      setErrorMessage("Please select a valid image or video file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setMediaUrl(result);
      setUploadSuccessToast(isVideo ? `Video loaded (${file.name})` : `Photo loaded (${file.name})`);
      setTimeout(() => setUploadSuccessToast(""), 4000);

      if (isVideo) {
        setMode("video");
        setStudioTab("video");
      } else {
        setMode("image");
        setStudioTab("filters");
      }
    };
    reader.readAsDataURL(file);
    // Reset file input value so same file can be re-selected if desired
    e.target.value = "";
  };

  // Direct URL Import
  const handleLoadMediaUrl = () => {
    if (!urlInput.trim()) return;
    const url = urlInput.trim();
    setMediaUrl(url);
    const isVid = url.endsWith(".mp4") || url.endsWith(".webm") || url.includes("video");
    if (isVid) {
      setMode("video");
      setStudioTab("video");
    } else {
      setMode("image");
      setStudioTab("filters");
    }
    setUrlInput("");
    setUploadSuccessToast("Media loaded from URL successfully!");
    setTimeout(() => setUploadSuccessToast(""), 4000);
  };

  // Drag & Drop Upload
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      setErrorMessage("Please drop a valid image or video file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setMediaUrl(result);
      setUploadSuccessToast(isVideo ? `Video loaded (${file.name})` : `Photo loaded (${file.name})`);
      setTimeout(() => setUploadSuccessToast(""), 4000);

      if (isVideo) {
        setMode("video");
        setStudioTab("video");
      } else {
        setMode("image");
        setStudioTab("filters");
      }
    };
    reader.readAsDataURL(file);
  };

  // Drawing Canvas logic
  useEffect(() => {
    if (!canvasRef.current || !isDrawingMode) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (storyToEdit?.montage?.drawingDataUrl && !hasDrawn) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasDrawn(true);
      };
      img.src = storyToEdit.montage.drawingDataUrl;
    }
  }, [isDrawingMode]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Sticker & Text Overlays
  const handleAddEmojiSticker = (emoji: string) => {
    const newSticker: StoryStickerOverlay = {
      id: "stk_" + Math.random().toString(36).substring(2, 9),
      emoji,
      x: 40 + Math.random() * 20,
      y: 40 + Math.random() * 20,
      scale: 1.3,
      rotation: Math.round((Math.random() - 0.5) * 30)
    };
    setStickers((prev) => [...prev, newSticker]);
  };

  const handleRemoveSticker = (id: string) => {
    setStickers((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddTextOverlay = () => {
    if (!newOverlayText.trim()) return;
    const newText: StoryTextOverlay = {
      id: "txt_" + Math.random().toString(36).substring(2, 9),
      text: newOverlayText.trim(),
      color: newOverlayColor,
      background: newOverlayBg,
      x: 50,
      y: 50,
      scale: 1,
      font: "sans-serif",
      shadow: true
    };
    setTextOverlays((prev) => [...prev, newText]);
    setNewOverlayText("");
  };

  const handleRemoveTextOverlay = (id: string) => {
    setTextOverlays((prev) => prev.filter((t) => t.id !== id));
  };

  // Tags
  const handleAddFriendTag = (user: User) => {
    if (tags.some((t) => t.type === "user" && t.userId === user.id)) return;
    const newTag: StoryTag = {
      id: "tag_" + Math.random().toString(36).substring(2, 9),
      type: "user",
      label: `@${user.username}`,
      value: user.id,
      userId: user.id
    };
    setTags((prev) => [...prev, newTag]);
    setShowFriendPicker(false);
  };

  const handleAddHashtag = () => {
    if (!hashtagInput.trim()) return;
    const cleanTag = hashtagInput.replace(/^#/, "").trim();
    if (!cleanTag) return;
    const newTag: StoryTag = {
      id: "tag_" + Math.random().toString(36).substring(2, 9),
      type: "hashtag",
      label: `#${cleanTag}`,
      value: cleanTag
    };
    setTags((prev) => [...prev, newTag]);
    setHashtagInput("");
  };

  const handleAddLocation = (loc: string) => {
    if (!loc.trim()) return;
    setLocationTag(loc.trim());
    setCustomLocationInput("");
    setTags((prev) => [
      ...prev.filter((t) => t.type !== "location"),
      {
        id: "tag_loc",
        type: "location",
        label: `📍 ${loc.trim()}`,
        value: loc.trim()
      }
    ]);
  };

  const handleRemoveTag = (tagId: string) => {
    setTags((prev) => prev.filter((t) => t.id !== tagId));
  };

  // Save / Publish Story
  const handlePublishStory = async (overrideCloseFriends?: boolean) => {
    const finalCloseFriendsOnly = typeof overrideCloseFriends === "boolean" ? overrideCloseFriends : isCloseFriendsOnly;

    if (mode === "text" && !textContent.trim()) {
      setErrorMessage("Please enter some text for your story.");
      return;
    }
    if ((mode === "image" || mode === "video") && !mediaUrl) {
      setErrorMessage(`Please upload or choose a ${mode} for your story.`);
      return;
    }
    if (mode === "anonymous_qa" && !qaQuestion.trim()) {
      setErrorMessage("Please enter an anonymous question prompt.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // Save hidden list preference
      try {
        localStorage.setItem(`wavegram_hidden_story_${currentUser.id}`, JSON.stringify(hiddenFromUserIds));
      } catch {}

      let drawingDataUrl: string | undefined = undefined;
      if (canvasRef.current && hasDrawn) {
        drawingDataUrl = canvasRef.current.toDataURL("image/png");
      }

      const montageData: StoryMediaMontage = {
        filter: activeFilter,
        brightness,
        contrast,
        saturation,
        sepia,
        blur,
        hueRotate,
        aspectRatio: "9:16",
        videoTrimStart: mode === "video" ? videoTrimStart : undefined,
        videoTrimEnd: mode === "video" ? videoTrimEnd : undefined,
        videoSpeed: mode === "video" ? videoSpeed : undefined,
        isMuted: mode === "video" ? isMuted : undefined,
        stickers,
        textOverlays,
        drawingDataUrl
      };

      const textStyleData = mode === "text" ? {
        template: selectedTemplate,
        backgroundGradient: bgGradient,
        textColor: selectedTemplate === "neon_glow" ? "#38bdf8" : selectedTemplate === "cyberpunk" ? "#4ade80" : selectedTemplate === "golden_luxury" ? "#fbbf24" : "#ffffff",
        fontSize,
        textAlign,
        fontFamily: TYPOGRAPHY_TEMPLATES.find((t) => t.id === selectedTemplate)?.fontFamily || "sans-serif",
        highlightCard: true
      } : undefined;

      const anonymousPromptData: StoryAnonymousPrompt | undefined = mode === "anonymous_qa" ? {
        id: "prompt_" + Math.random().toString(36).substring(2, 9),
        question: qaQuestion.trim(),
        stickerStyle: qaStyle
      } : undefined;

      const musicData = musicTitle.trim() ? {
        title: musicTitle.trim(),
        artist: musicArtist.trim() || "Wavegram Audio"
      } : undefined;

      if (isEditing && storyToEdit) {
        const res = await fetch(`/api/stories/${storyToEdit.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            caption,
            captionPosition,
            isCloseFriendsOnly: finalCloseFriendsOnly,
            disableSharing,
            hiddenFromUserIds,
            textContent: mode === "text" ? textContent : undefined,
            textStyle: textStyleData,
            tags,
            location: locationTag,
            music: musicData,
            montage: montageData
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update story.");
        }

        const data = await res.json();
        if (onStoryUpdated) onStoryUpdated(data.story);
        onClose();
      } else {
        const res = await fetch("/api/stories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            userName: currentUser.username,
            userAvatar: currentUser.avatar,
            type: mode,
            mediaUrl: (mode === "image" || mode === "video" || (mode === "anonymous_qa" && mediaUrl)) ? mediaUrl : undefined,
            videoDuration: mode === "video" ? Math.min(60, videoTrimEnd - videoTrimStart) : undefined,
            textContent: mode === "text" ? textContent : undefined,
            textStyle: textStyleData,
            anonymousPrompt: anonymousPromptData,
            caption,
            captionPosition,
            isCloseFriendsOnly: finalCloseFriendsOnly,
            disableSharing,
            hiddenFromUserIds,
            montage: montageData,
            tags,
            location: locationTag,
            music: musicData,
            duration: mode === "video" ? Math.min(60, Math.max(3, videoTrimEnd - videoTrimStart)) : 6
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create story.");
        }

        const data = await res.json();
        onStoryCreated(data.story);
        onClose();
      }
    } catch (err: any) {
      console.error("Story publish error:", err);
      setErrorMessage(err.message || "Failed to publish story.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentFilterObj = FILTER_PRESETS.find((f) => f.id === activeFilter);
  const combinedFilterStyle = `${currentFilterObj?.css !== "none" ? currentFilterObj?.css : ""} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) sepia(${sepia}%) blur(${blur}px) hue-rotate(${hueRotate}deg)`;

  return (
    <div
      id="story-creator-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-xl animate-in fade-in select-none"
    >
      <div className="bg-[#070b19] border border-blue-900/60 rounded-3xl w-full max-w-5xl h-[94vh] max-h-[850px] shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Top Header */}
        <div className="px-3 sm:px-5 py-3 border-b border-blue-950/80 bg-[#09112a] flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-pink-500 flex items-center justify-center shadow-md shadow-cyan-500/20 shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 truncate">
                <span>{isEditing ? "Edit Story" : "Story Studio"}</span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/30 shrink-0">
                  {mode.toUpperCase()}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                Share photos, 60s videos, styled typography, or anonymous Q&A stickers
              </p>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile View Switcher Pill */}
            <div className="flex md:hidden items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setMobileTab("preview")}
                className={`px-2 py-1 rounded-lg transition-all ${
                  mobileTab === "preview"
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("studio")}
                className={`px-2 py-1 rounded-lg transition-all ${
                  mobileTab === "studio"
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Tools
              </button>
            </div>

            {/* Prominent Header Share/Publish Button */}
            <button
              id="header-share-story-btn"
              onClick={handlePublishStory}
              disabled={isSubmitting}
              className="px-3.5 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:to-indigo-500 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-cyan-500/25 active:scale-95 disabled:opacity-50 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Share this story to your 24h feed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-slate-950" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950 stroke-[2.5]" />
                  <span>{isEditing ? "Save" : "Share Story ✨"}</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Prominent Error Toast Alert */}
        {errorMessage && (
          <div className="px-4 py-2.5 bg-rose-500/20 border-b border-rose-500/40 text-rose-200 text-xs flex items-center justify-between animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping shrink-0" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage("")}
              className="text-rose-300 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Content: Left Preview + Right Studio Panel */}
        <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
          
          {/* LEFT: 9:16 Phone Preview Canvas */}
          <div className={`w-full md:w-[380px] lg:w-[420px] bg-black/70 p-3 sm:p-4 flex flex-col items-center justify-start shrink-0 border-b md:border-b-0 md:border-r border-blue-950/80 relative overflow-y-auto ${
            mobileTab === "preview" ? "flex" : "hidden md:flex"
          }`}>
            
            {/* 4-Way Mode Selector */}
            {!isEditing && (
              <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-2xl border border-slate-800/80 mb-3 shadow-inner max-w-full overflow-x-auto">
                <button
                  onClick={() => {
                    setMode("image");
                    setStudioTab("gallery");
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    mode === "image"
                      ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Photo</span>
                </button>

                <button
                  onClick={() => {
                    setMode("video");
                    setStudioTab("gallery");
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    mode === "video"
                      ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Video (≤60s)</span>
                </button>

                <button
                  onClick={() => {
                    setMode("text");
                    setStudioTab("templates");
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    mode === "text"
                      ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>Text</span>
                </button>

                <button
                  onClick={() => {
                    setMode("anonymous_qa");
                    setStudioTab("ngl");
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    mode === "anonymous_qa"
                      ? "bg-gradient-to-r from-pink-600 to-orange-500 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Q&A (NGL)</span>
                </button>
              </div>
            )}

            {/* 9:16 Aspect Ratio Phone Stage */}
            <div
              id="story-phone-preview"
              ref={phonePreviewRef}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onPointerMove={(e) => handleCanvasMove(e.clientX, e.clientY)}
              onPointerUp={handleCanvasRelease}
              onPointerLeave={handleCanvasRelease}
              onTouchMove={(e) => {
                if (e.touches.length > 0) {
                  handleCanvasMove(e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
              onTouchEnd={handleCanvasRelease}
              className="w-[260px] sm:w-[280px] h-[460px] sm:h-[500px] rounded-[32px] overflow-hidden relative shadow-2xl border-4 border-slate-800/80 flex flex-col justify-between select-none"
              style={{
                background:
                  mode === "text"
                    ? bgGradient
                    : mode === "anonymous_qa"
                    ? "linear-gradient(135deg, #180828 0%, #2e0854 50%, #030612 100%)"
                    : "#090d1f"
              }}
            >
              {/* Media Background Render */}
              {mode === "image" && mediaUrl && (
                <div className="absolute inset-0 overflow-hidden">
                  <img
                    src={mediaUrl}
                    alt="Story preview"
                    className="w-full h-full object-cover transition-all"
                    style={{ filter: combinedFilterStyle }}
                  />
                </div>
              )}

              {mode === "video" && mediaUrl && (
                <div className="absolute inset-0 overflow-hidden">
                  <video
                    ref={videoPlayerRef}
                    src={mediaUrl}
                    className="w-full h-full object-cover transition-all"
                    style={{ filter: combinedFilterStyle }}
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    onLoadedMetadata={handleVideoLoadedMetadata}
                  />
                </div>
              )}

              {/* Text Story Typography Render */}
              {mode === "text" && (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center z-10">
                  <div
                    className={`max-w-full p-4 rounded-2xl backdrop-blur-sm ${
                      TYPOGRAPHY_TEMPLATES.find((t) => t.id === selectedTemplate)?.previewClass || "text-white"
                    } ${
                      fontSize === "sm"
                        ? "text-base"
                        : fontSize === "md"
                        ? "text-lg"
                        : fontSize === "lg"
                        ? "text-xl font-bold"
                        : fontSize === "xl"
                        ? "text-2xl font-black"
                        : "text-3xl font-black"
                    }`}
                    style={{
                      textAlign,
                      fontFamily: TYPOGRAPHY_TEMPLATES.find((t) => t.id === selectedTemplate)?.fontFamily
                    }}
                  >
                    {textContent || "Type your message in the text field..."}
                  </div>
                </div>
              )}

              {/* Anonymous Q&A (NGL Style) Card Render */}
              {mode === "anonymous_qa" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-10">
                  {mediaUrl && (
                    <img
                      src={mediaUrl}
                      alt="Story background"
                      className="absolute inset-0 w-full h-full object-cover opacity-40"
                    />
                  )}
                  <div
                    className={`w-full max-w-[240px] rounded-3xl p-4 flex flex-col items-center text-center shadow-2xl relative z-20 ${
                      NGL_STYLES.find((s) => s.id === qaStyle)?.class || "bg-pink-600 text-white"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-2 shadow-inner">
                      <Lock className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">
                      Anonymous Q&A • 100% Secret
                    </span>
                    <h3 className="text-sm font-black leading-snug break-words">
                      {qaQuestion || "Send me anonymous messages!"}
                    </h3>
                    <div className="w-full mt-3 py-2 px-3 rounded-xl bg-black/30 border border-white/20 text-[11px] text-white/70 italic flex items-center justify-between">
                      <span>Send secret message...</span>
                      <MessageCircle className="w-3.5 h-3.5 opacity-60" />
                    </div>
                  </div>
                </div>
              )}

              {/* Drawing Canvas Overlay */}
              <canvas
                ref={canvasRef}
                width={300}
                height={533}
                onMouseDown={isDrawingMode ? startDrawing : undefined}
                onMouseMove={isDrawingMode ? draw : undefined}
                onMouseUp={isDrawingMode ? stopDrawing : undefined}
                onMouseLeave={isDrawingMode ? stopDrawing : undefined}
                onTouchStart={isDrawingMode ? startDrawing : undefined}
                onTouchMove={isDrawingMode ? draw : undefined}
                onTouchEnd={isDrawingMode ? stopDrawing : undefined}
                className={`absolute inset-0 w-full h-full z-20 ${
                  isDrawingMode ? "cursor-crosshair pointer-events-auto" : "pointer-events-none"
                }`}
              />

              {/* Stickers & Emojis Overlays (Draggable) */}
              {stickers.map((stk) => (
                <div
                  key={stk.id}
                  onPointerDown={(e) => handlePointerDown("sticker", stk.id, e)}
                  onTouchStart={(e) => handlePointerDown("sticker", stk.id, e)}
                  style={{
                    left: `${stk.x}%`,
                    top: `${stk.y}%`,
                    transform: `translate(-50%, -50%) scale(${stk.scale}) rotate(${stk.rotation}deg)`
                  }}
                  className="absolute z-20 text-3xl select-none cursor-grab active:cursor-grabbing group/stk drop-shadow-lg touch-none"
                  title="Drag to move sticker"
                >
                  <span>{stk.emoji}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveSticker(stk.id);
                    }}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover/stk:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}

              {/* Text Overlays (Draggable) */}
              {textOverlays.map((txt) => (
                <div
                  key={txt.id}
                  onPointerDown={(e) => handlePointerDown("textOverlay", txt.id, e)}
                  onTouchStart={(e) => handlePointerDown("textOverlay", txt.id, e)}
                  style={{
                    left: `${txt.x}%`,
                    top: `${txt.y}%`,
                    transform: "translate(-50%, -50%)",
                    color: txt.color,
                    backgroundColor: txt.background
                  }}
                  className="absolute z-20 px-3 py-1.5 rounded-xl text-sm font-bold shadow-md cursor-grab active:cursor-grabbing group/txt select-none border border-transparent hover:border-cyan-400/60 transition-all touch-none"
                  title="Drag to move text overlay"
                >
                  <span>{txt.text}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTextOverlay(txt.id);
                    }}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover/txt:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}

              {/* Draggable Caption Overlay */}
              {caption && (
                <div
                  onPointerDown={(e) => handlePointerDown("caption", undefined, e)}
                  onTouchStart={(e) => handlePointerDown("caption", undefined, e)}
                  style={{
                    left: `${captionPosition.x}%`,
                    top: `${captionPosition.y}%`,
                    transform: "translate(-50%, -50%)"
                  }}
                  className="absolute z-30 max-w-[85%] px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-xs font-semibold text-white shadow-xl cursor-grab active:cursor-grabbing hover:border-cyan-400 select-none group/cap transition-all touch-none"
                  title="Drag to position your caption anywhere on the story"
                >
                  <p className="line-clamp-3 text-center leading-snug break-words">
                    {caption}
                  </p>
                  <span className="opacity-0 group-hover/cap:opacity-100 text-[9px] text-cyan-300 text-center font-normal block mt-0.5">
                    ✋ Drag to reposition
                  </span>
                </div>
              )}

              {/* Top Bar Preview */}
              <div className="relative z-30 p-3 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
                <div className="flex items-center gap-2">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.username}
                    className={`w-7 h-7 rounded-full border object-cover ${
                      isCloseFriendsOnly ? "border-emerald-400 ring-2 ring-emerald-500/40" : "border-white/40"
                    }`}
                  />
                  <span className="text-xs font-semibold text-white truncate max-w-[100px]">
                    {currentUser.username}
                  </span>
                  {isCloseFriendsOnly && (
                    <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-md shadow-emerald-500/30">
                      <Star className="w-2.5 h-2.5 fill-slate-950 text-slate-950" />
                      <span>Close Friends</span>
                    </span>
                  )}
                </div>
                {locationTag && (
                  <span className="text-[10px] bg-black/60 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-400/30 truncate max-w-[90px]">
                    {locationTag}
                  </span>
                )}
              </div>

              {/* Bottom Tags & Music Overlay Preview */}
              <div className="relative z-30 p-3 flex flex-col gap-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
                {musicTitle && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-medium truncate">
                    <Music className="w-3 h-3 text-amber-400 shrink-0 animate-bounce" />
                    <span className="truncate">{musicTitle} {musicArtist ? `• ${musicArtist}` : ""}</span>
                  </div>
                )}

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((t) => (
                      <span
                        key={t.id}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-600/80 text-white shadow-sm"
                      >
                        {t.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Empty placeholder prompt when no media is chosen */}
              {(mode === "image" || mode === "video") && !mediaUrl && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 cursor-pointer group/stage hover:bg-white/[0.03] transition-colors"
                  title="Click to select photo or video from device"
                >
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/90 border border-cyan-500/30 group-hover/stage:border-cyan-400 group-hover/stage:scale-105 flex items-center justify-center text-cyan-400 mb-3 shadow-lg shadow-cyan-500/10 transition-all">
                    {mode === "video" ? <Video className="w-8 h-8" /> : <ImageIcon className="w-8 h-8" />}
                  </div>
                  <p className="text-sm font-bold text-white group-hover/stage:text-cyan-300 transition-colors">
                    Select {mode === "video" ? "Video (≤60s)" : "Photo"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Tap to open Gallery or choose a preset
                  </p>
                  <span className="mt-3 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/30">
                    Open File Chooser
                  </span>
                </div>
              )}
            </div>

            {/* Quick Share Action Box below Preview */}
            <div className="w-full max-w-[340px] mt-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 flex flex-col gap-2.5 shadow-xl shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a story caption..."
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Main Quick Share Button */}
              <button
                id="quick-share-story-btn"
                onClick={handlePublishStory}
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:to-indigo-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Publishing Story...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                    <span>{isEditing ? "Save Modifications" : "Share to Story ✨"}</span>
                  </>
                )}
              </button>

              {/* Quick Studio Shortcuts */}
              <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-800/60">
                {(mode === "image" || mode === "video") && (
                  <button
                    type="button"
                    onClick={() => {
                      setStudioTab("filters");
                      setMobileTab("studio");
                    }}
                    className="py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Filters</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setStudioTab("stickers");
                    setMobileTab("studio");
                  }}
                  className="py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Smile className="w-3 h-3 text-amber-400" />
                  <span>Stickers</span>
                </button>

                {mode === "image" && (
                  <button
                    type="button"
                    onClick={() => setShowPhotoEditor(true)}
                    className="py-1.5 px-2 rounded-lg bg-indigo-600/30 border border-indigo-500/40 hover:bg-indigo-600/50 text-indigo-200 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Paintbrush className="w-3 h-3 text-indigo-400" />
                    <span>Photo Studio</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setStudioTab("tags");
                    setMobileTab("studio");
                  }}
                  className="py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <AtSign className="w-3 h-3 text-pink-400" />
                  <span>Tags & Music</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Studio Control Dashboard */}
          <div className={`flex-1 flex flex-col bg-[#070a18] overflow-y-auto ${
            mobileTab === "studio" ? "flex" : "hidden md:flex"
          }`}>
            
            {/* Studio Navigation Bar */}
            <div className="flex items-center gap-1 p-2 border-b border-blue-950/80 overflow-x-auto scrollbar-none bg-[#09112a]/50">
              {(mode === "image" || mode === "video" || mode === "anonymous_qa") && (
                <button
                  onClick={() => setStudioTab("gallery")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                    studioTab === "gallery"
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Gallery & Upload</span>
                </button>
              )}

              {mode === "anonymous_qa" && (
                <button
                  onClick={() => setStudioTab("ngl")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                    studioTab === "ngl"
                      ? "bg-pink-500/20 text-pink-400 border border-pink-500/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Q&A Prompt</span>
                </button>
              )}

              {mode === "text" && (
                <button
                  onClick={() => setStudioTab("templates")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                    studioTab === "templates"
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>Typography Models</span>
                </button>
              )}

              {(mode === "image" || mode === "video") && (
                <>
                  <button
                    onClick={() => setStudioTab("filters")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                      studioTab === "filters"
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Filters</span>
                  </button>

                  <button
                    onClick={() => setStudioTab("adjust")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                      studioTab === "adjust"
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Color Adjust</span>
                  </button>
                </>
              )}

              {mode === "video" && (
                <button
                  onClick={() => setStudioTab("video")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                    studioTab === "video"
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Video Montage (≤60s)</span>
                </button>
              )}

              <button
                onClick={() => setStudioTab("stickers")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                  studioTab === "stickers"
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Smile className="w-3.5 h-3.5" />
                <span>Stickers & Text</span>
              </button>

              <button
                onClick={() => {
                  setStudioTab("draw");
                  setIsDrawingMode(true);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                  studioTab === "draw"
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Paintbrush className="w-3.5 h-3.5" />
                <span>Draw</span>
              </button>

              <button
                onClick={() => setStudioTab("tags")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                  studioTab === "tags"
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <AtSign className="w-3.5 h-3.5" />
                <span>Tags & Music</span>
              </button>

              <button
                onClick={() => setStudioTab("privacy")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                  studioTab === "privacy"
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Privacy & Hide</span>
              </button>
            </div>

            {/* Upload Success Banner */}
            {uploadSuccessToast && (
              <div className="mx-5 mt-3 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">{uploadSuccessToast}</span>
                </div>
                <button onClick={() => setUploadSuccessToast("")}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Error Message Banner */}
            {errorMessage && (
              <div className="mx-5 mt-3 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
                <span>{errorMessage}</span>
                <button onClick={() => setErrorMessage("")}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Tab Body */}
            <div className="p-5 flex-1 flex flex-col gap-5">
              
              {/* TAB 1: GALLERY & DEVICE UPLOAD */}
              {studioTab === "gallery" && (
                <div className="flex flex-col gap-4">
                  {/* Hidden Native File Inputs */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <input
                    type="file"
                    ref={photoInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <input
                    type="file"
                    ref={videoInputRef}
                    accept="video/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <input
                    type="file"
                    ref={cameraInputRef}
                    accept="image/*,video/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  {/* Direct File Picker Trigger Card */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 rounded-3xl bg-slate-900/80 border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 hover:bg-slate-900 flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all shadow-inner group/upload"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 group-hover/upload:scale-110 transition-transform">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover/upload:text-cyan-300 transition-colors">
                        Click to Browse Gallery or Drop Files Here
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Supports high-res JPG, PNG, WEBP, and MP4 / WebM videos up to 60 seconds
                      </p>
                    </div>

                    {/* Quick Choice Buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => photoInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-cyan-300 font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <ImageIcon className="w-4 h-4 text-cyan-400" />
                        <span>Choose Photo</span>
                      </button>

                      <button
                        onClick={() => videoInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-300 font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <Video className="w-4 h-4 text-purple-400" />
                        <span>Choose Video (≤60s)</span>
                      </button>

                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-pink-600/30 hover:bg-pink-600/50 border border-pink-500/40 text-pink-300 font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <Camera className="w-4 h-4 text-pink-400" />
                        <span>Snap Camera</span>
                      </button>

                      <button
                        onClick={() => setShowPhotoEditor(true)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-cyan-500/30 active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <Paintbrush className="w-4 h-4 text-cyan-200" />
                        <span>Draw & Write on Photo 🎨</span>
                      </button>
                    </div>
                  </div>

                  {/* Direct Web URL Loader */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Or Import from Web Link / Image URL
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleLoadMediaUrl()}
                        placeholder="Paste image or video link (https://...)"
                        className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        onClick={handleLoadMediaUrl}
                        className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md active:scale-95 transition-all"
                      >
                        Load
                      </button>
                    </div>
                  </div>

                  {/* Ready-made HD Photo Presets */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Curated High-Resolution Photo Presets
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2">
                      {HD_PHOTO_PRESETS.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setMediaUrl(item.url);
                            setMode("image");
                            setStudioTab("filters");
                            setUploadSuccessToast(`Loaded preset: ${item.title}`);
                            setTimeout(() => setUploadSuccessToast(""), 3000);
                          }}
                          className="group relative rounded-2xl overflow-hidden aspect-[9/16] border border-slate-800 hover:border-cyan-400 transition-all shadow-md active:scale-95"
                        >
                          <img
                            src={item.url}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                            <span className="text-[10px] font-bold text-white truncate">{item.title}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ready-made Video Presets */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Curated HD Video Story Presets (≤60s)
                    </label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {HD_VIDEO_PRESETS.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setMediaUrl(item.url);
                            setMode("video");
                            setVideoDuration(item.duration);
                            setVideoTrimStart(0);
                            setVideoTrimEnd(item.duration);
                            setStudioTab("video");
                            setUploadSuccessToast(`Loaded video preset: ${item.title}`);
                            setTimeout(() => setUploadSuccessToast(""), 3000);
                          }}
                          className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-400 text-left transition-all active:scale-95"
                        >
                          <div className="flex items-center gap-2 text-xs font-bold text-white">
                            <Video className="w-4 h-4 text-cyan-400" />
                            <span>{item.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">Duration: {item.duration}s</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ANONYMOUS Q&A (NGL) */}
              {studioTab === "ngl" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Anonymous Question Prompt
                    </label>
                    <input
                      type="text"
                      value={qaQuestion}
                      onChange={(e) => setQaQuestion(e.target.value)}
                      placeholder="e.g. Ask me anything honestly 🤫"
                      className="w-full mt-1.5 p-3 rounded-2xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  {/* Suggestion Prompts */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Instant Prompt Templates
                    </label>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {NGL_QUESTION_PRESETS.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => setQaQuestion(q)}
                          className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                            qaQuestion === q
                              ? "bg-pink-500/20 border-pink-400 text-pink-300"
                              : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sticker Theme Styles */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      NGL Card Theme
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      {NGL_STYLES.map((st) => (
                        <button
                          key={st.id}
                          onClick={() => setQaStyle(st.id)}
                          className={`p-3 rounded-2xl text-left border transition-all ${
                            qaStyle === st.id
                              ? "bg-pink-500/20 border-pink-400 shadow-md shadow-pink-500/20"
                              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="text-xs font-bold text-white flex items-center justify-between">
                            <span>{st.name}</span>
                            {qaStyle === st.id && <Check className="w-3.5 h-3.5 text-pink-400" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-xs text-pink-200 flex items-center gap-2">
                    <Lock className="w-4 h-4 shrink-0 text-pink-400" />
                    <span>
                      Replies sent to this story will be completely anonymous! Only you will see the incoming responses in your private inbox, and you can choose to share them publicly.
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 3: TYPOGRAPHY MODELS (Text Story Mode) */}
              {mode === "text" && studioTab === "templates" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Story Text Message
                    </label>
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Type what's on your mind, quotes, announcements, reflections..."
                      rows={3}
                      className="w-full mt-1.5 p-3 rounded-2xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-cyan-400/80 resize-none"
                    />
                  </div>

                  {/* Typography Template Picker */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Typography Model Preset
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      {TYPOGRAPHY_TEMPLATES.map((tmpl) => (
                        <button
                          key={tmpl.id}
                          onClick={() => setSelectedTemplate(tmpl.id)}
                          className={`p-2.5 rounded-2xl text-left border transition-all ${
                            selectedTemplate === tmpl.id
                              ? "bg-cyan-500/15 border-cyan-400 shadow-md shadow-cyan-500/20"
                              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="text-xs font-bold text-white truncate">{tmpl.name}</div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">{tmpl.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background Gradient Palette */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Background Gradient
                    </label>
                    <div className="flex items-center gap-2 mt-2 overflow-x-auto py-1">
                      {GRADIENTS.map((grad, i) => (
                        <button
                          key={i}
                          onClick={() => setBgGradient(grad)}
                          style={{ background: grad }}
                          className={`w-9 h-9 rounded-xl shrink-0 border-2 transition-transform hover:scale-110 ${
                            bgGradient === grad ? "border-cyan-400 scale-110 shadow-md shadow-cyan-400/40" : "border-transparent"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Font Size & Alignment */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Font Size
                      </label>
                      <div className="flex items-center gap-1 mt-1.5">
                        {(["sm", "md", "lg", "xl", "2xl"] as const).map((sz) => (
                          <button
                            key={sz}
                            onClick={() => setFontSize(sz)}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${
                              fontSize === sz
                                ? "bg-cyan-500 text-white shadow-sm"
                                : "bg-slate-900 text-slate-400 hover:text-white"
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Alignment
                      </label>
                      <div className="flex items-center gap-1 mt-1.5">
                        {(["left", "center", "right"] as const).map((al) => (
                          <button
                            key={al}
                            onClick={() => setTextAlign(al)}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                              textAlign === al
                                ? "bg-cyan-500 text-white shadow-sm"
                                : "bg-slate-900 text-slate-400 hover:text-white"
                            }`}
                          >
                            {al}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: MONTAGE FILTERS */}
              {(mode === "image" || mode === "video") && studioTab === "filters" && (
                <div className="flex flex-col gap-4">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Advanced Color Presets & Filter Moods
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {FILTER_PRESETS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setActiveFilter(f.id)}
                        className={`p-3 rounded-2xl text-left border transition-all ${
                          activeFilter === f.id
                            ? "bg-cyan-500/20 border-cyan-400 shadow-md shadow-cyan-400/20"
                            : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="text-xs font-bold text-white flex items-center justify-between">
                          <span>{f.name}</span>
                          {activeFilter === f.id && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 truncate">
                          {f.css === "none" ? "Original balance" : f.css}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: COLOR ADJUSTMENTS */}
              {studioTab === "adjust" && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Fine-Tuning Color Montage Sliders
                    </label>
                    <button
                      onClick={() => {
                        setBrightness(100);
                        setContrast(100);
                        setSaturation(100);
                        setSepia(0);
                        setBlur(0);
                        setHueRotate(0);
                      }}
                      className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset All</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                      <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
                        <span>Brightness</span>
                        <span>{brightness}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={brightness}
                        onChange={(e) => setBrightness(Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                      <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
                        <span>Contrast</span>
                        <span>{contrast}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={contrast}
                        onChange={(e) => setContrast(Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                      <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
                        <span>Saturation</span>
                        <span>{saturation}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={saturation}
                        onChange={(e) => setSaturation(Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                      <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
                        <span>Warm Sepia</span>
                        <span>{sepia}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={sepia}
                        onChange={(e) => setSepia(Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                      <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
                        <span>Soft Blur</span>
                        <span>{blur}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="8"
                        step="0.5"
                        value={blur}
                        onChange={(e) => setBlur(Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                      <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
                        <span>Hue Shift</span>
                        <span>{hueRotate}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={hueRotate}
                        onChange={(e) => setHueRotate(Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: VIDEO MONTAGE (≤60s Trim & Speed) */}
              {mode === "video" && studioTab === "video" && (
                <div className="flex flex-col gap-4">
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-blue-900/40">
                    <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Scissors className="w-4 h-4" />
                      <span>Video Trimmer (Strict 60 Seconds Max)</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Total Duration: <strong className="text-white">{videoDuration}s</strong> • Trimmed Length: <strong className="text-cyan-400">{Math.max(1, videoTrimEnd - videoTrimStart)}s</strong>
                    </p>

                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <div className="flex justify-between text-xs text-slate-300 font-medium mb-1">
                          <span>Start Time</span>
                          <span>{videoTrimStart}s</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={Math.max(1, videoDuration - 1)}
                          value={videoTrimStart}
                          onChange={(e) => {
                            const newStart = Number(e.target.value);
                            setVideoTrimStart(newStart);
                            if (videoTrimEnd - newStart > 60) {
                              setVideoTrimEnd(newStart + 60);
                            }
                          }}
                          className="w-full accent-cyan-400"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-slate-300 font-medium mb-1">
                          <span>End Time</span>
                          <span>{videoTrimEnd}s</span>
                        </div>
                        <input
                          type="range"
                          min={Math.min(videoTrimStart + 1, videoDuration)}
                          max={Math.min(videoTrimStart + 60, videoDuration || 60)}
                          value={videoTrimEnd}
                          onChange={(e) => setVideoTrimEnd(Number(e.target.value))}
                          className="w-full accent-cyan-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                        Playback Speed
                      </label>
                      <div className="flex items-center gap-1">
                        {[0.5, 1, 1.25, 1.5, 2].map((spd) => (
                          <button
                            key={spd}
                            onClick={() => {
                              setVideoSpeed(spd);
                              if (videoPlayerRef.current) videoPlayerRef.current.playbackRate = spd;
                            }}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              videoSpeed === spd
                                ? "bg-cyan-500 text-white shadow-sm"
                                : "bg-slate-800 text-slate-400 hover:text-white"
                            }`}
                          >
                            {spd}x
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                          Audio Track
                        </label>
                        <span className="text-[11px] text-slate-400">
                          {isMuted ? "Audio muted" : "Audio active"}
                        </span>
                      </div>
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className={`p-2.5 rounded-xl border transition-all ${
                          isMuted
                            ? "bg-red-500/20 text-red-400 border-red-500/40"
                            : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        }`}
                      >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: STICKERS & TEXT */}
              {studioTab === "stickers" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Tap to Add Emoji Sticker
                    </label>
                    <div className="flex flex-wrap gap-2 mt-2 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                      {QUICK_EMOJIS.map((em) => (
                        <button
                          key={em}
                          onClick={() => handleAddEmojiSticker(em)}
                          className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-sm"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-2.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Add Custom Text Overlay Badge
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newOverlayText}
                        onChange={(e) => setNewOverlayText(e.target.value)}
                        placeholder="e.g. Special Launch 🚀, Weekend Vibes..."
                        className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        onClick={handleAddTextOverlay}
                        className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md active:scale-95 transition-all"
                      >
                        Add Text
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 8: DRAW & DOODLE */}
              {studioTab === "draw" && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Freehand Drawing on Canvas
                    </label>
                    <button
                      onClick={clearCanvas}
                      className="text-xs text-red-400 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Canvas</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {["#22d3ee", "#ec4899", "#fbbf24", "#34d399", "#a855f7", "#ffffff", "#000000", "#ef4444"].map((col) => (
                      <button
                        key={col}
                        onClick={() => setBrushColor(col)}
                        style={{ backgroundColor: col }}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${
                          brushColor === col ? "border-white scale-110 shadow-md shadow-white/30" : "border-slate-800"
                        }`}
                      />
                    ))}
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                    <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
                      <span>Brush Thickness</span>
                      <span>{brushSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="20"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  <p className="text-xs text-slate-400 italic">
                    💡 Click and drag directly on the left preview screen to draw doodles!
                  </p>
                </div>
              )}

              {/* TAB 9: TAGS, MENTIONS & MUSIC */}
              {studioTab === "tags" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Tag Friends (@mention)
                      </label>
                      <button
                        onClick={() => setShowFriendPicker(!showFriendPicker)}
                        className="text-xs text-cyan-400 font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Select User</span>
                      </button>
                    </div>

                    {showFriendPicker && (
                      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-2 mb-3">
                        <input
                          type="text"
                          value={friendSearch}
                          onChange={(e) => setFriendSearch(e.target.value)}
                          placeholder="Search friends by name..."
                          className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                        />
                        <div className="max-h-32 overflow-y-auto flex flex-col gap-1">
                          {allUsers
                            .filter((u) => u.id !== currentUser.id && u.username.toLowerCase().includes(friendSearch.toLowerCase()))
                            .map((u) => (
                              <button
                                key={u.id}
                                onClick={() => handleAddFriendTag(u)}
                                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800 text-left transition-colors"
                              >
                                <img src={u.avatar} alt={u.username} className="w-6 h-6 rounded-full object-cover" />
                                <span className="text-xs text-slate-200 font-medium">{u.username}</span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Add Hashtags (#tag)
                    </label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <input
                        type="text"
                        value={hashtagInput}
                        onChange={(e) => setHashtagInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddHashtag()}
                        placeholder="#WavegramLaunch, #DesignSprint..."
                        className="flex-1 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        onClick={handleAddHashtag}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Location Tag (📍)
                    </label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <input
                        type="text"
                        value={customLocationInput}
                        onChange={(e) => setCustomLocationInput(e.target.value)}
                        placeholder="Type custom location..."
                        className="flex-1 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none"
                      />
                      <button
                        onClick={() => handleAddLocation(customLocationInput)}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                      >
                        Set
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {POPULAR_LOCATIONS.map((loc) => (
                        <button
                          key={loc}
                          onClick={() => handleAddLocation(loc)}
                          className={`text-[11px] px-2.5 py-1 rounded-xl border transition-all ${
                            locationTag === loc
                              ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          📍 {loc}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Music Sound Tag (🎵)
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      <input
                        type="text"
                        value={musicTitle}
                        onChange={(e) => setMusicTitle(e.target.value)}
                        placeholder="Song Title (e.g. Golden Hour)"
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none"
                      />
                      <input
                        type="text"
                        value={musicArtist}
                        onChange={(e) => setMusicArtist(e.target.value)}
                        placeholder="Artist (e.g. Wavegram Beats)"
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {tags.length > 0 && (
                    <div>
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Active Attached Tags
                      </label>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {tags.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-200"
                          >
                            <span>{t.label}</span>
                            <button
                              onClick={() => handleRemoveTag(t.id)}
                              className="text-blue-300 hover:text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: PRIVACY & AUDIENCE CONTROLS */}
              {studioTab === "privacy" && (
                <div className="flex flex-col gap-4 animate-in fade-in">
                  {/* Close Friends Toast */}
                  {closeFriendsSavedToast && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                      <Star className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                      <span>{closeFriendsSavedToast}</span>
                    </div>
                  )}

                  {/* Hidden List Toast */}
                  {hiddenSavedToast && (
                    <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                      <Check className="w-4 h-4 text-cyan-400" />
                      <span>{hiddenSavedToast}</span>
                    </div>
                  )}

                  {/* 1. Manage Close Friends List */}
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-950/80 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Star className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                        <h4 className="text-xs font-bold text-white">
                          Manage Close Friends ({closeFriends.length})
                        </h4>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold">
                        Green Ring ⭐
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Add your closest contacts here. Stories shared to "Close Friends" are only visible to these selected users with an emerald ring.
                    </p>

                    <input
                      type="text"
                      value={closeFriendsSearch}
                      onChange={(e) => setCloseFriendsSearch(e.target.value)}
                      placeholder="Search contacts for Close Friends..."
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-400"
                    />

                    <div className="max-h-44 overflow-y-auto flex flex-col gap-1.5 pr-1">
                      {allUsers
                        .filter((u) => u.id !== currentUser.id)
                        .filter(
                          (u) =>
                            u.username.toLowerCase().includes(closeFriendsSearch.toLowerCase()) ||
                            (u.email && u.email.toLowerCase().includes(closeFriendsSearch.toLowerCase()))
                        )
                        .map((u) => {
                          const isCF = closeFriends.includes(u.id);
                          return (
                            <div
                              key={u.id}
                              onClick={() => handleToggleCloseFriend(u.id)}
                              className={`p-2 rounded-xl flex items-center justify-between cursor-pointer border transition-colors ${
                                isCF
                                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                                  : "bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <img
                                  src={u.avatar}
                                  alt={u.username}
                                  className="w-6 h-6 rounded-full object-cover border border-white/10"
                                />
                                <div className="flex flex-col">
                                  <span className="text-xs font-semibold">{u.username}</span>
                                  <span className="text-[10px] text-slate-400">{u.status || "online"}</span>
                                </div>
                              </div>
                              <div
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                                  isCF
                                    ? "bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/30"
                                    : "bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"
                                }`}
                              >
                                <Star className={`w-3 h-3 ${isCF ? "fill-slate-950 text-slate-950" : "text-slate-400"}`} />
                                <span>{isCF ? "Added" : "Add"}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveCloseFriendsList}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Save Close Friends & Apply</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Disable Sharing in Chats */}
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">
                            Block Story Sharing in Chats
                          </h4>
                          <p className="text-[11px] text-slate-400 leading-snug">
                            When enabled, other users cannot forward or send your story into direct or group chats.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDisableSharing(!disableSharing)}
                        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                          disableSharing ? "bg-amber-500" : "bg-slate-700"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                            disableSharing ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 3. Hide from specific users */}
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-cyan-400">
                        <EyeOff className="w-4 h-4" />
                        <h4 className="text-xs font-bold text-white">
                          Hide Story from Specific Users ({hiddenFromUserIds.length})
                        </h4>
                      </div>
                      {hiddenFromUserIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setHiddenFromUserIds([])}
                          className="text-[10px] text-red-400 hover:text-red-300 font-medium"
                        >
                          Clear Hidden List
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Selected contacts will not be able to view this story anywhere in their feed or profile.
                    </p>

                    <input
                      type="text"
                      value={hideSearch}
                      onChange={(e) => setHideSearch(e.target.value)}
                      placeholder="Search users to hide this story from..."
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-400"
                    />

                    <div className="max-h-44 overflow-y-auto flex flex-col gap-1.5 pr-1">
                      {allUsers
                        .filter((u) => u.id !== currentUser.id)
                        .filter(
                          (u) =>
                            u.username.toLowerCase().includes(hideSearch.toLowerCase()) ||
                            (u.email && u.email.toLowerCase().includes(hideSearch.toLowerCase()))
                        )
                        .map((u) => {
                          const isHidden = hiddenFromUserIds.includes(u.id);
                          return (
                            <div
                              key={u.id}
                              onClick={() => {
                                if (isHidden) {
                                  setHiddenFromUserIds(hiddenFromUserIds.filter((id) => id !== u.id));
                                } else {
                                  setHiddenFromUserIds([...hiddenFromUserIds, u.id]);
                                }
                              }}
                              className={`p-2 rounded-xl flex items-center justify-between cursor-pointer border transition-colors ${
                                isHidden
                                  ? "bg-red-500/10 border-red-500/40 text-red-300"
                                  : "bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <img
                                  src={u.avatar}
                                  alt={u.username}
                                  className="w-6 h-6 rounded-full object-cover border border-white/10"
                                />
                                <div className="flex flex-col">
                                  <span className="text-xs font-semibold">{u.username}</span>
                                </div>
                              </div>
                              <div
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                                  isHidden
                                    ? "bg-red-500 text-white"
                                    : "border border-slate-700 bg-slate-800 text-slate-400"
                                }`}
                              >
                                {isHidden ? (
                                  <>
                                    <Check className="w-3 h-3 stroke-[3]" />
                                    <span>Hidden</span>
                                  </>
                                ) : (
                                  <span>Hide</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveHiddenList}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-95 transition-all"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Save Modifications & Apply</span>
                      </button>
                      {hiddenFromUserIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setHiddenFromUserIds([])}
                          className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-red-400 text-xs font-semibold"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Caption & Audience Publish Bar */}
              <div className="mt-auto pt-4 border-t border-blue-950/80 flex flex-col gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Story Caption
                    </label>
                    <span className="text-[10px] text-cyan-400">
                      Drag caption on preview to move
                    </span>
                  </div>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a captivating story caption..."
                    className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Audience Selection Pills */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Audience:</span>
                    {hiddenFromUserIds.length > 0 && (
                      <span className="text-[10px] text-red-400 flex items-center gap-1 font-medium">
                        <EyeOff className="w-3 h-3" />
                        <span>Hidden from {hiddenFromUserIds.length} contact{hiddenFromUserIds.length === 1 ? '' : 's'}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCloseFriendsOnly(false)}
                      className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        !isCloseFriendsOnly
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-400/40"
                          : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <div className="flex flex-col items-center">
                        <span>All Chats List</span>
                        {hiddenFromUserIds.length > 0 && (
                          <span className="text-[9px] opacity-75 font-normal">({hiddenFromUserIds.length} hidden)</span>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (closeFriends.length === 0) {
                          setStudioTab("privacy");
                        } else {
                          setIsCloseFriendsOnly(true);
                        }
                      }}
                      className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        isCloseFriendsOnly
                          ? "bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 font-black shadow-md shadow-emerald-500/30 border border-emerald-400/60"
                          : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-emerald-300"
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isCloseFriendsOnly ? "fill-slate-950 text-slate-950" : "text-emerald-400"}`} />
                      <div className="flex flex-col items-center">
                        <span>Close Friends ⭐</span>
                        <span className="text-[9px] opacity-80 font-normal">
                          {closeFriends.length > 0 ? `(${closeFriends.length} friend${closeFriends.length === 1 ? '' : 's'})` : "(Set list)"}
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={onClose}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold shrink-0"
                  >
                    Cancel
                  </button>

                  {/* Actions depending on editing or new story */}
                  {isEditing ? (
                    <button
                      id="publish-story-btn"
                      onClick={() => handlePublishStory()}
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-50 transition-all bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-cyan-500/20"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Save Modifications</span>
                        </>
                      )}
                    </button>
                  ) : closeFriends.length > 0 ? (
                    <div className="flex items-center gap-2 flex-1">
                      <button
                        id="publish-all-story-btn"
                        onClick={() => handlePublishStory(false)}
                        disabled={isSubmitting}
                        className="flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center shadow-lg active:scale-95 disabled:opacity-50 transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20 border border-blue-400/30"
                      >
                        <div className="flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5" />
                          <span>All Chats</span>
                        </div>
                        <span className="text-[9px] opacity-75 font-normal">
                          {hiddenFromUserIds.length > 0 ? `(${hiddenFromUserIds.length} hidden)` : "Everyone"}
                        </span>
                      </button>

                      <button
                        id="publish-cf-story-btn"
                        onClick={() => handlePublishStory(true)}
                        disabled={isSubmitting}
                        className="flex-1 py-2 px-2.5 rounded-xl text-xs font-black flex flex-col items-center justify-center shadow-lg active:scale-95 disabled:opacity-50 transition-all bg-gradient-to-r from-emerald-400 via-green-500 to-lime-400 text-slate-950 shadow-emerald-500/25 hover:brightness-110 border border-emerald-300/40"
                      >
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-slate-950" />
                          <span>Close Friends ⭐</span>
                        </div>
                        <span className="text-[9px] text-slate-900 font-bold">
                          ({closeFriends.length} contacts)
                        </span>
                      </button>
                    </div>
                  ) : (
                    <button
                      id="publish-story-btn"
                      onClick={() => handlePublishStory()}
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-50 transition-all bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-cyan-500/20"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Publishing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Publish Story</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Photo Studio Editor Overlay */}
        {showPhotoEditor && (
          <PhotoEditorModal
            initialImageUrl={mediaUrl || undefined}
            currentUser={currentUser}
            onClose={() => setShowPhotoEditor(false)}
            onSendToChat={() => {}}
            onPostAsStory={(editedMediaUrl, storyCaption) => {
              setMediaUrl(editedMediaUrl);
              setMode("image");
              setStudioTab("filters");
              if (storyCaption) setCaption(storyCaption);
              setShowPhotoEditor(false);
              setUploadSuccessToast("Artwork loaded from Photo Studio!");
              setTimeout(() => setUploadSuccessToast(""), 3000);
            }}
          />
        )}

      </div>
    </div>
  );
};
