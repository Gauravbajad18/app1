# TrustShield AI — Official 3-5 Minute Live Demonstration Script

This timed walkthrough is designed for hackathon judges, technical evaluators, and security architects reviewing TrustShield AI.

---

## ⏱️ Timeline Overview

| Timestamp | Module | Core Highlight |
| :--- | :--- | :--- |
| **0:00 - 0:30** | System Overview & Authentication | Role-based login (`admin@trustshield.io`), dark mode console, threat metrics |
| **0:30 - 1:30** | Sensitive Data & Privacy Scanner | Aadhaar Verhoeff & Card Luhn checksums, AWS secrets, side-by-side diff viewer |
| **1:30 - 2:30** | Secure AI Gateway & Firewall | Real-time prompt firewall, DAN jailbreak block, PII pre-masking before Gemini |
| **2:30 - 3:15** | Phishing & Social Engineering | Banking KYC SMS & Typosquat URL deconstruction, homoglyphs, plain-English advice |
| **3:15 - 4:00** | Fraud Scoring & Analyst Queue | Transaction velocity & Z-score evaluation, triage modal with mandatory audit note |
| **4:00 - 4:45** | AI Incident Brief & Posture Reports | Autonomous Gemini containment checklists, 72h GDPR countdown, posture scorecard |
| **4:45 - 5:00** | Tamper-Evident SHA-256 Ledger | Live cryptographic hash chain validation from Genesis block |

---

## 🎬 Step-by-Step Walkthrough Script

### Act 1: Authentication & Security Dashboard (0:00 - 0:30)
1. **Navigate:** Open [http://localhost:5173](http://localhost:5173).
2. **Action:** Click **"Open Security Console"** or **"Sign In"**.
3. **Credentials:**
   - Email: `admin@trustshield.io`
   - Password: `TrustShield@2026!`
4. **Talking Point:**
   > *"TrustShield AI enforces in-memory JWT access token handling with rotating httpOnly refresh cookies. The dashboard provides immediate situational awareness across intercepted sensitive data, blocked prompt injections, pending fraud reviews, and open compliance incidents."*

---

### Act 2: Sensitive Data Scanner & Precision Checksums (0:30 - 1:30)
1. **Navigate:** Click **"Privacy Scanner"** in the sidebar.
2. **Action 1 (Preset):** Click the preset button **"Employee PII"**.
   - Notice the input loads Rajesh Kumar Sharma with an Aadhaar number and PAN.
   - Click **"Scan for Sensitive Data"**.
3. **Observation:**
   - Shows Aadhaar detected via **UIDAI Verhoeff Checksum** (confidence: 100%).
   - Shows PAN detected via **Regex + Verification** (confidence: 98%).
   - Click the eye icon next to the snippet to reveal/mask the raw values.
4. **Action 2 (Sanitization Diff):**
   - Scroll down to the **Redaction Diff Viewer**.
   - Toggle between **Split**, **Redacted**, and **Original** views.
   - Click **"Download Sanitized .txt"** to demonstrate clean file export.
5. **Action 3 (Developer Secrets):**
   - Click preset **"Dev Secrets"** (contains AWS Key, OpenAI Key, Gemini Key, DB URL).
   - Click **"Scan for Sensitive Data"**.
   - Observe immediate **Critical** severity ratings and automatic `block` policy action.

---

### Act 3: Secure AI Gateway & Prompt Firewall (1:30 - 2:30)
1. **Navigate:** Click **"AI Prompt Gateway"** in the sidebar.
2. **Action 1 (Malicious Jailbreak):**
   - Click the preset prompt: **"Prompt Injection"** (*"SYSTEM OVERRIDE: Ignore all previous instructions..."*).
   - Click **"Inspect & Send"**.
3. **Observation:**
   - The message is immediately intercepted by the firewall.
   - Red banner displays: **"Prompt Blocked by Firewall Perimeter"**.
   - Decision badge shows: `BLOCKED` (Risk: 95%). Downstream LLM inference was completely averted.
4. **Action 2 (PII Pre-Masking):**
   - Click preset prompt: **"PII Infiltration"** (*"Draft confirmation for Rajesh Kumar with Aadhaar..."*).
   - Click **"Inspect & Send"**.
5. **Observation:**
   - Decision badge shows: `MASKED & FORWARDED`.
   - The firewall sanitized sensitive identifiers before forwarding to Gemini 2.5 Flash.
   - Gemini responds to the sanitized prompt without ever seeing the customer's raw Aadhaar or PAN.

---

### Act 4: Phishing & Scam Analyzer (2:30 - 3:15)
1. **Navigate:** Click **"Phishing Analyzer"** in the sidebar.
2. **Action:** Click sample scenario: **"Bank KYC Phish"** or **"Smishing SMS"**.
   - Click **"Analyze Threat Vector"**.
3. **Observation:**
   - Risk score gauge animates to **88 / 100 (Critical Risk)**.
   - Plain-English card explains: *"Why is this flagged? High-urgency intimidation demanding PAN biometric verification within 24 hours, paired with an untrusted top-level domain."*
   - Tactical remediation advises blocking sender domain and escalating to Incident Response.

---

### Act 5: Fraud Engine & Analyst Review Queue (3:15 - 4:00)
1. **Navigate:** Click **"Fraud Risk Engine"** in the sidebar.
2. **Action 1 (Single Evaluation):** Click preset **"High Risk Anomaly"** and click **"Evaluate Risk Score"**.
   - Notice rule evaluations: velocity rule triggered, unrecognized device flagged, and high-amount Z-score deviation.
3. **Action 2 (Analyst Queue):** Click **"Open Analyst Review Queue"** (or in sidebar under Fraud).
   - Select the pending high-risk transaction.
   - Review transaction attributes in the triage modal.
   - Enter mandatory audit note: *"Verified suspicious IP from foreign jurisdiction; escalated to Tier 2."*
   - Click **"Submit Formal Disposition"**.

---

### Act 6: Incident Containment & AI Brief (4:00 - 4:45)
1. **Navigate:** Click **"Incidents"** in the sidebar.
2. **Action:** Click into **"Mass PII exfiltration attempt detected"** (INC-...).
3. **Observation:**
   - Click **"Generate AI Brief"**.
   - Gemini 2.5 Flash synthesizes root cause analysis, statutory notification countdowns (6-hour CERT-In deadline / 72-hour GDPR supervisory notification), and interactive containment checkboxes.
   - Check off containment items to mark mitigation progress.

---

### Act 7: Tamper-Evident SHA-256 Audit Log (4:45 - 5:00)
1. **Navigate:** Click **"Audit Log"** in the sidebar.
2. **Action:** Click the top-right button **"Verify Chain Integrity"**.
3. **Observation:**
   - Green banner appears: **"Cryptographic Hash Chain Verified (100% Intact)"**.
   - Proves every single scan, prompt block, and triage decision is mathematically sealed in chronological order using canonical SHA-256 hashing.
   - Click **"Inspect"** on any block to view the raw cryptographic payload and preceding hash link.

---

## 🏆 Summary Checklist for Judges

- [x] **Zero Mocks:** Real algorithmic regex, Luhn, Verhoeff, and Google Gemini 2.5 Flash integration.
- [x] **Security-First Architecture:** In-memory tokens, rotating refresh cookies, fail-fast Zod validation, RLS multi-tenancy.
- [x] **Enterprise Aesthetics:** Professional dark navy/slate palette, animated gauges, explainable trust panels, and print-ready posture reports.
- [x] **Verifiable Integrity:** Cryptographically chained audit ledger with live client-side validation.
