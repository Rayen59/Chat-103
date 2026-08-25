import React, { useState, useEffect } from "react";
import { User, UserReport, Message, Conversation } from "../types";
import {
  ShieldCheck,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
  Radio,
  Users,
  Search,
  Sparkles,
  RefreshCw,
  MessageSquare,
  Send,
  ShieldAlert,
  Info,
  ChevronLeft,
  KeyRound,
  Check,
  MessageCircle,
  Scale,
  Gavel,
  Trash2,
  Eye,
  FileText,
  AlertCircle
} from "lucide-react";

interface AdminPanelModalProps {
  currentUser: User;
  allUsers: User[];
  onClose: () => void;
  onOpenMKChannel?: () => void;
  onUserUpdated?: (user: User) => void;
  onOpenConversation?: (conversationId: string, messageId?: string) => void;
  onOpenGroup?: (groupId: string) => void;
  onOpenReportTarget?: (report: UserReport) => void;
}

interface JudicialCaseData {
  report?: UserReport | null;
  conversation?: Conversation | null;
  group?: any;
  messages: Message[];
  flaggedMessageId?: string | null;
  reporter?: {
    id: string;
    username: string;
    email: string;
    avatar: string;
    createdAt?: string;
    status?: string;
    warningsCount: number;
    reportsFiledCount: number;
  } | null;
  targetUser?: {
    id: string;
    username: string;
    email: string;
    avatar: string;
    createdAt?: string;
    status?: string;
    isBanned: boolean;
    bannedUntil?: string;
    banReason?: string;
    warnings: any[];
    reportsAgainstCount: number;
  } | null;
  participants?: User[];
}

const QUICK_REPLIES = [
  {
    title: "Content Removed & Warning Issued",
    text: "Thank you for reporting. Our moderation team has investigated the chat context, removed the violating message, and issued an official disciplinary warning to the offending user.",
    action: "Warning Issued & Content Removed"
  },
  {
    title: "Account Suspended (7 Days)",
    text: "Your report has been verified after judicial chat inspection. The reported user has been suspended from MK Wavegram for 7 days for violating community safety standards.",
    action: "7-Day Account Suspension"
  },
  {
    title: "Account Permanently Banned",
    text: "Thank you for helping keep MK Wavegram safe. Severe violations were confirmed during judicial review, and the offender's account has been permanently terminated.",
    action: "Permanent Account Ban"
  },
  {
    title: "No Violation Found (Dismissed)",
    text: "Our moderation team thoroughly reviewed the entire conversation context. Based on our community guidelines, no direct policy violation was identified in this instance.",
    action: "Report Dismissed (No Violation)"
  }
];

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  currentUser,
  allUsers,
  onClose,
  onOpenMKChannel,
  onUserUpdated,
  onOpenConversation,
  onOpenGroup,
  onOpenReportTarget
}) => {
  const [activeTab, setActiveTab] = useState<"reports" | "judicial" | "bans" | "broadcast" | "users">("reports");
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [reportFilter, setReportFilter] = useState<"all" | "pending" | "resolved" | "dismissed">("all");
  const [reportSearch, setReportSearch] = useState("");
  const [analyzingReportId, setAnalyzingReportId] = useState<string | null>(null);

  // Admin Pin Auth State
  const [authError, setAuthError] = useState<string | null>(null);
  const [adminPin, setAdminPin] = useState("");
  const [pinSubmitting, setPinSubmitting] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(true);

  // Reply Composer State
  const [replyText, setReplyText] = useState("");
  const [actionTakenText, setActionTakenText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);

  // Moderation / Ban dialog
  const [banningUser, setBanningUser] = useState<{ id: string; name: string } | null>(null);
  const [banDuration, setBanDuration] = useState<"3_days" | "7_days" | "10_days" | "30_days" | "permanent">("7_days");
  const [banReason, setBanReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Warn user dialog
  const [warningUser, setWarningUser] = useState<{ id: string; name: string } | null>(null);
  const [warningReason, setWarningReason] = useState("");
  const [warningSuccess, setWarningSuccess] = useState(false);

  // Context inspector
  const [inspectedMessageContext, setInspectedMessageContext] = useState<{
    targetMessage?: Message;
    conversation?: Conversation;
    contextMessages: Message[];
  } | null>(null);
  const [inspectedUserActivity, setInspectedUserActivity] = useState<{
    user: User;
    recentMessages: Message[];
    reportsAgainst: UserReport[];
    storiesCount: number;
    totalMessages: number;
  } | null>(null);

  // Judicial Live Chat & Group Investigation Suite State
  const [judicialCase, setJudicialCase] = useState<JudicialCaseData | null>(null);
  const [loadingJudicial, setLoadingJudicial] = useState(false);
  const [judicialSearch, setJudicialSearch] = useState("");
  const [verdictSanction, setVerdictSanction] = useState<"none" | "warn" | "ban_3d" | "ban_7d" | "ban_10d" | "ban_30d" | "ban_permanent">("warn");
  const [verdictReason, setVerdictReason] = useState("");
  const [verdictReplyToReporter, setVerdictReplyToReporter] = useState("");
  const [verdictActionSummary, setVerdictActionSummary] = useState("");
  const [verdictDeleteMessage, setVerdictDeleteMessage] = useState(true);
  const [verdictSubmitting, setVerdictSubmitting] = useState(false);
  const [verdictSuccessMessage, setVerdictSuccessMessage] = useState<string | null>(null);

  // Broadcast Studio state
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastPriority, setBroadcastPriority] = useState<"normal" | "high" | "urgent">("high");
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // Users Filter
  const [userSearch, setUserSearch] = useState("");

  const formatEnglishDate = (isoStr: string | undefined, includeTime = true) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        ...(includeTime ? { hour: "numeric", minute: "2-digit", hour12: true } : {})
      });
    } catch {
      return "Recent";
    }
  };

  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      const res = await fetch(`/api/admin/reports?adminId=${currentUser.id || currentUser.email}`);
      if (res.status === 403) {
        setIsAuthorized(false);
        setReports([]);
        return;
      }
      if (res.ok) {
        setIsAuthorized(true);
        const data = await res.json();
        setReports(data.reports || []);
        if (selectedReport) {
          const updated = (data.reports || []).find((r: UserReport) => r.id === selectedReport.id);
          if (updated) setSelectedReport(updated);
        }
      }
    } catch (err) {
      console.error("Failed to fetch admin reports:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 5000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  const handleAdminPinAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPin.trim()) return;
    setPinSubmitting(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/admin/auth-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: adminPin.trim(), userId: currentUser.id })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid Admin Passcode.");
      }
      setIsAuthorized(true);
      if (data.user && onUserUpdated) {
        onUserUpdated(data.user);
      }
      fetchReports();
    } catch (err: any) {
      setAuthError(err.message || "Failed to authenticate as Admin.");
    } finally {
      setPinSubmitting(false);
    }
  };

  const handleRunAiAnalysis = async (reportId: string) => {
    setAnalyzingReportId(reportId);
    try {
      const res = await fetch("/api/admin/ai-analyze-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: currentUser.id || "user_admin_mk", reportId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.report) {
          setReports((prev) => prev.map((r) => (r.id === reportId ? data.report : r)));
          if (selectedReport?.id === reportId) {
            setSelectedReport(data.report);
          }
        }
      }
    } catch (err) {
      console.error("AI report analysis failed:", err);
    } finally {
      setAnalyzingReportId(null);
    }
  };

  const handleResolveReport = async (reportId: string, status: "resolved" | "dismissed") => {
    try {
      const res = await fetch("/api/admin/reports/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: currentUser.id || "user_admin_mk", reportId, status })
      });
      if (res.ok) {
        const data = await res.json();
        setReports((prev) => prev.map((r) => (r.id === reportId ? data.report : r)));
        if (selectedReport?.id === reportId) {
          setSelectedReport(data.report);
        }
      }
    } catch (err) {
      console.error("Failed to update report status:", err);
    }
  };

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !replyText.trim()) return;

    setSubmittingReply(true);
    try {
      const res = await fetch("/api/admin/reports/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: currentUser.id || "user_admin_mk",
          reportId: selectedReport.id,
          replyText: replyText.trim(),
          actionTaken: actionTakenText.trim() || undefined,
          resolveReport: true
        })
      });

      if (res.ok) {
        const data = await res.json();
        setReports((prev) => prev.map((r) => (r.id === selectedReport.id ? data.report : r)));
        setSelectedReport(data.report);
        setReplySuccess(true);
        setTimeout(() => setReplySuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to send admin reply:", err);
    } finally {
      setSubmittingReply(false);
    }
  };

  // Open Judicial Live Chat & Group Investigation Suite
  const handleOpenJudicialInvestigation = async (report: UserReport) => {
    setSelectedReport(report);
    setLoadingJudicial(true);
    setVerdictSuccessMessage(null);
    setActiveTab("judicial");

    try {
      const params = new URLSearchParams({
        adminId: currentUser.id || "user_admin_mk",
        reportId: report.id
      });
      if (report.targetDetails?.conversationId) {
        params.set("conversationId", report.targetDetails.conversationId);
      }
      if (report.reporterId) {
        params.set("reporterId", report.reporterId);
      }
      if (report.targetDetails?.userId || (report.targetType === "user" ? report.targetId : "")) {
        params.set("targetUserId", report.targetDetails?.userId || (report.targetType === "user" ? report.targetId : ""));
      }
      if (report.targetDetails?.groupId || (report.targetType === "group" ? report.targetId : "")) {
        params.set("groupId", report.targetDetails?.groupId || (report.targetType === "group" ? report.targetId : ""));
      }

      const res = await fetch(`/api/admin/judicial/inspect-chat?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setJudicialCase(data);

        // Pre-fill verdict form based on report context
        setVerdictReason(`Violation of community policy regarding ${report.reason}.`);
        setVerdictReplyToReporter(
          `Thank you for reporting. After a full judicial investigation of the chat context, we have addressed the issue and taken disciplinary action against the offender.`
        );
        setVerdictActionSummary(`Sanction Enforced for ${report.reason}`);
        setVerdictDeleteMessage(!!data.flaggedMessageId);
      }
    } catch (err) {
      console.error("Failed to load judicial investigation:", err);
    } finally {
      setLoadingJudicial(false);
    }
  };

  // Judicial: Redact / Delete Violating Message directly from live chat
  const handleDeleteMessageInJudicial = async (messageId: string) => {
    if (!confirm("Are you sure you want to permanently delete/redact this violating message from the conversation?")) return;
    try {
      const res = await fetch("/api/admin/judicial/delete-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: currentUser.id || "user_admin_mk",
          messageId,
          reason: selectedReport ? selectedReport.reason : "Policy Violation"
        })
      });
      if (res.ok) {
        const data = await res.json();
        setJudicialCase((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: [
              ...prev.messages.filter((m) => m.id !== messageId),
              data.auditMessage
            ]
          };
        });
      }
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  // Judicial: Deliver Final Verdict & Resolution
  const handleDeliverJudicialVerdict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    setVerdictSubmitting(true);
    setVerdictSuccessMessage(null);

    try {
      const res = await fetch("/api/admin/judicial/verdict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: currentUser.id || "user_admin_mk",
          reportId: selectedReport.id,
          targetUserId: judicialCase?.targetUser?.id || selectedReport.targetDetails?.userId || (selectedReport.targetType === "user" ? selectedReport.targetId : undefined),
          sanction: verdictSanction,
          sanctionReason: verdictReason.trim(),
          replyToReporter: verdictReplyToReporter.trim(),
          actionSummary: verdictActionSummary.trim(),
          deleteFlaggedMessage: verdictDeleteMessage,
          flaggedMessageId: judicialCase?.flaggedMessageId || (selectedReport.targetType === "message" ? selectedReport.targetId : undefined)
        })
      });

      if (res.ok) {
        const data = await res.json();
        setVerdictSuccessMessage(
          `⚖️ Judicial Verdict Enforced! Sanction: ${verdictSanction.toUpperCase()} • Official reply dispatched to @${selectedReport.reporterName}.`
        );
        fetchReports();
        if (data.report) {
          setSelectedReport(data.report);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to deliver judicial verdict.");
      }
    } catch (err: any) {
      alert(err.message || "An unexpected error occurred.");
    } finally {
      setVerdictSubmitting(false);
    }
  };

  const handleExecuteBan = async () => {
    if (!banningUser) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/users/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: currentUser.id || "user_admin_mk",
          targetUserId: banningUser.id,
          duration: banDuration,
          reason: banReason.trim() || undefined
        })
      });
      if (res.ok) {
        setBanningUser(null);
        setBanReason("");
        fetchReports();
      }
    } catch (err) {
      console.error("Ban failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteWarn = async () => {
    if (!warningUser) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/users/warn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: currentUser.id || "user_admin_mk",
          targetUserId: warningUser.id,
          reason: warningReason.trim() || undefined
        })
      });
      if (res.ok) {
        setWarningSuccess(true);
        setTimeout(() => {
          setWarningSuccess(false);
          setWarningUser(null);
          setWarningReason("");
        }, 1500);
        fetchReports();
      }
    } catch (err) {
      console.error("Warning failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/users/unban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: currentUser.id || "user_admin_mk",
          targetUserId: userId
        })
      });
      if (res.ok) {
        fetchReports();
      }
    } catch (err) {
      console.error("Unban failed:", err);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    setActionLoading(true);
    setBroadcastSuccess(false);

    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: currentUser.id || "user_admin_mk",
          title: broadcastTitle.trim() || undefined,
          message: broadcastMessage.trim(),
          priority: broadcastPriority
        })
      });

      if (res.ok) {
        setBroadcastSuccess(true);
        setBroadcastTitle("");
        setBroadcastMessage("");
        setTimeout(() => setBroadcastSuccess(false), 4000);
      }
    } catch (err) {
      console.error("Broadcast push failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter Reports
  const filteredReports = reports.filter((r) => {
    if (reportFilter !== "all" && r.status !== reportFilter) return false;
    if (reportSearch.trim()) {
      const q = reportSearch.toLowerCase();
      const matchReporter = r.reporterName?.toLowerCase().includes(q);
      const matchTarget = r.targetName?.toLowerCase().includes(q);
      const matchReason = r.reason?.toLowerCase().includes(q);
      const matchExp = r.customExplanation?.toLowerCase().includes(q);
      return matchReporter || matchTarget || matchReason || matchExp;
    }
    return true;
  });

  const bannedUsers = allUsers.filter((u) => u.isBanned);

  return (
    <div
      id="admin-panel-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="admin-panel-modal-content"
        className="w-full max-w-6xl bg-[#17212b] border border-[#2b3a4a] rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col h-[94vh] max-h-[94vh]"
      >
        {/* Top Master Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-[#242f3d] flex items-center justify-between bg-[#1f2c3a] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#3390ec]/20 border border-[#3390ec]/40 flex items-center justify-center text-[#3390ec]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  MK Wavegram Moderation & Justice Suite
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold uppercase tracking-wider border border-amber-500/30">
                  Admin Authority
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Logged in as <strong className="text-white">@{currentUser.username}</strong> ({currentUser.email})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="admin-close-btn"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PIN Authorization Screen if Required */}
        {!isAuthorized ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-[#17212b]">
            <div className="w-full max-w-sm bg-[#0e1621] border border-[#242f3d] rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
                <KeyRound className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Admin Security Verification</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your secure Master Administrator passkey to unlock judicial and moderation authority.
                </p>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold">
                  {authError}
                </div>
              )}

              <form onSubmit={handleAdminPinAuth} className="space-y-3 pt-2">
                <input
                  type="password"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="Enter secure Admin Passkey..."
                  className="w-full bg-[#17212b] border border-[#242f3d] rounded-xl px-4 py-2.5 text-center text-base tracking-widest text-white placeholder-slate-500 focus:outline-none focus:border-[#3390ec]"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={pinSubmitting || !adminPin.trim()}
                  className="w-full py-2.5 rounded-xl bg-[#3390ec] hover:bg-[#2880db] text-white font-bold text-xs uppercase tracking-wider transition disabled:opacity-50 cursor-pointer shadow-lg shadow-[#3390ec]/20"
                >
                  {pinSubmitting ? "Authenticating..." : "Unlock Moderation Console"}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <>
            {/* Primary Tab Navigation */}
            <div className="px-4 sm:px-6 bg-[#0e1621] border-b border-[#242f3d] flex items-center justify-between overflow-x-auto no-scrollbar shrink-0">
              <div className="flex space-x-1 sm:space-x-2">
                <button
                  onClick={() => setActiveTab("reports")}
                  className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center space-x-1.5 sm:space-x-2 shrink-0 cursor-pointer ${
                    activeTab === "reports"
                      ? "border-[#3390ec] text-[#3390ec]"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Reports</span>
                  {reports.filter((r) => r.status === "pending").length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-bold animate-pulse">
                      {reports.filter((r) => r.status === "pending").length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    if (selectedReport) {
                      handleOpenJudicialInvestigation(selectedReport);
                    } else if (reports.length > 0) {
                      handleOpenJudicialInvestigation(reports[0]);
                    } else {
                      setActiveTab("judicial");
                    }
                  }}
                  className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center space-x-1.5 sm:space-x-2 shrink-0 cursor-pointer ${
                    activeTab === "judicial"
                      ? "border-amber-400 text-amber-400 bg-amber-500/10"
                      : "border-transparent text-amber-300 hover:text-white"
                  }`}
                >
                  <Scale className="w-4 h-4 text-amber-400" />
                  <span>Judicial Investigation ⚖️</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("bans");
                    setSelectedReport(null);
                  }}
                  className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center space-x-1.5 sm:space-x-2 shrink-0 cursor-pointer ${
                    activeTab === "bans"
                      ? "border-[#3390ec] text-[#3390ec]"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Ban className="w-4 h-4" />
                  <span>Bans & Sanctions</span>
                  {bannedUsers.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-700 text-slate-300 text-[10px] font-semibold">
                      {bannedUsers.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setActiveTab("broadcast");
                    setSelectedReport(null);
                  }}
                  className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center space-x-1.5 sm:space-x-2 shrink-0 cursor-pointer ${
                    activeTab === "broadcast"
                      ? "border-[#3390ec] text-[#3390ec]"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Radio className="w-4 h-4" />
                  <span>Broadcast ⚡</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("users");
                    setSelectedReport(null);
                  }}
                  className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center space-x-1.5 sm:space-x-2 shrink-0 cursor-pointer ${
                    activeTab === "users"
                      ? "border-[#3390ec] text-[#3390ec]"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Users ({allUsers.length})</span>
                </button>
              </div>

              <button
                onClick={fetchReports}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition text-xs flex items-center space-x-1 shrink-0 cursor-pointer"
                title="Refresh database records"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingReports ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-hidden flex bg-[#17212b]">
              {/* TAB 1: REPORTS (RESPONSIVE MASTER-DETAIL) */}
              {activeTab === "reports" && (
                <div className="flex-1 flex overflow-hidden w-full">
                  {/* Left Column: Reports List */}
                  <div
                    className={`${
                      selectedReport ? "hidden md:flex" : "flex"
                    } w-full md:w-5/12 border-r border-[#242f3d] flex-col h-full bg-[#17212b]`}
                  >
                    {/* Search & Filter Header */}
                    <div className="p-3 border-b border-[#242f3d] bg-[#0e1621] space-y-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={reportSearch}
                          onChange={(e) => setReportSearch(e.target.value)}
                          placeholder="Search reports by user or keyword..."
                          className="w-full bg-[#17212b] border border-[#242f3d] rounded-xl pl-8.5 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#3390ec]"
                        />
                      </div>

                      {/* Filter pills */}
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                        {(["all", "pending", "resolved", "dismissed"] as const).map((f) => (
                          <button
                            key={f}
                            onClick={() => setReportFilter(f)}
                            className={`px-3 py-1 rounded-lg capitalize font-bold transition cursor-pointer shrink-0 text-[11px] ${
                              reportFilter === f
                                ? "bg-[#3390ec] text-white shadow-md shadow-[#3390ec]/30"
                                : "bg-[#17212b] text-slate-400 hover:text-slate-200 border border-[#242f3d]"
                            }`}
                          >
                            {f === "all" ? `All (${reports.length})` : f}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Report Items List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-[#242f3d]">
                      {loadingReports && reports.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs">
                          <div className="w-6 h-6 border-2 border-[#3390ec]/30 border-t-[#3390ec] rounded-full animate-spin mx-auto mb-2" />
                          Loading reports...
                        </div>
                      ) : filteredReports.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                          <ShieldCheck className="w-10 h-10 text-emerald-400/60" />
                          <div className="text-sm font-semibold text-white">No Reports Found</div>
                          <p className="text-xs max-w-xs text-slate-400">
                            {reports.length === 0
                              ? "There are currently no open user reports in the database."
                              : "No reports match your search query or filter category."}
                          </p>
                        </div>
                      ) : (
                        filteredReports.map((rep) => {
                          const isSelected = selectedReport?.id === rep.id;
                          return (
                            <div
                              key={rep.id}
                              onClick={() => {
                                setSelectedReport(rep);
                                setReplyText(rep.adminReply || "");
                                setActionTakenText(rep.actionTaken || "");
                              }}
                              className={`p-3.5 cursor-pointer transition flex items-start space-x-3 ${
                                isSelected
                                  ? "bg-[#3390ec]/15 border-l-4 border-[#3390ec]"
                                  : "hover:bg-[#1f2c3a]"
                              }`}
                            >
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                  rep.targetType === "user"
                                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                    : rep.targetType === "message"
                                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                    : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                }`}
                              >
                                {rep.targetType === "user" && <Users className="w-4 h-4" />}
                                {rep.targetType === "message" && <MessageSquare className="w-4 h-4" />}
                                {rep.targetType === "group" && <ShieldAlert className="w-4 h-4" />}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <div className="text-xs font-bold text-white truncate">
                                    {rep.targetName || "Report Subject"}
                                  </div>
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                                      rep.status === "pending"
                                        ? "bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse"
                                        : rep.status === "resolved"
                                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                        : rep.status === "dismissed"
                                        ? "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    }`}
                                  >
                                    {rep.status}
                                  </span>
                                </div>

                                <div className="text-xs text-red-400 font-semibold mt-0.5 truncate">
                                  {rep.reason}
                                </div>

                                {rep.customExplanation && (
                                  <div className="text-[11px] text-slate-400 truncate italic mt-0.5">
                                    "{rep.customExplanation}"
                                  </div>
                                )}

                                <div className="text-[10px] text-slate-500 mt-1.5 flex items-center justify-between">
                                  <span className="truncate">By @{rep.reporterName}</span>
                                  <span className="shrink-0">{formatEnglishDate(rep.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Column: Report Detail & Actions */}
                  <div
                    className={`${
                      selectedReport ? "flex" : "hidden md:flex"
                    } w-full md:w-7/12 flex-col bg-[#17212b] overflow-y-auto p-4 sm:p-5 space-y-4`}
                  >
                    {selectedReport ? (
                      <>
                        {/* Mobile Back Button & Actions Bar */}
                        <div className="flex items-center justify-between border-b border-[#242f3d] pb-3 gap-2 flex-wrap">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setSelectedReport(null)}
                              className="md:hidden px-2.5 py-1.5 rounded-xl bg-[#242f3d] hover:bg-[#2e3c4e] text-slate-200 text-xs font-bold flex items-center space-x-1 transition cursor-pointer"
                            >
                              <ChevronLeft className="w-4 h-4" />
                              <span>Back</span>
                            </button>

                            <div>
                              <div className="text-[11px] uppercase tracking-wider font-bold text-[#3390ec] flex items-center gap-1.5">
                                <span>Report #{selectedReport.id.slice(-8)}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-slate-300 uppercase font-bold">
                                  {selectedReport.targetType}
                                </span>
                              </div>
                              <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
                                {selectedReport.targetName || "Target Subject"}
                              </h3>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0 flex-wrap gap-1.5">
                            {/* Direct Action: Enter Conversation */}
                            {((selectedReport.targetDetails?.conversationId) || selectedReport.targetType === "message") && (onOpenReportTarget || onOpenConversation) && (
                              <button
                                onClick={() => {
                                  if (onOpenReportTarget) {
                                    onOpenReportTarget(selectedReport);
                                  } else {
                                    const convId = selectedReport.targetDetails?.conversationId || (selectedReport.targetType === "message" ? selectedReport.targetId : undefined);
                                    if (convId && onOpenConversation) {
                                      onOpenConversation(convId, selectedReport.targetId);
                                    } else {
                                      handleOpenJudicialInvestigation(selectedReport);
                                    }
                                  }
                                }}
                                className="px-3 py-1.5 rounded-xl bg-[#3390ec] hover:bg-[#2880db] text-white text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-md shadow-[#3390ec]/20"
                                title="Enter conversation directly"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Enter Conversation</span>
                              </button>
                            )}

                            {/* Direct Action: Enter Group */}
                            {((selectedReport.targetDetails?.groupId) || selectedReport.targetType === "group") && (onOpenReportTarget || onOpenGroup) && (
                              <button
                                onClick={() => {
                                  if (onOpenReportTarget) {
                                    onOpenReportTarget(selectedReport);
                                  } else {
                                    const grpId = selectedReport.targetDetails?.groupId || (selectedReport.targetType === "group" ? selectedReport.targetId : undefined);
                                    if (grpId && onOpenGroup) {
                                      onOpenGroup(grpId);
                                    } else {
                                      handleOpenJudicialInvestigation(selectedReport);
                                    }
                                  }
                                }}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-md shadow-indigo-600/20"
                                title="Enter group chat directly"
                              >
                                <Users className="w-3.5 h-3.5" />
                                <span>Enter Group</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenJudicialInvestigation(selectedReport)}
                              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-lg shadow-amber-500/20"
                            >
                              <Scale className="w-4 h-4" />
                              <span>Inspect Chat & Judicial Room ⚖️</span>
                            </button>

                            <button
                              onClick={() => handleResolveReport(selectedReport.id, "resolved")}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1 transition cursor-pointer shadow-md shadow-emerald-600/20"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Resolve</span>
                            </button>
                            <button
                              onClick={() => handleResolveReport(selectedReport.id, "dismissed")}
                              className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold flex items-center space-x-1 transition cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Dismiss</span>
                            </button>
                          </div>
                        </div>

                        {/* Top Judicial Callout Card */}
                        <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-[#1f2c3a] to-amber-500/10 border border-amber-500/40 flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/30 text-amber-300 flex items-center justify-center font-bold">
                              <Gavel className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-amber-300">Live Judicial Investigation Available</div>
                              <div className="text-[11px] text-slate-300">
                                Enter the full conversation or group context, view messages live, and render a binding verdict.
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {/* Fast Direct Entry Buttons */}
                            {((selectedReport.targetDetails?.conversationId) || selectedReport.targetType === "message") && onOpenConversation && (
                              <button
                                onClick={() => {
                                  const convId = selectedReport.targetDetails?.conversationId || (selectedReport.targetType === "message" ? selectedReport.targetId : undefined);
                                  if (convId) onOpenConversation(convId, selectedReport.targetId);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[#3390ec] hover:bg-[#2880db] text-white text-xs font-bold flex items-center space-x-1 transition cursor-pointer shadow-sm"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Open in Chat</span>
                              </button>
                            )}

                            {((selectedReport.targetDetails?.groupId) || selectedReport.targetType === "group") && onOpenGroup && (
                              <button
                                onClick={() => {
                                  const grpId = selectedReport.targetDetails?.groupId || (selectedReport.targetType === "group" ? selectedReport.targetId : undefined);
                                  if (grpId) onOpenGroup(grpId);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1 transition cursor-pointer shadow-sm"
                              >
                                <Users className="w-3.5 h-3.5" />
                                <span>Open Group</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenJudicialInvestigation(selectedReport)}
                              className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold flex items-center space-x-1 transition cursor-pointer"
                            >
                              <span>Enter Case Room</span>
                              <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
                            </button>
                          </div>
                        </div>

                        {/* Report Information Summary */}
                        <div className="bg-[#0e1621] border border-[#242f3d] rounded-xl p-3.5 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-slate-400 text-[11px]">
                            <span>
                              Reporter: <strong className="text-white">@{selectedReport.reporterName}</strong>
                            </span>
                            <span>{formatEnglishDate(selectedReport.createdAt)}</span>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                              Flagged Reason:
                            </span>
                            <div className="text-xs sm:text-sm font-bold text-red-400 mt-0.5">
                              {selectedReport.reason}
                            </div>
                          </div>

                          {selectedReport.customExplanation && (
                            <div>
                              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                                Reporter's Explanation:
                              </span>
                              <div className="text-xs text-slate-200 mt-1 bg-[#17212b] p-2.5 rounded-lg border border-[#242f3d] whitespace-pre-wrap">
                                "{selectedReport.customExplanation}"
                              </div>
                            </div>
                          )}

                          {selectedReport.targetDetails?.messageText && (
                            <div>
                              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                                Flagged Message Excerpt:
                              </span>
                              <div className="text-xs text-amber-200 mt-1 bg-[#17212b] p-2.5 rounded-lg border border-amber-500/30 font-mono">
                                "{selectedReport.targetDetails.messageText}"
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Official Response Composer */}
                        <div className="bg-[#0e1621] border border-[#3390ec]/30 rounded-xl p-3.5 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5 text-xs font-bold text-[#3390ec]">
                              <MessageCircle className="w-4 h-4" />
                              <span>Official Response to @{selectedReport.reporterName}</span>
                            </div>
                            {replySuccess && (
                              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-bold">
                                <Check className="w-3.5 h-3.5" />
                                <span>Sent & Resolved!</span>
                              </span>
                            )}
                          </div>

                          {/* Quick Reply Templates */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Quick Templates:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {QUICK_REPLIES.map((qr, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setReplyText(qr.text);
                                    setActionTakenText(qr.action);
                                  }}
                                  className="p-2 text-left bg-[#17212b] hover:bg-[#1f2c3a] border border-[#242f3d] hover:border-[#3390ec] rounded-lg text-[11px] text-slate-300 transition truncate cursor-pointer"
                                >
                                  {qr.title}
                                </button>
                              ))}
                            </div>
                          </div>

                          <form onSubmit={handleSendAdminReply} className="space-y-2.5">
                            <div>
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Type the official message that the reporter will see in their reports dashboard..."
                                rows={3}
                                className="w-full bg-[#17212b] border border-[#242f3d] rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#3390ec] resize-none"
                              />
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <input
                                type="text"
                                value={actionTakenText}
                                onChange={(e) => setActionTakenText(e.target.value)}
                                placeholder="Action summary (e.g. Warning Issued, 7-Day Ban)"
                                className="flex-1 bg-[#17212b] border border-[#242f3d] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#3390ec]"
                              />
                              <button
                                type="submit"
                                disabled={submittingReply || !replyText.trim()}
                                className="px-4 py-2 bg-[#3390ec] hover:bg-[#2880db] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-md shadow-[#3390ec]/20 shrink-0"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>{submittingReply ? "Sending..." : "Send Response & Resolve"}</span>
                              </button>
                            </div>
                          </form>
                        </div>

                        {/* Gemini AI Moderation Engine */}
                        <div className="bg-gradient-to-br from-[#1e1b4b]/60 to-[#0e1621] border border-indigo-500/30 rounded-xl p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                              <Sparkles className="w-4 h-4 text-indigo-400" />
                              <span>Gemini AI Moderation Assistant</span>
                            </div>
                            <button
                              onClick={() => handleRunAiAnalysis(selectedReport.id)}
                              disabled={analyzingReportId === selectedReport.id}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center space-x-1 transition disabled:opacity-50 cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>{analyzingReportId === selectedReport.id ? "Analyzing..." : "Run AI Assessment"}</span>
                            </button>
                          </div>

                          {selectedReport.aiAnalysis ? (
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center space-x-2">
                                <span className="text-slate-400">Severity:</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                    selectedReport.aiAnalysis.severity === "critical"
                                      ? "bg-red-500 text-white"
                                      : selectedReport.aiAnalysis.severity === "high"
                                      ? "bg-amber-500 text-black"
                                      : selectedReport.aiAnalysis.severity === "medium"
                                      ? "bg-blue-500 text-white"
                                      : "bg-emerald-500 text-white"
                                  }`}
                                >
                                  {selectedReport.aiAnalysis.severity}
                                </span>
                                <span className="text-slate-400 font-mono text-[11px]">
                                  ({selectedReport.aiAnalysis.confidenceScore || 88}% Confidence)
                                </span>
                              </div>

                              <p className="text-slate-200 leading-relaxed bg-[#0e1621]/80 p-2.5 rounded-lg border border-indigo-500/20 text-xs">
                                {selectedReport.aiAnalysis.summary}
                              </p>

                              <div className="flex items-center space-x-2 text-indigo-200 text-xs">
                                <span className="font-semibold">Recommended Sanction:</span>
                                <span className="bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/40 font-bold">
                                  {selectedReport.aiAnalysis.suggestedAction}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400">
                              Click "Run AI Assessment" to have Gemini inspect the complaint text and recommend disciplinary actions.
                            </p>
                          )}
                        </div>

                        {/* Quick Disciplinary Actions */}
                        <div className="space-y-2">
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Disciplinary & Investigation Tools
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {selectedReport.targetDetails?.userId && (
                              <>
                                <button
                                  onClick={() => {
                                    setWarningUser({
                                      id: selectedReport.targetDetails!.userId!,
                                      name: selectedReport.targetDetails?.username || "User"
                                    });
                                  }}
                                  className="p-2.5 rounded-xl bg-amber-600/20 border border-amber-500/40 hover:bg-amber-600/30 text-amber-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>Issue Warning</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setBanningUser({
                                      id: selectedReport.targetDetails!.userId!,
                                      name: selectedReport.targetDetails?.username || "User"
                                    });
                                  }}
                                  className="p-2.5 rounded-xl bg-red-600/20 border border-red-500/40 hover:bg-red-600/30 text-red-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Ban / Suspend</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 py-16">
                        <Info className="w-8 h-8 opacity-40" />
                        <span className="text-xs text-center max-w-xs text-slate-400">
                          Select a report from the list on the left to review details, inspect the full live conversation, respond to the reporter, and enforce moderation sanctions.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: JUDICIAL LIVE INVESTIGATION ROOM & DECISION SUITE */}
              {activeTab === "judicial" && (
                <div className="flex-1 flex flex-col overflow-hidden w-full bg-[#101921]">
                  {loadingJudicial ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-3 p-8">
                      <div className="w-10 h-10 border-3 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                      <div className="text-sm font-bold text-white">Opening Judicial Case & Live Discussion Log...</div>
                      <p className="text-xs text-slate-400">Gathering chat history, user standing, and evidence</p>
                    </div>
                  ) : !judicialCase ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                      <Scale className="w-12 h-12 text-amber-400/60" />
                      <h3 className="text-base font-bold text-white">No Active Judicial Investigation Selected</h3>
                      <p className="text-xs text-slate-400 max-w-md">
                        Please select a report from the Reports tab or choose a conversation to enter Judicial Investigation mode.
                      </p>
                      <button
                        onClick={() => setActiveTab("reports")}
                        className="px-4 py-2 rounded-xl bg-[#3390ec] hover:bg-[#2880db] text-white text-xs font-bold transition cursor-pointer"
                      >
                        Return to Reports
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                      {/* Left/Main Column: Real-Time Chat & Discussion Transcript */}
                      <div className="flex-1 flex flex-col h-full border-r border-[#242f3d] bg-[#0e1621] overflow-hidden">
                        {/* Investigation Case Header */}
                        <div className="p-3.5 bg-[#17212b] border-b border-[#242f3d] flex items-center justify-between flex-wrap gap-2 shrink-0">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
                              <Gavel className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-white">
                                  {judicialCase.conversation?.name ||
                                    judicialCase.group?.name ||
                                    (judicialCase.reporter && judicialCase.targetUser
                                      ? `Discussion: @${judicialCase.reporter.username} ↔ @${judicialCase.targetUser.username}`
                                      : "Live Discussion Transcript")}
                                </span>
                                <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                  {judicialCase.messages.length} Messages
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                <span>Reporter: <strong className="text-slate-200">@{judicialCase.reporter?.username || selectedReport?.reporterName || "User"}</strong></span>
                                <span>•</span>
                                <span>Subject: <strong className="text-red-400">@{judicialCase.targetUser?.username || selectedReport?.targetName || "Offender"}</strong></span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {/* Direct Open in Main Chat */}
                            {(judicialCase.conversation?.id || selectedReport) && (onOpenReportTarget || onOpenConversation) && (
                              <button
                                onClick={() => {
                                  if (selectedReport && onOpenReportTarget) {
                                    onOpenReportTarget(selectedReport);
                                  } else if (judicialCase.conversation?.id && onOpenConversation) {
                                    onOpenConversation(judicialCase.conversation.id, judicialCase.flaggedMessageId || undefined);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[#3390ec] hover:bg-[#2880db] text-white text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-sm"
                                title="Open this conversation in the main chat room"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Open in Main Chat</span>
                              </button>
                            )}

                            {/* Direct Open Group */}
                            {(judicialCase.group?.id || (selectedReport && selectedReport.targetType === "group")) && (onOpenReportTarget || onOpenGroup) && (
                              <button
                                onClick={() => {
                                  if (selectedReport && onOpenReportTarget) {
                                    onOpenReportTarget(selectedReport);
                                  } else if (judicialCase.group?.id && onOpenGroup) {
                                    onOpenGroup(judicialCase.group.id);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-sm"
                                title="Open this group in the main chat room"
                              >
                                <Users className="w-3.5 h-3.5" />
                                <span>Open Group Chat</span>
                              </button>
                            )}

                            {/* Search within transcript */}
                            <div className="relative w-36 sm:w-44">
                              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={judicialSearch}
                                onChange={(e) => setJudicialSearch(e.target.value)}
                                placeholder="Search messages..."
                                className="w-full bg-[#0e1621] border border-[#242f3d] rounded-lg pl-7 pr-2 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                              />
                            </div>

                            <button
                              onClick={() => selectedReport && handleOpenJudicialInvestigation(selectedReport)}
                              className="p-1.5 rounded-lg bg-[#242f3d] hover:bg-[#2e3c4e] text-slate-300 hover:text-white transition text-xs cursor-pointer"
                              title="Refresh Chat Feed"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Transcript Feed Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0e1621]">
                          {judicialCase.messages.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 text-xs">
                              No messages found in this conversation thread.
                            </div>
                          ) : (
                            judicialCase.messages
                              .filter((m) => {
                                if (!judicialSearch.trim()) return true;
                                const q = judicialSearch.toLowerCase();
                                return (
                                  m.text?.toLowerCase().includes(q) ||
                                  m.senderName?.toLowerCase().includes(q)
                                );
                              })
                              .map((msg) => {
                                const isFlagged =
                                  msg.id === judicialCase.flaggedMessageId ||
                                  (selectedReport && selectedReport.targetId === msg.id);
                                const isReporter = msg.senderId === judicialCase.reporter?.id;
                                const isTarget = msg.senderId === judicialCase.targetUser?.id;

                                return (
                                  <div
                                    key={msg.id}
                                    id={`judicial-msg-${msg.id}`}
                                    className={`p-3 rounded-2xl border transition ${
                                      isFlagged
                                        ? "bg-red-950/40 border-red-500 shadow-lg shadow-red-950/50 ring-2 ring-red-500/40"
                                        : isTarget
                                        ? "bg-[#17212b] border-purple-500/30"
                                        : isReporter
                                        ? "bg-[#1f2c3a] border-[#3390ec]/30"
                                        : "bg-[#17212b] border-[#242f3d]"
                                    }`}
                                  >
                                    {/* Sender & Badge Header */}
                                    <div className="flex items-center justify-between pb-1.5 border-b border-white/5 text-xs">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-700 shrink-0">
                                          {msg.senderAvatar ? (
                                            <img src={msg.senderAvatar} alt="" className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-white font-bold">
                                              {msg.senderName?.[0] || "?"}
                                            </div>
                                          )}
                                        </div>
                                        <span className="font-bold text-white text-xs">{msg.senderName}</span>
                                        {isTarget && (
                                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-semibold uppercase">
                                            Reported Subject
                                          </span>
                                        )}
                                        {isReporter && (
                                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-semibold uppercase">
                                            Reporter
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                                        <span>{formatEnglishDate(msg.createdAt)}</span>
                                        {isFlagged && (
                                          <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-bold text-[10px] uppercase tracking-wider animate-pulse flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            Flagged Violation
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Message Body Content */}
                                    <div className="pt-2 text-xs sm:text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                                      {msg.text || (
                                        <span className="italic text-slate-400">[Attachment: {msg.type || "Media"}]</span>
                                      )}
                                      {msg.mediaUrl && (
                                        <div className="mt-2 max-w-xs rounded-lg overflow-hidden border border-white/10">
                                          {msg.type === "photo" ? (
                                            <img src={msg.mediaUrl} alt="Attached Evidence" className="w-full h-auto max-h-48 object-cover" />
                                          ) : msg.type === "audio" ? (
                                            <audio src={msg.mediaUrl} controls className="w-full mt-1" />
                                          ) : null}
                                        </div>
                                      )}
                                    </div>

                                    {/* Judicial Message Actions Bar */}
                                    <div className="mt-2.5 pt-1.5 border-t border-white/5 flex items-center justify-between text-[11px]">
                                      <span className="text-slate-500 font-mono text-[10px]">ID: {msg.id}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteMessageInJudicial(msg.id)}
                                        className="px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white transition font-bold flex items-center space-x-1 cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Delete / Redact Message</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </div>

                      {/* Right Column: Judicial Verdict & Decision Suite */}
                      <div className="w-full md:w-5/12 bg-[#17212b] p-4 sm:p-5 overflow-y-auto flex flex-col space-y-4">
                        <div className="border-b border-[#242f3d] pb-3 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
                              <Scale className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-white">Judicial Verdict & Sanctions</h3>
                              <p className="text-[11px] text-slate-400">Review evidence and deliver binding resolution</p>
                            </div>
                          </div>
                        </div>

                        {verdictSuccessMessage && (
                          <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-start space-x-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{verdictSuccessMessage}</span>
                          </div>
                        )}

                        {/* Subject Standing Dossier */}
                        <div className="bg-[#0e1621] border border-[#242f3d] rounded-xl p-3 space-y-2 text-xs">
                          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            Target Subject Standing
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-700">
                                {judicialCase.targetUser?.avatar && (
                                  <img src={judicialCase.targetUser.avatar} alt="" className="w-full h-full object-cover" />
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-white">@{judicialCase.targetUser?.username || selectedReport?.targetName || "Subject"}</div>
                                <div className="text-[10px] text-slate-400">{judicialCase.targetUser?.email || "User Account"}</div>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                judicialCase.targetUser?.isBanned
                                  ? "bg-red-600 text-white"
                                  : "bg-emerald-500/20 text-emerald-300"
                              }`}
                            >
                              {judicialCase.targetUser?.isBanned ? "Suspended" : "Active"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1 text-center text-[11px]">
                            <div className="p-1.5 bg-[#17212b] rounded-lg border border-[#242f3d]">
                              <span className="text-amber-400 font-bold block">{judicialCase.targetUser?.warnings?.length || 0}</span>
                              <span className="text-slate-400 text-[10px]">Past Warnings</span>
                            </div>
                            <div className="p-1.5 bg-[#17212b] rounded-lg border border-[#242f3d]">
                              <span className="text-red-400 font-bold block">{judicialCase.targetUser?.reportsAgainstCount || 1}</span>
                              <span className="text-slate-400 text-[10px]">Total Complaints</span>
                            </div>
                          </div>
                        </div>

                        {/* Complaint Overview */}
                        <div className="bg-[#0e1621] border border-red-500/30 rounded-xl p-3 space-y-1.5 text-xs">
                          <div className="text-[10px] uppercase font-bold text-red-400 tracking-wider flex items-center justify-between">
                            <span>Reported Violation:</span>
                            <span className="text-slate-400 font-normal">{formatEnglishDate(selectedReport?.createdAt)}</span>
                          </div>
                          <div className="font-bold text-white">{selectedReport?.reason || "Policy Violation"}</div>
                          {selectedReport?.customExplanation && (
                            <div className="text-slate-300 italic bg-[#17212b] p-2 rounded-lg border border-[#242f3d] text-[11px]">
                              "{selectedReport.customExplanation}"
                            </div>
                          )}
                        </div>

                        {/* Verdict Form */}
                        <form onSubmit={handleDeliverJudicialVerdict} className="space-y-3.5 text-xs">
                          {/* 1. Sanction Choice */}
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                              1. Select Disciplinary Action on Subject:
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                { id: "none", label: "Dismiss (No Sanction)" },
                                { id: "warn", label: "Formal Disciplinary Warning" },
                                { id: "ban_3d", label: "Suspend 3 Days" },
                                { id: "ban_7d", label: "Suspend 7 Days" },
                                { id: "ban_30d", label: "Suspend 30 Days" },
                                { id: "ban_permanent", label: "Permanent Account Ban" }
                              ].map((opt) => (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => {
                                    setVerdictSanction(opt.id as any);
                                    if (opt.id === "none") {
                                      setVerdictReplyToReporter("Our moderation team has investigated the chat transcript and found no policy violation.");
                                      setVerdictActionSummary("Report Dismissed (No Violation)");
                                    } else if (opt.id === "warn") {
                                      setVerdictReplyToReporter("Thank you for reporting. The offending message was removed and a formal warning was issued to the user.");
                                      setVerdictActionSummary("Formal Warning Issued");
                                    } else if (opt.id === "ban_7d") {
                                      setVerdictReplyToReporter("Your report was validated. The offending user has been suspended for 7 days.");
                                      setVerdictActionSummary("7-Day Suspension Enforced");
                                    } else if (opt.id === "ban_permanent") {
                                      setVerdictReplyToReporter("Severe violations were confirmed upon judicial review. The offending account was permanently banned.");
                                      setVerdictActionSummary("Permanent Account Ban");
                                    }
                                  }}
                                  className={`p-2 rounded-xl text-left border transition text-[11px] font-semibold cursor-pointer ${
                                    verdictSanction === opt.id
                                      ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-md shadow-amber-500/20"
                                      : "bg-[#0e1621] border-[#242f3d] text-slate-300 hover:bg-[#1f2c3a]"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 2. Sanction Note */}
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                              2. Sanction Justification Note:
                            </label>
                            <input
                              type="text"
                              value={verdictReason}
                              onChange={(e) => setVerdictReason(e.target.value)}
                              placeholder="e.g. Violation of community safety guidelines regarding harassment."
                              className="w-full bg-[#0e1621] border border-[#242f3d] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                            />
                          </div>

                          {/* 3. Official Feedback to Reporter */}
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                              3. Official Verdict Notification to @{selectedReport?.reporterName}:
                            </label>
                            <textarea
                              value={verdictReplyToReporter}
                              onChange={(e) => setVerdictReplyToReporter(e.target.value)}
                              placeholder="Type the official message the reporter will receive..."
                              rows={3}
                              className="w-full bg-[#0e1621] border border-[#242f3d] rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
                            />
                          </div>

                          {/* 4. Redaction Checkbox */}
                          {judicialCase.flaggedMessageId && (
                            <label className="flex items-center space-x-2 bg-[#0e1621] p-2.5 rounded-xl border border-[#242f3d] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={verdictDeleteMessage}
                                onChange={(e) => setVerdictDeleteMessage(e.target.checked)}
                                className="w-4 h-4 rounded text-amber-500 bg-[#17212b] border-[#242f3d] focus:ring-amber-400"
                              />
                              <span className="text-xs text-slate-200">
                                Automatically delete and redact the flagged message from the conversation.
                              </span>
                            </label>
                          )}

                          {/* 5. Submit Verdict Button */}
                          <div className="pt-2">
                            <button
                              type="submit"
                              disabled={verdictSubmitting}
                              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xl shadow-amber-500/25 transition disabled:opacity-50 cursor-pointer"
                            >
                              <Gavel className="w-4 h-4" />
                              <span>{verdictSubmitting ? "Delivering Verdict..." : "⚖️ Deliver Final Verdict & Close Case"}</span>
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ACTIVE BANS */}
              {activeTab === "bans" && (
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white">Active Sanctions & Suspended Accounts</h3>
                      <p className="text-xs text-slate-400">
                        Suspended accounts cannot log in, message, or participate until their sanction expires.
                      </p>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-300 font-bold">
                      {bannedUsers.length} Suspended Accounts
                    </span>
                  </div>

                  {bannedUsers.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 bg-[#0e1621] rounded-2xl border border-[#242f3d] flex flex-col items-center justify-center space-y-2">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                      <h4 className="text-sm font-bold text-white">No Accounts Currently Suspended</h4>
                      <p className="text-xs max-w-sm text-slate-400">
                        All registered users are in good standing without active disciplinary sanctions.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {bannedUsers.map((u) => (
                        <div
                          key={u.id}
                          className="bg-[#0e1621] border border-red-500/30 rounded-xl p-4 flex flex-col justify-between space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <img
                                src={u.avatar}
                                alt={u.username}
                                className="w-10 h-10 rounded-full object-cover border border-red-500"
                              />
                              <div>
                                <div className="text-sm font-bold text-white">{u.username}</div>
                                <div className="text-xs text-slate-400">{u.email}</div>
                              </div>
                            </div>

                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                u.bannedUntil === "permanent"
                                  ? "bg-red-600 text-white"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              }`}
                            >
                              {u.bannedUntil === "permanent" ? "Permanent" : "Temporary Ban"}
                            </span>
                          </div>

                          <div className="bg-[#17212b] p-2.5 rounded-lg border border-[#242f3d] text-xs space-y-1">
                            <div className="text-slate-400">
                              <span className="font-semibold text-slate-300">Reason: </span>
                              {u.banReason || "Violation of MK Wavegram terms & safety rules"}
                            </div>
                            {u.bannedUntil && u.bannedUntil !== "permanent" && (
                              <div className="text-amber-300 flex items-center space-x-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Expires: {formatEnglishDate(u.bannedUntil)}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => handleUnbanUser(u.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-600 hover:text-white text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Lift Ban & Restore Access</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: BROADCAST STUDIO */}
              {activeTab === "broadcast" && (
                <div className="flex-1 p-4 sm:p-8 overflow-y-auto max-w-2xl mx-auto space-y-6">
                  <div className="border-b border-[#242f3d] pb-4 flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center space-x-2 text-[#3390ec] text-xs font-bold uppercase tracking-wider">
                        <Radio className="w-4 h-4" />
                        <span>MK Official Broadcast Engine ⚡</span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-white mt-1">Push Broadcast to All Users</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Send real-time alerts or platform notices to all users via the pinned MK Official Channel.
                      </p>
                    </div>

                    {onOpenMKChannel && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenMKChannel();
                        }}
                        className="px-3.5 py-2 rounded-xl bg-[#3390ec]/20 border border-[#3390ec]/40 hover:bg-[#3390ec]/30 text-[#3390ec] text-xs font-bold flex items-center space-x-1.5 transition shrink-0 cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Open Channel in Chat</span>
                      </button>
                    )}
                  </div>

                  {broadcastSuccess && (
                    <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm flex items-center space-x-3">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span>Announcement successfully broadcast to all active platform subscribers!</span>
                    </div>
                  )}

                  <form onSubmit={handleSendBroadcast} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Announcement Headline
                      </label>
                      <input
                        type="text"
                        value={broadcastTitle}
                        onChange={(e) => setBroadcastTitle(e.target.value)}
                        placeholder="e.g. Platform Security Update • Version 2.0"
                        className="w-full bg-[#0e1621] border border-[#242f3d] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#3390ec]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Broadcast Message Body <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        placeholder="Type the full official announcement or security alert..."
                        rows={5}
                        required
                        className="w-full bg-[#0e1621] border border-[#242f3d] rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#3390ec] resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-400 font-medium">Priority:</span>
                        {(["normal", "high", "urgent"] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setBroadcastPriority(p)}
                            className={`text-xs px-3 py-1 rounded-lg font-bold uppercase transition cursor-pointer ${
                              broadcastPriority === p
                                ? p === "urgent"
                                  ? "bg-red-600 text-white"
                                  : "bg-[#3390ec] text-white"
                                : "bg-[#0e1621] text-slate-400 hover:text-white"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>

                      <button
                        type="submit"
                        disabled={actionLoading || !broadcastMessage.trim()}
                        className="px-6 py-2.5 rounded-xl bg-[#3390ec] hover:bg-[#2880db] text-white font-bold text-sm flex items-center space-x-2 shadow-lg shadow-[#3390ec]/30 transition disabled:opacity-50 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>{actionLoading ? "Pushing..." : "Push Broadcast ⚡"}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 5: USERS DIRECTORY */}
              {activeTab === "users" && (
                <div className="flex-1 p-4 sm:p-6 overflow-hidden flex flex-col space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search users by name, email, or badge..."
                        className="w-full bg-[#0e1621] border border-[#242f3d] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#3390ec]"
                      />
                    </div>
                    <div className="text-xs text-slate-400">Total Accounts: {allUsers.length}</div>
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-[#242f3d] bg-[#0e1621] border border-[#242f3d] rounded-xl">
                    {allUsers
                      .filter(
                        (u) =>
                          u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.email.toLowerCase().includes(userSearch.toLowerCase())
                      )
                      .map((u) => (
                        <div key={u.id} className="p-3.5 flex items-center justify-between hover:bg-[#17212b] transition flex-wrap gap-2">
                          <div className="flex items-center space-x-3 min-w-0">
                            <img src={u.avatar} alt={u.username} className="w-9 h-9 rounded-full object-cover shrink-0" />
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2 flex-wrap">
                                <span className="text-sm font-bold text-white truncate">{u.username}</span>
                                {u.role === "admin" && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase shrink-0">
                                    Admin
                                  </span>
                                )}
                                {u.isBanned && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-bold uppercase shrink-0">
                                    Banned
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 truncate">{u.email}</div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            {u.role !== "admin" && (
                              <>
                                <button
                                  onClick={() => setWarningUser({ id: u.id, name: u.username })}
                                  className="px-3 py-1 rounded-lg bg-amber-600/20 text-amber-300 text-xs font-bold hover:bg-amber-600 hover:text-white transition cursor-pointer"
                                >
                                  Warn
                                </button>
                                {u.isBanned ? (
                                  <button
                                    onClick={() => handleUnbanUser(u.id)}
                                    className="px-3 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 text-xs font-bold hover:bg-emerald-600 hover:text-white transition cursor-pointer"
                                  >
                                    Unban
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setBanningUser({ id: u.id, name: u.username })}
                                    className="px-3 py-1 rounded-lg bg-red-600/20 text-red-400 text-xs font-bold hover:bg-red-600 hover:text-white transition cursor-pointer"
                                  >
                                    Ban
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Warning Issue Modal */}
        {warningUser && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md bg-[#17212b] border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Issue Warning to @{warningUser.name}</h3>
                  <p className="text-xs text-slate-400">Send an official disciplinary warning</p>
                </div>
              </div>

              {warningSuccess ? (
                <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-center text-xs font-bold">
                  Warning successfully dispatched to user!
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Warning Notice Reason
                    </label>
                    <textarea
                      value={warningReason}
                      onChange={(e) => setWarningReason(e.target.value)}
                      placeholder="e.g. Warning for inappropriate language or harassing conduct in chats."
                      rows={3}
                      className="w-full bg-[#0e1621] border border-[#242f3d] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setWarningUser(null)}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteWarn}
                      disabled={actionLoading}
                      className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition cursor-pointer"
                    >
                      {actionLoading ? "Issuing..." : "Send Formal Warning"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Ban Duration Dialog Modal */}
        {banningUser && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md bg-[#17212b] border border-red-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center text-red-400">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Suspend @{banningUser.name}</h3>
                  <p className="text-xs text-slate-400">Choose disciplinary duration and reason</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Suspension Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "3_days", label: "3 Days" },
                    { id: "7_days", label: "7 Days" },
                    { id: "10_days", label: "10 Days" },
                    { id: "30_days", label: "30 Days" },
                    { id: "permanent", label: "Permanent" }
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setBanDuration(d.id as any)}
                      className={`p-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        banDuration === d.id
                          ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/30"
                          : "bg-[#0e1621] border-[#242f3d] text-slate-300 hover:bg-[#1f2c3a]"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Reason for Suspension (Visible to User)
                </label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="e.g. Inappropriate conduct, harassment, or spamming community channels."
                  rows={3}
                  className="w-full bg-[#0e1621] border border-[#242f3d] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBanningUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBan}
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition cursor-pointer"
                >
                  {actionLoading ? "Enforcing..." : "Enforce Suspension"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
