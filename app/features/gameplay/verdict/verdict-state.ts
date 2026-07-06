import type { ReleaseVerdict } from "../../content/content-types";

/**
 * Runtime verdict state for a ticket attempt.
 */
export interface VerdictState {
    selectedVerdict: ReleaseVerdict | null;
}

/**
 * Creates the initial verdict state for a ticket attempt.
 */
export function createInitialVerdictState(): VerdictState {
    return {
        selectedVerdict: null,
    };
}
