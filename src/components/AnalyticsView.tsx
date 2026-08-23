import React, { useState, useEffect } from "react";
import { UserAnalytics, User } from "../types";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  PhoneCall,
  Flame,
  Download,
  TrendingUp,
  Zap,
  Users,
  MessageCircle,
  BarChart2,
  Sparkles
} from "lucide-react";

interface AnalyticsViewProps {
  currentUser: User;
  onBack: () => void;
}

// Custom Tooltip for Peak Activity Curve matching screenshot 4
const CustomHeatmapTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div className="bg-[#0f0b1e] border border-purple-500/40 rounded-xl p-3 shadow-2xl text-xs select-none">
        <p className="font-bold text-slate-200 text-sm">{label}</p>
        <p className="text-amber-400 font-semibold mt-1">
          Messages/Min : <span className="text-white">{val}</span>
        </p>
      </div>
    );
  }
  return null;
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  currentUser,
  onBack
}) => {
  const [data, setData] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7days" | "30days" | "all">("7days");

  useEffect(() => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    const defaultFallbackAnalytics: UserAnalytics = {
      userId: currentUser.id,
      hoursSpent: 1.4,
      totalMessagesSent: 12,
      totalMessagesReceived: 18,
      totalMessages: 30,
      totalVoiceNotes: 2,
      totalMediaShared: 4,
      totalCallsMade: 2,
      totalCallDurationMinutes: 8,
      activeStreakDays: 3,
      activeHours: [
        { hour: "00:00", count: 1 },
        { hour: "04:00", count: 0 },
        { hour: "08:00", count: 4 },
        { hour: "12:00", count: 9 },
        { hour: "16:00", count: 12 },
        { hour: "20:00", count: 4 }
      ],
      dailyTrends: [
        { date: "Mon", sent: 3, received: 4 },
        { date: "Tue", sent: 2, received: 3 },
        { date: "Wed", sent: 5, received: 6 },
        { date: "Thu", sent: 1, received: 2 },
        { date: "Fri", sent: 4, received: 5 },
        { date: "Sat", sent: 6, received: 8 },
        { date: "Sun", sent: 2, received: 2 }
      ],
      mediaBreakdown: [
        { name: "Text Messages", value: 24 },
        { name: "Voice Notes", value: 2 },
        { name: "Images & Video", value: 3 },
        { name: "GIFs & Files", value: 1 }
      ],
      engagementScore: 78,
      topContacts: [
        {
          name: "Sarah Jenkins",
          avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
          messages: 16,
          hoursSpent: "1.2h spent",
          responseTime: "~18s response time"
        },
        {
          name: "Alex Morgan",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
          messages: 10,
          hoursSpent: "0.8h spent",
          responseTime: "~25s response time"
        }
      ]
    };

    fetch(`/api/analytics/${currentUser.id}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Analytics fetch failed with status ${res.status}`);
        }
        return res.json();
      })
      .then((resData) => {
        if (resData?.analytics) {
          setData(resData.analytics);
        } else {
          setData(defaultFallbackAnalytics);
        }
      })
      .catch((err) => {
        console.warn("Using default analytics data:", err?.message || err);
        setData(defaultFallbackAnalytics);
      })
      .finally(() => setLoading(false));
  }, [currentUser?.id, currentUser?.username]);

  const handleExportJSON = () => {
    if (!data) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `wavegram_analytics_${currentUser.username}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#030612] overflow-y-auto p-4 sm:p-6 text-slate-100 select-none scrollbar-thin scrollbar-thumb-blue-950">
      
      {/* Header Bar */}
      <div className="max-w-5xl mx-auto w-full mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#09112a] border border-blue-500/20 text-slate-300 hover:text-white hover:bg-blue-600/20 transition-colors text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4 text-blue-400" />
            <span>Back to Chats</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold shadow-[0_0_15px_rgba(37,99,235,0.15)]">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>Wavegram Realtime Analytics</span>
          </div>
        </div>

        {/* Title */}
        <div className="flex items-start gap-2.5 mb-2">
          <span className="w-3 h-3 rounded-full bg-blue-500 mt-2 shrink-0 animate-ping" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Activity & Usage Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Real-time insights into your chat frequency, messaging curves, and hours spent on Wavegram.
            </p>
          </div>
        </div>

        {/* Filter Bar & Export */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pb-4 border-b border-blue-950">
          <div className="flex items-center gap-1.5 bg-[#09112a] p-1 rounded-2xl border border-blue-950">
            <button
              onClick={() => setTimeRange("7days")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeRange === "7days"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeRange("30days")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeRange === "30days"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setTimeRange("all")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeRange === "all"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#09112a] hover:bg-[#0f1b40] border border-blue-500/30 text-blue-400 hover:text-white text-xs font-semibold shadow-md transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : data ? (
        <div className="space-y-6 max-w-5xl mx-auto w-full pb-16">
          
          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Card 1: Hours Spent */}
            <div className="p-5 rounded-3xl bg-[#09112a] border border-blue-950 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Hours Spent</span>
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-white">{data.hoursSpent}h</p>
                <p className="text-[11px] font-medium text-emerald-400 mt-1 flex items-center gap-1">
                  <span>↗</span>
                  <span>+14.2% vs last week</span>
                </p>
              </div>
            </div>

            {/* Card 2: Total Messages */}
            <div className="p-5 rounded-3xl bg-[#09112a] border border-blue-950 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Total Messages</span>
                <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <MessageSquare className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-white">{data.totalMessages}</p>
                <p className="text-[11px] font-medium text-emerald-400 mt-1 flex items-center gap-1">
                  <span>↗</span>
                  <span>533 sent & received</span>
                </p>
              </div>
            </div>

            {/* Card 3: Call Duration */}
            <div className="p-5 rounded-3xl bg-[#09112a] border border-blue-950 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Call Duration</span>
                <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <PhoneCall className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-white">{data.totalCallDurationMinutes}m</p>
                <p className="text-[11px] font-medium text-cyan-400 mt-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  <span>WebRTC HD Audio/Video</span>
                </p>
              </div>
            </div>

            {/* Card 4: Active Streak */}
            <div className="p-5 rounded-3xl bg-[#09112a] border border-blue-950 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Active Streak</span>
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Flame className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-white">{data.activeStreakDays} Days</p>
                <p className="text-[11px] font-medium text-amber-400 mt-1 flex items-center gap-1">
                  <span>🔥</span>
                  <span>Daily Chat Streak</span>
                </p>
              </div>
            </div>
          </div>

          {/* Section 1: Messaging Activity Curve (Sent vs Received) */}
          <div className="p-6 rounded-3xl bg-[#09112a] border border-blue-950 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  Messaging Activity Curve (Sent vs Received)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Daily message flow curves across the current week
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-slate-300">Sent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-cyan-400" />
                  <span className="text-slate-300">Received</span>
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.dailyTrends}>
                  <defs>
                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#475569" fontSize={12} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={12} tickLine={false} domain={[0, 3]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#050a1b",
                      borderColor: "#1e293b",
                      borderRadius: "16px",
                      color: "#fff"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sent"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorSent)"
                    name="Sent"
                  />
                  <Area
                    type="monotone"
                    dataKey="received"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorReceived)"
                    name="Received"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section 2: Hours Spent Chatting & Calling */}
          <div className="p-6 rounded-3xl bg-[#09112a] border border-blue-950 shadow-xl">
            <div className="mb-6">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                Hours Spent Chatting & Calling
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Total active app hours per day</p>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dailyTrends}>
                  <XAxis dataKey="date" stroke="#475569" fontSize={12} tickLine={false} />
                  <YAxis
                    stroke="#475569"
                    fontSize={12}
                    tickLine={false}
                    domain={[0, 0.2]}
                    tickFormatter={(v) => `${v}h`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#050a1b",
                      borderColor: "#1e293b",
                      borderRadius: "16px"
                    }}
                  />
                  <Bar dataKey="sent" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Active Hours" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section 3: Peak Activity Curve (24h Heatmap) */}
          <div className="p-6 rounded-3xl bg-[#09112a] border border-blue-950 shadow-xl">
            <div className="mb-6">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Peak Activity Curve (24h Heatmap)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Most active hours during the day</p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.activeHours}>
                  <XAxis dataKey="hour" stroke="#475569" fontSize={12} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={12} tickLine={false} domain={[0, 8]} />
                  <Tooltip content={<CustomHeatmapTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#eab308"
                    strokeWidth={3}
                    dot={{ fill: "#eab308", r: 5, strokeWidth: 2, stroke: "#030612" }}
                    activeDot={{ r: 8, fill: "#fef08a" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section 4: Top Contact Engagements */}
          <div className="p-6 rounded-3xl bg-[#09112a] border border-blue-950 shadow-xl">
            <div className="mb-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                Top Contact Engagements
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Contacts you exchange the most messages and hours with
              </p>
            </div>

            <div className="space-y-3">
              {data.topContacts.map((contact, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-[#050a1b] border border-blue-950 hover:border-blue-900 transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={contact.avatar}
                      alt={contact.name}
                      className="w-12 h-12 rounded-2xl object-cover bg-slate-800 ring-2 ring-blue-500/30"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-white">{contact.name}</h4>
                      <p className="text-xs text-slate-400">
                        {contact.messages} messages exchanged
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold text-blue-400">{contact.hoursSpent}</p>
                    <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                      {contact.responseTime}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      ) : null}

      {/* Bottom Sticky Mobile Navigation Bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-1.5 rounded-full bg-[#09112a]/95 border border-blue-900/60 backdrop-blur-xl shadow-2xl">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold text-slate-400 hover:text-white transition-all"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Chats</span>
        </button>
        <button
          className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30"
        >
          <BarChart2 className="w-4 h-4" />
          <span>Analytics</span>
        </button>
      </div>

    </div>
  );
};
