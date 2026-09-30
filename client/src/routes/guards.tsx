import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "@trustshield/shared";
import { ShieldAlert } from "lucide-react";

const ROLE_RANKS: Record<UserRole, number> = {
  user: 1,
  analyst: 2,
  org_admin: 3
};

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
          <span className="text-sm font-medium text-slate-400">Verifying security credentials...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export const RequireRole: React.FC<{ minimumRole: UserRole; children: React.ReactNode }> = ({
  minimumRole,
  children
}) => {
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  const currentRank = role ? ROLE_RANKS[role] : 0;
  const requiredRank = ROLE_RANKS[minimumRole];

  if (currentRank < requiredRank) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
        <div className="rounded-full bg-rose-100 p-4 dark:bg-rose-950/50">
          <ShieldAlert className="h-10 w-10 text-rose-600 dark:text-rose-400" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Access Restricted</h2>
        <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
          This feature requires <strong className="font-semibold text-brand-600">{minimumRole}</strong> privileges. Your current role is <strong className="font-semibold">{role || "unassigned"}</strong>.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
