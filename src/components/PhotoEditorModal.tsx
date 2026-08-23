import React, { useState, useRef, useEffect } from "react";
import { User, StoryTextOverlay } from "../types";
import {
  X,
  Type,
  PenTool,
  Sparkles,
  Sliders,
  Download,
  Send,
  Plus,
  Trash2,
  Check,
  RotateCw,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Smile,
  Image as ImageIcon,
  Flame,
  Zap,
  Star,
  Heart,
  Volume2
} from "lucide-react";

interface PhotoEditorModalProps {
  initialImageUrl?: string;
  currentUser: User;
  onClose: () => void;
  onSendToChat: (mediaUrl: string, caption?: string) => void;
  onPostAsStory?: (mediaUrl: string, caption?: string) => void;
}

const COLOR_PALETTE = [
  "#FFFFFF", // White
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#EC4899", // Pink
  "#8B5CF6", // Purple
  "#000000"  // Black
];

const FONT_FAMILIES = [
  { id: "sans", name: "Modern Sans", css: "font-sans font-bold" },
  { id: "impact", name: "Impact Bold", css: "font-black tracking-tight uppercase" },
  { id: "serif", name: "Editorial Serif", css: "font-serif italic font-semibold" },
  { id: "mono", name: "Typewriter", css: "font-mono font-medium tracking-wide" },
  { id: "cursive", name: "Handwritten", css: "font-serif tracking-widest font-normal" }
];

const BACKGROUND_STYLES: { id: "none" | "box" | "pill" | "outline" | "highlight"; name: string }[] = [
  { id: "box", name: "Solid Box" },
  { id: "pill", name: "Rounded Pill" },
  { id: "highlight", name: "Glowing Glow" },
  { id: "outline", name: "Border Outline" },
  { id: "none", name: "Pure Text" }
];

const PRESET_STICKERS = ["🔥", "✨", "❤️", "⚡", "🚀", "👑", "🎉", "💯", "🌊", "😎", "🌟", "💬"];

const PHOTO_FILTERS = [
  { id: "normal", name: "Normal", filter: "none" },
  { id: "vivid", name: "Vivid Boost", filter: "contrast(125%) saturate(140%)" },
  { id: "warm", name: "Warm Sunset", filter: "sepia(25%) saturate(130%) hue-rotate(-10deg)" },
  { id: "cool", name: "Glacier Chill", filter: "saturate(110%) hue-rotate(15deg) brightness(105%)" },
  { id: "noir", name: "Noir Black & White", filter: "grayscale(100%) contrast(130%)" },
  { id: "vintage", name: "Retro Vintage", filter: "sepia(50%) contrast(90%) brightness(105%)" }
];

export const PhotoEditorModal: React.FC<PhotoEditorModalProps> = ({
  initialImageUrl,
  currentUser,
  onClose,
  onSendToChat,
  onPostAsStory
}) => {
  const [imageSrc, setImageSrc] = useState<string>(initialImageUrl || "");
  const [activeTab, setActiveTab] = useState<"text" | "draw" | "stickers" | "filters">("text");

  // Text Overlays
  const [textOverlays, setTextOverlays] = useState<StoryTextOverlay[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [draggedTextId, setDraggedTextId] = useState<string | null>(null);

  // Current editing text state
  const [editingText, setEditingText] = useState("");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [fontFamily, setFontFamily] = useState("sans");
  const [fontSize, setFontSize] = useState(26);
  const [bgStyle, setBgStyle] = useState<"none" | "box" | "pill" | "outline" | "highlight">("box");
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("center");

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState("#06B6D4");
  const [brushSize, setBrushSize] = useState(6);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Filter state
  const [activeFilter, setActiveFilter] = useState("normal");

  // Caption state
  const [caption, setCaption] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  // Global pointer dragging effect for effortless, smooth positioning
  useEffect(() => {
    if (!draggedTextId || !containerRef.current) return;

    const handlePointerMove = (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.round(Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100)));
      const y = Math.round(Math.max(5, Math.min(95, ((clientY - rect.top) / rect.height) * 100)));

      setTextOverlays((prev) =>
        prev.map((t) => (t.id === draggedTextId ? { ...t, x, y } : t))
      );
    };

    const onPointerMove = (e: PointerEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onPointerUp = () => {
      setDraggedTextId(null);
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
  }, [draggedTextId]);

  // Handle image upload from computer or phone gallery
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Add new text overlay
  const handleAddText = () => {
    const newText: StoryTextOverlay = {
      id: "txt_" + Date.now(),
      text: "Tap to edit text",
      x: 50,
      y: 40 + textOverlays.length * 10,
      color: textColor,
      fontSize: fontSize,
      fontFamily: fontFamily,
      bgStyle: bgStyle,
      align: textAlign
    };
    setTextOverlays((prev) => [...prev, newText]);
    setSelectedTextId(newText.id);
    setEditingText("Tap to edit text");
  };

  // Update selected text
  const updateSelectedText = (updates: Partial<StoryTextOverlay>) => {
    if (!selectedTextId) return;
    setTextOverlays((prev) =>
      prev.map((t) => (t.id === selectedTextId ? { ...t, ...updates } : t))
    );
  };

  // Delete selected text
  const handleDeleteText = (id: string) => {
    setTextOverlays((prev) => prev.filter((t) => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  // Add emoji sticker
  const handleAddSticker = (emoji: string) => {
    const newText: StoryTextOverlay = {
      id: "stk_" + Date.now(),
      text: emoji,
      x: 50,
      y: 50,
      color: "#FFFFFF",
      fontSize: 48,
      fontFamily: "sans",
      bgStyle: "none",
      align: "center"
    };
    setTextOverlays((prev) => [...prev, newText]);
    setSelectedTextId(newText.id);
  };

  // Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (activeTab !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.beginPath();
    ctx.moveTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTab !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.lineTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Render combined high-res image
  const renderComposedImage = async (): Promise<string> => {
    return new Promise((resolve) => {
      const offscreenCanvas = document.createElement("canvas");
      const ctx = offscreenCanvas.getContext("2d");
      if (!ctx) {
        resolve(imageSrc);
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        offscreenCanvas.width = img.naturalWidth || 800;
        offscreenCanvas.height = img.naturalHeight || 1000;

        // 1. Draw base image with filter
        const selectedFilterObj = PHOTO_FILTERS.find((f) => f.id === activeFilter);
        ctx.filter = selectedFilterObj ? selectedFilterObj.filter : "none";
        ctx.drawImage(img, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        ctx.filter = "none";

        // 2. Draw brush drawings
        if (canvasRef.current && hasDrawn) {
          ctx.drawImage(canvasRef.current, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        }

        // 3. Draw text overlays & stickers
        textOverlays.forEach((t) => {
          const x = (t.x / 100) * offscreenCanvas.width;
          const y = (t.y / 100) * offscreenCanvas.height;

          // Scale font size proportionally
          const scaledFontSize = Math.max(18, (t.fontSize / 350) * offscreenCanvas.width);

          ctx.font = `bold ${scaledFontSize}px sans-serif`;
          ctx.textAlign = t.align || "center";
          ctx.textBaseline = "middle";

          // Calculate text dimensions for background box
          const textMetrics = ctx.measureText(t.text);
          const textWidth = textMetrics.width;
          const textHeight = scaledFontSize * 1.3;

          if (t.bgStyle === "box" || t.bgStyle === "pill") {
            ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
            const paddingX = scaledFontSize * 0.4;
            const paddingY = scaledFontSize * 0.2;

            let boxX = x - textWidth / 2 - paddingX;
            if (t.align === "left") boxX = x - paddingX;
            if (t.align === "right") boxX = x - textWidth - paddingX;

            const boxY = y - textHeight / 2;
            const boxW = textWidth + paddingX * 2;
            const boxH = textHeight;

            if (t.bgStyle === "pill") {
              const radius = boxH / 2;
              ctx.beginPath();
              ctx.roundRect(boxX, boxY, boxW, boxH, radius);
              ctx.fill();
            } else {
              ctx.fillRect(boxX, boxY, boxW, boxH);
            }
          }

          // Text shadow
          ctx.shadowColor = "rgba(0,0,0,0.8)";
          ctx.shadowBlur = 8;
          ctx.fillStyle = t.color || "#FFFFFF";
          ctx.fillText(t.text, x, y);
          ctx.shadowBlur = 0;
        });

        resolve(offscreenCanvas.toDataURL("image/jpeg", 0.92));
      };

      img.onerror = () => {
        resolve(imageSrc);
      };

      img.src = imageSrc;
    });
  };

  // Actions
  const handleDownload = async () => {
    const finalUrl = await renderComposedImage();
    const link = document.createElement("a");
    link.download = `wavegram_edited_photo_${Date.now()}.jpg`;
    link.href = finalUrl;
    link.click();
  };

  const handleSend = async () => {
    const finalUrl = await renderComposedImage();
    onSendToChat(finalUrl, caption.trim() || undefined);
    onClose();
  };

  const handleStoryPost = async () => {
    if (onPostAsStory) {
      const finalUrl = await renderComposedImage();
      onPostAsStory(finalUrl, caption.trim() || undefined);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl h-[94vh] max-h-[850px] bg-[#09112a] border border-blue-900/60 rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden text-white animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ==================================================== */}
        {/* LEFT / CENTER: CANVAS WORKSPACE */}
        {/* ==================================================== */}
        <div className="flex-1 bg-[#040816] flex flex-col items-center justify-center p-3 relative select-none overflow-hidden">
          {/* Top Bar for Canvas */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-30 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2">
              <label
                htmlFor="photo-upload-input"
                className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 hover:bg-black/90 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Change Photo</span>
              </label>
              <input
                id="photo-upload-input"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {hasDrawn && activeTab === "draw" && (
              <button
                onClick={clearDrawing}
                className="pointer-events-auto px-3 py-1.5 rounded-xl bg-red-600/80 hover:bg-red-500 text-xs font-bold text-white flex items-center gap-1 shadow-md transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Brush</span>
              </button>
            )}
          </div>

          {/* Interactive Photo Stage */}
          <div
            ref={containerRef}
            className="relative max-w-full max-h-full flex items-center justify-center overflow-hidden rounded-2xl shadow-2xl border border-white/10"
            style={{
              maxHeight: "calc(94vh - 120px)"
            }}
          >
            {imageSrc ? (
              <img
                src={imageSrc}
                alt="Editing workspace"
                className="max-h-[600px] w-auto max-w-full object-contain rounded-2xl pointer-events-none"
                style={{
                  filter: PHOTO_FILTERS.find((f) => f.id === activeFilter)?.filter || "none"
                }}
              />
            ) : (
              <div className="w-80 h-96 flex flex-col items-center justify-center gap-3 p-6 text-center bg-slate-900/60 rounded-2xl border-2 border-dashed border-slate-700">
                <ImageIcon className="w-12 h-12 text-slate-500" />
                <p className="text-sm font-semibold text-slate-300">No image loaded</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
                >
                  Upload Photo from Gallery
                </button>
              </div>
            )}

            {/* Freehand Brush Canvas Layer */}
            <canvas
              ref={canvasRef}
              width={800}
              height={1000}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className={`absolute inset-0 w-full h-full z-10 ${
                activeTab === "draw" ? "cursor-crosshair pointer-events-auto" : "pointer-events-none"
              }`}
            />

            {/* Interactive Text & Sticker Overlays Layer */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              {textOverlays.map((item) => {
                const isSelected = selectedTextId === item.id;
                const isBeingDragged = draggedTextId === item.id;
                const fontClass = FONT_FAMILIES.find((f) => f.id === item.fontFamily)?.css || "font-sans";

                return (
                  <div
                    key={item.id}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setSelectedTextId(item.id);
                      setDraggedTextId(item.id);
                      setEditingText(item.text);
                      setTextColor(item.color || "#FFFFFF");
                      setFontSize(item.fontSize || 26);
                      setFontFamily(item.fontFamily || "sans");
                      setBgStyle(item.bgStyle || "box");
                      setTextAlign(item.align || "center");
                      setActiveTab("text");
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      setSelectedTextId(item.id);
                      setDraggedTextId(item.id);
                      setEditingText(item.text);
                      setTextColor(item.color || "#FFFFFF");
                      setFontSize(item.fontSize || 26);
                      setFontFamily(item.fontFamily || "sans");
                      setBgStyle(item.bgStyle || "box");
                      setTextAlign(item.align || "center");
                      setActiveTab("text");
                    }}
                    style={{
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      transform: "translate(-50%, -50%)",
                      color: item.color || "#FFFFFF",
                      fontSize: `${item.fontSize}px`,
                      textAlign: item.align || "center",
                      touchAction: "none"
                    }}
                    className={`absolute pointer-events-auto cursor-grab active:cursor-grabbing p-1.5 transition-all select-none ${fontClass} ${
                      item.bgStyle === "box"
                        ? "bg-black/75 px-3 py-1 rounded-md"
                        : item.bgStyle === "pill"
                        ? "bg-black/75 px-4 py-1.5 rounded-full"
                        : item.bgStyle === "outline"
                        ? "border-2 border-white px-2 py-0.5 rounded"
                        : item.bgStyle === "highlight"
                        ? "drop-shadow-[0_0_12px_rgba(6,182,212,0.9)]"
                        : "drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                    } ${
                      isBeingDragged
                        ? "ring-2 ring-cyan-300 ring-offset-2 ring-offset-black/80 scale-105 shadow-[0_0_20px_rgba(6,182,212,0.8)]"
                        : isSelected
                        ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-black/50"
                        : "hover:ring-1 hover:ring-white/50"
                    }`}
                    title="Drag anywhere across photo to reposition"
                  >
                    <span>{item.text}</span>
                    {isSelected && (
                      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-md bg-cyan-500/90 text-slate-950 font-black text-[9px] whitespace-nowrap pointer-events-none shadow-md">
                        {item.x}% , {item.y}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* RIGHT SIDEBAR: TOOLBAR & TEXT CONTROLS */}
        {/* ==================================================== */}
        <div className="w-full md:w-80 lg:w-96 bg-[#09112a] border-t md:border-t-0 md:border-l border-blue-950 flex flex-col p-4 gap-4 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-blue-950 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Write & Draw on Photo</h3>
                <p className="text-[11px] text-slate-400">Add text, doodles & effects</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-black/40 border border-blue-950">
            <button
              onClick={() => setActiveTab("text")}
              className={`py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                activeTab === "text"
                  ? "bg-cyan-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Text</span>
            </button>

            <button
              onClick={() => setActiveTab("draw")}
              className={`py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                activeTab === "draw"
                  ? "bg-cyan-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Doodle</span>
            </button>

            <button
              onClick={() => setActiveTab("stickers")}
              className={`py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                activeTab === "stickers"
                  ? "bg-cyan-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Smile className="w-3.5 h-3.5" />
              <span>Stickers</span>
            </button>

            <button
              onClick={() => setActiveTab("filters")}
              className={`py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                activeTab === "filters"
                  ? "bg-cyan-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
          </div>

          {/* ============================================== */}
          {/* TAB 1: TEXT OVERLAYS CONTROLS */}
          {/* ============================================== */}
          {activeTab === "text" && (
            <div className="flex flex-col gap-3.5 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Text Layers</span>
                <button
                  onClick={handleAddText}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Text</span>
                </button>
              </div>

              {selectedTextId ? (
                <div className="flex flex-col gap-3 p-3 rounded-2xl bg-slate-950/80 border border-blue-950">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                      Edit Selected Text
                    </span>
                    <button
                      onClick={() => handleDeleteText(selectedTextId)}
                      className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                      title="Delete text layer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Text Input */}
                  <textarea
                    rows={2}
                    value={editingText}
                    onChange={(e) => {
                      setEditingText(e.target.value);
                      updateSelectedText({ text: e.target.value });
                    }}
                    placeholder="Type your message on the photo..."
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none font-medium"
                  />

                  {/* Font Family Selection */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-slate-400">Typography Style</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {FONT_FAMILIES.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => {
                            setFontFamily(f.id);
                            updateSelectedText({ fontFamily: f.id });
                          }}
                          className={`py-1.5 px-2 rounded-xl text-xs border text-left truncate transition-all ${
                            fontFamily === f.id
                              ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text Color Picker Palette */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-slate-400">Color Palette</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {COLOR_PALETTE.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            setTextColor(c);
                            updateSelectedText({ color: c });
                          }}
                          className={`w-6 h-6 rounded-full border-2 transition-transform active:scale-90 flex items-center justify-center ${
                            textColor === c ? "scale-110 border-white shadow-md" : "border-transparent"
                          }`}
                          style={{ backgroundColor: c }}
                        >
                          {textColor === c && (
                            <Check className={`w-3 h-3 ${c === "#FFFFFF" ? "text-black" : "text-white"}`} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background Style Options */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-slate-400">Badge Background</span>
                    <div className="grid grid-cols-2 gap-1">
                      {BACKGROUND_STYLES.map((bg) => (
                        <button
                          key={bg.id}
                          onClick={() => {
                            setBgStyle(bg.id);
                            updateSelectedText({ bgStyle: bg.id });
                          }}
                          className={`py-1 px-2 rounded-lg text-[11px] border font-medium transition-all ${
                            bgStyle === bg.id
                              ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          {bg.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Position & Placement Controls (Professional & Easy) */}
                  <div className="flex flex-col gap-2 pt-1 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300 font-bold flex items-center gap-1">
                        <span>Position on Photo</span>
                        <span className="text-cyan-400 font-mono text-[10px]">
                          ({textOverlays.find((t) => t.id === selectedTextId)?.x || 50}%, {textOverlays.find((t) => t.id === selectedTextId)?.y || 50}%)
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-400">Drag text or click preset</span>
                    </div>

                    {/* 1-Tap Quick Alignment Presets */}
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => updateSelectedText({ y: 15 })}
                        className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-cyan-300 transition-all text-center"
                      >
                        Top ⬆️
                      </button>
                      <button
                        onClick={() => updateSelectedText({ y: 50 })}
                        className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-cyan-300 transition-all text-center"
                      >
                        Middle 🎯
                      </button>
                      <button
                        onClick={() => updateSelectedText({ y: 85 })}
                        className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-cyan-300 transition-all text-center"
                      >
                        Bottom ⬇️
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => updateSelectedText({ x: 25 })}
                        className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-cyan-300 transition-all text-center"
                      >
                        Left ⬅️
                      </button>
                      <button
                        onClick={() => updateSelectedText({ x: 50 })}
                        className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-cyan-300 transition-all text-center"
                      >
                        Center ⏺️
                      </button>
                      <button
                        onClick={() => updateSelectedText({ x: 75 })}
                        className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-cyan-300 transition-all text-center"
                      >
                        Right ➡️
                      </button>
                    </div>

                    {/* Fine-tuning Nudge Sliders */}
                    <div className="flex flex-col gap-1.5 mt-1 bg-black/40 p-2.5 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Horizontal X</span>
                        <span className="font-mono text-cyan-300">{textOverlays.find((t) => t.id === selectedTextId)?.x || 50}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="95"
                        value={textOverlays.find((t) => t.id === selectedTextId)?.x || 50}
                        onChange={(e) => updateSelectedText({ x: Number(e.target.value) })}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />

                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>Vertical Y</span>
                        <span className="font-mono text-cyan-300">{textOverlays.find((t) => t.id === selectedTextId)?.y || 50}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="95"
                        value={textOverlays.find((t) => t.id === selectedTextId)?.y || 50}
                        onChange={(e) => updateSelectedText({ y: Number(e.target.value) })}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center flex flex-col items-center gap-2">
                  <Type className="w-8 h-8 text-slate-600" />
                  <p className="text-xs text-slate-400 font-medium">No text layer selected</p>
                  <p className="text-[11px] text-slate-500">
                    Click "Add Text" or tap any text on the photo to customize style, size & color.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ============================================== */}
          {/* TAB 2: DOODLE BRUSH CONTROLS */}
          {/* ============================================== */}
          {activeTab === "draw" && (
            <div className="flex flex-col gap-4 flex-1">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-300">Brush Color</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => setBrushColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform active:scale-90 flex items-center justify-center ${
                        brushColor === c ? "scale-110 border-white shadow-md" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {brushColor === c && (
                        <Check className={`w-3.5 h-3.5 ${c === "#FFFFFF" ? "text-black" : "text-white"}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Brush Thickness</span>
                  <span className="font-bold text-cyan-400">{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="30"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 flex items-center gap-2">
                <PenTool className="w-4 h-4 shrink-0" />
                <span>Draw directly anywhere over the photo with your mouse or finger.</span>
              </div>
            </div>
          )}

          {/* ============================================== */}
          {/* TAB 3: STICKERS CONTROLS */}
          {/* ============================================== */}
          {activeTab === "stickers" && (
            <div className="flex flex-col gap-3 flex-1">
              <span className="text-xs font-bold text-slate-300">Quick Emojis & Badges</span>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_STICKERS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleAddSticker(emoji)}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-cyan-400 hover:bg-slate-900 text-2xl flex items-center justify-center active:scale-90 transition-all"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ============================================== */}
          {/* TAB 4: PHOTO FILTERS CONTROLS */}
          {/* ============================================== */}
          {activeTab === "filters" && (
            <div className="flex flex-col gap-2 flex-1">
              <span className="text-xs font-bold text-slate-300">Color Presets</span>
              <div className="grid grid-cols-2 gap-2">
                {PHOTO_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    className={`p-2.5 rounded-2xl border text-left transition-all ${
                      activeFilter === f.id
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="text-xs block">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Optional Caption */}
          <div className="flex flex-col gap-1 border-t border-blue-950 pt-3">
            <span className="text-[11px] text-slate-400">Photo Caption</span>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-1 border-t border-blue-950">
            <button
              onClick={handleSend}
              className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Send to Chat</span>
            </button>

            <div className="flex items-center gap-2">
              {onPostAsStory && (
                <button
                  onClick={handleStoryPost}
                  className="flex-1 py-2 px-3 rounded-xl bg-purple-600/80 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Post to Story</span>
                </button>
              )}

              <button
                onClick={handleDownload}
                className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                title="Download photo"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
