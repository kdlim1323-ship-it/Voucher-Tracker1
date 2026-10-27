/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Office, Transaction, UserRole, WorkflowStatus } from "../types";

export const initialOffices: Office[] = [
  { code: "PGO 1011-01", name: "Governor's Office", handledBy: "usr-encoder1", description: "Office of the Provincial Governor - Executive management and leadership", isActive: true },
  { code: "OPA 1011-02", name: "Office of the Provincial Accountant", handledBy: "usr-book1", description: "Accounting, bookkeeping, and financial auditing services", isActive: true },
  { code: "GSO 1011-03", name: "General Services Office", handledBy: "usr-encoder2", description: "General provincial logistics, procurement, and asset management", isActive: true },
  { code: "IAD 1011-04", name: "Internal Audit Division", handledBy: "usr-aud1", description: "Independent provincial compliance and financial auditing", isActive: true },
  { code: "PHR 1011-05", name: "Provincial HR Management Office", handledBy: "usr-admin", description: "Personnel records, benefits, and payroll management", isActive: true },
  { code: "PBO 1011-06", name: "Provincial Budget Office", handledBy: "usr-rev1", description: "Budget allocations, appropriations, and expenditure control", isActive: true }
];

export const initialUsers: User[] = [
  {
    id: "usr-admin",
    username: "admin",
    employeeName: "Jane Smith",
    position: "Chief Administrative Officer",
    role: UserRole.ADMIN,
    employeeId: "EMP-2026-0001",
    contactNumber: "+63 917 123 4567",
    emailAddress: "smith.jane@pangasinan.gov.ph",
    isActive: true,
    passwordHash: "admin123"
  },
  {
    id: "usr-encoder1",
    username: "encoder1",
    employeeName: "John Doe",
    position: "Administrative Clerk I",
    role: UserRole.ENCODER,
    employeeId: "EMP-2026-0002",
    contactNumber: "+63 918 234 5678",
    emailAddress: "doe.john@pangasinan.gov.ph",
    isActive: true,
    passwordHash: "pass123"
  },
  {
    id: "usr-encoder2",
    username: "clerk2",
    employeeName: "Sarah Connor",
    position: "Administrative Assistant II",
    role: UserRole.ENCODER,
    employeeId: "EMP-2026-0003",
    contactNumber: "+63 919 345 6789",
    emailAddress: "connor.sarah@pangasinan.gov.ph",
    isActive: true,
    passwordHash: "pass123"
  },
  {
    id: "usr-book1",
    username: "book1",
    employeeName: "Alice Cooper",
    position: "Senior Bookkeeper",
    role: UserRole.BOOKKEEPER,
    employeeId: "EMP-2026-0004",
    contactNumber: "+63 920 456 7890",
    emailAddress: "cooper.alice@pangasinan.gov.ph",
    isActive: true,
    passwordHash: "pass123"
  },
  {
    id: "usr-dist1",
    username: "dist1",
    employeeName: "Charlie Brown",
    position: "Records Distributor",
    role: UserRole.DISTRIBUTOR,
    employeeId: "EMP-2026-0005",
    contactNumber: "+63 921 567 8901",
    emailAddress: "brown.charlie@pangasinan.gov.ph",
    isActive: true,
    passwordHash: "pass123"
  },
  {
    id: "usr-aud1",
    username: "auditor1",
    employeeName: "Diana Prince",
    position: "Internal Auditor II",
    role: UserRole.AUDITOR,
    employeeId: "EMP-2026-0006",
    contactNumber: "+63 922 678 9012",
    emailAddress: "prince.diana@pangasinan.gov.ph",
    isActive: true,
    passwordHash: "pass123"
  },
  {
    id: "usr-rev1",
    username: "reviewer1",
    employeeName: "Evan Wright",
    position: "Executive Review Officer",
    role: UserRole.REVIEWER,
    employeeId: "EMP-2026-0007",
    contactNumber: "+63 923 789 0123",
    emailAddress: "wright.evan@pangasinan.gov.ph",
    isActive: true,
    passwordHash: "pass123"
  }
];

export const initialTransactions: Transaction[] = [
  {
    id: "tx-001",
    transactionNumber: "JDO-26-06-000001",
    dateReceived: "2026-06-25T08:30:00-07:00",
    cafoaNumber: "02458",
    cafoaNumbers: ["02458"],
    cafoaEntries: [
      { cafoaNumber: "02458", amount: 12500.00, officeCode: "PGO 1011-01" }
    ],
    officeCode: "PGO 1011-01",
    payee: "Juan dela Cruz",
    particulars: "Reimbursement of travel expenses for seminar attendance in Lingayen, Pangasinan.",
    amount: 12500.00,
    voucherType: "Reimbursement",
    currentStatus: WorkflowStatus.COMPLETED,
    currentAssignedUserId: "usr-rev1",
    currentAssignedOffice: "Provincial Accountant Archive",
    dateLastUpdated: "2026-06-28T16:45:00-07:00",
    encoderId: "usr-encoder1",
    bookkeeperId: "usr-book1",
    distributorId: "usr-dist1",
    auditorId: "usr-aud1",
    reviewerId: "usr-rev1",
    history: [
      {
        id: "h-001-1",
        action: "Document Logged & Encoded",
        prevStatus: null,
        newStatus: WorkflowStatus.ENCODED,
        userId: "usr-encoder1",
        userName: "John Doe",
        userRole: UserRole.ENCODER,
        timestamp: "2026-06-25T08:30:00-07:00",
        officeCode: "OPA 1011-02",
        remarks: "Voucher encoded into system queue."
      },
      {
        id: "h-001-2",
        action: "Forwarded to Bookkeeper",
        prevStatus: WorkflowStatus.ENCODED,
        newStatus: WorkflowStatus.FORWARDED_TO_BOOKKEEPER,
        userId: "usr-encoder1",
        userName: "John Doe",
        userRole: UserRole.ENCODER,
        timestamp: "2026-06-25T09:15:00-07:00",
        officeCode: "OPA 1011-02"
      },
      {
        id: "h-001-3",
        action: "Acknowledged Receipt",
        prevStatus: WorkflowStatus.FORWARDED_TO_BOOKKEEPER,
        newStatus: WorkflowStatus.RECEIVED_BY_BOOKKEEPER,
        userId: "usr-book1",
        userName: "Alice Cooper",
        userRole: UserRole.BOOKKEEPER,
        timestamp: "2026-06-25T11:00:00-07:00",
        officeCode: "OPA 1011-02"
      },
      {
        id: "h-001-4",
        action: "Recorded & Forwarded to Distributor",
        prevStatus: WorkflowStatus.RECEIVED_BY_BOOKKEEPER,
        newStatus: WorkflowStatus.RECORDED,
        userId: "usr-book1",
        userName: "Alice Cooper",
        userRole: UserRole.BOOKKEEPER,
        timestamp: "2026-06-25T14:30:00-07:00",
        officeCode: "OPA 1011-02",
        remarks: "Accounting entry #2026-901"
      },
      {
        id: "h-001-4b",
        action: "Submitted to Distributor",
        prevStatus: WorkflowStatus.RECORDED,
        newStatus: WorkflowStatus.SUBMITTED_TO_DISTRIBUTOR,
        userId: "usr-book1",
        userName: "Alice Cooper",
        userRole: UserRole.BOOKKEEPER,
        timestamp: "2026-06-25T14:32:00-07:00",
        officeCode: "OPA 1011-02"
      },
      {
        id: "h-001-5",
        action: "Received & Forwarded to Auditor",
        prevStatus: WorkflowStatus.SUBMITTED_TO_DISTRIBUTOR,
        newStatus: WorkflowStatus.FORWARDED_TO_AUDITOR,
        userId: "usr-dist1",
        userName: "Charlie Brown",
        userRole: UserRole.DISTRIBUTOR,
        timestamp: "2026-06-26T10:00:00-07:00",
        officeCode: "GSO 1011-03"
      },
      {
        id: "h-001-6",
        action: "Started Auditing",
        prevStatus: WorkflowStatus.FORWARDED_TO_AUDITOR,
        newStatus: WorkflowStatus.UNDER_AUDIT,
        userId: "usr-aud1",
        userName: "Diana Prince",
        userRole: UserRole.AUDITOR,
        timestamp: "2026-06-26T14:00:00-07:00",
        officeCode: "IAD 1011-04"
      },
      {
        id: "h-001-7",
        action: "Audit Approved & Returned to Distributor",
        prevStatus: WorkflowStatus.UNDER_AUDIT,
        newStatus: WorkflowStatus.FORWARDED_TO_REVIEWER,
        userId: "usr-aud1",
        userName: "Diana Prince",
        userRole: UserRole.AUDITOR,
        timestamp: "2026-06-27T11:20:00-07:00",
        officeCode: "IAD 1011-04",
        remarks: "Auditing complete, documentation in order."
      },
      {
        id: "h-001-8",
        action: "Forwarded to Reviewer",
        prevStatus: WorkflowStatus.FORWARDED_TO_REVIEWER,
        newStatus: WorkflowStatus.UNDER_REVIEW,
        userId: "usr-dist1",
        userName: "Charlie Brown",
        userRole: UserRole.DISTRIBUTOR,
        timestamp: "2026-06-28T09:00:00-07:00",
        officeCode: "GSO 1011-03"
      },
      {
        id: "h-001-9",
        action: "Final Completed and Archived",
        prevStatus: WorkflowStatus.UNDER_REVIEW,
        newStatus: WorkflowStatus.COMPLETED,
        userId: "usr-rev1",
        userName: "Evan Wright",
        userRole: UserRole.REVIEWER,
        timestamp: "2026-06-28T16:45:00-07:00",
        officeCode: "PGO 1011-01",
        remarks: "Payroll and claims authorized for release."
      }
    ]
  },
  {
    id: "tx-002",
    transactionNumber: "SCO-26-07-000001",
    dateReceived: "2026-07-01T10:00:00-07:00",
    cafoaNumber: "10345",
    cafoaNumbers: ["10345"],
    cafoaEntries: [
      { cafoaNumber: "10345", amount: 1450000.00, officeCode: "PHR 1011-05" }
    ],
    officeCode: "PHR 1011-05",
    payee: "Pangasinan Provincial Staff",
    particulars: "Monthly collective personnel compensation claims and health benefit payroll payouts.",
    amount: 1450000.00,
    voucherType: "Payroll",
    currentStatus: WorkflowStatus.UNDER_AUDIT,
    currentAssignedUserId: "usr-aud1",
    currentAssignedOffice: "Audit Section",
    dateLastUpdated: "2026-07-02T11:30:00-07:00",
    encoderId: "usr-encoder2",
    bookkeeperId: "usr-book1",
    distributorId: "usr-dist1",
    auditorId: "usr-aud1",
    history: [
      {
        id: "h-002-1",
        action: "Document Logged & Encoded",
        prevStatus: null,
        newStatus: WorkflowStatus.ENCODED,
        userId: "usr-encoder2",
        userName: "Sarah Connor",
        userRole: UserRole.ENCODER,
        timestamp: "2026-07-01T10:00:00-07:00",
        officeCode: "PHR 1011-05"
      },
      {
        id: "h-002-2",
        action: "Forwarded to Bookkeeper",
        prevStatus: WorkflowStatus.ENCODED,
        newStatus: WorkflowStatus.FORWARDED_TO_BOOKKEEPER,
        userId: "usr-encoder2",
        userName: "Sarah Connor",
        userRole: UserRole.ENCODER,
        timestamp: "2026-07-01T11:00:00-07:00",
        officeCode: "PHR 1011-05"
      },
      {
        id: "h-002-3",
        action: "Acknowledged Receipt",
        prevStatus: WorkflowStatus.FORWARDED_TO_BOOKKEEPER,
        newStatus: WorkflowStatus.RECEIVED_BY_BOOKKEEPER,
        userId: "usr-book1",
        userName: "Alice Cooper",
        userRole: UserRole.BOOKKEEPER,
        timestamp: "2026-07-01T14:00:00-07:00",
        officeCode: "OPA 1011-02"
      },
      {
        id: "h-002-4",
        action: "Recorded & Forwarded to Distributor",
        prevStatus: WorkflowStatus.RECEIVED_BY_BOOKKEEPER,
        newStatus: WorkflowStatus.RECORDED,
        userId: "usr-book1",
        userName: "Alice Cooper",
        userRole: UserRole.BOOKKEEPER,
        timestamp: "2026-07-02T09:00:00-07:00",
        officeCode: "OPA 1011-02"
      },
      {
        id: "h-002-5",
        action: "Submitted to Distributor",
        prevStatus: WorkflowStatus.RECORDED,
        newStatus: WorkflowStatus.SUBMITTED_TO_DISTRIBUTOR,
        userId: "usr-book1",
        userName: "Alice Cooper",
        userRole: UserRole.BOOKKEEPER,
        timestamp: "2026-07-02T09:15:00-07:00",
        officeCode: "OPA 1011-02"
      },
      {
        id: "h-002-6",
        action: "Received & Forwarded to Auditor",
        prevStatus: WorkflowStatus.SUBMITTED_TO_DISTRIBUTOR,
        newStatus: WorkflowStatus.FORWARDED_TO_AUDITOR,
        userId: "usr-dist1",
        userName: "Charlie Brown",
        userRole: UserRole.DISTRIBUTOR,
        timestamp: "2026-07-02T10:00:00-07:00",
        officeCode: "GSO 1011-03"
      },
      {
        id: "h-002-7",
        action: "Started Auditing",
        prevStatus: WorkflowStatus.FORWARDED_TO_AUDITOR,
        newStatus: WorkflowStatus.UNDER_AUDIT,
        userId: "usr-aud1",
        userName: "Diana Prince",
        userRole: UserRole.AUDITOR,
        timestamp: "2026-07-02T11:30:00-07:00",
        officeCode: "IAD 1011-04"
      }
    ]
  },
  {
    id: "tx-003",
    transactionNumber: "JDO-26-07-000002",
    dateReceived: "2026-07-02T08:00:00-07:00",
    cafoaNumber: "00142",
    cafoaNumbers: ["00142"],
    cafoaEntries: [
      { cafoaNumber: "00142", amount: 145250.00, officeCode: "PBO 1011-06" }
    ],
    officeCode: "PBO 1011-06",
    payee: "Lingayen Engineering Contractors",
    particulars: "Payment for subscription of Provincial office licensing, infrastructure design, and cloud hosting services.",
    amount: 145250.00,
    voucherType: "Reimbursement",
    currentStatus: WorkflowStatus.ENCODED,
    currentAssignedUserId: "usr-encoder1",
    currentAssignedOffice: "Office of the Clerk",
    dateLastUpdated: "2026-07-02T08:00:00-07:00",
    encoderId: "usr-encoder1",
    history: [
      {
        id: "h-003-1",
        action: "Document Logged & Encoded",
        prevStatus: null,
        newStatus: WorkflowStatus.ENCODED,
        userId: "usr-encoder1",
        userName: "John Doe",
        userRole: UserRole.ENCODER,
        timestamp: "2026-07-02T08:00:00-07:00",
        officeCode: "OPA 1011-02",
        remarks: "Voucher encoded into system queue."
      }
    ]
  }
];
