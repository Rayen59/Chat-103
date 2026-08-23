import React, { useState } from "react";
import { User, Story, Conversation, Group } from "../types";
import {
  X,
  Search,
  Send,
  Check,
  Share2,
  Copy,
  Link,
  Users,
  CheckCheck,
  Sparkles,
  MessageSquare
} from "lucide-react";

interface ShareStoryModalProps {
  story: Story;
  currentUser: User;
  conversations: Conversation[];
  groups: Group[];
  allUsers: User[];
  onClose: () => void;
  onShareComplete: (targetConvId: string) => void;
}

export const ShareStoryModal: React.FC<ShareStoryModalProps> = ({
  story,
  currentUser,
  conversations,
  groups,
  allUsers,
  onClose,
  onShareComplete
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConvIds, setSelectedConvIds] = useState<string[]>([]);
  const [customNote, setCustomNote] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successToast, setSuccessToast] = useState("");

  // Get recipient title for each conversation
  const getConversationDetails = (conv: Conversation) => {
    if (conv.type === "group") {
      const g = groups.find((grp) => grp.id === conv.groupId);
      return {
        name: g?.name || "Group Chat",
        avatar: g?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${conv.id}`,
        isGroup: true
      };
    } else {
      const otherUserId = conv.participants.find((id) => id !== currentUser.id);
      const otherUser = allUsers.find((u) => u.id === otherUserId);
      return {
        name: otherUser?.username || "Direct Chat",
        avatar: otherUser?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${otherUserId || "user"}`,
        isGroup: false
      };
    }
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter((conv) => {
    const details = getConversationDetails(conv);
    return details.name.toLowerCase().includes(searchTerm.toLowerCase().trim());
  });

  const toggleSelectConversation = (convId: string) => {
    setSelectedConvIds((prev) =>
      prev.includes(convId) ? prev.filter((id) => id !== convId) : [...prev, convId]
    );
  };

  const handleCopyStoryLink = () => {
    const link = `${window.location.origin}/?story=${story.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Wavegram Story by @${story.userName}`,
          text: story.caption || story.textContent || "Check out this story on Wavegram!",
          url: `${window.location.origin}/?story=${story.id}`
        });
      } catch (err) {
        // User cancelled or failed
      }
    }
  };

  const handleShareToSelectedChats = async () => {
    if (selectedConvIds.length === 0) {
      setErrorMsg("Please select at least one chat conversation to share to.");
      return;
    }

    setIsSharing(true);
    setErrorMsg("");

    try {
      // Send share request to all selected conversations
      const promises = selectedConvIds.map((convId) =>
        fetch(`/api/stories/${story.id}/share-to-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: convId,
            senderId: currentUser.id,
            customNote: customNote.trim() || undefined
          })
        })
      );

      await Promise.all(promises);

      setSuccessToast(`Shared story to ${selectedConvIds.length} chat(s)!`);
      setTimeout(() => {
        onShareComplete(selectedConvIds[0]);
      }, 700);
    } catch (err) {
      console.error("Error sharing story:", err);
      setErrorMsg("Failed to share story. Please try again.");
      setIsSharing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#09112a] border border-blue-900/60 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 text-white animate-in zoom-in-95 duration-200 overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-blue-950/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-inner">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Share Story</h3>
              <p className="text-[11px] text-slate-400">Send story card directly to your chats</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Story Snapshot Preview Card */}
        <div className="p-3 rounded-2xl bg-[#040816] border border-blue-950/80 flex items-center gap-3">
          <div className="w-12 h-16 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-white/10 flex items-center justify-center relative">
            {story.mediaUrl ? (
              <img
                src={story.mediaUrl}
                alt="Story thumbnail"
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full p-1 text-[9px] font-bold text-white flex items-center justify-center text-center leading-tight"
                style={{ background: story.textStyle?.backgroundGradient || "#06b6d4" }}
              >
                {story.textContent ? story.textContent.substring(0, 20) + "..." : "Story"}
              </div>
            )}
            <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/70 text-[8px] font-bold text-white uppercase">
              {story.type}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <img
                src={story.userAvatar}
                alt={story.userName}
                className="w-4 h-4 rounded-full object-cover"
              />
              <span className="text-xs font-bold text-cyan-300 truncate">@{story.userName}</span>
            </div>
            <p className="text-xs text-white/90 truncate mt-0.5 font-medium">
              {story.caption || story.textContent || (story.anonymousPrompt ? story.anonymousPrompt.question : "24h Story")}
            </p>
            <span className="text-[10px] text-slate-400">
              Created {new Date(story.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>

        {/* Quick External & Copy Link Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyStoryLink}
            className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              copiedLink
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                : "bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
            }`}
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? "Link Copied!" : "Copy Story Link"}</span>
          </button>

          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <button
              onClick={handleNativeShare}
              className="py-2 px-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>More...</span>
            </button>
          )}
        </div>

        {/* Optional Custom Message Note */}
        <div>
          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Add an optional message or comment..."
            className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Search Chats */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search chats & groups..."
            className="w-full py-2 pl-9 pr-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Conversation Picker List */}
        <div className="flex-1 overflow-y-auto max-h-[220px] flex flex-col gap-1.5 pr-1 scrollbar-thin">
          {filteredConversations.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs">
              No conversations found.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const details = getConversationDetails(conv);
              const isSelected = selectedConvIds.includes(conv.id);

              return (
                <div
                  key={conv.id}
                  onClick={() => toggleSelectConversation(conv.id)}
                  className={`p-2.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? "bg-cyan-500/15 border-cyan-500/50 text-white"
                      : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/80 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={details.avatar}
                      alt={details.name}
                      className="w-8 h-8 rounded-full object-cover border border-white/10"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold truncate flex items-center gap-1 text-white">
                        <span>{details.name}</span>
                        {details.isGroup && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Group
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">
                        {details.isGroup ? "Group Chat" : "Direct Message"}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-cyan-500 border-cyan-400 text-slate-950"
                        : "border-slate-700 bg-slate-900"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Error message */}
        {errorMsg && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-xl text-center font-medium">
            {errorMsg}
          </p>
        )}

        {/* Success toast */}
        {successToast && (
          <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl text-center font-bold flex items-center justify-center gap-1.5">
            <CheckCheck className="w-4 h-4" />
            <span>{successToast}</span>
          </p>
        )}

        {/* Action Footer */}
        <div className="flex items-center justify-between border-t border-blue-950/80 pt-3 gap-2">
          <span className="text-xs text-slate-400">
            {selectedConvIds.length > 0
              ? `${selectedConvIds.length} chat(s) selected`
              : "Select recipient chats"}
          </span>

          <button
            onClick={handleShareToSelectedChats}
            disabled={selectedConvIds.length === 0 || isSharing}
            className="py-2.5 px-5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
          >
            {isSharing ? (
              <span>Sending...</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send to Chat{selectedConvIds.length > 1 ? "s" : ""}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
