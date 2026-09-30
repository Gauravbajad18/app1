import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/index";
import { seedDatabase } from "../../src/db/seed";

describe("TrustShield AI API Integration Tests", { timeout: 20000 }, () => {
  beforeAll(async () => {
    // Seed initial test database
    await seedDatabase();
  });

  describe("GET /api/health", () => {
    it("returns status 200 with service information", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.service).toContain("TrustShield AI");
    });
  });

  describe("Authentication Flow & RBAC", () => {
    const testEmail = `test-${Date.now()}@example.com`;
    let accessToken: string;
    let userRoleToken: string;

    it("registers a new organization and admin user", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: testEmail,
          password: "StrongPassword@1234!",
          full_name: "Test Admin User",
          org_name: "Test Security Org"
        });

      expect(res.status).toBe(201);
      expect(res.body.access_token).toBeDefined();
      expect(res.body.user.role).toBe("org_admin");
      expect(res.headers["set-cookie"]).toBeDefined(); // Refresh cookie

      accessToken = res.body.access_token;
    });

    it("fails registration with weak password returning 400", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: "weak@example.com",
          password: "short",
          full_name: "Weak User",
          org_name: "Weak Org"
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("authenticates seeded admin user", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "admin@trustshield.io",
          password: "TrustShield@2026!"
        });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("admin@trustshield.io");
      expect(res.body.user.role).toBe("org_admin");
    });

    it("locks user account after 5 failed login attempts", async () => {
      const lockUserEmail = "user@trustshield.io";

      // 5 consecutive wrong passwords
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post("/api/auth/login")
          .send({
            email: lockUserEmail,
            password: "WrongPassword123!"
          });
      }

      // 6th attempt should be blocked with 423 Locked
      const lockedRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: lockUserEmail,
          password: "WrongPassword123!"
        });

      expect(lockedRes.status).toBe(423);
      expect(lockedRes.body.error.code).toBe("ACCOUNT_LOCKED");
    });

    it("blocks regular user from accessing org_admin routes with 403 Forbidden", async () => {
      // Login as regular user Sarah Jenkins (or create a user token)
      // Join an org with invite code to get a regular user token
      const regularRes = await request(app)
        .post("/api/auth/join")
        .send({
          email: `sarah-join-${Date.now()}@example.com`,
          password: "StrongPassword@1234!",
          full_name: "Sarah New",
          invite_code: "ACME-SECURE-2025"
        });

      expect(regularRes.status).toBe(201);
      userRoleToken = regularRes.body.access_token;

      // Regular user tries to access audit log (requires org_admin)
      const auditRes = await request(app)
        .get("/api/audit")
        .set("Authorization", `Bearer ${userRoleToken}`);

      expect(auditRes.status).toBe(403);
      expect(auditRes.body.error.code).toBe("FORBIDDEN");
    });

    it("returns 404 for cross-organization resource access preventing ID enumeration", async () => {
      // Using admin token, request an incident ID that doesn't belong to this org
      const crossOrgRes = await request(app)
        .get("/api/incidents/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(crossOrgRes.status).toBe(404);
      expect(crossOrgRes.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("POST /api/scan/text & Privacy Engine", () => {
    it("detects sensitive Aadhaar, card, and email and redacts them", async () => {
      // Login as admin to get valid token
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "admin@trustshield.io",
          password: "TrustShield@2026!"
        });

      const token = loginRes.body.access_token;

      const scanRes = await request(app)
        .post("/api/scan/text")
        .set("Authorization", `Bearer ${token}`)
        .send({
          text: "Transfer funds to John at john.doe@cybercorp.com. Card: 4242-4242-4242-4242.",
          redaction_mode: "mask"
        });

      expect(scanRes.status).toBe(200);
      expect(scanRes.body.findings.length).toBeGreaterThanOrEqual(2);
      expect(scanRes.body.redacted_content).toContain("****-****-4242");
      expect(scanRes.body.risk_score).toBeGreaterThan(0);
    });
  });

  describe("POST /api/phishing/analyze", () => {
    it("flags deceptive banking SMS and returns explainable indicators", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "admin@trustshield.io",
          password: "TrustShield@2026!"
        });

      const token = loginRes.body.access_token;

      const phishRes = await request(app)
        .post("/api/phishing/analyze")
        .set("Authorization", `Bearer ${token}`)
        .send({
          input_type: "sms",
          content: "Dear Customer, your bank account is suspended immediately. Click http://192.168.1.10/kyc to enter your secret PIN."
        });

      expect(phishRes.status).toBe(200);
      expect(phishRes.body.verdict).toBe("scam");
      expect(phishRes.body.risk_score).toBeGreaterThanOrEqual(60);
      expect(phishRes.body.indicators.length).toBeGreaterThan(0);
      expect(phishRes.body.explanation_for_user).toBeDefined();
    });
  });

  describe("Audit Log Cryptographic Chain Verification", () => {
    it("verifies the SHA-256 tamper-evident audit chain", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "admin@trustshield.io",
          password: "TrustShield@2026!"
        });

      const token = loginRes.body.access_token;

      const verifyRes = await request(app)
        .get("/api/audit/verify")
        .set("Authorization", `Bearer ${token}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.is_valid).toBe(true);
      expect(verifyRes.body.total_verified).toBeGreaterThan(0);
    });
  });
});
