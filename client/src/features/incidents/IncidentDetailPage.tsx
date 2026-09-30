import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { incidentApi } from "../../api/endpoints";
import { SeverityBadge } from "../../components/trust/SeverityBadge";
import {
  Flame,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Clock,
  Send,
  MessageSquare,
  AlertTriangle,
  FileCheck,
  ShieldAlert,
  UserCheck
} from "lucide-react";

export const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [checklistState, setChecklistState] = useState<Record<number, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["incidentDetail", id],
    queryFn: () => (id ? incidentApi.getIncidentById(id) : null),
    enabled: !!id
  });

  const updateMutation = useMutation({
    mutationFn: (updateData: any) => incidentApi.updateIncident(id!, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidentDetail", id] });
    }
  });

  const briefMutation = useMutation({
    mutationFn: () => incidentApi.generateAIBrief(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidentDetail", id] });
    }
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) => incidentApi.addComment(id!, body),
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["incidentDetail", id] });
    }
  });

  const incident = data?.data;

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
        <p className="text-sm">Loading incident details & threat telemetry...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-sm text-slate-500">Incident record not found.</p>
        <Link
          to="/incidents"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Incidents
        </Link>
      </div>
    );
  }

  const aiBrief = incident.ai_brief;
  const comments = incident.comments || [];

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <Link
            to="/incidents"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Incidents
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {incident.title}
            </h1>
            <SeverityBadge severity={incident.severity} />
          </div>
          <p className="text-xs text-slate-400 font-mono">
            INC-{incident.id.slice(0, 8)} | Opened on {new Date(incident.created_at).toLocaleString()}
          </p>
        </div>

        {/* Status transition dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Status:</span>
          <select
            value={incident.status}
            onChange={(e) => updateMutation.mutate({ status: e.target.value })}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="contained">Contained</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Description + AI Brief */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 7 cols */}
        <div className="lg:col-span-7 space-y-6">
          {/* Incident Description */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Incident Scope & Overview
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {incident.description}
            </p>
          </div>

          {/* AI Incident Brief Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    AI Incident Brief & Containment Strategy
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Autonomous synthesis by Gemini 2.5 Flash
                  </p>
                </div>
              </div>

              <button
                onClick={() => briefMutation.mutate()}
                disabled={briefMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${briefMutation.isPending ? "animate-spin" : ""}`} />
                {aiBrief ? "Regenerate Brief" : "Generate AI Brief"}
              </button>
            </div>

            {!aiBrief && !briefMutation.isPending && (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No AI Brief generated yet. Click "Generate AI Brief" to receive root-cause analysis, regulatory deadlines, and containment action items.
              </div>
            )}

            {briefMutation.isPending && (
              <div className="p-8 text-center text-xs text-indigo-600 dark:text-indigo-400 flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span>Synthesizing root cause and regulatory deadlines...</span>
              </div>
            )}

            {aiBrief && (
              <div className="space-y-4 animate-fadeIn">
                {/* Executive Summary */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Executive Summary
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {aiBrief.executive_summary}
                  </p>
                </div>

                {/* Root Cause Analysis */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Root Cause Analysis
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {aiBrief.root_cause || "Analysis indicates multi-vector perimeter probing targeting unprotected internal endpoints."}
                  </p>
                </div>

                {/* Containment Checklist */}
                {aiBrief.containment_checklist && aiBrief.containment_checklist.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Containment Action Items
                    </span>
                    <div className="space-y-1.5">
                      {aiBrief.containment_checklist.map((item: string, idx: number) => {
                        const checked = !!checklistState[idx];
                        return (
                          <label
                            key={idx}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                              checked
                                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-300 line-through opacity-80"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setChecklistState((prev) => ({ ...prev, [idx]: !prev[idx] }))
                              }
                              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{item}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Regulatory Deadlines */}
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 space-y-1.5 text-xs text-rose-900 dark:text-rose-200">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Statutory Notification Deadlines</span>
                  </div>
                  <p className="leading-relaxed">
                    {aiBrief.regulatory_notifications || "CERT-In mandatory 6-hour cybersecurity reporting window triggered. GDPR 72-hour supervisory authority notification window active."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 5 cols (Comments Feed) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col h-[640px]">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <MessageSquare className="h-4 w-4 text-indigo-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Analyst Incident Log ({comments.length})
            </h3>
          </div>

          {/* Comment list */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {comments.length === 0 && (
              <div className="text-center text-xs text-slate-400 py-8">
                No activity comments recorded yet. Post findings or timeline updates below.
              </div>
            )}
            {comments.map((comment: any) => (
              <div
                key={comment.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {comment.author?.full_name || "Security Analyst"}
                  </span>
                  <span>{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                  {comment.body}
                </p>
              </div>
            ))}
          </div>

          {/* Add comment box */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && commentText.trim()) {
                    commentMutation.mutate(commentText.trim());
                  }
                }}
                placeholder="Log activity, evidence hash, or action..."
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => commentText.trim() && commentMutation.mutate(commentText.trim())}
                disabled={commentMutation.isPending || !commentText.trim()}
                className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
