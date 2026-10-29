/**
 * Firebase Integration Types (Phase 1 Preparation)
 * 
 * Defines schemas for Cloud Firestore documents, integration lifecycle states,
 * audit subcollection entries, tracking number reservations, and public/private profiles.
 */

import { UserRole, WorkflowStatus } from '../types';

/**
 * Explicit states for Firebase client SDK initialization.
 * Prevents silent fallback or deceptive mock behavior.
 */
export type FirebaseIntegrationStatus =
  | 'UNCONFIGURED'            // Missing or placeholder environment variables in .env
  | 'CONFIGURED_DISCONNECTED' // Configuration detected, network or session not yet connected
  | 'READY'                   // Firebase App, Auth, and Firestore initialized successfully
  | 'INITIALIZATION_ERROR';   // Configuration syntax error or unsupported client environment

export interface FirebaseStatusInfo {
  status: FirebaseIntegrationStatus;
  message: string;
  isConfigured: boolean;
  missingKeys: string[];
}

/**
 * 5-tier synchronization state for voucher transactions.
 * Guarantees that users are never told a voucher is "saved" until confirmed by the server.
 */
export type CloudSyncState =
  | 'draft'             // Unsubmitted local form in memory
  | 'submitting'        // In-flight network request
  | 'queued_offline'    // Cached in local IndexedDB; tracking number is NOT yet cloud-reserved
  | 'server_confirmed'  // Server acknowledged and committed transaction in Cloud Firestore
  | 'sync_conflict';    // Server rejected write upon reconnect (e.g., duplicate tracking number)

/**
 * Durable offline conflict model preserved across page refreshes and browser restarts.
 */
export interface OfflineConflictRecord {
  id: string;
  transactionNumber: string;
  originalPayload: Record<string, unknown>;
  conflictReason: string;
  conflictTimestamp: string;
  resolved: boolean;
  resolvedPayload?: Record<string, unknown>;
}

/**
 * Tracking Number Reservation document schema (/trackingNumbers/{sanitizedNumber}).
 * Enforces atomic uniqueness across concurrent clients.
 */
export interface TrackingNumberReservation {
  trackingNumber: string;
  transactionId: string;
  reservedBy: string;
  reservedAt: string;
  officeCode: string;
}

/**
 * Immutable audit subcollection document schema (/transactions/{txId}/auditLogs/{sequenceNumber}).
 */
export interface AuditLogDocument {
  id: string;
  sequenceNumber: number;
  timestamp: string; // ISO-8601 string or Firestore server timestamp
  action: string;
  statusFrom: WorkflowStatus;
  statusTo: WorkflowStatus;
  userId: string;
  userName: string;
  userRole: UserRole;
  remarks: string;
  office?: string;
}

/**
 * Non-sensitive public profile for directory view and voucher routing (/publicProfiles/{uid}).
 * Readable by all authenticated active staff members.
 * Strictly excludes emails, phone numbers, MFA secrets, and administrative permissions.
 */
export interface PublicUserProfile {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  assignedOffice?: string;
  position?: string;
  isActive: boolean;
}

/**
 * Sensitive private user profile (/users/{uid}).
 * Accessible only by the account owner, System Owner, or authorized System Administrators.
 */
export interface PrivateUserProfile {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: UserRole;
  assignedOffice?: string;
  contactNumber?: string;
  position?: string;
  isActive: boolean;
  lastLogin?: string;
  mfaEnabled?: boolean;
  mfaSecret?: string;
  ownerPermissions?: {
    canManageOffices: boolean;
    canManageUsers: boolean;
    canExportData: boolean;
    canImportData: boolean;
    canViewAuditTrail: boolean;
    canManageSecurity: boolean;
  };
  createdAt: string;
  updatedAt: string;
}
