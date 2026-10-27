/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, Office, Transaction, UserRole, WorkflowStatus, AuditLogEntry, OwnerPermissions, SecurityLogEntry, SystemAuditTrailEntry } from "./types";
import { initialUsers, initialOffices, initialTransactions } from "./data/initialData";

// View Components
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Tracker from "./components/Tracker";
import TransactionModal from "./components/TransactionModal";
import OfficeManagement from "./components/OfficeManagement";
import UserManagement from "./components/UserManagement";

// Lucide Icons
import { 
  RefreshCw, 
  HelpCircle, 
  UserCircle2, 
  ShieldAlert, 
  CheckCircle, 
  Wrench,
  ToggleRight,
  Sparkles
} from "lucide-react";

export default function App() {
  // 1. Core Persistent State
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem("rppt_users");
    const rawUsers: User[] = saved ? JSON.parse(saved) : initialUsers;
    return rawUsers.map((u) => {
      if ((u.role as string) === "System Processor" || (u.role as string) === "Processor") {
        return { ...u, role: UserRole.OWNER };
      }
      return u;
    });
  });

  const [offices, setOffices] = useState<Office[]>(() => {
    const saved = localStorage.getItem("rppt_offices");
    return saved ? JSON.parse(saved) : initialOffices;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem("rppt_transactions");
    return saved ? JSON.parse(saved) : initialTransactions;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("rppt_current_user");
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved) as User;
      if ((parsed.role as string) === "System Processor" || (parsed.role as string) === "Processor") {
        parsed.role = UserRole.OWNER;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSimulationHint, setShowSimulationHint] = useState(true);

  const [ownerPermissions, setOwnerPermissions] = useState<OwnerPermissions>(() => {
    const savedOwner = localStorage.getItem("rppt_owner_permissions");
    if (savedOwner) return JSON.parse(savedOwner);
    const savedProcessor = localStorage.getItem("rppt_processor_permissions");
    if (savedProcessor) {
      const parsed = JSON.parse(savedProcessor);
      localStorage.setItem("rppt_owner_permissions", JSON.stringify(parsed));
      localStorage.removeItem("rppt_processor_permissions");
      return parsed;
    }
    return {
      canEncode: true,
      canBookkeep: true,
      canDistribute: true,
      canAudit: true,
      canReview: true,
    };
  });

  const [securityLogs, setSecurityLogs] = useState<SecurityLogEntry[]>(() => {
    const saved = localStorage.getItem("rppt_security_logs");
    return saved ? JSON.parse(saved) : [];
  });

  const [systemAuditLogs, setSystemAuditLogs] = useState<SystemAuditTrailEntry[]>(() => {
    const saved = localStorage.getItem("rppt_system_audit_logs");
    return saved ? JSON.parse(saved) : [];
  });

  // 2. Sync to localStorage
  useEffect(() => {
    localStorage.setItem("rppt_system_audit_logs", JSON.stringify(systemAuditLogs));
  }, [systemAuditLogs]);

  useEffect(() => {
    localStorage.setItem("rppt_users", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem("rppt_security_logs", JSON.stringify(securityLogs));
  }, [securityLogs]);

  useEffect(() => {
    localStorage.setItem("rppt_owner_permissions", JSON.stringify(ownerPermissions));
  }, [ownerPermissions]);

  useEffect(() => {
    localStorage.setItem("rppt_offices", JSON.stringify(offices));
  }, [offices]);

  useEffect(() => {
    localStorage.setItem("rppt_transactions", JSON.stringify(transactions));
    // If the currently viewed transaction is updated, keep the modal content in sync
    if (selectedTransaction) {
      const refreshed = transactions.find((t) => t.id === selectedTransaction.id);
      if (refreshed) {
        setSelectedTransaction(refreshed);
      }
    }
  }, [transactions]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("rppt_current_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("rppt_current_user");
    }
  }, [currentUser]);

  // 3. System Reset Action
  const handleResetSystem = () => {
    localStorage.removeItem("rppt_users");
    localStorage.removeItem("rppt_offices");
    localStorage.removeItem("rppt_transactions");
    localStorage.removeItem("rppt_current_user");
    localStorage.removeItem("rppt_security_logs");
    localStorage.removeItem("rppt_system_audit_logs");
    
    setUsers(initialUsers);
    setOffices(initialOffices);
    setTransactions(initialTransactions);
    setSecurityLogs([]);
    setSystemAuditLogs([]);
    setCurrentUser(null);
    setActiveTab("dashboard");
    setSelectedTransaction(null);
    setShowResetConfirm(false);
  };

  const handleAddSecurityLog = (log: SecurityLogEntry) => {
    setSecurityLogs((prev) => [log, ...prev]);
  };

  const handleRecordSystemAuditLog = (actionType: "Deletion" | "Import" | "Export" | "Print" | "Assignment", details: string, fileName?: string) => {
    if (!currentUser) return;
    const newLog: SystemAuditTrailEntry = {
      id: "sa-" + Date.now(),
      timestamp: new Date().toISOString(),
      userAccount: `${currentUser.employeeName} (${currentUser.username}) - ${currentUser.role}`,
      actionType,
      fileName: fileName || "N/A",
      details
    };
    setSystemAuditLogs((prev) => [newLog, ...prev]);
  };

  // 4. Authentication Action Handlers
  const handleLoginSuccess = (user: User) => {
    const updatedUsers = users.map((u) => {
      if (u.id === user.id) {
        return { ...u, lastLogin: new Date().toISOString() };
      }
      return u;
    });
    setUsers(updatedUsers);
    setCurrentUser({ ...user, lastLogin: new Date().toISOString() });
    setActiveTab("dashboard");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedTransaction(null);
  };

  // 5. Office Management Callback Handlers
  const handleAddOffice = (newOffice: Office) => {
    setOffices([...offices, newOffice]);

    // Find assigned employee details for audit trail
    const emp = users.find((u) => u.id === newOffice.handledBy);
    const empName = emp ? `${emp.employeeName} (${emp.role.split(" / ")[0]})` : "Unassigned";

    handleRecordSystemAuditLog(
      "Assignment",
      `Registered new Office Code "${newOffice.code}" ("${newOffice.name}"). Designated Employee Handled By: ${empName}.`
    );
  };

  const handleBatchAddOffices = (newOffices: Office[]) => {
    setOffices([...offices, ...newOffices]);

    newOffices.forEach((newOffice) => {
      const emp = users.find((u) => u.id === newOffice.handledBy);
      const empName = emp ? `${emp.employeeName} (${emp.role.split(" / ")[0]})` : "Unassigned";

      handleRecordSystemAuditLog(
        "Assignment",
        `Batch Registered new Office Code "${newOffice.code}" ("${newOffice.name}"). Designated Employee Handled By: ${empName}.`
      );
    });
  };

  const handleUpdateOffice = (updatedOffice: Office) => {
    const prevOffice = offices.find((o) => o.code === updatedOffice.code);
    const nextOffices = offices.map((o) => (o.code === updatedOffice.code ? updatedOffice : o));
    setOffices(nextOffices);

    if (prevOffice) {
      const prevEmp = users.find((u) => u.id === prevOffice.handledBy);
      const prevEmpName = prevEmp ? `${prevEmp.employeeName} (${prevEmp.role.split(" / ")[0]})` : "Unassigned";

      const newEmp = users.find((u) => u.id === updatedOffice.handledBy);
      const newEmpName = newEmp ? `${newEmp.employeeName} (${newEmp.role.split(" / ")[0]})` : "Unassigned";

      if (prevOffice.handledBy !== updatedOffice.handledBy) {
        handleRecordSystemAuditLog(
          "Assignment",
          `Reassigned Office "${updatedOffice.code}". Previous Assigned Employee: ${prevEmpName}. New Assigned Employee: ${newEmpName}.`
        );
      } else {
        handleRecordSystemAuditLog(
          "Assignment",
          `Updated Office Code "${updatedOffice.code}" ("${updatedOffice.name}") details. Responsible Employee: ${newEmpName}.`
        );
      }
    }
  };

  const handleDeleteOffice = (code: string) => {
    const prevOffice = offices.find((o) => o.code === code);
    const nextOffices = offices.filter((o) => o.code !== code);
    setOffices(nextOffices);

    if (prevOffice) {
      const prevEmp = users.find((u) => u.id === prevOffice.handledBy);
      const prevEmpName = prevEmp ? `${prevEmp.employeeName} (${prevEmp.role.split(" / ")[0]})` : "Unassigned";
      handleRecordSystemAuditLog(
        "Deletion",
        `Permanently deleted Office Code "${code}" ("${prevOffice.name}"). Was handled by: ${prevEmpName}.`
      );
    }
  };

  // Get active office codes currently used in any transactions
  const getUsedOfficeCodes = (): string[] => {
    return transactions.map((t) => t.officeCode).filter((code, idx, self) => self.indexOf(code) === idx);
  };

  // 6. User Management Callback Handlers
  const handleAddUser = (newUser: User) => {
    setUsers([...users, newUser]);
  };

  const handleUpdateUser = (updatedUser: User) => {
    const nextUsers = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    setUsers(nextUsers);
    // If the admin edited themselves, update current session details
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  const handleDeleteUser = (id: string) => {
    const nextUsers = users.filter((u) => u.id !== id);
    setUsers(nextUsers);
  };

  // 7. Transaction Management Callback Handlers
  const getInitials = (name: string): string => {
    const cleaned = name.replace(/[^a-zA-Z\s]/g, "");
    const words = cleaned.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].substring(0, 3).toUpperCase();
    }
    const initials = words.map(w => w[0]).join("").toUpperCase();
    return initials.substring(0, 3);
  };

  const getDynamicOfficeForStatus = (status: WorkflowStatus): string => {
    switch (status) {
      case WorkflowStatus.RECEIVED:
      case WorkflowStatus.ENCODED:
        return "Office of the Clerk";
      case WorkflowStatus.FORWARDED_TO_BOOKKEEPER:
      case WorkflowStatus.RECEIVED_BY_BOOKKEEPER:
      case WorkflowStatus.RECORDED:
        return "Bookkeeping Section";
      case WorkflowStatus.SUBMITTED_TO_DISTRIBUTOR:
        return "Distribution Division";
      case WorkflowStatus.FORWARDED_TO_AUDITOR:
      case WorkflowStatus.UNDER_AUDIT:
        return "Audit Section";
      case WorkflowStatus.RETURNED_FOR_CORRECTION:
        return "Office of the Clerk (Returned)";
      case WorkflowStatus.FORWARDED_TO_REVIEWER:
      case WorkflowStatus.UNDER_REVIEW:
        return "Review Division";
      case WorkflowStatus.COMPLETED:
        return "Provincial Accountant Archive";
      case WorkflowStatus.ARCHIVED:
        return "System Archived Archive";
      default:
        return "Provincial Accounting Office";
    }
  };

  const handleAddTransaction = (newTxData: Omit<Transaction, "id" | "transactionNumber" | "dateReceived" | "currentStatus" | "currentAssignedUserId" | "currentAssignedOffice" | "dateLastUpdated" | "history">) => {
    const encoder = users.find((u) => u.id === newTxData.encoderId) || currentUser!;
    const initials = getInitials(encoder.employeeName);
    
    // Resetting monthly! Get current year (YY) and month (MM)
    const now = new Date();
    const yy = String(now.getFullYear()).substring(2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    
    // Filter matching month and year
    const matchPrefix = `-${yy}-${mm}-`;
    const monthlyTxs = transactions.filter((t) => t.transactionNumber.includes(matchPrefix));
    
    let nextSeq = 1;
    if (monthlyTxs.length > 0) {
      const seqs = monthlyTxs.map((t) => {
        const parts = t.transactionNumber.split("-");
        const seqStr = parts[parts.length - 1];
        const num = parseInt(seqStr, 10);
        return isNaN(num) ? 0 : num;
      });
      nextSeq = Math.max(...seqs, 0) + 1;
    }
    
    let generatedNum = `${initials}-${yy}-${mm}-${String(nextSeq).padStart(6, "0")}`;
    while (transactions.some((t) => t.transactionNumber === generatedNum)) {
      nextSeq++;
      generatedNum = `${initials}-${yy}-${mm}-${String(nextSeq).padStart(6, "0")}`;
    }

    const timestamp = now.toISOString();

    const initialLog: AuditLogEntry = {
      id: "h-" + Date.now() + "-init",
      action: "Document Logged & Encoded",
      prevStatus: null,
      newStatus: WorkflowStatus.ENCODED,
      userId: encoder.id,
      userName: encoder.employeeName,
      userRole: encoder.role,
      timestamp,
      officeCode: newTxData.officeCode,
      remarks: "Voucher encoded into system queue."
    };

    const newTx: Transaction = {
      ...newTxData,
      id: "tx-" + Date.now(),
      transactionNumber: generatedNum,
      dateReceived: timestamp,
      currentStatus: WorkflowStatus.ENCODED,
      currentAssignedUserId: encoder.id,
      currentAssignedOffice: getDynamicOfficeForStatus(WorkflowStatus.ENCODED),
      dateLastUpdated: timestamp,
      history: [initialLog]
    };

    setTransactions([newTx, ...transactions]);
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    // Dynamically assign office on update to match current status
    const updatedWithOffice = {
      ...updatedTx,
      currentAssignedOffice: getDynamicOfficeForStatus(updatedTx.currentStatus)
    };
    const nextTransactions = transactions.map((t) => (t.id === updatedWithOffice.id ? updatedWithOffice : t));
    setTransactions(nextTransactions);
    // Sync modal content too
    setSelectedTransaction(updatedWithOffice);
  };

  const handleImportTransactions = (imported: Transaction[]) => {
    const merged = [...imported];
    transactions.forEach((tx) => {
      if (!merged.some((m) => m.transactionNumber === tx.transactionNumber || m.id === tx.id)) {
        merged.push(tx);
      }
    });
    setTransactions(merged);
  };

  const handleDeleteTransaction = (txId: string, reason: string) => {
    const tx = transactions.find((t) => t.id === txId);
    if (!tx) return;

    if (currentUser?.role !== UserRole.OWNER) {
      alert("Unauthorized: Only the System Owner can delete transactions.");
      return;
    }

    const timestamp = new Date().toISOString();
    const details = `Permanently deleted transaction ${tx.transactionNumber} for Payee "${tx.payee}" of Office ${tx.officeCode} (Allocated Amount: ₱${tx.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}). Reason: ${reason}`;

    // Record in central system audit trail
    handleRecordSystemAuditLog("Deletion", details);

    // Permanently remove transaction
    const nextTransactions = transactions.filter((t) => t.id !== txId);
    setTransactions(nextTransactions);
    setSelectedTransaction(null);
  };

  // Helper to switch active user role instantly for workflow testing demo
  const handleQuickSwitchRole = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
    }
  };

  // Find office name helper
  const getOfficeName = (code: string) => {
    const found = offices.find((o) => o.code === code);
    return found ? found.name : "Department Profile Unregistered";
  };

  // 8. Render router logic
  const renderMainContent = () => {
    if (!currentUser) return null;

    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard
            transactions={transactions}
            onViewTransaction={(tx) => setSelectedTransaction(tx)}
            offices={offices}
            currentUser={currentUser}
            onRecordSystemAuditLog={handleRecordSystemAuditLog}
            onImportTransactions={handleImportTransactions}
          />
        );
      case "tracker":
        return (
          <Tracker
            transactions={transactions}
            users={users}
            offices={offices}
            currentUser={currentUser}
            onViewTransaction={(tx) => setSelectedTransaction(tx)}
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onRecordSystemAuditLog={handleRecordSystemAuditLog}
            ownerPermissions={ownerPermissions}
          />
        );
      case "offices":
        return (
          <OfficeManagement
            offices={offices}
            onAddOffice={handleAddOffice}
            onAddOffices={handleBatchAddOffices}
            onUpdateOffice={handleUpdateOffice}
            onDeleteOffice={handleDeleteOffice}
            usedOfficeCodes={getUsedOfficeCodes()}
            users={users}
            currentUser={currentUser!}
            onRecordSystemAuditLog={handleRecordSystemAuditLog}
          />
        );
      case "users":
        return (
          <UserManagement
            users={users}
            offices={offices}
            currentUser={currentUser}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            ownerPermissions={ownerPermissions}
            onUpdateOwnerPermissions={setOwnerPermissions}
            securityLogs={securityLogs}
            onAddSecurityLog={handleAddSecurityLog}
            systemAuditLogs={systemAuditLogs}
          />
        );
      default:
        return (
          <Dashboard
            transactions={transactions}
            onViewTransaction={(tx) => setSelectedTransaction(tx)}
            offices={offices}
            currentUser={currentUser}
            onRecordSystemAuditLog={handleRecordSystemAuditLog}
            onImportTransactions={handleImportTransactions}
          />
        );
    }
  };

  // If user is not authenticated, show the secure login screen
  if (!currentUser) {
    return (
      <Login 
        users={users} 
        onLoginSuccess={handleLoginSuccess} 
        onUpdateUser={handleUpdateUser} 
        onAddSecurityLog={handleAddSecurityLog} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-hidden text-slate-800">
      
      {/* 1. Left side navigation drawer */}
      <Sidebar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        officeName={getOfficeName(currentUser.assignedOffice)}
      />

      {/* 2. Right side primary viewport */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
        
        {/* Top bar with quick simulation controls and system reset */}
        <header className="bg-white border-b border-slate-200 h-14 flex items-center justify-between px-6 shrink-0 shadow-sm text-slate-800">
          
          {/* Section Breadcrumb title */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold uppercase tracking-wider">MGO / ACC</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-semibold capitalize">
              {activeTab === "dashboard" ? "System Dashboard" : 
               activeTab === "tracker" ? "Tracker Ledger" : 
               activeTab === "offices" ? "Office Configurator" : "Staff Directory"}
            </span>
          </div>

          {/* Testing Utility Panel */}
          <div className="flex items-center gap-3">
            
            {/* Simulation Assistant Dropdown */}
            {showSimulationHint && (
              <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200 py-1 px-3 rounded-lg text-[11px] text-slate-600">
                <Sparkles className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                <span>Workflow Simulator:</span>
                <select
                  value={currentUser.id}
                  onChange={(e) => handleQuickSwitchRole(e.target.value)}
                  className="bg-white text-teal-600 border border-slate-200 text-[11px] py-0.5 px-1.5 rounded font-semibold focus:outline-none cursor-pointer"
                  title="Switch to another user to simulate multi-stage forwarding instantly"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.employeeName} ({u.role.split(" / ")[0]})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quick Toggle simulator hint */}
            <button
              type="button"
              onClick={() => setShowSimulationHint(!showSimulationHint)}
              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none"
              title="Toggle Workflow Simulator Assistant Bar"
            >
              <Wrench className="w-3.5 h-3.5" />
            </button>

            {/* System Restore Button */}
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 hover:text-red-700 rounded-lg text-xs font-semibold transition-colors focus:outline-none"
              title="Reset all database logs to default simulation entries"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Demo Logs</span>
            </button>
          </div>

        </header>

        {/* Core content scrolling container */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 scrollbar">
          {renderMainContent()}
        </main>

      </div>

      {/* 3. Global details and workflows modal dialog */}
      {selectedTransaction && (
        <TransactionModal
          transaction={selectedTransaction}
          currentUser={currentUser}
          users={users}
          offices={offices}
          onClose={() => setSelectedTransaction(null)}
          onUpdateTransaction={handleUpdateTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          ownerPermissions={ownerPermissions}
        />
      )}

      {/* 4. Global Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center text-slate-800">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 mx-auto mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1 font-display">
              Reset Tracker Logs to Default
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              This will wipe out all custom offices, users, transaction vouchers, and audit histories added since starting, reverting to pre-populated simulation files. This action cannot be reversed.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetSystem}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold transition-colors focus:outline-none"
              >
                Reset Database
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
