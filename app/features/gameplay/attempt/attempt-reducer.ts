import {
    connectPinnedEvidence,
    disconnectBoardConnection,
    movePinnedEvidence,
    pinEvidenceToBoard,
    selectPinnedEvidence,
    unpinEvidenceFromBoard,
} from "../board/board-rules";
import { markEvidenceInspected } from "../evidence/evidence-rules";
import {
    attachEvidenceToDraft,
    fileDraftFinding,
    removeEvidenceFromDraft,
    removeFiledFinding,
    updateDraftFinding,
} from "../findings/finding-rules";
import type { GameplayRuleIssue, RuleResult } from "../shared/rule-result";
import { createInitialAttemptPresentState } from "./attempt-factory";
import { recordUndoSnapshot, undoLastAttemptAction } from "./attempt-history";
import type { TicketAttemptAction } from "./attempt-actions";
import type { AttemptPresentState, TicketAttemptState } from "./attempt-state";

/**
 * Returns the same attempt state with a new gameplay issue.
 */
function withIssue(
    state: TicketAttemptState,
    issue: GameplayRuleIssue,
): TicketAttemptState {
    return {
        ...state,
        lastIssue: issue,
    };
}

/**
 * Applies a non-undoable rule result to the attempt present state.
 */
function applyRuleResult(
    state: TicketAttemptState,
    result: RuleResult<AttemptPresentState>,
): TicketAttemptState {
    if (!result.ok) {
        return withIssue(state, result.issue);
    }

    return {
        ...state,
        present: result.value,
        lastIssue: null,
    };
}

/**
 * Applies an undoable present-state update.
 *
 * Undoable actions record the previous present state before replacing it.
 */
function commitUndoablePresent(
    state: TicketAttemptState,
    present: AttemptPresentState,
): TicketAttemptState {
    const stateWithHistory = recordUndoSnapshot(state);

    return {
        ...stateWithHistory,
        present,
        lastIssue: null,
    };
}

/**
 * Applies an undoable rule result to the attempt present state.
 */
function applyUndoableRuleResult(
    state: TicketAttemptState,
    result: RuleResult<AttemptPresentState>,
): TicketAttemptState {
    if (!result.ok) {
        return withIssue(state, result.issue);
    }

    return commitUndoablePresent(state, result.value);
}

/**
 * Reducer for one ticket attempt.
 *
 * The reducer coordinates domain rules and history. Board, evidence, finding,
 * and verdict logic should stay in their own domain files instead of being
 * dumped directly into this reducer.
 */
export function ticketAttemptReducer(
    state: TicketAttemptState,
    action: TicketAttemptAction,
): TicketAttemptState {
    switch (action.type) {
        case "SET_ACTIVE_TOOL":
            return {
                ...state,
                present: {
                    ...state.present,
                    activeTool: action.toolId,
                },
                lastIssue: null,
            };

        case "CLEAR_ACTIVE_TOOL":
            return {
                ...state,
                present: {
                    ...state.present,
                    activeTool: "select",
                },
                lastIssue: null,
            };

        case "MARK_EVIDENCE_INSPECTED": {
            const result = markEvidenceInspected(
                state.present.evidence,
                action.evidenceId,
                state.context.evidenceIds,
            );

            if (!result.ok) {
                return withIssue(state, result.issue);
            }

            return applyRuleResult(state, {
                ok: true,
                value: {
                    ...state.present,
                    evidence: result.value,
                },
            });
        }

        case "PIN_EVIDENCE": {
            const result = pinEvidenceToBoard(
                state.present.board,
                action.evidenceId,
                state.context.evidenceIds,
                action.nowIso,
            );

            if (!result.ok) {
                return withIssue(state, result.issue);
            }

            return applyUndoableRuleResult(state, {
                ok: true,
                value: {
                    ...state.present,
                    board: result.value,
                },
            });
        }

        case "UNPIN_EVIDENCE": {
            const result = unpinEvidenceFromBoard(
                state.present.board,
                action.pinnedEvidenceId,
            );

            if (!result.ok) {
                return withIssue(state, result.issue);
            }

            return applyUndoableRuleResult(state, {
                ok: true,
                value: {
                    ...state.present,
                    board: result.value,
                },
            });
        }

        case "MOVE_PINNED_EVIDENCE": {
            const result = movePinnedEvidence(
                state.present.board,
                action.pinnedEvidenceId,
                action.position,
            );

            if (!result.ok) {
                return withIssue(state, result.issue);
            }

            return applyUndoableRuleResult(state, {
                ok: true,
                value: {
                    ...state.present,
                    board: result.value,
                },
            });
        }

        case "SELECT_PINNED_EVIDENCE": {
            const result = selectPinnedEvidence(
                state.present.board,
                action.pinnedEvidenceId,
            );

            if (!result.ok) {
                return withIssue(state, result.issue);
            }

            return applyRuleResult(state, {
                ok: true,
                value: {
                    ...state.present,
                    board: result.value,
                },
            });
        }

        case "CONNECT_PINNED_EVIDENCE": {
            const result = connectPinnedEvidence(
                state.present.board,
                action.fromPinnedEvidenceId,
                action.toPinnedEvidenceId,
                action.nowIso,
            );

            if (!result.ok) {
                return withIssue(state, result.issue);
            }

            return applyUndoableRuleResult(state, {
                ok: true,
                value: {
                    ...state.present,
                    board: result.value,
                },
            });
        }

        case "DISCONNECT_CONNECTION": {
            const result = disconnectBoardConnection(
                state.present.board,
                action.connectionId,
            );

            if (!result.ok) {
                return withIssue(state, result.issue);
            }

            return applyUndoableRuleResult(state, {
                ok: true,
                value: {
                    ...state.present,
                    board: result.value,
                },
            });
        }

        case "UPDATE_DRAFT_FINDING":
            return {
                ...state,
                present: {
                    ...state.present,
                    findings: updateDraftFinding(
                        state.present.findings,
                        action.patch,
                    ),
                },
                lastIssue: null,
            };

        case "ATTACH_EVIDENCE_TO_DRAFT": {
            const result = attachEvidenceToDraft(
                state.present.findings,
                action.evidenceId,
                state.context.evidenceIds,
            );

            if (!result.ok) {
                return withIssue(state, result.issue);
            }

            return applyRuleResult(state, {
                ok: true,
                value: {
                    ...state.present,
                    findings: result.value,
                },
            });
        }

        case "REMOVE_EVIDENCE_FROM_DRAFT":
            return {
                ...state,
                present: {
                    ...state.present,
                    findings: removeEvidenceFromDraft(
                        state.present.findings,
                        action.evidenceId,
                    ),
                },
                lastIssue: null,
            };

        case "FILE_FINDING": {
            const result = fileDraftFinding(
                state.present.findings,
                action.nowIso,
            );

            if (!result.ok) {
                return withIssue(state, result.issue);
            }

            return applyUndoableRuleResult(state, {
                ok: true,
                value: {
                    ...state.present,
                    findings: result.value,
                },
            });
        }

        case "REMOVE_FILED_FINDING": {
            const result = removeFiledFinding(
                state.present.findings,
                action.filedFindingId,
            );

            if (!result.ok) {
                return withIssue(state, result.issue);
            }

            return applyUndoableRuleResult(state, {
                ok: true,
                value: {
                    ...state.present,
                    findings: result.value,
                },
            });
        }

        case "SELECT_VERDICT":
            return commitUndoablePresent(state, {
                ...state.present,
                verdict: {
                    selectedVerdict: action.verdict,
                },
            });

        case "UNDO_LAST_ACTION": {
            const result = undoLastAttemptAction(state);

            if (!result.ok) {
                return withIssue(state, result.issue);
            }

            return result.value;
        }

        case "RESET_ATTEMPT":
            return {
                ...state,
                present: createInitialAttemptPresentState(),
                history: {
                    ...state.history,
                    past: [],
                },
                lastIssue: null,
            };

        case "CLEAR_LAST_ISSUE":
            return {
                ...state,
                lastIssue: null,
            };

        default:
            return action satisfies never;
    }
}
