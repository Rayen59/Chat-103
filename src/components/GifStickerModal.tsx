import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  Sparkles,
  Flame,
  Briefcase,
  Cpu,
  Smile,
  Feather,
  Heart,
  Coffee,
  Check,
  Zap,
  PlusCircle,
  Image as ImageIcon,
  Palette,
  Star
} from "lucide-react";
import { GifItem, StickerItem } from "../types";
import { StickerMaker } from "./StickerMaker";

interface GifStickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendGif: (gif: GifItem) => void;
  onSendSticker: (sticker: StickerItem) => void;
  initialTab?: "gifs" | "stickers" | "maker";
}

export const GifStickerModal: React.FC<GifStickerModalProps> = ({
  isOpen,
  onClose,
  onSendGif,
  onSendSticker,
  initialTab = "stickers"
}) => {
  const [activeTab, setActiveTab] = useState<"gifs" | "stickers" | "maker">(initialTab);

  // GIF states
  const [gifQuery, setGifQuery] = useState("");
  const [gifCategory, setGifCategory] = useState("all");
  const [gifResults, setGifResults] = useState<GifItem[]>([]);
  const [loadingGifs, setLoadingGifs] = useState(false);

  // Sticker states
  const [stickerQuery, setStickerQuery] = useState("");
  const [stickerCategory, setStickerCategory] = useState("plumes"); // Default to feathers ("plumes")
  const [stickerResults, setStickerResults] = useState<StickerItem[]>([]);
  const [stickerCategories, setStickerCategories] = useState<{ id: string; label: string; count: number }[]>([]);
  const [loadingStickers, setLoadingStickers] = useState(false);

  // Custom User-Created Stickers from local storage
  const [customStickers, setCustomStickers] = useState<StickerItem[]>(() => {
    try {
      const saved = localStorage.getItem("wavegram_custom_stickers");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync custom stickers to localStorage
  const handleSaveCustomSticker = (newSticker: StickerItem) => {
    setCustomStickers((prev) => {
      const filtered = prev.filter((s) => s.id !== newSticker.id);
      const updated = [newSticker, ...filtered];
      try {
        localStorage.setItem("wavegram_custom_stickers", JSON.stringify(updated));
      } catch (err) {
        console.error("Storage error:", err);
      }
      return updated;
    });
  };

  const handleDeleteCustomSticker = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomStickers((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      try {
        localStorage.setItem("wavegram_custom_stickers", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Fetch GIFs
  useEffect(() => {
    if (!isOpen || activeTab !== "gifs") return;
    setLoadingGifs(true);
    const url = `/api/gifs/search?q=${encodeURIComponent(gifQuery)}&category=${encodeURIComponent(gifCategory)}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setGifResults(data.gifs || []);
        setLoadingGifs(false);
      })
      .catch(() => setLoadingGifs(false));
  }, [isOpen, activeTab, gifQuery, gifCategory]);

  // Fetch Stickers
  useEffect(() => {
    if (!isOpen || activeTab !== "stickers") return;

    if (stickerCategory === "custom") {
      // Return custom user stickers filtered by query
      let res = customStickers;
      if (stickerQuery.trim()) {
        const q = stickerQuery.toLowerCase();
        res = res.filter((s) => s.title.toLowerCase().includes(q) || s.tags.some((t) => t.includes(q)));
      }
      setStickerResults(res);
      return;
    }

    setLoadingStickers(true);
    const url = `/api/stickers?q=${encodeURIComponent(stickerQuery)}&category=${encodeURIComponent(stickerCategory)}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        let serverStickers: StickerItem[] = data.stickers || [];
        setStickerResults(serverStickers);

        if (data.categories) {
          const cats = [...data.categories];
          if (customStickers.length > 0) {
            cats.unshift({
              id: "custom",
              label: "⭐ My Creations",
              count: customStickers.length
            });
          }
          setStickerCategories(cats);
        }
        setLoadingStickers(false);
      })
      .catch(() => setLoadingStickers(false));
  }, [isOpen, activeTab, stickerQuery, stickerCategory, customStickers]);

  if (!isOpen) return null;

  const gifQuickCategories = [
    { id: "all", label: "🔥 All & Trending", icon: Flame },
    { id: "pro", label: "💼 Professional", icon: Briefcase },
    { id: "tech", label: "🚀 Tech & Hacker", icon: Cpu },
    { id: "reactions", label: "😂 Reactions", icon: Smile },
    { id: "plumes", label: "🪶 Feathers & Magic", icon: Feather },
    { id: "vibe", label: "☕ Vibes & Chill", icon: Coffee }
  ];

  // Helper for animated CSS classes
  const getStickerAnimClass = (sticker: StickerItem) => {
    switch (sticker.animationStyle) {
      case "feather-float":
        return "animate-feather-float";
      case "feather-sway":
        return "animate-feather-sway";
      case "glow":
        return "animate-sticker-glow";
      case "gold":
        return "animate-sticker-gold";
      case "pulse":
        return "animate-sticker-pulse";
      case "bounce":
        return "animate-sticker-bounce";
      default:
        return sticker.isFeather ? "animate-feather-float" : "";
    }
  };

  const getStickerOutlineClass = (sticker: StickerItem) => {
    switch (sticker.outlineStyle) {
      case "white":
        return "sticker-outline-white";
      case "cyan":
        return "sticker-outline-cyan";
      case "gold":
        return "sticker-outline-gold";
      default:
        return "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#17212b] border border-[#242f3d] rounded-2xl w-full max-w-3xl text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Modal Header with 3 Tabs */}
        <div className="p-3 sm:p-3.5 border-b border-[#242f3d] bg-[#17212b] flex items-center justify-between gap-2 flex-wrap">
          {/* Tabs Selector */}
          <div className="flex items-center p-1 bg-[#0e1621] rounded-xl border border-[#242f3d] gap-1">
            <button
              onClick={() => setActiveTab("stickers")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "stickers"
                  ? "bg-[#3390ec] text-white shadow-sm"
                  : "text-[#7d8b99] hover:text-white"
              }`}
            >
              <Feather className="w-3.5 h-3.5" />
              <span>Animated Stickers</span>
            </button>

            <button
              onClick={() => setActiveTab("maker")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "maker"
                  ? "bg-[#3390ec] text-white shadow-sm"
                  : "text-[#7d8b99] hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Create Sticker</span>
            </button>

            <button
              onClick={() => setActiveTab("gifs")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "gifs"
                  ? "bg-[#3390ec] text-white shadow-sm"
                  : "text-[#7d8b99] hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>GIFs</span>
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#7d8b99] hover:text-white hover:bg-[#242f3d] transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-[#242f3d]">
          
          {/* TAB 1: STICKER MAKER STUDIO */}
          {activeTab === "maker" && (
            <StickerMaker
              onSendSticker={onSendSticker}
              onSaveToLibrary={handleSaveCustomSticker}
              onClose={onClose}
            />
          )}

          {/* TAB 2: ANIMATED STICKERS & PLUMES */}
          {activeTab === "stickers" && (
            <div className="space-y-4">
              
              {/* SEARCH BAR */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#7d8b99] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search animated stickers (e.g. feather, gold, emoji, 3d, cyber)..."
                  value={stickerQuery}
                  onChange={(e) => setStickerQuery(e.target.value)}
                  className="w-full bg-[#0e1621] border border-[#242f3d] rounded-xl py-2 pl-10 pr-10 text-xs text-white placeholder-[#7d8b99] focus:outline-none focus:border-[#3390ec] transition-all"
                />
                {stickerQuery && (
                  <button
                    onClick={() => setStickerQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7d8b99] hover:text-white p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Create Custom Sticker Quick Banner */}
              <div className="p-3 rounded-xl bg-[#0e1621] border border-[#242f3d] flex items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#242f3d] text-[#3390ec]">
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">Sticker Maker Studio</span>
                    <span className="text-[11px] text-[#7d8b99]">
                      Upload photos, cutout into feather, squircle or star shapes and animate!
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("maker")}
                  className="px-3 py-1.5 rounded-lg bg-[#3390ec] hover:bg-[#2481cc] text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Create</span>
                </button>
              </div>

              {/* Sticker Categories Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {stickerCategories.map((cat) => {
                  const isSelected = stickerCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setStickerCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#3390ec] text-white shadow-sm"
                          : "bg-[#0e1621] text-[#7d8b99] hover:text-white border border-[#242f3d]"
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span className="text-[10px] opacity-75">({cat.count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Special Plumes Highlight Banner if Plumes category selected */}
              {stickerCategory === "plumes" && (
                <div className="p-3 rounded-xl bg-[#0e1621] border border-[#242f3d] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[#3390ec]">
                    <Feather className="w-5 h-5 animate-pulse" />
                    <div>
                      <span className="font-bold text-white block">Royal Animated Feathers Collection</span>
                      <span className="text-[11px] text-[#7d8b99]">
                        Smooth floating, golden sparkle, and sway animations
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#3390ec]/20 text-[#3390ec] font-bold text-[10px] border border-[#3390ec]/30">
                    ANIMATED HD
                  </span>
                </div>
              )}

              {/* Stickers Grid */}
              {loadingStickers ? (
                <div className="py-12 flex flex-col items-center justify-center text-[#7d8b99] gap-2">
                  <div className="w-7 h-7 border-2 border-[#3390ec] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs">Loading animated stickers...</p>
                </div>
              ) : stickerResults.length === 0 ? (
                <div className="py-12 text-center text-[#7d8b99] text-xs">
                  {stickerCategory === "custom" ? (
                    <div className="space-y-3">
                      <p>You haven't created any custom stickers yet.</p>
                      <button
                        onClick={() => setActiveTab("maker")}
                        className="px-4 py-2 rounded-xl bg-[#3390ec] hover:bg-[#2481cc] text-white font-semibold text-xs cursor-pointer"
                      >
                        Create My First Sticker
                      </button>
                    </div>
                  ) : (
                    <p>No stickers found for "{stickerQuery}". Try searching for "feather" or "gold"!</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[460px] overflow-y-auto pr-1">
                  {stickerResults.map((sticker) => {
                    const animClass = getStickerAnimClass(sticker);
                    const outlineClass = getStickerOutlineClass(sticker);

                    return (
                      <button
                        key={sticker.id}
                        onClick={() => {
                          onSendSticker(sticker);
                          onClose();
                        }}
                        className="group relative rounded-xl p-2.5 bg-[#0e1621] border border-[#242f3d] hover:border-[#3390ec] transition-all hover:scale-105 flex flex-col items-center justify-between text-center gap-2 cursor-pointer shadow-sm"
                      >
                        <div className="w-full aspect-square rounded-lg overflow-hidden bg-[#17212b] flex items-center justify-center p-2 relative">
                          <img
                            src={sticker.url}
                            alt={sticker.title}
                            className={`w-full h-full object-contain transition-transform duration-300 ${animClass} ${outlineClass}`}
                            loading="lazy"
                          />
                          {sticker.isFeather && (
                            <div className="absolute top-1 left-1 p-1 bg-[#0e1621] rounded border border-[#242f3d] text-[#3390ec]">
                              <Feather className="w-3 h-3" />
                            </div>
                          )}

                          {sticker.isCustom && (
                            <div className="absolute top-1 right-1 p-1 bg-[#0e1621] rounded border border-[#242f3d] text-amber-400">
                              <Star className="w-3 h-3" />
                            </div>
                          )}
                        </div>

                        <div className="w-full">
                          <p className="text-[11px] font-semibold text-white truncate group-hover:text-[#3390ec] transition-colors">
                            {sticker.title}
                          </p>
                          <div className="flex items-center justify-center gap-1 mt-0.5">
                            <span className="text-[9px] text-[#7d8b99] capitalize">
                              {sticker.category === "plumes" ? "🪶 Feather" : sticker.category}
                            </span>
                            {sticker.animationStyle && (
                              <span className="text-[8px] px-1 rounded bg-[#242f3d] text-[#3390ec]">
                                Animated
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick Delete for custom created stickers */}
                        {sticker.isCustom && (
                          <div
                            onClick={(e) => handleDeleteCustomSticker(sticker.id, e)}
                            className="absolute top-1.5 right-1.5 p-1 rounded bg-rose-900/80 text-rose-300 opacity-0 group-hover:opacity-100 hover:bg-rose-800 transition-opacity cursor-pointer"
                            title="Delete"
                          >
                            <X className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GIFS */}
          {activeTab === "gifs" && (
            <div className="space-y-4">
              {/* SEARCH BAR */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#7d8b99] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search GIFs..."
                  value={gifQuery}
                  onChange={(e) => setGifQuery(e.target.value)}
                  className="w-full bg-[#0e1621] border border-[#242f3d] rounded-xl py-2 pl-10 pr-10 text-xs text-white placeholder-[#7d8b99] focus:outline-none focus:border-[#3390ec] transition-all"
                />
                {gifQuery && (
                  <button
                    onClick={() => setGifQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7d8b99] hover:text-white p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* GIF Categories Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {gifQuickCategories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = gifCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setGifCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#3390ec] text-white shadow-sm"
                          : "bg-[#0e1621] text-[#7d8b99] hover:text-white border border-[#242f3d]"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* GIF Results Grid */}
              {loadingGifs ? (
                <div className="py-12 flex flex-col items-center justify-center text-[#7d8b99] gap-2">
                  <div className="w-7 h-7 border-2 border-[#3390ec] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs">Loading GIFs...</p>
                </div>
              ) : gifResults.length === 0 ? (
                <div className="py-12 text-center text-[#7d8b99] text-xs">
                  <p>No GIFs found for "{gifQuery}". Try another search!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {gifResults.map((gif) => (
                    <button
                      key={gif.id}
                      onClick={() => {
                        onSendGif(gif);
                        onClose();
                      }}
                      className="group relative rounded-xl overflow-hidden bg-[#0e1621] border border-[#242f3d] hover:border-[#3390ec] transition-all hover:scale-[1.02] flex flex-col aspect-[4/3] text-left cursor-pointer"
                    >
                      <img
                        src={gif.url}
                        alt={gif.title}
                        className="w-full h-full object-cover transition-all"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <span className="text-[11px] font-semibold text-white truncate drop-shadow-md">
                          {gif.title}
                        </span>
                      </div>
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-[#3390ec] text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        SEND
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#0e1621] border-t border-[#242f3d] flex items-center justify-between text-[11px] text-[#7d8b99] px-4">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#3390ec]" />
            <span>Click any sticker or GIF to send directly in chat.</span>
          </div>
          <span className="text-[10px] text-[#7d8b99] hidden sm:inline">
            Press ESC to close
          </span>
        </div>

      </div>
    </div>
  );
};
