import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { scannerApi } from "../../api/endpoints";
import { SeverityBadge } from "../../components/trust/SeverityBadge";
import { DetectorChip } from "../../components/trust/DetectorChip";
import {
  ShieldAlert,
  Filter,
  Eye,
  ArrowRight,
  Database,
  Search,
  CheckCircle2
} from "lucide-react";

export const DetectionsPage: React.FC = () => {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [detectorFilter, setDetectorFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["detectionsList", severityFilter, detectorFilter],
    queryFn: () =>
      scannerApi.getDetections({
        severity: severityFilter === "all" ? undefined : severityFilter,
        detector: detectorFilter === "all" ? undefined : detectorFilter
      })
  });

  const detections = (data as any)?.detections || (data as any)?.data || (Array.isArray(data) ? data : []);
  const filtered = detections.filter((d: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (d.data_type && d.data_type.toLowerCase().includes(term)) ||
      (d.detector && d.detector.toLowerCase().includes(term)) ||
      (d.value_masked && d.value_masked.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Database className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Detection Registry & Signal Log
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Immutable log of all sensitive entities, prompt anomalies, and secrets intercepted across all endpoints.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search findings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={detectorFilter}
            onChange={(e) => setDetectorFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Detectors</option>
            <option value="regex">Regex</option>
            <option value="checksum">Checksum (Luhn/Verhoeff)</option>
            <option value="ml">Neural / ML</option>
            <option value="composite">Composite Heuristics</option>
          </select>
        </div>
      </div>

      {/* Detections Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Entity Type</th>
                <th className="px-6 py-3.5">Severity</th>
                <th className="px-6 py-3.5">Detector</th>
                <th className="px-6 py-3.5">Confidence</th>
                <th className="px-6 py-3.5">Masked Snippet</th>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-mono">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                    Loading detection logs...
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                    No detections match current filter parameters.
                  </td>
                </tr>
              )}
              {filtered.map((det: any) => (
                <tr
                  key={det.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition"
                >
                  <td className="px-6 py-4 font-sans font-bold text-slate-900 dark:text-white">
                    {det.data_type}
                  </td>
                  <td className="px-6 py-4 font-sans">
                    <SeverityBadge severity={det.severity} />
                  </td>
                  <td className="px-6 py-4 font-sans">
                    <DetectorChip detector={det.detector} />
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                    {Math.round((det.confidence_score || 0.95) * 100)}%
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-800 dark:text-slate-200">
                      {det.value_masked || "••••••••"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-sans">
                    {new Date(det.created_at).toLocaleDateString()} {new Date(det.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 text-right font-sans">
                    <Link
                      to={`/detections/${det.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-semibold text-xs transition"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Inspect
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
