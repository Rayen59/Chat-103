import React, { useState, useEffect } from "react";
import { User, UserReport, Message, Conversation, Group } from "../types";
import {
  ShieldCheck,
  X,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Ban,
  Radio,
  Users,
  Search,
  Sparkles,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  FileText,
  Send,
  Trash2,
  Eye,
  ShieldAlert,
  Info,
  ChevronRight,
  Filter,
  Lock,
  KeyRound,
  Check,
  AlertCircle,
  MessageCircle
} from "lucide-react";

interface AdminPanelModalProps {
  currentUser: User;
  allUsers: User[];
  onClose: () => void;
  onOpenMKChannel?: () => void;
  onUserUpdated?: (user: User) => void;
}

const QUICK_REPLIES = [
  {
    title: "Content Removed & Warning Issued",
    text: "Thank you for reporting. Our moderation team has reviewed the evidence, removed the prohibited content, and issued a formal disciplinary warning to the offending account.",
    action: "Warning Issued & Content Removed"
  },
  {
    title: "Account Suspended (7 Days)",
    text: "Your report has been validated. The reported user has been suspended from MK Wavegram for 7 days due to violations of our community safety guidelines.",
    action: "7-Day Account Suspension"
  },
  {
    title: "Account Permanently Banned",
    text: "Thank you for helping keep our platform safe. Severe violations were verified, and the offending user's account has been permanently terminated.",
    action: "Permanent Account Ban"
  },
  {
    title: "No Violation Found",
    text: "Our moderation team has thoroughly investigated the reported item. Based on our community guidelines, no direct policy violation was identified at this time.",
    action: "Report Dismissed (No Violation)"
  }
];

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  currentUser,
  allUsers,
  onClose,
  onOpenMKChannel,
  onUserUpdated
}) => {
  const [activeTab, setActiveTab] = useState<"reports" | "bans" | "broadcast" | "users">("reports");
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [reportFilter, setReportFilter] = useState<"all" | "pending" | "resolved" | "dismissed">("all");
  const [reportSearch, setReportSearch] = useState("");
  const [analyzingReportId, setAnalyzingReportId] = useState<string | null>(null);

  // Admin Pin Auth State (in case user needs to authenticate admin access)
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
  const [loadingContext, setLoadingContext] = useState(false);

  // Broadcast Studio state
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastPriority, setBroadcastPriority] = useState<"normal" | "high" | "urgent">("high");
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // Users Filter
  const [userSearch, setUserSearch] = useState("");

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
          reason: warningReason.trim() || "Official Warning regarding community standards."
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
      console.error("Warning issue failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/users/unban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: currentUser.id || "user_admin_mk", targetUserId: userId })
      });
      if (res.ok) {
        fetchReports();
      }
    } catch (err) {
      console.error("Unban failed:", err);
    }
  };

  const handleInspectMessageContext = async (messageId: string) => {
    setLoadingContext(true);
    setInspectedUserActivity(null);
    try {
      const res = await fetch(`/api/admin/messages/context/${messageId}?adminId=${currentUser.id || "user_admin_mk"}`);
      if (res.ok) {
        const data = await res.json();
        setInspectedMessageContext(data);
      }
    } catch (err) {
      console.error("Context inspection failed:", err);
    } finally {
      setLoadingContext(false);
    }
  };

  const handleInspectUserActivity = async (userId: string) => {
    setLoadingContext(true);
    setInspectedMessageContext(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/activity?adminId=${currentUser.id || "user_admin_mk"}`);
      if (res.ok) {
        const data = await res.json();
        setInspectedUserActivity(data);
      }
    } catch (err) {
      console.error("User activity inspection failed:", err);
    } finally {
      setLoadingContext(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    setActionLoading(true);
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
        setTimeout(() => setBroadcastSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Broadcast failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredReports = reports.filter((rep) => {
    const matchesFilter =
      reportFilter === "all"
        ? true
        : reportFilter === "pending"
        ? rep.status === "pending" || rep.status === "reviewed"
        : rep.status === reportFilter;

    const matchesSearch =
      reportSearch.trim() === "" ||
      rep.targetName?.toLowerCase().includes(reportSearch.toLowerCase()) ||
      rep.reporterName?.toLowerCase().includes(reportSearch.toLowerCase()) ||
      rep.reason.toLowerCase().includes(reportSearch.toLowerCase()) ||
      rep.customExplanation?.toLowerCase().includes(reportSearch.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const bannedUsers = allUsers.filter((u) => u.isBanned);
  const pendingReportsCount = reports.filter((r) => r.status === "pending").length;

  return (
    <div
      id="admin-panel-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="admin-panel-container"
        className="w-full max-w-5xl bg-[#17212b] border border-[#2b3a4a] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[88vh] text-white"
      >
        {/* Top Bar */}
        <div className="px-6 py-4 border-b border-[#242f3d] bg-[#0e1621] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#3390ec]/20 border border-[#3390ec]/40 flex items-center justify-center text-[#3390ec]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  MK Wavegram • Admin Moderation Panel 👑
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold uppercase tracking-wider">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Connected as <span className="text-white font-medium">{currentUser.email || currentUser.username}</span> (Full Control & Trust Center)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {onOpenMKChannel && (
              <button
                id="admin-jump-channel-btn"
                onClick={() => {
                  onClose();
                  onOpenMKChannel();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#3390ec]/15 border border-[#3390ec]/30 text-[#3390ec] hover:bg-[#3390ec]/25 text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Open MK Channel ⚡</span>
              </button>
            )}
            <button
              id="admin-close-btn"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Security Unlock if Unauthorized */}
        {!isAuthorized ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Admin Authentication Required</h3>
            <p className="text-xs text-slate-400 max-w-md">
              Please enter the administrator passcode to access user reports, sanctions, and moderation controls.
            </p>

            <form onSubmit={handleAdminPinAuth} className="w-full max-w-sm space-y-3">
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="Enter Admin Passcode (e.g. admin123)"
                  className="w-full bg-[#0e1621] border border-[#242f3d] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#3390ec]"
                />
              </div>

              {authError && (
                <div className="text-xs text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/30">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={pinSubmitting || !adminPin.trim()}
                className="w-full py-2.5 rounded-xl bg-[#3390ec] hover:bg-[#2880db] text-white text-xs font-bold transition disabled:opacity-50"
              >
                {pinSubmitting ? "Authenticating..." : "Unlock Admin Controls"}
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="px-6 border-b border-[#242f3d] bg-[#1f2c3a] flex items-center justify-between">
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab("reports")}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition flex items-center space-x-2 cursor-pointer ${
                    activeTab === "reports"
                      ? "border-[#3390ec] text-[#3390ec]"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>User Reports & Complaints</span>
                  {pendingReportsCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[11px] flex items-center justify-center font-bold">
                      {pendingReportsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("bans")}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition flex items-center space-x-2 cursor-pointer ${
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
                  onClick={() => setActiveTab("broadcast")}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition flex items-center space-x-2 cursor-pointer ${
                    activeTab === "broadcast"
                      ? "border-[#3390ec] text-[#3390ec]"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Radio className="w-4 h-4" />
                  <span>Broadcast Studio ⚡</span>
                </button>

                <button
                  onClick={() => setActiveTab("users")}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition flex items-center space-x-2 cursor-pointer ${
                    activeTab === "users"
                      ? "border-[#3390ec] text-[#3390ec]"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Platform Users ({allUsers.length})</span>
                </button>
              </div>

              <button
                onClick={fetchReports}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition text-xs flex items-center space-x-1 cursor-pointer"
                title="Refresh database records"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingReports ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-hidden flex bg-[#17212b]">
              {/* TAB 1: REPORTS */}
              {activeTab === "reports" && (
                <div className="flex-1 flex overflow-hidden">
                  {/* Reports List */}
                  <div className="w-5/12 border-r border-[#242f3d] flex flex-col">
                    <div className="p-3 border-b border-[#242f3d] bg-[#0e1621] space-y-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={reportSearch}
                          onChange={(e) => setReportSearch(e.target.value)}
                          placeholder="Search reports by user or keyword..."
                          className="w-full bg-[#17212b] border border-[#242f3d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#3390ec]"
                        />
                      </div>

                      {/* Filter pills */}
                      <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
                        {(["all", "pending", "resolved", "dismissed"] as const).map((f) => (
                          <button
                            key={f}
                            onClick={() => setReportFilter(f)}
                            className={`px-2.5 py-1 rounded-md capitalize font-semibold transition cursor-pointer shrink-0 ${
                              reportFilter === f
                                ? "bg-[#3390ec] text-white"
                                : "bg-[#17212b] text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {f === "all" ? `All (${reports.length})` : f}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-[#242f3d]">
                      {loadingReports && reports.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs">
                          <div className="w-6 h-6 border-2 border-[#3390ec]/30 border-t-[#3390ec] rounded-full animate-spin mx-auto mb-2" />
                          Loading reports...
                        </div>
                      ) : filteredReports.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                          <ShieldCheck className="w-10 h-10 text-emerald-400/60" />
                          <div className="text-sm font-medium text-white">No Reports Matching</div>
                          <p className="text-xs max-w-xs">
                            {reports.length === 0
                              ? "There are currently no open user reports in the database."
                              : "No reports match the selected search or filter category."}
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
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                  rep.targetType === "user"
                                    ? "bg-purple-500/20 text-purple-400"
                                    : rep.targetType === "message"
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "bg-blue-500/20 text-blue-400"
                                }`}
                              >
                                {rep.targetType === "user" && <Users className="w-4 h-4" />}
                                {rep.targetType === "message" && <MessageSquare className="w-4 h-4" />}
                                {rep.targetType === "group" && <ShieldAlert className="w-4 h-4" />}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <div className="text-xs font-semibold text-white truncate">
                                    {rep.targetName || "Report Subject"}
                                  </div>
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                      rep.status === "pending"
                                        ? "bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse"
                                        : rep.status === "resolved"
                                        ? "bg-emerald-500/20 text-emerald-300"
                                        : rep.status === "dismissed"
                                        ? "bg-slate-500/20 text-slate-400"
                                        : "bg-amber-500/20 text-amber-300"
                                    }`}
                                  >
                                    {rep.status}
                                  </span>
                                </div>

                                <div className="text-xs text-red-300 font-medium mt-0.5 truncate">
                                  {rep.reason}
                                </div>

                                {rep.customExplanation && (
                                  <div className="text-xs text-slate-400 truncate italic mt-0.5">
                                    "{rep.customExplanation}"
                                  </div>
                                )}

                                <div className="text-[10px] text-slate-500 mt-1.5 flex items-center justify-between">
                                  <span>By @{rep.reporterName}</span>
                                  <span>{new Date(rep.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Report Detail & Moderation Action Panel */}
                  <div className="w-7/12 flex flex-col bg-[#17212b] overflow-y-auto p-5 space-y-4">
                    {selectedReport ? (
                      <>
                        <div className="flex items-start justify-between border-b border-[#242f3d] pb-3">
                          <div>
                            <div className="text-[11px] uppercase tracking-wider font-bold text-[#3390ec] flex items-center gap-1.5">
                              <span>Report ID: #{selectedReport.id.slice(-8)}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-300 uppercase">
                                {selectedReport.targetType}
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-white mt-1">
                              {selectedReport.targetName || "Target Subject"}
                            </h3>
                            <div className="text-xs text-slate-400">
                              Reported by <span className="text-slate-200 font-medium">@{selectedReport.reporterName}</span> on {new Date(selectedReport.createdAt).toLocaleString()}
                            </div>
                          </div>

                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleResolveReport(selectedReport.id, "resolved")}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Resolve</span>
                            </button>
                            <button
                              onClick={() => handleResolveReport(selectedReport.id, "dismissed")}
                              className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Dismiss</span>
                            </button>
                          </div>
                        </div>

                        {/* Report Information Details */}
                        <div className="bg-[#0e1621] border border-[#242f3d] rounded-xl p-3.5 space-y-2.5 text-xs">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Flagged Category:</span>
                            <div className="text-sm font-bold text-red-400">{selectedReport.reason}</div>
                          </div>

                          {selectedReport.customExplanation && (
                            <div>
                              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Reporter Explanation:</span>
                              <div className="text-xs text-slate-200 mt-1 bg-[#17212b] p-2.5 rounded-lg border border-[#242f3d] whitespace-pre-wrap">
                                "{selectedReport.customExplanation}"
                              </div>
                            </div>
                          )}

                          {selectedReport.targetDetails?.messageText && (
                            <div>
                              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Flagged Message Content:</span>
                              <div className="text-xs text-amber-200 mt-1 bg-[#17212b] p-2.5 rounded-lg border border-amber-500/30 font-mono">
                                "{selectedReport.targetDetails.messageText}"
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Direct Reply to Reporter Section */}
                        <div className="bg-[#0e1621] border border-[#3390ec]/30 rounded-xl p-3.5 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5 text-xs font-bold text-[#3390ec]">
                              <MessageCircle className="w-4 h-4" />
                              <span>Official Response to Reporter (@{selectedReport.reporterName})</span>
                            </div>
                            {replySuccess && (
                              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                                <Check className="w-3.5 h-3.5" />
                                <span>Response Sent!</span>
                              </span>
                            )}
                          </div>

                          {/* Quick Reply Presets */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Quick Templates:</span>
                            <div className="grid grid-cols-2 gap-1.5">
                              {QUICK_REPLIES.map((qr, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setReplyText(qr.text);
                                    setActionTakenText(qr.action);
                                  }}
                                  className="p-1.5 text-left bg-[#17212b] hover:bg-[#1f2c3a] border border-[#242f3d] hover:border-[#3390ec] rounded-lg text-[11px] text-slate-300 transition truncate cursor-pointer"
                                >
                                  {qr.title}
                                </button>
                              ))}
                            </div>
                          </div>

                          <form onSubmit={handleSendAdminReply} className="space-y-2">
                            <div>
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Type your official response that will be visible to the reporter in their reports dashboard..."
                                rows={3}
                                className="w-full bg-[#17212b] border border-[#242f3d] rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#3390ec] resize-none"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={actionTakenText}
                                onChange={(e) => setActionTakenText(e.target.value)}
                                placeholder="Action summary (e.g. Warning Issued, 7-Day Suspension)"
                                className="flex-1 bg-[#17212b] border border-[#242f3d] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#3390ec]"
                              />
                              <button
                                type="submit"
                                disabled={submittingReply || !replyText.trim()}
                                className="px-4 py-1.5 bg-[#3390ec] hover:bg-[#2880db] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>{submittingReply ? "Sending..." : "Send & Resolve"}</span>
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
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center space-x-1 transition disabled:opacity-50 cursor-pointer"
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
                          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
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
                                  className="p-2 rounded-xl bg-amber-600/20 border border-amber-500/40 hover:bg-amber-600/30 text-amber-300 text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
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
                                  className="p-2 rounded-xl bg-red-600/20 border border-red-500/40 hover:bg-red-600/30 text-red-300 text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Ban / Suspend</span>
                                </button>

                                <button
                                  onClick={() => handleInspectUserActivity(selectedReport.targetDetails!.userId!)}
                                  className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                                >
                                  <Users className="w-3.5 h-3.5" />
                                  <span>Inspect Profile</span>
                                </button>
                              </>
                            )}

                            {selectedReport.targetType === "message" && selectedReport.targetId && (
                              <button
                                onClick={() => handleInspectMessageContext(selectedReport.targetId)}
                                className="p-2 rounded-xl bg-[#3390ec]/20 border border-[#3390ec]/40 hover:bg-[#3390ec]/30 text-[#3390ec] text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Inspect Context</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Surrounding Context Inspector Display */}
                        {inspectedMessageContext && (
                          <div className="bg-[#0e1621] border border-cyan-500/40 rounded-xl p-3.5 space-y-2 animate-in fade-in">
                            <div className="flex items-center justify-between text-xs text-cyan-300 font-bold">
                              <span>Chat Context Inspector</span>
                              <button
                                onClick={() => setInspectedMessageContext(null)}
                                className="text-slate-400 hover:text-white"
                              >
                                Close
                              </button>
                            </div>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto divide-y divide-[#1f2c3a] text-xs">
                              {inspectedMessageContext.contextMessages.map((m) => (
                                <div
                                  key={m.id}
                                  className={`p-2 rounded ${
                                    m.id === selectedReport.targetId ? "bg-red-500/20 border border-red-500/40" : ""
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                                    <span className="font-semibold text-slate-200">{m.senderName}</span>
                                    <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
                                  </div>
                                  <div className="text-slate-200 mt-0.5">{m.text}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* User Activity Inspector Display */}
                        {inspectedUserActivity && (
                          <div className="bg-[#0e1621] border border-purple-500/40 rounded-xl p-3.5 space-y-2.5 animate-in fade-in text-xs">
                            <div className="flex items-center justify-between text-xs text-purple-300 font-bold">
                              <span>Profile Activity: @{inspectedUserActivity.user.username}</span>
                              <button
                                onClick={() => setInspectedUserActivity(null)}
                                className="text-slate-400 hover:text-white"
                              >
                                Close
                              </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="p-2 bg-[#17212b] rounded-lg border border-[#242f3d]">
                                <div className="text-sm font-bold text-white">{inspectedUserActivity.totalMessages}</div>
                                <div className="text-[10px] text-slate-400">Total Messages</div>
                              </div>
                              <div className="p-2 bg-[#17212b] rounded-lg border border-[#242f3d]">
                                <div className="text-sm font-bold text-white">{inspectedUserActivity.storiesCount}</div>
                                <div className="text-[10px] text-slate-400">Stories Posted</div>
                              </div>
                              <div className="p-2 bg-[#17212b] rounded-lg border border-[#242f3d]">
                                <div className="text-sm font-bold text-red-400">{inspectedUserActivity.reportsAgainst.length}</div>
                                <div className="text-[10px] text-slate-400">Reports Against</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 py-16">
                        <Info className="w-8 h-8 opacity-40" />
                        <span className="text-xs text-center max-w-xs">
                          Select a report from the list on the left to review details, respond to the user, and take moderation action.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: ACTIVE BANS */}
              {activeTab === "bans" && (
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">Active Sanctions & Suspended Accounts</h3>
                      <p className="text-xs text-slate-400">
                        Banned accounts cannot log in, message, or participate until their suspension expires.
                      </p>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-300 font-semibold">
                      {bannedUsers.length} Suspended Accounts
                    </span>
                  </div>

                  {bannedUsers.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 bg-[#0e1621] rounded-2xl border border-[#242f3d] flex flex-col items-center justify-center space-y-2">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                      <h4 className="text-sm font-semibold text-white">No Accounts Currently Suspended</h4>
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
                                <span>Expires: {new Date(u.bannedUntil).toLocaleString()}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => handleUnbanUser(u.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-600 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
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

              {/* TAB 3: BROADCAST STUDIO */}
              {activeTab === "broadcast" && (
                <div className="flex-1 p-8 overflow-y-auto max-w-2xl mx-auto space-y-6">
                  <div className="border-b border-[#242f3d] pb-4 flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2 text-[#3390ec] text-xs font-bold uppercase tracking-wider">
                        <Radio className="w-4 h-4" />
                        <span>MK Official Broadcast Engine ⚡</span>
                      </div>
                      <h3 className="text-xl font-bold text-white mt-1">Push Broadcast to All Users</h3>
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
                        className="px-3.5 py-2 rounded-xl bg-[#3390ec]/20 border border-[#3390ec]/40 hover:bg-[#3390ec]/30 text-[#3390ec] text-xs font-semibold flex items-center space-x-1.5 transition shrink-0 cursor-pointer"
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
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
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
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
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

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-400 font-medium">Priority:</span>
                        {(["normal", "high", "urgent"] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setBroadcastPriority(p)}
                            className={`text-xs px-3 py-1 rounded-lg font-semibold uppercase transition cursor-pointer ${
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
                        className="px-6 py-2.5 rounded-xl bg-[#3390ec] hover:bg-[#2880db] text-white font-semibold text-sm flex items-center space-x-2 shadow-lg shadow-[#3390ec]/30 transition disabled:opacity-50 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>{actionLoading ? "Pushing..." : "Push Broadcast ⚡"}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 4: USERS DIRECTORY */}
              {activeTab === "users" && (
                <div className="flex-1 p-6 overflow-hidden flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
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
                        <div key={u.id} className="p-3.5 flex items-center justify-between hover:bg-[#17212b] transition">
                          <div className="flex items-center space-x-3">
                            <img src={u.avatar} alt={u.username} className="w-9 h-9 rounded-full object-cover" />
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-semibold text-white">{u.username}</span>
                                {u.role === "admin" && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase">
                                    Admin
                                  </span>
                                )}
                                {u.isBanned && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-bold uppercase">
                                    Banned
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400">{u.email}</div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {u.role !== "admin" && (
                              <>
                                <button
                                  onClick={() => setWarningUser({ id: u.id, name: u.username })}
                                  className="px-3 py-1 rounded-lg bg-amber-600/20 text-amber-300 text-xs font-semibold hover:bg-amber-600 hover:text-white transition cursor-pointer"
                                >
                                  Warn
                                </button>
                                {u.isBanned ? (
                                  <button
                                    onClick={() => handleUnbanUser(u.id)}
                                    className="px-3 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-600 hover:text-white transition cursor-pointer"
                                  >
                                    Unban
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setBanningUser({ id: u.id, name: u.username })}
                                    className="px-3 py-1 rounded-lg bg-red-600/20 text-red-400 text-xs font-semibold hover:bg-red-600 hover:text-white transition cursor-pointer"
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
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
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
                      className={`p-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                        banDuration === d.id
                          ? "bg-red-600 border-red-500 text-white"
                          : "bg-[#0e1621] border-[#242f3d] text-slate-300 hover:bg-[#1f2c3a]"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
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
