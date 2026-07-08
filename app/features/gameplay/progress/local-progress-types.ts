import type { ShiftRun } from "../shift-run/shift-run-types";

/**
 * Derived lifecycle state for one authored shift.
 */
export type LocalShiftProgressStatus =
    | "locked"
    | "available"
    | "in-progress"
    | "completed";

/**
 * Derived local progression summary for one authored shift.
 *
 * This is runtime view data only. It is rebuilt from authored shifts and
 * persisted Shift Runs rather than saved as a second progression truth.
 */
export interface LocalShiftProgress {
    shiftId: string;
    status: LocalShiftProgressStatus;
    activeShiftRun: ShiftRun | null;
    latestCompletedShiftRun: ShiftRun | null;
}

/**
 * Derived local progression state used by the Case Desk and Continue Case.
 *
 * The record intentionally contains no board, draft finding, modal, or active
 * tool state. ReleaseGuard currently persists completed checkpoints and the next
 * playable ticket, not a half-finished investigation workspace.
 */
export interface ResolvedLocalProgress {
    activeShiftRun: ShiftRun | null;
    completedShiftIds: string[];
    latestCompletedShiftRuns: ShiftRun[];
    nextIncompleteTicketId: string | null;
    nextAvailableShiftId: string | null;
    shifts: LocalShiftProgress[];
}
