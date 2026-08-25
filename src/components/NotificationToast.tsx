import React, { useState, useEffect } from "react";
import { MessageSquare, PhoneCall, X, Sparkles, ShieldAlert, ArrowRight, Radio } from "lucide-react";

export interface AppNotification {
  id: string;
  type: "message" | "call" | "system";
  title: string;
  senderName?: string;
  senderAvatar?: string;
  text: string;
  conversationId?: string;
  createdAt: string;
}

interface NotificationToastProps {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
  onSelectNotification: (notification: AppNotification) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notifications,
  onDismiss,
  onSelectNotification
}) => {
  // Auto dismiss after 6.5 seconds
  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[notifications.length - 1];
      const timer = setTimeout(() => {
        onDismiss(latest.id);
      }, 6500);
      return () => clearTimeout(timer);
    }
  }, [notifications, onDismiss]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-[92vw] sm:w-full pointer-events-none px-2 select-none">
      {notifications.slice(-3).map((notif) => (
        <div
          key={notif.id}
          onClick={() => onSelectNotification(notif)}
          className="pointer-events-auto bg-[#17212b]/95 backdrop-blur-md border border-[#101921] hover:border-[#3390ec]/60 rounded-2xl p-3.5 shadow-2xl text-white flex flex-col gap-2 transition-all animate-in slide-in-from-top-4 duration-300 cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-start gap-3">
            {/* Avatar with indicator */}
            <div className="relative shrink-0 mt-0.5">
              <img
                src={
                  notif.senderAvatar ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                }
                alt={notif.senderName}
                className="w-10 h-10 rounded-full object-cover ring-1 ring-[#3390ec]/40 group-hover:scale-105 transition-all shadow-sm bg-[#0e1621]"
              />
              <span
                className={`absolute -bottom-1 -right-1 p-1 rounded-full text-white shadow-md ${
                  notif.type === "system"
                    ? "bg-rose-600"
                    : notif.type === "call"
                    ? "bg-emerald-600 animate-pulse"
                    : "bg-[#3390ec]"
                }`}
              >
                {notif.type === "call" ? (
                  <PhoneCall className="w-2.5 h-2.5" />
                ) : notif.type === "system" ? (
                  <ShieldAlert className="w-2.5 h-2.5" />
                ) : (
                  <MessageSquare className="w-2.5 h-2.5" />
                )}
              </span>
            </div>

            {/* Notification content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-white group-hover:text-[#3390ec] transition-colors truncate">
                  {notif.senderName}
                </span>
                <span className="text-[10px] text-[#7d8b99] font-medium shrink-0">
                  Just now
                </span>
              </div>

              <p className="text-xs text-[#7d8b99] truncate mt-0.5 leading-relaxed">
                {notif.text}
              </p>

              {/* Direct action button banner */}
              <div className="mt-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#3390ec]/20 group-hover:bg-[#3390ec] text-[#3390ec] group-hover:text-white text-[10px] font-bold transition-all">
                  <span>Open</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(notif.id);
              }}
              className="p-1 rounded-lg text-[#7d8b99] hover:text-white hover:bg-[#202b36] transition-colors shrink-0 -mr-1 -mt-1 cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
