import React from "react";
import { Severity } from "@trustshield/shared";
import { ShieldAlert, AlertTriangle, AlertCircle, Info } from "lucide-react";

interface SeverityBadgeProps {
  severity: Severity | string;
  size?: "sm" | "md" | "lg";
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = "md" }) => {
  const norm = (severity || "low").toLowerCase();

  const config = {
    critical: {
      bg: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800",
      dot: "bg-rose-500",
      label: "Critical",
      Icon: ShieldAlert
    },
    high: {
      bg: "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800",
      dot: "bg-orange-500",
      label: "High",
      Icon: AlertTriangle
    },
    medium: {
      bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      dot: "bg-amber-500",
      label: "Medium",
      Icon: AlertCircle
    },
    low: {
      bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
      dot: "bg-emerald-500",
      label: "Low",
      Icon: Info
    }
  }[norm] || {
    bg: "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    dot: "bg-slate-400",
    label: norm,
    Icon: Info
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2"
  }[size];

  const IconComponent = config.Icon;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border ${config.bg} ${sizeClasses}`}
      title={`Severity: ${config.label}`}
    >
      <IconComponent className="h-3.5 w-3.5 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
};
