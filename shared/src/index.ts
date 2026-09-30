import { z } from "zod";

// ==========================================
// 1. Roles & Core Enums
// ==========================================
export const UserRoleSchema = z.enum(["user", "analyst", "org_admin"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const SeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const ScanSourceSchema = z.enum(["text", "file", "gateway", "phishing", "fraud"]);
export type ScanSource = z.infer<typeof ScanSourceSchema>;

export const DetectorTypeSchema = z.enum(["rule", "ai", "hybrid"]);
export type DetectorType = z.infer<typeof DetectorTypeSchema>;

export const PolicyActionSchema = z.enum(["allow", "mask", "block"]);
export type PolicyAction = z.infer<typeof PolicyActionSchema>;

export const RedactionModeSchema = z.enum(["mask", "tokenize", "remove"]);
export type RedactionMode = z.infer<typeof RedactionModeSchema>;

export const PhishingVerdictSchema = z.enum(["safe", "suspicious", "phishing", "scam"]);
export type PhishingVerdict = z.infer<typeof PhishingVerdictSchema>;

export const FraudReviewStatusSchema = z.enum(["pending", "approved", "rejected", "escalated"]);
export type FraudReviewStatus = z.infer<typeof FraudReviewStatusSchema>;

export const IncidentStatusSchema = z.enum(["open", "investigating", "contained", "resolved", "false_positive"]);
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;

export const IncidentSourceSchema = z.enum(["privacy_scan", "prompt_firewall", "phishing", "fraud", "manual"]);
export type IncidentSource = z.infer<typeof IncidentSourceSchema>;

export const FeedbackVerdictSchema = z.enum(["correct", "false_positive", "missed"]);
export type FeedbackVerdict = z.infer<typeof FeedbackVerdictSchema>;

// Supported Data Types for Scanner & Firewall Policies
export const DataTypeSchema = z.enum([
  "email",
  "phone",
  "aadhaar",
  "pan",
  "credit_card",
  "iban",
  "ifsc",
  "bank_account",
  "passport",
  "ip_address",
  "aws_key",
  "openai_key",
  "github_token",
  "google_api_key",
  "jwt",
  "private_key",
  "password",
  "person_name",
  "address",
  "health",
  "financial",
  "credential",
  "confidential_business",
  "government_id",
  "other"
]);
export type DataType = z.infer<typeof DataTypeSchema>;

// Password validation regex: min 10 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character
export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{10,}$/;

// ==========================================
// 2. Authentication Schemas
// ==========================================
export const RegisterSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters long")
    .regex(
      passwordRegex,
      "Password must contain uppercase, lowercase, number, and special character"
    ),
  full_name: z.string().min(2, "Full name must be at least 2 characters").max(100),
  org_name: z.string().min(2, "Organization name must be at least 2 characters").max(100)
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const JoinOrgSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters long")
    .regex(
      passwordRegex,
      "Password must contain uppercase, lowercase, number, and special character"
    ),
  full_name: z.string().min(2, "Full name must be at least 2 characters").max(100),
  invite_code: z.string().min(6, "Invite code must be at least 6 characters").max(64)
});
export type JoinOrgInput = z.infer<typeof JoinOrgSchema>;

export const ChangePasswordSchema = z.object({
  current_password: z.string().min(1, "Current password is required"),
  new_password: z
    .string()
    .min(10, "New password must be at least 10 characters")
    .regex(
      passwordRegex,
      "New password must contain uppercase, lowercase, number, and special character"
    )
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export const UpdateMemberRoleSchema = z.object({
  role: UserRoleSchema
});
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;

// ==========================================
// 3. Privacy Scanner Schemas
// ==========================================
export const ScanTextSchema = z.object({
  text: z.string().min(1, "Text content is required").max(50000, "Text exceeds maximum limit of 50,000 characters"),
  redaction_mode: RedactionModeSchema.default("mask")
});
export type ScanTextInput = z.infer<typeof ScanTextSchema>;

export const ScanFileMetaSchema = z.object({
  redaction_mode: RedactionModeSchema.default("mask")
});
export type ScanFileMetaInput = z.infer<typeof ScanFileMetaSchema>;

export const DetectionItemSchema = z.object({
  id: z.string().optional(),
  category: z.string(),
  data_type: z.string(),
  detector: DetectorTypeSchema,
  masked_value: z.string(),
  start_offset: z.number().int().min(0),
  end_offset: z.number().int().min(0),
  confidence: z.number().min(0).max(1),
  severity: SeveritySchema,
  evidence: z.record(z.any()).optional(),
  recommended_action: z.string()
});
export type DetectionItem = z.infer<typeof DetectionItemSchema>;

export const ScanResultResponseSchema = z.object({
  scan_id: z.string(),
  risk_score: z.number().min(0).max(100),
  severity: SeveritySchema,
  findings: z.array(DetectionItemSchema),
  redacted_content: z.string(),
  original_length: z.number(),
  redacted_length: z.number(),
  ai_status: z.enum(["success", "unavailable", "bypassed", "quota_exceeded"]),
  summary: z.string().optional(),
  recommended_actions: z.array(z.string()).optional()
});
export type ScanResultResponse = z.infer<typeof ScanResultResponseSchema>;

export const DetectionFeedbackSchema = z.object({
  verdict: FeedbackVerdictSchema,
  note: z.string().max(1000).optional()
});
export type DetectionFeedbackInput = z.infer<typeof DetectionFeedbackSchema>;

// ==========================================
// 4. Secure AI Gateway Schemas
// ==========================================
export const CreateConversationSchema = z.object({
  title: z.string().max(200).optional()
});
export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;

export const GatewayMessageSchema = z.object({
  content: z.string().min(1, "Prompt cannot be empty").max(10000, "Prompt exceeds 10,000 characters")
});
export type GatewayMessageInput = z.infer<typeof GatewayMessageSchema>;

export const FirewallDecisionSchema = z.object({
  allowed: z.boolean(),
  action_taken: z.enum(["allowed", "masked", "blocked"]),
  block_reason: z.string().optional(),
  injection_detected: z.boolean(),
  jailbreak_detected: z.boolean(),
  injection_risk_score: z.number().min(0).max(100),
  detected_tactics: z.array(z.string()),
  masked_findings_count: z.number(),
  findings: z.array(DetectionItemSchema),
  explanation: z.string()
});
export type FirewallDecision = z.infer<typeof FirewallDecisionSchema>;

// ==========================================
// 5. Phishing & Scam Analyzer Schemas
// ==========================================
export const PhishingInputSchema = z.object({
  input_type: z.enum(["email", "sms", "url"]),
  content: z.string().min(1, "Content is required").max(30000, "Content exceeds 30,000 characters"),
  headers: z.string().max(20000).optional()
});
export type PhishingInput = z.infer<typeof PhishingInputSchema>;

export const PhishingIndicatorSchema = z.object({
  type: z.string(),
  evidence: z.string(),
  severity: SeveritySchema
});
export type PhishingIndicator = z.infer<typeof PhishingIndicatorSchema>;

export const PhishingAnalysisResponseSchema = z.object({
  scan_id: z.string(),
  verdict: PhishingVerdictSchema,
  risk_score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  indicators: z.array(PhishingIndicatorSchema),
  manipulation_tactics: z.array(
    z.enum(["urgency", "authority", "fear", "reward", "impersonation", "other"])
  ),
  explanation_for_user: z.string(),
  recommended_actions: z.array(z.string()),
  deterministic_signals: z.array(z.string()),
  ai_status: z.enum(["success", "unavailable", "bypassed"])
});
export type PhishingAnalysisResponse = z.infer<typeof PhishingAnalysisResponseSchema>;

// ==========================================
// 6. Fraud Risk Scoring Schemas
// ==========================================
export const TransactionSchema = z.object({
  external_ref: z.string().max(100).optional(),
  amount: z.number().positive("Amount must be greater than zero"),
  currency: z.string().min(3).max(3).default("USD"),
  merchant: z.string().min(1).max(150),
  category: z.string().min(1).max(100),
  country: z.string().min(2).max(3),
  channel: z.string().min(1).max(50),
  account_id: z.string().min(1).max(100),
  device_id: z.string().min(1).max(100),
  occurred_at: z.string().datetime().optional()
});
export type TransactionInput = z.infer<typeof TransactionSchema>;

export const FraudReviewSchema = z.object({
  review_status: z.enum(["approved", "rejected", "escalated"]),
  review_note: z.string().min(3, "Review note is required (min 3 chars)").max(1000)
});
export type FraudReviewInput = z.infer<typeof FraudReviewSchema>;

// ==========================================
// 7. Incident Management Schemas
// ==========================================
export const IncidentCreateSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().min(5, "Description must be at least 5 characters").max(5000),
  severity: SeveritySchema,
  source_type: IncidentSourceSchema,
  assignee_id: z.string().uuid().optional().nullable(),
  detection_ids: z.array(z.string().uuid()).optional()
});
export type IncidentCreateInput = z.infer<typeof IncidentCreateSchema>;

export const IncidentUpdateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(5).max(5000).optional(),
  severity: SeveritySchema.optional(),
  status: IncidentStatusSchema.optional(),
  assignee_id: z.string().uuid().optional().nullable()
});
export type IncidentUpdateInput = z.infer<typeof IncidentUpdateSchema>;

export const IncidentCommentSchema = z.object({
  body: z.string().min(1, "Comment body cannot be empty").max(2000)
});
export type IncidentCommentInput = z.infer<typeof IncidentCommentSchema>;

// ==========================================
// 8. Privacy Policy Engine Schemas
// ==========================================
export const PolicyItemSchema = z.object({
  data_type: DataTypeSchema,
  gateway_action: PolicyActionSchema,
  scanner_action: PolicyActionSchema
});
export type PolicyItem = z.infer<typeof PolicyItemSchema>;

export const PolicyUpdateSchema = z.object({
  policies: z.array(PolicyItemSchema),
  auto_incident_threshold: SeveritySchema.optional(),
  data_retention_days: z.number().int().min(1).max(365).optional(),
  store_raw_content: z.boolean().optional(),
  ai_daily_limit_per_user: z.number().int().min(10).max(10000).optional()
});
export type PolicyUpdateInput = z.infer<typeof PolicyUpdateSchema>;

// ==========================================
// 9. Posture Report Schemas
// ==========================================
export const ReportRequestSchema = z.object({
  period_start: z.string().datetime(),
  period_end: z.string().datetime(),
  title: z.string().max(200).optional()
});
export type ReportRequestInput = z.infer<typeof ReportRequestSchema>;

// ==========================================
// 10. AI JSON Output Schemas (Validated with Zod)
// ==========================================
export const AIPrivacyFindingSchema = z.object({
  data_type: z.string(),
  text_snippet_masked: z.string(),
  start_offset: z.number().int().min(0),
  end_offset: z.number().int().min(0),
  confidence: z.number().min(0).max(1),
  severity: SeveritySchema,
  reason: z.string()
});

export const AIPrivacyAnalysisOutputSchema = z.object({
  findings: z.array(AIPrivacyFindingSchema),
  overall_risk_score: z.number().min(0).max(100),
  summary: z.string(),
  recommended_actions: z.array(z.string())
});
export type AIPrivacyAnalysisOutput = z.infer<typeof AIPrivacyAnalysisOutputSchema>;

export const AIPromptFirewallOutputSchema = z.object({
  is_injection: z.boolean(),
  is_jailbreak: z.boolean(),
  is_data_exfiltration_attempt: z.boolean(),
  risk_score: z.number().min(0).max(100),
  tactics: z.array(z.string()),
  explanation: z.string()
});
export type AIPromptFirewallOutput = z.infer<typeof AIPromptFirewallOutputSchema>;

export const AISecureChatOutputSchema = z.object({
  answer: z.string(),
  safety_notes: z.array(z.string()),
  follow_up_questions: z.array(z.string())
});
export type AISecureChatOutput = z.infer<typeof AISecureChatOutputSchema>;

export const AIPhishingAnalysisOutputSchema = z.object({
  verdict: PhishingVerdictSchema,
  risk_score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  indicators: z.array(
    z.object({
      type: z.string(),
      evidence: z.string(),
      severity: SeveritySchema
    })
  ),
  manipulation_tactics: z.array(
    z.enum(["urgency", "authority", "fear", "reward", "impersonation", "other"])
  ),
  explanation_for_user: z.string(),
  recommended_actions: z.array(z.string())
});
export type AIPhishingAnalysisOutput = z.infer<typeof AIPhishingAnalysisOutputSchema>;

export const AIFraudReasoningOutputSchema = z.object({
  risk_level: SeveritySchema,
  reasoning: z.string(),
  key_factors: z.array(z.string()),
  recommended_action: z.enum(["approve", "review", "block"]),
  confidence: z.number().min(0).max(1)
});
export type AIFraudReasoningOutput = z.infer<typeof AIFraudReasoningOutputSchema>;

export const AIIncidentBriefOutputSchema = z.object({
  summary: z.string(),
  likely_impact: z.string(),
  containment_steps: z.array(z.string()),
  root_cause_hypotheses: z.array(z.string()),
  severity_assessment: SeveritySchema
});
export type AIIncidentBriefOutput = z.infer<typeof AIIncidentBriefOutputSchema>;

export const AISecurityPostureReportOutputSchema = z.object({
  executive_summary: z.string(),
  posture_score: z.number().min(0).max(100),
  key_metrics: z.array(
    z.object({
      name: z.string(),
      value: z.string(),
      context: z.string()
    })
  ),
  top_threats: z.array(z.string()),
  data_exposure_trends: z.array(z.string()),
  policy_gaps: z.array(z.string()),
  recommended_actions: z.array(z.string()),
  compliance_notes: z.array(z.string())
});
export type AISecurityPostureReportOutput = z.infer<typeof AISecurityPostureReportOutputSchema>;
