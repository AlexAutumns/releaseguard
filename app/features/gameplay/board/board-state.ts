/**
 * Board position stored as percentages so pinned evidence can survive board
 * resizing when side panels fold or the browser size changes.
 */
export interface BoardPosition {
    xPercent: number;
    yPercent: number;
}

/**
 * One pinned evidence card on the investigation board.
 *
 * Connections reference pinnedEvidenceId instead of evidenceId so future
 * versions can support multiple pins or copied evidence cards if needed.
 */
export interface PinnedEvidence {
    pinnedEvidenceId: string;
    evidenceId: string;
    position: BoardPosition;
    pinnedAt: string;
}

/**
 * One connection between two pinned evidence cards.
 */
export interface BoardConnection {
    connectionId: string;
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
