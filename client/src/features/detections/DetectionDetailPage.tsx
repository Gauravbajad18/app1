import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { scannerApi } from "../../api/endpoints";
import { ExplainableTrustPanel } from "../../components/trust/ExplainableTrustPanel";
import {
  ArrowLeft,
  RefreshCw
} from "lucide-react";

export const DetectionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["detectionDetail", id],
    queryFn: () => (id ? scannerApi.getDetectionById(id) : null),
    enabled: !!id
  });

  const detection = data?.data;

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
        <p className="text-sm">Loading detection cryptographic analysis...</p>
      </div>
    );
  }

  if (!detection) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-sm text-slate-500">Detection record not found.</p>
        <Link
          to="/detections"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Registry
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto">
      {/* Top back button */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link
          to="/detections"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Detection Registry
        </Link>
        <span className="text-xs font-mono text-slate-400">ID: {detection.id}</span>
      </div>

      {/* Main Explainable Trust Panel */}
      <ExplainableTrustPanel
        detectionId={detection.id}
        dataType={detection.data_type}
        category={detection.category || "Sensitive Identifier"}
        severity={detection.severity}
        detector={detection.detector}
        confidence={detection.confidence_score || 0.95}
        evidence={{
          start_index: detection.start_index,
          end_index: detection.end_index,
          checksum_verified: detection.checksum_verified,
          rule_matched: detection.rule_matched
        }}
        recommendedAction={detection.action_taken || "Masked"}
        maskedValue={detection.value_masked}
        timestamp={detection.created_at}
        riskScore={detection.risk_score || 85}
        initialFeedback={detection.feedback}
      />
    </div>
  );
};
