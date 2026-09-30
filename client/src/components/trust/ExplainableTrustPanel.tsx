import React from "react";
import { Severity, DetectorType, FeedbackVerdict } from "@trustshield/shared";
import { SeverityBadge } from "./SeverityBadge";
import { DetectorChip } from "./DetectorChip";
import { FeedbackButtons } from "./FeedbackButtons";
import { RiskScoreGauge } from "./RiskScoreGauge";
import { ShieldCheck, Info, CheckCircle2, Clock, Cpu } from "lucide-react";

interface ExplainableTrustPanelProps {
  detectionId?: string;
  dataType: string;
  category: string;
  severity: Severity | string;
  detector: DetectorType | string;
  confidence: number;
  evidence?: Record<string, any>;
  recommendedAction: string;
  maskedValue?: string;
  modelName?: string;
  timestamp?: string;
  riskScore?: number;
  initialFeedback?: FeedbackVerdict | null;
}

export const ExplainableTrustPanel: React.FC<ExplainableTrustPanelProps> = ({
  detectionId,
  dataType,
  category,
  severity,
  detector,
  confidence,
  evidence,
  recommendedAction,
  maskedValue,
  modelName = "gemini-2.5-flash / rule-hybrid",
  timestamp,
  riskScore,
  initialFeedback
}) => {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
      {/* Header with Title and Badges */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">
              {dataType.replace(/_/g, " ")} Detected
            </h3>
            <SeverityBadge severity={severity as Severity} size="sm" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Category: <strong className="text-slate-700 dark:text-slate-300 font-medium capitalize">{category.replace(/_/g, " ")}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DetectorChip detector={detector as DetectorType} />
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" title="Model Confidence Score">
            {(confidence * 100).toFixed(0)}% Confidence
          </span>
        </div>
      </div>

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
        {/* Left: Evidence & Trigger Breakdown */}
        <div className="md:col-span-2 space-y-3.5">
          {/* Masked Preview */}
          {maskedValue && (
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Sanitized Value Preview
              </span>
              <div className="font-mono text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 inline-block">
                {maskedValue}
              </div>
            </div>
          )}

          {/* Evidence Details */}
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
              Explainable Evidence
            </span>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-3 text-xs space-y-1.5">
              {evidence && Object.keys(evidence).length > 0 ? (
                Object.entries(evidence).map(([key, val]) => (
                  <div key={key} className="flex items-start gap-2">
                    <span className="font-semibold text-slate-600 dark:text-slate-400 capitalize min-w-[100px]">
                      {key.replace(/_/g, " ")}:
                    </span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {typeof val === "object" ? JSON.stringify(val) : String(val)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 italic">Deterministic pattern syntax matched standard verification criteria.</p>
              )}
            </div>
          </div>

          {/* Recommended Action */}
          <div className="rounded-lg border border-blue-100 dark:border-blue-950/60 bg-blue-50/50 dark:bg-blue-950/20 p-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-300 mb-1">
              <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Recommended Action</span>
            </div>
            <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
              {recommendedAction}
            </p>
          </div>
        </div>

        {/* Right: Risk Gauge & Model Metadata */}
        <div className="flex flex-col items-center justify-between border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 md:pl-5 pt-4 md:pt-0">
          {riskScore !== undefined ? (
            <RiskScoreGauge score={riskScore} size={130} label="Finding Severity Impact" />
          ) : (
            <div className="flex flex-col items-center justify-center py-4">
              <ShieldCheck className="h-12 w-12 text-brand-500 mb-2 opacity-80" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Audited Finding</span>
            </div>
          )}

          <div className="w-full text-xs text-slate-500 dark:text-slate-400 space-y-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1"><Cpu className="h-3.5 w-3.5" /> Engine:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[130px]">{modelName}</span>
            </div>
            {timestamp && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Logged:</span>
                <span>{new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Feedback Bar */}
      {detectionId && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <FeedbackButtons detectionId={detectionId} initialVerdict={initialFeedback} />
          <span className="text-[11px] text-slate-400">TrustShield Explainability Model v2.5</span>
        </div>
      )}
    </div>
  );
};
