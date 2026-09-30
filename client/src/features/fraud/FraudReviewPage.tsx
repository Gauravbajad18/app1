import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fraudApi } from "../../api/endpoints";
import { SeverityBadge } from "../../components/trust/SeverityBadge";
import { RiskScoreGauge } from "../../components/trust/RiskScoreGauge";
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  X,
  CreditCard,
  Clock,
  ShieldAlert,
  FileText
} from "lucide-react";

export const FraudReviewPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [analystNotes, setAnalystNotes] = useState("");
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected" | "escalated">("approved");

  const { data, isLoading } = useQuery({
    queryKey: ["fraudTransactions", statusFilter],
    queryFn: () =>
      fraudApi.listTransactions({
        review_status: statusFilter === "all" ? undefined : statusFilter
      })
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fraudApi.reviewTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fraudTransactions"] });
      setSelectedTx(null);
      setAnalystNotes("");
    }
  });

  const transactions = data?.transactions || data?.data || (Array.isArray(data) ? data : []);

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx || !analystNotes.trim()) return;
    reviewMutation.mutate({
      id: selectedTx.id,
      data: {
        review_status: reviewAction,
        analyst_notes: analystNotes.trim()
      }
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <UserCheck className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Fraud Analyst Review Queue
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manual triage queue for high-risk and anomalous financial transactions requiring human-in-the-loop disposition.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="escalated">Escalated Tier 2</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Transaction ID</th>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Risk Score</th>
                <th className="px-6 py-3.5">Risk Level</th>
                <th className="px-6 py-3.5">Review Status</th>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-mono">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-sans">
                    Loading analyst review queue...
                  </td>
                </tr>
              )}
              {!isLoading && transactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-sans">
                    No transactions match current filters.
                  </td>
                </tr>
              )}
              {transactions.map((tx: any) => (
                <tr
                  key={tx.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition cursor-pointer"
                  onClick={() => setSelectedTx(tx)}
                >
                  <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">
                    {tx.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 font-sans text-slate-800 dark:text-slate-200">
                    {tx.user_id}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                    {tx.currency} {Number(tx.amount).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-bold">
                    <span className={tx.risk_score >= 70 ? "text-rose-600" : tx.risk_score >= 40 ? "text-amber-500" : "text-emerald-500"}>
                      {tx.risk_score} / 100
                    </span>
                  </td>
                  <td className="px-6 py-4 font-sans">
                    <SeverityBadge severity={tx.risk_level} />
                  </td>
                  <td className="px-6 py-4 font-sans">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                        tx.review_status === "approved"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : tx.review_status === "rejected"
                          ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                          : tx.review_status === "escalated"
                          ? "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {tx.review_status || "pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-sans">
                    {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTx(tx);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-sans font-semibold text-xs transition"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal / Drawer */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-6 animate-scaleIn max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Triage Transaction #{selectedTx.id.slice(0, 8)}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Logged at {new Date(selectedTx.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Score & Attributes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-400">Transaction Risk</span>
                  <div className="mt-1">
                    <SeverityBadge severity={selectedTx.risk_level} />
                  </div>
                </div>
                <RiskScoreGauge score={Number(selectedTx.risk_score) || 0} size={100} />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-bold uppercase text-slate-400">Amount & Currency</span>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedTx.currency} {Number(selectedTx.amount).toLocaleString()}
                </p>
                <p className="text-xs text-slate-400">Category: {selectedTx.merchant_category || "General"}</p>
              </div>
            </div>

            {/* Technical Metadata */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                <span className="text-slate-400">User ID:</span>
                <span className="text-slate-900 dark:text-white">{selectedTx.user_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                <span className="text-slate-400">Device ID:</span>
                <span className="text-slate-900 dark:text-white">{selectedTx.device_id || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                <span className="text-slate-400">IP Address:</span>
                <span className="text-slate-900 dark:text-white">{selectedTx.ip_address || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Location:</span>
                <span className="text-slate-900 dark:text-white">{selectedTx.location || "N/A"}</span>
              </div>
            </div>

            {/* Analyst Decision Form */}
            <form onSubmit={handleReviewSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Analyst Disposition
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewAction("approved")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      reviewAction === "approved"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "border-slate-200 dark:border-slate-700 text-slate-600"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction("rejected")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      reviewAction === "rejected"
                        ? "border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                        : "border-slate-200 dark:border-slate-700 text-slate-600"
                    }`}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject (Block)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction("escalated")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      reviewAction === "escalated"
                        ? "border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                        : "border-slate-200 dark:border-slate-700 text-slate-600"
                    }`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    Escalate Tier 2
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mandatory Analyst Audit Note
                </label>
                <textarea
                  required
                  rows={3}
                  value={analystNotes}
                  onChange={(e) => setAnalystNotes(e.target.value)}
                  placeholder="State rationale for disposition (e.g. 'Customer confirmed identity via 2FA out-of-band call; IP anomaly resolved')..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTx(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewMutation.isPending || !analystNotes.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm disabled:opacity-50 transition"
                >
                  {reviewMutation.isPending ? "Submitting Disposition..." : "Submit Formal Disposition"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
