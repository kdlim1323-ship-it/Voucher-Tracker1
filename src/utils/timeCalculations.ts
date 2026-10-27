/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Transaction, WorkflowStatus } from "../types";

export interface ProcessingTimeBreakdown {
  totalHoursMinutes: string; // "dd:hh:mm:ss"
  returnHoursMinutes: string; // "dd:hh:mm:ss"
  netHoursMinutes: string; // "dd:hh:mm:ss"
  totalMs: number;
  returnMs: number;
  netMs: number;
}

/**
 * Automatically computes Total Processing Time, Total Return Duration,
 * and Net Processing Time by deducting "Returned for Correction" durations.
 * Formula: Net Processing Time = Total Processing Time – Total Return Duration
 * Display format: dd:hh:mm:ss
 */
export function calculateTransactionTimeBreakdown(tx: Transaction): ProcessingTimeBreakdown {
  if (!tx.history || tx.history.length === 0) {
    return {
      totalHoursMinutes: "00:00:00:00",
      returnHoursMinutes: "00:00:00:00",
      netHoursMinutes: "00:00:00:00",
      totalMs: 0,
      returnMs: 0,
      netMs: 0
    };
  }

  // Sort history defensively by timestamp to ensure chronological order
  const sortedHistory = [...tx.history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // 1. Get start time (timestamp of the first log entry)
  const start = new Date(sortedHistory[0].timestamp).getTime();

  // 2. Get end time (either COMPLETED timestamp or current time if active)
  const completedEntry = sortedHistory.find((h) => h.newStatus === WorkflowStatus.COMPLETED);
  const end = completedEntry ? new Date(completedEntry.timestamp).getTime() : Date.now();

  const totalMs = Math.max(0, end - start);

  // 3. Calculate return duration
  let returnMs = 0;
  let returnStart: number | null = null;

  const isPausedStatus = (status: WorkflowStatus | null | undefined): boolean => {
    return status === WorkflowStatus.RETURNED_FOR_CORRECTION || status === WorkflowStatus.PULLED_OUT;
  };

  for (const entry of sortedHistory) {
    // If we transition INTO a paused status
    if (isPausedStatus(entry.newStatus)) {
      if (returnStart === null) {
        returnStart = new Date(entry.timestamp).getTime();
      }
    } 
    // If we transition OUT of a paused status
    else if (returnStart !== null && !isPausedStatus(entry.newStatus)) {
      const exitTime = new Date(entry.timestamp).getTime();
      returnMs += Math.max(0, exitTime - returnStart);
      returnStart = null;
    }
  }

  // If currently in returned state and not completed, accumulate up to now
  if (returnStart !== null && !completedEntry) {
    returnMs += Math.max(0, Date.now() - returnStart);
  }

  // 4. Compute Net Processing Time (clamped to 0 minimum)
  const netMs = Math.max(0, totalMs - returnMs);

  // Helper to format ms to dd:hh:mm:ss
  const formatMs = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const seconds = totalSeconds % 60;
    
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    
    const totalHours = Math.floor(totalMinutes / 60);
    const hours = totalHours % 24;
    
    const days = Math.floor(totalHours / 24);
    
    return `${String(days).padStart(2, "0")}:${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  return {
    totalHoursMinutes: formatMs(totalMs),
    returnHoursMinutes: formatMs(returnMs),
    netHoursMinutes: formatMs(netMs),
    totalMs,
    returnMs,
    netMs
  };
}
