import { ruleFail, ruleOk, type RuleResult } from "../shared/rule-result";
import type { EvidenceInteractionState } from "./evidence-state";

/**
 * Checks whether an evidence ID belongs to the active ticket.
 */
export function isKnownEvidenceId(
    validEvidenceIds: readonly string[],
    evidenceId: string,
): boolean {
    return validEvidenceIds.includes(evidenceId);
}

/**
 * Checks whether the player has inspected an evidence file.
 */
export function hasInspectedEvidence(
    state: EvidenceInteractionState,
    evidenceId: string,
): boolean {
    return state.inspectedEvidenceIds.includes(evidenceId);
}

/**
 * Marks evidence as inspected.
 *
 * This action is intentionally not treated as undoable later. Reading evidence
 * is light gameplay progress, not a board/finding decision that needs undo.
 */
export function markEvidenceInspected(
    state: EvidenceInteractionState,
    evidenceId: string,
    validEvidenceIds: readonly string[],
): RuleResult<EvidenceInteractionState> {
    if (!isKnownEvidenceId(validEvidenceIds, evidenceId)) {
        return ruleFail(
            "UNKNOWN_EVIDENCE",
            "That evidence file does not exist in the active ticket.",
            "error",
        );
    }

    if (hasInspectedEvidence(state, evidenceId)) {
        return ruleOk(state);
    }

    return ruleOk({
        ...state,
        inspectedEvidenceIds: [...state.inspectedEvidenceIds, evidenceId],
    });
}
