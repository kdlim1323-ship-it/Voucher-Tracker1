/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Transaction, WorkflowStatus, User, UserRole, AuditLogEntry, Office, OwnerPermissions } from "../types";
import { calculateTransactionTimeBreakdown } from "../utils/timeCalculations";
import {
  X,
  History,
  FileCheck2,
  CornerDownLeft,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Building,
  Calendar,
  DollarSign,
  AlertCircle,
  Clock,
  HelpCircle,
  Trash2
} from "lucide-react";

interface TransactionModalProps {
  transaction: Transaction;
  currentUser: User;
  users: User[];
  offices: Office[];
  onClose: () => void;
  onUpdateTransaction: (updatedTx: Transaction) => void;
  onDeleteTransaction?: (txId: string, reason: string) => void;
  ownerPermissions: OwnerPermissions;
}

export default function TransactionModal({
  transaction,
  currentUser,
  users,
  offices,
  onClose,
  onUpdateTransaction,
  onDeleteTransaction,
  ownerPermissions
}: TransactionModalProps) {
  const [remarks, setRemarks] = useState("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [pendingAction, setPendingAction] = useState<{
    name: string;
    newStatus: WorkflowStatus;
    requiresAssignee?: boolean;
    assigneeRole?: UserRole;
    actionLabel: string;
  } | null>(null);

  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  // States for Pulled-Out / Returned Voucher Dialog
  const [showPullOutModal, setShowPullOutModal] = useState(false);
  const [pullOutReturnedTo, setPullOutReturnedTo] = useState("");
  const [pullOutReason, setPullOutReason] = useState("");
  const [pullOutRemarks, setPullOutRemarks] = useState("");
  const [pullOutErrorNotification, setPullOutErrorNotification] = useState<string | null>(null);

  // States for Received Back Dialog
  const [showReceiveBackModal, setShowReceiveBackModal] = useState(false);
  const [receiveRemarks, setReceiveRemarks] = useState("");

  const checkPullOutCustody = () => {
    const status = transaction.currentStatus;
    const isHandedOver = 
      status === WorkflowStatus.FORWARDED_TO_BOOKKEEPER ||
      status === WorkflowStatus.SUBMITTED_TO_DISTRIBUTOR ||
      status === WorkflowStatus.FORWARDED_TO_AUDITOR ||
      status === WorkflowStatus.FORWARDED_TO_REVIEWER ||
      status === WorkflowStatus.COMPLETED ||
      status === WorkflowStatus.ARCHIVED;

    const hasCustody = !isHandedOver && (
      currentUser.role === UserRole.ADMIN ||
      currentUser.role === UserRole.OWNER ||
      currentUser.assignedOffice === transaction.currentAssignedOffice ||
      currentUser.id === transaction.currentAssignedUserId
    );

    return { isHandedOver, hasCustody };
  };

  const handleOpenPullOutModal = () => {
    const { isHandedOver, hasCustody } = checkPullOutCustody();

    if (isHandedOver || !hasCustody) {
      setPullOutErrorNotification(
        "Action Denied: This document has already advanced to the next workflow stage (Forwarded/Released/Completed) or is no longer in the custody of your office/processor role."
      );
      return;
    }

    setShowPullOutModal(true);
    setPullOutReturnedTo("");
    setPullOutReason("");
    setPullOutRemarks("");
  };

  const handlePullOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { isHandedOver, hasCustody } = checkPullOutCustody();

    if (isHandedOver || !hasCustody) {
      setPullOutErrorNotification(
        "Action Denied: This document has already advanced to the next workflow stage. Pulled-Out/Returned action is no longer permitted."
      );
      setShowPullOutModal(false);
      return;
    }

    if (!pullOutReturnedTo.trim() || !pullOutReason.trim()) return;

    const timestamp = new Date().toISOString();
    const remarksText = `Returned To: ${pullOutReturnedTo.trim()} | Reason: ${pullOutReason.trim()}${pullOutRemarks.trim() ? ` | Remarks: ${pullOutRemarks.trim()}` : ""}`;
    
    const newHistoryEntry: AuditLogEntry = {
      id: "h-" + Date.now(),
      action: "Pulled-Out / Returned Voucher",
      prevStatus: transaction.currentStatus,
      newStatus: WorkflowStatus.PULLED_OUT,
      userId: currentUser.id,
      userName: currentUser.employeeName,
      userRole: currentUser.role,
      timestamp,
      officeCode: currentUser.assignedOffice || "ACC",
      remarks: remarksText
    };

    const updatedTransaction: Transaction = {
      ...transaction,
      currentStatus: WorkflowStatus.PULLED_OUT,
      dateLastUpdated: timestamp,
      remarks: pullOutRemarks.trim() || undefined,
      history: [...transaction.history, newHistoryEntry]
    };

    onUpdateTransaction(updatedTransaction);
    setShowPullOutModal(false);
    setPullOutReturnedTo("");
    setPullOutReason("");
    setPullOutRemarks("");
  };

  const handleReceiveBackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const lastNonPullOutHistory = [...transaction.history]
      .reverse()
      .find(h => h.newStatus !== WorkflowStatus.PULLED_OUT && h.newStatus !== undefined);
    const prevStatusBeforePullOut = lastNonPullOutHistory ? lastNonPullOutHistory.newStatus : WorkflowStatus.RECEIVED;

    const timestamp = new Date().toISOString();
    const newHistoryEntry: AuditLogEntry = {
      id: "h-" + Date.now(),
      action: "Received Back / Returned to Office",
      prevStatus: WorkflowStatus.PULLED_OUT,
      newStatus: prevStatusBeforePullOut,
      userId: currentUser.id,
      userName: currentUser.employeeName,
      userRole: currentUser.role,
      timestamp,
      officeCode: currentUser.assignedOffice || "ACC",
      remarks: receiveRemarks.trim() ? `Received Back Remarks: ${receiveRemarks.trim()}` : "Received Back in custody"
    };

    const updatedTransaction: Transaction = {
      ...transaction,
      currentStatus: prevStatusBeforePullOut,
      dateLastUpdated: timestamp,
      remarks: receiveRemarks.trim() || undefined,
      history: [...transaction.history, newHistoryEntry]
    };

    onUpdateTransaction(updatedTransaction);
    setShowReceiveBackModal(false);
    setReceiveRemarks("");
  };

  const formatPESO = (val: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP"
    }).format(val);
  };

  // Find candidate assignees based on role
  const getCandidateAssignees = (role: UserRole) => {
    return users.filter((u) => {
      if (!u.isActive) return false;
      if (u.role === role) return true;
      if (u.role === UserRole.OWNER) {
        if (role === UserRole.ENCODER && ownerPermissions.canEncode) return true;
        if (role === UserRole.BOOKKEEPER && ownerPermissions.canBookkeep) return true;
        if (role === UserRole.DISTRIBUTOR && ownerPermissions.canDistribute) return true;
        if (role === UserRole.AUDITOR && ownerPermissions.canAudit) return true;
        if (role === UserRole.REVIEWER && ownerPermissions.canReview) return true;
      }
      return false;
    });
  };

  // Determine current active workflow action options for the logged-in user
  const renderWorkflowActions = () => {
    const status = transaction.currentStatus;
    const role = currentUser.role;

    // If the transaction is pulled out, display the Received Back UI
    if (status === WorkflowStatus.PULLED_OUT) {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-amber-600 animate-pulse" />
              <span className="font-bold text-xs uppercase tracking-wider">Document Pulled-Out / Returned</span>
            </div>
            <p className="text-xs text-amber-700 leading-relaxed">
              This voucher is currently outside the custody of the office. The processing time computation has been suspended.
            </p>
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => {
                setShowReceiveBackModal(true);
                setReceiveRemarks("");
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none"
            >
              <FileCheck2 className="w-4 h-4" />
              Received Back / Returned to Office
            </button>
          </div>
        </div>
      );
    }

    const isCompletedOrArchived = status === WorkflowStatus.COMPLETED || status === WorkflowStatus.ARCHIVED;

    // A list of action configs to render as buttons
    const actions: {
      name: string;
      newStatus: WorkflowStatus;
      requiresAssignee?: boolean;
      assigneeRole?: UserRole;
      btnClass: string;
      label: string;
    }[] = [];

    // --- ENCODER ACTIONS ---
    if (role === UserRole.ENCODER || role === UserRole.ADMIN || (role === UserRole.OWNER && ownerPermissions.canEncode)) {
      if (status === WorkflowStatus.RECEIVED || status === WorkflowStatus.ENCODED) {
        actions.push({
          name: "Forward to Bookkeeper",
          newStatus: WorkflowStatus.FORWARDED_TO_BOOKKEEPER,
          btnClass: "bg-blue-600 hover:bg-blue-500 text-white",
          label: "Forward to Bookkeeper"
        });
      }
      if (status === WorkflowStatus.RETURNED_FOR_CORRECTION) {
        actions.push({
          name: "Resubmit to Bookkeeper",
          newStatus: WorkflowStatus.FORWARDED_TO_BOOKKEEPER,
          btnClass: "bg-teal-600 hover:bg-teal-500 text-white",
          label: "Resubmit to Bookkeeper"
        });
      }
    }

    // --- BOOKKEEPER ACTIONS ---
    if (role === UserRole.BOOKKEEPER || role === UserRole.ADMIN || (role === UserRole.OWNER && ownerPermissions.canBookkeep)) {
      if (status === WorkflowStatus.FORWARDED_TO_BOOKKEEPER) {
        actions.push({
          name: "Acknowledge Receipt",
          newStatus: WorkflowStatus.RECEIVED_BY_BOOKKEEPER,
          btnClass: "bg-blue-600 hover:bg-blue-500 text-white",
          label: "Acknowledge Receipt"
        });
      }
      if (status === WorkflowStatus.RECEIVED_BY_BOOKKEEPER) {
        actions.push({
          name: "Record in Ledger & Submit to Distributor",
          newStatus: WorkflowStatus.SUBMITTED_TO_DISTRIBUTOR,
          btnClass: "bg-teal-600 hover:bg-teal-500 text-white",
          label: "Record & Submit to Distributor"
        });
      }
    }

    // --- DISTRIBUTOR ACTIONS ---
    if (role === UserRole.DISTRIBUTOR || role === UserRole.ADMIN || (role === UserRole.OWNER && ownerPermissions.canDistribute)) {
      if (status === WorkflowStatus.SUBMITTED_TO_DISTRIBUTOR) {
        actions.push({
          name: "Forward to Assigned Auditor",
          newStatus: WorkflowStatus.FORWARDED_TO_AUDITOR,
          requiresAssignee: true,
          assigneeRole: UserRole.AUDITOR,
          btnClass: "bg-blue-600 hover:bg-blue-500 text-white",
          label: "Forward to Auditor"
        });
      }
      if (status === WorkflowStatus.FORWARDED_TO_REVIEWER) {
        // Ready to dispatch to a reviewer
        actions.push({
          name: "Forward to Assigned Reviewer",
          newStatus: WorkflowStatus.UNDER_REVIEW, // Or forwarded to reviewer
          requiresAssignee: true,
          assigneeRole: UserRole.REVIEWER,
          btnClass: "bg-pink-600 hover:bg-pink-500 text-white",
          label: "Route to Reviewer"
        });
      }
      // Return handling
      if (status === WorkflowStatus.RETURNED_FOR_CORRECTION) {
        actions.push({
          name: "Route to Clerk for Correction",
          newStatus: WorkflowStatus.RETURNED_FOR_CORRECTION,
          requiresAssignee: true,
          assigneeRole: UserRole.ENCODER,
          btnClass: "bg-red-600 hover:bg-red-500 text-white",
          label: "Route back to Encoder"
        });
      }
    }

    // --- AUDITOR ACTIONS ---
    if (role === UserRole.AUDITOR || role === UserRole.ADMIN || (role === UserRole.OWNER && ownerPermissions.canAudit)) {
      if (status === WorkflowStatus.FORWARDED_TO_AUDITOR) {
        actions.push({
          name: "Acknowledge Receipt & Audit",
          newStatus: WorkflowStatus.UNDER_AUDIT,
          btnClass: "bg-blue-600 hover:bg-blue-500 text-white",
          label: "Acknowledge & Audit"
        });
      }
      if (status === WorkflowStatus.UNDER_AUDIT) {
        actions.push({
          name: "Approve Audit Findings",
          newStatus: WorkflowStatus.FORWARDED_TO_REVIEWER,
          btnClass: "bg-emerald-600 hover:bg-emerald-500 text-white",
          label: "Approve Audit"
        });
        actions.push({
          name: "Flag Deficiencies & Return for Correction",
          newStatus: WorkflowStatus.RETURNED_FOR_CORRECTION,
          btnClass: "bg-red-600 hover:bg-red-500 text-white",
          label: "Return with Findings"
        });
      }
    }

    // --- REVIEWER ACTIONS ---
    if (role === UserRole.REVIEWER || role === UserRole.ADMIN || (role === UserRole.OWNER && ownerPermissions.canReview)) {
      if (status === WorkflowStatus.FORWARDED_TO_REVIEWER) {
        actions.push({
          name: "Begin Final Executive Review",
          newStatus: WorkflowStatus.UNDER_REVIEW,
          btnClass: "bg-pink-600 hover:bg-pink-500 text-white",
          label: "Start Final Review"
        });
      }
      if (status === WorkflowStatus.UNDER_REVIEW) {
        actions.push({
          name: "Approve & Mark Completed",
          newStatus: WorkflowStatus.COMPLETED,
          btnClass: "bg-emerald-600 hover:bg-emerald-500 text-white",
          label: "Approve & Release (Complete)"
        });
        actions.push({
          name: "Reject & Return for Correction",
          newStatus: WorkflowStatus.RETURNED_FOR_CORRECTION,
          btnClass: "bg-red-600 hover:bg-red-500 text-white",
          label: "Reject & Return"
        });
      }
    }

    const { isHandedOver: isHandedOverForPullOut, hasCustody: hasCustodyForPullOut } = checkPullOutCustody();

    if (actions.length === 0) {
      return (
        <div className="space-y-3">
          <div className="text-xs text-slate-500 italic p-4 bg-slate-950/20 border border-slate-800 rounded-xl text-center">
            You currently have no workflow actions available for this document's current state ({status}).
          </div>
          {!isCompletedOrArchived && (
            <div className="flex justify-center">
              <button
                type="button"
                disabled={!hasCustodyForPullOut || isHandedOverForPullOut}
                onClick={handleOpenPullOutModal}
                className={`px-4 py-2 rounded-xl text-xs font-semibold shadow transition-all focus:outline-none flex items-center gap-1.5 ${
                  hasCustodyForPullOut && !isHandedOverForPullOut
                    ? "bg-amber-500 hover:bg-amber-600 text-white cursor-pointer"
                    : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50"
                }`}
                title={!hasCustodyForPullOut || isHandedOverForPullOut ? "Cannot return/pull-out: Handover completed / document has already advanced to the next stage." : "Mark Voucher as Pulled-Out / Returned"}
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
                Pulled-Out / Returned Voucher
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
          Available Workflow Actions (as {currentUser.role.split(" / ")[0]})
        </h4>
        <div className="flex flex-wrap gap-2.5">
          {actions.map((act) => (
            <button
              key={act.name}
              type="button"
              onClick={() => {
                setConfirmError(null);
                setRemarks("");
                setSelectedAssigneeId("");
                setPendingAction(act);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow focus:outline-none cursor-pointer ${act.btnClass}`}
            >
              {act.label}
            </button>
          ))}
          
          {!isCompletedOrArchived && (
            <button
              type="button"
              disabled={!hasCustodyForPullOut || isHandedOverForPullOut}
              onClick={handleOpenPullOutModal}
              className={`px-3 py-2 rounded-xl text-xs font-semibold shadow transition-all focus:outline-none flex items-center gap-1.5 ${
                hasCustodyForPullOut && !isHandedOverForPullOut
                  ? "bg-amber-500 hover:bg-amber-600 text-white cursor-pointer"
                  : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50"
              }`}
              title={!hasCustodyForPullOut || isHandedOverForPullOut ? "Cannot return/pull-out: Handover completed / document has already advanced to the next stage." : "Mark Voucher as Pulled-Out / Returned"}
            >
              <CornerDownLeft className="w-3.5 h-3.5" />
              Pulled-Out / Returned Voucher
            </button>
          )}
        </div>
      </div>
    );
  };

  // Execute the confirmed workflow action
  const handleConfirmActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmError(null);

    if (!pendingAction) return;

    if (pendingAction.requiresAssignee && !selectedAssigneeId) {
      setConfirmError("Please select an assigned user to route this document.");
      return;
    }

    // If setting to Returned for Correction, remarks are highly recommended
    if (pendingAction.newStatus === WorkflowStatus.RETURNED_FOR_CORRECTION && !remarks.trim()) {
      setConfirmError("Please enter explanatory remarks/findings detailing why this voucher was returned.");
      return;
    }

    // Prepare updated transaction fields
    const prevStatus = transaction.currentStatus;
    const newStatus = pendingAction.newStatus;
    const timestamp = new Date().toISOString();

    const selectedAssignee = pendingAction.requiresAssignee
      ? users.find((u) => u.id === selectedAssigneeId)
      : null;

    // Define next user and office stage
    let nextUserId = transaction.currentAssignedUserId;
    let nextOffice = transaction.currentAssignedOffice;

    if (newStatus === WorkflowStatus.FORWARDED_TO_BOOKKEEPER) {
      // route to bookkeeper pool or first active bookkeeper
      const bkp = users.find((u) => u.role === UserRole.BOOKKEEPER && u.isActive);
      nextUserId = bkp ? bkp.id : "usr-book1";
      nextOffice = "ACC";
    } else if (newStatus === WorkflowStatus.RECEIVED_BY_BOOKKEEPER) {
      nextUserId = currentUser.id;
      nextOffice = "ACC";
    } else if (newStatus === WorkflowStatus.SUBMITTED_TO_DISTRIBUTOR) {
      const dst = users.find((u) => u.role === UserRole.DISTRIBUTOR && u.isActive);
      nextUserId = dst ? dst.id : "usr-dist1";
      nextOffice = "GSO";
    } else if (newStatus === WorkflowStatus.FORWARDED_TO_AUDITOR && selectedAssignee) {
      nextUserId = selectedAssignee.id;
      nextOffice = "AUD";
    } else if (newStatus === WorkflowStatus.UNDER_AUDIT) {
      nextUserId = currentUser.id;
      nextOffice = "AUD";
    } else if (newStatus === WorkflowStatus.FORWARDED_TO_REVIEWER) {
      // returns to distributor first, who then dispatches to reviewer
      const dst = users.find((u) => u.role === UserRole.DISTRIBUTOR && u.isActive);
      nextUserId = dst ? dst.id : "usr-dist1";
      nextOffice = "GSO";
    } else if (newStatus === WorkflowStatus.UNDER_REVIEW) {
      if (selectedAssignee) {
        nextUserId = selectedAssignee.id;
      } else {
        nextUserId = currentUser.id;
      }
      nextOffice = "PGO";
    } else if (newStatus === WorkflowStatus.COMPLETED) {
      nextUserId = currentUser.id;
      nextOffice = "COMPLETED";
    } else if (newStatus === WorkflowStatus.RETURNED_FOR_CORRECTION) {
      if (selectedAssignee) {
        nextUserId = selectedAssignee.id;
        nextOffice = selectedAssignee.assignedOffice;
      } else {
        // default back to distributor pool to handle routing
        const dst = users.find((u) => u.role === UserRole.DISTRIBUTOR && u.isActive);
        nextUserId = dst ? dst.id : "usr-dist1";
        nextOffice = "GSO";
      }
    }

    // Build the permanent audit log entry
    const newHistoryEntry: AuditLogEntry = {
      id: "h-" + Date.now(),
      action: pendingAction.name,
      prevStatus,
      newStatus,
      userId: currentUser.id,
      userName: currentUser.employeeName,
      userRole: currentUser.role,
      timestamp,
      officeCode: currentUser.assignedOffice,
      remarks: remarks.trim() !== "" ? remarks.trim() : undefined
    };

    const isBookkeeperAction = pendingAction.name === "Acknowledge Receipt" || pendingAction.name === "Record in Ledger & Submit to Distributor";
    const isDistributorAction = pendingAction.name === "Forward to Assigned Auditor" || pendingAction.name === "Forward to Assigned Reviewer" || pendingAction.name === "Route to Clerk for Correction";
    const isAuditorAction = pendingAction.name === "Acknowledge Receipt & Audit" || pendingAction.name === "Approve Audit Findings" || pendingAction.name === "Flag Deficiencies & Return for Correction";
    const isReviewerAction = pendingAction.name === "Begin Final Executive Review" || pendingAction.name === "Approve & Mark Completed" || pendingAction.name === "Reject & Return for Correction";

    // Construct the fully updated Transaction
    const updatedTransaction: Transaction = {
      ...transaction,
      currentStatus: newStatus,
      currentAssignedUserId: nextUserId,
      currentAssignedOffice: nextOffice,
      dateLastUpdated: timestamp,
      remarks: remarks.trim() !== "" ? remarks.trim() : transaction.remarks,
      // Update intermediate actor links
      bookkeeperId: (currentUser.role === UserRole.BOOKKEEPER || (currentUser.role === UserRole.OWNER && isBookkeeperAction)) ? currentUser.id : transaction.bookkeeperId,
      distributorId: (currentUser.role === UserRole.DISTRIBUTOR || (currentUser.role === UserRole.OWNER && isDistributorAction)) ? currentUser.id : transaction.distributorId,
      auditorId: (currentUser.role === UserRole.AUDITOR || (currentUser.role === UserRole.OWNER && isAuditorAction)) ? currentUser.id : transaction.auditorId,
      reviewerId: (currentUser.role === UserRole.REVIEWER || (currentUser.role === UserRole.OWNER && isReviewerAction)) ? currentUser.id : transaction.reviewerId,
      history: [...transaction.history, newHistoryEntry]
    };

    // Send callback to save in app state
    onUpdateTransaction(updatedTransaction);
    setPendingAction(null);
    setRemarks("");
    setSelectedAssigneeId("");
  };

  const timeBreakdown = calculateTransactionTimeBreakdown(transaction);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100 my-8 overflow-hidden text-slate-700">
        
        {/* Left Side: Document Metadata and Actions */}
        <div className="flex-1 p-6 space-y-5 overflow-y-auto max-h-[85vh]">
          
          {/* Header Info */}
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-[10px] bg-slate-50 border border-slate-200 text-teal-600 font-bold font-mono px-2 py-0.5 rounded uppercase">
                  {transaction.voucherType}
                </span>
                {transaction.voucherSubcategory && (
                  <span className="text-[10px] bg-purple-50 border border-purple-200 text-purple-600 font-bold font-mono px-2 py-0.5 rounded uppercase">
                    {transaction.voucherSubcategory}
                  </span>
                )}
                <span className="text-[10px] text-slate-400">
                  Received: {new Date(transaction.dateReceived).toLocaleString("en-US")}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                <h2 className="text-xl font-bold text-slate-800 font-display">
                  {transaction.transactionNumber}
                </h2>
                <span className="hidden sm:inline text-slate-300">|</span>
                <div className="flex flex-wrap gap-1 items-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mr-1">CAFOA Reference(s):</span>
                  {transaction.cafoaNumbers && transaction.cafoaNumbers.length > 0 ? (
                    transaction.cafoaNumbers.map((num, i) => (
                      <span
                        key={i}
                        className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${
                          num === "N/A"
                            ? "bg-slate-100 border-slate-300 text-slate-500"
                            : "bg-blue-50 border-blue-200 text-blue-600"
                        }`}
                      >
                        {num}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs font-bold font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                      {transaction.cafoaNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Native Close for Mobile */}
            <button
              onClick={onClose}
              className="md:hidden p-1.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="h-[1px] bg-slate-100"></div>

          {/* Core Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-xl text-xs">
            
            <div className="space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" /> Payee / Claimant:
              </span>
              <span className="font-semibold text-slate-800 block truncate" title={transaction.payee}>
                {transaction.payee}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" /> Source Department:
              </span>
              <span className="font-semibold text-teal-600 font-mono block">
                {transaction.officeCode}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" /> Particulars Summary:
              </span>
              <span className="text-slate-600 block leading-normal line-clamp-2" title={transaction.particulars}>
                {transaction.particulars}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" /> Allocated Sum:
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm block">
                {formatPESO(transaction.amount)}
              </span>
            </div>

            <div className="col-span-2 pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
              <div>
                <span className="text-slate-400">Status:</span>{" "}
                <span className="font-semibold text-slate-700">{transaction.currentStatus}</span>
              </div>
              <div>
                <span className="text-slate-400">Last Updated:</span>{" "}
                <span className="font-mono text-slate-500">
                  {new Date(transaction.dateLastUpdated).toLocaleDateString()}
                </span>
              </div>
            </div>

          </div>

          {/* CAFOA Breakdown List */}
          <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl text-xs space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-blue-600" />
              CAFOA Distribution Breakdown
            </h4>
            
            <div className="bg-white border border-slate-150 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-150 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2 px-3">Entry</th>
                    <th className="py-2 px-3">CAFOA Number</th>
                    <th className="py-2 px-3">Source Office</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {transaction.cafoaEntries && transaction.cafoaEntries.length > 0 ? (
                    transaction.cafoaEntries.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/25 transition-colors">
                        <td className="py-2 px-3 text-slate-400 font-bold">#{idx + 1}</td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            entry.cafoaNumber === "N/A"
                              ? "bg-slate-50 border-slate-200 text-slate-400"
                              : "bg-blue-50/50 border-blue-150 text-blue-600"
                          }`}>
                            {entry.cafoaNumber}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-650 font-semibold">{entry.officeCode}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-800">
                          {formatPESO(entry.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="hover:bg-slate-50/25 transition-colors">
                      <td className="py-2 px-3 text-slate-400 font-bold">#1</td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                          transaction.cafoaNumber === "N/A"
                            ? "bg-slate-50 border-slate-200 text-slate-400"
                            : "bg-blue-50/50 border-blue-150 text-blue-600"
                        }`}>
                          {transaction.cafoaNumber}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-650 font-semibold">{transaction.officeCode}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-800">
                        {formatPESO(transaction.amount)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Processing Duration Metrics */}
          <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl text-xs space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-650" />
              Processing Time Metrics (Net Duration)
            </h4>
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="bg-white p-2.5 border border-slate-100 rounded-lg shadow-sm">
                <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Total Duration</span>
                <span className="font-mono font-bold text-slate-800 text-sm block mt-0.5" id="tx-details-total-duration">
                  {timeBreakdown.totalHoursMinutes}
                </span>
              </div>
              <div className="bg-white p-2.5 border border-slate-100 rounded-lg shadow-sm">
                <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Correction Deductions</span>
                <span className="font-mono font-bold text-red-500 text-sm block mt-0.5" id="tx-details-correction-deductions">
                  -{timeBreakdown.returnHoursMinutes}
                </span>
              </div>
              <div className="bg-white p-2.5 border border-slate-100 rounded-lg shadow-sm border-l-2 border-l-teal-500">
                <span className="text-[9px] text-teal-600 font-bold block uppercase tracking-wider">Net Processing Time</span>
                <span className="font-mono font-extrabold text-teal-600 text-sm block mt-0.5" id="tx-details-net-duration">
                  {timeBreakdown.netHoursMinutes}
                </span>
              </div>
            </div>
          </div>

          {/* Current Status Banner (If Deficiencies are listed) */}
          {transaction.remarks && (
            <div className="p-3.5 bg-red-50 border border-red-100 text-xs text-red-700 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-red-600 block uppercase tracking-wider text-[10px] mb-0.5">
                  Auditor / Reviewer Remarks
                </span>
                <span className="italic">"{transaction.remarks}"</span>
              </div>
            </div>
          )}

          {/* Actions workflow trigger section */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            {renderWorkflowActions()}

            {currentUser.role === UserRole.OWNER && onDeleteTransaction && (
              <div className="pt-4 border-t border-red-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteReason("");
                    setShowDeleteConfirm(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 hover:text-red-700 rounded-xl text-xs font-semibold transition-colors focus:outline-none cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Permanently Delete Transaction</span>
                </button>
              </div>
            )}
          </div>

          {/* Inline Action Confirmation Drawer */}
          {pendingAction && (
            <form
              onSubmit={handleConfirmActionSubmit}
              className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4 animate-slide-up text-slate-800"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4.5 h-4.5 text-teal-600" />
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Confirm action: {pendingAction.name}
                </h5>
              </div>

              {confirmError && (
                <div className="p-2.5 bg-red-50 border border-red-100 text-[11px] text-red-600 rounded-lg">
                  {confirmError}
                </div>
              )}

              {/* Dynamic Assignee Dropdown if needed */}
              {pendingAction.requiresAssignee && pendingAction.assigneeRole && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Select Recipient ({pendingAction.assigneeRole.split(" / ")[0]})
                  </label>
                  <select
                    required
                    value={selectedAssigneeId}
                    onChange={(e) => setSelectedAssigneeId(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer"
                  >
                    <option value="">Select personnel...</option>
                    {getCandidateAssignees(pendingAction.assigneeRole).map((cand) => (
                      <option key={cand.id} value={cand.id}>
                        {cand.employeeName} - {cand.position} ({cand.assignedOffice})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Remarks Box */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Add Transaction Remarks
                  </label>
                  {pendingAction.newStatus === WorkflowStatus.RETURNED_FOR_CORRECTION && (
                    <span className="text-[9px] text-red-500 font-bold">Mandatory for Return</span>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter supporting comments, reference numbers, deficiency audits, or remarks..."
                  className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none resize-none shadow-sm"
                />
              </div>

              {/* Confirm Actions */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingAction(null);
                    setRemarks("");
                    setSelectedAssigneeId("");
                    setConfirmError(null);
                  }}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors focus:outline-none shadow-sm"
                >
                  Authorize & Submit
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Right Side: Detailed Audit Trail Logs Timeline */}
        <div className="w-full md:w-[320px] p-6 bg-slate-50 flex flex-col overflow-y-auto max-h-[85vh] shrink-0">
          
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <History className="w-4 h-4 text-teal-600" />
              Document Audit Trail
            </h3>
            
            {/* Desktop Close */}
            <button
              onClick={onClose}
              className="hidden md:block p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Audit Trail Processing Time Summary Widget */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 mb-4 text-xs space-y-1.5 shadow-sm">
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              <span>Net Processing Time:</span>
              <span className="font-mono font-bold text-teal-600 text-sm" id="audit-trail-net-duration">{timeBreakdown.netHoursMinutes}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-teal-500 h-full rounded-full transition-all" 
                style={{ width: `${timeBreakdown.totalMs > 0 ? (timeBreakdown.netMs / timeBreakdown.totalMs) * 100 : 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[9px] text-slate-400">
              <span id="audit-trail-total-duration">Total: {timeBreakdown.totalHoursMinutes}</span>
              <span id="audit-trail-correction-duration">Returned: {timeBreakdown.returnHoursMinutes}</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 mb-4 leading-normal">
            Every status alteration and recipient change is securely logged below in strict chronological order.
          </p>

          <div className="flex-1 relative pl-4 border-l border-slate-200 space-y-5">
            {transaction.history.map((log, index) => {
              const isLatest = index === transaction.history.length - 1;
              return (
                <div key={log.id} className="relative text-xs">
                  {/* Indicator bullet */}
                  <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 ${
                    isLatest 
                      ? "bg-teal-500 border-teal-500 ring-4 ring-teal-500/10" 
                      : "bg-white border-slate-300"
                  }`}></div>

                  {/* Log Card Content */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[10px] text-slate-450">
                      <span>{log.userName}</span>
                      <span className="font-mono">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="font-bold text-slate-800">
                      {log.action}
                    </div>
                    
                    {/* Status change chip direction */}
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-mono py-0.5">
                      {log.prevStatus ? (
                        <>
                          <span className="truncate max-w-[70px]" title={log.prevStatus}>{log.prevStatus}</span>
                          <ArrowRight className="w-2.5 h-2.5 text-slate-300 shrink-0" />
                        </>
                      ) : null}
                      <span className="text-teal-600 truncate max-w-[80px]" title={log.newStatus}>{log.newStatus}</span>
                    </div>

                    {/* Remarks if added */}
                    {log.remarks && (
                      <p className="text-[10px] text-slate-600 italic bg-white p-2 rounded border border-slate-200 mt-1 leading-normal">
                        "{log.remarks}"
                      </p>
                    )}
                  </div>

                  {/* Small absolute timestamp tag */}
                  <span className="block text-[9px] text-slate-400 font-mono mt-0.5">
                    {new Date(log.timestamp).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>

        </div>

      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500 shrink-0" />
              <span>Confirm Delete Transaction</span>
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Are you sure you want to permanently delete transaction (<strong>{transaction.transactionNumber}</strong>)? 
              This action cannot be undone. You are required to provide a deletion reason for accountability.
            </p>
            
            <div className="space-y-1.5 mb-5">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Reason for Deletion <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Enter formal reason for audit trail recording..."
                className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-500 focus:bg-white resize-none shadow-inner"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteReason("");
                }}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors focus:outline-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!deleteReason.trim()}
                onClick={() => {
                  if (!deleteReason.trim()) return;
                  setShowDeleteConfirm(false);
                  if (onDeleteTransaction) {
                    onDeleteTransaction(transaction.id, deleteReason.trim());
                  }
                  setDeleteReason("");
                }}
                className={`flex-1 py-2 text-white rounded-xl text-xs font-semibold transition-colors focus:outline-none shadow-md cursor-pointer flex justify-center items-center ${
                  deleteReason.trim()
                    ? "bg-red-600 hover:bg-red-500"
                    : "bg-red-300 cursor-not-allowed"
                }`}
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showPullOutModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800">
          <form
            onSubmit={handlePullOutSubmit}
            className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl p-6 relative space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CornerDownLeft className="w-5 h-5 text-amber-500 shrink-0" />
              <span>Mark Voucher as Returned / Pulled-Out</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Return Date & Time (Automatically Generated)
                </label>
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-mono">
                  {new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Returned To (Office or Person Responsible) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={pullOutReturnedTo}
                  onChange={(e) => setPullOutReturnedTo(e.target.value)}
                  placeholder="e.g. Accountant Office, Governor, or Jane Doe"
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Reason for Return <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={pullOutReason}
                  onChange={(e) => setPullOutReason(e.target.value)}
                  placeholder="e.g. Pending clarification on amount, missing attachments"
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Remarks / Comments
                </label>
                <textarea
                  rows={3}
                  value={pullOutRemarks}
                  onChange={(e) => setPullOutRemarks(e.target.value)}
                  placeholder="The Remarks text box is always visible and available for any additional notes..."
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:bg-white resize-none transition-colors animate-fade-in"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPullOutModal(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors focus:outline-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-md transition-colors focus:outline-none cursor-pointer"
              >
                Confirm Return
              </button>
            </div>
          </form>
        </div>
      )}

      {showReceiveBackModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800">
          <form
            onSubmit={handleReceiveBackSubmit}
            className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>Receive Voucher Back</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Receive Date & Time (Automatically Generated)
                </label>
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-mono">
                  {new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Remarks / Comments
                </label>
                <textarea
                  rows={3}
                  value={receiveRemarks}
                  onChange={(e) => setReceiveRemarks(e.target.value)}
                  placeholder="Enter any comments upon receiving the document back..."
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white resize-none transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReceiveBackModal(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors focus:outline-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors focus:outline-none cursor-pointer"
              >
                Confirm Receipt Back
              </button>
            </div>
          </form>
        </div>
      )}

      {pullOutErrorNotification && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-55 animate-fade-in text-slate-800">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative text-center">
            <div className="mx-auto w-12 h-12 bg-red-50 text-red-650 border border-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Workflow Handover Restriction</h3>
            <p className="text-xs text-slate-650 mb-6 leading-relaxed">
              {pullOutErrorNotification}
            </p>
            <button
              type="button"
              onClick={() => setPullOutErrorNotification(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors focus:outline-none cursor-pointer"
            >
              Close Notification
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
