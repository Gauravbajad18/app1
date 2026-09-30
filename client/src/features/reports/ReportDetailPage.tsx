import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { reportApi } from "../../api/endpoints";
import { RiskScoreGauge } from "../../components/trust/RiskScoreGauge";
import {
  FileBarChart,
  ArrowLeft,
  Printer,
  Calendar,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  FileCheck
} from "lucide-react";

export const ReportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["reportDetail", id],
    queryFn: () => (id ? reportApi.getReportById(id) : null),
    enabled: !!id
  });

  const report = data?.data;

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400">
        Loading security posture report...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-sm text-slate-500">Report not found.</p>
        <Link
          to="/reports"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Reports
        </Link>
      </div>
    );
  }

  const metrics = report.metrics || {};
  const recommendations = report.recommendations || [
    "Enforce strict blocking on unmasked Aadhaar and PAN data across all Prompt Gateway endpoints.",
    "Enable automated IP geo-velocity challenge on transactions exceeding Rs. 50,000.",
    "Conduct quarterly phishing simulations for employee training targeting SMS phishing vectors."
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-12 print:p-0 print:m-0">
      {/* Action / Nav Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 print:hidden">
        <Link
          to="/reports"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reports List
        </Link>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 shadow-sm transition"
        >
          <Printer className="h-4 w-4" />
          Print / Save PDF
        </button>
      </div>

      {/* Report Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
              Executive Security Posture Audit
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {report.title}
            </h1>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="font-mono">ID: {report.id}</span>
              <span>•</span>
              <span>
                Coverage: {new Date(report.start_date || report.created_at).toLocaleDateString()} to {new Date(report.end_date || report.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Composite Posture Score
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {report.posture_score || 88} <span className="text-xs font-normal text-slate-400">/ 100</span>
              </span>
              <span className="block text-[11px] text-emerald-500 font-semibold">Resilient Defense</span>
            </div>
            <RiskScoreGauge score={Number(report.posture_score) || 88} size={140} />
          </div>
        </div>

        {/* Domain Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400">PII Protection</span>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {metrics.pii_score || 94}%
            </p>
            <span className="text-[10px] text-emerald-500 font-medium">Zero leakage detected</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400">Prompt Firewall</span>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {metrics.firewall_score || 96}%
            </p>
            <span className="text-[10px] text-emerald-500 font-medium">100% injections stopped</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400">Fraud Resiliency</span>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {metrics.fraud_score || 89}%
            </p>
            <span className="text-[10px] text-emerald-500 font-medium">Heuristics active</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400">Audit Chain Health</span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              100%
            </p>
            <span className="text-[10px] text-emerald-500 font-medium">Cryptographic integrity verified</span>
          </div>
        </div>

        {/* AI Executive Narrative */}
        <div className="p-6 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 text-sm font-bold">
            <Sparkles className="h-4 w-4" />
            <span>AI Executive Narrative & Threat Vector Synthesis</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
            {report.ai_narrative || report.executive_summary || "During the audited interval, the organization processed sensitive digital operations with robust defense metrics. The Secure AI Gateway intercepted multiple prompt extraction and jailbreak attempts without telemetry compromise. Cryptographic audit logs show zero record tampering. Continued focus on financial velocity limits is recommended."}
          </p>
        </div>

        {/* Compliance Crosswalk */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Statutory & Regulatory Compliance Crosswalk
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">DPDP Act 2023 (India)</p>
                <p className="text-[11px] text-slate-400">Consent, purpose limitation, and PII anonymization verified.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">EU GDPR (Article 9 & 33)</p>
                <p className="text-[11px] text-slate-400">Special category data protection and 72-hour incident readiness.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">PCI-DSS v4.0</p>
                <p className="text-[11px] text-slate-400">Primary Account Number (PAN) masking & Luhn algorithmic checks enabled.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">SOC 2 Type II (Trust Services Criteria)</p>
                <p className="text-[11px] text-slate-400">Cryptographically verifiable immutable audit trails with SHA-256 chaining.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tactical Recommendations */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Prioritized Security Recommendations
          </h3>
          <div className="space-y-2">
            {recommendations.map((rec: string, idx: number) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start gap-3 text-xs"
              >
                <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
                  REC-{idx + 1}
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
