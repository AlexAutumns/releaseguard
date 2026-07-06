import { createInitialBoardState } from "../board/board-state";
import { createInitialEvidenceInteractionState } from "../evidence/evidence-state";
import { createInitialFindingState } from "../findings/finding-state";
import { createInitialVerdictState } from "../verdict/verdict-state";
import type { AttemptPresentState, TicketAttemptState } from "./attempt-state";
import { createInitialConnectInteractionState } from "../connect/connect-state";

const DEFAULT_HISTORY_LIMIT = 20;

/**
 * Input for creating a new ticket attempt state.
 */
export interface CreateTicketAttemptStateInput {
    shiftId: string;
    ticketId: string;
    evidenceIds: string[];
    attemptId?: string;
    startedAt?: string;
}

/**
 * Creates a stable attempt ID when one is not provided.
 */
function createAttemptId(ticketId: string, startedAt: string): string {
    const safeTicketId = ticketId.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
    const safeTimestamp = startedAt.replace(/[^0-9a-zA-Z]/g, "");

    return `attempt-${safeTicketId}-${safeTimestamp}`;
}

/**
 * Creates the initial present gameplay state.
 */
export function createInitialAttemptPresentState(): AttemptPresentState {
    return {
        activeTool: "select",
        connectInteraction: createInitialConnectInteractionState(),
        evidence: createInitialEvidenceInteractionState(),
        board: createInitialBoardState(),
        findings: createInitialFindingState(),
        verdict: createInitialVerdictState(),
    };
}

/**
 * Creates the full starting attempt state for one ticket.
 *
 * This function is the only place that should assemble a fresh attempt from
 * shift/ticket context.
 */
export function createTicketAttemptState({
    shiftId,
    ticketId,
    evidenceIds,
    attemptId,
    startedAt,
}: CreateTicketAttemptStateInput): TicketAttemptState {
    const actualStartedAt = startedAt ?? new Date().toISOString();

    return {
        context: {
            schemaVersion: 1,
            attemptId: attemptId ?? createAttemptId(ticketId, actualStartedAt),
            shiftId,
            ticketId,
            evidenceIds,
            startedAt: actualStartedAt,
        },
        present: createInitialAttemptPresentState(),
        history: {
            past: [],
            future: [],
            limit: DEFAULT_HISTORY_LIMIT,
        },
        lastIssue: null,
    };
}
