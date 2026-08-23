import React, { useState, useEffect, useRef } from "react";
import { Note, NoteMusic, User, Conversation } from "../types";
import {
  FileText,
  Plus,
  Search,
  Pin,
  Trash2,
  Edit3,
  Check,
  X,
  Copy,
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Share2,
  Sparkles,
  Heart,
  Smile,
  Tag,
  Clock,
  Radio,
  Send,
  MessageSquare,
  CheckCircle2
} from "lucide-react";

interface NotesModalProps {
  currentUser: User;
  conversations?: Conversation[];
  onClose: () => void;
  onShareToChat?: (conversationId: string, note: Note) => void;
}

const CATEGORIES: Array<NonNullable<Note["category"]>> = [
  "General",
  "Work",
  "Personal",
  "Ideas",
  "Urgent",
  "Drafts"
];

const MOOD_EMOJIS = ["⚡", "☕", "🎧", "🌴", "💡", "🚀", "🎨", "❤️", "🔥", "✨", "🌙", "🌊", "🎮", "📚"];

const COLOR_OPTIONS = [
  { name: "Blue", hex: "#3390ec", bg: "bg-[#3390ec]/15 border-[#3390ec]/40 text-[#3390ec]" },
  { name: "Emerald", hex: "#10b981", bg: "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" },
  { name: "Amber", hex: "#f59e0b", bg: "bg-amber-500/15 border-amber-500/40 text-amber-400" },
  { name: "Purple", hex: "#8b5cf6", bg: "bg-purple-500/15 border-purple-500/40 text-purple-400" },
  { name: "Rose", hex: "#ec4899", bg: "bg-pink-500/15 border-pink-500/40 text-pink-400" },
  { name: "Cyan", hex: "#06b6d4", bg: "bg-cyan-500/15 border-cyan-500/40 text-cyan-400" }
];

export const NotesModal: React.FC<NotesModalProps> = ({
  currentUser,
  conversations = [],
  onClose,
  onShareToChat
}) => {
  const [activeTab, setActiveTab] = useState<"my_notes" | "all_thoughts" | "music_catalog">("my_notes");
  const [notes, setNotes] = useState<Note[]>([]);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [musicCatalog, setMusicCatalog] = useState<NoteMusic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Editor Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteCategory, setNoteCategory] = useState<NonNullable<Note["category"]>>("General");
  const [noteColor, setNoteColor] = useState("#3390ec");
  const [noteMood, setNoteMood] = useState("✨");
  const [noteMusic, setNoteMusic] = useState<NoteMusic | null>(null);
  const [noteIsPinned, setNoteIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  // Music & Audio Player state
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Share note modal state
  const [sharingNote, setSharingNote] = useState<Note | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Load user notes, all thoughts, and music catalog
  const fetchNotesAndMusic = async () => {
    try {
      setLoading(true);
      const [userNotesRes, allNotesRes, musicRes] = await Promise.all([
        fetch(`/api/notes?userId=${currentUser.id}`),
        fetch("/api/notes?all=true"),
        fetch("/api/music/trending")
      ]);

      if (userNotesRes.ok) {
        const data = await userNotesRes.json();
        setNotes(data.notes || []);
      }
      if (allNotesRes.ok) {
        const data = await allNotesRes.json();
        setAllNotes(data.notes || []);
      }
      if (musicRes.ok) {
        const data = await musicRes.json();
        setMusicCatalog(data.tracks || []);
      }
    } catch (err) {
      console.error("Failed to load notes or music:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotesAndMusic();
  }, [currentUser.id]);

  // Audio Playback Handler
  const handlePlayAudio = (track: NoteMusic) => {
    if (playingTrackId === track.id) {
      // Pause
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingTrackId(null);
    } else {
      // Play new track
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(track.audioUrl);
      audioRef.current = audio;
      audio.play().catch((err) => console.warn("Audio play error:", err));
      setPlayingTrackId(track.id);

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setAudioProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onended = () => {
        setPlayingTrackId(null);
        setAudioProgress(0);
      };
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleOpenCreate = () => {
    setEditingNoteId(null);
    setNoteTitle("");
    setNoteContent("");
    setNoteCategory("General");
    setNoteColor("#3390ec");
    setNoteMood("✨");
    setNoteMusic(null);
    setNoteIsPinned(false);
    setIsEditing(true);
  };

  const handleOpenEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title || "");
    setNoteContent(note.content);
    setNoteCategory(note.category || "General");
    setNoteColor(note.color || "#3390ec");
    setNoteMood(note.moodEmoji || "✨");
    setNoteMusic(note.music || null);
    setNoteIsPinned(!!note.isPinned);
    setIsEditing(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() && !noteTitle.trim()) return;

    setSaving(true);
    try {
      if (editingNoteId) {
        // Edit existing note
        const res = await fetch(`/api/notes/${editingNoteId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            title: noteTitle.trim(),
            content: noteContent.trim() || noteTitle.trim(),
            category: noteCategory,
            color: noteColor,
            moodEmoji: noteMood,
            music: noteMusic,
            isPinned: noteIsPinned
          })
        });
        if (res.ok) {
          const data = await res.json();
          setNotes((prev) =>
            prev.map((n) => (n.id === editingNoteId ? data.note : n)).sort((a, b) => {
              if (a.isPinned && !b.isPinned) return -1;
              if (!a.isPinned && b.isPinned) return 1;
              return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            })
          );
          setAllNotes((prev) =>
            prev.map((n) => (n.id === editingNoteId ? data.note : n))
          );
          setIsEditing(false);
        }
      } else {
        // Create new note
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            title: noteTitle.trim(),
            content: noteContent.trim() || noteTitle.trim(),
            category: noteCategory,
            color: noteColor,
            moodEmoji: noteMood,
            music: noteMusic,
            isPinned: noteIsPinned
          })
        });
        if (res.ok) {
          const data = await res.json();
          setNotes((prev) => [data.note, ...prev]);
          setAllNotes((prev) => [data.note, ...prev]);
          setIsEditing(false);
        }
      }
    } catch (err) {
      console.error("Error saving note:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/notes/${noteId}?userId=${currentUser.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        setAllNotes((prev) => prev.filter((n) => n.id !== noteId));
      }
    } catch (err) {
      console.error("Error deleting note:", err);
    }
  };

  const handleToggleLike = async (noteId: string) => {
    try {
      const res = await fetch(`/api/notes/${noteId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });
      if (res.ok) {
        const data = await res.json();
        setNotes((prev) => prev.map((n) => (n.id === noteId ? data.note : n)));
        setAllNotes((prev) => prev.map((n) => (n.id === noteId ? data.note : n)));
      }
    } catch (err) {
      console.error("Error liking note:", err);
    }
  };

  const handleShareToConversation = async (convId: string) => {
    if (!sharingNote) return;
    try {
      const res = await fetch(`/api/notes/${sharingNote.id}/share-to-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUser.id,
          targetConversationId: convId
        })
      });
      if (res.ok) {
        if (onShareToChat) {
          onShareToChat(convId, sharingNote);
        }
        setShareSuccess(true);
        setTimeout(() => {
          setShareSuccess(false);
          setSharingNote(null);
        }, 1200);
      }
    } catch (err) {
      console.error("Error sharing note:", err);
    }
  };

  const handleCopyNote = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeNotesList = activeTab === "my_notes" ? notes : allNotes;
  const filteredNotes = activeNotesList.filter((note) => {
    const matchesCategory = selectedCategory === "All" || note.category === selectedCategory;
    const matchesSearch =
      (note.title && note.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.music && note.music.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl h-[90vh] max-h-[780px] bg-[#17212b] border border-[#242f3d] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#0e1621] border-b border-[#242f3d] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#3390ec]/20 border border-[#3390ec]/40 flex items-center justify-center text-[#3390ec]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Notes & Thoughts Studio</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3390ec]/20 text-[#3390ec] font-bold border border-[#3390ec]/30">
                  Real Music & Audio
                </span>
              </h2>
              <p className="text-xs text-[#7d8b99]">
                Share your ideas, status thoughts, and attach real music tracks
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#242f3d]/60 hover:bg-[#242f3d] text-[#7d8b99] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Bar Navigation */}
        <div className="px-5 pt-3 pb-2 bg-[#0e1621] border-b border-[#242f3d] flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-[#17212b] rounded-xl border border-[#242f3d]">
            <button
              onClick={() => {
                setActiveTab("my_notes");
                setIsEditing(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "my_notes"
                  ? "bg-[#3390ec] text-white shadow-sm"
                  : "text-[#7d8b99] hover:text-white hover:bg-[#242f3d]/60"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>My Notes ({notes.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("all_thoughts");
                setIsEditing(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "all_thoughts"
                  ? "bg-[#3390ec] text-white shadow-sm"
                  : "text-[#7d8b99] hover:text-white hover:bg-[#242f3d]/60"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Community Thoughts ({allNotes.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("music_catalog");
                setIsEditing(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "music_catalog"
                  ? "bg-[#3390ec] text-white shadow-sm"
                  : "text-[#7d8b99] hover:text-white hover:bg-[#242f3d]/60"
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Music & Beats ({musicCatalog.length})</span>
            </button>
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-[#3390ec] hover:bg-[#2481cc] text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer ml-auto"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Note / Thought</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        {activeTab !== "music_catalog" && (
          <div className="px-5 py-2.5 bg-[#17212b] border-b border-[#242f3d] flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8b99]" />
              <input
                type="text"
                placeholder="Search notes, ideas, or attached music..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#0e1621] border border-[#242f3d] text-xs text-white placeholder-[#7d8b99] focus:outline-none focus:border-[#3390ec]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              <button
                onClick={() => setSelectedCategory("All")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  selectedCategory === "All"
                    ? "bg-[#3390ec]/20 text-[#3390ec] border border-[#3390ec]/40"
                    : "text-[#7d8b99] hover:text-white bg-[#0e1621]"
                }`}
              >
                All
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    selectedCategory === cat
                      ? "bg-[#3390ec]/20 text-[#3390ec] border border-[#3390ec]/40"
                      : "text-[#7d8b99] hover:text-white bg-[#0e1621]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-[#242f3d]">
          {/* Note Editor Drawer / Form Modal */}
          {isEditing && (
            <div className="mb-6 p-5 rounded-2xl bg-[#0e1621] border border-[#3390ec]/50 shadow-xl space-y-4 animate-in slide-in-from-top-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#242f3d]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#3390ec]" />
                  <span>{editingNoteId ? "Edit Your Note" : "Create New Note & Thought"}</span>
                </h3>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1 rounded-lg text-[#7d8b99] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveNote} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-[#7d8b99] mb-1">
                    Title (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Late Night Coding, Roadmap 🚀"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#17212b] border border-[#242f3d] text-sm text-white focus:outline-none focus:border-[#3390ec]"
                  />
                </div>

                {/* Content / Thought Body */}
                <div>
                  <label className="block text-xs font-semibold text-[#7d8b99] mb-1">
                    Thought & Notes Content *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="What are you working on or thinking about? Share your thought..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#17212b] border border-[#242f3d] text-sm text-white focus:outline-none focus:border-[#3390ec] resize-none"
                  />
                </div>

                {/* Mood Emoji Selection */}
                <div>
                  <label className="block text-xs font-semibold text-[#7d8b99] mb-1.5">
                    Mood / Status Icon
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {MOOD_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNoteMood(emoji)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg transition-transform ${
                          noteMood === emoji
                            ? "bg-[#3390ec] scale-110 shadow-sm ring-2 ring-[#3390ec]/50"
                            : "bg-[#17212b] hover:bg-[#242f3d]"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Attach Real Music Track */}
                <div>
                  <label className="block text-xs font-semibold text-[#7d8b99] mb-1.5">
                    Attach Soundtrack / Music (Real Audio)
                  </label>
                  {noteMusic ? (
                    <div className="p-3 rounded-xl bg-[#17212b] border border-[#3390ec]/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handlePlayAudio(noteMusic)}
                          className="w-9 h-9 rounded-full bg-[#3390ec] hover:bg-[#2481cc] text-white flex items-center justify-center transition-transform active:scale-95 shrink-0"
                        >
                          {playingTrackId === noteMusic.id ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4 ml-0.5" />
                          )}
                        </button>
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Music className="w-3.5 h-3.5 text-[#3390ec]" />
                            <span>{noteMusic.title}</span>
                          </p>
                          <p className="text-[11px] text-[#7d8b99]">{noteMusic.artist}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setNoteMusic(null)}
                        className="text-xs font-semibold text-rose-400 hover:text-rose-300 px-2 py-1"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {musicCatalog.slice(0, 4).map((track) => (
                        <div
                          key={track.id}
                          className="p-2.5 rounded-xl bg-[#17212b] border border-[#242f3d] hover:border-[#3390ec]/50 flex items-center justify-between gap-2 transition-all"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handlePlayAudio(track)}
                              className="w-7 h-7 rounded-full bg-[#242f3d] hover:bg-[#3390ec] text-white flex items-center justify-center shrink-0 transition-colors"
                            >
                              {playingTrackId === track.id ? (
                                <Pause className="w-3.5 h-3.5" />
                              ) : (
                                <Play className="w-3.5 h-3.5 ml-0.5" />
                              )}
                            </button>
                            <div className="truncate">
                              <p className="text-xs font-bold text-white truncate">{track.title}</p>
                              <p className="text-[10px] text-[#7d8b99] truncate">{track.artist}</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setNoteMusic(track)}
                            className="px-2.5 py-1 rounded-lg bg-[#3390ec]/20 hover:bg-[#3390ec] text-[#3390ec] hover:text-white text-[11px] font-bold transition-colors shrink-0"
                          >
                            Attach
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Color and Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#7d8b99] mb-1.5">
                      Theme Color
                    </label>
                    <div className="flex items-center gap-2">
                      {COLOR_OPTIONS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setNoteColor(c.hex)}
                          style={{ backgroundColor: c.hex }}
                          className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                            noteColor === c.hex ? "scale-125 ring-2 ring-white" : "opacity-80 hover:opacity-100"
                          }`}
                        >
                          {noteColor === c.hex && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#7d8b99] mb-1.5">
                      Category
                    </label>
                    <select
                      value={noteCategory}
                      onChange={(e) => setNoteCategory(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-[#17212b] border border-[#242f3d] text-xs text-white focus:outline-none focus:border-[#3390ec]"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pin Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                    <input
                      type="checkbox"
                      checked={noteIsPinned}
                      onChange={(e) => setNoteIsPinned(e.target.checked)}
                      className="rounded accent-[#3390ec]"
                    />
                    <span>Pin note to top</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 rounded-xl bg-[#242f3d] hover:bg-[#324050] text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving || (!noteContent.trim() && !noteTitle.trim())}
                      className="px-5 py-2 rounded-xl bg-[#3390ec] hover:bg-[#2481cc] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      {saving ? "Saving..." : editingNoteId ? "Update Note" : "Post Note"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Music Catalog Tab */}
          {activeTab === "music_catalog" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[#3390ec]" />
                  <span>Curated Real Royalty-Free Beats & Tracks</span>
                </h3>
                <span className="text-xs text-[#7d8b99]">
                  Play & preview in real-time
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {musicCatalog.map((track) => {
                  const isPlaying = playingTrackId === track.id;
                  return (
                    <div
                      key={track.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isPlaying
                          ? "bg-[#0e1621] border-[#3390ec] shadow-lg shadow-[#3390ec]/15"
                          : "bg-[#0e1621] border-[#242f3d] hover:border-[#3390ec]/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-800 shrink-0">
                          {track.coverUrl ? (
                            <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-[#3390ec]/20 flex items-center justify-center text-[#3390ec]">
                              <Music className="w-6 h-6" />
                            </div>
                          )}
                          <button
                            onClick={() => handlePlayAudio(track)}
                            className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center text-white transition-colors"
                          >
                            {isPlaying ? (
                              <Pause className="w-5 h-5" />
                            ) : (
                              <Play className="w-5 h-5 ml-0.5" />
                            )}
                          </button>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{track.title}</p>
                          <p className="text-xs text-[#7d8b99] truncate">{track.artist}</p>
                          {track.duration && (
                            <span className="text-[10px] text-[#3390ec] font-semibold">
                              {track.duration}s length
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setNoteMusic(track);
                            setIsEditing(true);
                            setActiveTab("my_notes");
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#3390ec] hover:bg-[#2481cc] text-white text-xs font-bold transition-transform active:scale-95 shrink-0"
                        >
                          Use Track
                        </button>
                      </div>

                      {/* Live Audio Progress Bar */}
                      {isPlaying && (
                        <div className="mt-3 pt-2 border-t border-[#242f3d]">
                          <div className="w-full h-1.5 bg-[#17212b] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#3390ec] to-cyan-400 transition-all duration-100"
                              style={{ width: `${audioProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes Grid */}
          {activeTab !== "music_catalog" && (
            <>
              {filteredNotes.length === 0 ? (
                <div className="py-16 text-center text-[#7d8b99]">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#3390ec]" />
                  <p className="text-sm font-bold text-white mb-1">No notes or thoughts found</p>
                  <p className="text-xs mb-4">Click "New Note / Thought" to share your ideas and music.</p>
                  <button
                    onClick={handleOpenCreate}
                    className="px-4 py-2 rounded-xl bg-[#3390ec] text-white text-xs font-bold shadow-md hover:bg-[#2481cc] transition-colors cursor-pointer"
                  >
                    Create First Note
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredNotes.map((note) => {
                    const isMyNote = note.userId === currentUser.id;
                    const hasLiked = note.likes?.includes(currentUser.id);
                    const isPlaying = note.music && playingTrackId === note.music.id;

                    return (
                      <div
                        key={note.id}
                        style={{ borderLeftColor: note.color || "#3390ec" }}
                        className="p-4 rounded-2xl bg-[#0e1621] border border-[#242f3d] border-l-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                      >
                        <div>
                          {/* Note Top Bar */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              {note.moodEmoji && (
                                <span className="text-base" title="Mood">
                                  {note.moodEmoji}
                                </span>
                              )}
                              <span className="text-xs font-bold text-white truncate">
                                {note.title || (isMyNote ? "My Thought" : note.userName || "Wavegram Note")}
                              </span>
                              {note.isPinned && (
                                <Pin className="w-3 h-3 text-[#3390ec] fill-[#3390ec] shrink-0" />
                              )}
                            </div>

                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#17212b] text-[#7d8b99] border border-[#242f3d]">
                              {note.category || "General"}
                            </span>
                          </div>

                          {/* Note Text Content */}
                          <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed mb-3">
                            {note.content}
                          </p>

                          {/* Attached Music Player Bar */}
                          {note.music && (
                            <div className="p-2.5 rounded-xl bg-[#17212b] border border-[#242f3d] flex items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => handlePlayAudio(note.music!)}
                                  className="w-8 h-8 rounded-full bg-[#3390ec] hover:bg-[#2481cc] text-white flex items-center justify-center shrink-0 transition-transform active:scale-95"
                                >
                                  {isPlaying ? (
                                    <Pause className="w-3.5 h-3.5" />
                                  ) : (
                                    <Play className="w-3.5 h-3.5 ml-0.5" />
                                  )}
                                </button>
                                <div className="truncate">
                                  <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                                    <Music className="w-3 h-3 text-[#3390ec]" />
                                    <span>{note.music.title}</span>
                                  </p>
                                  <p className="text-[10px] text-[#7d8b99] truncate">{note.music.artist}</p>
                                </div>
                              </div>

                              {isPlaying && (
                                <div className="flex items-center gap-0.5 shrink-0 px-2">
                                  <span className="w-1 h-3 bg-[#3390ec] rounded-full animate-bounce" />
                                  <span className="w-1 h-5 bg-[#3390ec] rounded-full animate-bounce [animation-delay:0.15s]" />
                                  <span className="w-1 h-2 bg-[#3390ec] rounded-full animate-bounce [animation-delay:0.3s]" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Note Actions Bottom Bar */}
                        <div className="pt-2 border-t border-[#242f3d] flex items-center justify-between text-[11px] text-[#7d8b99]">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleToggleLike(note.id)}
                              className={`flex items-center gap-1 font-semibold transition-colors ${
                                hasLiked ? "text-rose-400" : "hover:text-rose-400"
                              }`}
                            >
                              <Heart className={`w-3.5 h-3.5 ${hasLiked ? "fill-rose-400" : ""}`} />
                              <span>{note.likes?.length || 0}</span>
                            </button>

                            <button
                              onClick={() => handleCopyNote(note.content, note.id)}
                              className="flex items-center gap-1 hover:text-white transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>{copiedId === note.id ? "Copied! ✓" : "Copy"}</span>
                            </button>

                            <button
                              onClick={() => setSharingNote(note)}
                              className="flex items-center gap-1 hover:text-[#3390ec] transition-colors"
                              title="Share to chat"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Share</span>
                            </button>
                          </div>

                          {/* Edit / Delete Buttons (User only) */}
                          {isMyNote && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(note)}
                                title="Edit Note"
                                className="p-1 rounded-lg hover:bg-[#242f3d] text-[#7d8b99] hover:text-[#3390ec] transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                title="Delete Note"
                                className="p-1 rounded-lg hover:bg-rose-950/40 text-[#7d8b99] hover:text-rose-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Share Note to Chat Modal */}
        {sharingNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="w-full max-w-md bg-[#17212b] border border-[#242f3d] rounded-3xl p-5 text-white shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#242f3d]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#3390ec]" />
                  <span>Share Note to Chat</span>
                </h3>
                <button
                  onClick={() => setSharingNote(null)}
                  className="p-1 rounded-lg text-[#7d8b99] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#0e1621] border border-[#242f3d] text-xs text-slate-300">
                <p className="font-bold text-white mb-1">"{sharingNote.content}"</p>
                {sharingNote.music && (
                  <p className="text-[11px] text-[#3390ec]">
                    🎵 {sharingNote.music.title} - {sharingNote.music.artist}
                  </p>
                )}
              </div>

              <p className="text-xs font-semibold text-[#7d8b99]">Select a conversation to forward:</p>

              <div className="max-h-56 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-[#242f3d]">
                {conversations.length === 0 ? (
                  <p className="text-xs text-[#7d8b99] text-center py-4">No active chats found.</p>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleShareToConversation(conv.id)}
                      className="w-full p-2.5 rounded-xl bg-[#0e1621] hover:bg-[#242f3d] border border-[#242f3d] flex items-center justify-between transition-colors text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#3390ec]/20 flex items-center justify-center text-[#3390ec]">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-white">
                          {conv.type === "group" ? "Group Chat" : "Direct Message"}
                        </span>
                      </div>
                      <Send className="w-3.5 h-3.5 text-[#3390ec]" />
                    </button>
                  ))
                )}
              </div>

              {shareSuccess && (
                <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Note shared successfully!</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
