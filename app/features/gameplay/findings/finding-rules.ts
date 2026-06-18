import { isKnownEvidenceId } from "../evidence/evidence-rules";
import { ruleFail, ruleOk, type RuleResult } from "../shared/rule-result";
import {
    createEmptyDraftFinding,
    type DraftFinding,
    type FiledFinding,
    type FindingState,
} from "./finding-state";

/**
 * Patch object for updating the notebook draft finding.
 */
export type DraftFindingPatch = Partial<
    Pick<DraftFinding, "category" | "severity" | "summary">
>;

/**
 * Updates draft finding fields.
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
 * Attaches evidence to the current draft finding.
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
 * Removes evidence from the current draft finding.
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
 * Files the current draft as a player finding.
 */
export function fileDraftFinding(
    state: FindingState,
    createdAt: string,
): RuleResult<FindingState> {
    const summary = state.draft.summary.trim();

    if (!summary) {
        return ruleFail(
            "FINDING_SUMMARY_REQUIRED",
            "Write a short finding summary before filing it.",
        );
    }

    if (!state.draft.category) {
        return ruleFail(
            "FINDING_CATEGORY_REQUIRED",
            "Choose a risk category before filing the finding.",
        );
    }

    if (!state.draft.severity) {
        return ruleFail(
            "FINDING_SEVERITY_REQUIRED",
            "Choose a severity before filing the finding.",
        );
    }

    if (state.draft.linkedEvidenceIds.length === 0) {
        return ruleFail(
            "FINDING_EVIDENCE_REQUIRED",
            "Attach at least one evidence file before filing the finding.",
        );
    }

    const filedFinding: FiledFinding = {
        filedFindingId: createFiledFindingId(state),
        category: state.draft.category,
        severity: state.draft.severity,
        summary,
        linkedEvidenceIds: state.draft.linkedEvidenceIds,
        createdAt,
    };

    return ruleOk({
        ...state,
        draft: createEmptyDraftFinding(),
        filedFindings: [...state.filedFindings, filedFinding],
    });
}

/**
 * Removes one filed finding.
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
