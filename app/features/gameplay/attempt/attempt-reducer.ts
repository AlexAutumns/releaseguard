import {
    connectPinnedEvidence,
    disconnectBoardConnection,
    movePinnedEvidence,
    pinEvidenceToBoard,
    selectPinnedEvidence,
    unpinEvidenceFromBoard,
} from "../board/board-rules";
import type { BoardState } from "../board/board-state";
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
import {
    recordBoardUndoSnapshot,
    redoLastBoardAction,
    undoLastBoardAction,
} from "./attempt-history";
import type { TicketAttemptAction } from "./attempt-actions";
import type { TicketAttemptState } from "./attempt-state";

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
 * Records the previous board state and commits a new board state.
 *
 * Undo/redo is board-only by design. Notebook, verdict, and inspection progress
 * are not part of board undo history.
 */
function commitBoardChange(
    state: TicketAttemptState,
    board: BoardState,
): TicketAttemptState {
    const stateWithHistory = recordBoardUndoSnapshot(state);

    return {
        ...stateWithHistory,
        present: {
            ...stateWithHistory.present,
            board,
        },
        lastIssue: null,
    };
}

/**
 * Applies an undoable board rule result.
 */
function applyBoardRuleResult(
    state: TicketAttemptState,
    result: RuleResult<BoardState>,
): TicketAttemptState {
    if (!result.ok) {
        return withIssue(state, result.issue);
    }

    return commitBoardChange(state, result.value);
}

/**
 * Reducer for one ticket attempt.
 *
 * The reducer coordinates domain rules and history. Board undo/redo is isolated
 * to board state so future notebook and verdict interactions do not get
 * accidentally rolled back by board controls.
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

            return {
                ...state,
                present: {
                    ...state.present,
                    evidence: result.value,
                },
                lastIssue: null,
            };
        }

        case "PIN_EVIDENCE": {
            const result = pinEvidenceToBoard(
                state.present.board,
                action.evidenceId,
                state.context.evidenceIds,
                action.nowIso,
            );

            return applyBoardRuleResult(state, result);
        }

        case "UNPIN_EVIDENCE": {
            const result = unpinEvidenceFromBoard(
                state.present.board,
                action.pinnedEvidenceId,
            );

            return applyBoardRuleResult(state, result);
        }

        case "MOVE_PINNED_EVIDENCE": {
            const result = movePinnedEvidence(
                state.present.board,
                action.pinnedEvidenceId,
                action.position,
            );

            return applyBoardRuleResult(state, result);
        }

        case "SELECT_PINNED_EVIDENCE": {
            const result = selectPinnedEvidence(
                state.present.board,
                action.pinnedEvidenceId,
            );

            if (!result.ok) {
                return withIssue(state, result.issue);
            }

            return {
                ...state,
                present: {
                    ...state.present,
                    board: result.value,
                },
                lastIssue: null,
            };
        }

        case "CONNECT_PINNED_EVIDENCE": {
            const result = connectPinnedEvidence(
                state.present.board,
                action.fromPinnedEvidenceId,
                action.toPinnedEvidenceId,
                action.nowIso,
            );

            return applyBoardRuleResult(state, result);
        }

        case "DISCONNECT_CONNECTION": {
            const result = disconnectBoardConnection(
                state.present.board,
                action.connectionId,
            );

            return applyBoardRuleResult(state, result);
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

            return {
                ...state,
                present: {
                    ...state.present,
                    findings: result.value,
                },
                lastIssue: null,
            };
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

            return {
                ...state,
                present: {
                    ...state.present,
                    findings: result.value,
                },
                lastIssue: null,
            };
        }

        case "REMOVE_FILED_FINDING": {
            const result = removeFiledFinding(
                state.present.findings,
                action.filedFindingId,
            );

            if (!result.ok) {
                return withIssue(state, result.issue);
            }

            return {
                ...state,
                present: {
                    ...state.present,
                    findings: result.value,
                },
                lastIssue: null,
            };
        }

        case "SELECT_VERDICT":
            return {
                ...state,
                present: {
                    ...state.present,
                    verdict: {
                        selectedVerdict: action.verdict,
                    },
                },
                lastIssue: null,
            };

        case "UNDO_LAST_ACTION": {
            const result = undoLastBoardAction(state);

            if (!result.ok) {
                return withIssue(state, result.issue);
            }

            return result.value;
        }

        case "REDO_LAST_ACTION": {
            const result = redoLastBoardAction(state);

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
                    future: [],
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
