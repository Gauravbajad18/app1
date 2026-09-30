import { OrgRepository } from "../repositories/orgRepository";
import { UserRepository } from "../repositories/userRepository";
import { MemberRepository } from "../repositories/memberRepository";
import { PolicyRepository } from "../repositories/policyRepository";
import { ScanRepository } from "../repositories/scanRepository";
import { DetectionRepository } from "../repositories/detectionRepository";
import { IncidentRepository } from "../repositories/incidentRepository";
import { TransactionRepository } from "../repositories/transactionRepository";
import { AuditRepository } from "../repositories/auditRepository";
import pino from "pino";

const logger = pino({ name: "db-seed" });

export async function seedDatabase() {
  logger.info("Checking database seed records...");

  try {
    // 1. Organization 1: Acme Cyber Systems
    let org1 = await OrgRepository.findBySlug("acme-cyber");
    if (!org1) {
      org1 = await OrgRepository.create("Acme Cyber Systems", "acme-cyber", "ACME-SECURE-2025");
      logger.info({ org: org1.name }, "Created Organization 1");
    }

    // 2. Organization 2: FinTrust Global (To prove data isolation)
    let org2 = await OrgRepository.findBySlug("fintrust-global");
    if (!org2) {
      org2 = await OrgRepository.create("FinTrust Global", "fintrust-global", "FINTRUST-SAFE-2025");
      logger.info({ org: org2.name }, "Created Organization 2");
    }

    // 3. Seed Default Policies
    await PolicyRepository.seedDefaults(org1.id);
    await PolicyRepository.seedDefaults(org2.id);

    // 4. Create Users for Org 1
    // Org Admin
    let admin = await UserRepository.findByEmail("admin@trustshield.io");
    if (!admin) {
      admin = await UserRepository.create("admin@trustshield.io", "TrustShield@2026!", "Eleanor Vance (CISO)");
      await MemberRepository.addMember(org1.id, admin.id, "org_admin");
      logger.info("Created Admin User: admin@trustshield.io");
    } else {
      await UserRepository.updatePassword(admin.id, "TrustShield@2026!");
      await UserRepository.resetFailedLogin(admin.id);
    }

    // Analyst
    let analyst = await UserRepository.findByEmail("analyst@trustshield.io");
    if (!analyst) {
      analyst = await UserRepository.create("analyst@trustshield.io", "TrustShield@2026!", "Marcus Chen (Lead SOC Analyst)");
      await MemberRepository.addMember(org1.id, analyst.id, "analyst");
      logger.info("Created Analyst User: analyst@trustshield.io");
    } else {
      await UserRepository.updatePassword(analyst.id, "TrustShield@2026!");
      await UserRepository.resetFailedLogin(analyst.id);
    }

    // Regular User
    let regularUser = await UserRepository.findByEmail("user@trustshield.io");
    if (!regularUser) {
      regularUser = await UserRepository.create("user@trustshield.io", "TrustShield@2026!", "Sarah Jenkins (Software Engineer)");
      await MemberRepository.addMember(org1.id, regularUser.id, "user");
      logger.info("Created Regular User: user@trustshield.io");
    } else {
      await UserRepository.updatePassword(regularUser.id, "TrustShield@2026!");
      await UserRepository.resetFailedLogin(regularUser.id);
    }

    // Create Admin for Org 2 to demonstrate isolation
    let finAdmin = await UserRepository.findByEmail("admin@fintrust.io");
    if (!finAdmin) {
      finAdmin = await UserRepository.create("admin@fintrust.io", "TrustShield@2026!", "David Sterling (FinTrust CISO)");
      await MemberRepository.addMember(org2.id, finAdmin.id, "org_admin");
      logger.info("Created FinTrust Admin User: admin@fintrust.io");
    } else {
      await UserRepository.updatePassword(finAdmin.id, "TrustShield@2026!");
      await UserRepository.resetFailedLogin(finAdmin.id);
    }

    // 5. Seed Realistic Sample Scans & Detections for Org 1
    const existingScans = await ScanRepository.getScans(org1.id, 5);
    if (existingScans.scans.length === 0) {
      const sampleText = "Please process reimbursement for Marcus Chen (marcus.chen@example.com). Aadhaar: 3675 9834 1205. AWS Key: AKIAIOSFODNN7EXAMPLE. Credit Card: 4242-4242-4242-4242.";
      const sampleRedacted = "Please process reimbursement for Marcus Chen (ma***@example.com). Aadhaar: ****-****-1205. AWS Key: AKIAIOSFODNN7EXAMPLE. Credit Card: ****-****-4242.";

      const scan1 = await ScanRepository.createScan({
        organization_id: org1.id,
        user_id: regularUser.id,
        source: "text",
        content: sampleText,
        redacted_content: sampleRedacted,
        risk_score: 85,
        severity: "critical",
        model: "hybrid-engine"
      });

      const detections = await DetectionRepository.createDetections(org1.id, scan1.id, regularUser.id, [
        {
          category: "government_id",
          data_type: "aadhaar",
          detector: "rule",
          masked_value: "****-****-1205",
          start_offset: 75,
          end_offset: 94,
          confidence: 0.99,
          severity: "critical",
          evidence: { verhoeff_valid: true },
          recommended_action: "India DPDP Act 2023 violation: Mask Aadhaar number."
        },
        {
          category: "credentials",
          data_type: "aws_key",
          detector: "rule",
          masked_value: "AKI****************LE",
          start_offset: 105,
          end_offset: 125,
          confidence: 0.99,
          severity: "critical",
          evidence: { pattern: "AKIA Access Key ID" },
          recommended_action: "Immediately revoke and rotate AWS credential in IAM."
        },
        {
          category: "financial",
          data_type: "credit_card",
          detector: "rule",
          masked_value: "****-****-5678",
          start_offset: 140,
          end_offset: 159,
          confidence: 0.98,
          severity: "critical",
          evidence: { luhn_valid: true },
          recommended_action: "PCI-DSS breach risk: mask or redact credit card number."
        }
      ]);

      // Seed high-severity SOC incident linked to scan1
      await IncidentRepository.createIncident({
        organization_id: org1.id,
        title: "Critical Exposure: Aadhaar, AWS Credentials & Credit Card in Support Chat",
        description: "Multiple critical sensitive identifiers leaked in employee prompt payload. Automatic containment triggered by TrustShield.",
        source_type: "privacy_scan",
        severity: "critical",
        status: "investigating",
        assignee_id: analyst.id,
        created_by: admin.id,
        detection_ids: detections.map(d => d.id),
        ai_brief: {
          summary: "Multi-category sensitive data exposure including cloud infrastructure secrets and financial PII.",
          likely_impact: "Unauthorized AWS account takeover, fraudulent financial charges, and regulatory penalty under DPDP Act 2023.",
          containment_steps: [
            "Revoke AWS Access Key AKIAIOSFODNN7EXAMPLE immediately in AWS IAM.",
            "Contact issuing bank to place fraud alert on card ending in 5678.",
            "Audit cloud trails for any unauthorized access originating from this key."
          ],
          root_cause_hypotheses: [
            "Employee inadvertently copy-pasted raw deployment configuration snippet into internal support ticket.",
            "Lack of prompt filtering on developer terminal."
          ],
          severity_assessment: "critical"
        }
      });

      // 6. Seed Sample Transactions & Fraud Scores
      const tx1 = await TransactionRepository.createTransaction({
        organization_id: org1.id,
        uploaded_by: analyst.id,
        external_ref: "TX-98421",
        amount: 14500.0,
        currency: "USD",
        merchant: "Apex Electronics Online",
        category: "electronics",
        country: "NG",
        channel: "web_checkout",
        account_id: "ACC-872134",
        device_id: "DEV-UNKNOWN-889"
      });

      await TransactionRepository.saveFraudScore({
        organization_id: org1.id,
        transaction_id: tx1.id,
        score: 88,
        risk_level: "critical",
        triggered_rules: [
          { rule_id: "RULE_EXCESSIVE_AMOUNT", rule_name: "Excessive Transaction Amount", severity: "high", score_delta: 25 },
          { rule_id: "RULE_NEW_DEVICE", rule_name: "Unrecognized Device Fingerprint", severity: "medium", score_delta: 20 },
          { rule_id: "RULE_CROSS_BORDER_ANOMALY", rule_name: "Unusual Geographic Origin", severity: "high", score_delta: 30 }
        ],
        ai_reasoning: "High-risk transaction: $14,500 electronics purchase from an unrecognized device in Nigeria, deviating substantially from standard historical profile.",
        review_status: "pending"
      });

      // 7. Seed Hash-Chained Audit Logs
      await AuditRepository.logAction({
        organization_id: org1.id,
        actor_user_id: admin.id,
        action: "ORGANIZATION_INITIALIZED",
        resource_type: "organization",
        resource_id: org1.id,
        metadata: { seed_version: "1.0.0" }
      });

      await AuditRepository.logAction({
        organization_id: org1.id,
        actor_user_id: admin.id,
        action: "POLICIES_CONFIGURED",
        resource_type: "policy",
        metadata: { enforcement_mode: "strict" }
      });

      logger.info("Successfully seeded demo scans, incidents, fraud transactions, and audit records for Acme Cyber Systems.");
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, "Notice: Database seed completed with warnings.");
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
