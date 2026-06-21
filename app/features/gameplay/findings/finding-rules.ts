import { isKnownEvidenceId } from "../evidence/evidence-rules";
import { ruleFail, ruleOk, type RuleResult } from "../shared/rule-result";
import {
    createEmptyDraftFinding,
    type DraftFinding,
    type FiledFinding,
    type FindingState,
} from "./finding-state";

/**
 * Fields edited directly by the draft finding form.
 *
 * Evidence and thread support are managed through dedicated attach/remove rules
 * so the UI can later support chips, evidence groups, and colored threads
 * without replacing arrays through generic form patches.
 */
export type DraftFindingPatch = Partial<
    Pick<DraftFinding, "findingTypeId" | "severity" | "optionalNote">
>;

/**
 * Updates editable draft finding fields.
 */
export function updateDraftFinding(
    state: FindingState,
    patch: DraftFindingPatch,
): FindingState {
    return {
        ...state,
        draft: {
            ...state.draft,
            ...patch,
        },
    };
}

/**
 * Attaches one evidence file to the current draft finding.
 */
export function attachEvidenceToDraft(
    state: FindingState,
    evidenceId: string,
    validEvidenceIds: readonly string[],
): RuleResult<FindingState> {
    if (!isKnownEvidenceId(validEvidenceIds, evidenceId)) {
        return ruleFail(
            "UNKNOWN_EVIDENCE",
            "That evidence file does not exist in the active ticket.",
            "error",
        );
    }

    if (state.draft.linkedEvidenceIds.includes(evidenceId)) {
        return ruleOk(state);
    }

    return ruleOk({
        ...state,
        draft: {
            ...state.draft,
            linkedEvidenceIds: [...state.draft.linkedEvidenceIds, evidenceId],
        },
    });
}

/**
 * Removes one evidence file from the current draft finding.
 */
export function removeEvidenceFromDraft(
    state: FindingState,
    evidenceId: string,
): FindingState {
    return {
        ...state,
        draft: {
            ...state.draft,
            linkedEvidenceIds: state.draft.linkedEvidenceIds.filter(
                (linkedEvidenceId) => linkedEvidenceId !== evidenceId,
            ),
        },
    };
}

/**
 * Links a future Evidence Thread to the current draft finding.
 *
 * Reserved for Build 001F-B. Keeping this rule now avoids another disruptive
 * state-shape change when Connect becomes useful.
 */
export function attachThreadToDraft(
    state: FindingState,
    threadId: string,
): RuleResult<FindingState> {
    if (state.draft.linkedThreadIds.includes(threadId)) {
        return ruleOk(state);
    }

    return ruleOk({
        ...state,
        draft: {
            ...state.draft,
            linkedThreadIds: [...state.draft.linkedThreadIds, threadId],
        },
    });
}

/**
 * Removes one future Evidence Thread from the current draft finding.
 */
export function removeThreadFromDraft(
    state: FindingState,
    threadId: string,
): FindingState {
    return {
        ...state,
        draft: {
            ...state.draft,
            linkedThreadIds: state.draft.linkedThreadIds.filter(
                (linkedThreadId) => linkedThreadId !== threadId,
            ),
        },
    };
}

/**
 * Creates a stable filed finding ID for the current finding state.
 */
function createFiledFindingId(state: FindingState): string {
    const existingIds = new Set(
        state.filedFindings.map((filedFinding) => filedFinding.filedFindingId),
    );

    let index = state.filedFindings.length + 1;
    let candidateId = `finding-${index}`;

    while (existingIds.has(candidateId)) {
        index += 1;
        candidateId = `finding-${index}`;
    }

    return candidateId;
}

/**
 * Files the current draft as a submitted case finding.
 *
 * Required:
 * - evidence or thread support,
 * - generic finding stamp,
 * - severity.
 *
 * Optional note is not required.
 */
export function fileDraftFinding(
    state: FindingState,
    createdAt: string,
): RuleResult<FindingState> {
    const hasEvidenceSupport =
        state.draft.linkedEvidenceIds.length > 0 ||
        state.draft.linkedThreadIds.length > 0;

    if (!hasEvidenceSupport) {
        return ruleFail(
            "FINDING_SUPPORT_REQUIRED",
            "Attach evidence support before filing the finding.",
        );
    }

    if (!state.draft.findingTypeId) {
        return ruleFail(
            "FINDING_TYPE_REQUIRED",
            "Choose a finding stamp before filing the finding.",
        );
    }

    if (!state.draft.severity) {
        return ruleFail(
            "FINDING_SEVERITY_REQUIRED",
            "Choose a severity before filing the finding.",
        );
    }

    const filedFinding: FiledFinding = {
        filedFindingId: createFiledFindingId(state),
        findingTypeId: state.draft.findingTypeId,
        severity: state.draft.severity,
        linkedEvidenceIds: [...state.draft.linkedEvidenceIds],
        linkedThreadIds: [...state.draft.linkedThreadIds],
        optionalNote: state.draft.optionalNote.trim(),
        createdAt,
    };

    return ruleOk({
        ...state,
        draft: createEmptyDraftFinding(),
        filedFindings: [...state.filedFindings, filedFinding],
    });
}

/**
 * Removes one filed finding from the notebook.
 */
export function removeFiledFinding(
    state: FindingState,
    filedFindingId: string,
): RuleResult<FindingState> {
    if (
        !state.filedFindings.some(
            (filedFinding) => filedFinding.filedFindingId === filedFindingId,
        )
    ) {
        return ruleFail(
            "UNKNOWN_FILED_FINDING",
            "That filed finding does not exist.",
            "error",
        );
    }

    return ruleOk({
        ...state,
        filedFindings: state.filedFindings.filter(
            (filedFinding) => filedFinding.filedFindingId !== filedFindingId,
        ),
    });
}
