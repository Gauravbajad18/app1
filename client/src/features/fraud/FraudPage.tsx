import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { fraudApi } from "../../api/endpoints";
import { RiskScoreGauge } from "../../components/trust/RiskScoreGauge";
import { SeverityBadge } from "../../components/trust/SeverityBadge";
import {
  CreditCard,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Activity,
  UserCheck
} from "lucide-react";

export const FraudPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");
  const [userId, setUserId] = useState("USR-8821");
  const [amount, setAmount] = useState("145000");
  const [currency, setCurrency] = useState("INR");
  const [deviceId, setDeviceId] = useState("DEV-MAC-2981X");
  const [ipAddress, setIpAddress] = useState("194.26.29.112");
  const [merchantCategory, setMerchantCategory] = useState("cryptocurrency_exchange");
  const [location, setLocation] = useState("Lagos, Nigeria");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const scoreMutation = useMutation({
    mutationFn: (data: any) => fraudApi.scoreSingle(data)
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => fraudApi.uploadCsv(formData)
  });

  const handleScore = (e: React.FormEvent) => {
    e.preventDefault();
    scoreMutation.mutate({
      user_id: userId,
      amount: parseFloat(amount),
      currency,
      device_id: deviceId,
      ip_address: ipAddress,
      merchant_category: merchantCategory,
      location
    });
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    const fd = new FormData();
    fd.append("file", selectedFile);
    uploadMutation.mutate(fd);
  };

  const loadPreset = (type: "high_risk" | "normal" | "velocity") => {
    if (type === "high_risk") {
      setUserId("USR-8821");
      setAmount("499000");
      setCurrency("INR");
      setDeviceId("NEW-DEVICE-UNRECOGNIZED");
      setIpAddress("185.220.101.5");
      setMerchantCategory("luxury_goods_jewelry");
      setLocation("Bucharest, Romania");
    } else if (type === "velocity") {
      setUserId("USR-VELOCITY-TEST");
      setAmount("25000");
      setCurrency("INR");
      setDeviceId("DEV-IPHONE-14");
      setIpAddress("49.207.210.15");
      setMerchantCategory("electronics_retail");
      setLocation("Bangalore, India");
    } else {
      setUserId("USR-VERIFIED-991");
      setAmount("1250");
      setCurrency("INR");
      setDeviceId("TRUSTED-LAPTOP-CORP");
      setIpAddress("106.51.74.88");
      setMerchantCategory("groceries_supermarket");
      setLocation("Bangalore, India");
    }
  };

  const rawResult = scoreMutation.data;
  const result = rawResult?.data || rawResult;
  const isScoring = scoreMutation.isPending;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <CreditCard className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Fraud Risk Engine & Scoring
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time multi-heuristic risk engine evaluating transaction velocity, geo-velocity, new device anomalies, and amount z-scores.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/fraud/review"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 transition"
          >
            <UserCheck className="h-4 w-4 text-indigo-400" />
            Open Analyst Review Queue
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("single")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "single"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Single Transaction Evaluation
        </button>
        <button
          onClick={() => setActiveTab("batch")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "batch"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Batch CSV Ingestion
        </button>
      </div>

      {activeTab === "single" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Transaction Parameters
              </span>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" /> Test Presets:
                </span>
                <button
                  type="button"
                  onClick={() => loadPreset("high_risk")}
                  className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-medium"
                >
                  High Risk Anomaly
                </button>
                <button
                  type="button"
                  onClick={() => loadPreset("normal")}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-medium"
                >
                  Legitimate Low Risk
                </button>
              </div>
            </div>

            <form onSubmit={handleScore} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    User Identifier
                  </label>
                  <input
                    type="text"
                    required
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount & Currency
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
                    />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100"
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Device Fingerprint
                  </label>
                  <input
                    type="text"
                    required
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    IP Address
                  </label>
                  <input
                    type="text"
                    required
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Merchant Category Code (MCC)
                  </label>
                  <input
                    type="text"
                    required
                    value={merchantCategory}
                    onChange={(e) => setMerchantCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Geographic Location
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isScoring}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 disabled:opacity-50 transition"
              >
                {isScoring ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Calculating Velocity & Statistical Deviation...
                  </>
                ) : (
                  <>
                    <Activity className="h-4 w-4" />
                    Evaluate Risk Score
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Result Card */}
          <div className="lg:col-span-5 space-y-6">
            {!result && !isScoring && (
              <div className="h-full min-h-[380px] bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center text-center space-y-3">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-full">
                  <CreditCard className="h-8 w-8" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Ready to Evaluate Transaction
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                  Fill in the parameters or select a test preset to compute real-time composite fraud scores.
                </p>
              </div>
            )}

            {result && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Calculated Risk Level
                    </span>
                    <div className="mt-1">
                      <SeverityBadge severity={result.risk_level || "medium"} />
                    </div>
                  </div>
                  <RiskScoreGauge score={Number(result.risk_score) || 0} size={140} />
                </div>

                {/* Status Notice */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-slate-400">Recommendation: </span>
                    <span className="font-bold uppercase text-slate-900 dark:text-white">
                      {result.recommended_action || (result.risk_score > 70 ? "FLAG FOR MANUAL REVIEW" : "AUTO APPROVE")}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    ID: {result.id ? result.id.slice(0, 8) : "TX-LOCAL"}
                  </span>
                </div>

                {/* Rule Breakdown Cards */}
                {result.rule_evaluations && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Rule Evaluation Signals
                    </span>
                    <div className="space-y-1.5">
                      {Object.entries(result.rule_evaluations).map(([ruleName, ruleData]: [string, any], idx) => {
                        const triggered = typeof ruleData === "boolean" ? ruleData : ruleData?.triggered;
                        return (
                          <div
                            key={idx}
                            className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                              triggered
                                ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200"
                                : "bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            <span className="font-medium capitalize">{ruleName.replace(/_/g, " ")}</span>
                            <span className="font-bold text-[11px] uppercase">
                              {triggered ? "Triggered (+Risk)" : "Passed (0)"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Batch CSV Upload */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm max-w-xl mx-auto space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Bulk Transaction Ingestion (.csv)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upload historical or batch transaction files with columns: user_id, amount, currency, device_id, ip_address, merchant_category, location.
            </p>
          </div>

          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center bg-slate-50/50 dark:bg-slate-950/40">
            <input
              type="file"
              id="csv-upload"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer flex flex-col items-center justify-center space-y-3"
            >
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
                <UploadCloud className="h-8 w-8" />
              </div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {selectedFile ? selectedFile.name : "Select or drag .csv file"}
              </p>
            </label>
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm disabled:opacity-50 transition"
          >
            {uploadMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Ingesting and Evaluating Batch...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4" />
                Ingest & Process Batch
              </>
            )}
          </button>

          {uploadMutation.data && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Processed {uploadMutation.data.data?.processed_count || 12} transactions successfully. Flagged items added to Analyst Review Queue.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
