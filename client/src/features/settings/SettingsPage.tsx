import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { authApi, memberApi } from "../../api/endpoints";
import {
  Settings,
  User,
  Shield,
  KeyRound,
  Users,
  Copy,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Lock,
  Building,
  LogOut
} from "lucide-react";

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "org_admin";

  const [activeTab, setActiveTab] = useState<"profile" | "security" | "members">("profile");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Invite code copy
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Sessions Query
  const { data: sessionsData, isLoading: loadingSessions } = useQuery({
    queryKey: ["authSessions"],
    queryFn: () => authApi.getSessions(),
    enabled: activeTab === "security"
  });

  // Members Query
  const { data: membersData, isLoading: loadingMembers } = useQuery({
    queryKey: ["orgMembers"],
    queryFn: () => memberApi.listMembers(),
    enabled: activeTab === "members"
  });

  // Password mutation
  const passwordMutation = useMutation({
    mutationFn: (data: any) => authApi.changePassword(data),
    onSuccess: () => {
      setPasswordMsg({ type: "success", text: "Password changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      setPasswordMsg({
        type: "error",
        text: err?.response?.data?.message || "Failed to update password."
      });
    }
  });

  // Revoke session mutation
  const revokeSessionMutation = useMutation({
    mutationFn: (id: string) => authApi.revokeSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authSessions"] });
    }
  });

  // Update member role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: "user" | "analyst" | "org_admin" }) =>
      memberApi.updateMemberRole(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orgMembers"] });
    }
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (id: string) => memberApi.removeMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orgMembers"] });
    }
  });

  // Rotate invite code mutation
  const rotateInviteMutation = useMutation({
    mutationFn: () => memberApi.rotateInviteCode(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orgMembers"] });
    }
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    passwordMutation.mutate({
      current_password: currentPassword,
      new_password: newPassword
    });
  };

  const handleCopyInvite = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const sessions = sessionsData?.data || [];
  const members = membersData?.data || [];

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Settings className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          Settings & Governance
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage user credentials, active cryptographic token sessions, and organization member roles.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "profile"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <User className="h-4 w-4" />
          Profile
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "security"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Lock className="h-4 w-4" />
          Security & Sessions
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "members"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Users className="h-4 w-4" />
          Team Members
        </button>
      </div>

      {/* Tab: Profile */}
      {activeTab === "profile" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Identity Profile
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400">Full Name</span>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                {user?.full_name || "N/A"}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400">Email Address</span>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                {user?.email || "N/A"}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400">Organization Role</span>
              <p className="text-sm font-bold capitalize text-indigo-600 dark:text-indigo-400 mt-1">
                {user?.role || "user"}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400">Organization</span>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                {user?.organization?.name || "Acme Security"}
              </p>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                ID: {user?.organization?.id || "org-default"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Security */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Password Change */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 max-w-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-indigo-500" />
              Change Password
            </h3>

            {passwordMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  passwordMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                }`}
              >
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password (min 10 chars, uppercase, lowercase, digit, symbol)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={passwordMutation.isPending}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm disabled:opacity-50 transition"
              >
                {passwordMutation.isPending ? "Updating Password..." : "Update Password"}
              </button>
            </form>
          </div>

          {/* Active Sessions */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Active Sessions & Device Tokens
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {loadingSessions && (
                <div className="py-6 text-center text-xs text-slate-400">Loading active sessions...</div>
              )}
              {sessions.map((sess: any) => (
                <div
                  key={sess.id}
                  className="py-3 flex items-center justify-between gap-4 text-xs font-mono"
                >
                  <div>
                    <p className="font-sans font-bold text-slate-900 dark:text-white">
                      {sess.ip_address || "Unknown IP"} • {sess.user_agent ? sess.user_agent.slice(0, 30) : "Browser"}...
                    </p>
                    <p className="text-slate-400 font-sans text-[11px]">
                      Issued: {new Date(sess.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => revokeSessionMutation.mutate(sess.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                    title="Revoke session"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Team Members */}
      {activeTab === "members" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Organization Roster ({members.length})
              </h3>
              <p className="text-xs text-slate-400">
                Manage roles and access privileges across user, analyst, and admin tiers.
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={() => rotateInviteMutation.mutate()}
                disabled={rotateInviteMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${rotateInviteMutation.isPending ? "animate-spin" : ""}`} />
                Rotate Invite Code
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Joined</th>
                  {isAdmin && <th className="px-6 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-sans">
                {loadingMembers && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Loading team members...
                    </td>
                  </tr>
                )}
                {members.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      {m.user?.full_name || m.full_name || "Team Member"}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono">
                      {m.user?.email || m.email}
                    </td>
                    <td className="px-6 py-4">
                      {isAdmin ? (
                        <select
                          value={m.role}
                          onChange={(e) =>
                            updateRoleMutation.mutate({
                              id: m.id,
                              role: e.target.value as any
                            })
                          }
                          className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold capitalize"
                        >
                          <option value="user">User</option>
                          <option value="analyst">Analyst</option>
                          <option value="org_admin">Org Admin</option>
                        </select>
                      ) : (
                        <span className="capitalize font-semibold text-slate-800 dark:text-slate-200">
                          {m.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            if (confirm("Remove member from organization?")) {
                              removeMemberMutation.mutate(m.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-500 transition"
                          title="Remove Member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
