import React from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Lock,
  Bot,
  MailWarning,
  CreditCard,
  FileCheck,
  Database,
  ArrowRight,
  CheckCircle,
  Eye,
  AlertTriangle,
  Award
} from "lucide-react";

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-brand-500 selection:text-white">
      {/* Top Navbar */}
      <nav className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 shadow-md shadow-brand-500/30">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">
              TrustShield<span className="text-brand-400">.AI</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs font-semibold px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-brand-500/30 bg-brand-950/50 text-brand-300 text-xs font-semibold mb-6">
            <Shield className="h-3.5 w-3.5" />
            <span>AI Security, Privacy & Trust Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
            The Trust Layer Between <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-blue-300 to-indigo-400">People, Data & AI</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 leading-relaxed">
            Organizations adopt AI tools faster than they can secure them. TrustShield AI automatically prevents sensitive data leakage, intercepts prompt injection attacks, detects deceptive phishing, scores transaction fraud, and delivers explainable trust reports.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-lg shadow-brand-600/30 transition-all flex items-center gap-2"
            >
              <span>Deploy Command Center</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-semibold text-sm transition-all"
            >
              Sign In to Demo Workspace
            </Link>
          </div>

          {/* Seed Demo Accounts Banner */}
          <div className="mt-10 p-4 rounded-xl border border-slate-800 bg-slate-900/50 text-left max-w-xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
              <Award className="h-4 w-4 text-brand-400" /> Pre-Seeded Evaluator Accounts (Instant Login)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-300">
              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <span className="text-brand-400 font-semibold block">Org Admin (CISO):</span>
                admin@trustshield.io / ShieldAdmin@2025!
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <span className="text-indigo-400 font-semibold block">Lead SOC Analyst:</span>
                analyst@trustshield.io / ShieldAnalyst@2025!
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The 4 Problem Statements & Solutions */}
      <section className="border-t border-slate-800/80 bg-slate-900/30 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Solving the Four Connected AI Security Challenges
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Enterprise DLP tools are too expensive; single-purpose scanners lack context. TrustShield provides an integrated, affordable trust architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/60">
              <div className="h-10 w-10 rounded-lg bg-rose-950/50 border border-rose-800/50 text-rose-400 flex items-center justify-center mb-4">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">1. Sensitive Data Leakage</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Employees paste customer PII, credentials, financial data, Aadhaar, and API keys into AI tools without realizing it. TrustShield uses hybrid deterministic regex/checksum detectors plus Gemini contextual AI to catch and redact them.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/60">
              <div className="h-10 w-10 rounded-lg bg-amber-950/50 border border-amber-800/50 text-amber-400 flex items-center justify-center mb-4">
                <MailWarning className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">2. AI-Generated Phishing & Scams</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                AI makes social-engineering attacks harder to recognize. Our Phishing Analyzer evaluates homoglyphs, brand spoofing, and manipulation tactics with plain-language explanations.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/60">
              <div className="h-10 w-10 rounded-lg bg-brand-950/50 border border-brand-800/50 text-brand-400 flex items-center justify-center mb-4">
                <Bot className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">3. Prompt Injection & Jailbreaks</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Adversarial prompts can hijack LLM behavior and exfiltrate secrets. The Secure AI Gateway inspects prompts, neutralizes instructions, and applies reversible in-memory token vaults.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/60">
              <div className="h-10 w-10 rounded-lg bg-purple-950/50 border border-purple-800/50 text-purple-400 flex items-center justify-center mb-4">
                <Database className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">4. Tamper-Evident Accountability</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Security and compliance teams require immutable audit trails. Every scan, policy change, and AI decision is linked through SHA-256 cryptographic hash chaining with instant integrity verification.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold text-brand-400 uppercase tracking-widest">End-to-End Capabilities</span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
            Production-Ready AI Security Suite
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
            <Eye className="h-6 w-6 text-brand-400 mb-3" />
            <h3 className="text-sm font-bold text-white">Privacy Scanner</h3>
            <p className="mt-1 text-xs text-slate-400">
              Scan text and files (.pdf, .docx, .csv, .txt) with Verhoeff-verified Aadhaar, Luhn credit cards, PAN, and cloud credentials.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
            <Bot className="h-6 w-6 text-indigo-400 mb-3" />
            <h3 className="text-sm font-bold text-white">Secure AI Gateway</h3>
            <p className="mt-1 text-xs text-slate-400">
              Prompt firewall with reversible placeholders, DAN/jailbreak blocking, and transparent decision logging before LLM calls.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
            <MailWarning className="h-6 w-6 text-amber-400 mb-3" />
            <h3 className="text-sm font-bold text-white">Phishing Analyzer</h3>
            <p className="mt-1 text-xs text-slate-400">
              Inspect suspicious SMS, email headers, and URLs without internet execution. Identifies urgency lures and spoofed domains.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
            <CreditCard className="h-6 w-6 text-emerald-400 mb-3" />
            <h3 className="text-sm font-bold text-white">Fraud Risk Scoring</h3>
            <p className="mt-1 text-xs text-slate-400">
              Velocity, amount Z-score, and geolocation rules combined with Gemini anonymized reasoning and analyst review queue.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
            <AlertTriangle className="h-6 w-6 text-rose-400 mb-3" />
            <h3 className="text-sm font-bold text-white">SOC Incidents & Briefs</h3>
            <p className="mt-1 text-xs text-slate-400">
              Auto-created incidents for high/critical threats with AI Incident Briefs, containment checklists, and analyst collaboration.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
            <FileCheck className="h-6 w-6 text-blue-400 mb-3" />
            <h3 className="text-sm font-bold text-white">Posture Reports</h3>
            <p className="mt-1 text-xs text-slate-400">
              Date-range executive posture reports aggregating real metrics with DPDP Act 2023 and GDPR compliance mapping.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-10 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
        <p>© 2025 TrustShield AI. Built for the AI Security, Privacy & Trust Challenge.</p>
        <p className="mt-1">Powered by Google Gemini 2.5 Flash, Supabase PostgreSQL & Express TypeScript.</p>
      </footer>
    </div>
  );
};
