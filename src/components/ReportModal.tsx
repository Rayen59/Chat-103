import React, { useState } from "react";
import { User, Message, Group } from "../types";
import {
  AlertTriangle,
  X,
  Send,
  ShieldAlert,
  User as UserIcon,
  MessageSquare,
  Users,
  CheckCircle2,
  HelpCircle,
  FileText
} from "lucide-react";

interface ReportModalProps {
  currentUser: User;
  targetType: "user" | "message" | "group";
  targetUser?: User;
  targetMessage?: Message;
  targetGroup?: Group;
  conversationId?: string;
  onClose: () => void;
  onSuccess?: (reportId: string) => void;
}

const REPORT_REASONS = [
  { id: "harassment", label: "Harassment or Bullying", desc: "Insults, threats, or repetitive unwanted behavior" },
  { id: "inappropriate", label: "Inappropriate / Explicit Content", desc: "NSFW media, adult content, or inappropriate media" },
  { id: "spam_scam", label: "Spam, Scams, or Phishing", desc: "Fraudulent links, ads, or unsolicited promotional messages" },
  { id: "hate_speech", label: "Hate Speech & Discrimination", desc: "Attacks based on identity, racism, or severe hostility" },
  { id: "violence_threat", label: "Violence or Threats", desc: "Direct threats of harm or encouraging violent acts" },
  { id: "other", label: "Other / Custom Reason", desc: "Write specific handwritten details below" }
];

export const ReportModal: React.FC<ReportModalProps> = ({
  currentUser,
  targetType,
  targetUser,
  targetMessage,
  targetGroup,
  conversationId,
  onClose,
  onSuccess
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0].label);
  const [customExplanation, setCustomExplanation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTargetId = () => {
    if (targetType === "user") return targetUser?.id || "";
    if (targetType === "message") return targetMessage?.id || "";
    if (targetType === "group") return targetGroup?.id || "";
    return "";
  };

  const getTargetTitle = () => {
    if (targetType === "user") return `@${targetUser?.username || "Unknown User"}`;
    if (targetType === "message") return `Message from @${targetMessage?.senderName || "User"}`;
    if (targetType === "group") return `Group "${targetGroup?.name || "Community"}"`;
    return "Report Subject";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetId = getTargetId();
    if (!targetId) {
      setError("Unable to identify the report target.");
      return;
    }

    if (selectedReason === "Other / Custom Reason" && !customExplanation.trim()) {
      setError("Please describe the issue in the custom explanation box.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        reporterId: currentUser.id,
        targetType,
        targetId,
        reason: selectedReason,
        customExplanation: customExplanation.trim() || undefined,
        targetDetails: {
          username: targetUser?.username || targetMessage?.senderName,
          userId: targetUser?.id || targetMessage?.senderId,
          userAvatar: targetUser?.avatar || targetMessage?.senderAvatar,
          messageText: targetMessage?.text,
          messageType: targetMessage?.type,
          conversationId: conversationId || targetMessage?.conversationId,
          groupId: targetGroup?.id,
          groupName: targetGroup?.name
        }
      };

      const res = await fetch("/api/reports/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit report");
      }

      const data = await res.json();
      setSubmitted(true);
      if (onSuccess && data.report?.id) {
        onSuccess(data.report.id);
      }
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || "An error occurred while transmitting the report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="report-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="report-modal-content"
        className="w-full max-w-lg bg-[#17212b] border border-[#2b3a4a] rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#242f3d] flex items-center justify-between bg-[#1f2c3a]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white flex items-center space-x-1.5">
                <span>Signaler / Report</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-medium uppercase tracking-wider">
                  {targetType}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Help keep the MK Wavegram community safe and respectful
              </p>
            </div>
          </div>
          <button
            id="report-close-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {submitted ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-3 my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-white">Signalement Envoyé / Report Submitted</h4>
            <p className="text-sm text-slate-300 max-w-xs leading-relaxed">
              Your signal has been securely sent to the MK Administrator with complete context. The admin team will review it shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
            {/* Target preview badge */}
            <div className="p-3.5 bg-[#0e1621] border border-[#242f3d] rounded-xl flex items-center space-x-3">
              {targetType === "user" && (
                <img
                  src={targetUser?.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=user"}
                  alt={targetUser?.username}
                  className="w-10 h-10 rounded-full object-cover border border-[#3390ec]/30"
                />
              )}
              {targetType === "group" && (
                <div className="w-10 h-10 rounded-full bg-[#3390ec]/20 flex items-center justify-center text-[#3390ec] font-bold">
                  <Users className="w-5 h-5" />
                </div>
              )}
              {targetType === "message" && (
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Report Target</div>
                <div className="text-sm font-semibold text-white truncate">{getTargetTitle()}</div>
                {targetMessage?.text && (
                  <div className="text-xs text-slate-400 truncate italic mt-0.5">
                    "{targetMessage.text}"
                  </div>
                )}
              </div>
            </div>

            {/* Select Reason */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Motif du Signalement / Reason for Report <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedReason(r.label)}
                    className={`text-left p-3 rounded-xl border transition flex items-start justify-between ${
                      selectedReason === r.label
                        ? "bg-[#3390ec]/20 border-[#3390ec] text-white"
                        : "bg-[#0e1621] border-[#242f3d] text-slate-300 hover:bg-[#1f2c3a] hover:border-slate-600"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium text-white">{r.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{r.desc}</div>
                    </div>
                    {selectedReason === r.label && (
                      <div className="w-5 h-5 rounded-full bg-[#3390ec] flex items-center justify-center text-white text-xs mt-0.5">
                        ✓
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Explanation */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Détails & Explication / Explanation Details</span>
                <span className="text-xs text-slate-500 font-normal">Optional / Handwritten</span>
              </label>
              <textarea
                value={customExplanation}
                onChange={(e) => setCustomExplanation(e.target.value)}
                placeholder="Explain what happened or give additional context for the administrator..."
                rows={3}
                className="w-full bg-[#0e1621] border border-[#242f3d] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#3390ec] resize-none"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-500 text-white flex items-center space-x-2 shadow-lg shadow-red-600/30 transition disabled:opacity-50"
              >
                {submitting ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
