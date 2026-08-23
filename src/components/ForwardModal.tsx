import React, { useState } from "react";
import { Message, Conversation, Group, User } from "../types";
import { X, Search, Share2, Check, Users, User as UserIcon, CheckCheck } from "lucide-react";

interface ForwardModalProps {
  message?: Message;
  messages?: Message[];
  conversations: Conversation[];
  groups: Group[];
  allUsers: User[];
  currentUser: User;
  onClose: () => void;
  onForwardToConversation: (
    conversationId: string,
    messageText: string,
    mediaUrl?: string,
    mediaType?: string
  ) => void;
  onBatchForwardToConversation?: (
    conversationId: string,
    messageIds: string[]
  ) => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({
  message,
  messages = [],
  conversations,
  groups,
  allUsers,
  currentUser,
  onClose,
  onForwardToConversation,
  onBatchForwardToConversation
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});

  const effectiveMessages: Message[] = messages.length > 0 ? messages : message ? [message] : [];

  const handleForward = (convId: string) => {
    if (onBatchForwardToConversation && effectiveMessages.length > 1) {
      onBatchForwardToConversation(
        convId,
        effectiveMessages.map((m) => m.id)
      );
    } else {
      effectiveMessages.forEach((msg) => {
        onForwardToConversation(
          convId,
          msg.text || "",
          msg.mediaUrl,
          msg.type
        );
      });
    }
    setSentMap((prev) => ({ ...prev, [convId]: true }));
  };

  const filteredConversations = conversations.filter((conv) => {
    if (conv.type === "group") {
      const g = groups.find((group) => group.id === conv.groupId);
      return g?.name.toLowerCase().includes(searchQuery.toLowerCase());
    } else {
      const otherId = conv.participants.find((id) => id !== currentUser.id);
      const u = allUsers.find((user) => user.id === otherId);
      return u?.username.toLowerCase().includes(searchQuery.toLowerCase());
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030612]/80 backdrop-blur-md p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#09112a] border border-blue-500/30 rounded-3xl p-6 text-slate-100 shadow-[0_0_50px_rgba(37,99,235,0.25)] relative flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-blue-950">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-400 animate-pulse" />
            <h2 className="text-base font-bold text-white">
              {effectiveMessages.length > 1
                ? `Forward ${effectiveMessages.length} Messages`
                : "Forward Message"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-blue-900/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Preview Box */}
        <div className="my-3 p-3 bg-[#050a1b] rounded-2xl border border-blue-950 text-xs text-slate-300 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-900/40">
          {effectiveMessages.length === 1 ? (
            <div>
              <p className="font-bold text-blue-400 mb-0.5">
                {effectiveMessages[0].senderName}:
              </p>
              <p className="truncate line-clamp-2">
                {effectiveMessages[0].text || `[${effectiveMessages[0].type || "Media"}]`}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-cyan-400 block">
                {effectiveMessages.length} messages selected for forwarding:
              </span>
              {effectiveMessages.slice(0, 3).map((m, idx) => (
                <div key={idx} className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                  <span className="text-slate-500 font-semibold">{m.senderName}:</span>
                  <span>{m.text || `[${m.type || "Media"}]`}</span>
                </div>
              ))}
              {effectiveMessages.length > 3 && (
                <span className="text-[10px] text-slate-500 italic block">
                  + {effectiveMessages.length - 3} more messages
                </span>
              )}
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="relative my-2">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chat or group..."
            className="w-full bg-[#050a1b] border border-blue-950 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto space-y-2 my-2 pr-1 scrollbar-thin scrollbar-thumb-blue-900/40">
          {filteredConversations.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-6">
              No chats found matching search
            </p>
          ) : (
            filteredConversations.map((conv) => {
              const isGroup = conv.type === "group";
              const g = groups.find((group) => group.id === conv.groupId);
              const otherId = conv.participants.find((id) => id !== currentUser.id);
              const otherUser = allUsers.find((u) => u.id === otherId);

              const name = isGroup ? g?.name || "Group Chat" : otherUser?.username || "Chat";
              const avatar = isGroup ? g?.avatar : otherUser?.avatar;
              const isSent = !!sentMap[conv.id];

              return (
                <div
                  key={conv.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#050a1b] hover:bg-[#0c1538] border border-blue-950/80 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={
                        avatar ||
                        `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(
                          name
                        )}`
                      }
                      alt={name}
                      className="w-10 h-10 rounded-2xl object-cover bg-slate-800 ring-2 ring-blue-500/30 shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                        <span>{name}</span>
                        {isGroup ? (
                          <Users className="w-3 h-3 text-indigo-400 shrink-0" />
                        ) : (
                          <UserIcon className="w-3 h-3 text-blue-400 shrink-0" />
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">
                        {isGroup ? "Group Chat" : "Direct Message"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleForward(conv.id)}
                    disabled={isSent}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 ${
                      isSent
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30"
                    }`}
                  >
                    {isSent ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Sent</span>
                      </>
                    ) : (
                      <span>Send</span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-blue-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#050a1b] hover:bg-[#0c1538] text-xs font-bold text-slate-300 border border-blue-950 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
