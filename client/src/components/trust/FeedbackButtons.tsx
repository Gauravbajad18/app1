import React, { useState } from "react";
import { FeedbackVerdict } from "@trustshield/shared";
import { Check, X, HelpCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import { scannerApi } from "../../api/endpoints";

interface FeedbackButtonsProps {
  detectionId: string;
  initialVerdict?: FeedbackVerdict | null;
  onSubmitted?: (verdict: FeedbackVerdict) => void;
}

export const FeedbackButtons: React.FC<FeedbackButtonsProps> = ({
  detectionId,
  initialVerdict,
  onSubmitted
}) => {
  const [selected, setSelected] = useState<FeedbackVerdict | null>(initialVerdict || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState("");

  const handleVote = async (verdict: FeedbackVerdict) => {
    setSelected(verdict);
    setIsSubmitting(true);
    try {
      await scannerApi.submitFeedback(detectionId, {
        verdict,
        note: note.trim() || undefined
      });
      if (onSubmitted) {
        onSubmitted(verdict);
      }
    } catch (err) {
      console.error("Failed to submit feedback", err);
    } finally {
      setIsSubmitting(false);
      setShowNoteInput(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>Was this detection accurate?</span>
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5 shadow-sm">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleVote("correct")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              selected === "correct"
                ? "bg-emerald-600 text-white"
                : "text-slate-600 hover:text-emerald-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <ThumbsUp className="h-3 w-3" />
            <span>Correct</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              if (selected !== "false_positive") {
                setShowNoteInput(true);
              }
              handleVote("false_positive");
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              selected === "false_positive"
                ? "bg-rose-600 text-white"
                : "text-slate-600 hover:text-rose-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <ThumbsDown className="h-3 w-3" />
            <span>False Positive</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleVote("missed")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              selected === "missed"
                ? "bg-amber-600 text-white"
                : "text-slate-600 hover:text-amber-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <HelpCircle className="h-3 w-3" />
            <span>Incomplete</span>
          </button>
        </div>
      </div>

      {showNoteInput && (
        <div className="flex items-center gap-2 mt-1">
          <input
            type="text"
            placeholder="Add explanation note (optional)..."
            value={note}
            onChange={e => setNote(e.target.value)}
            className="text-xs px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 w-full"
          />
          <button
            type="button"
            onClick={() => handleVote(selected || "false_positive")}
            className="text-xs px-2.5 py-1 rounded bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-medium"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
};
