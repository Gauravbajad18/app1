"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AISecurityPostureReportOutputSchema = exports.AIIncidentBriefOutputSchema = exports.AIFraudReasoningOutputSchema = exports.AIPhishingAnalysisOutputSchema = exports.AISecureChatOutputSchema = exports.AIPromptFirewallOutputSchema = exports.AIPrivacyAnalysisOutputSchema = exports.AIPrivacyFindingSchema = exports.ReportRequestSchema = exports.PolicyUpdateSchema = exports.PolicyItemSchema = exports.IncidentCommentSchema = exports.IncidentUpdateSchema = exports.IncidentCreateSchema = exports.FraudReviewSchema = exports.TransactionSchema = exports.PhishingAnalysisResponseSchema = exports.PhishingIndicatorSchema = exports.PhishingInputSchema = exports.FirewallDecisionSchema = exports.GatewayMessageSchema = exports.CreateConversationSchema = exports.DetectionFeedbackSchema = exports.ScanResultResponseSchema = exports.DetectionItemSchema = exports.ScanFileMetaSchema = exports.ScanTextSchema = exports.UpdateMemberRoleSchema = exports.ChangePasswordSchema = exports.JoinOrgSchema = exports.LoginSchema = exports.RegisterSchema = exports.passwordRegex = exports.DataTypeSchema = exports.FeedbackVerdictSchema = exports.IncidentSourceSchema = exports.IncidentStatusSchema = exports.FraudReviewStatusSchema = exports.PhishingVerdictSchema = exports.RedactionModeSchema = exports.PolicyActionSchema = exports.DetectorTypeSchema = exports.ScanSourceSchema = exports.SeveritySchema = exports.UserRoleSchema = void 0;
const zod_1 = require("zod");
// ==========================================
// 1. Roles & Core Enums
// ==========================================
exports.UserRoleSchema = zod_1.z.enum(["user", "analyst", "org_admin"]);
exports.SeveritySchema = zod_1.z.enum(["low", "medium", "high", "critical"]);
exports.ScanSourceSchema = zod_1.z.enum(["text", "file", "gateway", "phishing", "fraud"]);
exports.DetectorTypeSchema = zod_1.z.enum(["rule", "ai", "hybrid"]);
exports.PolicyActionSchema = zod_1.z.enum(["allow", "mask", "block"]);
exports.RedactionModeSchema = zod_1.z.enum(["mask", "tokenize", "remove"]);
exports.PhishingVerdictSchema = zod_1.z.enum(["safe", "suspicious", "phishing", "scam"]);
exports.FraudReviewStatusSchema = zod_1.z.enum(["pending", "approved", "rejected", "escalated"]);
exports.IncidentStatusSchema = zod_1.z.enum(["open", "investigating", "contained", "resolved", "false_positive"]);
exports.IncidentSourceSchema = zod_1.z.enum(["privacy_scan", "prompt_firewall", "phishing", "fraud", "manual"]);
exports.FeedbackVerdictSchema = zod_1.z.enum(["correct", "false_positive", "missed"]);
// Supported Data Types for Scanner & Firewall Policies
exports.DataTypeSchema = zod_1.z.enum([
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
// Password validation regex: min 10 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character
exports.passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{10,}$/;
// ==========================================
// 2. Authentication Schemas
// ==========================================
exports.RegisterSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email address").max(255),
    password: zod_1.z
        .string()
        .min(10, "Password must be at least 10 characters long")
        .regex(exports.passwordRegex, "Password must contain uppercase, lowercase, number, and special character"),
    full_name: zod_1.z.string().min(2, "Full name must be at least 2 characters").max(100),
    org_name: zod_1.z.string().min(2, "Organization name must be at least 2 characters").max(100)
});
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email address"),
    password: zod_1.z.string().min(1, "Password is required")
});
exports.JoinOrgSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email address"),
    password: zod_1.z
        .string()
        .min(10, "Password must be at least 10 characters long")
        .regex(exports.passwordRegex, "Password must contain uppercase, lowercase, number, and special character"),
    full_name: zod_1.z.string().min(2, "Full name must be at least 2 characters").max(100),
    invite_code: zod_1.z.string().min(6, "Invite code must be at least 6 characters").max(64)
});
exports.ChangePasswordSchema = zod_1.z.object({
    current_password: zod_1.z.string().min(1, "Current password is required"),
    new_password: zod_1.z
        .string()
        .min(10, "New password must be at least 10 characters")
        .regex(exports.passwordRegex, "New password must contain uppercase, lowercase, number, and special character")
});
exports.UpdateMemberRoleSchema = zod_1.z.object({
    role: exports.UserRoleSchema
});
// ==========================================
// 3. Privacy Scanner Schemas
// ==========================================
exports.ScanTextSchema = zod_1.z.object({
    text: zod_1.z.string().min(1, "Text content is required").max(50000, "Text exceeds maximum limit of 50,000 characters"),
    redaction_mode: exports.RedactionModeSchema.default("mask")
});
exports.ScanFileMetaSchema = zod_1.z.object({
    redaction_mode: exports.RedactionModeSchema.default("mask")
});
exports.DetectionItemSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    category: zod_1.z.string(),
    data_type: zod_1.z.string(),
    detector: exports.DetectorTypeSchema,
    masked_value: zod_1.z.string(),
    start_offset: zod_1.z.number().int().min(0),
    end_offset: zod_1.z.number().int().min(0),
    confidence: zod_1.z.number().min(0).max(1),
    severity: exports.SeveritySchema,
    evidence: zod_1.z.record(zod_1.z.any()).optional(),
    recommended_action: zod_1.z.string()
});
exports.ScanResultResponseSchema = zod_1.z.object({
    scan_id: zod_1.z.string(),
    risk_score: zod_1.z.number().min(0).max(100),
    severity: exports.SeveritySchema,
    findings: zod_1.z.array(exports.DetectionItemSchema),
    redacted_content: zod_1.z.string(),
    original_length: zod_1.z.number(),
    redacted_length: zod_1.z.number(),
    ai_status: zod_1.z.enum(["success", "unavailable", "bypassed", "quota_exceeded"]),
    summary: zod_1.z.string().optional(),
    recommended_actions: zod_1.z.array(zod_1.z.string()).optional()
});
exports.DetectionFeedbackSchema = zod_1.z.object({
    verdict: exports.FeedbackVerdictSchema,
    note: zod_1.z.string().max(1000).optional()
});
// ==========================================
// 4. Secure AI Gateway Schemas
// ==========================================
exports.CreateConversationSchema = zod_1.z.object({
    title: zod_1.z.string().max(200).optional()
});
exports.GatewayMessageSchema = zod_1.z.object({
    content: zod_1.z.string().min(1, "Prompt cannot be empty").max(10000, "Prompt exceeds 10,000 characters")
});
exports.FirewallDecisionSchema = zod_1.z.object({
    allowed: zod_1.z.boolean(),
    action_taken: zod_1.z.enum(["allowed", "masked", "blocked"]),
    block_reason: zod_1.z.string().optional(),
    injection_detected: zod_1.z.boolean(),
    jailbreak_detected: zod_1.z.boolean(),
    injection_risk_score: zod_1.z.number().min(0).max(100),
    detected_tactics: zod_1.z.array(zod_1.z.string()),
    masked_findings_count: zod_1.z.number(),
    findings: zod_1.z.array(exports.DetectionItemSchema),
    explanation: zod_1.z.string()
});
// ==========================================
// 5. Phishing & Scam Analyzer Schemas
// ==========================================
exports.PhishingInputSchema = zod_1.z.object({
    input_type: zod_1.z.enum(["email", "sms", "url"]),
    content: zod_1.z.string().min(1, "Content is required").max(30000, "Content exceeds 30,000 characters"),
    headers: zod_1.z.string().max(20000).optional()
});
exports.PhishingIndicatorSchema = zod_1.z.object({
    type: zod_1.z.string(),
    evidence: zod_1.z.string(),
    severity: exports.SeveritySchema
});
exports.PhishingAnalysisResponseSchema = zod_1.z.object({
    scan_id: zod_1.z.string(),
    verdict: exports.PhishingVerdictSchema,
    risk_score: zod_1.z.number().min(0).max(100),
    confidence: zod_1.z.number().min(0).max(1),
    indicators: zod_1.z.array(exports.PhishingIndicatorSchema),
    manipulation_tactics: zod_1.z.array(zod_1.z.enum(["urgency", "authority", "fear", "reward", "impersonation", "other"])),
    explanation_for_user: zod_1.z.string(),
    recommended_actions: zod_1.z.array(zod_1.z.string()),
    deterministic_signals: zod_1.z.array(zod_1.z.string()),
    ai_status: zod_1.z.enum(["success", "unavailable", "bypassed"])
});
// ==========================================
// 6. Fraud Risk Scoring Schemas
// ==========================================
exports.TransactionSchema = zod_1.z.object({
    external_ref: zod_1.z.string().max(100).optional(),
    amount: zod_1.z.number().positive("Amount must be greater than zero"),
    currency: zod_1.z.string().min(3).max(3).default("USD"),
    merchant: zod_1.z.string().min(1).max(150),
    category: zod_1.z.string().min(1).max(100),
    country: zod_1.z.string().min(2).max(3),
    channel: zod_1.z.string().min(1).max(50),
    account_id: zod_1.z.string().min(1).max(100),
    device_id: zod_1.z.string().min(1).max(100),
    occurred_at: zod_1.z.string().datetime().optional()
});
exports.FraudReviewSchema = zod_1.z.object({
    review_status: zod_1.z.enum(["approved", "rejected", "escalated"]),
    review_note: zod_1.z.string().min(3, "Review note is required (min 3 chars)").max(1000)
});
// ==========================================
// 7. Incident Management Schemas
// ==========================================
exports.IncidentCreateSchema = zod_1.z.object({
    title: zod_1.z.string().min(3, "Title must be at least 3 characters").max(200),
    description: zod_1.z.string().min(5, "Description must be at least 5 characters").max(5000),
    severity: exports.SeveritySchema,
    source_type: exports.IncidentSourceSchema,
    assignee_id: zod_1.z.string().uuid().optional().nullable(),
    detection_ids: zod_1.z.array(zod_1.z.string().uuid()).optional()
});
exports.IncidentUpdateSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).max(200).optional(),
    description: zod_1.z.string().min(5).max(5000).optional(),
    severity: exports.SeveritySchema.optional(),
    status: exports.IncidentStatusSchema.optional(),
    assignee_id: zod_1.z.string().uuid().optional().nullable()
});
exports.IncidentCommentSchema = zod_1.z.object({
    body: zod_1.z.string().min(1, "Comment body cannot be empty").max(2000)
});
// ==========================================
// 8. Privacy Policy Engine Schemas
// ==========================================
exports.PolicyItemSchema = zod_1.z.object({
    data_type: exports.DataTypeSchema,
    gateway_action: exports.PolicyActionSchema,
    scanner_action: exports.PolicyActionSchema
});
exports.PolicyUpdateSchema = zod_1.z.object({
    policies: zod_1.z.array(exports.PolicyItemSchema),
    auto_incident_threshold: exports.SeveritySchema.optional(),
    data_retention_days: zod_1.z.number().int().min(1).max(365).optional(),
    store_raw_content: zod_1.z.boolean().optional(),
    ai_daily_limit_per_user: zod_1.z.number().int().min(10).max(10000).optional()
});
// ==========================================
// 9. Posture Report Schemas
// ==========================================
exports.ReportRequestSchema = zod_1.z.object({
    period_start: zod_1.z.string().datetime(),
    period_end: zod_1.z.string().datetime(),
    title: zod_1.z.string().max(200).optional()
});
// ==========================================
// 10. AI JSON Output Schemas (Validated with Zod)
// ==========================================
exports.AIPrivacyFindingSchema = zod_1.z.object({
    data_type: zod_1.z.string(),
    text_snippet_masked: zod_1.z.string(),
    start_offset: zod_1.z.number().int().min(0),
    end_offset: zod_1.z.number().int().min(0),
    confidence: zod_1.z.number().min(0).max(1),
    severity: exports.SeveritySchema,
    reason: zod_1.z.string()
});
exports.AIPrivacyAnalysisOutputSchema = zod_1.z.object({
    findings: zod_1.z.array(exports.AIPrivacyFindingSchema),
    overall_risk_score: zod_1.z.number().min(0).max(100),
    summary: zod_1.z.string(),
    recommended_actions: zod_1.z.array(zod_1.z.string())
});
exports.AIPromptFirewallOutputSchema = zod_1.z.object({
    is_injection: zod_1.z.boolean(),
    is_jailbreak: zod_1.z.boolean(),
    is_data_exfiltration_attempt: zod_1.z.boolean(),
    risk_score: zod_1.z.number().min(0).max(100),
    tactics: zod_1.z.array(zod_1.z.string()),
    explanation: zod_1.z.string()
});
exports.AISecureChatOutputSchema = zod_1.z.object({
    answer: zod_1.z.string(),
    safety_notes: zod_1.z.array(zod_1.z.string()),
    follow_up_questions: zod_1.z.array(zod_1.z.string())
});
exports.AIPhishingAnalysisOutputSchema = zod_1.z.object({
    verdict: exports.PhishingVerdictSchema,
    risk_score: zod_1.z.number().min(0).max(100),
    confidence: zod_1.z.number().min(0).max(1),
    indicators: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        evidence: zod_1.z.string(),
        severity: exports.SeveritySchema
    })),
    manipulation_tactics: zod_1.z.array(zod_1.z.enum(["urgency", "authority", "fear", "reward", "impersonation", "other"])),
    explanation_for_user: zod_1.z.string(),
    recommended_actions: zod_1.z.array(zod_1.z.string())
});
exports.AIFraudReasoningOutputSchema = zod_1.z.object({
    risk_level: exports.SeveritySchema,
    reasoning: zod_1.z.string(),
    key_factors: zod_1.z.array(zod_1.z.string()),
    recommended_action: zod_1.z.enum(["approve", "review", "block"]),
    confidence: zod_1.z.number().min(0).max(1)
});
exports.AIIncidentBriefOutputSchema = zod_1.z.object({
    summary: zod_1.z.string(),
    likely_impact: zod_1.z.string(),
    containment_steps: zod_1.z.array(zod_1.z.string()),
    root_cause_hypotheses: zod_1.z.array(zod_1.z.string()),
    severity_assessment: exports.SeveritySchema
});
exports.AISecurityPostureReportOutputSchema = zod_1.z.object({
    executive_summary: zod_1.z.string(),
    posture_score: zod_1.z.number().min(0).max(100),
    key_metrics: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        value: zod_1.z.string(),
        context: zod_1.z.string()
    })),
    top_threats: zod_1.z.array(zod_1.z.string()),
    data_exposure_trends: zod_1.z.array(zod_1.z.string()),
    policy_gaps: zod_1.z.array(zod_1.z.string()),
    recommended_actions: zod_1.z.array(zod_1.z.string()),
    compliance_notes: zod_1.z.array(zod_1.z.string())
});
