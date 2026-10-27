/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Office, User, UserRole } from "../types";
import { Plus, Edit2, Trash2, Search, X, Check, Power, AlertTriangle, ToggleLeft, ToggleRight, Building2, UserCheck, ChevronDown, Download, Upload } from "lucide-react";

interface OfficeManagementProps {
  offices: Office[];
  onAddOffice: (office: Office) => void;
  onAddOffices: (newOffices: Office[]) => void;
  onUpdateOffice: (updatedOffice: Office) => void;
  onDeleteOffice: (code: string) => void;
  usedOfficeCodes: string[];
  users: User[];
  currentUser: User;
  onRecordSystemAuditLog?: (actionType: "Deletion" | "Import" | "Export" | "Print" | "Assignment", details: string, fileName?: string) => void;
}

interface BatchRow {
  code: string;
  name: string;
  handledBy: string;
  isActive: boolean;
  error?: string | null;
}

export default function OfficeManagement({
  offices,
  onAddOffice,
  onAddOffices,
  onUpdateOffice,
  onDeleteOffice,
  usedOfficeCodes,
  users,
  currentUser,
  onRecordSystemAuditLog
}: OfficeManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Form States (Reorganized)
  const [isActive, setIsActive] = useState(true); // 1. Status
  const [handledBy, setHandledBy] = useState(""); // 2. Office Handled By
  const [selectedOfficeCode, setSelectedOfficeCode] = useState(""); // 3. Office Name selector
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Searchable dropdown states
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [userSearchText, setUserSearchText] = useState("");

  const [showOfficeDropdown, setShowOfficeDropdown] = useState(false);
  const [officeSearchText, setOfficeSearchText] = useState("");

  // Batch Add Offices States
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchRows, setBatchRows] = useState<BatchRow[]>([
    { code: "", name: "", handledBy: "", isActive: true, error: null }
  ]);
  const [batchGeneralError, setBatchGeneralError] = useState<string | null>(null);
  const [batchGeneralSuccess, setBatchGeneralSuccess] = useState<string | null>(null);

  // Import / Export States (System Owner exclusive)
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<{
    code: string;
    name: string;
    handledBy: string;
    handledByRaw: string;
    isActive: boolean;
    isValid: boolean;
    errors: string[];
  }[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Custom modal states for deletion/warning (iframe safe)
  const [deleteConfirmCode, setDeleteConfirmCode] = useState<string | null>(null);
  const [customAlert, setCustomAlert] = useState<{ title: string; message: string } | null>(null);

  // Helper to determine the dynamic usage state
  const getUsageState = (off: Office) => {
    const isUsed = usedOfficeCodes.includes(off.code);
    if (!off.isActive) return "Inactive";
    if (isUsed) return "In Use";
    return "Active";
  };

  // Select option and close dropdown
  const handleSelectUser = (userId: string) => {
    setHandledBy(userId);
    setShowUserDropdown(false);
    setUserSearchText("");
  };

  const handleSelectOffice = (officeCode: string) => {
    setSelectedOfficeCode(officeCode);
    setShowOfficeDropdown(false);
    setOfficeSearchText("");

    // Populate remaining fields from existing office to edit
    const off = offices.find(o => o.code === officeCode);
    if (off) {
      setIsActive(off.isActive);
      setHandledBy(off.handledBy || "");
    }
  };

  const handleOpenEdit = (off: Office) => {
    setIsEditing(true);
    setSelectedOfficeCode(off.code);
    setHandledBy(off.handledBy || "");
    setIsActive(off.isActive);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleClearForm = () => {
    setIsEditing(false);
    setSelectedOfficeCode("");
    setHandledBy("");
    setIsActive(true);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!selectedOfficeCode) {
      setFormError("Please select or add an Office Name.");
      return;
    }

    if (!handledBy) {
      setFormError("Please select a responsible employee or bookkeeper under Handled By.");
      return;
    }

    const selectedOfficeObj = offices.find(o => o.code === selectedOfficeCode);
    if (!selectedOfficeObj) {
      setFormError("The selected office is invalid.");
      return;
    }

    const updatedOffice: Office = {
      ...selectedOfficeObj,
      handledBy,
      isActive
    };

    onUpdateOffice(updatedOffice);
    setFormSuccess(`Office assignment for "${selectedOfficeObj.name}" has been successfully updated.`);
    handleClearForm();
  };

  const handleToggleActiveInTable = (off: Office) => {
    onUpdateOffice({
      ...off,
      isActive: !off.isActive
    });
  };

  const handleDelete = (offCode: string) => {
    if (usedOfficeCodes.includes(offCode)) {
      setCustomAlert({
        title: "Deletion Restraint",
        message: `Cannot delete Office "${offCode}". It is currently assigned to existing transaction vouchers in the ledger system. You may deactivate it instead to prevent future assignments.`
      });
      return;
    }

    setDeleteConfirmCode(offCode);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmCode) {
      onDeleteOffice(deleteConfirmCode);
      setDeleteConfirmCode(null);
      if (selectedOfficeCode === deleteConfirmCode) {
        handleClearForm();
      }
    }
  };

  const handleOpenBatchModal = () => {
    setShowBatchModal(true);
    setBatchRows([{ code: "", name: "", handledBy: "", isActive: true, error: null }]);
    setBatchGeneralError(null);
    setBatchGeneralSuccess(null);
  };

  const handleAddBatchRow = () => {
    setBatchRows((prev) => [...prev, { code: "", name: "", handledBy: "", isActive: true, error: null }]);
    setBatchGeneralError(null);
  };

  const handleRemoveBatchRow = (idx: number) => {
    setBatchRows((prev) => prev.filter((_, i) => i !== idx));
    setBatchGeneralError(null);
  };

  const handleUpdateBatchRow = (idx: number, field: keyof BatchRow, value: any) => {
    setBatchRows((prev) =>
      prev.map((row, i) => {
        if (i === idx) {
          let val = value;
          if (field === "code") {
            val = String(value).toUpperCase();
          }
          return { ...row, [field]: val, error: null };
        }
        return row;
      })
    );
    setBatchGeneralError(null);
  };

  const handleSaveBatch = (e: React.FormEvent) => {
    e.preventDefault();
    setBatchGeneralError(null);
    setBatchGeneralSuccess(null);

    const updatedRows = [...batchRows];
    let hasErrors = false;
    const validToSave: Office[] = [];
    const keptInvalidRows: BatchRow[] = [];
    const newlyAddedCodesInThisRun = new Set<string>();

    for (let i = 0; i < updatedRows.length; i++) {
      const row = updatedRows[i];
      const cleanCode = row.code.trim().toUpperCase();
      const cleanName = row.name.trim();
      const handlerId = row.handledBy;

      let rowError: string | null = null;

      if (!cleanCode) {
        rowError = "Office Code is required.";
      } else if (!/^[a-zA-Z0-9\s\-_/]+$/.test(cleanCode)) {
        rowError = "Code is invalid. Alphanumeric, spaces, -, _, / only.";
      } else if (cleanCode.length > 50) {
        rowError = "Code cannot exceed 50 characters.";
      } else if (offices.some((o) => o.code.toUpperCase() === cleanCode)) {
        rowError = `Code "${cleanCode}" already exists in the system.`;
      } else if (newlyAddedCodesInThisRun.has(cleanCode)) {
        rowError = `Duplicate Code "${cleanCode}" in this batch.`;
      } else if (!cleanName) {
        rowError = "Office Name is required.";
      } else if (!handlerId) {
        rowError = "Office Handler is required.";
      }

      if (rowError) {
        row.error = rowError;
        hasErrors = true;
        keptInvalidRows.push({ ...row, error: rowError });
      } else {
        newlyAddedCodesInThisRun.add(cleanCode);
        validToSave.push({
          code: cleanCode,
          name: cleanName,
          handledBy: handlerId,
          isActive: row.isActive
        });
      }
    }

    if (validToSave.length > 0) {
      onAddOffices(validToSave);
    }

    if (hasErrors) {
      setBatchRows(keptInvalidRows);
      if (validToSave.length > 0) {
        setBatchGeneralSuccess(
          `Successfully saved ${validToSave.length} valid office record(s)! Please correct the remaining ${keptInvalidRows.length} row(s) below.`
        );
      } else {
        setBatchGeneralError("One or more rows have validation errors. Please check individual rows.");
      }
    } else {
      setBatchGeneralSuccess(`All ${validToSave.length} office record(s) successfully registered!`);
      // If there was only 1 office and it is saved, let's auto-select it in the parent dropdown
      if (validToSave.length === 1) {
        setSelectedOfficeCode(validToSave[0].code);
      }
      setTimeout(() => {
        setShowBatchModal(false);
        setBatchRows([{ code: "", name: "", handledBy: "", isActive: true, error: null }]);
      }, 1500);
    }
  };

  // CSV parser supporting quotes, commas, and multiline values
  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentValue = "";

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(currentValue.trim());
        currentValue = "";
      } else if ((char === "\r" || char === "\n") && !inQuotes) {
        row.push(currentValue.trim());
        if (row.length > 0 && row.some(cell => cell !== "")) {
          lines.push(row);
        }
        row = [];
        currentValue = "";
        if (char === "\r" && nextChar === "\n") {
          i++; // skip \n
        }
      } else {
        currentValue += char;
      }
    }
    if (currentValue || row.length > 0) {
      row.push(currentValue.trim());
      if (row.some(cell => cell !== "")) {
        lines.push(row);
      }
    }
    return lines;
  };

  const recordFailedImportLog = (fileName: string, reason: string) => {
    if (onRecordSystemAuditLog) {
      onRecordSystemAuditLog(
        "Import",
        `Failed office data import: ${reason}`,
        fileName
      );
    }
  };

  const processImportFileContent = (fileName: string, text: string) => {
    setImportError(null);
    setImportFileName(fileName);

    const isJson = fileName.toLowerCase().endsWith(".json");
    let parsedRecords: any[] = [];

    try {
      if (isJson) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          parsedRecords = parsed;
        } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.offices)) {
          parsedRecords = parsed.offices;
        } else {
          const errMsg = "Invalid JSON structure. Expected an array or object with an 'offices' array.";
          setImportError(errMsg);
          recordFailedImportLog(fileName, errMsg);
          return;
        }
      } else {
        // CSV parsing
        const csvLines = parseCSV(text);
        if (csvLines.length < 2) {
          const errMsg = "Uploaded CSV file is empty or missing header row.";
          setImportError(errMsg);
          recordFailedImportLog(fileName, errMsg);
          return;
        }

        const headers = csvLines[0].map(h => h.toLowerCase().trim());
        const codeIdx = headers.findIndex(h => h.includes("code") || h === "id");
        const nameIdx = headers.findIndex(h => h.includes("name") || h.includes("title"));
        const handlerIdx = headers.findIndex(h => h.includes("handled") || h.includes("handler") || h.includes("user") || h.includes("employee") || h.includes("person") || h.includes("clerk"));
        const statusIdx = headers.findIndex(h => h.includes("status") || h.includes("active"));

        // If headers don't map clearly, use default column indices
        const finalCodeIdx = codeIdx !== -1 ? codeIdx : 0;
        const finalNameIdx = nameIdx !== -1 ? nameIdx : 1;
        const finalHandlerIdx = handlerIdx !== -1 ? handlerIdx : 2;
        const finalStatusIdx = statusIdx !== -1 ? statusIdx : 3;

        for (let i = 1; i < csvLines.length; i++) {
          const cols = csvLines[i];
          if (cols.length === 0 || cols.every(c => c === "")) continue;

          // Fill missing trailing columns if any
          const rowCode = cols[finalCodeIdx] || "";
          const rowName = cols[finalNameIdx] || "";
          const rowHandler = cols[finalHandlerIdx] || "";
          const rowStatusStr = cols[finalStatusIdx] || "";

          parsedRecords.push({
            code: rowCode,
            name: rowName,
            handledBy: rowHandler,
            isActive: rowStatusStr.toLowerCase() !== "false" && rowStatusStr.toLowerCase() !== "inactive" && rowStatusStr !== "0"
          });
        }
      }
    } catch (err: any) {
      const errMsg = `File parsing failed: ${err.message || err}`;
      setImportError(errMsg);
      recordFailedImportLog(fileName, errMsg);
      return;
    }

    if (parsedRecords.length === 0) {
      const errMsg = "No records found in uploaded file.";
      setImportError(errMsg);
      recordFailedImportLog(fileName, errMsg);
      return;
    }

    // Now, run robust data integrity validation
    const validated: typeof importResults = [];
    const seenCodesInFile = new Set<string>();

    parsedRecords.forEach((record, index) => {
      // Map properties case insensitively if JSON
      let rawCode = "";
      let rawName = "";
      let rawHandler = "";
      let rawStatus = true;

      if (typeof record === "object" && record !== null) {
        // Extract properties (flexible mappings)
        rawCode = (record.code || record.officeCode || record.office_code || "").toString().trim();
        rawName = (record.name || record.officeName || record.office_name || "").toString().trim();
        rawHandler = (record.handledBy || record.handler || record.handled_by || record.employee || "").toString().trim();
        
        const rawActive = record.isActive !== undefined ? record.isActive : record.status || record.active;
        if (rawActive !== undefined) {
          if (typeof rawActive === "boolean") {
            rawStatus = rawActive;
          } else {
            const strVal = rawActive.toString().toLowerCase().trim();
            rawStatus = strVal !== "false" && strVal !== "inactive" && strVal !== "0";
          }
        }
      } else {
        validated.push({
          code: `ROW-${index + 1}`,
          name: "Invalid Format",
          handledBy: "",
          handledByRaw: "",
          isActive: false,
          isValid: false,
          errors: ["Record is not an object or is empty."]
        });
        return;
      }

      const errors: string[] = [];

      // 1. Check required code and format
      if (!rawCode) {
        errors.push("Office Code is required.");
      } else if (!/^[a-zA-Z0-9\s\-_/]+$/.test(rawCode)) {
        errors.push("Code is invalid. Alphanumeric, spaces, hyphens, underscores, slashes only.");
      } else if (rawCode.length > 50) {
        errors.push("Office Code cannot exceed 50 characters.");
      }

      // 2. Check duplicate in file
      const upperCode = rawCode.toUpperCase();
      if (rawCode) {
        if (seenCodesInFile.has(upperCode)) {
          errors.push(`Duplicate Office Code "${rawCode}" in this file.`);
        } else {
          seenCodesInFile.add(upperCode);
        }
      }

      // 3. Check duplicate against existing system codes
      if (rawCode && offices.some(o => o.code.toUpperCase() === upperCode)) {
        errors.push(`Office Code "${rawCode}" already registered in system.`);
      }

      // 4. Check required name
      if (!rawName) {
        errors.push("Office Name is required.");
      }

      // 5. Check and map handler to system users
      let mappedHandlerId = "";
      if (!rawHandler) {
        errors.push("Office Handler is required.");
      } else {
        // Find user by ID, username, or Employee Name (case-insensitive)
        const match = users.find(u => 
          u.id.toLowerCase() === rawHandler.toLowerCase() ||
          u.username.toLowerCase() === rawHandler.toLowerCase() ||
          u.employeeName.toLowerCase() === rawHandler.toLowerCase()
        );

        if (match) {
          if (!match.isActive) {
            errors.push(`Designated employee "${match.employeeName}" is currently deactivated in the user list.`);
          } else {
            mappedHandlerId = match.id;
          }
        } else {
          errors.push(`Employee "${rawHandler}" not found. Enter exact employee name or ID.`);
        }
      }

      validated.push({
        code: rawCode.toUpperCase() || `ROW-${index + 1}`,
        name: rawName,
        handledBy: mappedHandlerId,
        handledByRaw: rawHandler,
        isActive: rawStatus,
        isValid: errors.length === 0,
        errors
      });
    });

    setImportResults(validated);
  };

  const handleSaveImport = () => {
    const validRecords = importResults.filter(r => r.isValid);
    if (validRecords.length === 0) {
      setImportError("No valid records found to import.");
      return;
    }

    const officesToImport: Office[] = validRecords.map(r => ({
      code: r.code,
      name: r.name,
      handledBy: r.handledBy,
      isActive: r.isActive
    }));

    // Trigger parent callback
    onAddOffices(officesToImport);

    // Audit log
    if (onRecordSystemAuditLog) {
      onRecordSystemAuditLog(
        "Import",
        `Successfully imported ${validRecords.length} of ${importResults.length} office record(s) from backup file.`,
        importFileName
      );
    }

    // Show success banner
    setFormSuccess(`Import Complete! Successfully registered ${validRecords.length} new office records.`);
    
    // Reset and Close
    setShowImportModal(false);
    setImportFileName("");
    setImportResults([]);
  };

  const handleExportData = (format: "csv" | "json") => {
    if (currentUser.role !== UserRole.OWNER) {
      setCustomAlert({
        title: "Access Denied",
        message: "Only the System Owner is authorized to run data backup exports."
      });
      return;
    }

    try {
      let content = "";
      let mimeType = "";
      const fileName = `office_directory_export_${Date.now()}.${format}`;

      if (format === "csv") {
        mimeType = "text/csv;charset=utf-8;";
        const rows = [
          ["Office Code", "Office Name", "Office Handled By", "Handled By ID", "Status", "Usage State", "Date Created", "Date Modified"]
        ];

        offices.forEach(o => {
          const handler = users.find(u => u.id === o.handledBy);
          const handlerName = handler ? handler.employeeName : "Unassigned";
          const statusStr = o.isActive ? "Active" : "Inactive";
          const usageStr = getUsageState(o);
          const timestamp = new Date().toISOString();

          rows.push([
            o.code,
            o.name,
            handlerName,
            o.handledBy || "",
            statusStr,
            usageStr,
            timestamp,
            timestamp
          ]);
        });

        content = rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
      } else {
        mimeType = "application/json;charset=utf-8;";
        const exportObj = offices.map(o => {
          const handler = users.find(u => u.id === o.handledBy);
          const handlerName = handler ? handler.employeeName : "Unassigned";
          const timestamp = new Date().toISOString();
          return {
            officeCode: o.code,
            officeName: o.name,
            handledByEmployeeName: handlerName,
            handledByUserId: o.handledBy || "",
            status: o.isActive ? "Active" : "Inactive",
            usageState: getUsageState(o),
            dateCreated: timestamp,
            dateModified: timestamp
          };
        });
        content = JSON.stringify(exportObj, null, 2);
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Audit Log
      if (onRecordSystemAuditLog) {
        onRecordSystemAuditLog(
          "Export",
          `Exported ${offices.length} office directory records as ${format.toUpperCase()} format successfully.`,
          fileName
        );
      }

      setFormSuccess(`Successfully exported ${offices.length} records as ${format.toUpperCase()}!`);
    } catch (err: any) {
      setFormError(`Export operation failed: ${err.message || err}`);
    }
  };

  // Filters offices for the main directory list
  const filteredOffices = offices.filter((o) => {
    const handler = users.find((u) => u.id === o.handledBy);
    const handlerName = handler ? handler.employeeName : "";
    return (
      o.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      handlerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Filters list of employees/bookkeepers for the custom dropdown
  const filteredUsers = users.filter((u) => {
    const nameMatch = u.employeeName.toLowerCase().includes(userSearchText.toLowerCase());
    const roleMatch = u.role.toLowerCase().includes(userSearchText.toLowerCase());
    return u.isActive && (nameMatch || roleMatch);
  });

  // Filters offices for the custom searchable select
  const filteredOfficesForDropdown = offices.filter((o) => {
    const nameMatch = o.name.toLowerCase().includes(officeSearchText.toLowerCase());
    const codeMatch = o.code.toLowerCase().includes(officeSearchText.toLowerCase());
    return nameMatch || codeMatch;
  });

  // Get selected objects for displays
  const selectedOfficeObj = offices.find(o => o.code === selectedOfficeCode);
  const selectedUserObj = users.find(u => u.id === handledBy);

  return (
    <div className="space-y-6 font-sans text-slate-700">
      
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 font-display">
          Office Code Management
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure agency branches, administrative office codes, and assign responsible employees for voucher routing.
        </p>
      </div>

      {/* Redesigned Active Configuration & Assignment Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 relative">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
          {isEditing ? "Edit Office Configuration" : "New Office Assignment & Configuration"}
        </h2>

        {formError && (
          <div className="p-3 bg-red-50 border border-red-100 text-xs text-red-650 rounded-xl mb-4 flex items-center gap-2 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-100 text-xs text-emerald-700 rounded-xl mb-4 flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
          
          {/* 1. Status */}
          <div className="md:col-span-2 space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Status
            </label>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`w-full flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                isActive ? "text-emerald-700 border-emerald-100 bg-emerald-50/40" : "text-slate-500"
              }`}
            >
              <span>{isActive ? "Active" : "Inactive"}</span>
              {isActive ? (
                <ToggleRight className="w-6 h-6 text-emerald-600" />
              ) : (
                <ToggleLeft className="w-6 h-6 text-slate-400" />
              )}
            </button>
          </div>

          {/* 2. Office Handled By (Searchable Dropdown) */}
          <div className="md:col-span-3 space-y-2 relative">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Office Handled By
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowUserDropdown(!showUserDropdown);
                  setShowOfficeDropdown(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 text-left cursor-pointer hover:bg-slate-100/50"
              >
                <span className="truncate">
                  {selectedUserObj ? `${selectedUserObj.employeeName} (${selectedUserObj.role.split(" / ")[0]})` : "Select Handler..."}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              </button>

              {showUserDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserDropdown(false)} />
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100">
                    <div className="p-2 bg-slate-50">
                      <input
                        type="text"
                        autoFocus
                        value={userSearchText}
                        onChange={(e) => setUserSearchText(e.target.value)}
                        placeholder="Search employee or role..."
                        className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => handleSelectUser(u.id)}
                          className={`p-2.5 hover:bg-blue-50 text-xs cursor-pointer transition-colors ${
                            handledBy === u.id ? "bg-blue-50/50 font-bold text-blue-700" : "text-slate-700"
                          }`}
                        >
                          <p className="font-semibold">{u.employeeName}</p>
                          <p className="text-[10px] text-slate-400">{u.role}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400">No employees found.</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 3. Office Name (Searchable dropdown with embedded "Add Office" button) */}
          <div className="md:col-span-4 space-y-2 relative">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
              <span>Office Name</span>
              <span className="text-[9px] text-indigo-600 font-bold lowercase">code embedded in options</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowOfficeDropdown(!showOfficeDropdown);
                    setShowUserDropdown(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 text-left cursor-pointer hover:bg-slate-100/50"
                >
                  <span className="truncate">
                    {selectedOfficeObj ? `${selectedOfficeObj.name} (${selectedOfficeObj.code})` : "Select Office..."}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                </button>

                {showOfficeDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowOfficeDropdown(false)} />
                    <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100">
                      <div className="p-2 bg-slate-50 flex items-center gap-2">
                        <input
                          type="text"
                          autoFocus
                          value={officeSearchText}
                          onChange={(e) => setOfficeSearchText(e.target.value)}
                          placeholder="Search office name/code..."
                          className="flex-1 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                      {filteredOfficesForDropdown.length > 0 ? (
                        filteredOfficesForDropdown.map((o) => (
                          <div
                            key={o.code}
                            onClick={() => handleSelectOffice(o.code)}
                            className={`p-2.5 hover:bg-blue-50 text-xs cursor-pointer transition-colors ${
                              selectedOfficeCode === o.code ? "bg-blue-50/50 font-bold text-blue-700" : "text-slate-700"
                            }`}
                          >
                            <p className="font-semibold">{o.name}</p>
                            <p className="text-[10px] text-teal-600 font-mono font-bold uppercase">{o.code}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-slate-400">No registered offices found.</div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Embedded Batch Add button */}
              <button
                type="button"
                onClick={handleOpenBatchModal}
                className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                title="Create multiple new Office records in a single batch"
              >
                <Plus className="w-4 h-4" />
                <span>Batch Add</span>
              </button>
            </div>
          </div>

          {/* 4. Usage State (Dynamic Preview) */}
          <div className="md:col-span-2 space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Usage State
            </label>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
              {selectedOfficeObj ? (
                (() => {
                  const state = getUsageState(selectedOfficeObj);
                  return (
                    <span className={`inline-flex items-center gap-1.5 ${
                      state === "In Use" ? "text-amber-600" : state === "Active" ? "text-emerald-600" : "text-slate-400"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        state === "In Use" ? "bg-amber-500" : state === "Active" ? "bg-emerald-500" : "bg-slate-400"
                      }`}></span>
                      {state}
                    </span>
                  );
                })()
              ) : (
                <span className="text-slate-400 italic font-normal">No Office Selected</span>
              )}
            </div>
          </div>

          {/* 5. Form Actions */}
          <div className="md:col-span-1 flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer text-center"
              title="Save current config"
            >
              Save
            </button>
            { (isEditing || selectedOfficeCode || handledBy) && (
              <button
                type="button"
                onClick={handleClearForm}
                className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                title="Clear current inputs"
              >
                Clear
              </button>
            )}
          </div>

        </form>
      </div>

      {/* Control bar / Table search and System Owner Backup Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search directory by office code, title, or assigned personnel..."
            className="block w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
          />
        </div>

        {/* System Owner Exclusive Data backup and restore actions */}
        {currentUser?.role === UserRole.OWNER && (
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 p-1.5 rounded-2xl shrink-0">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider pl-2 select-none">
              System Admin Backup:
            </span>
            
            {/* Import Button */}
            <button
              type="button"
              onClick={() => {
                setShowImportModal(true);
                setImportFileName("");
                setImportError(null);
                setImportResults([]);
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-755 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Import office records from .csv or .json"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
              <span>Import Data</span>
            </button>

            {/* Export Dropdown Group */}
            <div className="relative group">
              <button
                type="button"
                className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-755 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Export office records"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Backup</span>
              </button>
              
              <div className="absolute right-0 bottom-full mb-1.5 z-30 hidden group-hover:block hover:block w-36 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => handleExportData("csv")}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Export as CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportData("json")}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  <span>Export as JSON</span>
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Reorganized Office Table Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-semibold select-none">
                <th className="py-3 px-4 w-1/6">Status</th>
                <th className="py-3 px-4 w-1/4">Office Handled By</th>
                <th className="py-3 px-4 w-2/5">Office Name</th>
                <th className="py-3 px-4 w-1/6">Usage State</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOffices.length > 0 ? (
                filteredOffices.map((off) => {
                  const usageState = getUsageState(off);
                  return (
                    <tr key={off.code} className="hover:bg-slate-50/50 transition-colors">
                      
                      {/* Column 1: Status */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActiveInTable(off)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                            off.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-450 border-slate-200 hover:bg-slate-200"
                          }`}
                          title="Click to toggle active status"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${off.isActive ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                          {off.isActive ? "Active" : "Deactivated"}
                        </button>
                      </td>

                      {/* Column 2: Office Handled By */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-50/50 text-blue-600 rounded-lg">
                            <UserCheck className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">
                              {(() => {
                                const handler = users.find((u) => u.id === off.handledBy);
                                return handler ? handler.employeeName : "Unassigned";
                              })()}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {(() => {
                                const handler = users.find((u) => u.id === off.handledBy);
                                return handler ? handler.role.split(" / ")[0] : "N/A";
                              })()}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Column 3: Office Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 leading-normal">
                            {off.name}
                          </span>
                          <span className="font-mono text-[10px] text-teal-600 font-bold uppercase mt-0.5">
                            {off.code}
                          </span>
                        </div>
                      </td>

                      {/* Column 4: Usage State */}
                      <td className="py-3.5 px-4">
                        {usageState === "In Use" ? (
                          <span className="inline-flex items-center text-amber-600 font-semibold bg-amber-50 border border-amber-100 px-2 py-0.5 rounded text-[10px]">
                            In Use in Ledgers
                          </span>
                        ) : usageState === "Active" ? (
                          <span className="inline-flex items-center text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-[10px]">
                            Active / Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-slate-400 font-medium bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Column 5: Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(off)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded border border-slate-200 transition-colors focus:outline-none cursor-pointer"
                            title="Edit configurations"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(off.code)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded border border-red-100 transition-colors focus:outline-none cursor-pointer"
                            title="Delete permanently"
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
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    No office codes matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Add Office Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-55 animate-fade-in text-slate-800">
          <div className="bg-white border border-slate-200 w-full max-w-5xl rounded-2xl shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
            
            <button
              type="button"
              onClick={() => setShowBatchModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Batch Office Record Creation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Register multiple agency branches, provincial office codes, and assign personnel in a single batch transaction.
                </p>
              </div>
            </div>

            {/* General success and error messages */}
            {batchGeneralSuccess && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 text-xs text-emerald-800 rounded-xl flex items-center gap-2 animate-fade-in">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{batchGeneralSuccess}</span>
              </div>
            )}

            {batchGeneralError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 text-xs text-red-650 rounded-xl flex items-center gap-2 animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{batchGeneralError}</span>
              </div>
            )}

            {/* Batch Rows Table container */}
            <div className="flex-1 overflow-y-auto my-4 min-h-[200px] border border-slate-150 rounded-xl bg-slate-50/50">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold select-none">
                    <th className="py-2.5 px-3 w-[18%]">Office Code</th>
                    <th className="py-2.5 px-3 w-[30%]">Office Name</th>
                    <th className="py-2.5 px-3 w-[26%]">Office Handled By</th>
                    <th className="py-2.5 px-3 w-[14%]">Status</th>
                    <th className="py-2.5 px-3 w-[12%]">Usage State</th>
                    <th className="py-2.5 px-3 text-center w-[5%]">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {batchRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                      
                      {/* 1. Office Code Input */}
                      <td className="py-3 px-3 align-top">
                        <input
                          type="text"
                          required
                          value={row.code}
                          onChange={(e) => handleUpdateBatchRow(idx, "code", e.target.value)}
                          placeholder="e.g. PACCO"
                          maxLength={50}
                          className={`w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg text-xs font-mono font-bold uppercase text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 ${
                            row.error && row.error.toLowerCase().includes("code")
                              ? "border-red-300 bg-red-50/20"
                              : "border-slate-200"
                          }`}
                        />
                        {row.error && row.error.toLowerCase().includes("code") && (
                          <p className="text-[10px] text-red-650 font-semibold mt-1 leading-tight flex items-start gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                            <span>{row.error}</span>
                          </p>
                        )}
                      </td>

                      {/* 2. Office Name Input */}
                      <td className="py-3 px-3 align-top">
                        <input
                          type="text"
                          required
                          value={row.name}
                          onChange={(e) => handleUpdateBatchRow(idx, "name", e.target.value)}
                          placeholder="e.g. Provincial Accountant's Office"
                          className={`w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 ${
                            row.error && row.error.toLowerCase().includes("name")
                              ? "border-red-300 bg-red-50/20"
                              : "border-slate-200"
                          }`}
                        />
                        {row.error && row.error.toLowerCase().includes("name") && (
                          <p className="text-[10px] text-red-650 font-semibold mt-1 leading-tight flex items-start gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                            <span>{row.error}</span>
                          </p>
                        )}
                      </td>

                      {/* 3. Office Handled By Dropdown */}
                      <td className="py-3 px-3 align-top">
                        <select
                          required
                          value={row.handledBy}
                          onChange={(e) => handleUpdateBatchRow(idx, "handledBy", e.target.value)}
                          className={`w-full px-2 py-1.5 bg-slate-50 border rounded-lg text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 ${
                            row.error && row.error.toLowerCase().includes("handler")
                              ? "border-red-300 bg-red-50/20"
                              : "border-slate-200"
                          }`}
                        >
                          <option value="">Select Handler...</option>
                          {users
                            .filter((u) => u.isActive)
                            .map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.employeeName} ({u.role.split(" / ")[0]})
                              </option>
                            ))}
                        </select>
                        {row.error && row.error.toLowerCase().includes("handler") && (
                          <p className="text-[10px] text-red-650 font-semibold mt-1 leading-tight flex items-start gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                            <span>{row.error}</span>
                          </p>
                        )}
                        {/* If error is generic or not captured by code/name/handler checks, display it here */}
                        {row.error && 
                         !row.error.toLowerCase().includes("code") && 
                         !row.error.toLowerCase().includes("name") && 
                         !row.error.toLowerCase().includes("handler") && (
                          <p className="text-[10px] text-red-650 font-semibold mt-1 leading-tight flex items-start gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                            <span>{row.error}</span>
                          </p>
                        )}
                      </td>

                      {/* 4. Status Toggle Switch */}
                      <td className="py-3 px-3 align-top">
                        <button
                          type="button"
                          onClick={() => handleUpdateBatchRow(idx, "isActive", !row.isActive)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                            row.isActive ? "text-emerald-700 border-emerald-100 bg-emerald-50/40" : "text-slate-500"
                          }`}
                        >
                          <span>{row.isActive ? "Active" : "Inactive"}</span>
                          {row.isActive ? (
                            <ToggleRight className="w-5 h-5 text-emerald-600 shrink-0 ml-1" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-slate-400 shrink-0 ml-1" />
                          )}
                        </button>
                      </td>

                      {/* 5. Dynamic Usage State Badge */}
                      <td className="py-3 px-3 align-top">
                        <div className="pt-1.5">
                          {row.isActive ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-[10px]">
                              Active / Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400 font-medium bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                              Inactive
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Remove Row button */}
                      <td className="py-3 px-3 text-center align-top">
                        <button
                          type="button"
                          disabled={batchRows.length <= 1}
                          onClick={() => handleRemoveBatchRow(idx)}
                          className={`p-1.5 rounded border transition-colors focus:outline-none mt-0.5 ${
                            batchRows.length <= 1
                              ? "bg-slate-50 text-slate-300 border-slate-150 cursor-not-allowed"
                              : "bg-red-50 hover:bg-red-100 text-red-600 border-red-100 cursor-pointer"
                          }`}
                          title={batchRows.length <= 1 ? "Keep at least 1 row" : "Remove this entry row"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-150">
              
              <button
                type="button"
                onClick={handleAddBatchRow}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Append another blank office entry row"
              >
                <Plus className="w-4 h-4" />
                <span>Add Entry Row</span>
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors focus:outline-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBatch}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors focus:outline-none shadow-md cursor-pointer"
                >
                  Save Offices
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* System Owner Import Wizard Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">System Data Import Wizard</h3>
                  <p className="text-[11px] text-slate-500">Restore or batch register office directory configurations safely</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-5">
              
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const file = e.dataTransfer.files[0];
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (event.target && typeof event.target.result === "string") {
                        processImportFileContent(file.name, event.target.result);
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all relative flex flex-col items-center justify-center ${
                  dragActive
                    ? "border-blue-500 bg-blue-50/25 scale-[0.99]"
                    : "border-slate-250 hover:border-slate-400 bg-slate-50/15"
                }`}
              >
                <input
                  type="file"
                  id="import-file-uploader"
                  accept=".csv,.json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target && typeof event.target.result === "string") {
                          processImportFileContent(file.name, event.target.result);
                        }
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
                
                <Upload className="w-8 h-8 text-slate-400 mb-3" />
                <p className="text-xs font-bold text-slate-800">
                  {importFileName ? `Selected File: ${importFileName}` : "Drag & Drop your backup file here"}
                </p>
                <p className="text-[10px] text-slate-450 mt-1">
                  Supports approved backup formats (.csv or .json)
                </p>
                
                <label
                  htmlFor="import-file-uploader"
                  className="mt-4 px-4 py-1.5 bg-white border border-slate-200 hover:border-slate-350 rounded-xl text-[11px] font-semibold text-slate-700 shadow-sm cursor-pointer transition-all hover:bg-slate-50/50"
                >
                  Choose File
                </label>
              </div>

              {/* Error Alert */}
              {importError && (
                <div className="p-3 bg-red-50 border border-red-100 text-xs text-red-650 rounded-xl flex items-start gap-2.5 animate-fade-in">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold">File Integrity Issue</p>
                    <p className="text-[11px] text-slate-550 leading-relaxed">{importError}</p>
                  </div>
                </div>
              )}

              {/* Validation Summary and Records Table */}
              {importResults.length > 0 && (
                <div className="space-y-4 animate-fade-in">
                  
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Processed</p>
                        <p className="text-lg font-extrabold text-slate-800 mt-0.5">{importResults.length}</p>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Rows</span>
                    </div>

                    <div className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Validated & Ready</p>
                        <p className="text-lg font-extrabold text-emerald-700 mt-0.5">
                          {importResults.filter(r => r.isValid).length}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-750 bg-emerald-100/50 px-2.5 py-0.5 rounded-full">Ready</span>
                    </div>

                    <div className="p-3 bg-red-50/40 border border-red-100 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-red-650 uppercase tracking-wider">Rejected Records</p>
                        <p className="text-lg font-extrabold text-red-700 mt-0.5">
                          {importResults.filter(r => !r.isValid).length}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-red-750 bg-red-100/50 px-2.5 py-0.5 rounded-full">Errors</span>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="max-h-[320px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-150 text-slate-400 font-semibold select-none sticky top-0 z-10">
                            <th className="py-2.5 px-3 w-[12%]">Code</th>
                            <th className="py-2.5 px-3 w-[25%]">Office Name</th>
                            <th className="py-2.5 px-3 w-[20%]">Assigned Handler</th>
                            <th className="py-2.5 px-3 w-[10%]">Status</th>
                            <th className="py-2.5 px-3 text-right">Integrity Verification</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {importResults.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-3 font-mono font-bold uppercase text-slate-700">{row.code}</td>
                              <td className="py-3 px-3 font-semibold text-slate-800">{row.name}</td>
                              <td className="py-3 px-3">
                                {row.handledBy ? (
                                  <span className="text-slate-700 font-medium">
                                    {users.find(u => u.id === row.handledBy)?.employeeName}
                                  </span>
                                ) : (
                                  <span className="text-red-600 font-semibold italic">
                                    {row.handledByRaw || "Unassigned"}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  row.isActive
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                    : "bg-slate-100 text-slate-500 border border-slate-200"
                                }`}>
                                  {row.isActive ? "Active" : "Inactive"}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                {row.isValid ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-[10px]">
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Passed (Ready)</span>
                                  </span>
                                ) : (
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="inline-flex items-center gap-1 text-red-600 font-bold bg-red-50 border border-red-100 px-2 py-0.5 rounded text-[10px]">
                                      <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                      <span>Rejected</span>
                                    </span>
                                    <div className="text-right space-y-0.5">
                                      {row.errors.map((err, errIdx) => (
                                        <p key={errIdx} className="text-[10px] text-red-650 leading-tight font-medium">
                                          • {err}
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <p className="text-[10.5px] text-slate-450 leading-relaxed italic bg-blue-50/20 p-2.5 rounded-xl border border-blue-50">
                    * Attention: The database transaction will execute atomically. Only the valid records (marked as Passed) will be written to the ledger system. Existing records with conflicting codes will be safely preserved.
                  </p>

                </div>
              )}

            </div>

            {/* Modal Actions Footer */}
            <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFileName("");
                  setImportResults([]);
                }}
                className="px-4.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={importResults.filter(r => r.isValid).length === 0}
                onClick={handleSaveImport}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
                  importResults.filter(r => r.isValid).length > 0
                    ? "bg-blue-600 hover:bg-blue-500 text-white"
                    : "bg-slate-100 text-slate-400 border border-slate-150 cursor-not-allowed shadow-none"
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Import Valid Records ({importResults.filter(r => r.isValid).length})</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmCode && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative text-slate-800">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <span>Confirm Delete Office</span>
            </h3>
            <p className="text-xs text-slate-650 mb-6 leading-relaxed">
              Are you sure you want to permanently delete Office Code <strong>{deleteConfirmCode}</strong>? 
              This operation cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmCode(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors focus:outline-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-colors focus:outline-none shadow-md cursor-pointer"
              >
                Delete Office
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {customAlert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative text-slate-800 text-center">
            <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-600 border border-blue-100 rounded-full flex items-center justify-center mb-3">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              {customAlert.title}
            </h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              {customAlert.message}
            </p>
            <button
              type="button"
              onClick={() => setCustomAlert(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors focus:outline-none cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
