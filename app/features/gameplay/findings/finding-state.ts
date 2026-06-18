import type {
    FindingSeverity,
    RiskCategory,
} from "../../content/content-types";

/**
 * Editable finding draft shown in the notebook.
 */
export interface DraftFinding {
    category: RiskCategory | null;
    severity: FindingSeverity | null;
    summary: string;
    linkedEvidenceIds: string[];
}

/**
 * Filed finding submitted by the player during a ticket attempt.
 */
export interface FiledFinding {
    filedFindingId: string;
    category: RiskCategory;
    severity: FindingSeverity;
    summary: string;
    linkedEvidenceIds: string[];
    createdAt: string;
}

/**
 * Runtime finding state for a ticket attempt.
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
        category: null,
        severity: null,
        summary: "",
        linkedEvidenceIds: [],
    };
}

/**
 * Creates the initial finding state for a ticket attempt.
 */
export function createInitialFindingState(): FindingState {
    return {
        draft: createEmptyDraftFinding(),
        filedFindings: [],
    };
}
