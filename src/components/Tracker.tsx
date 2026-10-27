/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Transaction, WorkflowStatus, User, UserRole, Office, OwnerPermissions } from "../types";
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Building2,
  Calendar,
  Layers,
  ChevronDown,
  X,
  FileCheck,
  Trash2,
  FileText
} from "lucide-react";

interface TrackerProps {
  transactions: Transaction[];
  users: User[];
  offices: Office[];
  currentUser: User;
  onViewTransaction: (tx: Transaction) => void;
  onAddTransaction: (newTx: Omit<Transaction, "id" | "transactionNumber" | "dateReceived" | "currentStatus" | "currentAssignedUserId" | "currentAssignedOffice" | "dateLastUpdated" | "history">) => void;
  onDeleteTransaction?: (txId: string, reason: string) => void;
  onRecordSystemAuditLog?: (actionType: "Deletion" | "Import" | "Export" | "Print", details: string, fileName?: string) => void;
  ownerPermissions: OwnerPermissions;
}

export default function Tracker({
  transactions,
  users,
  offices,
  currentUser,
  onViewTransaction,
  onAddTransaction,
  onDeleteTransaction,
  onRecordSystemAuditLog,
  ownerPermissions
}: TrackerProps) {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [filterOffice, setFilterOffice] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPayee, setFilterPayee] = useState("");
  const [filterTxNum, setFilterTxNum] = useState("");
  const [filterEncoder, setFilterEncoder] = useState("");
  const [filterBookkeeper, setFilterBookkeeper] = useState("");
  const [filterAuditor, setFilterAuditor] = useState("");
  const [filterReviewer, setFilterReviewer] = useState("");

  // Sorting state
  const [sortField, setSortField] = useState<keyof Transaction>("dateReceived");
  const [sortAscending, setSortAscending] = useState(false);

  interface CafoaFormEntry {
    cafoaNumber: string;
    amount: string;
    officeCode: string;
  }

  // New Transaction Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCafoaEntries, setNewCafoaEntries] = useState<CafoaFormEntry[]>([
    { cafoaNumber: "", amount: "", officeCode: "" }
  ]);
  const [newOffice, setNewOffice] = useState("");
  const [newPayee, setNewPayee] = useState("");
  const [newParticulars, setNewParticulars] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newVoucherType, setNewVoucherType] = useState<string>("Cash Advance");
  const [newVoucherSubcategory, setNewVoucherSubcategory] = useState<string>("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [showParticularsSuggestions, setShowParticularsSuggestions] = useState(false);

  const MASTER_DESCRIPTIONS = [
    // Cash Advance
    { text: "Cash advance for travelling expenses on official business trip", voucherType: "Cash Advance" },
    { text: "Cash advance for office petty cash fund replenishment", voucherType: "Cash Advance" },
    { text: "Cash advance for purchase of office emergency medical supplies", voucherType: "Cash Advance" },
    
    // Financial Assistance
    { text: "Financial assistance for medical support of marginalized community members", voucherType: "Financial Assistance" },
    { text: "Financial assistance for burial/funeral support of low-income families", voucherType: "Financial Assistance" },
    { text: "Educational cash assistance for scholar students' tuition support", voucherType: "Financial Assistance" },
    
    // Procurement
    { text: "Procurement of standard office stationery supplies and IT accessories", voucherType: "Procurement" },
    { text: "Procurement of specialized desktop computers and network printers for admin use", voucherType: "Procurement" },
    { text: "Procurement of cleaning janitorial supplies and sanitizers for GSO", voucherType: "Procurement" },
    
    // Payroll
    { text: "Payment of salaries and wages for regular employees", voucherType: "Payroll" },
    { text: "Payment of honorarium and allowance for administrative contract of service personnel", voucherType: "Payroll" },
    { text: "Payment of clothing/uniform allowance for public office staff", voucherType: "Payroll" },
    
    // Reimbursement
    { text: "Reimbursement of fuel and toll expenses incurred during official operations", voucherType: "Reimbursement" },
    { text: "Reimbursement of representation expenses for hosting visiting delegates", voucherType: "Reimbursement" },
    { text: "Reimbursement of office communication allowances and internet subscriptions", voucherType: "Reimbursement" }
  ];

  // Dynamic context suggestions from existing transactions
  const getSuggestions = () => {
    const historySuggestions = transactions.map(t => ({
      text: t.particulars,
      voucherType: t.voucherType,
      officeCode: t.officeCode
    }));

    const uniqueMap = new Map<string, { text: string; voucherType?: string; officeCode?: string }>();
    
    // Load master list first
    for (const item of MASTER_DESCRIPTIONS) {
      uniqueMap.set(item.text.trim().toLowerCase(), item);
    }
    
    // Load history
    for (const item of historySuggestions) {
      if (item.text && item.text.trim()) {
        uniqueMap.set(item.text.trim().toLowerCase(), item);
      }
    }

    const allList = Array.from(uniqueMap.values());
    const query = newParticulars.trim().toLowerCase();

    // Filter by query if user has started typing
    const filtered = allList.filter(item => {
      if (!query) return true; // If empty, show all matching the context
      return item.text.toLowerCase().includes(query);
    });

    // Score and sort for context-awareness
    return filtered.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      if (newVoucherType && a.voucherType === newVoucherType) scoreA += 10;
      if (newVoucherType && b.voucherType === newVoucherType) scoreB += 10;

      if (newOffice && a.officeCode === newOffice) scoreA += 5;
      if (newOffice && b.officeCode === newOffice) scoreB += 5;

      // Also sort slightly shorter descriptions first as templates
      if (scoreA === scoreB) {
        return a.text.length - b.text.length;
      }

      return scoreB - scoreA;
    });
  };

  const sortedSuggestions = getSuggestions();

  const handleUpdateCafoaEntry = (index: number, updatedFields: Partial<CafoaFormEntry>) => {
    const list = [...newCafoaEntries];
    list[index] = { ...list[index], ...updatedFields };
    
    // Auto-update main office on first entry change
    if (index === 0 && updatedFields.officeCode !== undefined) {
      setNewOffice(updatedFields.officeCode);
    }
    
    setNewCafoaEntries(list);
    
    // Calculate sum of entries
    const total = list.reduce((sum, entry) => {
      const val = parseFloat(entry.amount);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    setNewAmount(total > 0 ? total.toFixed(2) : "");
  };

  const handleAddCafoaField = () => {
    setNewCafoaEntries([
      ...newCafoaEntries,
      { cafoaNumber: "", amount: "", officeCode: newOffice }
    ]);
  };

  const handleRemoveCafoaField = (index: number) => {
    if (newCafoaEntries.length > 1) {
      const filtered = newCafoaEntries.filter((_, i) => i !== index);
      setNewCafoaEntries(filtered);
      
      const total = filtered.reduce((sum, entry) => {
        const val = parseFloat(entry.amount);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
      setNewAmount(total > 0 ? total.toFixed(2) : "");
      
      if (index === 0 && filtered.length > 0) {
        setNewOffice(filtered[0].officeCode);
      }
    }
  };

  // Filter lists
  const encoders = users.filter((u) => u.role === UserRole.ENCODER || (u.role === UserRole.OWNER && ownerPermissions.canEncode));
  const bookkeepers = users.filter((u) => u.role === UserRole.BOOKKEEPER || (u.role === UserRole.OWNER && ownerPermissions.canBookkeep));
  const auditors = users.filter((u) => u.role === UserRole.AUDITOR || (u.role === UserRole.OWNER && ownerPermissions.canAudit));
  const reviewers = users.filter((u) => u.role === UserRole.REVIEWER || (u.role === UserRole.OWNER && ownerPermissions.canReview));

  // Action helpers
  const handleSort = (field: keyof Transaction) => {
    if (sortField === field) {
      setSortAscending(!sortAscending);
    } else {
      setSortField(field);
      setSortAscending(true);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterDateStart("");
    setFilterDateEnd("");
    setFilterOffice("");
    setFilterStatus("");
    setFilterPayee("");
    setFilterTxNum("");
    setFilterEncoder("");
    setFilterBookkeeper("");
    setFilterAuditor("");
    setFilterReviewer("");
  };

  // Filter application
  const filteredTransactions = transactions.filter((tx) => {
    // 1. Global Search
    if (searchTerm.trim() !== "") {
      const s = searchTerm.toLowerCase();
      const matchesGlobal =
        tx.transactionNumber.toLowerCase().includes(s) ||
        tx.payee.toLowerCase().includes(s) ||
        tx.cafoaNumber.toLowerCase().includes(s) ||
        tx.particulars.toLowerCase().includes(s) ||
        tx.officeCode.toLowerCase().includes(s);
      if (!matchesGlobal) return false;
    }

    // 2. Payee specific filter
    if (filterPayee.trim() !== "" && !tx.payee.toLowerCase().includes(filterPayee.toLowerCase())) {
      return false;
    }

    // 3. Tx number specific filter
    if (filterTxNum.trim() !== "" && !tx.transactionNumber.toLowerCase().includes(filterTxNum.toLowerCase())) {
      return false;
    }

    // 4. Date range filter
    if (filterDateStart !== "") {
      const txDate = new Date(tx.dateReceived).getTime();
      const startDate = new Date(filterDateStart + "T00:00:00").getTime();
      if (txDate < startDate) return false;
    }
    if (filterDateEnd !== "") {
      const txDate = new Date(tx.dateReceived).getTime();
      const endDate = new Date(filterDateEnd + "T23:59:59").getTime();
      if (txDate > endDate) return false;
    }

    // 5. Office filter
    if (filterOffice !== "" && tx.officeCode !== filterOffice) {
      return false;
    }

    // 6. Status filter
    if (filterStatus !== "" && tx.currentStatus !== filterStatus) {
      return false;
    }

    // 7. Encoder filter
    if (filterEncoder !== "" && tx.encoderId !== filterEncoder) {
      return false;
    }

    // 8. Bookkeeper filter
    if (filterBookkeeper !== "" && tx.bookkeeperId !== filterBookkeeper) {
      return false;
    }

    // 9. Auditor filter
    if (filterAuditor !== "" && tx.auditorId !== filterAuditor) {
      return false;
    }

    // 10. Reviewer filter
    if (filterReviewer !== "" && tx.reviewerId !== filterReviewer) {
      return false;
    }

    return true;
  });

  // Sorting application
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (aVal === undefined || aVal === null) return sortAscending ? -1 : 1;
    if (bVal === undefined || bVal === null) return sortAscending ? 1 : -1;

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortAscending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortAscending ? aVal - bVal : bVal - aVal;
    }

    return 0;
  });

  // Create Submit Form Handler
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    // Validate multiple CAFOA entries
    if (newCafoaEntries.length === 0) {
      setCreateError("Please add at least one CAFOA entry.");
      return;
    }

    for (let i = 0; i < newCafoaEntries.length; i++) {
      const entry = newCafoaEntries[i];
      const val = entry.cafoaNumber.trim();
      if (!val) {
        setCreateError(`CAFOA Number at entry #${i + 1} is empty. Please enter a 5-digit number or select N/A.`);
        return;
      }
      if (val !== "N/A" && !/^\d{5}$/.test(val)) {
        setCreateError(`CAFOA Number "${val}" at entry #${i + 1} is invalid. It must contain exactly five numeric digits (e.g. 02458), or select N/A.`);
        return;
      }

      const amtVal = parseFloat(entry.amount);
      if (isNaN(amtVal) || amtVal <= 0) {
        setCreateError(`Please enter a valid amount greater than zero for CAFOA entry #${i + 1}.`);
        return;
      }

      if (!entry.officeCode) {
        setCreateError(`Please select a Source Office for CAFOA entry #${i + 1}.`);
        return;
      }
    }

    const amountNum = parseFloat(newAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setCreateError("Total voucher amount must be greater than zero.");
      return;
    }

    if ((newVoucherType === "Financial Assistance" || newVoucherType === "Procurement") && !newVoucherSubcategory) {
      setCreateError(`Please select a subcategory program/method for ${newVoucherType}.`);
      return;
    }

    if (!newOffice) {
      setCreateError("Primary source Office Code is missing. Please select a Source Office on CAFOA entry #1.");
      return;
    }

    if (!newPayee.trim()) {
      setCreateError("Please enter a Payee.");
      return;
    }

    if (!newParticulars.trim()) {
      setCreateError("Please enter the voucher particulars.");
      return;
    }

    const combinedCafoa = newCafoaEntries.map(c => c.cafoaNumber.trim()).join(", ");

    // Trigger callback
    onAddTransaction({
      cafoaNumber: combinedCafoa,
      cafoaNumbers: newCafoaEntries.map(c => c.cafoaNumber.trim()),
      cafoaEntries: newCafoaEntries.map(c => ({
        cafoaNumber: c.cafoaNumber.trim(),
        amount: parseFloat(c.amount) || 0,
        officeCode: c.officeCode
      })),
      officeCode: newOffice,
      payee: newPayee.trim(),
      particulars: newParticulars.trim(),
      amount: amountNum,
      voucherType: newVoucherType,
      voucherSubcategory: newVoucherSubcategory || undefined,
      encoderId: currentUser.id
    });

    // Reset Form
    setNewCafoaEntries([{ cafoaNumber: "", amount: "", officeCode: "" }]);
    setNewOffice("");
    setNewPayee("");
    setNewParticulars("");
    setNewAmount("");
    setNewVoucherType("Cash Advance");
    setNewVoucherSubcategory("");
    setShowCreateModal(false);
  };

  // Check if current user has Clerk permission to create
  const canCreate = currentUser.role === UserRole.ENCODER || currentUser.role === UserRole.ADMIN || (currentUser.role === UserRole.OWNER && ownerPermissions.canEncode);

  return (
    <div className="space-y-6 font-sans text-slate-700">
      
      {/* Tracker Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 font-display">
            Transaction Tracker
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Search, sort, filter, and advance provincial reimbursement and payroll records.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => {
              setNewOffice(currentUser.assignedOffice); // default to clerk's office
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-blue-600/10 transition-all focus:outline-none"
          >
            <Plus className="w-4 h-4" />
            <span>Encode New Voucher</span>
          </button>
        )}
      </div>

      {/* Control Panel: Search & Filter Toggle */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search payee, particulars, CAFOA, TX#, or office..."
            className="block w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 px-3.5 py-2 border rounded-xl text-xs font-semibold transition-all focus:outline-none ${
            showFilters || filteredTransactions.length < transactions.length
              ? "bg-slate-100 border-slate-300 text-teal-600"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Advanced Filters</span>
          {filteredTransactions.length < transactions.length && (
            <span className="bg-teal-500/10 text-teal-600 px-1.5 py-0.5 rounded text-[10px]">
              Active
            </span>
          )}
        </button>

        {filteredTransactions.length < transactions.length && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-xs text-slate-400 hover:text-slate-600 underline font-medium focus:outline-none"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Expandable Advanced Filters Drawer */}
      {showFilters && (
        <div className="p-5 bg-white border border-slate-200 shadow-sm rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-down text-slate-800">
          
          {/* Filter: Date range */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Date Range</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={filterDateStart}
                onChange={(e) => setFilterDateStart(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-[11px] text-slate-800 focus:outline-none focus:bg-white"
              />
              <span className="text-slate-400 self-center">-</span>
              <input
                type="date"
                value={filterDateEnd}
                onChange={(e) => setFilterDateEnd(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-[11px] text-slate-800 focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          {/* Filter: Source Office */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Source Office</label>
            <select
              value={filterOffice}
              onChange={(e) => setFilterOffice(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-[11px] text-slate-800 focus:outline-none focus:bg-white cursor-pointer"
            >
              <option value="">All Offices</option>
              {offices.map((off) => (
                <option key={off.code} value={off.code}>
                  {off.code} - {off.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter: Workflow Status */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Workflow Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-[11px] text-slate-800 focus:outline-none focus:bg-white cursor-pointer"
            >
              <option value="">All Statuses</option>
              {Object.values(WorkflowStatus).map((stat) => (
                <option key={stat} value={stat}>
                  {stat}
                </option>
              ))}
            </select>
          </div>

          {/* Filter: Transaction Number */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Voucher / TX Number</label>
            <input
              type="text"
              value={filterTxNum}
              onChange={(e) => setFilterTxNum(e.target.value)}
              placeholder="e.g. ENC-0001"
              className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white"
            />
          </div>

          {/* Filter: Payee Text */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Payee Name</label>
            <input
              type="text"
              value={filterPayee}
              onChange={(e) => setFilterPayee(e.target.value)}
              placeholder="Filter by payee name"
              className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white"
            />
          </div>

          {/* Filter: Encoder */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Assigned Encoder</label>
            <select
              value={filterEncoder}
              onChange={(e) => setFilterEncoder(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-[11px] text-slate-800 focus:outline-none focus:bg-white cursor-pointer"
            >
              <option value="">All Encoders</option>
              {encoders.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.employeeName}
                </option>
              ))}
            </select>
          </div>

          {/* Filter: Bookkeeper */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Assigned Bookkeeper</label>
            <select
              value={filterBookkeeper}
              onChange={(e) => setFilterBookkeeper(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-[11px] text-slate-800 focus:outline-none focus:bg-white cursor-pointer"
            >
              <option value="">All Bookkeepers</option>
              {bookkeepers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.employeeName}
                </option>
              ))}
            </select>
          </div>

          {/* Filter: Auditor */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Assigned Auditor</label>
            <select
              value={filterAuditor}
              onChange={(e) => setFilterAuditor(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-2 rounded-xl text-[11px] text-slate-800 focus:outline-none focus:bg-white cursor-pointer"
            >
              <option value="">All Auditors</option>
              {auditors.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.employeeName}
                </option>
              ))}
            </select>
          </div>

        </div>
      )}

      {/* Main Listing Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-semibold select-none">
                <th className="py-3 px-4 hover:text-slate-800 cursor-pointer transition-colors" onClick={() => handleSort("transactionNumber")}>
                  <div className="flex items-center gap-1.5">
                    <span>Transaction Number</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-3 px-4 hover:text-slate-800 cursor-pointer transition-colors" onClick={() => handleSort("dateReceived")}>
                  <div className="flex items-center gap-1.5">
                    <span>Date Received</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-3 px-4">CAFOA Number</th>
                <th className="py-3 px-4">Office Code</th>
                <th className="py-3 px-4 hover:text-slate-800 cursor-pointer transition-colors" onClick={() => handleSort("payee")}>
                  <div className="flex items-center gap-1.5">
                    <span>Payee</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-3 px-4">Particulars</th>
                <th className="py-3 px-4 hover:text-slate-800 cursor-pointer transition-colors" onClick={() => handleSort("amount")}>
                  <div className="flex items-center gap-1.5">
                    <span>Amount</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-3 px-4 hover:text-slate-800 cursor-pointer transition-colors" onClick={() => handleSort("currentStatus")}>
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-3 px-4">Station / Assignee</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedTransactions.length > 0 ? (
                sortedTransactions.map((tx) => {
                  const assignedUser = users.find((u) => u.id === tx.currentAssignedUserId);
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/50 text-slate-600 transition-colors cursor-pointer group"
                      onClick={() => onViewTransaction(tx)}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {tx.transactionNumber}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(tx.dateReceived).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        {tx.cafoaNumbers && tx.cafoaNumbers.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[160px]">
                            {tx.cafoaNumbers.map((num, idx) => (
                              <span
                                key={idx}
                                className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                                  num === "N/A"
                                    ? "bg-slate-100 border-slate-200 text-slate-400"
                                    : "bg-blue-50 border-blue-100 text-blue-600"
                                }`}
                              >
                                {num}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="font-mono text-slate-500 text-xs">{tx.cafoaNumber}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {tx.cafoaEntries && tx.cafoaEntries.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[120px]">
                            {Array.from(new Set(tx.cafoaEntries.map(e => e.officeCode))).map((code, idx) => (
                              <span key={idx} className="font-mono bg-slate-50 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                {code}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="font-mono bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                            {tx.officeCode}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {tx.payee}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-[150px] truncate" title={tx.particulars}>
                        {tx.particulars}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        ₱{tx.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold ${
                          tx.currentStatus === WorkflowStatus.COMPLETED
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : tx.currentStatus === WorkflowStatus.RETURNED_FOR_CORRECTION
                            ? "bg-red-50 text-red-700 border border-red-100"
                            : tx.currentStatus === WorkflowStatus.PULLED_OUT
                            ? "bg-amber-100/70 text-amber-850 border border-amber-200 font-bold"
                            : tx.currentStatus.includes("Under")
                            ? "bg-sky-50 text-sky-700 border border-sky-100"
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            tx.currentStatus === WorkflowStatus.COMPLETED ? "bg-emerald-500" :
                            tx.currentStatus === WorkflowStatus.RETURNED_FOR_CORRECTION ? "bg-red-500" :
                            tx.currentStatus === WorkflowStatus.PULLED_OUT ? "bg-amber-500 animate-pulse" :
                            tx.currentStatus.includes("Under") ? "bg-sky-500" : "bg-amber-500"
                          }`}></span>
                          {tx.currentStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-slate-700">
                            {assignedUser?.employeeName || "System Pool"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {tx.currentAssignedOffice}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onViewTransaction(tx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold transition-colors focus:outline-none"
                          >
                            <span>Manage</span>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                          {currentUser.role === UserRole.OWNER && onDeleteTransaction && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteReason("");
                                setDeletingTx(tx);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-150 border border-red-200 text-red-600 hover:text-red-700 rounded-lg text-xs font-semibold transition-colors focus:outline-none"
                              title="Permanently Delete Transaction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                    No transactions found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic summary indicator */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-400 font-mono">
          <span>Showing {sortedTransactions.length} of {transactions.length} total registered records</span>
          <span>Last System Sync: Just Now</span>
        </div>
      </div>

      {/* Creation Modal Form (only for clerk/admin) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-2xl shadow-2xl p-6 relative my-8 text-slate-800 max-h-[92vh] flex flex-col overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-5 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Encode New Voucher Document
                </h3>
                <p className="text-[11px] text-slate-500">
                  Fill in all required accounting information to log the transaction in the pipeline.
                </p>
              </div>
            </div>

            {createError && (
              <div className="p-3 bg-red-50 border border-red-100 text-xs text-red-600 rounded-xl mb-4 flex-shrink-0">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-y-auto p-1">
                {/* Left Column: Inputs */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Voucher Type */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Voucher Type
                      </label>
                      <select
                        value={newVoucherType}
                        onChange={(e) => {
                          setNewVoucherType(e.target.value);
                          setNewVoucherSubcategory("");
                        }}
                        className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
                      >
                        <option value="Cash Advance">Cash Advance</option>
                        <option value="Liquidation">Liquidation</option>
                        <option value="Financial Assistance">Financial Assistance</option>
                        <option value="Procurement">Procurement</option>
                        <option value="Reimbursement">Reimbursement</option>
                        <option value="Payroll">Payroll</option>
                      </select>
                    </div>

                    {/* Conditional Subcategory */}
                    {(newVoucherType === "Financial Assistance" || newVoucherType === "Procurement") ? (
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {newVoucherType === "Financial Assistance" ? "Program Subcategory" : "Procurement Method"}
                        </label>
                        <select
                          required
                          value={newVoucherSubcategory}
                          onChange={(e) => setNewVoucherSubcategory(e.target.value)}
                          className="block w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-amber-500 cursor-pointer font-semibold"
                        >
                          <option value="">Select Subcategory...</option>
                          {newVoucherType === "Financial Assistance" ? (
                            <>
                              <option value="Guiconsulta">Guiconsulta</option>
                              <option value="MAIFIP">MAIFIP</option>
                            </>
                          ) : (
                            <>
                              <option value="Bidding">Bidding</option>
                              <option value="Small Value Procurement (SVP)">Small Value Procurement (SVP)</option>
                            </>
                          )}
                        </select>
                      </div>
                    ) : (
                      <div className="hidden sm:block"></div>
                    )}
                  </div>

                  {/* CAFOA Encoding Section (Dynamic Multiple Fields with Amount and Source Office) */}
                  <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-150 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          CAFOA Entries / Items Details
                        </label>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Specify number, amount, and source office for each entry.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCafoaField}
                        className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 rounded-xl text-[10px] font-bold transition-all focus:outline-none"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add CAFOA
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                      {newCafoaEntries.map((entry, index) => (
                        <div key={index} className="p-3.5 bg-white border border-slate-200/85 rounded-xl space-y-3 relative shadow-xs hover:border-slate-300 transition-colors">
                          <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 font-mono flex items-center gap-1.5">
                              <span className="w-4.5 h-4.5 rounded bg-slate-100 flex items-center justify-center text-slate-600 text-[9px] font-bold">
                                #{index + 1}
                              </span>
                              CAFOA Record
                            </span>
                            {newCafoaEntries.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCafoaField(index)}
                                className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition-colors focus:outline-none"
                                title="Remove this CAFOA entry"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {/* CAFOA Number Column */}
                            <div className="space-y-1">
                              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                CAFOA Number
                              </label>
                              <div className="flex gap-1.5">
                                <select
                                  value={entry.cafoaNumber === "N/A" ? "na" : "numeric"}
                                  onChange={(e) => {
                                    if (e.target.value === "na") {
                                      handleUpdateCafoaEntry(index, { cafoaNumber: "N/A" });
                                    } else {
                                      handleUpdateCafoaEntry(index, { cafoaNumber: "" });
                                    }
                                  }}
                                  className="bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1 text-[11px] text-slate-700 cursor-pointer focus:outline-none focus:border-blue-500 font-medium"
                                >
                                  <option value="numeric">Num</option>
                                  <option value="na">N/A</option>
                                </select>

                                {entry.cafoaNumber !== "N/A" ? (
                                  <input
                                    type="text"
                                    required
                                    value={entry.cafoaNumber}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/\D/g, ""); // numeric only
                                      if (val.length <= 5) {
                                        handleUpdateCafoaEntry(index, { cafoaNumber: val });
                                      }
                                    }}
                                    placeholder="e.g. 02458"
                                    className="block w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-850 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 font-mono font-bold"
                                  />
                                ) : (
                                  <div className="block w-full px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-400 font-mono font-semibold select-none text-center">
                                    N/A
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Amount Column */}
                            <div className="space-y-1">
                              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                Amount (₱ PHP)
                              </label>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono font-bold">
                                  ₱
                                </span>
                                <input
                                  type="number"
                                  step="0.01"
                                  required
                                  value={entry.amount}
                                  onChange={(e) => {
                                    handleUpdateCafoaEntry(index, { amount: e.target.value });
                                  }}
                                  placeholder="0.00"
                                  className="block w-full pl-5 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-850 focus:outline-none focus:bg-white focus:border-blue-500 font-mono"
                                />
                              </div>
                            </div>

                            {/* Source Office Column */}
                            <div className="space-y-1">
                              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                Source Office
                              </label>
                              <select
                                required
                                value={entry.officeCode}
                                onChange={(e) => {
                                  handleUpdateCafoaEntry(index, { officeCode: e.target.value });
                                }}
                                className="block w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-850 focus:outline-none focus:bg-white focus:border-blue-500 cursor-pointer font-medium"
                              >
                                <option value="">Select...</option>
                                {offices.filter(o => o.isActive).map((off) => (
                                  <option key={off.code} value={off.code}>
                                    {off.code}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payee */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Payee / Beneficiary
                    </label>
                    <input
                      type="text"
                      required
                      value={newPayee}
                      onChange={(e) => setNewPayee(e.target.value)}
                      placeholder="Employee name, company name, or group"
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  {/* Particulars */}
                  <div className="space-y-1.5 relative">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Particulars / Description
                    </label>
                    <div className="relative">
                      <textarea
                        required
                        rows={3}
                        value={newParticulars}
                        onChange={(e) => {
                          setNewParticulars(e.target.value);
                          setShowParticularsSuggestions(true);
                        }}
                        onFocus={() => setShowParticularsSuggestions(true)}
                        placeholder="Provide precise details of the payroll/reimbursement purpose..."
                        className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 resize-none"
                      />
                      
                      {showParticularsSuggestions && sortedSuggestions.length > 0 && (
                        <>
                          {/* Backdrop to close the suggestions dropdown */}
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setShowParticularsSuggestions(false)}
                          />
                          <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100 scrollbar animate-fade-in">
                            <div className="p-2 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center select-none">
                              <span>Suggested Descriptions</span>
                              {newVoucherType && (
                                <span className="bg-blue-50 border border-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[9px] lowercase font-normal">
                                  filtered by {newVoucherType}
                                </span>
                              )}
                            </div>
                            {sortedSuggestions.slice(0, 8).map((sug, idx) => {
                              const isContextMatch = sug.voucherType === newVoucherType || sug.officeCode === newOffice;
                              return (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    setNewParticulars(sug.text);
                                    setShowParticularsSuggestions(false);
                                  }}
                                  className="hover:bg-blue-50/55 cursor-pointer p-2.5 text-left text-xs text-slate-700 flex flex-col gap-1 transition-colors group"
                                >
                                  <div className="font-medium group-hover:text-blue-700">
                                    {sug.text}
                                  </div>
                                  <div className="flex flex-wrap gap-1 text-[9px] font-mono font-bold">
                                    {sug.voucherType && (
                                      <span className={`px-1 rounded ${sug.voucherType === newVoucherType ? 'bg-blue-100/70 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                                        {sug.voucherType}
                                      </span>
                                    )}
                                    {sug.officeCode && (
                                      <span className={`px-1 rounded ${sug.officeCode === newOffice ? 'bg-teal-100/70 text-teal-700' : 'bg-slate-100 text-slate-400'}`}>
                                        {sug.officeCode}
                                      </span>
                                    )}
                                    {isContextMatch && (
                                      <span className="text-emerald-600 ml-auto font-normal lowercase tracking-wide">
                                        context matched
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Voucher Summary Panel */}
                <div className="lg:col-span-5 flex flex-col bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-4 self-stretch justify-between shadow-xs">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Voucher Summary
                        </h4>
                      </div>
                      <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg select-none uppercase tracking-wide">
                        Live Preview
                      </span>
                    </div>

                    {/* Classification Row */}
                    <div className="grid grid-cols-2 gap-3 pb-3.5 border-b border-slate-150 text-xs">
                      <div className="space-y-1">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Voucher Type</span>
                        <span className="block font-semibold text-slate-800 break-words leading-tight">{newVoucherType || "---"}</span>
                      </div>
                      {newVoucherSubcategory && (
                        <div className="space-y-1">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subcategory</span>
                          <span className="block font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 inline-block text-[10px] break-all leading-tight">
                            {newVoucherSubcategory}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Payee Row */}
                    <div className="pb-3.5 border-b border-slate-150 text-xs space-y-1">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payee / Beneficiary</span>
                      <span className="block font-bold text-slate-800 break-words text-xs leading-normal">
                        {newPayee.trim() || <span className="text-slate-400 italic font-normal">Not specified yet</span>}
                      </span>
                    </div>

                    {/* Particulars Row */}
                    <div className="pb-3.5 border-b border-slate-150 text-xs space-y-1">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Particulars / Description</span>
                      <p className="text-slate-600 leading-relaxed text-xs break-words whitespace-pre-wrap max-h-[100px] overflow-y-auto pr-1">
                        {newParticulars.trim() || <span className="text-slate-400 italic">No description provided yet</span>}
                      </p>
                    </div>

                    {/* Primary Source Office */}
                    <div className="pb-3.5 border-b border-slate-150 text-xs space-y-1">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Primary Source Office</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-300">
                          {newOffice || "None Selected"}
                        </span>
                        {newOffice && (
                          <span className="text-[10px] text-slate-500 font-medium truncate max-w-[180px]" title={offices.find(o => o.code === newOffice)?.name}>
                            {offices.find(o => o.code === newOffice)?.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* CAFOA Breakdown List */}
                    <div className="space-y-1.5">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">CAFOA Allocation Details</span>
                      <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
                        {newCafoaEntries.map((entry, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white border border-slate-200/80 rounded-xl p-2.5 hover:border-slate-300 transition-all shadow-sm">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-4.5 h-4.5 rounded bg-slate-100 flex items-center justify-center text-slate-500 text-[9px] font-bold flex-shrink-0">#{idx + 1}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border flex-shrink-0 ${entry.cafoaNumber === "N/A" ? "bg-slate-50 border-slate-200 text-slate-400" : "bg-blue-50/50 border-blue-150 text-blue-600"}`}>
                                {entry.cafoaNumber || "---"}
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold bg-slate-50 border border-slate-100 rounded px-1 flex-shrink-0">
                                {entry.officeCode || "---"}
                              </span>
                            </div>
                            <span className="font-bold text-slate-800 text-xs ml-2 flex-shrink-0">
                              ₱ {(parseFloat(entry.amount) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Total Voucher Value Card */}
                  <div className="bg-emerald-50 border border-emerald-150 rounded-2xl p-4 flex flex-col items-center justify-center text-center mt-3 shadow-sm flex-shrink-0">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Voucher Amount</span>
                    <span className="text-xl font-extrabold text-emerald-700 font-mono flex items-center gap-1">
                      <span className="text-sm">₱</span>
                      {newAmount ? parseFloat(newAmount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons (Fixed Footer) */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-all focus:outline-none shadow-md"
                >
                  Confirm & Encode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Overlay */}
      {deletingTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2 font-display">
              <Trash2 className="w-5 h-5 text-red-500 shrink-0" />
              <span>Permanently Delete Transaction</span>
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Are you sure you want to permanently delete transaction (<strong>{deletingTx.transactionNumber}</strong>)? 
              This will completely remove the voucher record. A formal deletion reason is required.
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
                placeholder="Enter formal justification for audit logs..."
                className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-red-500 focus:bg-white resize-none shadow-inner"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeletingTx(null);
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
                  if (onDeleteTransaction) {
                    onDeleteTransaction(deletingTx.id, deleteReason.trim());
                  }
                  setDeletingTx(null);
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

    </div>
  );
}
