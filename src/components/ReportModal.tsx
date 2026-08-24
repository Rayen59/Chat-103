import React, { useState, useEffect } from "react";
import { User, Message, Group, UserReport } from "../types";
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
  FileText,
  Clock,
  RefreshCw,
  Sparkles,
  Check,
  Ban,
  AlertCircle
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
  { id: "harassment", label: "Harassment or Bullying", desc: "Insults, threats, persistent unwanted messages, or intimidation" },
  { id: "inappropriate", label: "Inappropriate or Explicit Content", desc: "Adult media, explicit material, or shocking content" },
  { id: "spam_scam", label: "Spam, Scams, or Phishing", desc: "Deceptive links, abusive advertising, or fraudulent offers" },
  { id: "hate_speech", label: "Hate Speech & Discrimination", desc: "Attacks based on identity, racism, or severe hostility" },
  { id: "violence_threat", label: "Violence or Threats of Harm", desc: "Direct threats of violence or incitement of dangerous acts" },
  { id: "other", label: "Other / Custom Reason", desc: "Describe the specific issue in detail in the explanation box below" }
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
  const [activeTab, setActiveTab] = useState<"submit" | "history">("submit");
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0].label);
  const [customExplanation, setCustomExplanation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User's own submitted reports state
  const [myReports, setMyReports] = useState<UserReport[]>([]);
  const [loadingMyReports, setLoadingMyReports] = useState(false);

  const fetchMyReports = async () => {
    if (!currentUser) return;
    setLoadingMyReports(true);
    try {
      const res = await fetch(`/api/reports/my-reports?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setMyReports(data.reports || []);
      }
    } catch (err) {
      console.warn("Failed to load user reports:", err);
    } finally {
      setLoadingMyReports(false);
    }
  };

  useEffect(() => {
    fetchMyReports();
  }, [currentUser.id]);

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
      setError("Unable to identify the target of this report.");
      return;
    }

    if (selectedReason.includes("Other") && !customExplanation.trim()) {
      setError("Please describe the issue in the explanation field.");
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
        throw new Error(data.error || "Failed to submit report. Please try again.");
      }

      const data = await res.json();
      setSubmitted(true);
      if (data.report) {
        setMyReports((prev) => [data.report, ...prev]);
      }
      if (onSuccess && data.report?.id) {
        onSuccess(data.report.id);
      }
      setTimeout(() => {
        setSubmitted(false);
        setActiveTab("history");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while sending the report.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatReportDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "Recent";
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
                <span>Trust & Safety Center</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-medium uppercase tracking-wider">
                  {targetType === "user" ? "User" : targetType === "message" ? "Message" : "Group"}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Help maintain MK Wavegram safe, respectful, and secure
              </p>
            </div>
          </div>
          <button
            id="report-close-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 px-6 pt-3 bg-[#17212b] border-b border-[#242f3d]">
          <button
            type="button"
            onClick={() => setActiveTab("submit")}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "submit"
                ? "border-[#3390ec] text-[#3390ec]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Submit Report</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("history");
              fetchMyReports();
            }}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "history"
                ? "border-[#3390ec] text-[#3390ec]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>My Submitted Reports ({myReports.length})</span>
          </button>
        </div>

        {/* Content */}
        {activeTab === "history" ? (
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Report Tracking & Resolution History
              </span>
              <button
                type="button"
                onClick={fetchMyReports}
                disabled={loadingMyReports}
                className="text-xs text-[#3390ec] hover:text-[#58a4ec] flex items-center gap-1 transition"
              >
                <RefreshCw className={`w-3 h-3 ${loadingMyReports ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            {loadingMyReports && myReports.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <div className="w-6 h-6 border-2 border-[#3390ec]/30 border-t-[#3390ec] rounded-full animate-spin mx-auto mb-2" />
                Loading your reports...
              </div>
            ) : myReports.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <ShieldAlert className="w-10 h-10 mx-auto text-slate-600 mb-1" />
                <p className="text-sm font-semibold text-slate-300">No Reports Submitted Yet</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  When you report an account, message, or group, its status and official admin replies will appear here.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("submit")}
                  className="mt-3 px-4 py-1.5 bg-[#3390ec] hover:bg-[#2481cc] text-white text-xs font-semibold rounded-xl transition"
                >
                  Create New Report
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myReports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-4 bg-[#0e1621] border border-[#242f3d] rounded-xl space-y-2.5 transition hover:border-[#3390ec]/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">
                            {rep.targetName || "Reported Item"}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-300 uppercase font-medium">
                            {rep.targetType}
                          </span>
                        </div>
                        <p className="text-xs text-red-300/90 font-medium mt-0.5">
                          {rep.reason}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ${
                          rep.status === "resolved"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : rep.status === "dismissed"
                            ? "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                            : rep.status === "reviewed"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse"
                        }`}
                      >
                        {rep.status === "resolved"
                          ? "✓ Resolved"
                          : rep.status === "dismissed"
                          ? "Dismissed"
                          : rep.status === "reviewed"
                          ? "Under Review"
                          : "Pending Review"}
                      </span>
                    </div>

                    {rep.customExplanation && (
                      <p className="text-xs text-slate-400 italic bg-[#17212b] p-2.5 rounded-lg border border-[#242f3d]">
                        "{rep.customExplanation}"
                      </p>
                    )}

                    {/* Official Admin Reply & Action */}
                    {rep.adminReply && (
                      <div className="p-3 bg-[#3390ec]/10 border border-[#3390ec]/30 rounded-xl space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#3390ec]">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Official Moderation Response:</span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">
                          {rep.adminReply}
                        </p>
                        {rep.actionTaken && (
                          <div className="mt-1 text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Action Taken: {rep.actionTaken}</span>
                          </div>
                        )}
                        {rep.adminReplyAt && (
                          <div className="text-[10px] text-slate-400 pt-1">
                            Responded on {formatReportDate(rep.adminReplyAt)}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                      <span>Report ID: #{rep.id.slice(-6)}</span>
                      <span>Submitted {formatReportDate(rep.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : submitted ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-3 my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-white">Report Submitted Successfully</h4>
            <p className="text-sm text-slate-300 max-w-xs leading-relaxed">
              Your report has been securely transmitted to the MK moderation team. You can track its status and admin response in your report history.
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
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Report Subject</div>
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
                Reason for Report <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedReason(r.label)}
                    className={`text-left p-3 rounded-xl border transition flex items-start justify-between cursor-pointer ${
                      selectedReason === r.label
                        ? "bg-[#3390ec]/20 border-[#3390ec] text-white shadow-md shadow-[#3390ec]/10"
                        : "bg-[#0e1621] border-[#242f3d] text-slate-300 hover:bg-[#1f2c3a] hover:border-slate-600"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium text-white">{r.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{r.desc}</div>
                    </div>
                    {selectedReason === r.label && (
                      <div className="w-5 h-5 rounded-full bg-[#3390ec] flex items-center justify-center text-white text-xs mt-0.5 shrink-0 ml-2">
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
                <span>Additional Context & Explanation</span>
                <span className="text-xs text-slate-500 font-normal">Optional</span>
              </label>
              <textarea
                value={customExplanation}
                onChange={(e) => setCustomExplanation(e.target.value)}
                placeholder="Please describe what happened or provide additional details to assist the moderation team..."
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
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-500 text-white flex items-center space-x-2 shadow-lg shadow-red-600/30 transition disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {submitting ? (
                  <span>Submitting report...</span>
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
