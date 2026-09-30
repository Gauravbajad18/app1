import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { phishingApi } from "../../api/endpoints";
import { RiskScoreGauge } from "../../components/trust/RiskScoreGauge";
import { VerdictBadge } from "../../components/trust/VerdictBadge";
import { SeverityBadge } from "../../components/trust/SeverityBadge";
import {
  Mail,
  MessageSquare,
  Globe,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Info
} from "lucide-react";

const SAMPLES = {
  emailPhish: {
    sender: "security@hdfc-kyc-update.top",
    subject: "URGENT ACTION REQUIRED: NetBanking Access Suspended within 24 Hours",
    content: `Dear Valued Customer,

We detected unauthorized login attempts on your HDFC Bank NetBanking profile from IP 185.220.101.5 (Russia). To safeguard your funds, your account has been temporarily restricted.

You MUST update your PAN and complete biometric Aadhaar re-verification within 24 hours to prevent permanent account deactivation.

Click the official secure banking portal below to verify immediately:
https://hdfc-kyc-update.top/auth/verify?token=98439281

Sincerely,
HDFC Cyber Security & Compliance Cell`,
    headers: "SPF: softfail | DKIM: neutral | DMARC: fail | Return-Path: <spoofer@malicious-relay.net>"
  },
  smsPhish: {
    sender: "VK-SBIINB",
    subject: "",
    content: "SBI Alert: Rs. 98,500.00 debited from A/C XX4921 via IMPS on 30-Sep. If not you, IMMEDIATELY BLOCK transaction & claim instant refund at: http://192.168.1.105/sbi-reversal-form",
    headers: ""
  },
  urlPhish: {
    sender: "",
    subject: "",
    content: "https://paypa1-security-check.com/update-card?ref=urgent_notice",
    headers: ""
  },
  legitEmail: {
    sender: "no-reply@amazon.in",
    subject: "Your order #402-8921829-1928391 has been dispatched",
    content: `Hello Alex,

Your package containing "Logitech MX Master 3S Wireless Mouse" has been dispatched with delivery agent BlueDart (Tracking ID: BLU49281092).
Expected delivery date: Tomorrow by 8:00 PM.

You can track your package directly inside the official Amazon application.`,
    headers: "SPF: pass (ip=54.240.11.1) | DKIM: pass (domain=amazon.in) | DMARC: pass"
  }
};

export const PhishingPage: React.FC = () => {
  const [channel, setChannel] = useState<"email" | "sms" | "url">("email");
  const [sender, setSender] = useState(SAMPLES.emailPhish.sender);
  const [subject, setSubject] = useState(SAMPLES.emailPhish.subject);
  const [content, setContent] = useState(SAMPLES.emailPhish.content);
  const [headers, setHeaders] = useState(SAMPLES.emailPhish.headers);

  const analyzeMutation = useMutation({
    mutationFn: (data: any) => phishingApi.analyze(data)
  });

  const handleAnalyze = () => {
    if (!content.trim()) return;
    analyzeMutation.mutate({
      input_type: channel,
      content: content.trim(),
      headers: headers.trim() || undefined
    });
  };

  const loadPreset = (presetKey: keyof typeof SAMPLES) => {
    const p = SAMPLES[presetKey];
    if (presetKey === "smsPhish") setChannel("sms");
    else if (presetKey === "urlPhish") setChannel("url");
    else setChannel("email");

    setSender(p.sender);
    setSubject(p.subject);
    setContent(p.content);
    setHeaders(p.headers);
  };

  const rawData = analyzeMutation.data;
  const result = rawData?.data || rawData;
  const isPending = analyzeMutation.isPending;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShieldAlert className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Phishing & Social Engineering Analyzer
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Uncover targeted spear-phishing, homoglyph domain impersonation, coercive manipulation cues, and credential harvesting schemes.
          </p>
        </div>

        {/* Presets Button Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" /> Sample Scenarios:
          </span>
          <button
            onClick={() => loadPreset("emailPhish")}
            className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition"
          >
            Bank KYC Phish
          </button>
          <button
            onClick={() => loadPreset("smsPhish")}
            className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition"
          >
            Smishing SMS
          </button>
          <button
            onClick={() => loadPreset("urlPhish")}
            className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition"
          >
            Typosquat URL
          </button>
          <button
            onClick={() => loadPreset("legitEmail")}
            className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition"
          >
            Legitimate Email
          </button>
        </div>
      </div>

      {/* Main Grid: Input Form + Result Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: 7 cols */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5">
          {/* Channel selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Communication Vector
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setChannel("email")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition ${
                  channel === "email"
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Mail className="h-4 w-4" />
                Email Message
              </button>
              <button
                type="button"
                onClick={() => setChannel("sms")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition ${
                  channel === "sms"
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                SMS / Chat
              </button>
              <button
                type="button"
                onClick={() => setChannel("url")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition ${
                  channel === "url"
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Globe className="h-4 w-4" />
                Target URL
              </button>
            </div>
          </div>

          {/* Conditional inputs */}
          {channel !== "url" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {channel === "email" ? "Sender Email Address" : "Sender ID / Phone"}
                </label>
                <input
                  type="text"
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  placeholder={channel === "email" ? "e.g. alerts@bank-notice.net" : "e.g. +91 9876543210"}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {channel === "email" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Subject Line
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Urgent KYC Suspension Notice"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* Message Content */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {channel === "url" ? "Suspicious URL to Analyze" : "Message Body"}
            </label>
            <textarea
              rows={channel === "url" ? 3 : 7}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={channel === "url" ? "https://..." : "Paste full message body here..."}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs font-mono text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Headers (Email only) */}
          {channel === "email" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Raw Email Headers / Auth Results (Optional)
              </label>
              <input
                type="text"
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                placeholder="e.g. SPF: softfail | DKIM: none | DMARC: fail"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          )}

          {/* Analyze CTA */}
          <div className="pt-2">
            <button
              onClick={handleAnalyze}
              disabled={isPending || !content.trim()}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Deconstructing Threat Signals & Domain Authenticity...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Analyze Threat Vector
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Output: 5 cols */}
        <div className="lg:col-span-5 space-y-6">
          {!result && !isPending && (
            <div className="h-full min-h-[420px] bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-full">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Threat Analysis Ready
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                Select a preset or input suspicious content on the left to receive explainable risk scores and tactical remediation advice.
              </p>
            </div>
          )}

          {isPending && (
            <div className="h-full min-h-[420px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center text-center space-y-4">
              <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Executing Multi-Layer Inspection
                </h4>
                <p className="text-xs text-slate-400">
                  Checking WHOIS patterns, homoglyphs, urgency heuristics, and SPF/DKIM align.
                </p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-fadeIn">
              {/* Verdict & Score Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Overall Assessment
                    </span>
                    <div className="mt-1 flex items-center gap-2.5">
                      <VerdictBadge verdict={result.verdict || "suspicious"} />
                    </div>
                  </div>
                  <RiskScoreGauge score={Number(result.phishing_score ?? result.risk_score ?? 85)} size={140} />
                </div>

                {/* Plain English Explanation */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Info className="h-4 w-4 text-indigo-500" />
                    <span>Why is this flagged?</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {result.explanation_for_user || result.plain_english_summary || result.analysis_summary || result.why_risky || "Detected high-urgency language demanding immediate verification, paired with an unverified external destination."}
                  </p>
                </div>

                {/* Recommended Defensive Action */}
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 space-y-1.5">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                    Remediation Guideline:
                  </span>
                  <p className="text-xs text-amber-900 dark:text-amber-200 font-medium">
                    {result.recommended_actions?.[0] || result.recommended_action || "Do not click any embedded links or provide credentials. Block sender domain and escalate to Security Incident Response."}
                  </p>
                </div>
              </div>

              {/* Signals / Indicators breakdown */}
              {((result.indicators && result.indicators.length > 0) || (result.signals && result.signals.length > 0)) && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Detected Threat Indicators ({(result.indicators || result.signals).length})
                  </h4>
                  <div className="space-y-2">
                    {(result.indicators || result.signals).map((sig: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            {sig.name || sig.type || "Suspicious Signal"}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                            {sig.evidence || sig.description || sig.detail}
                          </p>
                        </div>
                        <SeverityBadge severity={sig.severity || "medium"} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
