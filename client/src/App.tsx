import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { RequireAuth, RequireRole } from "./routes/guards";
import { AppShell } from "./components/layout/AppShell";

// Public pages
import { LandingPage } from "./features/landing/LandingPage";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { JoinOrgPage } from "./features/auth/JoinOrgPage";
import { NotFoundPage } from "./features/misc/NotFoundPage";

// Authenticated features
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { ScannerPage } from "./features/scanner/ScannerPage";
import { GatewayPage } from "./features/gateway/GatewayPage";
import { PhishingPage } from "./features/phishing/PhishingPage";
import { FraudPage } from "./features/fraud/FraudPage";
import { FraudReviewPage } from "./features/fraud/FraudReviewPage";
import { DetectionsPage } from "./features/detections/DetectionsPage";
import { DetectionDetailPage } from "./features/detections/DetectionDetailPage";
import { IncidentsPage } from "./features/incidents/IncidentsPage";
import { IncidentDetailPage } from "./features/incidents/IncidentDetailPage";
import { ReportsPage } from "./features/reports/ReportsPage";
import { ReportDetailPage } from "./features/reports/ReportDetailPage";
import { PoliciesPage } from "./features/policies/PoliciesPage";
import { AuditPage } from "./features/audit/AuditPage";
import { SettingsPage } from "./features/settings/SettingsPage";

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/join" element={<JoinOrgPage />} />

      {/* Authenticated application boundary */}
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/scanner" element={<ScannerPage />} />
        <Route path="/gateway" element={<GatewayPage />} />
        <Route path="/phishing" element={<PhishingPage />} />
        <Route path="/fraud" element={<FraudPage />} />
        <Route
          path="/fraud/review"
          element={
            <RequireRole minimumRole="analyst">
              <FraudReviewPage />
            </RequireRole>
          }
        />
        <Route path="/detections" element={<DetectionsPage />} />
        <Route path="/detections/:id" element={<DetectionDetailPage />} />
        <Route path="/incidents" element={<IncidentsPage />} />
        <Route path="/incidents/:id" element={<IncidentDetailPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:id" element={<ReportDetailPage />} />
        <Route path="/policies" element={<PoliciesPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
