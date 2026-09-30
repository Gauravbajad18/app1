import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Shield,
  LayoutDashboard,
  FileSearch,
  Bot,
  MailWarning,
  CreditCard,
  History,
  AlertTriangle,
  FileText,
  Sliders,
  Database,
  Settings,
  LogOut,
  X
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
      isActive
        ? "bg-brand-600 text-white font-semibold shadow-sm shadow-brand-500/20"
        : "text-slate-400 hover:text-white hover:bg-slate-800/80"
    }`;

  const isAnalystOrAdmin = role === "analyst" || role === "org_admin";
  const isOrgAdmin = role === "org_admin";

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col bg-slate-900 border-r border-slate-800/80 transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-slate-800">
          <NavLink to="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 shadow-md shadow-brand-500/30 text-white">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-white">
                TrustShield<span className="text-brand-400">.AI</span>
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Security & Trust
              </span>
            </div>
          </NavLink>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Workspace Card */}
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Workspace</p>
          <p className="text-xs font-bold text-white truncate">{user?.organization?.name || "Acme Cyber Systems"}</p>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Main */}
          <div>
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Overview</span>
            <div className="mt-1 space-y-0.5">
              <NavLink to="/dashboard" className={navItemClass}>
                <LayoutDashboard className="h-4 w-4" />
                <span>Executive Command</span>
              </NavLink>
            </div>
          </div>

          {/* Core Protection */}
          <div>
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Threat & Privacy</span>
            <div className="mt-1 space-y-0.5">
              <NavLink to="/scanner" className={navItemClass}>
                <FileSearch className="h-4 w-4" />
                <span>Privacy Scanner</span>
              </NavLink>

              <NavLink to="/gateway" className={navItemClass}>
                <Bot className="h-4 w-4" />
                <span>Secure AI Gateway</span>
              </NavLink>

              <NavLink to="/phishing" className={navItemClass}>
                <MailWarning className="h-4 w-4" />
                <span>Phishing Analyzer</span>
              </NavLink>

              <NavLink to="/fraud" className={navItemClass}>
                <CreditCard className="h-4 w-4" />
                <span>Fraud Scoring</span>
              </NavLink>
            </div>
          </div>

          {/* SOC & Ops */}
          <div>
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Operations</span>
            <div className="mt-1 space-y-0.5">
              <NavLink to="/detections" className={navItemClass}>
                <History className="h-4 w-4" />
                <span>Detection History</span>
              </NavLink>

              {isAnalystOrAdmin && (
                <>
                  <NavLink to="/incidents" className={navItemClass}>
                    <AlertTriangle className="h-4 w-4" />
                    <span>SOC Incidents</span>
                  </NavLink>

                  <NavLink to="/reports" className={navItemClass}>
                    <FileText className="h-4 w-4" />
                    <span>Posture Reports</span>
                  </NavLink>
                </>
              )}
            </div>
          </div>

          {/* Governance & Administration */}
          {isOrgAdmin && (
            <div>
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Governance</span>
              <div className="mt-1 space-y-0.5">
                <NavLink to="/policies" className={navItemClass}>
                  <Sliders className="h-4 w-4" />
                  <span>Privacy Policies</span>
                </NavLink>

                <NavLink to="/audit" className={navItemClass}>
                  <Database className="h-4 w-4" />
                  <span>Tamper-Evident Audit</span>
                </NavLink>
              </div>
            </div>
          )}

          {/* Settings */}
          <div>
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Management</span>
            <div className="mt-1 space-y-0.5">
              <NavLink to="/settings/profile" className={navItemClass}>
                <Settings className="h-4 w-4" />
                <span>Security Settings</span>
              </NavLink>
            </div>
          </div>
        </div>

        {/* User Footer Profile */}
        <div className="border-t border-slate-800 p-3 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-200 border border-slate-700">
                {user?.full_name?.charAt(0) || "U"}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{user?.full_name || "User"}</p>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-brand-400 font-mono capitalize">
                  {role || "user"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
