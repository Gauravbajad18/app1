import React from "react";
import { DetectorType } from "@trustshield/shared";
import { Cpu, Sparkles, Combine } from "lucide-react";

export const DetectorChip: React.FC<{ detector: DetectorType | string }> = ({ detector }) => {
  const norm = (detector || "rule").toLowerCase();

  const configs: Record<string, { label: string; icon: any; color: string }> = {
    rule: {
      label: "Deterministic Rule",
      icon: Cpu,
      color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700"
    },
    ai: {
      label: "Gemini Contextual AI",
      icon: Sparkles,
      color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
    },
    hybrid: {
      label: "Hybrid (Rule + AI)",
      icon: Combine,
      color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800"
    }
  };

  const item = configs[norm] || configs.rule;
  const Icon = item.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium border ${item.color}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{item.label}</span>
    </span>
  );
};
