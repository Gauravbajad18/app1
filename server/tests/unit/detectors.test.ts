import { describe, it, expect } from "vitest";
import { luhnCheck, verhoeffCheck, ibanCheck, generateVerhoeffChecksum } from "../../src/services/detectors/checksums";
import { RegexDetector } from "../../src/services/detectors/regex";

describe("Deterministic Checksums & Regex Detectors", () => {
  describe("Luhn Checksum", () => {
    it("validates authentic credit card numbers", () => {
      expect(luhnCheck("4242424242424242")).toBe(true); // Visa
      expect(luhnCheck("4242-4242-4242-4242")).toBe(true);
    });

    it("rejects invalid credit card numbers", () => {
      expect(luhnCheck("4532015012345679")).toBe(false);
      expect(luhnCheck("1234567812345678")).toBe(false);
      expect(luhnCheck("invalid")).toBe(false);
    });
  });

  describe("Verhoeff Checksum (Aadhaar UIDAI)", () => {
    it("validates 12-digit Aadhaar with correct Verhoeff checksum", () => {
      // 3675 9834 120 + checksum
      const base11 = "36759834120";
      const checksum = generateVerhoeffChecksum(base11);
      const validAadhaar = base11 + checksum;
      expect(verhoeffCheck(validAadhaar)).toBe(true);
      expect(verhoeffCheck(`3675-9834-120${checksum}`)).toBe(true);
    });

    it("rejects invalid Aadhaar numbers", () => {
      expect(verhoeffCheck("367598341209")).toBe(false);
      expect(verhoeffCheck("012345678901")).toBe(false); // starts with 0
      expect(verhoeffCheck("112345678901")).toBe(false); // starts with 1
      expect(verhoeffCheck("123")).toBe(false);
    });
  });

  describe("IBAN Mod-97 Checksum", () => {
    it("validates genuine IBAN numbers", () => {
      expect(ibanCheck("GB82WEST12345698765432")).toBe(true);
    });

    it("rejects altered or malformed IBAN numbers", () => {
      expect(ibanCheck("GB82WEST12345698765433")).toBe(false);
      expect(ibanCheck("INVALID")).toBe(false);
    });
  });

  describe("RegexDetector Multi-Category Engine", () => {
    it("detects emails and phone numbers", () => {
      const text = "Contact Alice at alice.smith@security.org or call +91 9876543210 regarding the audit.";
      const findings = RegexDetector.detect(text);

      const emailFinding = findings.find(f => f.data_type === "email");
      const phoneFinding = findings.find(f => f.data_type === "phone");

      expect(emailFinding).toBeDefined();
      expect(emailFinding?.masked_value).toContain("***@");

      expect(phoneFinding).toBeDefined();
      expect(phoneFinding?.masked_value).toContain("***");
    });

    it("detects Indian PAN card numbers", () => {
      const text = "Tax declaration submitted with PAN ABCDE1234F.";
      const findings = RegexDetector.detect(text);
      const panFinding = findings.find(f => f.data_type === "pan");

      expect(panFinding).toBeDefined();
      expect(panFinding?.severity).toBe("high");
      expect(panFinding?.masked_value).toBe("AB*****F");
    });

    it("detects cloud credentials, OpenAI keys, and JWTs", () => {
      const text = `
        AWS_KEY=AKIAIOSFODNN7EXAMPLE
        OPENAI=sk-proj-abcde1234567890fghij1234567890klmno1234567890
        TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
      `;
      const findings = RegexDetector.detect(text);

      expect(findings.some(f => f.data_type === "aws_key" && f.severity === "critical")).toBe(true);
      expect(findings.some(f => f.data_type === "openai_key" && f.severity === "critical")).toBe(true);
      expect(findings.some(f => f.data_type === "jwt" && f.severity === "high")).toBe(true);
    });

    it("detects private cryptographic keys and passwords in assignment format", () => {
      const text = `
        db_password = "SuperSecretPassword123!"
        -----BEGIN RSA PRIVATE KEY-----
        MIIEowIBAAKCAQEA0Y1+examplekeydata...
        -----END RSA PRIVATE KEY-----
      `;
      const findings = RegexDetector.detect(text);

      expect(findings.some(f => f.data_type === "password")).toBe(true);
      expect(findings.some(f => f.data_type === "private_key" && f.severity === "critical")).toBe(true);
    });
  });
});
