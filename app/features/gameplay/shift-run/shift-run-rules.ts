import { ruleFail, ruleOk, type RuleResult } from "../shared/rule-result";
import type { ShiftRun } from "./shift-run-types";

/**
 * Input for creating one fresh Shift Run sequencing record.
 */
export interface CreateShiftRunInput {
    shiftId: string;
    orderedTicketIds: string[];
    shiftRunId?: string;
    startedAt?: string;
}

/**
 * Input for recording one successfully saved Ticket Result in a Shift Run.
 */
export interface CompleteShiftRunTicketInput {
    shiftRun: ShiftRun;
    ticketId: string;
    attemptId: string;
    completedAt: string;
}

/**
 * Creates a stable Shift Run ID when one is not supplied explicitly.
 */
function createShiftRunId(shiftId: string, startedAt: string): string {
    const safeShiftId = shiftId.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
    const safeTimestamp = startedAt.replace(/[^0-9a-zA-Z]/g, "");

    return `shift-run-${safeShiftId}-${safeTimestamp}`;
}

/**
 * Creates the persisted sequencing record for one authored shift.
 *
 * Authored shift validation is responsible for non-empty, duplicate-free ticket
 * assignments. The factory snapshots that authored order so an active run does
 * not silently change if content ordering is edited later.
 */
export function createShiftRun({
    shiftId,
    orderedTicketIds,
    shiftRunId,
    startedAt,
}: CreateShiftRunInput): ShiftRun {
    const actualStartedAt = startedAt ?? new Date().toISOString();

    return {
        schemaVersion: 1,
        shiftRunId: shiftRunId ?? createShiftRunId(shiftId, actualStartedAt),
        shiftId,
        orderedTicketIds: [...orderedTicketIds],
        nextTicketIndex: 0,
        completedTicketAttempts: [],
        startedAt: actualStartedAt,
        completedAt: null,
    };
}

/**
 * Returns the next incomplete ticket ID for one Shift Run.
 */
export function getNextShiftRunTicketId(shiftRun: ShiftRun): string | null {
    return shiftRun.orderedTicketIds[shiftRun.nextTicketIndex] ?? null;
}

/**
 * Returns whether the Shift Run has reached a persisted completed checkpoint.
 */
export function isShiftRunComplete(shiftRun: ShiftRun): boolean {
    return shiftRun.completedAt !== null;
}

/**
 * Records one completed ticket attempt and advances the Shift Run exactly once.
 *
 * The operation is idempotent for the same ticket/attempt pair so a submission
 * retry after an interrupted navigation does not advance the run twice. Other
 * out-of-order or conflicting completion attempts fail explicitly.
 */
export function completeShiftRunTicket({
    shiftRun,
    ticketId,
    attemptId,
    completedAt,
}: CompleteShiftRunTicketInput): RuleResult<ShiftRun> {
    const completedTicketAttempt = shiftRun.completedTicketAttempts.find(
        (item) => item.ticketId === ticketId,
    );

    if (completedTicketAttempt?.attemptId === attemptId) {
        return ruleOk(shiftRun);
    }

    if (completedTicketAttempt) {
        return ruleFail(
            "shift-run:ticket-already-completed",
            `Ticket "${ticketId}" is already completed by attempt "${completedTicketAttempt.attemptId}".`,
            "error",
        );
    }

    const attemptOwner = shiftRun.completedTicketAttempts.find(
        (item) => item.attemptId === attemptId,
    );

    if (attemptOwner) {
        return ruleFail(
            "shift-run:attempt-already-recorded",
            `Attempt "${attemptId}" is already recorded for ticket "${attemptOwner.ticketId}".`,
            "error",
        );
    }

    if (isShiftRunComplete(shiftRun)) {
        return ruleFail(
            "shift-run:already-complete",
            `Shift Run "${shiftRun.shiftRunId}" is already complete.`,
            "error",
        );
    }

    const expectedTicketId = getNextShiftRunTicketId(shiftRun);

    if (!expectedTicketId) {
        return ruleFail(
            "shift-run:missing-next-ticket",
            `Shift Run "${shiftRun.shiftRunId}" has no next ticket to complete.`,
            "error",
        );
    }

    if (expectedTicketId !== ticketId) {
        return ruleFail(
            "shift-run:out-of-order-ticket",
            `Ticket "${ticketId}" cannot complete yet. The next expected ticket is "${expectedTicketId}".`,
            "error",
        );
    }

    const nextTicketIndex = shiftRun.nextTicketIndex + 1;
    const hasCompletedShift =
        nextTicketIndex === shiftRun.orderedTicketIds.length;

    return ruleOk({
        ...shiftRun,
        nextTicketIndex,
        completedTicketAttempts: [
            ...shiftRun.completedTicketAttempts,
            {
                ticketId,
                attemptId,
            },
        ],
        completedAt: hasCompletedShift ? completedAt : null,
    });
}
