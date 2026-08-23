import React, { useState } from "react";
import { User, Conversation, ChatRequest } from "../types";
import {
  X,
  MessageSquare,
  Mail,
  UserX,
  UserCheck,
  Lock,
  Send,
  Clock,
  BadgeCheck,
  Phone,
  Video,
  Info,
  AtSign
} from "lucide-react";
import { getWavegramAvatarColor, getWavegramInitials } from "./Sidebar";

interface UserProfileModalProps {
  user: User;
  currentUser: User;
  conversations?: Conversation[];
  chatRequests?: ChatRequest[];
  onClose: () => void;
  onStartDM: (userId: string) => void;
  onBlockUser?: (userId: string) => void;
  onSendChatRequest?: (targetUserId: string, message?: string) => Promise<void>;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  currentUser,
  conversations = [],
  chatRequests = [],
  onClose,
  onStartDM,
  onBlockUser,
  onSendChatRequest
}) => {
  const isMe = user.id === currentUser.id;
  const isBlocked = currentUser.blockedUserIds?.includes(user.id);
  const isPrivate = !!user.isPrivate;
  const shouldHideEmail = !isMe && (user.hideEmail || isPrivate);

  const hasExistingConversation = conversations.some(
    (c) =>
      c.type === "dm" &&
      c.participants.includes(currentUser.id) &&
      c.participants.includes(user.id)
  );

  const existingPendingRequest = chatRequests.find(
    (r) =>
      r.fromUserId === currentUser.id &&
      r.toUserId === user.id &&
      r.status === "pending"
  );

  const [showRequestInput, setShowRequestInput] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sendingRequest) return;
    setSendingRequest(true);
    try {
      if (onSendChatRequest) {
        await onSendChatRequest(user.id, requestMessage);
      } else {
        await fetch("/api/requests/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromUserId: currentUser.id,
            toUserId: user.id,
            message: requestMessage
          })
        });
      }
      setRequestSent(true);
      setShowRequestInput(false);
    } catch (err) {
      console.error("Failed to send chat request:", err);
    } finally {
      setSendingRequest(false);
    }
  };

  const avatarColor = getWavegramAvatarColor(user.username);
  const initials = getWavegramInitials(user.username);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#17212b] border border-[#101921] rounded-2xl p-6 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-none">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#7d8b99] hover:text-white hover:bg-[#202b36] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header Card */}
        <div className="flex flex-col items-center text-center pb-5 border-b border-[#101921]">
          <div className="relative w-22 h-22 mb-3.5">
            {user.avatar && !user.avatar.includes("default-avatar") ? (
              <img
                src={user.avatar}
                alt={user.username}
                className="w-full h-full rounded-full object-cover bg-[#242f3d] ring-2 ring-[#3390ec]/30 shadow-lg"
              />
            ) : (
              <div
                className={`w-full h-full rounded-full ${avatarColor} text-white flex items-center justify-center font-bold text-2xl shadow-lg`}
              >
                {initials}
              </div>
            )}
            <span
              className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-[#17212b] ${
                user.status === "online" ? "bg-[#42ab58]" : "bg-[#7d8b99]"
              }`}
            />
          </div>

          <div className="flex items-center gap-1.5 justify-center mb-1">
            <h2 className="text-xl font-bold text-white truncate">{user.username}</h2>
            {user.hasAccount !== false && (
              <BadgeCheck className="w-5 h-5 text-[#3390ec] shrink-0" />
            )}
            {isPrivate && (
              <span className="text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.2 rounded font-semibold">
                Private
              </span>
            )}
          </div>

          <p className="text-xs text-[#7d8b99]">
            {user.status === "online" ? (
              <span className="text-[#3390ec] font-medium">online</span>
            ) : (
              "last seen recently"
            )}
          </p>
        </div>

        {/* User Details */}
        <div className="py-4 space-y-3.5 border-b border-[#101921]">
          {/* Bio */}
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-[#7d8b99] mt-0.5 shrink-0" />
            <div>
              <div className="text-[11px] font-semibold text-[#7d8b99] uppercase tracking-wider">Bio</div>
              <div className="text-sm text-white">{user.bio || "No bio set."}</div>
            </div>
          </div>

          {/* Username handle */}
          <div className="flex items-start gap-3">
            <AtSign className="w-4 h-4 text-[#7d8b99] mt-0.5 shrink-0" />
            <div>
              <div className="text-[11px] font-semibold text-[#7d8b99] uppercase tracking-wider">Username</div>
              <div className="text-sm text-[#3390ec] font-medium">@{user.username.toLowerCase().replace(/\s+/g, "")}</div>
            </div>
          </div>

          {/* Email */}
          {!shouldHideEmail && (
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-[#7d8b99] mt-0.5 shrink-0" />
              <div>
                <div className="text-[11px] font-semibold text-[#7d8b99] uppercase tracking-wider">Email</div>
                <div className="text-sm text-white">{user.email}</div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 space-y-2.5">
          {!isMe && (
            <>
              {isPrivate && !hasExistingConversation ? (
                <>
                  {existingPendingRequest || requestSent ? (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center text-xs text-amber-300 flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Chat Invitation Pending</span>
                    </div>
                  ) : showRequestInput ? (
                    <form onSubmit={handleSendRequest} className="space-y-2">
                      <input
                        type="text"
                        placeholder="Add an optional greeting message..."
                        value={requestMessage}
                        onChange={(e) => setRequestMessage(e.target.value)}
                        className="w-full bg-[#0e1621] border border-[#101921] rounded-xl py-2 px-3 text-xs text-white placeholder-[#7d8b99] focus:outline-none focus:border-[#3390ec]"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={sendingRequest}
                          className="flex-1 py-2 bg-[#3390ec] hover:bg-[#2481cc] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Invitation</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRequestInput(false)}
                          className="px-3 py-2 bg-[#242f3d] text-slate-300 text-xs font-medium rounded-xl"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowRequestInput(true)}
                      className="w-full py-2.5 bg-[#3390ec] hover:bg-[#2481cc] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Request to Chat</span>
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => {
                    onClose();
                    onStartDM(user.id);
                  }}
                  className="w-full py-2.5 bg-[#3390ec] hover:bg-[#2481cc] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send Message</span>
                </button>
              )}

              {onBlockUser && (
                <button
                  type="button"
                  onClick={() => {
                    onBlockUser(user.id);
                    onClose();
                  }}
                  className="w-full py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/20 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  {isBlocked ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Unblock User</span>
                    </>
                  ) : (
                    <>
                      <UserX className="w-3.5 h-3.5" />
                      <span>Block User</span>
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};
