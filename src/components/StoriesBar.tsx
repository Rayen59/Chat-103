import React, { useState, useEffect } from "react";
import { User, Story, Conversation, Note } from "../types";
import { Plus, Sparkles, Music, FileText } from "lucide-react";

interface StoriesBarProps {
  currentUser: User;
  allUsers: User[];
  stories: Story[];
  conversations?: Conversation[];
  onOpenCreator: () => void;
  onOpenStoryViewer: (targetUserId: string, initialStoryIndex?: number) => void;
  onOpenNotes?: () => void;
  className?: string;
}

export const StoriesBar: React.FC<StoriesBarProps> = ({
  currentUser,
  allUsers,
  stories,
  conversations = [],
  onOpenCreator,
  onOpenStoryViewer,
  onOpenNotes,
  className = ""
}) => {
  const [activeNotes, setActiveNotes] = useState<Note[]>([]);

  // Fetch active notes periodically or on mount
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await fetch("/api/notes?all=true");
        if (res.ok) {
          const data = await res.json();
          setActiveNotes(data.notes || []);
        }
      } catch (err) {
        console.error("Failed to load notes in StoriesBar:", err);
      }
    };
    fetchNotes();
  }, []);

  // Group stories by userId
  const myStories = stories.filter((s) => s.userId === currentUser.id);
  const myNote = activeNotes.find((n) => n.userId === currentUser.id);

  // Group stories for other users, respecting privacy & user hide lists
  const userStoryMap = new Map<string, { user: User; stories: Story[]; hasUnviewed: boolean }>();

  stories.forEach((story) => {
    if (story.userId === currentUser.id) return;

    // Check if story is hidden from current user
    if (story.hiddenFromUserIds && story.hiddenFromUserIds.includes(currentUser.id)) {
      return;
    }

    const userObj = allUsers.find((u) => u.id === story.userId) || {
      id: story.userId,
      username: story.userName,
      avatar: story.userAvatar,
      email: "",
      status: "online",
      isPrivate: false,
      createdAt: story.createdAt
    };

    // If profile is private, check if they share a direct conversation/contact
    if (userObj.isPrivate) {
      const isDirectContact = conversations.some(
        (c) =>
          c.type === "dm" &&
          c.participants.includes(currentUser.id) &&
          c.participants.includes(story.userId)
      );
      if (!isDirectContact) {
        return; // Private profile story not accessible
      }
    }

    let entry = userStoryMap.get(story.userId);
    if (!entry) {
      entry = { user: userObj, stories: [], hasUnviewed: false };
      userStoryMap.set(story.userId, entry);
    }
    entry.stories.push(story);
    const isViewed = story.viewers.some((v) => v.userId === currentUser.id);
    if (!isViewed) {
      entry.hasUnviewed = true;
    }
  });

  const otherUsersWithStories = Array.from(userStoryMap.values()).sort((a, b) => {
    if (a.hasUnviewed && !b.hasUnviewed) return -1;
    if (!a.hasUnviewed && b.hasUnviewed) return 1;
    const aLatest = Math.max(...a.stories.map((s) => new Date(s.createdAt).getTime()));
    const bLatest = Math.max(...b.stories.map((s) => new Date(s.createdAt).getTime()));
    return bLatest - aLatest;
  });

  return (
    <div
      id="stories-bar"
      className={`flex items-center gap-3 overflow-x-auto py-3 px-3.5 scrollbar-none select-none bg-[#17212b] border-b border-[#101921] shadow-sm ${className}`}
    >
      {/* 1. My Story Card / Add Story button & Note bubble */}
      <div className="flex flex-col items-center shrink-0 cursor-pointer group relative pt-4" id="my-story-card">
        {/* Floating Note Thought Bubble */}
        {myNote ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenNotes) onOpenNotes();
            }}
            className="absolute -top-1.5 z-20 max-w-[80px] truncate px-2 py-0.5 rounded-full bg-[#0e1621] border border-[#3390ec] text-[9px] font-bold text-white shadow-md flex items-center gap-1 hover:scale-105 transition-transform"
            title={`Your Note: "${myNote.content}"`}
          >
            <span>{myNote.moodEmoji || "💭"}</span>
            <span className="truncate">{myNote.content}</span>
            {myNote.music && <Music className="w-2.5 h-2.5 text-[#3390ec] shrink-0" />}
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenNotes) onOpenNotes();
            }}
            className="absolute -top-1.5 z-20 px-2 py-0.5 rounded-full bg-[#0e1621] border border-[#242f3d] hover:border-[#3390ec] text-[9px] font-semibold text-[#7d8b99] hover:text-white shadow-sm flex items-center gap-0.5 hover:scale-105 transition-transform"
            title="Share a Note or Status Thought"
          >
            <span>+ Note</span>
          </button>
        )}

        <div className="relative mt-1">
          <button
            onClick={() => {
              if (myStories.length > 0) {
                onOpenStoryViewer(currentUser.id, 0);
              } else {
                onOpenCreator();
              }
            }}
            className={`w-13 h-13 rounded-full p-0.5 flex items-center justify-center transition-transform group-hover:scale-105 active:scale-95 ${
              myStories.length > 0
                ? "bg-[#3390ec] shadow-sm"
                : "bg-[#0e1621] border border-[#242f3d] hover:border-[#3390ec]"
            }`}
            title={myStories.length > 0 ? "View your active stories" : "Create a new story"}
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-[#0e1621] flex items-center justify-center relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                className="w-full h-full object-cover"
              />
              {myStories.length > 0 && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#3390ec] animate-ping" />
                </div>
              )}
            </div>
          </button>

          {/* Quick Plus (+) Add Story Badge */}
          <button
            id="add-story-plus-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenCreator();
            }}
            title="Create Story"
            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#3390ec] border-2 border-[#17212b] flex items-center justify-center text-white shadow-sm hover:scale-110 active:scale-95 transition-transform"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        </div>

        <span className="text-[11px] font-medium text-white mt-1.5 truncate max-w-[64px] text-center leading-tight">
          {myStories.length > 0 ? `Your Story (${myStories.length})` : "Add Story"}
        </span>
      </div>

      {/* Vertical Subtle Divider */}
      <div className="h-10 w-[1px] bg-[#242f3d] shrink-0 mx-0.5 mt-3" />

      {/* 2. Other Users' Stories & Notes */}
      {otherUsersWithStories.map(({ user, stories: userStories, hasUnviewed }) => {
        const userNote = activeNotes.find((n) => n.userId === user.id);

        return (
          <div
            key={user.id}
            id={`story-avatar-${user.id}`}
            onClick={() => onOpenStoryViewer(user.id, 0)}
            className="flex flex-col items-center shrink-0 cursor-pointer group transition-transform active:scale-95 relative pt-4"
            title={`View ${user.username}'s ${userStories.length} ${userStories.length === 1 ? "story" : "stories"}`}
          >
            {/* Thought Bubble for other user */}
            {userNote && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenNotes) onOpenNotes();
                }}
                className="absolute -top-1.5 z-20 max-w-[76px] truncate px-1.5 py-0.5 rounded-full bg-[#0e1621] border border-[#242f3d] hover:border-[#3390ec] text-[9px] font-semibold text-slate-200 shadow-md flex items-center gap-0.5 hover:scale-105 transition-transform"
              >
                <span>{userNote.moodEmoji || "💭"}</span>
                <span className="truncate">{userNote.content}</span>
                {userNote.music && <Music className="w-2.5 h-2.5 text-[#3390ec] shrink-0" />}
              </div>
            )}

            <div className="relative mt-1">
              <div
                className={`w-13 h-13 rounded-full p-[2px] transition-all group-hover:scale-105 ${
                  hasUnviewed
                    ? "bg-[#3390ec] shadow-sm animate-pulse"
                    : "bg-[#242f3d] hover:bg-[#3390ec]/60"
                }`}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-[#0e1621] flex items-center justify-center">
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <span className="text-[11px] font-medium text-white mt-1.5 truncate max-w-[64px] text-center leading-tight">
              {user.username}
            </span>
          </div>
        );
      })}
    </div>
  );
};
