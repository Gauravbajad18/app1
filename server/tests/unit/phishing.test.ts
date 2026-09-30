import { describe, it, expect } from "vitest";
import { PhishingDetector } from "../../src/services/detectors/phishingSignals";

describe("Phishing & Social Engineering Signal Detection", () => {
  it("detects IP-based URLs and manufactured urgency", () => {
    const text = "Urgent: Your account will be suspended within 24 hours. Log in at http://192.168.1.50/login to verify your password.";
    const result = PhishingDetector.analyze(text);

    expect(result.deterministicRiskScore).toBeGreaterThanOrEqual(50);
    expect(result.signals.some(s => s.type === "ip_based_url")).toBe(true);
    expect(result.signals.some(s => s.type === "urgency_threat_keyword")).toBe(true);
    expect(result.tactics).toContain("urgency");
  });

  it("detects mismatched display text and link target", () => {
    const text = "Please confirm your security settings: [https://paypal.com](http://malicious-phish-domain.xyz/auth)";
    const result = PhishingDetector.analyze(text);

    expect(result.signals.some(s => s.type === "mismatched_display_url")).toBe(true);
    expect(result.signals.some(s => s.type === "suspicious_tld")).toBe(true);
    expect(result.tactics).toContain("impersonation");
  });

  it("detects email authentication failures in headers", () => {
    const headers = "Received-SPF: fail (domain of sender does not designate permit)\r\ndkim=fail\r\ndmarc=fail";
    const text = "Important bank notice.";
    const result = PhishingDetector.analyze(text, headers);

    expect(result.signals.some(s => s.type === "spf_authentication_failure")).toBe(true);
    expect(result.signals.some(s => s.type === "dmarc_policy_failure")).toBe(true);
  });
});
