import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { dashboardApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { SeverityBadge } from "../../components/trust/SeverityBadge";
import {
  ShieldCheck,
  FileSearch,
  Bot,
  MailWarning,
  CreditCard,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  Activity
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";

export const DashboardPage: React.FC = () => {
  const { user, role } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => dashboardApi.getStats(),
    refetchInterval: 15000 // auto-refresh every 15s
  });

  const kpis = data?.kpis || {
    scans_today: 0,
    sensitive_items_detected: 0,
    items_blocked: 0,
    phishing_caught: 0,
    fraud_flags: 0,
    open_incidents: 0,
    mean_time_to_resolve_hours: 1.4
  };

  const severityData = [
    { name: "Critical", value: data?.charts?.severity_breakdown?.critical || 0, color: "#EF4444" },
    { name: "High", value: data?.charts?.severity_breakdown?.high || 0, color: "#F97316" },
    { name: "Medium", value: data?.charts?.severity_breakdown?.medium || 0, color: "#F59E0B" },
    { name: "Low", value: data?.charts?.severity_breakdown?.low || 0, color: "#10B981" }
  ].filter(d => d.value > 0);

  const dataTypeData = data?.charts?.data_type_breakdown || [];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Executive Trust & Security Command
            </h1>
            <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Defense Active
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Logged in as <strong className="text-slate-800 dark:text-slate-200">{user?.full_name}</strong> ({role}) at{" "}
            <strong className="text-brand-600">{user?.organization?.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/scanner"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <FileSearch className="h-4 w-4" />
            <span>Run New Scan</span>
          </Link>
          <Link
            to="/gateway"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 transition-all"
          >
            <Bot className="h-4 w-4 text-indigo-500" />
            <span>Secure Chat</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Scans Today</span>
            <FileSearch className="h-4 w-4 text-brand-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{kpis.scans_today}</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Sensitive Items</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{kpis.sensitive_items_detected}</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Blocked Prompts</span>
            <Bot className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{kpis.items_blocked}</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Phishing Caught</span>
            <MailWarning className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{kpis.phishing_caught}</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Fraud Flags</span>
            <CreditCard className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{kpis.fraud_flags}</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Open Incidents</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{kpis.open_incidents}</p>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Top Sensitive Data Types */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Detected Data Types Breakdown
              </h2>
            </div>
            <span className="text-xs text-slate-400">High frequency risk categories</span>
          </div>

          <div className="h-64 w-full">
            {dataTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataTypeData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis
                    dataKey="data_type"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F172A", borderColor: "#1E293B", borderRadius: "8px", color: "#F8FAFC", fontSize: "12px" }}
                  />
                  <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400 italic">
                No sensitive findings recorded yet. Run a scan to view data type metrics.
              </div>
            )}
          </div>
        </div>

        {/* Right: Threat Severity Distribution */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-brand-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Threat Severity Ratio</h2>
          </div>

          <div className="h-44 flex items-center justify-center">
            {severityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F172A", borderColor: "#1E293B", borderRadius: "8px", color: "#F8FAFC", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400 italic">No severity data available</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-600 dark:text-slate-400">Critical ({data?.charts?.severity_breakdown?.critical || 0})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
              <span className="text-slate-600 dark:text-slate-400">High ({data?.charts?.severity_breakdown?.high || 0})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-600 dark:text-slate-400">Medium ({data?.charts?.severity_breakdown?.medium || 0})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-400">Low ({data?.charts?.severity_breakdown?.low || 0})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Tables: Recent Incidents & High-Risk Detections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Incidents */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" /> Active SOC Incidents
            </h2>
            <Link to="/incidents" className="text-xs font-semibold text-brand-600 hover:text-brand-500 flex items-center gap-1">
              <span>View all</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {data?.recent_incidents && data.recent_incidents.length > 0 ? (
              data.recent_incidents.map((inc: any) => (
                <Link
                  key={inc.id}
                  to={`/incidents/${inc.id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{inc.title}</p>
                    <span className="text-[11px] text-slate-400 capitalize">Source: {inc.source_type?.replace(/_/g, " ")} • {new Date(inc.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <SeverityBadge severity={inc.severity} size="sm" />
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {inc.status}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic py-4 text-center">No active incidents</p>
            )}
          </div>
        </div>

        {/* Recent High-Risk Detections */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-500" /> Recent Critical Findings
            </h2>
            <Link to="/detections" className="text-xs font-semibold text-brand-600 hover:text-brand-500 flex items-center gap-1">
              <span>View all</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {data?.recent_detections && data.recent_detections.length > 0 ? (
              data.recent_detections.map((det: any) => (
                <Link
                  key={det.id}
                  to={`/detections/${det.id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white capitalize">{det.data_type?.replace(/_/g, " ")}</span>
                      <span className="font-mono text-[11px] text-slate-500 truncate max-w-[150px]">{det.masked_value}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5 truncate">{det.recommended_action}</span>
                  </div>
                  <SeverityBadge severity={det.severity} size="sm" />
                </Link>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic py-4 text-center">No critical findings recorded</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
