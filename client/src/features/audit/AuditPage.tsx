import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { auditApi } from "../../api/endpoints";
import {
  ShieldCheck,
  Link as LinkIcon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Terminal,
  Filter,
  Eye,
  Lock,
  Layers,
  FileCheck
} from "lucide-react";

export const AuditPage: React.FC = () => {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const { data: logsData, isLoading: loadingLogs, refetch } = useQuery({
    queryKey: ["auditLogs", actionFilter],
    queryFn: () =>
      auditApi.listLogs({
        action: actionFilter === "all" ? undefined : actionFilter,
        limit: 100
      })
  });

  const verifyMutation = useMutation({
    mutationFn: () => auditApi.verifyIntegrity()
  });

  const entries = (logsData as any)?.logs || (logsData as any)?.data || (Array.isArray(logsData) ? logsData : []);
  const verifyResult = (verifyMutation.data as any)?.data || verifyMutation.data;

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Lock className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Tamper-Evident Cryptographic Audit Log
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Every state mutation, AI perimeter decision, and analyst action is appended to a strictly ordered SHA-256 hash chain.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => verifyMutation.mutate()}
            disabled={verifyMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm disabled:opacity-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${verifyMutation.isPending ? "animate-spin" : ""}`} />
            {verifyMutation.isPending ? "Validating Hashes..." : "Verify Chain Integrity"}
          </button>
        </div>
      </div>

      {/* Verification Status Banner */}
      {verifyResult && (
        <div
          className={`p-5 rounded-2xl border flex items-start justify-between gap-4 animate-fadeIn ${
            verifyResult.is_valid
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200"
          }`}
        >
          <div className="flex items-start gap-3">
            {verifyResult.is_valid ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <h4 className="text-sm font-bold">
                {verifyResult.is_valid
                  ? "Cryptographic Hash Chain Verified (100% Intact)"
                  : "Hash Chain Verification Failed — Tampering Detected!"}
              </h4>
              <p className="text-xs opacity-90 leading-relaxed font-sans">
                {verifyResult.is_valid
                  ? `All ${verifyResult.verified_count || entries.length} sequential blocks successfully verified against canonical SHA-256 precursors. Genesis block root confirmed.`
                  : `Integrity broken at block #${verifyResult.broken_at_index}. Expected hash ${verifyResult.expected_hash?.slice(0, 16)}... does not match recorded hash.`}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono uppercase font-bold px-2.5 py-1 rounded-lg bg-white/70 dark:bg-slate-900/60 shadow-xs">
            {verifyResult.is_valid ? "VALIDATED" : "COMPROMISED"}
          </span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Actions</option>
            <option value="scan.text">scan.text</option>
            <option value="scan.file">scan.file</option>
            <option value="gateway.message">gateway.message</option>
            <option value="phishing.analyze">phishing.analyze</option>
            <option value="fraud.score">fraud.score</option>
            <option value="incident.create">incident.create</option>
            <option value="policy.update">policy.update</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          Showing {entries.length} chained entries
        </span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Seq #</th>
                <th className="px-6 py-3.5">Action</th>
                <th className="px-6 py-3.5">Actor</th>
                <th className="px-6 py-3.5">Entry Hash (SHA-256)</th>
                <th className="px-6 py-3.5">Prev Hash</th>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-mono">
              {loadingLogs && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                    Loading cryptographic ledger...
                  </td>
                </tr>
              )}
              {!loadingLogs && entries.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                    No audit records logged yet.
                  </td>
                </tr>
              )}
              {entries.map((log: any, idx: number) => {
                const seq = entries.length - idx;
                const isGenesis = !log.prev_hash || log.prev_hash === "0".repeat(64);

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition"
                  >
                    <td className="px-6 py-4 font-bold text-slate-400">
                      #{seq}
                    </td>
                    <td className="px-6 py-4 font-sans font-bold text-indigo-600 dark:text-indigo-400">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 font-sans text-slate-700 dark:text-slate-300">
                      {log.user?.full_name || log.user?.email || "System Perimeter"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-800 dark:text-slate-200">
                          {log.entry_hash ? log.entry_hash.slice(0, 16) : "••••"}...
                        </span>
                        <button
                          onClick={() => handleCopy(log.entry_hash)}
                          className="text-slate-400 hover:text-indigo-600"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isGenesis ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          Genesis Root
                        </span>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-400">
                          <LinkIcon className="h-3 w-3 text-indigo-400" />
                          <span>{log.prev_hash.slice(0, 10)}...</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-sans text-slate-400">
                      {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-right font-sans">
                      <button
                        onClick={() => setSelectedEntry(log)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Audit Block #{selectedEntry.id.slice(0, 8)} Canonical Payload
                </h3>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div>
                <span className="text-slate-400 block mb-1">Full SHA-256 Signature:</span>
                <span className="p-2 bg-slate-100 dark:bg-slate-950 rounded-lg text-indigo-600 dark:text-indigo-400 block break-all">
                  {selectedEntry.entry_hash}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Preceding Hash Link:</span>
                <span className="p-2 bg-slate-100 dark:bg-slate-950 rounded-lg text-slate-700 dark:text-slate-300 block break-all">
                  {selectedEntry.prev_hash || "GENESIS_ROOT"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Raw Context Metadata:</span>
                <pre className="p-3 bg-slate-100 dark:bg-slate-950 rounded-lg text-slate-700 dark:text-slate-300 overflow-x-auto max-h-56">
                  {JSON.stringify(selectedEntry.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
