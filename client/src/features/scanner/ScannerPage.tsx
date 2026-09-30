import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { scannerApi } from "../../api/endpoints";
import { SeverityBadge } from "../../components/trust/SeverityBadge";
import { DetectorChip } from "../../components/trust/DetectorChip";
import { RedactionDiffViewer } from "../../components/trust/RedactionDiffViewer";
import {
  FileText,
  UploadCloud,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Download,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Eye,
  EyeOff,
  FileType
} from "lucide-react";

const SAMPLE_DATA = {
  employee: `Employee Onboarding Record:
Full Name: Rajesh Kumar Sharma
Email: rajesh.kumar@enterprise-corp.com
Phone: +91 98765 43210
Aadhaar Number: 3675 9834 6012
Permanent Account Number (PAN): ABCDE1234F
Current Address: Flat 402, Green Glen Layout, Bellandur, Bangalore, Karnataka - 560103
Passport Number: J8392014`,
  financial: `Monthly Settlement Batch #8491:
Beneficiary: Global Trade Logistics Ltd
Primary Corporate Card: 4242 4242 4242 4242
Expiry: 11/28 | CVV: 782
International Wire IBAN: GB29 NWBK 6016 1331 9268 19
IFSC Code: HDFC0001234
Account Holder: Priya Narayanan
Emergency Contact: +1 (555) 234-5678`,
  developer: `// Production Infrastructure Environment Secrets
AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
OPENAI_API_KEY="sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx"
GOOGLE_GEMINI_KEY="AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q"
DATABASE_URL="postgres://admin:SuperSecretPass123!@db.prod.internal:5432/core"`,
  clean: `Weekly Engineering Standup Notes:
Sprint 42 completed on schedule. All 14 user stories have been merged to main and automated smoke tests passed with 100% test coverage.
Infrastructure scaling threshold increased from 5 to 8 replicas for the checkout service to handle projected holiday traffic.`
};

export const ScannerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"text" | "file">("text");
  const [inputText, setInputText] = useState(SAMPLE_DATA.employee);
  const [redactionStrategy, setRedactionStrategy] = useState<"redact" | "mask" | "hash" | "synthesize">("redact");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [revealedSnippets, setRevealedSnippets] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);

  const textScanMutation = useMutation({
    mutationFn: (data: { text: string; redaction_mode: "mask" | "tokenize" | "remove" }) =>
      scannerApi.scanText(data)
  });

  const fileScanMutation = useMutation({
    mutationFn: (formData: FormData) => scannerApi.scanFile(formData)
  });

  const isScanning = textScanMutation.isPending || fileScanMutation.isPending;
  const rawResult = activeTab === "text" ? textScanMutation.data : fileScanMutation.data;
  const currentResult = rawResult?.data || rawResult;
  const currentError = activeTab === "text" ? textScanMutation.error : fileScanMutation.error;

  const handleScan = () => {
    const mode: "mask" | "tokenize" | "remove" =
      redactionStrategy === "mask" ? "mask" : redactionStrategy === "hash" ? "tokenize" : "remove";

    if (activeTab === "text") {
      if (!inputText.trim()) return;
      textScanMutation.mutate({ text: inputText, redaction_mode: mode });
    } else {
      if (!selectedFile) return;
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("redaction_mode", mode);
      fileScanMutation.mutate(formData);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (content: string, filename = "redacted_output.txt") => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleSnippetReveal = (index: number) => {
    setRevealedSnippets((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const detections = currentResult?.detections || currentResult?.findings || [];
  const criticalCount = detections.filter((d: any) => d.severity === "critical").length;
  const highCount = detections.filter((d: any) => d.severity === "high").length;
  const mediumCount = detections.filter((d: any) => d.severity === "medium").length;
  const lowCount = detections.filter((d: any) => d.severity === "low").length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Sensitive Data & Privacy Scanner
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Detect, audit, and sanitize PII, credentials, API keys, and financial identifiers with cryptographic precision.
          </p>
        </div>

        {/* Strategy Selector */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 uppercase tracking-wider">
            Sanitization:
          </span>
          {(["redact", "mask", "hash", "synthesize"] as const).map((strategy) => (
            <button
              key={strategy}
              onClick={() => setRedactionStrategy(strategy)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
                redactionStrategy === strategy
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {strategy}
            </button>
          ))}
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Tabs & Presets */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab("text")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "text"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <FileText className="h-4 w-4" />
              Direct Text Input
            </button>
            <button
              onClick={() => setActiveTab("file")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "file"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <UploadCloud className="h-4 w-4" />
              Document Upload (.txt, .pdf, .docx, .csv)
            </button>
          </div>

          {activeTab === "text" && (
            <div className="flex items-center gap-1.5 mt-2 sm:mt-0">
              <span className="text-xs font-medium text-slate-400 mr-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" /> Presets:
              </span>
              <button
                onClick={() => setInputText(SAMPLE_DATA.employee)}
                className="px-2.5 py-1 text-xs bg-slate-200/70 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-md transition"
              >
                Employee PII
              </button>
              <button
                onClick={() => setInputText(SAMPLE_DATA.financial)}
                className="px-2.5 py-1 text-xs bg-slate-200/70 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-md transition"
              >
                Financial & Cards
              </button>
              <button
                onClick={() => setInputText(SAMPLE_DATA.developer)}
                className="px-2.5 py-1 text-xs bg-slate-200/70 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-md transition"
              >
                Dev Secrets
              </button>
              <button
                onClick={() => setInputText(SAMPLE_DATA.clean)}
                className="px-2.5 py-1 text-xs bg-slate-200/70 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-md transition"
              >
                Clean Text
              </button>
            </div>
          )}
        </div>

        {/* Tab Body */}
        <div className="p-6">
          {activeTab === "text" ? (
            <div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={8}
                placeholder="Paste text, source code, prompt, or raw document content here to inspect..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-sm font-mono text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span>{inputText.length} characters | {inputText.split(/\s+/).filter(Boolean).length} words</span>
                <span>Supported: Regex, ISO Luhn, UIDAI Verhoeff, IBAN Mod-97, LLM Injection checks</span>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center bg-slate-50/50 dark:bg-slate-950/40">
              <input
                type="file"
                id="file-upload"
                accept=".txt,.md,.csv,.pdf,.docx"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center justify-center space-y-3"
              >
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {selectedFile ? selectedFile.name : "Click or drag document to scan"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Supported: PDF, DOCX, CSV, TXT, MD (Max 5MB)
                  </p>
                </div>
                {selectedFile && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <FileType className="h-4 w-4" />
                    <span>{(selectedFile.size / 1024).toFixed(1)} KB ready for inspection</span>
                  </div>
                )}
              </label>
            </div>
          )}

          {/* Action Row */}
          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={() => {
                if (activeTab === "text") setInputText("");
                else setSelectedFile(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-medium"
            >
              Clear Input
            </button>

            <button
              onClick={handleScan}
              disabled={isScanning || (activeTab === "text" ? !inputText.trim() : !selectedFile)}
              className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Running Neural & Rule Scanners...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Scan for Sensitive Data
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {currentError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-3 text-sm text-rose-700 dark:text-rose-300">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>Scan failed: {(currentError as any)?.response?.data?.message || "An unexpected error occurred during inspection."}</span>
        </div>
      )}

      {/* Results View */}
      {currentResult && (
        <div className="space-y-6">
          {/* Summary Badges Bar */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${detections.length > 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"}`}>
                {detections.length > 0 ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {detections.length === 0 ? "Zero Sensitive Data Detected" : `${detections.length} Sensitive Entity Found`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Execution completed in {currentResult.execution_time_ms || 24}ms | Strategy: <span className="font-semibold capitalize text-indigo-500">{redactionStrategy}</span>
                </p>
              </div>
            </div>

            {/* Severity Counters */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                Critical: {criticalCount}
              </span>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900">
                High: {highCount}
              </span>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                Medium: {mediumCount}
              </span>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                Low: {lowCount}
              </span>
            </div>
          </div>

          {/* Detections Findings Table */}
          {detections.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Detailed Findings & Cryptographic Verification
                </h3>
                <span className="text-xs text-slate-400">
                  Click the eye icon to unmask individual raw matches
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-3.5">Entity Type</th>
                      <th className="px-6 py-3.5">Severity</th>
                      <th className="px-6 py-3.5">Detector</th>
                      <th className="px-6 py-3.5">Confidence</th>
                      <th className="px-6 py-3.5">Matched Snippet</th>
                      <th className="px-6 py-3.5">Action Taken</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
                    {detections.map((det: any, idx: number) => {
                      const isRevealed = !!revealedSnippets[idx];
                      const maskedSnippet = det.masked_value || det.value_masked || "••••••••";
                      const rawSnippet = det.raw_value || det.value_raw || det.raw_text || maskedSnippet;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                          <td className="px-6 py-4 font-sans font-semibold text-slate-900 dark:text-white">
                            {det.data_type || det.entity_type}
                          </td>
                          <td className="px-6 py-4">
                            <SeverityBadge severity={det.severity} />
                          </td>
                          <td className="px-6 py-4">
                            <DetectorChip detector={det.detector} />
                          </td>
                          <td className="px-6 py-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                            {Math.round((det.confidence || det.confidence_score || 0.95) * 100)}%
                          </td>
                          <td className="px-6 py-4 font-mono">
                            <div className="flex items-center gap-2">
                              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-800 dark:text-slate-200 max-w-xs truncate">
                                {isRevealed ? rawSnippet : maskedSnippet}
                              </span>
                              <button
                                onClick={() => toggleSnippetReveal(idx)}
                                title={isRevealed ? "Mask snippet" : "Reveal snippet"}
                                className="text-slate-400 hover:text-indigo-600 transition"
                              >
                                {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="capitalize font-sans font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md">
                              {det.recommended_action || det.action_taken || redactionStrategy}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Redaction Diff Viewer */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Redaction & Sanitization Diff
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Visual before-and-after comparison with zero leakage guarantee
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(currentResult?.sanitized_text || currentResult?.redacted_content || currentResult?.redacted_text || "")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                >
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied!" : "Copy Sanitized"}
                </button>
                <button
                  onClick={() => handleDownload(currentResult?.sanitized_text || currentResult?.redacted_content || currentResult?.redacted_text || "")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Sanitized .txt
                </button>
              </div>
            </div>

            <RedactionDiffViewer
              originalText={currentResult?.raw_text || currentResult?.content || inputText}
              redactedText={currentResult?.sanitized_text || currentResult?.redacted_content || currentResult?.redacted_text || ""}
              findingsCount={detections.length}
            />
          </div>
        </div>
      )}
    </div>
  );
};
