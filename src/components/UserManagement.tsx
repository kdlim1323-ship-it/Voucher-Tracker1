/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, UserRole, Office, OwnerPermissions, SecurityLogEntry, SystemAuditTrailEntry } from "../types";
import { Plus, Edit2, Trash2, Search, X, Shield, Lock, ToggleLeft, ToggleRight, AlertTriangle, Settings2, Eye, EyeOff, ShieldCheck, Key } from "lucide-react";

interface UserManagementProps {
  users: User[];
  offices: Office[];
  currentUser: User;
  onAddUser: (user: User) => void;
  onUpdateUser: (updatedUser: User) => void;
  onDeleteUser: (id: string) => void;
  ownerPermissions: OwnerPermissions;
  onUpdateOwnerPermissions: (permissions: OwnerPermissions) => void;
  securityLogs: SecurityLogEntry[];
  onAddSecurityLog: (log: SecurityLogEntry) => void;
  systemAuditLogs?: SystemAuditTrailEntry[];
}

export default function UserManagement({
  users,
  offices,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  ownerPermissions,
  onUpdateOwnerPermissions,
  securityLogs,
  onAddSecurityLog,
  systemAuditLogs = []
}: UserManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<"personnel" | "security">("personnel");
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form Fields
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [position, setPosition] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.ENCODER);
  const [isActive, setIsActive] = useState(true);
  const [password, setPassword] = useState("pass123");
  const [confirmPassword, setConfirmPassword] = useState("pass123");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaEnrolled, setMfaEnrolled] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);

  // Custom modal states to replace browser alert/confirm/prompt (iframe restrictions)
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState("pass123");
  const [resetPasswordConfirmInput, setResetPasswordConfirmInput] = useState("pass123");
  const [showResetPasswordVal, setShowResetPasswordVal] = useState(false);
  const [showResetConfirmPasswordVal, setShowResetConfirmPasswordVal] = useState(false);
  const [customAlert, setCustomAlert] = useState<{ title: string; message: string } | null>(null);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setUserId("");
    setUsername("");
    setEmployeeName("");
    setEmployeeId("");
    setPosition("");
    setRole(UserRole.ENCODER);
    setIsActive(true);
    setPassword("pass123");
    setConfirmPassword("pass123");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setMfaEnabled(false);
    setMfaEnrolled(false);
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    if (user.role === UserRole.OWNER && currentUser.role !== UserRole.OWNER) {
      setCustomAlert({
        title: "Security Restraint",
        message: "Only a System Owner is permitted to modify System Owner accounts."
      });
      return;
    }
    setIsEditing(true);
    setUserId(user.id);
    setUsername(user.username);
    setEmployeeName(user.employeeName);
    setEmployeeId(user.employeeId || "");
    setPosition(user.position);
    setRole(user.role);
    setIsActive(user.isActive);
    setPassword(user.passwordHash || "pass123");
    setConfirmPassword(user.passwordHash || "pass123");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setMfaEnabled(user.mfaEnabled || false);
    setMfaEnrolled(user.mfaEnrolled || false);
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Form Val
    if (!username.trim() || !employeeName.trim() || !employeeId.trim() || !position.trim()) {
      setFormError("All fields are mandatory and must be populated.");
      return;
    }

    // Password fields check on creation
    if (!isEditing) {
      if (password.length < 4) {
        setFormError("Password must be at least 4 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setFormError("Passwords do not match. Please verify.");
        return;
      }
    }

    // Username format check
    if (!/^[a-zA-Z0-9_]{3,15}$/.test(username.trim())) {
      setFormError("Username must be alphanumeric, between 3 to 15 characters.");
      return;
    }

    // Check unique username for new accounts
    if (!isEditing) {
      const exists = users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase());
      if (exists) {
        setFormError(`Username "${username.trim()}" is already registered. Please choose a unique credential.`);
        return;
      }
    }

    // Check unique employeeId
    const idExists = users.some(
      (u) => u.employeeId.toLowerCase() === employeeId.trim().toLowerCase() && u.id !== userId
    );
    if (idExists) {
      setFormError(`Employee ID "${employeeId.trim()}" is already assigned to another profile.`);
      return;
    }

    // Handle editing restriction (cannot self-deactivate from Admin/Owner role)
    if (isEditing && userId === currentUser.id && !isActive) {
      setFormError("Security restraint: You cannot deactivate your own active session administrator or owner account.");
      return;
    }

    if (role === UserRole.OWNER && currentUser.role !== UserRole.OWNER) {
      setFormError("Only users with the System Owner role can assign the System Owner role.");
      return;
    }

    const existingUser = isEditing ? users.find((u) => u.id === userId) : null;

    const payload: User = {
      id: isEditing ? userId : "usr-" + Date.now(),
      username: username.trim(),
      employeeName: employeeName.trim(),
      employeeId: employeeId.trim(),
      position: position.trim(),
      contactNumber: isEditing ? existingUser?.contactNumber : undefined,
      emailAddress: isEditing ? existingUser?.emailAddress : undefined,
      role,
      isActive,
      passwordHash: password,
      mfaEnabled: mfaEnabled,
      mfaEnrolled: mfaEnabled ? (existingUser?.mfaEnrolled || false) : false,
      mfaSecret: mfaEnabled ? existingUser?.mfaSecret : undefined
    };

    if (isEditing && existingUser) {
      const wasEnabled = existingUser.mfaEnabled || false;
      if (wasEnabled !== mfaEnabled) {
        onAddSecurityLog({
          id: "sec-" + Date.now(),
          timestamp: new Date().toISOString(),
          actorId: currentUser.id,
          actorName: currentUser.employeeName,
          actorRole: currentUser.role,
          targetId: userId,
          targetName: employeeName.trim(),
          action: mfaEnabled ? "Enable" : "Disable",
          details: `MFA was manually ${mfaEnabled ? "Enabled" : "Disabled"} by administrative override.`
        });
      }
    }

    if (isEditing) {
      onUpdateUser(payload);
    } else {
      onAddUser(payload);
    }

    setShowModal(false);
  };

  const handleToggleActive = (user: User) => {
    if (user.role === UserRole.OWNER && currentUser.role !== UserRole.OWNER) {
      setCustomAlert({
        title: "Security Restraint",
        message: "Only a System Owner is permitted to modify System Owner accounts."
      });
      return;
    }
    if (user.id === currentUser.id) {
      setCustomAlert({
        title: "Security Restraint",
        message: "You cannot deactivate your own active session administrator profile."
      });
      return;
    }
    const updated: User = {
      ...user,
      isActive: !user.isActive
    };
    onUpdateUser(updated);
  };

  const handleResetPassword = (user: User) => {
    if (user.role === UserRole.OWNER && currentUser.role !== UserRole.OWNER) {
      setCustomAlert({
        title: "Security Restraint",
        message: "Only a System Owner is permitted to reset System Owner credentials."
      });
      return;
    }
    setResetPasswordUser(user);
    setResetPasswordInput("pass123");
    setResetPasswordConfirmInput("pass123");
    setShowResetPasswordVal(false);
    setShowResetConfirmPasswordVal(false);
  };

  const handleConfirmResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    if (resetPasswordInput.trim().length < 4) {
      setCustomAlert({
        title: "Validation Error",
        message: "Password must be at least 4 characters long."
      });
      return;
    }
    if (resetPasswordInput !== resetPasswordConfirmInput) {
      setCustomAlert({
        title: "Validation Error",
        message: "Passwords do not match. Please verify."
      });
      return;
    }
    const updated: User = {
      ...resetPasswordUser,
      passwordHash: resetPasswordInput.trim()
    };
    onUpdateUser(updated);
    const savedName = resetPasswordUser.employeeName;
    setResetPasswordUser(null);
    setCustomAlert({
      title: "Password Updated",
      message: `Password successfully updated for "${savedName}".`
    });
  };

  const handleDelete = (id: string, name: string) => {
    const targetUser = users.find((u) => u.id === id);
    if (targetUser && targetUser.role === UserRole.OWNER && currentUser.role !== UserRole.OWNER) {
      setCustomAlert({
        title: "Security Restraint",
        message: "Only a System Owner is permitted to delete System Owner accounts."
      });
      return;
    }
    if (id === currentUser.id) {
      setCustomAlert({
        title: "Security Restraint",
        message: "You cannot delete your own active administrator profile!"
      });
      return;
    }
    if (targetUser) {
      setDeleteConfirmUser(targetUser);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmUser) {
      onDeleteUser(deleteConfirmUser.id);
      setDeleteConfirmUser(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans text-slate-700">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 font-display">
            User Personnel Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure system authentication, assign executive roles, and audit access credentials.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all focus:outline-none"
        >
          <Plus className="w-4 h-4" />
          <span>Add User Account</span>
        </button>
      </div>

      {/* Sub-Tabs Selector */}
      <div className="flex border-b border-slate-200 gap-1 select-none">
        <button
          type="button"
          onClick={() => setActiveSubTab("personnel")}
          className={`px-4 py-2 border-b-2 font-semibold text-xs transition-colors focus:outline-none flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === "personnel"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Personnel Directory & Permissions</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("security")}
          className={`px-4 py-2 border-b-2 font-semibold text-xs transition-colors focus:outline-none flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === "security"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>System Security Log & MFA Audit Trail</span>
          {securityLogs.length > 0 && (
            <span className="ml-1.5 bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full text-[9px] font-mono">
              {securityLogs.length}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === "personnel" ? (
        <>
          {/* System Owner Role Permissions Configuration Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                System Owner Role Clearance Configurator
              </h3>
              <p className="text-[11px] text-slate-500">
                Toggle the dynamic responsibilities and workflow access rights of the "System Owner" role in real-time.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full uppercase tracking-wider self-start sm:self-auto">
            Admin Panel
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {[
            {
              key: "canEncode" as const,
              label: "Encoder Clearance",
              desc: "Allow document receipt, data encoding, & initial forward"
            },
            {
              key: "canBookkeep" as const,
              label: "Bookkeeper Clearance",
              desc: "Allow receipt acknowledgment & ledger registration"
            },
            {
              key: "canDistribute" as const,
              label: "Distributor Clearance",
              desc: "Allow auditor/reviewer workflow routing"
            },
            {
              key: "canAudit" as const,
              label: "Auditor Clearance",
              desc: "Allow deficiency flagging & audit review/signoff"
            },
            {
              key: "canReview" as const,
              label: "Reviewer Clearance",
              desc: "Allow executive review, rejection, & release approval"
            }
          ].map((perm) => {
            const isEnabled = ownerPermissions[perm.key];
            return (
              <button
                key={perm.key}
                type="button"
                onClick={() => {
                  onUpdateOwnerPermissions({
                    ...ownerPermissions,
                    [perm.key]: !isEnabled
                  });
                }}
                className={`flex flex-col justify-between text-left p-3.5 border rounded-xl transition-all hover:shadow-sm group focus:outline-none cursor-pointer ${
                  isEnabled 
                    ? "bg-indigo-50/40 border-indigo-200" 
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-[11px] font-bold ${isEnabled ? "text-indigo-950" : "text-slate-800"}`}>
                      {perm.label}
                    </span>
                    {isEnabled ? (
                      <ToggleRight className="w-5 h-5 text-indigo-600 shrink-0" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-slate-300 group-hover:text-slate-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    {perm.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control bar */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search employees by name, ID, username, role..."
          className="block w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
        />
      </div>

      {/* Personnel Grid List Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-semibold select-none">
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Position</th>
                <th className="py-3 px-4">Role Permission</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const isSelf = u.id === currentUser.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {u.employeeId}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span>{u.employeeName}</span>
                          {isSelf && (
                            <span className="bg-blue-50 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-100 font-mono">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 font-medium">
                        {u.username}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {u.position}
                      </td>
                      <td className="py-3.5 px-4 flex flex-col items-start gap-1 justify-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold border ${
                          u.role === UserRole.ADMIN
                            ? "bg-purple-50 text-purple-700 border-purple-100"
                            : u.role === UserRole.ENCODER
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : u.role === UserRole.BOOKKEEPER
                            ? "bg-teal-50 text-teal-700 border-teal-100"
                            : u.role === UserRole.DISTRIBUTOR
                            ? "bg-amber-50 text-amber-700 border-amber-100"
                            : u.role === UserRole.AUDITOR
                            ? "bg-sky-50 text-sky-700 border-sky-100"
                            : u.role === UserRole.OWNER
                            ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                            : "bg-pink-50 text-pink-700 border-pink-100"
                        }`}>
                          {u.role.split(" / ")[0]}
                        </span>
                        {u.mfaEnabled ? (
                          u.mfaEnrolled ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">
                              🔒 MFA Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">
                              ⚠️ MFA Pending
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-400 border border-slate-100/60 text-[9px] font-semibold px-1.5 py-0.5 rounded font-mono">
                            MFA Disabled
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          disabled={u.role === UserRole.OWNER && currentUser.role !== UserRole.OWNER}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                            u.role === UserRole.OWNER && currentUser.role !== UserRole.OWNER
                              ? "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed opacity-60"
                              : u.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 cursor-pointer"
                              : "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 cursor-pointer"
                          }`}
                          title={isSelf ? "Self account active" : u.role === UserRole.OWNER && currentUser.role !== UserRole.OWNER ? "System Owner locked" : "Toggle account status"}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                          {u.isActive ? "Active" : "Deactivated"}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleResetPassword(u)}
                            disabled={u.role === UserRole.OWNER && currentUser.role !== UserRole.OWNER}
                            className={`p-1.5 rounded border transition-colors focus:outline-none ${
                              u.role === UserRole.OWNER && currentUser.role !== UserRole.OWNER
                                ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed font-medium"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-200 cursor-pointer"
                            }`}
                            title={u.role === UserRole.OWNER && currentUser.role !== UserRole.OWNER ? "System Owner locked" : "Reset Plaintext Password"}
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            disabled={u.role === UserRole.OWNER && currentUser.role !== UserRole.OWNER}
                            className={`p-1.5 rounded border transition-colors focus:outline-none ${
                              u.role === UserRole.OWNER && currentUser.role !== UserRole.OWNER
                                ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-200 cursor-pointer"
                            }`}
                            title={u.role === UserRole.OWNER && currentUser.role !== UserRole.OWNER ? "System Owner locked" : "Edit employee details"}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(u.id, u.employeeName)}
                            disabled={u.role === UserRole.OWNER && currentUser.role !== UserRole.OWNER}
                            className={`p-1.5 rounded border transition-colors focus:outline-none ${
                              u.role === UserRole.OWNER && currentUser.role !== UserRole.OWNER
                                ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                                : "bg-red-50 hover:bg-red-100 text-red-600 border-red-100 cursor-pointer"
                            }`}
                            title={u.role === UserRole.OWNER && currentUser.role !== UserRole.OWNER ? "System Owner locked" : "Delete permanently"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No active personnel found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                System Security & MFA Audit Log
              </h3>
              <p className="text-[11px] text-slate-500">
                A secure ledger of cryptographic enrollment actions, de-enrollments, and state updates.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-semibold select-none">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event Action</th>
                  <th className="py-3 px-4">Target User</th>
                  <th className="py-3 px-4">Authorized Actor</th>
                  <th className="py-3 px-4">Operational Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {securityLogs.length > 0 ? (
                  securityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[10px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        })}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                          log.action === "Enrollment"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : log.action === "Reset"
                            ? "bg-red-50 text-red-700 border-red-100"
                            : log.action === "Enable"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}>
                          {log.action === "Enrollment" ? "🔒 Enrollment" :
                           log.action === "Reset" ? "🔄 Reset / De-enroll" :
                           log.action === "Enable" ? "✔️ Enabled" : "❌ Disabled"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-semibold whitespace-nowrap">
                        {log.targetName}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-[11px] font-semibold text-slate-800">{log.actorName}</div>
                        <div className="text-[9px] text-slate-400">{log.actorRole}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 text-xs text-slate-500">
                      No security audit events currently registered.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Horizontal Divider */}
          <div className="border-t border-slate-200 pt-6 mt-6">
            <div className="flex items-center gap-2.5 pb-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Settings2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  System Audit Trail & Operational Voucher Logs
                </h3>
                <p className="text-[11px] text-slate-500">
                  Official regulatory compliance trail logging permanent voucher deletions, spreadsheet exports, prints, and imports.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-semibold select-none">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action Type</th>
                    <th className="py-3 px-4">User Account & Permission</th>
                    <th className="py-3 px-4">Target File</th>
                    <th className="py-3 px-4">Audit Specifics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {systemAuditLogs.length > 0 ? (
                    systemAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-500 text-[10px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString("en-US", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit"
                          })}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                            log.actionType === "Deletion"
                              ? "bg-red-50 text-red-700 border-red-100"
                              : log.actionType === "Import"
                              ? "bg-blue-50 text-blue-700 border-blue-100"
                              : log.actionType === "Export"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-amber-50 text-amber-700 border-amber-100"
                          }`}>
                            {log.actionType === "Deletion" ? "🚨 Deletion" :
                             log.actionType === "Import" ? "📥 Import" :
                             log.actionType === "Export" ? "📤 Export" : "🖨️ Print"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-800 font-semibold">
                          {log.userAccount}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 font-semibold whitespace-nowrap">
                          {log.fileName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 max-w-sm break-words" title={log.details}>
                          {log.details}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 text-xs text-slate-500">
                        No critical voucher or system audit trail events currently registered.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Add / Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl p-6 relative my-8 text-slate-800">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 font-display mb-1 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <span>{isEditing ? "Edit Personnel Profile" : "Register New System Account"}</span>
            </h3>
            <p className="text-[11px] text-slate-500 mb-5">
              Populate unique staff identification parameters and authentication clearance.
            </p>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-100 text-xs text-red-600 rounded-xl mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                {/* Username */}
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isEditing}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. jsmith"
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 font-semibold disabled:opacity-60"
                  />
                </div>

                {/* Employee ID */}
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="e.g. EMP-2026-0001"
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>

              {/* Employee Name */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 font-semibold"
                />
              </div>

              {/* Position / Title */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Official Title / Position
                </label>
                <input
                  type="text"
                  required
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g. Administrative Officer IV"
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 font-semibold"
                />
              </div>


              {/* Role */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Role Clearance
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 font-semibold cursor-pointer"
                >
                  {Object.values(UserRole).map((r) => {
                    if (r === UserRole.OWNER && currentUser.role !== UserRole.OWNER) {
                      return null;
                    }
                    return (
                      <option key={r} value={r}>
                        {r.split(" / ")[0]}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">Active Status</span>
                  <span className="text-[10px] text-slate-400 block">Deactivating blocks authorization portal</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer animate-fade-in"
                >
                  {isActive ? (
                    <ToggleRight className="w-9 h-9 text-blue-600" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-slate-300" />
                  )}
                </button>
              </div>

              {/* Multi-Factor Authentication Settings */}
              <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-700 block flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      Google Authenticator MFA
                    </span>
                    <span className="text-[10px] text-slate-400 block">Require OTP generated via Authenticator App</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMfaEnabled(!mfaEnabled);
                    }}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  >
                    {mfaEnabled ? (
                      <ToggleRight className="w-9 h-9 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-9 h-9 text-slate-300" />
                    )}
                  </button>
                </div>

                {/* MFA Enrollment Status & Administrative Resets */}
                {mfaEnabled && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${mfaEnrolled ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`}></div>
                      <span className="text-slate-500">
                        Status: <strong className={mfaEnrolled ? "text-emerald-700" : "text-amber-700"}>{mfaEnrolled ? "Enrolled & Active" : "Pending Enrollment"}</strong>
                      </span>
                    </div>

                    {mfaEnrolled && (
                      <button
                        type="button"
                        onClick={() => {
                          setMfaEnrolled(false);
                          // Generate security audit log for de-enrollment / reset
                          onAddSecurityLog({
                            id: "sec-" + Date.now(),
                            timestamp: new Date().toISOString(),
                            actorId: currentUser.id,
                            actorName: currentUser.employeeName,
                            actorRole: currentUser.role,
                            targetId: userId,
                            targetName: employeeName,
                            action: "Reset",
                            details: "MFA enrollment parameters manually reset by Administrative override."
                          });
                        }}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Reset/De-enroll
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Password fields on creation */}
              {!isEditing && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="block w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="block w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors focus:outline-none shadow-md"
                >
                  Confirm & Save
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative text-slate-800">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <span>Confirm Delete Account</span>
            </h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to permanently delete the account of <strong>{deleteConfirmUser.employeeName}</strong> ({deleteConfirmUser.username})? 
              This operation cannot be undone and will revoke all operational logs access.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-colors focus:outline-none shadow-md"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Reset Password Modal */}
      {resetPasswordUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative text-slate-800">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600 shrink-0" />
              <span>Reset Plaintext Password</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter new authentication key for employee <strong>{resetPasswordUser.employeeName}</strong>.
            </p>
            <form onSubmit={handleConfirmResetPasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showResetPasswordVal ? "text" : "password"}
                    required
                    value={resetPasswordInput}
                    onChange={(e) => setResetPasswordInput(e.target.value)}
                    placeholder="Enter new password (min 4 chars)"
                    className="block w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPasswordVal(!showResetPasswordVal)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  >
                    {showResetPasswordVal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showResetConfirmPasswordVal ? "text" : "password"}
                    required
                    value={resetPasswordConfirmInput}
                    onChange={(e) => setResetPasswordConfirmInput(e.target.value)}
                    placeholder="Confirm new password"
                    className="block w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetConfirmPasswordVal(!showResetConfirmPasswordVal)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  >
                    {showResetConfirmPasswordVal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors focus:outline-none shadow-md"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {customAlert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative text-slate-800">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600 shrink-0" />
              <span>{customAlert.title}</span>
            </h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              {customAlert.message}
            </p>
            <button
              type="button"
              onClick={() => setCustomAlert(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors focus:outline-none"
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
