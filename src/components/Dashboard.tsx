/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Transaction, WorkflowStatus, Office, User, UserRole } from "../types";
import { calculateTransactionTimeBreakdown } from "../utils/timeCalculations";
import {
  FileText,
  CheckCircle2,
  FileClock,
  RotateCcw,
  SearchCode,
  Eye,
  TrendingUp,
  Activity,
  DollarSign,
  Filter,
  Clock,
  Download,
  Upload,
  Printer,
  Shield,
  FileSpreadsheet
} from "lucide-react";

interface DashboardProps {
  transactions: Transaction[];
  onViewTransaction: (tx: Transaction) => void;
  offices: Office[];
  currentUser: User;
  onRecordSystemAuditLog: (actionType: "Deletion" | "Import" | "Export" | "Print", details: string, fileName?: string) => void;
  onImportTransactions: (imported: Transaction[]) => void;
}

export default function Dashboard({ 
  transactions, 
  onViewTransaction, 
  offices,
  currentUser,
  onRecordSystemAuditLog,
  onImportTransactions
}: DashboardProps) {
  const [widgetPeriod, setWidgetPeriod] = useState("all");
  // 1. Metric Calculations
  const totalCount = transactions.length;
  
  const completedCount = transactions.filter(
    (t) => t.currentStatus === WorkflowStatus.COMPLETED
  ).length;
  
  const activeCount = transactions.filter(
    (t) => t.currentStatus !== WorkflowStatus.COMPLETED
  ).length;
  
  const returnedCount = transactions.filter(
    (t) => t.currentStatus === WorkflowStatus.RETURNED_FOR_CORRECTION
  ).length;
  
  const underAuditCount = transactions.filter(
    (t) =>
      t.currentStatus === WorkflowStatus.FORWARDED_TO_AUDITOR ||
      t.currentStatus === WorkflowStatus.UNDER_AUDIT
  ).length;
  
  const underReviewCount = transactions.filter(
    (t) =>
      t.currentStatus === WorkflowStatus.FORWARDED_TO_REVIEWER ||
      t.currentStatus === WorkflowStatus.UNDER_REVIEW
  ).length;

  const totalAmount = transactions.reduce((acc, t) => acc + t.amount, 0);
  const completedAmount = transactions
    .filter((t) => t.currentStatus === WorkflowStatus.COMPLETED)
    .reduce((acc, t) => acc + t.amount, 0);

  // Processing Time Analytics (Completed Vouchers)
  const completedVouchers = transactions.filter(
    (t) => t.currentStatus === WorkflowStatus.COMPLETED
  );
  const completedBreakdowns = completedVouchers.map(calculateTransactionTimeBreakdown);
  const totalNetMs = completedBreakdowns.reduce((acc, b) => acc + b.netMs, 0);
  const avgNetMs = completedVouchers.length > 0 ? totalNetMs / completedVouchers.length : 0;
  const totalSavedReturnMs = completedBreakdowns.reduce((acc, b) => acc + b.returnMs, 0);

  const formatMsToReadable = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const seconds = totalSeconds % 60;
    
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    
    const totalHours = Math.floor(totalMinutes / 60);
    const hours = totalHours % 24;
    
    const days = Math.floor(totalHours / 24);
    
    return `${String(days).padStart(2, "0")}:${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const avgNetProcessingTimeStr = formatMsToReadable(avgNetMs);
  const totalSavedReturnTimeStr = formatMsToReadable(totalSavedReturnMs);

  // 2. Active pipeline stage breakdowns
  const encodedStageCount = transactions.filter(
    (t) =>
      t.currentStatus === WorkflowStatus.RECEIVED ||
      t.currentStatus === WorkflowStatus.ENCODED ||
      t.currentStatus === WorkflowStatus.FORWARDED_TO_BOOKKEEPER
  ).length;

  const bookkeepingStageCount = transactions.filter(
    (t) =>
      t.currentStatus === WorkflowStatus.RECEIVED_BY_BOOKKEEPER ||
      t.currentStatus === WorkflowStatus.RECORDED ||
      t.currentStatus === WorkflowStatus.SUBMITTED_TO_DISTRIBUTOR
  ).length;

  const auditStageCount = transactions.filter(
    (t) =>
      t.currentStatus === WorkflowStatus.FORWARDED_TO_AUDITOR ||
      t.currentStatus === WorkflowStatus.UNDER_AUDIT
  ).length;

  const reviewStageCount = transactions.filter(
    (t) =>
      t.currentStatus === WorkflowStatus.FORWARDED_TO_REVIEWER ||
      t.currentStatus === WorkflowStatus.UNDER_REVIEW
  ).length;

  // 3. Department (Office Code) breakdown for visual indicator with selected reporting period
  const availablePeriods = Array.from(
    new Set(
      transactions.map((t) => {
        const dateObj = new Date(t.dateReceived);
        if (isNaN(dateObj.getTime())) return "";
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        return `${year}-${month}`;
      }).filter(Boolean)
    )
  ).sort((a, b) => b.localeCompare(a));

  const formatPeriodLabel = (period: string) => {
    const [year, month] = period.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const filteredTxsForWidget = widgetPeriod === "all"
    ? transactions
    : transactions.filter((t) => {
        const dateObj = new Date(t.dateReceived);
        if (isNaN(dateObj.getTime())) return false;
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        return `${year}-${month}` === widgetPeriod;
      });

  const widgetTotalCount = filteredTxsForWidget.length;

  const officeCounts: Record<string, number> = {};
  filteredTxsForWidget.forEach((t) => {
    officeCounts[t.officeCode] = (officeCounts[t.officeCode] || 0) + 1;
  });

  const officeDistribution = Object.entries(officeCounts).map(([office, count]) => ({
    office,
    count,
    percentage: widgetTotalCount > 0 ? Math.round((count / widgetTotalCount) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  // 4. Monthly Summary (mock breakdown using mock dates in current data)
  // Let's divide into Jun and Jul 2026 based on transaction list
  const junTransactions = transactions.filter((t) => t.dateReceived.includes("-06-"));
  const julTransactions = transactions.filter((t) => t.dateReceived.includes("-07-"));

  const isPayrollLike = (type: string) => type === "Payroll" || type === "Financial Assistance";

  const junReimbursement = junTransactions.filter((t) => !isPayrollLike(t.voucherType)).reduce((acc, t) => acc + t.amount, 0);
  const junPayroll = junTransactions.filter((t) => isPayrollLike(t.voucherType)).reduce((acc, t) => acc + t.amount, 0);
  
  const julReimbursement = julTransactions.filter((t) => !isPayrollLike(t.voucherType)).reduce((acc, t) => acc + t.amount, 0);
  const julPayroll = julTransactions.filter((t) => isPayrollLike(t.voucherType)).reduce((acc, t) => acc + t.amount, 0);

  // Helper to format currency
  const formatPESO = (val: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP"
    }).format(val);
  };

  // Recently processed (sorted by last updated date descending)
  const recentlyProcessed = [...transactions]
    .sort((a, b) => new Date(b.dateLastUpdated).getTime() - new Date(a.dateLastUpdated).getTime())
    .slice(0, 5);

  // --- ROLE-BASED ACCESS CONTROL CONTROLS ---
  const canImport = currentUser.role === UserRole.OWNER || currentUser.role === UserRole.ADMIN;
  const canExport = currentUser.role === UserRole.OWNER || currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.BOOKKEEPER || currentUser.role === UserRole.AUDITOR || currentUser.role === UserRole.REVIEWER;
  const canPrint = true; // All registered personnel can print standard report summaries

  // --- ACTIONS ---
  const handleExportCSV = () => {
    if (!canExport) {
      alert("Unauthorized: Your user role does not have authorization to export data ledgers.");
      return;
    }
    const headers = ["Transaction Number", "Date Received", "CAFOA Number", "Office Code", "Payee", "Particulars", "Amount", "Voucher Type", "Current Status", "Last Updated"];
    const rows = transactions.map((t) => [
      t.transactionNumber,
      t.dateReceived,
      t.cafoaNumber,
      t.officeCode,
      `"${t.payee.replace(/"/g, '""')}"`,
      `"${t.particulars.replace(/"/g, '""')}"`,
      t.amount,
      t.voucherType,
      t.currentStatus,
      t.dateLastUpdated
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    const fileName = `rppt_ledger_export_${new Date().toISOString().slice(0, 10)}.csv`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onRecordSystemAuditLog("Export", `Exported transactions ledger as CSV (${transactions.length} records)`, fileName);
  };

  const handleExportExcel = () => {
    if (!canExport) {
      alert("Unauthorized: Your user role does not have authorization to export data ledgers.");
      return;
    }
    const headers = ["Transaction Number", "Date Received", "CAFOA Number", "Office Code", "Payee", "Particulars", "Amount", "Voucher Type", "Current Status", "Last Updated"];
    const rows = transactions.map((t) => [
      t.transactionNumber,
      t.dateReceived,
      t.cafoaNumber,
      t.officeCode,
      t.payee,
      t.particulars,
      t.amount,
      t.voucherType,
      t.currentStatus,
      t.dateLastUpdated
    ]);
    const content = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
    const blob = new Blob([content], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    
    const fileName = `rppt_ledger_export_${new Date().toISOString().slice(0, 10)}.xls`;
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onRecordSystemAuditLog("Export", `Exported transactions ledger as Excel spreadsheet TSV (${transactions.length} records)`, fileName);
  };

  const handlePrintReport = () => {
    if (!canPrint) {
      alert("Unauthorized: Your user role does not have authorization to print system reports.");
      return;
    }
    onRecordSystemAuditLog("Print", `Triggered browser paper/PDF layout compilation for System Operational Dashboard`);
    window.print();
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canImport) {
      alert("Unauthorized: Only the System Owner or System Administrator can import external ledgers.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let importedTxs: Transaction[] = [];

        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            importedTxs = parsed;
          } else {
            throw new Error("Invalid format. Expected a JSON array.");
          }
        } else if (file.name.endsWith(".csv")) {
          const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
          if (lines.length <= 1) {
            throw new Error("Empty or single-row CSV.");
          }
          importedTxs = lines.slice(1).map((line, idx) => {
            const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",");
            const clean = (val: string) => val ? val.replace(/^"|"$/g, '').trim() : "";
            
            const txNum = clean(matches[0] || `IMP-TX-${Date.now()}-${idx}`);
            const dateRec = clean(matches[1] || new Date().toISOString());
            const cafoa = clean(matches[2] || "N/A");
            const office = clean(matches[3] || "N/A");
            const payee = clean(matches[4] || "Imported Payee");
            const particulars = clean(matches[5] || "Imported particulars summary");
            const amount = parseFloat(clean(matches[6])) || 0.0;
            const type = clean(matches[7]) === "Payroll" ? "Payroll" : "Reimbursement";
            const status = (clean(matches[8]) as any) || WorkflowStatus.RECEIVED;

            return {
              id: `tx-imp-${Date.now()}-${idx}`,
              transactionNumber: txNum,
              dateReceived: dateRec,
              cafoaNumber: cafoa,
              cafoaNumbers: [cafoa],
              officeCode: office,
              payee,
              particulars,
              amount,
              voucherType: type,
              currentStatus: status,
              currentAssignedUserId: currentUser.id,
              currentAssignedOffice: "Office of the Clerk",
              dateLastUpdated: new Date().toISOString(),
              encoderId: currentUser.id,
              history: [
                {
                  id: `h-imp-${Date.now()}-${idx}`,
                  action: "Ledger Record Imported",
                  prevStatus: null,
                  newStatus: status,
                  userId: currentUser.id,
                  userName: currentUser.employeeName,
                  userRole: currentUser.role,
                  timestamp: new Date().toISOString(),
                  officeCode: office,
                  remarks: "Bulk imported from external data ledger."
                }
              ]
            } as Transaction;
          });
        } else {
          alert("Unsupported file type. Please upload a .csv or .json file.");
          return;
        }

        if (importedTxs.length === 0) {
          alert("No records parsed from file.");
          return;
        }

        const isValid = importedTxs.every(t => t.transactionNumber && t.payee && t.amount !== undefined);
        if (!isValid) {
          alert("File parsed but data structure is missing required fields (Transaction Number, Payee, Amount).");
          return;
        }

        onImportTransactions(importedTxs);
        onRecordSystemAuditLog("Import", `Bulk imported and integrated ${importedTxs.length} transaction entries from file`, file.name);
        alert(`Successfully imported and integrated ${importedTxs.length} transaction entries!`);
      } catch (err: any) {
        alert("Error parsing file: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-6 font-sans text-slate-700">
      
      {/* Upper header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 font-display">
            Operational Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time tracking of provincial vouchers, audits, reviews, and payroll distributions.
          </p>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm px-4 py-2.5 rounded-xl flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
          <div className="text-xs">
            <span className="text-slate-500">Live Status Check:</span>{" "}
            <span className="font-semibold text-emerald-600">System Sync Active</span>
          </div>
        </div>
      </div>

      {/* Document Control and Data Portability Center */}
      <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-500" />
              <span>Document Controls & Ledger Portability</span>
            </h2>
            <p className="text-xs text-slate-500">
              Role-restricted tools to audit, print, import, and export the official voucher repository.
            </p>
          </div>
          <div className="text-[10px] bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full font-semibold">
            Current Session: <span className="text-slate-900 underline">{currentUser.employeeName} ({currentUser.role})</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {/* Import Ledger Button */}
          <div className="relative group">
            <input
              type="file"
              id="dashboard-import-file"
              accept=".csv,.json"
              className="hidden"
              disabled={!canImport}
              onChange={handleImportFileChange}
            />
            <button
              type="button"
              disabled={!canImport}
              onClick={() => document.getElementById("dashboard-import-file")?.click()}
              className={`w-full flex items-center justify-center gap-2.5 px-4 py-3 border rounded-xl text-xs font-semibold transition-all shadow-sm ${
                canImport
                  ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 cursor-pointer"
                  : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Upload className="w-4 h-4 text-blue-500 shrink-0" />
              <div className="text-left">
                <div className="font-bold">Import Data Ledger</div>
                <div className="text-[9px] text-slate-400 font-normal">
                  {canImport ? "Support CSV / JSON" : "Requires Owner / Admin"}
                </div>
              </div>
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            disabled={!canExport}
            onClick={handleExportCSV}
            className={`flex items-center justify-center gap-2.5 px-4 py-3 border rounded-xl text-xs font-semibold transition-all shadow-sm ${
              canExport
                ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 cursor-pointer"
                : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Download className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="text-left">
              <div className="font-bold">Export CSV</div>
              <div className="text-[9px] text-slate-400 font-normal">
                {canExport ? "Standard Data Table" : "Access Restricted"}
              </div>
            </div>
          </button>

          {/* Export Excel Button */}
          <button
            type="button"
            disabled={!canExport}
            onClick={handleExportExcel}
            className={`flex items-center justify-center gap-2.5 px-4 py-3 border rounded-xl text-xs font-semibold transition-all shadow-sm ${
              canExport
                ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 cursor-pointer"
                : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-500 shrink-0" />
            <div className="text-left">
              <div className="font-bold">Export Excel (XLS)</div>
              <div className="text-[9px] text-slate-400 font-normal">
                {canExport ? "Native Spreadsheet Layout" : "Access Restricted"}
              </div>
            </div>
          </button>

          {/* Print Dashboard Button */}
          <button
            type="button"
            disabled={!canPrint}
            onClick={handlePrintReport}
            className={`flex items-center justify-center gap-2.5 px-4 py-3 border rounded-xl text-xs font-semibold transition-all shadow-sm ${
              canPrint
                ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 cursor-pointer"
                : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Printer className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="text-left">
              <div className="font-bold">Print & Save PDF</div>
              <div className="text-[9px] text-slate-400 font-normal">
                {canPrint ? "Standard Paper Compiler" : "Access Restricted"}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Grid of Key Performance Indicators (6 required stats) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Vouchers */}
        <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl flex flex-col justify-between hover:border-blue-200 hover:shadow-md transition-all text-slate-800">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Vouchers</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-800">{totalCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">Registered Entries</div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl flex flex-col justify-between hover:border-blue-200 hover:shadow-md transition-all text-slate-800">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-teal-600">{completedCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">Vouchers Released</div>
          </div>
        </div>

        {/* Active Workflow */}
        <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl flex flex-col justify-between hover:border-blue-200 hover:shadow-md transition-all text-slate-800">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Pipeline</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-purple-600">{activeCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">In Transit / Processing</div>
          </div>
        </div>

        {/* Returned Vouchers */}
        <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl flex flex-col justify-between hover:border-blue-200 hover:shadow-md transition-all text-slate-800">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Returned</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-red-500">{returnedCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">Needs Correction</div>
          </div>
        </div>

        {/* Under Audit */}
        <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl flex flex-col justify-between hover:border-blue-200 hover:shadow-md transition-all text-slate-800">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Under Audit</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
              <SearchCode className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-sky-600">{underAuditCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">Audit Queue</div>
          </div>
        </div>

        {/* Under Review */}
        <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl flex flex-col justify-between hover:border-blue-200 hover:shadow-md transition-all text-slate-800">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Under Review</span>
            <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600">
              <FileClock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-pink-600">{underReviewCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">Final Approval Queue</div>
          </div>
        </div>
      </div>

      {/* Operational Efficiency & Processing Time Metrics Banner */}
      <div className="bg-gradient-to-r from-teal-500/10 to-blue-500/10 border border-teal-200/50 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-slate-850">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-white shadow-sm shrink-0">
            <FileClock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Operational Processing Efficiency</h3>
            <p className="text-[11px] text-slate-500 max-w-xl">
              Automatically tracking Net Document Processing Time by subtracting returned duration from total elapsed pipeline time.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 w-full md:w-auto shrink-0">
          <div className="bg-white/80 backdrop-blur border border-teal-100/60 px-4 py-2 rounded-xl flex-1 md:flex-initial text-center md:text-left min-w-[150px]">
            <span className="text-[9px] uppercase font-semibold text-slate-400 tracking-wider">Avg. Net Processing Time</span>
            <span className="block text-lg font-bold text-teal-600 font-mono mt-0.5" id="dashboard-avg-net-time">{avgNetProcessingTimeStr}</span>
          </div>
          <div className="bg-white/80 backdrop-blur border border-teal-100/60 px-4 py-2 rounded-xl flex-1 md:flex-initial text-center md:text-left min-w-[150px]">
            <span className="text-[9px] uppercase font-semibold text-slate-400 tracking-wider">Total Return Pause Duration</span>
            <span className="block text-lg font-bold text-blue-600 font-mono mt-0.5" id="dashboard-total-paused-time">{totalSavedReturnTimeStr}</span>
          </div>
        </div>
      </div>

      {/* Financial Overview & Workflow Pipeline Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Financial Overview Panel */}
        <div className="lg:col-span-1 bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col justify-between text-slate-800">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-teal-600" />
              Financial Statistics (PHP)
            </h3>
            
            <div className="space-y-4">
              <div>
                <span className="text-[11px] text-slate-400 block">Total Budget Encoded</span>
                <span className="text-2xl font-bold text-slate-800 font-mono">
                  {formatPESO(totalAmount)}
                </span>
              </div>
              <div className="h-[1px] bg-slate-100"></div>
              <div>
                <span className="text-[11px] text-slate-400 block">Completed & Paid Vouchers</span>
                <span className="text-xl font-bold text-teal-600 font-mono">
                  {formatPESO(completedAmount)}
                </span>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-teal-500 h-full rounded-full transition-all"
                    style={{ width: `${totalAmount > 0 ? (completedAmount / totalAmount) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {totalAmount > 0 ? Math.round((completedAmount / totalAmount) * 100) : 0}% Liquidation Rate
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
            <div className="font-semibold text-slate-700 mb-2">Voucher Type Breakdown</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px]">
              {Array.from(new Set(transactions.map((t) => t.voucherType))).map((type) => (
                <div key={type} className="flex flex-col">
                  <span className="text-slate-400 font-medium truncate">{type}:</span>
                  <span className="block font-bold font-mono text-teal-600">
                    {transactions.filter((t) => t.voucherType === type).length} items
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Workflow Active Funnel Visualizer */}
        <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-2xl p-5 text-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-600" />
            Active Workflow Pipeline
          </h3>

          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Overview of active vouchers currently waiting at each administrative station:
            </p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
              {/* Stage 1: Clerk */}
              <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl text-center relative overflow-hidden">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">1. Clerk</div>
                <div className="text-2xl font-bold text-slate-800 my-1.5">{encodedStageCount}</div>
                <div className="text-[9px] text-blue-600 font-semibold uppercase bg-blue-50 py-0.5 rounded">Encoding</div>
              </div>

              {/* Stage 2: Bookkeeping */}
              <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl text-center relative overflow-hidden">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">2. Bookkeeper</div>
                <div className="text-2xl font-bold text-slate-800 my-1.5">{bookkeepingStageCount}</div>
                <div className="text-[9px] text-teal-600 font-semibold uppercase bg-teal-50 py-0.5 rounded">Recording</div>
              </div>

              {/* Stage 3: Audit */}
              <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl text-center relative overflow-hidden">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">3. Auditor</div>
                <div className="text-2xl font-bold text-slate-800 my-1.5">{auditStageCount}</div>
                <div className="text-[9px] text-sky-600 font-semibold uppercase bg-sky-50 py-0.5 rounded">Auditing</div>
              </div>

              {/* Stage 4: Review */}
              <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl text-center relative overflow-hidden">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">4. Reviewer</div>
                <div className="text-2xl font-bold text-slate-800 my-1.5">{reviewStageCount}</div>
                <div className="text-[9px] text-pink-600 font-semibold uppercase bg-pink-50 py-0.5 rounded">Reviewing</div>
              </div>

              {/* State 5: Returned */}
              <div className="p-3 bg-slate-50 border border-red-100 rounded-xl text-center col-span-2 md:col-span-1">
                <div className="text-[10px] uppercase font-bold text-red-500 tracking-wider">Returned</div>
                <div className="text-2xl font-bold text-red-500 my-1.5">{returnedCount}</div>
                <div className="text-[9px] text-red-600 font-semibold uppercase bg-red-50 py-0.5 rounded">Correction</div>
              </div>
            </div>

            {/* Visual Progress Funnel Bar */}
            <div className="mt-4 pt-2">
              <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
                <div
                  className="bg-blue-500 transition-all"
                  style={{ width: `${totalCount > 0 ? (encodedStageCount / totalCount) * 100 : 0}%` }}
                  title={`Clerk Station: ${encodedStageCount}`}
                ></div>
                <div
                  className="bg-teal-500 transition-all"
                  style={{ width: `${totalCount > 0 ? (bookkeepingStageCount / totalCount) * 100 : 0}%` }}
                  title={`Bookkeeper Station: ${bookkeepingStageCount}`}
                ></div>
                <div
                  className="bg-sky-400 transition-all"
                  style={{ width: `${totalCount > 0 ? (auditStageCount / totalCount) * 100 : 0}%` }}
                  title={`Auditor Station: ${auditStageCount}`}
                ></div>
                <div
                  className="bg-pink-500 transition-all"
                  style={{ width: `${totalCount > 0 ? (reviewStageCount / totalCount) * 100 : 0}%` }}
                  title={`Reviewer Station: ${reviewStageCount}`}
                ></div>
                <div
                  className="bg-red-500 transition-all"
                  style={{ width: `${totalCount > 0 ? (returnedCount / totalCount) * 100 : 0}%` }}
                  title={`Returned For Correction: ${returnedCount}`}
                ></div>
                <div
                  className="bg-emerald-600 transition-all"
                  style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                  title={`Completed Vouchers: ${completedCount}`}
                ></div>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-[9px] text-slate-400 mt-2 font-mono">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Clerk</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span> Bookkeeper</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span> Auditor</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span> Reviewer</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Returned</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Completed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Summary Custom Charts (SVG) and Department Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly Summary Bar Chart (Self-Contained SVG) */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 text-slate-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Monthly Summary Breakdown
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">FY 2026</span>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Total monetary volume allocated for Reimbursements vs. Payroll across active fiscal months:
            </p>

            {/* Custom SVG Bar Chart */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <svg viewBox="0 0 400 180" className="w-full h-auto">
                {/* Horizontal grid lines */}
                <line x1="50" y1="20" x2="380" y2="20" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="50" y1="65" x2="380" y2="65" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="50" y1="110" x2="380" y2="110" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="50" y1="150" x2="380" y2="150" stroke="#cbd5e1" strokeWidth="1" />

                {/* Y-axis labels */}
                <text x="40" y="24" fill="#94a3b8" fontSize="8" textAnchor="end">₱400K</text>
                <text x="40" y="69" fill="#94a3b8" fontSize="8" textAnchor="end">₱200K</text>
                <text x="40" y="114" fill="#94a3b8" fontSize="8" textAnchor="end">₱50K</text>
                <text x="40" y="153" fill="#94a3b8" fontSize="8" textAnchor="end">₱0</text>

                {/* Month 1: June 2026 */}
                {/* Reimbursement bar (Blue) */}
                <rect
                  x="90"
                  y={150 - Math.min(130, (junReimbursement / 400000) * 130)}
                  width="22"
                  height={Math.min(130, (junReimbursement / 400000) * 130)}
                  fill="url(#blue-grad)"
                  rx="3"
                />
                {/* Payroll bar (Purple) */}
                <rect
                  x="116"
                  y={150 - Math.min(130, (junPayroll / 400000) * 130)}
                  width="22"
                  height={Math.min(130, (junPayroll / 400000) * 130)}
                  fill="url(#purple-grad)"
                  rx="3"
                />

                {/* Month 2: July 2026 */}
                {/* Reimbursement bar (Blue) */}
                <rect
                  x="240"
                  y={150 - Math.min(130, (julReimbursement / 400000) * 130)}
                  width="22"
                  height={Math.min(130, (julReimbursement / 400000) * 130)}
                  fill="url(#blue-grad)"
                  rx="3"
                />
                {/* Payroll bar (Purple) */}
                <rect
                  x="266"
                  y={150 - Math.min(130, (julPayroll / 400000) * 130)}
                  width="22"
                  height={Math.min(130, (julPayroll / 400000) * 130)}
                  fill="url(#purple-grad)"
                  rx="3"
                />

                {/* X-axis labels */}
                <text x="114" y="165" fill="#64748b" fontSize="10" textAnchor="middle" fontWeight="bold">June 2026</text>
                <text x="264" y="165" fill="#64748b" fontSize="10" textAnchor="middle" fontWeight="bold">July 2026</text>

                {/* Gradients definitions */}
                <defs>
                  <linearGradient id="blue-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                  <linearGradient id="purple-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#7e22ce" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Legend with numeric totals */}
              <div className="flex justify-around mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-500">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm"></span>
                    <span className="font-semibold text-slate-700">Expense & Procurement (CA/Liq/Proc/Reimb)</span>
                  </div>
                  <span className="font-mono mt-1 text-slate-500">
                    Jun: {formatPESO(junReimbursement)} | Jul: {formatPESO(julReimbursement)}
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-purple-500 rounded-sm"></span>
                    <span className="font-semibold text-slate-700">Payroll & Financial Assistance</span>
                  </div>
                  <span className="font-mono mt-1 text-slate-500">
                    Jun: {formatPESO(junPayroll)} | Jul: {formatPESO(julPayroll)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Office / Department Voucher Distribution */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 text-slate-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              Voucher Source Office Distribution
            </h3>
            
            <div className="flex items-center gap-1.5 self-stretch sm:self-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={widgetPeriod}
                onChange={(e) => setWidgetPeriod(e.target.value)}
                className="block w-full sm:w-auto bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold rounded-xl px-2.5 py-1.5 text-slate-600 focus:outline-none focus:border-teal-500 transition-colors cursor-pointer shadow-sm"
              >
                <option value="all">All Reporting Periods</option>
                {availablePeriods.map((period) => (
                  <option key={period} value={period}>
                    {formatPeriodLabel(period)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Breakdown of voucher origins by submitting government office code:
            </p>

            <div className="space-y-3.5 max-h-[190px] overflow-y-auto pr-1">
              {officeDistribution.length > 0 ? (
                officeDistribution.map(({ office, count, percentage }) => (
                  <div key={office} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono bg-slate-50 border border-slate-200 text-teal-600 px-2 py-0.5 rounded text-[10px] font-bold">
                          {office}
                        </span>
                        <span className="text-slate-600">
                          {offices.find((o) => o.code === office)?.name || 
                           (office === "MGO" ? "Mayor's Office" :
                            office === "ACC" ? "Accounting Office" :
                            office === "HRM" ? "Human Resources" :
                            office === "BUD" ? "Budget Office" :
                            office === "GSO" ? "General Services" : office)}
                        </span>
                      </div>
                      <span className="font-mono text-slate-500 text-[11px]">
                        {count} {count === 1 ? 'voucher' : 'vouchers'} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-teal-500 to-blue-500 h-full rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-500">
                  No active transactions recorded for the selected period.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recently Processed Transactions Section */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 text-slate-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-600" />
            Recently Processed Vouchers
          </h3>
          <span className="text-[10px] text-slate-500">Showing latest actions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold bg-slate-50/50">
                <th className="py-3 px-4">TX Number</th>
                <th className="py-3 px-4">Payee</th>
                <th className="py-3 px-4">Source Office</th>
                <th className="py-3 px-4">Voucher Type</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4">Net Time</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentlyProcessed.map((tx) => {
                const txBreakdown = calculateTransactionTimeBreakdown(tx);
                return (
                  <tr key={tx.id} className="hover:bg-slate-50/50 text-slate-700 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {tx.transactionNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {tx.payee}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px]">
                        {tx.officeCode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        tx.voucherType === "Payroll" 
                          ? "bg-purple-50 text-purple-700 border border-purple-100" 
                          : "bg-blue-50 text-blue-700 border border-blue-100"
                      }`}>
                        {tx.voucherType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                      {formatPESO(tx.amount)}
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
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                      <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded text-[10px] text-slate-650">
                        <Clock className="w-3 h-3 text-teal-500" />
                        {txBreakdown.netHoursMinutes}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onViewTransaction(tx)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold transition-colors focus:outline-none"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
