/**
 * Board position stored as percentages so pinned evidence can survive board
 * resizing when side panels fold or the browser size changes.
 */
export interface BoardPosition {
    xPercent: number;
    yPercent: number;
}

/**
 * Percentage bounds describing a preferred board-world spawn area.
 *
 * This is usually calculated by the UI from the currently visible board
 * viewport. The reducer still owns the final spawn decision because it also
 * needs to account for existing pinned card positions.
 */
export interface BoardSpawnBounds {
    minXPercent: number;
    maxXPercent: number;
    minYPercent: number;
    maxYPercent: number;
}

/**
 * Percentage bounds describing a preferred board-world spawn area.
 *
 * This is usually calculated by the UI from the currently visible board
 * viewport. The reducer still owns the final spawn decision because it also
 * needs to account for existing pinned card positions.
 */
export interface BoardSpawnBounds {
    minXPercent: number;
    maxXPercent: number;
    minYPercent: number;
    maxYPercent: number;
}

/**
 * Fixed Evidence Thread color channels for the MVP.
 *
 * These are intentionally limited. The player uses color as the grouping tool
 * instead of creating custom thread names or managing a separate thread list.
 */
export type EvidenceThreadColorId =
    | "red"
    | "blue"
    | "green"
    | "amber"
    | "violet";

/**
 * One pinned evidence card on the investigation board.
 *
 * Thread segments reference pinnedEvidenceId instead of evidenceId so future
 * builds can support copied cards or multiple board instances if needed.
 */
export interface PinnedEvidence {
    pinnedEvidenceId: string;
    evidenceId: string;
    position: BoardPosition;
    pinnedAt: string;
}

/**
 * One colored Evidence Thread segment between two pinned evidence cards.
 *
 * Segments are stored individually so Scissors mode can cut one line without
 * unpinning cards or destroying the rest of a chain.
 */
export interface BoardConnection {
    connectionId: string;
    threadId: EvidenceThreadColorId;
    fromPinnedEvidenceId: string;
    toPinnedEvidenceId: string;
    createdAt: string;
}

/**
 * Runtime board state for a ticket attempt.
 */
export interface BoardState {
    pinnedEvidence: PinnedEvidence[];
    connections: BoardConnection[];
    selectedPinnedEvidenceId: string | null;
}

/**
 * Creates an empty board state.
 */
export function createInitialBoardState(): BoardState {
    return {
        pinnedEvidence: [],
        connections: [],
        selectedPinnedEvidenceId: null,
    };
}
