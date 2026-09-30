import React, { useState } from "react";
import { Copy, Check, Eye, EyeOff } from "lucide-react";

interface RedactionDiffViewerProps {
  originalText: string;
  redactedText: string;
  findingsCount: number;
}

export const RedactionDiffViewer: React.FC<RedactionDiffViewerProps> = ({
  originalText,
  redactedText,
  findingsCount
}) => {
  const [activeTab, setActiveTab] = useState<"redacted" | "original" | "split">("split");
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/50 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Content Redaction Viewer
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-medium">
            {findingsCount} protected item{findingsCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Selector */}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("split")}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                activeTab === "split"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Split View
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("redacted")}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                activeTab === "redacted"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Redacted Only
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("original")}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                activeTab === "original"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Original Raw
            </button>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={() => handleCopy(redactedText)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied Redacted" : "Copy Redacted"}</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4">
        {activeTab === "split" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original with Sensitive Highlights */}
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <EyeOff className="h-3.5 w-3.5 text-rose-500" /> Raw Input Content
              </span>
              <div className="flex-1 font-mono text-xs p-3.5 rounded-lg border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10 text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                {originalText}
              </div>
            </div>

            {/* Sanitized Redacted */}
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Eye className="h-3.5 w-3.5 text-emerald-500" /> Sanitized / Redacted Output
              </span>
              <div className="flex-1 font-mono text-xs p-3.5 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10 text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto selection:bg-emerald-200">
                {redactedText}
              </div>
            </div>
          </div>
        )}

        {activeTab === "redacted" && (
          <div className="font-mono text-xs p-4 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10 text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
            {redactedText}
          </div>
        )}

        {activeTab === "original" && (
          <div className="font-mono text-xs p-4 rounded-lg border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10 text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
            {originalText}
          </div>
        )}
      </div>
    </div>
  );
};
