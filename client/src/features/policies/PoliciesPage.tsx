import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { policyApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import {
  Sliders,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  Clock,
  RotateCcw
} from "lucide-react";

const ENTITY_CONFIGS = [
  { key: "aadhaar", label: "Aadhaar Number (India UIDAI)", category: "National ID", defaultAction: "mask", severity: "critical" },
  { key: "pan", label: "Permanent Account Number (PAN)", category: "Tax / Financial", defaultAction: "mask", severity: "high" },
  { key: "credit_card", label: "Credit & Debit Cards (PCI-DSS)", category: "Financial", defaultAction: "block", severity: "critical" },
  { key: "iban", label: "International Bank Account (IBAN)", category: "Financial", defaultAction: "mask", severity: "high" },
  { key: "bank_account", label: "Bank Account Details", category: "Financial", defaultAction: "mask", severity: "high" },
  { key: "email", label: "Email Address", category: "Personal Contact", defaultAction: "allow", severity: "low" },
  { key: "phone", label: "Phone Number", category: "Personal Contact", defaultAction: "mask", severity: "medium" },
  { key: "aws_key", label: "AWS Secret Access Key", category: "Cloud Secrets", defaultAction: "block", severity: "critical" },
  { key: "openai_key", label: "OpenAI API Key", category: "AI Credentials", defaultAction: "block", severity: "critical" },
  { key: "private_key", label: "RSA / EC Private Key PEM", category: "Cryptographic Keys", defaultAction: "block", severity: "critical" },
  { key: "password", label: "Plaintext Passwords", category: "Credentials", defaultAction: "block", severity: "critical" }
];

export const PoliciesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "org_admin";

  const { data, isLoading } = useQuery({
    queryKey: ["orgPolicies"],
    queryFn: () => policyApi.getPolicies()
  });

  const [policies, setPolicies] = useState<Record<string, "allow" | "mask" | "block">>({});
  const [injectionThreshold, setInjectionThreshold] = useState(70);
  const [fraudThreshold, setFraudThreshold] = useState(65);
  const [retentionDays, setRetentionDays] = useState(90);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const raw = (data as any)?.policies || (data as any)?.data?.policies || data?.data || data;
    if (raw) {
      const initial: Record<string, "allow" | "mask" | "block"> = {};
      if (Array.isArray(raw)) {
        raw.forEach((p: any) => {
          initial[p.data_type] = p.gateway_action || p.scanner_action || p.action || "mask";
        });
      } else if (raw.rules) {
        Object.entries(raw.rules).forEach(([k, v]: [string, any]) => {
          initial[k] = v.action || "mask";
        });
      }
      ENTITY_CONFIGS.forEach((e) => {
        if (!initial[e.key]) initial[e.key] = e.defaultAction as any;
      });
      setPolicies(initial);

      const settings = (data as any)?.settings || (data as any)?.data?.settings;
      if (settings?.data_retention_days) setRetentionDays(settings.data_retention_days);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (updatePayload: any) => policyApi.updatePolicies(updatePayload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orgPolicies"] });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  });

  const handleActionChange = (key: string, action: "allow" | "mask" | "block") => {
    if (!isAdmin) return;
    setPolicies((prev) => ({ ...prev, [key]: action }));
  };

  const handleSave = () => {
    const policyItems = ENTITY_CONFIGS.map((e) => ({
      data_type: e.key,
      gateway_action: policies[e.key] || (e.defaultAction as any),
      scanner_action: policies[e.key] || (e.defaultAction as any)
    }));

    updateMutation.mutate({
      policies: policyItems,
      data_retention_days: retentionDays
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Sliders className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Privacy Policy & Governance Matrix
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure entity-level enforcement rules (Allow, Mask, Block) and global risk thresholds across all scanning and gateway traffic.
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm disabled:opacity-50 transition"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Policies Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {updateMutation.isPending ? "Applying Policies..." : "Save Policy Changes"}
              </>
            )}
          </button>
        ) : (
          <div className="p-2 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4" /> Read-Only (Requires Org Admin)
          </div>
        )}
      </div>

      {/* Global Risk & Thresholds */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Global Risk Thresholds & Data Retention
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Prompt Injection Cutoff
              </span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {injectionThreshold}%
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={95}
              disabled={!isAdmin}
              value={injectionThreshold}
              onChange={(e) => setInjectionThreshold(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Prompts scoring above this are blocked at perimeter.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Fraud Review Trigger
              </span>
              <span className="text-xs font-bold text-amber-500">
                {fraudThreshold}%
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={95}
              disabled={!isAdmin}
              value={fraudThreshold}
              onChange={(e) => setFraudThreshold(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Transactions exceeding score trigger manual queue triage.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Audit Log Retention
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {retentionDays} Days
              </span>
            </div>
            <select
              value={retentionDays}
              disabled={!isAdmin}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value={30}>30 Days</option>
              <option value={90}>90 Days (Quarterly)</option>
              <option value={180}>180 Days (Half-Year)</option>
              <option value={365}>365 Days (1 Year - Standard)</option>
              <option value={730}>730 Days (2 Years - Statutory)</option>
            </select>
            <p className="text-[11px] text-slate-400">
              Retention cleanup runs nightly via cron scheduler.
            </p>
          </div>
        </div>
      </div>

      {/* Entity Rule Matrix */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Entity Enforcement Matrix ({ENTITY_CONFIGS.length} Types)
          </h3>
          <span className="text-xs text-slate-400">
            Allow = Pass raw | Mask = Replace/Sanitize | Block = Reject request
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {ENTITY_CONFIGS.map((entity) => {
            const currentAction = policies[entity.key] || entity.defaultAction;
            return (
              <div
                key={entity.key}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {entity.label}
                    </p>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {entity.category}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-400">
                    Key: {entity.key} | Default: {entity.defaultAction}
                  </p>
                </div>

                {/* Tri-state Action Toggle Buttons */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => handleActionChange(entity.key, "allow")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
                      currentAction === "allow"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Allow
                  </button>
                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => handleActionChange(entity.key, "mask")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
                      currentAction === "mask"
                        ? "bg-amber-500 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Mask
                  </button>
                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => handleActionChange(entity.key, "block")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
                      currentAction === "block"
                        ? "bg-rose-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Block
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
