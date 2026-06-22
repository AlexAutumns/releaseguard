import type { EvidenceThreadColorId } from "../board/board-state";
import type { FindingSeverity } from "../../content/content-types";
import type { FindingTypeId } from "./finding-types";

/**
 * Draft finding currently being assembled in the casework notebook.
 *
 * The draft may link direct evidence and/or live board threads. Draft thread
 * links are allowed to be live because the player is still editing.
 */
export interface DraftFinding {
    findingTypeId: FindingTypeId | null;
    severity: FindingSeverity | null;
    linkedEvidenceIds: string[];
    linkedThreadIds: EvidenceThreadColorId[];
    optionalNote: string;
}

/**
 * Snapshot of a linked Evidence Thread at the moment a finding is filed.
 *
 * This prevents filed findings from silently changing when the player later
 * cuts, recreates, or reuses the same colored thread.
 */
export interface FiledThreadSupportSnapshot {
    threadId: EvidenceThreadColorId;
    evidenceIds: string[];
    segmentCount: number;
}

/**
 * Filed finding saved into the notebook.
 *
 * Filed findings snapshot linked thread evidence at filing time. Direct
 * evidence IDs are also copied so scoring/reporting stays stable.
 */
export interface FiledFinding {
    filedFindingId: string;
    findingTypeId: FindingTypeId;
    severity: FindingSeverity;
    linkedEvidenceIds: string[];
    linkedThreadIds: EvidenceThreadColorId[];
    linkedThreadSnapshots: FiledThreadSupportSnapshot[];
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
