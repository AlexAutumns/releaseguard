import { ruleFail, ruleOk, type RuleResult } from "../shared/rule-result";
import type { TicketAttemptState } from "./attempt-state";

/**
 * Adds the current present state to undo history.
 */
export function recordUndoSnapshot(
    state: TicketAttemptState,
): TicketAttemptState {
    const nextPast = [...state.history.past, state.present].slice(
        -state.history.limit,
    );

    return {
        ...state,
        history: {
            ...state.history,
            past: nextPast,
        },
    };
}

/**
 * Restores the most recent undo snapshot.
 */
export function undoLastAttemptAction(
    state: TicketAttemptState,
): RuleResult<TicketAttemptState> {
    const previousPresent = state.history.past.at(-1);

    if (!previousPresent) {
        return ruleFail(
            "UNDO_EMPTY",
            "There is no previous gameplay action to undo.",
            "info",
        );
    }

    return ruleOk({
        ...state,
        present: previousPresent,
        history: {
            ...state.history,
            past: state.history.past.slice(0, -1),
        },
        lastIssue: null,
    });
}
