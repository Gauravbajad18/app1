import { Severity } from "@trustshield/shared";

export interface PhishingSignal {
  type: string;
  evidence: string;
  severity: Severity;
  scoreContribution: number;
}

export class PhishingDetector {
  private static URL_SHORTENERS = new Set([
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "is.gd",
    "buff.ly",
    "ow.ly",
    "rebrand.ly",
    "cutt.ly",
    "tiny.cc",
    "shorte.st"
  ]);

  private static SUSPICIOUS_TLDS = new Set([
    ".top",
    ".xyz",
    ".fit",
    ".tk",
    ".ml",
    ".ga",
    ".cf",
    ".gq",
    ".work",
    ".click",
    ".buzz",
    ".racing",
    ".cam",
    ".country",
    ".stream",
    ".download"
  ]);

  // Common Cyrillic / Greek characters frequently used in IDN homoglyph spoofing
  private static HOMOGLYPH_CHARS = /[\u0430\u0435\u043E\u0440\u0441\u0443\u0445\u0456\u0458\u03BF\u03C1]/;

  private static URGENCY_KEYWORDS = [
    { regex: /(?:account\s+(?:(?:will\s+be|has\s+been|is)\s+)?(?:suspended|restricted|locked|closed|terminated|blocked))\s+(?:within|in)?\s*\d*\s*(?:hours|hrs|minutes|mins|immediately|today)?/i, label: "Account suspension threat deadline" },
    { regex: /(?:immediate|urgent)\s+(?:action|verification|attention|response)\s+(?:is\s+)?required/i, label: "Manufactured urgency" },
    { regex: /(?:unauthorized|suspicious|fraudulent)\s+(?:activity|transaction|login|attempt)\s+detected/i, label: "Fake security alert notice" },
    { regex: /(?:verify|update|confirm)\s+(?:your\s+)?(?:kyc|identity|pan|aadhaar|account|billing)\s+(?:now|immediately|today)/i, label: "Urgent KYC verification demand" },
    { regex: /(?:legal\s+action|police\s+complaint|court\s+summons|arrest\s+warrant|penalty\s+charges)/i, label: "Legal intimidation tactic" }
  ];

  private static CREDENTIAL_PAYMENT_KEYWORDS = [
    { regex: /(?:enter|provide|confirm|verify|send|submit)\s+(?:your\s+)?(?:secret\s+|confidential\s+)?(?:password|pin|otp|cvv|code|credentials|details)/i, label: "Credential / OTP harvesting attempt" },
    { regex: /(?:wire\s+transfer|gift\s+card|crypto|bitcoin|usdt|western\s+union)/i, label: "Untraceable payment method solicitation" },
    { regex: /(?:click\s+(?:the\s+)?(?:link|here|below|url|https?:\/\/))/i, label: "Direct call-to-action click incentive" },
    { regex: /(?:you\s+(?:have\s+)?won|lottery|prize|reward|cashback|inheritance)\s+(?:of\s+[\$₹€£]|\b[0-9,]+\b)/i, label: "Advance-fee or lottery reward lure" }
  ];

  /**
   * Analyze message text and optional email headers deterministically.
   * NEVER fetches URLs or connects to internet.
   */
  public static analyze(content: string, headers?: string): {
    signals: PhishingSignal[];
    tactics: Array<"urgency" | "authority" | "fear" | "reward" | "impersonation" | "other">;
    deterministicRiskScore: number;
    extractedUrls: string[];
  } {
    const signals: PhishingSignal[] = [];
    const tacticsSet = new Set<"urgency" | "authority" | "fear" | "reward" | "impersonation" | "other">();

    // 1. Extract URLs
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
    const extractedUrls: string[] = [];
    let urlMatch: RegExpExecArray | null;
    while ((urlMatch = urlRegex.exec(content)) !== null) {
      extractedUrls.push(urlMatch[0]);
    }

    // Also look for markdown style links: [display](href)
    const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi;
    let mdMatch: RegExpExecArray | null;
    while ((mdMatch = markdownLinkRegex.exec(content)) !== null) {
      const displayText = mdMatch[1];
      const actualHref = mdMatch[2];

      // Check for mismatched link text (e.g. text says paypal.com but points elsewhere)
      if (/https?:\/\//i.test(displayText) || /www\.[a-z0-9.-]+/i.test(displayText)) {
        try {
          const displayDomain = displayText.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
          const actualDomain = new URL(actualHref).hostname.toLowerCase();
          if (displayDomain !== actualDomain && !actualDomain.endsWith("." + displayDomain)) {
            signals.push({
              type: "mismatched_display_url",
              evidence: `Display text points to '${displayDomain}' but link target is '${actualDomain}'`,
              severity: "critical",
              scoreContribution: 40
            });
            tacticsSet.add("impersonation");
          }
        } catch {
          // non-valid url format in text
        }
      }
    }

    // 2. Analyze URLs
    for (const urlStr of extractedUrls) {
      try {
        const parsed = new URL(urlStr);
        const host = parsed.hostname.toLowerCase();

        // 2a. IP-based URL
        if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) {
          signals.push({
            type: "ip_based_url",
            evidence: `URL contains raw IP address '${host}' instead of legitimate registered domain name`,
            severity: "critical",
            scoreContribution: 35
          });
          tacticsSet.add("impersonation");
        }

        // 2b. URL Shorteners
        if (this.URL_SHORTENERS.has(host)) {
          signals.push({
            type: "url_shortener",
            evidence: `URL uses shortening service '${host}' which conceals final destination`,
            severity: "medium",
            scoreContribution: 20
          });
          tacticsSet.add("other");
        }

        // 2c. Suspicious TLDs
        for (const tld of this.SUSPICIOUS_TLDS) {
          if (host.endsWith(tld)) {
            signals.push({
              type: "suspicious_tld",
              evidence: `Domain '${host}' uses top-level domain '${tld}' commonly associated with spam/phishing campaigns`,
              severity: "high",
              scoreContribution: 25
            });
            break;
          }
        }

        // 2d. Homoglyph / Punycode Check
        if (host.startsWith("xn--") || this.HOMOGLYPH_CHARS.test(host)) {
          signals.push({
            type: "homoglyph_spoofing",
            evidence: `Domain '${host}' contains non-ASCII or Punycode homoglyphs mimicking authentic brand names`,
            severity: "critical",
            scoreContribution: 45
          });
          tacticsSet.add("impersonation");
        }

        // 2e. Brand impersonation keywords in subdomain
        const subdomains = host.split(".");
        if (subdomains.length > 2) {
          const brandKeywords = ["paypal", "apple", "google", "microsoft", "chase", "bankofamerica", "netflix", "sbi", "hdfc", "amazon"];
          for (const brand of brandKeywords) {
            if (host.includes(brand) && !host.endsWith(`${brand}.com`)) {
              signals.push({
                type: "brand_keyword_spoofing",
                evidence: `Subdomain contains target brand '${brand}' on an unrelated host domain`,
                severity: "high",
                scoreContribution: 30
              });
              tacticsSet.add("impersonation");
            }
          }
        }
      } catch {
        // invalid URL string
      }
    }

    // 3. Analyze Content Urgency & Social Engineering Keywords
    for (const item of this.URGENCY_KEYWORDS) {
      if (item.regex.test(content)) {
        signals.push({
          type: "urgency_threat_keyword",
          evidence: `Indicator detected: ${item.label}`,
          severity: "high",
          scoreContribution: 20
        });
        tacticsSet.add("urgency");
        tacticsSet.add("fear");
      }
    }

    // 4. Credential & Payment Solicitation
    for (const item of this.CREDENTIAL_PAYMENT_KEYWORDS) {
      if (item.regex.test(content)) {
        signals.push({
          type: "credential_or_payment_lure",
          evidence: `Indicator detected: ${item.label}`,
          severity: "critical",
          scoreContribution: 25
        });
        tacticsSet.add("reward");
        tacticsSet.add("authority");
      }
    }

    // 5. Email Headers Analysis (if provided)
    if (headers) {
      if (/Received-SPF:\s*(?:fail|softfail)/i.test(headers) || /spf=(?:fail|softfail)/i.test(headers)) {
        signals.push({
          type: "spf_authentication_failure",
          evidence: "Email failed SPF (Sender Policy Framework) sender validation",
          severity: "high",
          scoreContribution: 30
        });
        tacticsSet.add("impersonation");
      }

      if (/dkim=(?:fail|none)/i.test(headers)) {
        signals.push({
          type: "dkim_signature_failure",
          evidence: "Email lacks valid DKIM cryptographic domain signature",
          severity: "medium",
          scoreContribution: 20
        });
        tacticsSet.add("impersonation");
      }

      if (/dmarc=fail/i.test(headers)) {
        signals.push({
          type: "dmarc_policy_failure",
          evidence: "DMARC policy alignment failed for sender domain",
          severity: "critical",
          scoreContribution: 35
        });
        tacticsSet.add("impersonation");
      }
    }

    const totalRawScore = signals.reduce((acc, curr) => acc + curr.scoreContribution, 0);
    const deterministicRiskScore = Math.min(100, totalRawScore);

    return {
      signals,
      tactics: Array.from(tacticsSet),
      deterministicRiskScore,
      extractedUrls
    };
  }
}
