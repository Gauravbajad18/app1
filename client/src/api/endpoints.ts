import { apiClient } from "./client";
import {
  RegisterInput,
  LoginInput,
  JoinOrgInput,
  ChangePasswordInput,
  ScanTextInput,
  DetectionFeedbackInput,
  PhishingInput,
  TransactionInput,
  FraudReviewInput,
  IncidentCreateInput,
  IncidentUpdateInput,
  IncidentCommentInput,
  PolicyUpdateInput,
  ReportRequestInput,
  UpdateMemberRoleInput
} from "@trustshield/shared";

export const authApi = {
  register: (data: RegisterInput) => apiClient.post("/auth/register", data).then(r => r.data),
  login: (data: LoginInput) => apiClient.post("/auth/login", data).then(r => r.data),
  refresh: () => apiClient.post("/auth/refresh").then(r => r.data),
  logout: () => apiClient.post("/auth/logout").then(r => r.data),
  getMe: () => apiClient.get("/auth/me").then(r => r.data),
  join: (data: JoinOrgInput) => apiClient.post("/auth/join", data).then(r => r.data),
  joinOrg: (data: JoinOrgInput) => apiClient.post("/auth/join", data).then(r => r.data),
  changePassword: (data: ChangePasswordInput) => apiClient.patch("/auth/password", data).then(r => r.data),
  getSessions: () => apiClient.get("/auth/sessions").then(r => r.data),
  revokeSession: (id: string) => apiClient.delete(`/auth/sessions/${id}`).then(r => r.data)
};

export const dashboardApi = {
  getStats: () => apiClient.get("/dashboard").then(r => r.data)
};

export const scannerApi = {
  scanText: (data: ScanTextInput) => apiClient.post("/scan/text", data).then(r => r.data),
  scanFile: (formData: FormData) =>
    apiClient.post("/scan/file", formData, { headers: { "Content-Type": "multipart/form-data" } }).then(r => r.data),
  getDetections: (params?: { severity?: string; data_type?: string; detector?: string; limit?: number; offset?: number }) =>
    apiClient.get("/detections", { params }).then(r => r.data),
  getDetectionById: (id: string) => apiClient.get(`/detections/${id}`).then(r => r.data),
  submitFeedback: (id: string, data: DetectionFeedbackInput) => apiClient.post(`/detections/${id}/feedback`, data).then(r => r.data)
};

export const gatewayApi = {
  createConversation: (title?: string) => apiClient.post("/gateway/conversations", { title }).then(r => r.data),
  listConversations: () => apiClient.get("/gateway/conversations").then(r => r.data),
  getConversation: (id: string) => apiClient.get(`/gateway/conversations/${id}`).then(r => r.data),
  sendMessage: (conversationId: string, content: string) =>
    apiClient.post(`/gateway/conversations/${conversationId}/messages`, { content }).then(r => r.data),
  deleteConversation: (id: string) => apiClient.delete(`/gateway/conversations/${id}`).then(r => r.data)
};

export const phishingApi = {
  analyze: (data: PhishingInput) => apiClient.post("/phishing/analyze", data).then(r => r.data)
};

export const fraudApi = {
  scoreSingle: (data: TransactionInput) => apiClient.post("/fraud/score", data).then(r => r.data),
  uploadCsv: (formData: FormData) =>
    apiClient.post("/fraud/upload", formData, { headers: { "Content-Type": "multipart/form-data" } }).then(r => r.data),
  listTransactions: (params?: { review_status?: string; risk_level?: string; limit?: number; offset?: number }) =>
    apiClient.get("/fraud/transactions", { params }).then(r => r.data),
  reviewTransaction: (id: string, data: FraudReviewInput) =>
    apiClient.patch(`/fraud/transactions/${id}/review`, data).then(r => r.data)
};

export const incidentApi = {
  listIncidents: (params?: { status?: string; severity?: string; limit?: number; offset?: number }) =>
    apiClient.get("/incidents", { params }).then(r => r.data),
  createIncident: (data: IncidentCreateInput) => apiClient.post("/incidents", data).then(r => r.data),
  getIncidentById: (id: string) => apiClient.get(`/incidents/${id}`).then(r => r.data),
  updateIncident: (id: string, data: IncidentUpdateInput) => apiClient.patch(`/incidents/${id}`, data).then(r => r.data),
  addComment: (id: string, body: string) => apiClient.post(`/incidents/${id}/comments`, { body }).then(r => r.data),
  generateAIBrief: (id: string) => apiClient.post(`/incidents/${id}/ai-brief`).then(r => r.data)
};

export const reportApi = {
  listReports: () => apiClient.get("/reports").then(r => r.data),
  generateReport: (data: ReportRequestInput) => apiClient.post("/reports", data).then(r => r.data),
  getReportById: (id: string) => apiClient.get(`/reports/${id}`).then(r => r.data)
};

export const policyApi = {
  getPolicies: () => apiClient.get("/policies").then(r => r.data),
  updatePolicies: (data: PolicyUpdateInput) => apiClient.put("/policies", data).then(r => r.data)
};

export const memberApi = {
  listMembers: () => apiClient.get("/members").then(r => r.data),
  updateMemberRole: (id: string, data: UpdateMemberRoleInput) => apiClient.patch(`/members/${id}/role`, data).then(r => r.data),
  removeMember: (id: string) => apiClient.delete(`/members/${id}`).then(r => r.data),
  rotateInviteCode: () => apiClient.post("/members/invite-code").then(r => r.data)
};

export const auditApi = {
  listLogs: (params?: { limit?: number; offset?: number; action?: string }) =>
    apiClient.get("/audit", { params }).then(r => r.data),
  verifyIntegrity: () => apiClient.get("/audit/verify").then(r => r.data)
};
