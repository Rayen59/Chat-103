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
  Filter
} from "lucide-react";

interface AdminPanelModalProps {
  currentUser: User;
  allUsers: User[];
  onClose: () => void;
  onOpenMKChannel?: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  currentUser,
  allUsers,
  onClose,
  onOpenMKChannel
}) => {
  const [activeTab, setActiveTab] = useState<"reports" | "bans" | "broadcast" | "users">("reports");
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [analyzingReportId, setAnalyzingReportId] = useState<string | null>(null);

  // Moderation / Ban dialog
  const [banningUser, setBanningUser] = useState<{ id: string; name: string } | null>(null);
  const [banDuration, setBanDuration] = useState<"3_days" | "7_days" | "10_days" | "30_days" | "permanent">("3_days");
  const [banReason, setBanReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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
      const res = await fetch(`/api/admin/reports?adminId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error("Failed to fetch admin reports:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [currentUser.id]);

  const handleRunAiAnalysis = async (reportId: string) => {
    setAnalyzingReportId(reportId);
    try {
      const res = await fetch("/api/admin/ai-analyze-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: currentUser.id, reportId })
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
        body: JSON.stringify({ adminId: currentUser.id, reportId, status })
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

  const handleExecuteBan = async () => {
    if (!banningUser) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/users/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: currentUser.id,
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

  const handleUnbanUser = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/users/unban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: currentUser.id, targetUserId: userId })
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
      const res = await fetch(`/api/admin/messages/context/${messageId}?adminId=${currentUser.id}`);
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
      const res = await fetch(`/api/admin/users/${userId}/activity?adminId=${currentUser.id}`);
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
          adminId: currentUser.id,
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
                  MK Wavegram • Admin Control Panel 👑
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold uppercase tracking-wider">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Connected as <span className="text-white font-medium">{currentUser.email}</span> (Master Moderation Suite)
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
                className="px-3.5 py-1.5 rounded-xl bg-[#3390ec]/15 border border-[#3390ec]/30 text-[#3390ec] hover:bg-[#3390ec]/25 text-xs font-medium flex items-center space-x-1.5 transition"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Open MK Channel ⚡</span>
              </button>
            )}
            <button
              id="admin-close-btn"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-[#242f3d] bg-[#1f2c3a] flex items-center justify-between">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab("reports")}
              className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition flex items-center space-x-2 ${
                activeTab === "reports"
                  ? "border-[#3390ec] text-[#3390ec]"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Signalements / Reports</span>
              {pendingReportsCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[11px] flex items-center justify-center font-bold">
                  {pendingReportsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("bans")}
              className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition flex items-center space-x-2 ${
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
              className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition flex items-center space-x-2 ${
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
              className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition flex items-center space-x-2 ${
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition text-xs flex items-center space-x-1"
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
              <div className="w-1/2 border-r border-[#242f3d] flex flex-col">
                <div className="p-3 border-b border-[#242f3d] bg-[#0e1621] flex items-center justify-between text-xs text-slate-400">
                  <span>Total Signals: {reports.length}</span>
                  <span>Pending Action: {pendingReportsCount}</span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-[#242f3d]">
                  {reports.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                      <ShieldCheck className="w-10 h-10 text-emerald-400/60" />
                      <div className="text-sm font-medium text-white">No Reports Active</div>
                      <p className="text-xs max-w-xs">All user signals and reports have been reviewed or dismissed.</p>
                    </div>
                  ) : (
                    reports.map((rep) => {
                      const isSelected = selectedReport?.id === rep.id;
                      return (
                        <div
                          key={rep.id}
                          onClick={() => setSelectedReport(rep)}
                          className={`p-4 cursor-pointer transition flex items-start space-x-3 ${
                            isSelected
                              ? "bg-[#3390ec]/15 border-l-4 border-[#3390ec]"
                              : "hover:bg-[#1f2c3a]"
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
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
                                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                    : "bg-emerald-500/20 text-emerald-300"
                                }`}
                              >
                                {rep.status}
                              </span>
                            </div>

                            <div className="text-xs text-red-300 font-medium mt-0.5">
                              {rep.reason}
                            </div>

                            {rep.customExplanation && (
                              <div className="text-xs text-slate-400 truncate italic mt-0.5">
                                "{rep.customExplanation}"
                              </div>
                            )}

                            <div className="text-[10px] text-slate-500 mt-2 flex items-center justify-between">
                              <span>By @{rep.reporterName}</span>
                              <span>{new Date(rep.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Report Detail & Action Panel */}
              <div className="w-1/2 flex flex-col bg-[#17212b] overflow-y-auto p-6 space-y-5">
                {selectedReport ? (
                  <>
                    <div className="flex items-start justify-between border-b border-[#242f3d] pb-4">
                      <div>
                        <div className="text-xs uppercase tracking-wider font-semibold text-[#3390ec]">
                          Report ID: {selectedReport.id}
                        </div>
                        <h3 className="text-lg font-bold text-white mt-1">
                          {selectedReport.targetName || "Target Subject"}
                        </h3>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Reported on {new Date(selectedReport.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleResolveReport(selectedReport.id, "resolved")}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1 transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Resolve</span>
                        </button>
                        <button
                          onClick={() => handleResolveReport(selectedReport.id, "dismissed")}
                          className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold flex items-center space-x-1 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Dismiss</span>
                        </button>
                      </div>
                    </div>

                    {/* Report Information Details */}
                    <div className="bg-[#0e1621] border border-[#242f3d] rounded-xl p-4 space-y-3">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Flagged Category:</span>
                        <div className="text-sm font-bold text-red-400">{selectedReport.reason}</div>
                      </div>

                      {selectedReport.customExplanation && (
                        <div>
                          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Handwritten / Custom Note:</span>
                          <div className="text-sm text-slate-200 mt-1 bg-[#17212b] p-3 rounded-lg border border-[#242f3d] whitespace-pre-wrap">
                            {selectedReport.customExplanation}
                          </div>
                        </div>
                      )}

                      {selectedReport.targetDetails?.messageText && (
                        <div>
                          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Reported Message Snippet:</span>
                          <div className="text-sm text-slate-200 mt-1 bg-[#17212b] p-3 rounded-lg border border-amber-500/30 text-amber-200 font-mono text-xs">
                            "{selectedReport.targetDetails.messageText}"
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Gemini AI Moderation Engine */}
                    <div className="bg-gradient-to-br from-[#1e1b4b]/60 to-[#0e1621] border border-indigo-500/30 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                          <Sparkles className="w-4 h-4 text-indigo-400" />
                          <span>Gemini AI Moderation Assistant</span>
                        </div>
                        <button
                          onClick={() => handleRunAiAnalysis(selectedReport.id)}
                          disabled={analyzingReportId === selectedReport.id}
                          className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{analyzingReportId === selectedReport.id ? "Analyzing..." : "Run AI Assessment"}</span>
                        </button>
                      </div>

                      {selectedReport.aiAnalysis ? (
                        <div className="space-y-2.5 pt-1 text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-400">Severity Assessment:</span>
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
                            <span className="text-slate-400 font-mono">
                              ({selectedReport.aiAnalysis.confidenceScore || 88}% Confidence)
                            </span>
                          </div>

                          <p className="text-slate-200 leading-relaxed bg-[#0e1621]/80 p-2.5 rounded-lg border border-indigo-500/20">
                            {selectedReport.aiAnalysis.summary}
                          </p>

                          <div className="flex items-center space-x-2 text-indigo-200">
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

                    {/* Quick Investigation & Moderation Actions */}
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Admin Sanctions & Tools
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {selectedReport.targetDetails?.userId && (
                          <button
                            onClick={() => {
                              setBanningUser({
                                id: selectedReport.targetDetails!.userId!,
                                name: selectedReport.targetDetails?.username || "User"
                              });
                            }}
                            className="p-2.5 rounded-xl bg-red-600/20 border border-red-500/40 hover:bg-red-600/30 text-red-300 text-xs font-semibold flex items-center justify-center space-x-2 transition"
                          >
                            <Ban className="w-4 h-4" />
                            <span>Ban Target User</span>
                          </button>
                        )}

                        {selectedReport.targetType === "message" && selectedReport.targetId && (
                          <button
                            onClick={() => handleInspectMessageContext(selectedReport.targetId)}
                            className="p-2.5 rounded-xl bg-[#3390ec]/20 border border-[#3390ec]/40 hover:bg-[#3390ec]/30 text-[#3390ec] text-xs font-semibold flex items-center justify-center space-x-2 transition"
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span>Inspect Context</span>
                          </button>
                        )}

                        {selectedReport.targetDetails?.userId && (
                          <button
                            onClick={() => handleInspectUserActivity(selectedReport.targetDetails!.userId!)}
                            className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold flex items-center justify-center space-x-2 transition"
                          >
                            <Users className="w-4 h-4" />
                            <span>Inspect Profile Activity</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Surrounding Context Inspector Display */}
                    {inspectedMessageContext && (
                      <div className="bg-[#0e1621] border border-cyan-500/40 rounded-xl p-4 space-y-2 animate-in fade-in">
                        <div className="flex items-center justify-between text-xs text-cyan-300 font-bold">
                          <span>Chat Room Context Inspector</span>
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
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                    <Info className="w-8 h-8 opacity-40" />
                    <span className="text-xs">Select a report from the list on the left to review details and take moderation action.</span>
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
                    Banned users cannot log in, send messages, or create stories until their suspension expires.
                  </p>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-300 font-semibold">
                  {bannedUsers.length} Banned
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
                          {u.banReason || "Violation of terms"}
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
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-600 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Unban User / Débannir</span>
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
              <div className="border-b border-[#242f3d] pb-4">
                <div className="flex items-center space-x-2 text-[#3390ec] text-xs font-bold uppercase tracking-wider">
                  <Radio className="w-4 h-4" />
                  <span>MK Official Broadcast Engine ⚡</span>
                </div>
                <h3 className="text-xl font-bold text-white mt-1">Push Broadcast to All Users</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Send real-time alerts or platform notices to all users via the pinned MK Official Channel.
                </p>
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
                        className={`text-xs px-3 py-1 rounded-lg font-semibold uppercase transition ${
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
                    className="px-6 py-2.5 rounded-xl bg-[#3390ec] hover:bg-[#2880db] text-white font-semibold text-sm flex items-center space-x-2 shadow-lg shadow-[#3390ec]/30 transition disabled:opacity-50"
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
                            {u.isBanned ? (
                              <button
                                onClick={() => handleUnbanUser(u.id)}
                                className="px-3 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-600 hover:text-white transition"
                              >
                                Unban
                              </button>
                            ) : (
                              <button
                                onClick={() => setBanningUser({ id: u.id, name: u.username })}
                                className="px-3 py-1 rounded-lg bg-red-600/20 text-red-400 text-xs font-semibold hover:bg-red-600 hover:text-white transition"
                              >
                                Ban Account
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

        {/* Ban Duration Dialog Modal */}
        {banningUser && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
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
                      className={`p-2 rounded-xl text-xs font-semibold border transition ${
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
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBan}
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition"
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
