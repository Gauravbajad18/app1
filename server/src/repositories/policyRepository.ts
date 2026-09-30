import { query } from "../db";
import { PolicyAction, PolicyItem } from "@trustshield/shared";

export interface PolicyRecord {
  id: string;
  organization_id: string;
  data_type: string;
  gateway_action: PolicyAction;
  scanner_action: PolicyAction;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_POLICIES: PolicyItem[] = [
  { data_type: "credit_card", gateway_action: "block", scanner_action: "mask" },
  { data_type: "private_key", gateway_action: "block", scanner_action: "mask" },
  { data_type: "password", gateway_action: "block", scanner_action: "mask" },
  { data_type: "aws_key", gateway_action: "block", scanner_action: "mask" },
  { data_type: "openai_key", gateway_action: "block", scanner_action: "mask" },
  { data_type: "github_token", gateway_action: "block", scanner_action: "mask" },
  { data_type: "google_api_key", gateway_action: "block", scanner_action: "mask" },
  { data_type: "jwt", gateway_action: "mask", scanner_action: "mask" },
  { data_type: "aadhaar", gateway_action: "mask", scanner_action: "mask" },
  { data_type: "pan", gateway_action: "mask", scanner_action: "mask" },
  { data_type: "iban", gateway_action: "mask", scanner_action: "mask" },
  { data_type: "bank_account", gateway_action: "mask", scanner_action: "mask" },
  { data_type: "passport", gateway_action: "mask", scanner_action: "mask" },
  { data_type: "email", gateway_action: "mask", scanner_action: "mask" },
  { data_type: "phone", gateway_action: "mask", scanner_action: "mask" },
  { data_type: "ip_address", gateway_action: "allow", scanner_action: "mask" },
  { data_type: "person_name", gateway_action: "mask", scanner_action: "mask" },
  { data_type: "health", gateway_action: "mask", scanner_action: "mask" },
  { data_type: "financial", gateway_action: "mask", scanner_action: "mask" },
  { data_type: "credential", gateway_action: "block", scanner_action: "mask" },
  { data_type: "confidential_business", gateway_action: "mask", scanner_action: "mask" }
];

export class PolicyRepository {
  public static async getPolicies(organizationId: string): Promise<PolicyRecord[]> {
    const res = await query<PolicyRecord>(
      `SELECT * FROM privacy_policies WHERE organization_id = $1 ORDER BY data_type ASC`,
      [organizationId]
    );

    // If org has no policies initialized, seed default policies
    if (res.rows.length === 0) {
      await this.seedDefaults(organizationId);
      const seeded = await query<PolicyRecord>(
        `SELECT * FROM privacy_policies WHERE organization_id = $1 ORDER BY data_type ASC`,
        [organizationId]
      );
      return seeded.rows;
    }

    return res.rows;
  }

  public static async seedDefaults(organizationId: string): Promise<void> {
    for (const item of DEFAULT_POLICIES) {
      await query(
        `INSERT INTO privacy_policies (organization_id, data_type, gateway_action, scanner_action)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (organization_id, data_type) DO NOTHING`,
        [organizationId, item.data_type, item.gateway_action, item.scanner_action]
      );
    }
  }

  public static async upsertPolicy(
    organizationId: string,
    item: PolicyItem
  ): Promise<PolicyRecord> {
    const res = await query<PolicyRecord>(
      `INSERT INTO privacy_policies (organization_id, data_type, gateway_action, scanner_action)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (organization_id, data_type)
       DO UPDATE SET gateway_action = EXCLUDED.gateway_action,
                     scanner_action = EXCLUDED.scanner_action,
                     updated_at = NOW()
       RETURNING *`,
      [organizationId, item.data_type, item.gateway_action, item.scanner_action]
    );
    return res.rows[0];
  }

  public static async getPolicyForType(
    organizationId: string,
    dataType: string
  ): Promise<PolicyRecord | null> {
    const res = await query<PolicyRecord>(
      `SELECT * FROM privacy_policies WHERE organization_id = $1 AND data_type = $2`,
      [organizationId, dataType]
    );
    return res.rows[0] || null;
  }
}
