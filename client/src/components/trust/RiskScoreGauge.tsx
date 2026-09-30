import React from "react";

interface RiskScoreGaugeProps {
  score: number;
  size?: number;
  label?: string;
  sublabel?: string;
}

export const RiskScoreGauge: React.FC<RiskScoreGaugeProps> = ({
  score,
  size = 140,
  label = "Risk Score",
  sublabel
}) => {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Use a 270-degree arc
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (arcLength * clampedScore) / 100;

  let colorClass = "#10B981"; // Emerald
  let textRating = "Low Risk";
  if (clampedScore >= 75) {
    colorClass = "#EF4444"; // Red
    textRating = "Critical Risk";
  } else if (clampedScore >= 50) {
    colorClass = "#F97316"; // Orange
    textRating = "High Risk";
  } else if (clampedScore >= 25) {
    colorClass = "#F59E0B"; // Amber
    textRating = "Moderate Risk";
  }

  return (
    <div className="flex flex-col items-center justify-center p-3 text-center">
      <div className="relative" style={{ width: size, height: size * 0.85 }}>
        <svg width={size} height={size} className="-rotate-225">
          {/* Background Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-800"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Progress Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={colorClass}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {clampedScore}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            / 100
          </span>
        </div>
      </div>

      <div className="mt-1">
        <span
          className="inline-block text-xs font-bold px-2 py-0.5 rounded"
          style={{ color: colorClass, backgroundColor: `${colorClass}15` }}
        >
          {sublabel || textRating}
        </span>
        {label && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>}
      </div>
    </div>
  );
};
