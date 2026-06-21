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
import type { ConnectInteractionState } from "../connect/connect-state";

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
 * Clears only the temporary Connect anchor while preserving color/mode choices.
 */
function clearConnectAnchor(
    connectInteraction: ConnectInteractionState,
): ConnectInteractionState {
    return {
        ...connectInteraction,
        pendingAnchorPinnedEvidenceId: null,
    };
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
                    connectInteraction:
                        action.toolId === "connect"
                            ? state.present.connectInteraction
                            : clearConnectAnchor(
                                  state.present.connectInteraction,
                              ),
                },
                lastIssue: null,
            };

        case "CLEAR_ACTIVE_TOOL":
            return {
                ...state,
                present: {
                    ...state.present,
                    activeTool: "select",
                    connectInteraction: clearConnectAnchor(
                        state.present.connectInteraction,
                    ),
                },
                lastIssue: null,
            };

        case "SET_CONNECT_THREAD_ID":
            return {
                ...state,
                present: {
                    ...state.present,
                    connectInteraction: {
                        ...state.present.connectInteraction,
                        activeThreadId: action.threadId,
                        pendingAnchorPinnedEvidenceId: null,
                    },
                },
                lastIssue: null,
            };

        case "SET_CONNECT_MODE":
            return {
                ...state,
                present: {
                    ...state.present,
                    connectInteraction: {
                        ...state.present.connectInteraction,
                        activeMode: action.mode,
                        pendingAnchorPinnedEvidenceId: null,
                    },
                },
                lastIssue: null,
            };

        case "CLEAR_CONNECT_ANCHOR":
            return {
                ...state,
                present: {
                    ...state.present,
                    connectInteraction: clearConnectAnchor(
                        state.present.connectInteraction,
                    ),
                },
                lastIssue: null,
            };

        case "USE_CONNECT_STRING_ON_PINNED_EVIDENCE": {
            if (state.present.activeTool !== "connect") {
                return state;
            }

            if (state.present.connectInteraction.activeMode !== "string") {
                return state;
            }

            const pendingAnchorPinnedEvidenceId =
                state.present.connectInteraction.pendingAnchorPinnedEvidenceId;

            if (!pendingAnchorPinnedEvidenceId) {
                const selectResult = selectPinnedEvidence(
                    state.present.board,
                    action.pinnedEvidenceId,
                );

                if (!selectResult.ok) {
                    return withIssue(state, selectResult.issue);
                }

                return {
                    ...state,
                    present: {
                        ...state.present,
                        board: selectResult.value,
                        connectInteraction: {
                            ...state.present.connectInteraction,
                            pendingAnchorPinnedEvidenceId:
                                action.pinnedEvidenceId,
                        },
                    },
                    lastIssue: null,
                };
            }

            const connectResult = connectPinnedEvidence(
                state.present.board,
                state.present.connectInteraction.activeThreadId,
                pendingAnchorPinnedEvidenceId,
                action.pinnedEvidenceId,
                action.nowIso,
            );

            if (!connectResult.ok) {
                return withIssue(state, connectResult.issue);
            }

            const committedState = commitBoardChange(
                state,
                connectResult.value,
            );

            return {
                ...committedState,
                present: {
                    ...committedState.present,
                    connectInteraction: {
                        ...committedState.present.connectInteraction,
                        pendingAnchorPinnedEvidenceId: action.pinnedEvidenceId,
                    },
                },
                lastIssue: null,
            };
        }

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

            const updatedState = applyBoardRuleResult(state, result);

            return {
                ...updatedState,
                present: {
                    ...updatedState.present,
                    connectInteraction:
                        state.present.connectInteraction
                            .pendingAnchorPinnedEvidenceId ===
                        action.pinnedEvidenceId
                            ? clearConnectAnchor(
                                  updatedState.present.connectInteraction,
                              )
                            : updatedState.present.connectInteraction,
                },
            };
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
                action.threadId,
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
