import type { FindingSeverity } from "../../content/content-types";
import type { FindingTypeId } from "./finding-types";

/**
 * Draft finding currently being assembled in the casework notebook.
 *
 * The player shows reasoning by linking support and applying a generic risk
 * stamp. Optional text is available, but required free writing is avoided so the
 * game does not become a written assignment.
 */
export interface DraftFinding {
    findingTypeId: FindingTypeId | null;
    severity: FindingSeverity | null;

    /**
     * Individual evidence cards linked directly to this draft.
     */
    linkedEvidenceIds: string[];

    /**
     * Reserved for Evidence Threads in Build 001F-B.
     *
     * A thread will let the player link a whole connected evidence group without
     * selecting every evidence card one-by-one.
     */
    linkedThreadIds: string[];

    /**
     * Optional note written by the player. This is not required and should not
     * become the main grading anchor.
     */
    optionalNote: string;
}

/**
 * Filed finding saved into the notebook.
 *
 * Filed findings snapshot linked evidence IDs at filing time so future scoring
 * stays stable even if the board changes later.
 */
export interface FiledFinding {
    filedFindingId: string;
    findingTypeId: FindingTypeId;
    severity: FindingSeverity;
    linkedEvidenceIds: string[];
    linkedThreadIds: string[];
    optionalNote: string;
    createdAt: string;
}

/**
 * Notebook finding state for one ticket attempt.
 */
export interface FindingState {
    draft: DraftFinding;
    filedFindings: FiledFinding[];
}

/**
 * Creates an empty draft finding.
 */
export function createEmptyDraftFinding(): DraftFinding {
    return {
        findingTypeId: null,
        severity: null,
        linkedEvidenceIds: [],
        linkedThreadIds: [],
        optionalNote: "",
    };
}

/**
 * Creates the initial notebook state for a ticket attempt.
 */
export function createInitialFindingState(): FindingState {
    return {
        draft: createEmptyDraftFinding(),
        filedFindings: [],
    };
}
