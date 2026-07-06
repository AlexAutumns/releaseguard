import { ruleFail, ruleOk, type RuleResult } from "../shared/rule-result";
import type { TicketAttemptState } from "./attempt-state";

/**
 * Adds the current board state to board undo history.
 *
 * Any new board action clears redo history because the player has branched away
 * from the previously undone board state.
 */
export function recordBoardUndoSnapshot(
    state: TicketAttemptState,
): TicketAttemptState {
    const nextPast = [...state.history.past, state.present.board].slice(
        -state.history.limit,
    );

    return {
        ...state,
        history: {
            ...state.history,
            past: nextPast,
            future: [],
        },
    };
}

/**
 * Restores the most recent board snapshot.
 *
 * Only the board is restored. Evidence inspection, finding drafts, filed
 * findings, verdict selection, and active tool state are left alone.
 */
export function undoLastBoardAction(
    state: TicketAttemptState,
): RuleResult<TicketAttemptState> {
    const previousBoard = state.history.past.at(-1);

    if (!previousBoard) {
        return ruleFail(
            "UNDO_EMPTY",
            "There is no previous board action to undo.",
            "info",
        );
    }

    return ruleOk({
        ...state,
        present: {
            ...state.present,
            board: previousBoard,
        },
        history: {
            ...state.history,
            past: state.history.past.slice(0, -1),
            future: [state.present.board, ...state.history.future].slice(
                0,
                state.history.limit,
            ),
        },
        lastIssue: null,
    });
}

/**
 * Restores the most recently undone board snapshot.
 */
export function redoLastBoardAction(
    state: TicketAttemptState,
): RuleResult<TicketAttemptState> {
    const nextBoard = state.history.future[0];

    if (!nextBoard) {
        return ruleFail(
            "REDO_EMPTY",
            "There is no undone board action to redo.",
            "info",
        );
    }

    return ruleOk({
        ...state,
        present: {
            ...state.present,
            board: nextBoard,
        },
        history: {
            ...state.history,
            past: [...state.history.past, state.present.board].slice(
                -state.history.limit,
            ),
            future: state.history.future.slice(1),
        },
        lastIssue: null,
    });
}
