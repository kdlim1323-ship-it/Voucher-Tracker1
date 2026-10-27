/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  OWNER = "System Owner",
  ADMIN = "System Administrator",
  ENCODER = "Encoder / Office Clerk",
  BOOKKEEPER = "Bookkeeper",
  DISTRIBUTOR = "Distributor",
  AUDITOR = "Auditor",
  REVIEWER = "Reviewer"
}

export enum WorkflowStatus {
  RECEIVED = "Received",
  ENCODED = "Encoded",
  FORWARDED_TO_BOOKKEEPER = "Forwarded to Bookkeeper",
  RECEIVED_BY_BOOKKEEPER = "Received by Bookkeeper",
  RECORDED = "Recorded",
  SUBMITTED_TO_DISTRIBUTOR = "Submitted to Distributor",
  FORWARDED_TO_AUDITOR = "Forwarded to Auditor",
  UNDER_AUDIT = "Under Audit",
  RETURNED_FOR_CORRECTION = "Returned for Correction",
  FORWARDED_TO_REVIEWER = "Forwarded to Reviewer",
  UNDER_REVIEW = "Under Review",
  COMPLETED = "Completed",
  ARCHIVED = "Archived",
  PULLED_OUT = "Returned / Pulled-Out"
}

export interface SecurityLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  targetId: string;
  targetName: string;
  action: "Enrollment" | "Reset" | "Enable" | "Disable";
  details: string;
}

export interface User {
  id: string;
  username: string;
  employeeName: string;
  position: string;
  assignedOffice?: string; // Optionalized for dynamic assignment
  employeeId: string;      // Official Employee ID
  contactNumber?: string;   // Contact Number
  emailAddress?: string;    // Email Address
  role: UserRole;
  isActive: boolean;
  lastLogin?: string;
  passwordHash?: string; // Stored in plain text for this simple mock auth tracker
  mfaEnabled?: boolean;  // Is MFA enabled for this user
  mfaSecret?: string;   // Secret setup key for Google Authenticator (Base32)
  mfaEnrolled?: boolean; // Has the user scanned/entered secret and successfully completed enrollment
}

export interface OwnerPermissions {
  canEncode: boolean;
  canBookkeep: boolean;
  canDistribute: boolean;
  canAudit: boolean;
  canReview: boolean;
}

export interface Office {
  code: string; // e.g. "MGO", "PGO", "ACC"
  name: string;
  handledBy?: string; // Designated employee/bookkeeper user ID
  description?: string;
  isActive: boolean;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  prevStatus: WorkflowStatus | null;
  newStatus: WorkflowStatus;
  userId: string;
  userName: string;
  userRole: UserRole;
  timestamp: string;
  officeCode: string;
  remarks?: string;
}

export interface CafoaEntry {
  cafoaNumber: string;
  amount: number;
  officeCode: string;
}

export interface Transaction {
  id: string; // Internal unique identifier (UUID)
  transactionNumber: string; // e.g., "CLK-0001" (first 3 of encoder + sequential)
  dateReceived: string;
  cafoaNumber: string;
  officeCode: string; // Source Office Code
  payee: string;
  particulars: string;
  amount: number; // in Philippine Peso
  voucherType: string; // e.g. "Cash Advance", "Liquidation", "Financial Assistance", "Procurement"
  voucherSubcategory?: string; // subcategory (e.g. "Guiconsulta", "MAIFIP", "Bidding", "Small Value Procurement (SVP)")
  cafoaNumbers?: string[]; // Multiple CAFOA numbers or ["N/A"]
  cafoaEntries?: CafoaEntry[]; // Multiple CAFOA detail entries
  currentStatus: WorkflowStatus;
  currentAssignedUserId: string; // who has it now
  currentAssignedOffice: string; // which office or stage it's in
  dateLastUpdated: string;
  encoderId: string;
  bookkeeperId?: string;
  distributorId?: string;
  auditorId?: string;
  reviewerId?: string;
  remarks?: string;
  history: AuditLogEntry[];
}

export interface SystemAuditTrailEntry {
  id: string;
  timestamp: string;
  userAccount: string; // e.g. "Jane Doe (System Owner)"
  actionType: "Deletion" | "Import" | "Export" | "Print" | "Assignment";
  fileName?: string; // e.g. "vouchers.csv"
  details: string; // Detailed human-readable explanation
}

