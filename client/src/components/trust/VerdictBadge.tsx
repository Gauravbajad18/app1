import React from "react";
import { PhishingVerdict } from "@trustshield/shared";
import { ShieldCheck, ShieldAlert, AlertTriangle, AlertOctagon } from "lucide-react";

export const VerdictBadge: React.FC<{ verdict: PhishingVerdict | string }> = ({ verdict }) => {
  const norm = (verdict || "safe").toLowerCase();

  const configs: Record<string, { bg: string; text: string; label: string; icon: any }> = {
    safe: {
      bg: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300",
      text: "Safe",
      label: "Legitimate",
      icon: ShieldCheck
    },
    suspicious: {
      bg: "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300",
      text: "Suspicious",
      label: "Caution Advised",
      icon: AlertTriangle
    },
    phishing: {
      bg: "bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-300",
      text: "Phishing",
      label: "Credential Harvest Attempt",
      icon: ShieldAlert
    },
    scam: {
      bg: "bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-red-300",
      text: "Scam / Fraud",
      label: "Social Engineering Fraud",
      icon: AlertOctagon
    }
  };

  const item = configs[norm] || configs.safe;
  const Icon = item.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${item.bg}`}>
      <Icon className="h-4 w-4" />
      <span>{item.text.toUpperCase()}</span>
    </span>
  );
};
