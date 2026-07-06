import type { BoardState } from "../board/board-state";
import type { EvidenceInteractionState } from "../evidence/evidence-state";
import type { FindingState } from "../findings/finding-state";
import type { GameplayRuleIssue } from "../shared/rule-result";
import type { InvestigationToolId } from "../tools/tool-types";
import type { VerdictState } from "../verdict/verdict-state";
import type { ConnectInteractionState } from "../connect/connect-state";

/**
 * Stable context for one ticket attempt.
 *
 * This does not change during normal gameplay. It is separated from present
 * state so undo history only needs to store the gameplay snapshot.
 */
export interface AttemptContext {
    schemaVersion: 1;
    attemptId: string;
    shiftId: string;
    ticketId: string;
    evidenceIds: string[];
    startedAt: string;
}

/**
 * Current gameplay snapshot.
 *
 * Undo history stores previous versions of this object.
 */
export interface AttemptPresentState {
    activeTool: InvestigationToolId;
    connectInteraction: ConnectInteractionState;
    evidence: EvidenceInteractionState;
    board: BoardState;
    findings: FindingState;
    verdict: VerdictState;
}

/**
 * Board-only undo/redo history for a ticket attempt.
 *
 * Undo and redo intentionally affect the investigation board only. Reset is the
 * full workspace cleanup action and clears evidence inspection, board state,
 * findings, verdict state, and all history.
 */
export interface AttemptHistoryState {
    past: BoardState[];
    future: BoardState[];
    limit: number;
}

/**
 * Full runtime attempt state.
 */
export interface TicketAttemptState {
    context: AttemptContext;
    present: AttemptPresentState;
    history: AttemptHistoryState;
    lastIssue: GameplayRuleIssue | null;
}
