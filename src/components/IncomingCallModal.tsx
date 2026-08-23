import React from "react";
import { ActiveCall } from "../types";
import { Phone, PhoneOff, Video } from "lucide-react";

interface IncomingCallModalProps {
  call: ActiveCall;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  call,
  onAccept,
  onDecline
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none animate-fadeIn">
      <div className="w-full max-w-sm bg-[#17212b] border border-[#101921] rounded-2xl p-6 text-white shadow-2xl relative flex flex-col items-center text-center">
        
        {/* Call Type Header */}
        <div className="px-3 py-1 rounded-full bg-[#242f3d] text-[#3390ec] text-xs font-semibold mb-4">
          Incoming MK Wavegram {call.type === "video" ? "Video" : "Voice"} Call
        </div>

        {/* Pulsing Avatar */}
        <div className="relative w-24 h-24 mb-4">
          <div className="absolute inset-0 rounded-full bg-[#3390ec]/20 animate-ping" />
          <img
            src={
              call.callerAvatar ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                call.callerName
              )}`
            }
            alt={call.callerName}
            className="w-full h-full rounded-full object-cover bg-[#242f3d] ring-2 ring-[#3390ec]/50 shadow-xl relative z-10"
          />
        </div>

        {/* Caller Name */}
        <h3 className="text-xl font-bold text-white mb-1">{call.callerName}</h3>
        <p className="text-xs text-[#7d8b99] mb-6">
          Ringing...
        </p>

        {/* Accept / Decline Buttons */}
        <div className="flex items-center justify-center gap-6 w-full">
          <button
            onClick={onDecline}
            className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Decline</span>
          </button>

          <button
            onClick={onAccept}
            className="flex-1 py-3 px-4 rounded-xl bg-[#42ab58] hover:bg-[#3ba04f] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 animate-pulse cursor-pointer"
          >
            {call.type === "video" ? (
              <Video className="w-4 h-4" />
            ) : (
              <Phone className="w-4 h-4" />
            )}
            <span>Answer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
