/**
 * Current schema version for persisted Shift Run records.
 *
 * Keep the version explicit so later progression/save migrations do not need to
 * infer the record shape from optional fields.
 */
export type ShiftRunSchemaVersion = 1;

/**
 * Stable relationship between one authored shift ticket and its submitted
 * immutable Ticket Result attempt.
 */
export interface CompletedShiftTicketAttempt {
    ticketId: string;
    attemptId: string;
}

/**
 * Persisted sequencing truth for one authored shift.
 *
 * `nextTicketIndex` always identifies the next incomplete ticket in
 * `orderedTicketIds`. Completed ticket attempts keep the minimal ticket-to-
 * attempt relationship needed to rebuild Ticket Result and Shift Result flow.
 */
export interface ShiftRun {
    schemaVersion: ShiftRunSchemaVersion;
    shiftRunId: string;
    shiftId: string;
    orderedTicketIds: string[];
    nextTicketIndex: number;
    completedTicketAttempts: CompletedShiftTicketAttempt[];
    startedAt: string;
    completedAt: string | null;
}
