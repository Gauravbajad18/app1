import { luhnCheck, verhoeffCheck, ibanCheck } from "./checksums";
import { DetectionItem, Severity } from "@trustshield/shared";

export interface RawFinding {
  data_type: string;
  category: string;
  raw_value: string;
  masked_value: string;
  start_offset: number;
  end_offset: number;
  confidence: number;
  severity: Severity;
  evidence: Record<string, any>;
  recommended_action: string;
}

export function maskValue(val: string, type: string): string {
  if (val.length <= 4) {
    return "****";
  }
  switch (type) {
    case "email": {
      const parts = val.split("@");
      if (parts.length === 2 && parts[0].length > 2) {
        return `${parts[0].slice(0, 2)}***@${parts[1]}`;
      }
      return `${val.slice(0, 1)}***@***`;
    }
    case "credit_card":
    case "bank_account":
    case "aadhaar": {
      const clean = val.replace(/[\s-]/g, "");
      const last4 = clean.slice(-4);
      return `****-****-${last4}`;
    }
    case "phone": {
      const last3 = val.slice(-3);
      return `***-***-${last3}`;
    }
    case "pan": {
      return `${val.slice(0, 2)}*****${val.slice(-1)}`;
    }
    case "jwt":
    case "aws_key":
    case "openai_key":
    case "github_token":
    case "google_api_key":
    case "private_key":
    case "password": {
      return `${val.slice(0, 3)}****************${val.slice(-3)}`;
    }
    default:
      return `${val.slice(0, 2)}****${val.slice(-2)}`;
  }
}

export class RegexDetector {
  /**
   * Run all deterministic regex and checksum detectors against input text.
   */
  public static detect(text: string): RawFinding[] {
    const findings: RawFinding[] = [];

    // 1. AWS Access Keys
    const awsRegex = /\b(AKIA[0-9A-Z]{16})\b/g;
    let match: RegExpExecArray | null;
    while ((match = awsRegex.exec(text)) !== null) {
      findings.push({
        data_type: "aws_key",
        category: "credentials",
        raw_value: match[1],
        masked_value: maskValue(match[1], "aws_key"),
        start_offset: match.index,
        end_offset: match.index + match[1].length,
        confidence: 0.99,
        severity: "critical",
        evidence: { pattern: "AKIA Access Key ID" },
        recommended_action: "Immediately revoke and rotate AWS credential in IAM."
      });
    }

    // 2. Google API Keys
    const googleKeyRegex = /\b(AIza[0-9A-Za-z\-_]{35})\b/g;
    while ((match = googleKeyRegex.exec(text)) !== null) {
      findings.push({
        data_type: "google_api_key",
        category: "credentials",
        raw_value: match[1],
        masked_value: maskValue(match[1], "google_api_key"),
        start_offset: match.index,
        end_offset: match.index + match[1].length,
        confidence: 0.98,
        severity: "critical",
        evidence: { prefix: "AIza" },
        recommended_action: "Revoke API key in Google Cloud Console and restrict key permissions."
      });
    }

    // 3. OpenAI Keys
    const openaiRegex = /\b(sk-[a-zA-Z0-9]{32,}|sk-proj-[a-zA-Z0-9_\-]{40,})\b/g;
    while ((match = openaiRegex.exec(text)) !== null) {
      findings.push({
        data_type: "openai_key",
        category: "credentials",
        raw_value: match[1],
        masked_value: maskValue(match[1], "openai_key"),
        start_offset: match.index,
        end_offset: match.index + match[1].length,
        confidence: 0.99,
        severity: "critical",
        evidence: { prefix: "sk-" },
        recommended_action: "Revoke OpenAI API key immediately in OpenAI dashboard."
      });
    }

    // 4. GitHub Personal Access Tokens
    const githubRegex = /\b(ghp_[0-9a-zA-Z]{36}|github_pat_[0-9a-zA-Z_]{22,})\b/g;
    while ((match = githubRegex.exec(text)) !== null) {
      findings.push({
        data_type: "github_token",
        category: "credentials",
        raw_value: match[1],
        masked_value: maskValue(match[1], "github_token"),
        start_offset: match.index,
        end_offset: match.index + match[1].length,
        confidence: 0.99,
        severity: "critical",
        evidence: { format: "GitHub PAT Token" },
        recommended_action: "Revoke token in GitHub Security Settings and check audit logs."
      });
    }

    // 5. JWT Tokens
    const jwtRegex = /\b(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g;
    while ((match = jwtRegex.exec(text)) !== null) {
      findings.push({
        data_type: "jwt",
        category: "credentials",
        raw_value: match[1],
        masked_value: maskValue(match[1], "jwt"),
        start_offset: match.index,
        end_offset: match.index + match[1].length,
        confidence: 0.95,
        severity: "high",
        evidence: { format: "JSON Web Token (RFC 7519)" },
        recommended_action: "Invalidate session and enforce token rotation."
      });
    }

    // 6. Private Keys
    const privateKeyRegex = /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g;
    while ((match = privateKeyRegex.exec(text)) !== null) {
      findings.push({
        data_type: "private_key",
        category: "credentials",
        raw_value: match[0],
        masked_value: "[REDACTED_PRIVATE_KEY]",
        start_offset: match.index,
        end_offset: match.index + match[0].length,
        confidence: 1.0,
        severity: "critical",
        evidence: { header: "PEM Encoded Private Key" },
        recommended_action: "Critical: Private cryptographic key leaked. Replace keypair immediately."
      });
    }

    // 7. Passwords in key=value / json form
    const passwordRegex = /(?:password|passwd|secret|api_key|token|auth_token)\s*[:=]\s*["']?([^\s"';,}\]]{6,})["']?/gi;
    while ((match = passwordRegex.exec(text)) !== null) {
      const passVal = match[1];
      const matchIndex = match.index + match[0].lastIndexOf(passVal);
      findings.push({
        data_type: "password",
        category: "credentials",
        raw_value: passVal,
        masked_value: maskValue(passVal, "password"),
        start_offset: matchIndex,
        end_offset: matchIndex + passVal.length,
        confidence: 0.90,
        severity: "critical",
        evidence: { context: "Assignment to credential variable" },
        recommended_action: "Remove exposed plain-text secret and rotate credential."
      });
    }

    // 8. Credit Card Numbers (with Luhn check)
    const ccRegex = /\b(?:\d{4}[ -]?){3}\d{4}\b|\b\d{13,19}\b/g;
    while ((match = ccRegex.exec(text)) !== null) {
      const candidate = match[0];
      const digitsOnly = candidate.replace(/[\s-]/g, "");
      if (digitsOnly.length >= 13 && digitsOnly.length <= 19 && luhnCheck(digitsOnly)) {
        findings.push({
          data_type: "credit_card",
          category: "financial",
          raw_value: candidate,
          masked_value: maskValue(candidate, "credit_card"),
          start_offset: match.index,
          end_offset: match.index + candidate.length,
          confidence: 0.98,
          severity: "critical",
          evidence: { luhn_valid: true, length: digitsOnly.length },
          recommended_action: "PCI-DSS breach risk: mask or redact credit card number immediately."
        });
      }
    }

    // 9. Aadhaar Numbers (12-digit UID with Verhoeff check)
    const aadhaarRegex = /\b[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}\b/g;
    while ((match = aadhaarRegex.exec(text)) !== null) {
      const candidate = match[0];
      const digitsOnly = candidate.replace(/[\s-]/g, "");
      if (digitsOnly.length === 12 && verhoeffCheck(digitsOnly)) {
        findings.push({
          data_type: "aadhaar",
          category: "government_id",
          raw_value: candidate,
          masked_value: maskValue(candidate, "aadhaar"),
          start_offset: match.index,
          end_offset: match.index + candidate.length,
          confidence: 0.99,
          severity: "critical",
          evidence: { verhoeff_valid: true, jurisdiction: "India UIDAI" },
          recommended_action: "India DPDP Act 2023 violation: Mask Aadhaar number."
        });
      }
    }

    // 10. PAN (Permanent Account Number - India)
    const panRegex = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;
    while ((match = panRegex.exec(text)) !== null) {
      findings.push({
        data_type: "pan",
        category: "government_id",
        raw_value: match[0],
        masked_value: maskValue(match[0], "pan"),
        start_offset: match.index,
        end_offset: match.index + match[0].length,
        confidence: 0.95,
        severity: "high",
        evidence: { jurisdiction: "India Income Tax Dept" },
        recommended_action: "Redact PAN to comply with Indian data privacy regulations."
      });
    }

    // 11. IBAN (International Bank Account Number with mod-97 check)
    const ibanRegex = /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}\b/g;
    while ((match = ibanRegex.exec(text)) !== null) {
      const candidate = match[0];
      if (ibanCheck(candidate)) {
        findings.push({
          data_type: "iban",
          category: "financial",
          raw_value: candidate,
          masked_value: maskValue(candidate, "iban"),
          start_offset: match.index,
          end_offset: match.index + candidate.length,
          confidence: 0.98,
          severity: "high",
          evidence: { iban_mod97_valid: true },
          recommended_action: "Mask IBAN banking details before processing."
        });
      }
    }

    // 12. Indian IFSC Code
    const ifscRegex = /\b[A-Z]{4}0[A-Z0-9]{6}\b/g;
    while ((match = ifscRegex.exec(text)) !== null) {
      findings.push({
        data_type: "ifsc",
        category: "financial",
        raw_value: match[0],
        masked_value: match[0],
        start_offset: match.index,
        end_offset: match.index + match[0].length,
        confidence: 0.90,
        severity: "medium",
        evidence: { standard: "RBI IFSC" },
        recommended_action: "Bank branch code detected. Verify authorization."
      });
    }

    // 13. Emails
    const emailRegex = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
    while ((match = emailRegex.exec(text)) !== null) {
      findings.push({
        data_type: "email",
        category: "contact_pii",
        raw_value: match[0],
        masked_value: maskValue(match[0], "email"),
        start_offset: match.index,
        end_offset: match.index + match[0].length,
        confidence: 0.95,
        severity: "medium",
        evidence: { format: "RFC 5322 email" },
        recommended_action: "Mask personal email address under GDPR / DPDP guidelines."
      });
    }

    // 14. Phone Numbers (Indian +91 and standard international)
    const phoneRegex = /(?:\+91[\s-]?)?[6-9]\d{9}\b|\b(?:\+1[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}\b/g;
    while ((match = phoneRegex.exec(text)) !== null) {
      findings.push({
        data_type: "phone",
        category: "contact_pii",
        raw_value: match[0],
        masked_value: maskValue(match[0], "phone"),
        start_offset: match.index,
        end_offset: match.index + match[0].length,
        confidence: 0.90,
        severity: "medium",
        evidence: { format: "E.164 / Indian Mobile" },
        recommended_action: "Mask telephone number to prevent contact data leakage."
      });
    }

    // 15. IP Address (IPv4 & IPv6)
    const ipv4Regex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
    while ((match = ipv4Regex.exec(text)) !== null) {
      // Ignore common localhost/private addresses if desired or flag low severity
      findings.push({
        data_type: "ip_address",
        category: "network",
        raw_value: match[0],
        masked_value: maskValue(match[0], "ip_address"),
        start_offset: match.index,
        end_offset: match.index + match[0].length,
        confidence: 0.92,
        severity: "low",
        evidence: { format: "IPv4" },
        recommended_action: "Internal network IP detected. Consider sanitizing before external sharing."
      });
    }

    // 16. Passport Numbers (Indian and standard)
    const passportRegex = /\b[A-PR-WYa-pr-wy][1-9]\d\s?\d{4}[1-9]\b|\b[A-Z]{1,2}[0-9]{7,8}\b/g;
    while ((match = passportRegex.exec(text)) !== null) {
      // Exclude if already matched as PAN or IFSC
      const val = match[0];
      const isPan = findings.some(f => f.raw_value === val && f.data_type === "pan");
      if (!isPan) {
        findings.push({
          data_type: "passport",
          category: "government_id",
          raw_value: val,
          masked_value: maskValue(val, "passport"),
          start_offset: match.index,
          end_offset: match.index + val.length,
          confidence: 0.85,
          severity: "high",
          evidence: { format: "Passport Number" },
          recommended_action: "High sensitivity identity document: Redact passport number."
        });
      }
    }

    // Sort findings by start offset ascending and deduplicate overlapping ranges
    findings.sort((a, b) => a.start_offset - b.start_offset);
    return findings;
  }
}
