import React, { useEffect, useState } from "react";
import { adminService } from "../../../services/adminService";
import { AdminUserListItem, AdminRole } from "../../../types/admin";
import { useAdmin } from "../../../context/AdminContext";
import { useToast } from "../../ui/Toast";
import { Dialog } from "../../ui/Dialog";
import { Input } from "../../ui/Input";
import { Button } from "../../ui/Button";
import { Badge } from "../../ui/Badge";
import { supabase } from "../../../supabase/config";
import { toTitleCase } from "../../../utils/formatters";
import { 
  Search, 
  User, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Ban, 
  CheckCircle2, 
  Eye, 
  Building2, 
  FileText, 
  Zap, 
  Sparkles, 
  Crown, 
  ChevronDown, 
  RefreshCw, 
  MoreVertical, 
  UserCheck, 
  UserX,
  Phone,
  Mail,
  Calendar,
  AlertTriangle
} from "lucide-react";

export function AdminUsersView() {
  const { adminRole } = useAdmin();
  const toast = useToast();

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState<string>("all");

  // Dialog States
  const [suspendModalUser, setSuspendModalUser] = useState<AdminUserListItem | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [isSuspending, setIsSuspending] = useState(false);

  const [detailsUser, setDetailsUser] = useState<AdminUserListItem | null>(null);
  const [userBusinesses, setUserBusinesses] = useState<any[]>([]);
  const [userInvoices, setUserInvoices] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [roleModalUser, setRoleModalUser] = useState<AdminUserListItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<AdminRole | 'none'>('none');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const isSuperAdmin = adminRole === 'super_admin';

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminService.listUsers(search, 100, 0);
      setUsers(data);
    } catch (err: any) {
      console.error("Failed to list users:", err);
      toast.error("Error Loading Users", err?.message || "Failed to load user list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Handle Tier Change
  const handleTierChange = async (userItem: AdminUserListItem, newTier: 'free' | 'starter' | 'growth') => {
    if (userItem.subscription_tier === newTier) return;
    try {
      await adminService.setTier(userItem.id, newTier);
      toast.success("Subscription Tier Updated", `Updated ${userItem.email} to ${newTier.toUpperCase()} tier.`);
      setUsers(prev => prev.map(u => u.id === userItem.id ? { ...u, subscription_tier: newTier } : u));
    } catch (err: any) {
      toast.error("Tier Update Failed", err?.message || "Could not change subscription tier.");
    }
  };

  // Handle Suspension / Unsuspension
  const handleConfirmSuspension = async () => {
    if (!suspendModalUser) return;
    setIsSuspending(true);
    try {
      const willSuspend = !suspendModalUser.is_suspended;
      await adminService.setSuspension(suspendModalUser.id, willSuspend, willSuspend ? suspendReason : undefined);
      toast.success(
        willSuspend ? "Account Suspended" : "Account Reactivated",
        `User ${suspendModalUser.email} has been ${willSuspend ? 'suspended' : 'unsuspended'}.`
      );
      setUsers(prev => prev.map(u => u.id === suspendModalUser.id ? { ...u, is_suspended: willSuspend, suspended_reason: willSuspend ? suspendReason : null } : u));
      setSuspendModalUser(null);
      setSuspendReason("");
    } catch (err: any) {
      toast.error("Action Failed", err?.message || "Could not update user status.");
    } finally {
      setIsSuspending(false);
    }
  };

  // Handle Admin Role Grant / Revoke (Super Admin Only)
  const handleUpdateRole = async () => {
    if (!roleModalUser) return;
    setIsUpdatingRole(true);
    try {
      if (selectedRole === 'none') {
        await adminService.revokeRole(roleModalUser.id);
        toast.success("Role Revoked", `Admin privileges removed from ${roleModalUser.email}.`);
        setUsers(prev => prev.map(u => u.id === roleModalUser.id ? { ...u, admin_role: null } : u));
      } else {
        await adminService.grantRole(roleModalUser.id, selectedRole);
        toast.success("Role Granted", `Granted ${selectedRole.toUpperCase()} role to ${roleModalUser.email}.`);
        setUsers(prev => prev.map(u => u.id === roleModalUser.id ? { ...u, admin_role: selectedRole } : u));
      }
      setRoleModalUser(null);
    } catch (err: any) {
      toast.error("Role Update Failed", err?.message || "Failed to update admin role.");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Load User Details
  const handleViewDetails = async (userItem: AdminUserListItem) => {
    setDetailsUser(userItem);
    setLoadingDetails(true);
    try {
      const [bizRes, docRes] = await Promise.all([
        supabase.from('businesses').select('*').eq('owner_uid', userItem.id).eq('is_archived', false),
        supabase.from('sales_documents').select('*').eq('owner_uid', userItem.id).not('status', 'in', '(void,cancelled)').order('created_at', { ascending: false }).limit(20)
      ]);
      setUserBusinesses(bizRes.data || []);
      setUserInvoices(docRes.data || []);
    } catch (err: any) {
      console.warn("Could not load full user detail preview:", err);
      setUserBusinesses([]);
      setUserInvoices([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (filterTier === "all") return true;
    if (filterTier === "suspended") return u.is_suspended;
    if (filterTier === "admin") return !!u.admin_role;
    return u.subscription_tier === filterTier;
  });

  return (
    <div className="space-y-6">
      {/* Top Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: "all", label: "All Users" },
            { id: "free", label: "Free" },
            { id: "starter", label: "Starter" },
            { id: "growth", label: "Growth" },
            { id: "admin", label: "Admins Only" },
            { id: "suspended", label: "Suspended" },
          ].map(pill => (
            <button
              key={pill.id}
              onClick={() => setFilterTier(pill.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filterTier === pill.id
                  ? "bg-primary-600 text-white shadow-sm shadow-primary-600/20"
                  : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {pill.label}
            </button>
          ))}
          <button
            onClick={fetchUsers}
            title="Refresh List"
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-1"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">User Info</th>
                <th className="px-4 py-4">Contact</th>
                <th className="px-4 py-4">SaaS Tier</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Workspaces / Invoices</th>
                <th className="px-4 py-4">Joined</th>
                <th className="px-4 py-4">Admin Role</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-48" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24" /></td>
                    <td className="px-4 py-4"><div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-xl w-24" /></td>
                    <td className="px-4 py-4"><div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-full w-20" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24" /></td>
                    <td className="px-4 py-4"><div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-full w-24" /></td>
                    <td className="px-6 py-4"><div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    No users matching the filter criteria found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((userItem) => (
                  <tr 
                    key={userItem.id} 
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      userItem.is_suspended ? "bg-rose-50/40 dark:bg-rose-950/10" : ""
                    }`}
                  >
                    {/* User Info Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm font-display shrink-0 shadow-sm">
                          {userItem.display_name?.charAt(0).toUpperCase() || userItem.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-900 dark:text-slate-100 truncate font-display flex items-center gap-1.5">
                            {userItem.display_name || "Unnamed User"}
                          </h4>
                          <p className="text-xs text-slate-400 truncate font-mono">
                            {userItem.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Contact Phone */}
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400 font-mono">
                      {userItem.phone || "—"}
                    </td>

                    {/* SaaS Tier Select Dropdown */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <select
                        value={userItem.subscription_tier}
                        onChange={(e) => handleTierChange(userItem, e.target.value as any)}
                        className="px-2.5 py-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="free">Free Plan</option>
                        <option value="starter">Starter (₹499)</option>
                        <option value="growth">Growth (₹1499)</option>
                      </select>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {userItem.is_suspended ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <Ban className="w-3 h-3" /> Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      )}
                    </td>

                    {/* Businesses & Invoices Count */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1 font-semibold" title="Workspaces">
                          <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                          {userItem.businesses_count}
                        </span>
                        <span className="flex items-center gap-1 font-semibold" title="Invoices">
                          <FileText className="w-3.5 h-3.5 text-amber-500" />
                          {userItem.invoices_count}
                        </span>
                      </div>
                    </td>

                    {/* Joined Date */}
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-400 font-mono">
                      {new Date(userItem.created_at).toLocaleDateString()}
                    </td>

                    {/* Admin Role Badge */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {userItem.admin_role === 'super_admin' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          <Crown className="w-3 h-3" /> Super Admin
                        </span>
                      )}
                      {userItem.admin_role === 'admin' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <ShieldCheck className="w-3 h-3" /> Admin
                        </span>
                      )}
                      {userItem.admin_role === 'support' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                          <Shield className="w-3 h-3" /> Support Staff
                        </span>
                      )}
                      {!userItem.admin_role && (
                        <span className="text-xs text-slate-400 font-medium">Standard User</span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Details Button */}
                        <button
                          onClick={() => handleViewDetails(userItem)}
                          title="Inspect User Details"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Suspend / Unsuspend Button */}
                        <button
                          onClick={() => {
                            setSuspendModalUser(userItem);
                            setSuspendReason(userItem.suspended_reason || "");
                          }}
                          title={userItem.is_suspended ? "Unsuspend User" : "Suspend User"}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            userItem.is_suspended
                              ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100"
                              : "border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100"
                          }`}
                        >
                          {userItem.is_suspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                        </button>

                        {/* Manage Admin Access (Super Admin Only) */}
                        {isSuperAdmin && (
                          <button
                            onClick={() => {
                              setRoleModalUser(userItem);
                              setSelectedRole(userItem.admin_role || 'none');
                            }}
                            title="Manage Admin Access Role"
                            className="p-1.5 rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100 transition-colors cursor-pointer"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suspend / Unsuspend Confirmation Modal */}
      {suspendModalUser && (
        <Dialog
          isOpen={true}
          onClose={() => setSuspendModalUser(null)}
          title={suspendModalUser.is_suspended ? "Reactivate Account" : "Suspend Account"}
        >
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 flex items-start gap-3 text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold">
                  {suspendModalUser.is_suspended
                    ? `You are about to reactivate ${suspendModalUser.email}. They will regain write access to their invoicing workspace.`
                    : `You are about to suspend ${suspendModalUser.email}. Suspension restricts their database write permissions.`}
                </p>
              </div>
            </div>

            {!suspendModalUser.is_suspended && (
              <Input
                label="Reason for Suspension"
                placeholder="e.g. Terms violation, Non-payment, Billing query..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
              />
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" onClick={() => setSuspendModalUser(null)}>
                Cancel
              </Button>
              <Button
                variant={suspendModalUser.is_suspended ? "primary" : "danger"}
                onClick={handleConfirmSuspension}
                disabled={isSuspending}
              >
                {isSuspending ? "Processing..." : suspendModalUser.is_suspended ? "Confirm Reactivation" : "Confirm Suspension"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Super Admin: Manage Admin Access Modal */}
      {roleModalUser && (
        <Dialog
          isOpen={true}
          onClose={() => setRoleModalUser(null)}
          title="Manage Admin Access Level"
        >
          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Grant or revoke administrative privileges for <strong className="text-slate-800 dark:text-slate-200 font-mono">{roleModalUser.email}</strong>.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Select Administrative Role:
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="none">No Admin Privileges (Standard Client)</option>
                <option value="support">Support Staff (Read-only + Suspend)</option>
                <option value="admin">Admin (Suspend, Tier Change, Analytics — No Role Granting)</option>
                <option value="super_admin">Super Admin (Full Control & Admin Delegation)</option>
              </select>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700 dark:text-slate-300">Role Permissions Overview:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li><strong>Super Admin:</strong> Full portal power, can grant/revoke other admins.</li>
                <li><strong>Admin:</strong> Operational admin, tier changes & suspensions.</li>
                <li><strong>Support:</strong> Read-only user data + account suspension.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" onClick={() => setRoleModalUser(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdateRole}
                disabled={isUpdatingRole}
              >
                {isUpdatingRole ? "Saving Role..." : "Save Admin Role"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* User Details Modal */}
      {detailsUser && (
        <Dialog
          isOpen={true}
          onClose={() => setDetailsUser(null)}
          title={`User Workspace Inspector: ${detailsUser.display_name || detailsUser.email}`}
        >
          <div className="space-y-6 pt-2 max-h-[75vh] overflow-y-auto pr-1">
            {/* Overview Box */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">User ID</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300 truncate block">
                  {detailsUser.id}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Account Tier</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                  {detailsUser.subscription_tier}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Status</span>
                <span className={`font-bold ${detailsUser.is_suspended ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {detailsUser.is_suspended ? 'Suspended' : 'Active'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Joined Date</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {new Date(detailsUser.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {loadingDetails ? (
              <div className="py-8 text-center text-slate-400 text-sm animate-pulse">
                Fetching user workspaces and recent invoices...
              </div>
            ) : (
              <>
                {/* Workspaces Section */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-500" />
                    User Workspaces ({userBusinesses.length})
                  </h4>
                  {userBusinesses.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No business workspaces created yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {userBusinesses.map((b: any) => (
                        <div key={b.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{b.name}</span>
                            {b.gstin && <span className="ml-2 font-mono text-[10px] text-emerald-600 font-semibold">GSTIN: {b.gstin}</span>}
                            <p className="text-[11px] text-slate-400">{b.email} • {b.phone}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-slate-500">
                            {toTitleCase(b.address?.city) || "India"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Invoices Section */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-500" />
                    Recent Invoices ({userInvoices.length})
                  </h4>
                  {userInvoices.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No sales documents or invoices created yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {userInvoices.slice(0, 10).map((inv: any) => (
                        <div key={inv.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {inv.doc_number || inv.document_number || 'Doc'}
                            </span>
                            <span className="ml-2 text-slate-400">({inv.customer_details?.name || inv.customer_name || inv.vendor_name || 'Client'})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                              ₹{Number(inv.grand_total ?? inv.total_amount ?? 0).toLocaleString('en-IN')}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              (inv.status || inv.payment_status) === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {inv.status || inv.payment_status || 'draft'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={() => setDetailsUser(null)}>
                Close Inspector
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
