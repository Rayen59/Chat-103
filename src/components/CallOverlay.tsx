import React, { useState, useEffect, useRef } from "react";
import { ActiveCall, User } from "../types";
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Sparkles
} from "lucide-react";

interface CallOverlayProps {
  call: ActiveCall;
  currentUser: User;
  onEndCall: () => void;
}

export const CallOverlay: React.FC<CallOverlayProps> = ({
  call,
  currentUser,
  onEndCall
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);

  const otherName = call.callerId === currentUser.id ? call.targetName : call.callerName;
  const otherAvatar = call.callerId === currentUser.id ? "" : call.callerAvatar;

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (call.type === "video" && !isVideoOff) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((s) => {
          stream = s;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = s;
          }
        })
        .catch(() => {});
    }

    const timer = setInterval(() => {
      setCallDurationSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [call.type, isVideoOff]);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 text-white select-none animate-in fade-in duration-300">
      <div className="w-full max-w-xl bg-[#17212b] border border-[#101921] rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center p-6 sm:p-8 relative">
        
        {/* Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#0e1621] text-xs font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-[#42ab58] animate-ping" />
          <span className="text-white">
            MK Wavegram {call.type === "video" ? "Video" : "Voice"} Call
          </span>
          <span className="text-[#3390ec] font-mono ml-2">{formatDuration(callDurationSeconds)}</span>
        </div>

        {/* Main Display Box */}
        <div className="my-4 flex flex-col items-center justify-center relative w-full h-64 sm:h-72 rounded-xl bg-[#0e1621] border border-[#101921] overflow-hidden">
          {call.type === "video" && !isVideoOff ? (
            <div className="w-full h-full relative">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 bg-[#17212b]/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-semibold text-white">
                You
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full p-1 bg-[#3390ec] shadow-lg animate-pulse">
                  <img
                    src={
                      otherAvatar ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(otherName)}`
                    }
                    alt={otherName}
                    className="w-full h-full rounded-full object-cover bg-[#242f3d]"
                  />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white">{otherName}</h3>
                <p className="text-xs text-[#3390ec] mt-1 font-medium">
                  Connected
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3.5 rounded-full transition-all cursor-pointer ${
              isMuted
                ? "bg-rose-600 text-white"
                : "bg-[#242f3d] hover:bg-[#202b36] text-white"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {call.type === "video" && (
            <button
              onClick={() => setIsVideoOff(!isVideoOff)}
              className={`p-3.5 rounded-full transition-all cursor-pointer ${
                isVideoOff
                  ? "bg-rose-600 text-white"
                  : "bg-[#242f3d] hover:bg-[#202b36] text-white"
              }`}
              title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={onEndCall}
            className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-transform active:scale-95 cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
};
