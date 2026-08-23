import React, { useState, useRef } from "react";
import { User, Group, Conversation } from "../types";
import {
  X,
  Users,
  Lock,
  Copy,
  Check,
  Plus,
  ShieldAlert,
  Sparkles,
  Shield,
  Trash2,
  Award,
  KeyRound,
  Megaphone,
  VolumeX,
  Volume2,
  UserX,
  UserCheck,
  CheckSquare,
  Square,
  AlertCircle,
  Camera,
  History,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Clock,
  UserPlus,
  MessageSquare,
  Search,
  AlertTriangle,
  Ban
} from "lucide-react";

interface GroupModalProps {
  mode: "create" | "join" | "manage";
  currentUser: User;
  group?: Group;
  allUsers: User[];
  conversations?: Conversation[];
  onClose: () => void;
  onCreateGroup: (payload: {
    name: string;
    description: string;
    isPrivate: boolean;
    password?: string;
    themeColor: string;
    avatar: string;
    historyVisibleToNewMembers?: boolean;
  }) => void;
  onJoinGroup: (inviteCode: string, password?: string) => void;
  onManageMembers: (
    action:
      | "add"
      | "add_bulk"
      | "remove"
      | "toggle_admin"
      | "add_badge"
      | "restrict_member"
      | "toggle_announcement_mode"
      | "toggle_history_visibility"
      | "update_avatar"
      | "update_theme"
      | "remove_bulk",
    targetUserId: string,
    badgeName?: string,
    badgeColor?: string,
    targetUserIds?: string[],
    avatar?: string
  ) => void;
  onDeleteGroup?: (groupId: string) => void;
  onBlockUser?: (targetUserId: string) => void;
}

const THEME_COLORS = [
  { name: "Sapphire Blue", hex: "#3b82f6" },
  { name: "Cyan Teal", hex: "#06b6d4" },
  { name: "Emerald Green", hex: "#10b981" },
  { name: "Purple Dream", hex: "#8b5cf6" },
  { name: "Hot Pink", hex: "#ec4899" },
  { name: "Amber Gold", hex: "#f59e0b" },
  { name: "Crimson Red", hex: "#ef4444" },
  { name: "Indigo Wave", hex: "#6366f1" }
];

const PRESET_GROUP_AVATARS = [
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=150&auto=format&fit=crop&q=80",
  "https://api.dicebear.com/7.x/identicon/svg?seed=group1",
  "https://api.dicebear.com/7.x/identicon/svg?seed=group2"
];

export const GroupModal: React.FC<GroupModalProps> = ({
  mode,
  currentUser,
  group,
  allUsers,
  conversations = [],
  onClose,
  onCreateGroup,
  onJoinGroup,
  onManageMembers,
  onDeleteGroup,
  onBlockUser
}) => {
  // Create mode state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [themeColor, setThemeColor] = useState(THEME_COLORS[0].hex);
  const [avatar, setAvatar] = useState(PRESET_GROUP_AVATARS[0]);
  const [historyVisibleToNewMembers, setHistoryVisibleToNewMembers] = useState(true);

  // Join mode state
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [joinPasswordInput, setJoinPasswordInput] = useState("");

  // Manage mode state
  const [copied, setCopied] = useState(false);
  const [badgeTargetId, setBadgeTargetId] = useState<string | null>(null);
  const [customBadgeName, setCustomBadgeName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [showBulkRemoveConfirm, setShowBulkRemoveConfirm] = useState(false);
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Add Members Modal State
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [addMembersTab, setAddMembersTab] = useState<"chats" | "all">("chats");
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const [selectedNewMemberIds, setSelectedNewMemberIds] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const createFileInputRef = useRef<HTMLInputElement | null>(null);

  const isCreator = group?.creatorId === currentUser.id;
  const isAdmin = group?.adminIds.includes(currentUser.id) || isCreator;

  // Rate Limiting Calculation: 5 photo changes per 48 hours
  const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
  const recentPhotoChanges = (group?.photoChangeHistory || []).filter(
    (ts) => new Date(ts).getTime() >= twoDaysAgo
  );
  const photoChangesUsed = recentPhotoChanges.length;
  const photoChangesRemaining = Math.max(0, 5 - photoChangesUsed);
  const isPhotoChangeLimitReached = photoChangesUsed >= 5;

  // Filter contacts that the current admin has chatted with (DM conversations)
  const directChatUserIds = conversations
    .filter((c) => c.type === "dm" && c.participants.includes(currentUser.id))
    .map((c) => c.participants.find((p) => p !== currentUser.id))
    .filter((id): id is string => !!id && id !== currentUser.id);

  const directChatUsers = allUsers.filter(
    (u) =>
      directChatUserIds.includes(u.id) &&
      u.id !== currentUser.id &&
      !group?.memberIds.includes(u.id)
  );

  const allNonMembers = allUsers.filter(
    (u) => u.id !== currentUser.id && !group?.memberIds.includes(u.id)
  );

  const displayedAddCandidateUsers = (
    addMembersTab === "chats" ? directChatUsers : allNonMembers
  ).filter(
    (u) =>
      u.username.toLowerCase().includes(addMemberSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(addMemberSearch.toLowerCase())
  );

  const handleCopyInvite = () => {
    if (!group) return;
    navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSelectMember = (memberId: string) => {
    if (selectedMemberIds.includes(memberId)) {
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== memberId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, memberId]);
    }
  };

  const handleSelectAll = () => {
    if (!group) return;
    const nonOwners = group.memberIds.filter((id) => id !== group.creatorId && id !== currentUser.id);
    if (selectedMemberIds.length === nonOwners.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(nonOwners);
    }
  };

  const handleConfirmBulkRemove = () => {
    if (selectedMemberIds.length === 0) return;
    onManageMembers("remove_bulk", "", undefined, undefined, selectedMemberIds);
    setSelectedMemberIds([]);
    setShowBulkRemoveConfirm(false);
  };

  // Upload Group Photo from Gallery (Manage Mode)
  const handleGroupPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isPhotoChangeLimitReached) {
      setPhotoError("Limit reached: You can only change the group photo 5 times every 2 days.");
      return;
    }

    setPhotoError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      onManageMembers("update_avatar", "", undefined, undefined, undefined, result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Upload Group Photo from Gallery (Create Mode)
  const handleCreatePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleToggleSelectNewMember = (userId: string) => {
    if (selectedNewMemberIds.includes(userId)) {
      setSelectedNewMemberIds(selectedNewMemberIds.filter((id) => id !== userId));
    } else {
      setSelectedNewMemberIds([...selectedNewMemberIds, userId]);
    }
  };

  const handleConfirmAddMembers = () => {
    if (selectedNewMemberIds.length === 0) return;
    onManageMembers("add_bulk", "", undefined, undefined, selectedNewMemberIds);
    setSelectedNewMemberIds([]);
    setShowAddMembersModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-lg bg-[#17212b] border border-[#101921] rounded-2xl p-6 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#242f3d]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-[#7d8b99] hover:text-white hover:bg-[#202b36] transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* CREATE GROUP MODE */}
        {mode === "create" && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-[#3390ec] flex items-center justify-center text-white shadow-md">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">New Group</h2>
                <p className="text-xs text-[#7d8b99]">Create a channel for your team or community</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim()) return;
                onCreateGroup({
                  name: name.trim(),
                  description,
                  isPrivate,
                  password: isPrivate ? password : undefined,
                  themeColor,
                  avatar,
                  historyVisibleToNewMembers
                });
              }}
              className="space-y-4"
            >
              {/* Group Photo Selection & Gallery Upload */}
              <div>
                <label className="block text-xs font-semibold text-[#7d8b99] mb-2">Group Icon / Photo</label>
                <div className="flex items-center gap-3">
                  <div className="relative group/avatar shrink-0">
                    <img
                      src={avatar}
                      alt="Selected Avatar"
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-[#3390ec]/50 bg-[#0e1621]"
                    />
                    <button
                      type="button"
                      onClick={() => createFileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-white transition-opacity"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 space-y-2">
                    <button
                      type="button"
                      onClick={() => createFileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-[#202b36] hover:bg-[#283645] border border-[#101921] rounded-xl text-xs font-semibold text-[#3390ec] flex items-center gap-1.5 transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Upload from Gallery</span>
                    </button>
                    <input
                      ref={createFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCreatePhotoUpload}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      {PRESET_GROUP_AVATARS.map((pUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAvatar(pUrl)}
                          className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all ${
                            avatar === pUrl ? "border-[#3390ec] scale-110" : "border-transparent opacity-60 hover:opacity-100"
                          }`}
                        >
                          <img src={pUrl} alt="Preset" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#7d8b99] mb-1">Group Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design Innovators"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0e1621] border border-[#101921] rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#3390ec] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#7d8b99] mb-1">Description</label>
                <textarea
                  placeholder="What is this group about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#0e1621] border border-[#101921] rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#3390ec] h-16 resize-none transition-all"
                />
              </div>

              {/* Theme Color Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[#7d8b99]">Group Theme Accent</label>
                  <span className="text-[10px] text-[#7d8b99] font-mono">
                    {THEME_COLORS.find((c) => c.hex === themeColor)?.name || "Custom"}
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {THEME_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setThemeColor(c.hex)}
                      title={c.name}
                      className={`h-9 rounded-xl transition-all flex items-center justify-center relative shadow-md ${
                        themeColor === c.hex
                          ? "scale-110 ring-2 ring-white shadow-lg"
                          : "opacity-75 hover:opacity-100 hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {themeColor === c.hex && <Check className="w-4 h-4 text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* History Visibility Setting for New Members */}
              <div className="p-3 bg-[#0e1621] border border-[#101921] rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#202b36] text-[#3390ec]">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-white">Past Chat History</span>
                    <p className="text-[10px] text-[#7d8b99]">
                      {historyVisibleToNewMembers
                        ? "New members can see full message history"
                        : "New members only see messages sent after joining"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryVisibleToNewMembers(!historyVisibleToNewMembers)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    historyVisibleToNewMembers
                      ? "bg-[#3390ec]/20 text-[#3390ec] border border-[#3390ec]/30"
                      : "bg-[#202b36] text-[#7d8b99]"
                  }`}
                >
                  {historyVisibleToNewMembers ? "Visible" : "Hidden"}
                </button>
              </div>

              {/* Private Group Toggle & Password */}
              <div className="p-3 bg-[#0e1621] border border-[#101921] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-xs text-white">Password Protected</span>
                    <p className="text-[10px] text-[#7d8b99]">Require password to join via code</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="w-4 h-4 accent-[#3390ec] rounded"
                  />
                </div>

                {isPrivate && (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#7d8b99] mb-1">Set Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Group entrance password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#17212b] border border-[#101921] rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#3390ec]"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#3390ec] hover:bg-[#2481cc] text-white font-bold text-xs rounded-xl shadow-md transition-all mt-4 active:scale-[0.98]"
              >
                Create Group
              </button>
            </form>
          </div>
        )}

        {/* JOIN GROUP MODE */}
        {mode === "join" && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-[#3390ec] flex items-center justify-center text-white shadow-md">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Join Group</h2>
                <p className="text-xs text-[#7d8b99]">Enter invite code or password provided by an administrator</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!inviteCodeInput.trim()) return;
                onJoinGroup(inviteCodeInput.trim(), joinPasswordInput || undefined);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-[#7d8b99] mb-1">Group Invite Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WAVE-TECH-2026"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                  className="w-full bg-[#0e1621] border border-[#101921] rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#3390ec] uppercase font-mono tracking-wider"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#7d8b99] mb-1">Group Password (if required)</label>
                <input
                  type="password"
                  placeholder="Leave empty if public"
                  value={joinPasswordInput}
                  onChange={(e) => setJoinPasswordInput(e.target.value)}
                  className="w-full bg-[#0e1621] border border-[#101921] rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#3390ec]"
                />
              </div>

              <div className="p-3 bg-[#0e1621] border border-[#101921] rounded-xl text-[11px] text-[#7d8b99] flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-[#3390ec] shrink-0 mt-0.5" />
                <span>
                  Note: If you were previously removed from this group by an admin, you cannot re-join with an invite code. Only an admin can directly re-add you.
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#3390ec] hover:bg-[#2481cc] text-white font-bold text-xs rounded-xl shadow-md transition-all mt-4 active:scale-[0.98]"
              >
                Join Group
              </button>
            </form>
          </div>
        )}

        {/* MANAGE GROUP MODE */}
        {mode === "manage" && group && (
          <div className="space-y-6">
            {/* Header with Group Photo, Gallery Upload & 5 Changes Rate Limiter */}
            <div className="p-4 bg-[#0e1621] border border-[#101921] rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="relative group/photo shrink-0">
                  <img
                    src={group.avatar}
                    alt={group.name}
                    className="w-16 h-16 rounded-full object-cover bg-[#17212b] ring-2 shadow-lg"
                    style={{ borderColor: group.themeColor || "#3390ec" }}
                  />
                  {isAdmin && (
                    <button
                      onClick={() => {
                        if (isPhotoChangeLimitReached) {
                          setPhotoError("Limit reached: Group photo can only be changed 5 times every 2 days.");
                        } else {
                          fileInputRef.current?.click();
                        }
                      }}
                      className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover/photo:opacity-100 flex flex-col items-center justify-center text-white transition-opacity text-[10px] font-semibold"
                    >
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span>Change</span>
                    </button>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white truncate">{group.name}</h2>
                    <span
                      className="w-3.5 h-3.5 rounded-full ring-2 ring-white/60 shadow shrink-0"
                      style={{ backgroundColor: group.themeColor || "#3390ec" }}
                    />
                  </div>
                  <p className="text-xs text-[#7d8b99] mt-1 line-clamp-2">{group.description || "No description."}</p>
                  
                  {/* Photo Rate Limiter Info for Admin */}
                  {isAdmin && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-[#7d8b99] bg-[#17212b] px-2.5 py-1 rounded-lg border border-[#101921]">
                      <Clock className="w-3 h-3 text-[#3390ec] shrink-0" />
                      <span>
                        Photo changes: <strong className={isPhotoChangeLimitReached ? "text-rose-400" : "text-emerald-400"}>{photoChangesUsed}/5</strong> in 48h
                        {photoChangesRemaining > 0 ? ` (${photoChangesRemaining} left)` : " (Limit reached)"}
                      </span>
                    </div>
                  )}

                  {photoError && (
                    <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {photoError}
                    </p>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleGroupPhotoUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Invite Code & Share */}
            <div className="p-3 bg-[#0e1621] border border-[#101921] rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#7d8b99] uppercase tracking-wider block">Invite Code</span>
                <span className="text-sm font-mono font-bold text-[#3390ec]">{group.inviteCode}</span>
              </div>
              <button
                onClick={handleCopyInvite}
                className="px-3 py-1.5 bg-[#3390ec]/15 hover:bg-[#3390ec]/25 text-[#3390ec] text-xs font-semibold rounded-xl border border-[#3390ec]/30 flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy Code"}</span>
              </button>
            </div>

            {/* Admin Controls: Theme Color, Announcement Mode & History Visibility */}
            {isAdmin && (
              <div className="space-y-4 p-4 bg-[#0e1621] border border-[#101921] rounded-2xl">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#3390ec]" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Admin Preferences & Customization
                  </h3>
                </div>

                {/* Theme Selector for Admin */}
                <div>
                  <label className="text-[11px] font-semibold text-[#7d8b99] block mb-1.5">
                    Group Color Theme (Applied across chat bubbles & highlights)
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {THEME_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => onManageMembers("update_theme", "", undefined, c.hex)}
                        title={c.name}
                        className={`h-8 rounded-xl transition-all flex items-center justify-center relative shadow ${
                          group.themeColor === c.hex
                            ? "scale-110 ring-2 ring-white shadow-lg"
                            : "opacity-75 hover:opacity-100 hover:scale-105"
                        }`}
                        style={{ backgroundColor: c.hex }}
                      >
                        {group.themeColor === c.hex && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Past Chat History Visibility Toggle */}
                <div className="pt-2 border-t border-[#101921] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-[#202b36] text-[#3390ec]">
                      {group.historyVisibleToNewMembers !== false ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <span className="font-semibold text-xs text-white">Past Chat History for New Members</span>
                      <p className="text-[10px] text-[#7d8b99]">
                        {group.historyVisibleToNewMembers !== false
                          ? "New members can see past messages"
                          : "Hidden (New members only see messages sent after joining)"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onManageMembers("toggle_history_visibility", "")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      group.historyVisibleToNewMembers !== false
                        ? "bg-[#3390ec]/20 text-[#3390ec] border border-[#3390ec]/30"
                        : "bg-amber-600/20 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    {group.historyVisibleToNewMembers !== false ? "Visible" : "Hidden"}
                  </button>
                </div>

                {/* Announcement Mode Toggle */}
                <div className="pt-2 border-t border-[#101921] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-[#202b36] text-[#3390ec]">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-xs text-white">Announcement Mode</span>
                      <p className="text-[10px] text-[#7d8b99]">When enabled, only group administrators can send messages</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onManageMembers("toggle_announcement_mode", "")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      group.announcementMode
                        ? "bg-amber-600/30 text-amber-300 border border-amber-500/40"
                        : "bg-[#202b36] text-[#7d8b99]"
                    }`}
                  >
                    {group.announcementMode ? "Enabled" : "Disabled"}
                  </button>
                </div>
              </div>
            )}

            {/* Members List Header, Add Members Button & Bulk Selection Bar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-[#7d8b99] uppercase tracking-wider">
                    Members ({group.memberIds.length})
                  </h3>
                  {/* Admin-only Add Members button */}
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setSelectedNewMemberIds([]);
                        setAddMemberSearch("");
                        setShowAddMembersModal(true);
                      }}
                      className="px-2.5 py-1 bg-[#3390ec] hover:bg-[#2481cc] text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add Members</span>
                    </button>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSelectAll}
                      className="text-[11px] font-semibold text-[#7d8b99] hover:text-[#3390ec] flex items-center gap-1 transition-colors"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>{selectedMemberIds.length > 0 ? "Deselect All" : "Select All"}</span>
                    </button>
                    {selectedMemberIds.length > 0 && (
                      <button
                        onClick={() => setShowBulkRemoveConfirm(true)}
                        className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-xs font-bold rounded-lg border border-rose-500/30 flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Selected ({selectedMemberIds.length})</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#242f3d]">
                {group.memberIds.map((memberId) => {
                  const member = allUsers.find((u) => u.id === memberId);
                  const isMemberAdmin = group.adminIds.includes(memberId);
                  const isOwner = group.creatorId === memberId;
                  const isRestricted = group.restrictedMemberIds?.includes(memberId);
                  const isBlocked = currentUser.blockedUserIds?.includes(memberId);
                  const memberBadge = group.badges?.find((b) => b.userId === memberId);
                  const isSelected = selectedMemberIds.includes(memberId);

                  return (
                    <div
                      key={memberId}
                      className={`p-2.5 rounded-2xl border transition-all ${
                        isSelected
                          ? "bg-rose-950/30 border-rose-500/40"
                          : "bg-[#0e1621] border-[#101921] hover:border-[#202b36]"
                      } flex items-center justify-between gap-2`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isAdmin && !isOwner && memberId !== currentUser.id && (
                          <button
                            onClick={() => handleToggleSelectMember(memberId)}
                            className="text-[#7d8b99] hover:text-white shrink-0"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-rose-400" />
                            ) : (
                              <Square className="w-4 h-4 text-[#7d8b99]" />
                            )}
                          </button>
                        )}

                        <img
                          src={member?.avatar || "https://api.dicebear.com/7.x/identicon/svg?seed=" + memberId}
                          alt={member?.username}
                          className="w-9 h-9 rounded-full object-cover bg-[#17212b] shrink-0 ring-1 ring-[#3390ec]/20"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs text-white truncate">
                              {member?.username || "Member"}
                            </span>
                            {isOwner && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                                Owner
                              </span>
                            )}
                            {isMemberAdmin && !isOwner && (
                              <span className="px-1.5 py-0.5 rounded bg-[#3390ec]/20 text-[#3390ec] text-[9px] font-bold">
                                Admin
                              </span>
                            )}
                            {isRestricted && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold flex items-center gap-0.5">
                                <VolumeX className="w-2.5 h-2.5" />
                                Restricted
                              </span>
                            )}
                            {isBlocked && (
                              <span className="px-1.5 py-0.5 rounded bg-[#202b36] text-[#7d8b99] text-[9px] font-bold">
                                Blocked
                              </span>
                            )}
                            {memberBadge && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                                style={{ backgroundColor: memberBadge.color }}
                              >
                                {memberBadge.badgeName}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#7d8b99] block truncate">{member?.email}</span>
                        </div>
                      </div>

                      {/* Member Management Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Assign Badge */}
                        {isAdmin && (
                          badgeTargetId === memberId ? (
                            <div className="flex items-center gap-1 bg-[#17212b] p-1 rounded-xl">
                              <input
                                type="text"
                                placeholder="Badge"
                                value={customBadgeName}
                                onChange={(e) => setCustomBadgeName(e.target.value)}
                                className="bg-[#0e1621] text-[10px] px-2 py-0.5 rounded text-white w-16 focus:outline-none"
                              />
                              <button
                                onClick={() => {
                                  if (customBadgeName.trim()) {
                                    onManageMembers("add_badge", memberId, customBadgeName.trim(), "#3390ec");
                                    setBadgeTargetId(null);
                                    setCustomBadgeName("");
                                  }
                                }}
                                className="p-1 text-emerald-400"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setBadgeTargetId(memberId)}
                              title="Assign Badge"
                              className="p-1.5 text-[#7d8b99] hover:text-[#3390ec] rounded-lg hover:bg-[#202b36] transition-colors"
                            >
                              <Award className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}

                        {/* Restrict / Mute Member (Read-Only Mode) */}
                        {isAdmin && !isOwner && memberId !== currentUser.id && (
                          <button
                            onClick={() => onManageMembers("restrict_member", memberId)}
                            title={isRestricted ? "Remove Read-Only Restriction" : "Restrict Member to Read-Only"}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isRestricted
                                ? "text-rose-400 bg-rose-500/20 hover:bg-rose-500/30"
                                : "text-[#7d8b99] hover:text-amber-400 hover:bg-[#202b36]"
                            }`}
                          >
                            {isRestricted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        {/* Promote / Demote Admin */}
                        {isAdmin && !isOwner && memberId !== currentUser.id && (
                          <button
                            onClick={() => onManageMembers("toggle_admin", memberId)}
                            title={isMemberAdmin ? "Demote from Admin" : "Promote to Admin"}
                            className="p-1.5 text-[#7d8b99] hover:text-[#3390ec] rounded-lg hover:bg-[#202b36] transition-colors"
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Block / Unblock User */}
                        {onBlockUser && memberId !== currentUser.id && (
                          <button
                            onClick={() => onBlockUser(memberId)}
                            title={isBlocked ? "Unblock User" : "Block User"}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isBlocked
                                ? "text-emerald-400 hover:bg-[#202b36]"
                                : "text-[#7d8b99] hover:text-amber-400 hover:bg-[#202b36]"
                            }`}
                          >
                            {isBlocked ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        {/* Remove / Kick Member */}
                        {isAdmin && !isOwner && memberId !== currentUser.id && (
                          <button
                            onClick={() =>
                              setMemberToRemove({
                                id: memberId,
                                name: member?.username || "this member"
                              })
                            }
                            title="Remove Member from Group"
                            className="p-1.5 text-[#7d8b99] hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Remove Individual Member Confirmation Dialog */}
            {memberToRemove && (
              <div className="p-4 bg-[#0e1621] border border-rose-500/40 rounded-2xl space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Remove {memberToRemove.name} from group?</span>
                </div>
                <p className="text-[11px] text-[#7d8b99]">
                  This member will be removed from the group, lose access to messages, and won't be able to re-join using the invite code unless an administrator re-adds them.
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setMemberToRemove(null)}
                    className="px-3 py-1.5 rounded-xl bg-[#202b36] text-[#7d8b99] text-xs font-semibold hover:bg-[#283645]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onManageMembers("remove", memberToRemove.id);
                      setMemberToRemove(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md"
                  >
                    Confirm Removal
                  </button>
                </div>
              </div>
            )}

            {/* Remove Bulk Selected Confirmation Dialog */}
            {showBulkRemoveConfirm && (
              <div className="p-4 bg-[#0e1621] border border-rose-500/40 rounded-2xl space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Remove {selectedMemberIds.length} selected member(s)?</span>
                </div>
                <p className="text-[11px] text-[#7d8b99]">
                  All selected members will be removed and barred from rejoining with the invite code.
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowBulkRemoveConfirm(false)}
                    className="px-3 py-1.5 rounded-xl bg-[#202b36] text-[#7d8b99] text-xs font-semibold hover:bg-[#283645]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmBulkRemove}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md"
                  >
                    Remove All Selected
                  </button>
                </div>
              </div>
            )}

            {/* Danger Zone: Permanently Delete Group (Admin / Owner Only) */}
            {isAdmin && (
              <div className="p-4 bg-[#0e1621] border border-rose-500/30 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-rose-950/60 text-rose-400 border border-rose-500/30">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-rose-400">Delete Group Permanently</h4>
                      <p className="text-[10px] text-[#7d8b99]">
                        Wipe this group, chat history, and all media attachments for all members.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDeleteGroupConfirm(true)}
                    className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white text-xs font-bold rounded-xl border border-rose-500/30 transition-colors shadow-sm"
                  >
                    Delete Group
                  </button>
                </div>
              </div>
            )}

            {/* Permanent Group Deletion Confirmation Dialog */}
            {showDeleteGroupConfirm && (
              <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
                <div className="w-full max-w-sm bg-[#17212b] border border-rose-500/50 rounded-2xl p-5 space-y-4 shadow-2xl text-white">
                  <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="text-center space-y-1">
                    <h3 className="font-bold text-base text-white">Permanently Delete Group?</h3>
                    <p className="text-xs text-[#7d8b99]">
                      Are you sure you want to permanently delete <strong className="text-rose-400">"{group.name}"</strong>?
                    </p>
                    <p className="text-[11px] text-[#7d8b99] mt-2 bg-[#0e1621] p-2.5 rounded-xl border border-rose-900/30">
                      ⚠️ This action is irreversible. The group and its conversation history will be permanently erased.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => setShowDeleteGroupConfirm(false)}
                      className="flex-1 py-2.5 rounded-xl bg-[#202b36] hover:bg-[#283645] text-[#7d8b99] hover:text-white text-xs font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteGroupConfirm(false);
                        onDeleteGroup?.(group.id);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all"
                    >
                      Yes, Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ADMIN ADD MEMBERS MODAL */}
        {showAddMembersModal && group && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-md bg-[#17212b] border border-[#101921] rounded-2xl p-5 space-y-4 shadow-2xl text-white max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-[#101921] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#3390ec]/20 text-[#3390ec] flex items-center justify-center">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Add Members</h3>
                    <p className="text-[10px] text-[#7d8b99]">Select contacts to add to this group</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddMembersModal(false)}
                  className="p-1.5 rounded-xl text-[#7d8b99] hover:text-white hover:bg-[#202b36] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs: Recent Direct Chats vs All Users */}
              <div className="flex items-center p-1 bg-[#0e1621] rounded-xl border border-[#101921]">
                <button
                  onClick={() => setAddMembersTab("chats")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    addMembersTab === "chats"
                      ? "bg-[#3390ec] text-white shadow-sm"
                      : "text-[#7d8b99] hover:text-white"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Direct Chats ({directChatUsers.length})</span>
                </button>
                <button
                  onClick={() => setAddMembersTab("all")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    addMembersTab === "all"
                      ? "bg-[#3390ec] text-white shadow-sm"
                      : "text-[#7d8b99] hover:text-white"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>All Users ({allNonMembers.length})</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8b99]" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={addMemberSearch}
                  onChange={(e) => setAddMemberSearch(e.target.value)}
                  className="w-full bg-[#0e1621] border border-[#101921] rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-[#3390ec]"
                />
              </div>

              {/* Candidates List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-[#242f3d] min-h-[160px] max-h-[260px]">
                {displayedAddCandidateUsers.length === 0 ? (
                  <div className="text-center py-8 text-[#7d8b99] space-y-1">
                    <Users className="w-8 h-8 mx-auto opacity-40 mb-2" />
                    <p className="text-xs font-semibold text-white">No contacts found</p>
                    <p className="text-[10px] text-[#7d8b99]">
                      {addMembersTab === "chats"
                        ? "No direct chats available to add."
                        : "All registered users are already members."}
                    </p>
                  </div>
                ) : (
                  displayedAddCandidateUsers.map((user) => {
                    const isSelected = selectedNewMemberIds.includes(user.id);
                    const wasRemoved = group.removedMemberIds?.includes(user.id);

                    return (
                      <div
                        key={user.id}
                        onClick={() => handleToggleSelectNewMember(user.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-[#3390ec]/20 border-[#3390ec]/50"
                            : "bg-[#0e1621] border-[#101921] hover:border-[#202b36]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            className="text-[#7d8b99] hover:text-white shrink-0"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#3390ec]" />
                            ) : (
                              <Square className="w-4 h-4 text-[#7d8b99]" />
                            )}
                          </button>

                          <img
                            src={user.avatar || "https://api.dicebear.com/7.x/identicon/svg?seed=" + user.id}
                            alt={user.username}
                            className="w-9 h-9 rounded-full object-cover bg-[#17212b] shrink-0 ring-1 ring-[#3390ec]/20"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-xs text-white truncate">
                                {user.username}
                              </span>
                              {wasRemoved && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold flex items-center gap-0.5 border border-amber-500/30">
                                  <Ban className="w-2.5 h-2.5 text-amber-400" />
                                  Removed (Re-admit)
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#7d8b99] block truncate">{user.email}</span>
                          </div>
                        </div>

                        {/* Quick 1-Click Add Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onManageMembers("add", user.id);
                            setShowAddMembersModal(false);
                          }}
                          className="px-2.5 py-1 bg-[#3390ec]/20 hover:bg-[#3390ec] text-[#3390ec] hover:text-white text-xs font-bold rounded-lg border border-[#3390ec]/30 flex items-center gap-1 shrink-0 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Action Footer */}
              <div className="pt-2 border-t border-[#101921] flex items-center justify-between gap-2">
                <span className="text-xs text-[#7d8b99]">
                  {selectedNewMemberIds.length} contact(s) selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMembersModal(false)}
                    className="px-3 py-1.5 rounded-xl bg-[#202b36] text-[#7d8b99] hover:text-white text-xs font-semibold hover:bg-[#283645] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={selectedNewMemberIds.length === 0}
                    onClick={handleConfirmAddMembers}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                      selectedNewMemberIds.length > 0
                        ? "bg-[#3390ec] hover:bg-[#2481cc] text-white cursor-pointer active:scale-95"
                        : "bg-[#202b36] text-[#7d8b99] cursor-not-allowed opacity-60"
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Selected ({selectedNewMemberIds.length})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
