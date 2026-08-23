import React, { useState, useRef } from "react";
import { User } from "../types";
import {
  X,
  LogOut,
  Trash2,
  Upload,
  Check,
  Lock,
  Globe,
  EyeOff,
  Eye,
  Shield,
  ShieldCheck,
  Camera,
  BadgeCheck,
  User as UserIcon,
  Mail,
  FileText,
  Bell,
  HardDrive
} from "lucide-react";

interface ProfileModalProps {
  currentUser: User;
  onClose: () => void;
  onUpdateProfile: (updated: {
    username?: string;
    avatar?: string;
    bio?: string;
    isPrivate?: boolean;
    hideEmail?: boolean;
  }) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
}

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
  "https://api.dicebear.com/7.x/bottts/svg?seed=wavegram1",
  "https://api.dicebear.com/7.x/bottts/svg?seed=wavegram2",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
  "https://api.dicebear.com/7.x/identicon/svg?seed=wavegramUser"
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  currentUser,
  onClose,
  onUpdateProfile,
  onLogout,
  onDeleteAccount
}) => {
  const [username, setUsername] = useState(currentUser.username);
  const [bio, setBio] = useState(currentUser.bio || "");
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [customAvatar, setCustomAvatar] = useState("");
  const [isPrivate, setIsPrivate] = useState<boolean>(!!currentUser.isPrivate);
  const [hideEmail, setHideEmail] = useState<boolean>(!!currentUser.hideEmail);
  const [saving, setSaving] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Url = reader.result as string;
        setAvatar(base64Url);
        setCustomAvatar(base64Url);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const selectedAvatar = customAvatar.trim() || avatar;

    try {
      const res = await fetch("/api/users/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          username: username.trim(),
          avatar: selectedAvatar,
          bio,
          isPrivate,
          hideEmail
        })
      });

      if (res.ok) {
        onUpdateProfile({
          username: username.trim(),
          avatar: selectedAvatar,
          bio,
          isPrivate,
          hideEmail
        });
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#17212b] border border-[#101921] rounded-2xl p-6 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-none">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#101921]">
          <h2 className="text-lg font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#7d8b99] hover:text-white hover:bg-[#202b36] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Info Header */}
        <div className="flex items-center gap-4 py-4 border-b border-[#101921]">
          <div className="relative shrink-0">
            <div className="w-18 h-18 rounded-full overflow-hidden bg-[#242f3d] ring-2 ring-[#3390ec]/30 shadow-md">
              <img src={customAvatar || avatar} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#3390ec] hover:bg-[#2481cc] text-white shadow-lg border-2 border-[#17212b] transition-transform active:scale-95 cursor-pointer"
              title="Change Profile Photo"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-lg font-bold text-white truncate">{username || currentUser.username}</h3>
              <BadgeCheck className="w-4 h-4 text-[#3390ec] shrink-0" />
            </div>
            <p className="text-xs text-[#7d8b99] truncate">
              {hideEmail || isPrivate ? "Email Hidden" : currentUser.email}
            </p>
            <span className="inline-block mt-1 text-[11px] font-medium text-[#42ab58]">
              online
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 pt-4">
          {/* Avatar Presets */}
          <div>
            <label className="block text-xs font-semibold text-[#7d8b99] mb-2 uppercase tracking-wider">
              Choose Avatar
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {AVATAR_PRESETS.map((presetUrl, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => {
                    setAvatar(presetUrl);
                    setCustomAvatar("");
                  }}
                  className={`w-10 h-10 rounded-full overflow-hidden shrink-0 transition-transform ${
                    avatar === presetUrl && !customAvatar
                      ? "ring-2 ring-[#3390ec] scale-105"
                      : "opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={presetUrl} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <input
              type="file"
              ref={galleryInputRef}
              onChange={handleGalleryUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-[#7d8b99] mb-1.5 uppercase tracking-wider">
              Display Name
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your Name"
              className="w-full bg-[#0e1621] border border-[#101921] rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-[#7d8b99] focus:outline-none focus:border-[#3390ec] transition-colors"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-semibold text-[#7d8b99] mb-1.5 uppercase tracking-wider">
              Bio / Status
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Any details such as age, occupation or city."
              className="w-full bg-[#0e1621] border border-[#101921] rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-[#7d8b99] focus:outline-none focus:border-[#3390ec] transition-colors resize-none"
            />
          </div>

          {/* Privacy & Security Settings */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-semibold text-[#7d8b99] uppercase tracking-wider">
              Privacy and Security
            </label>

            <div className="p-3 bg-[#0e1621] border border-[#101921] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#242f3d] text-[#3390ec]">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Private Profile</div>
                  <div className="text-xs text-[#7d8b99]">Require approval for new incoming chats</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 rounded text-[#3390ec] focus:ring-[#3390ec] bg-[#17212b] border-[#101921] cursor-pointer"
              />
            </div>

            <div className="p-3 bg-[#0e1621] border border-[#101921] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#242f3d] text-[#3390ec]">
                  <EyeOff className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Hide Email Address</div>
                  <div className="text-xs text-[#7d8b99]">Keep email private from public search</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={hideEmail}
                onChange={(e) => setHideEmail(e.target.checked)}
                className="w-4 h-4 rounded text-[#3390ec] focus:ring-[#3390ec] bg-[#17212b] border-[#101921] cursor-pointer"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#101921] flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-[#3390ec] hover:bg-[#2481cc] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-[#242f3d] hover:bg-[#202b36] text-slate-300 text-sm font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Account Actions */}
        <div className="pt-4 mt-4 border-t border-[#101921] space-y-2">
          <button
            type="button"
            onClick={onLogout}
            className="w-full py-2.5 px-3 bg-[#242f3d] hover:bg-[#202b36] text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4 text-[#7d8b99]" />
            <span>Log Out</span>
          </button>

          {showConfirmDelete ? (
            <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl space-y-2">
              <p className="text-xs text-rose-300 font-medium">
                Are you sure you want to permanently delete your account and all data?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onDeleteAccount}
                  className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Yes, Delete Forever
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-3 py-1.5 bg-[#17212b] text-slate-300 text-xs font-medium rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="w-full py-2 px-3 text-rose-400 hover:bg-rose-950/20 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Account</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
