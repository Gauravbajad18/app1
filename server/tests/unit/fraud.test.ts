import { describe, it, expect } from "vitest";
import { FraudRuleEngine, TransactionRecord } from "../../src/services/fraud/fraudEngine";

describe("Fraud Rule Engine", () => {
  it("flags transactions during odd hours and excessive amounts", () => {
    const tx: TransactionRecord = {
      amount: 15000.0,
      currency: "USD",
      merchant: "Luxury Jewelers",
      category: "jewelry",
      country: "US",
      channel: "web",
      account_id: "ACC-001",
      device_id: "DEV-001",
      occurred_at: "2026-03-15T03:30:00Z" // 3:30 AM
    };

    const result = FraudRuleEngine.evaluate(tx, []);
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.triggered_rules.some(r => r.rule_id === "RULE_ODD_HOURS")).toBe(true);
    expect(result.triggered_rules.some(r => r.rule_id === "RULE_EXCESSIVE_AMOUNT")).toBe(true);
  });

  it("detects rapid duplicate transactions", () => {
    const pastTx: TransactionRecord = {
      amount: 450.0,
      currency: "USD",
      merchant: "Digital Store",
      category: "digital",
      country: "US",
      channel: "app",
      account_id: "ACC-002",
      device_id: "DEV-002",
      occurred_at: "2026-03-15T12:00:00Z"
    };

    const currentTx: TransactionRecord = {
      amount: 450.0,
      currency: "USD",
      merchant: "Digital Store",
      category: "digital",
      country: "US",
      channel: "app",
      account_id: "ACC-002",
      device_id: "DEV-002",
      occurred_at: "2026-03-15T12:05:00Z" // 5 minutes later
    };

    const result = FraudRuleEngine.evaluate(currentTx, [pastTx]);
    expect(result.triggered_rules.some(r => r.rule_id === "RULE_DUPLICATE_TX")).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(35);
  });

  it("detects statistical amount outliers (Z-Score > 3.0)", () => {
    // Normal history of around $50
    const history: TransactionRecord[] = Array.from({ length: 10 }, (_, i) => ({
      amount: 50 + (i % 5),
      currency: "USD",
      merchant: "Grocery",
      category: "food",
      country: "US",
      channel: "pos",
      account_id: "ACC-003",
      device_id: "DEV-003",
      occurred_at: new Date(Date.now() - (i + 1) * 3600000).toISOString()
    }));

    const anomalousTx: TransactionRecord = {
      amount: 3500.0, // massive spike
      currency: "USD",
      merchant: "Unknown Merchant",
      category: "electronics",
      country: "US",
      channel: "web",
      account_id: "ACC-003",
      device_id: "DEV-003"
    };

    const result = FraudRuleEngine.evaluate(anomalousTx, history);
    expect(result.triggered_rules.some(r => r.rule_id === "RULE_STATISTICAL_OUTLIER")).toBe(true);
    expect(result.risk_level).toBe("critical");
  });
});
