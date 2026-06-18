import { isKnownEvidenceId } from "../evidence/evidence-rules";
import { ruleFail, ruleOk, type RuleResult } from "../shared/rule-result";
import type {
    BoardConnection,
    BoardPosition,
    BoardState,
    PinnedEvidence,
} from "./board-state";

const defaultBoardPositions: BoardPosition[] = [
    { xPercent: 20, yPercent: 24 },
    { xPercent: 50, yPercent: 22 },
    { xPercent: 76, yPercent: 28 },
    { xPercent: 28, yPercent: 56 },
    { xPercent: 58, yPercent: 58 },
    { xPercent: 82, yPercent: 64 },
];

/**
 * Clamps a board percentage coordinate to the visible board area.
 */
function clampPercent(value: number): number {
    return Math.min(96, Math.max(4, value));
}

/**
 * Creates a safe ID fragment from authored content IDs.
 */
function toIdFragment(value: string): string {
    return value.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
}

/**
 * Creates a unique pinned evidence ID for the current board.
 */
function createPinnedEvidenceId(state: BoardState, evidenceId: string): string {
    const existingIds = new Set(
        state.pinnedEvidence.map(
            (pinnedEvidence) => pinnedEvidence.pinnedEvidenceId,
        ),
    );
    const baseId = `pin-${toIdFragment(evidenceId)}`;

    let index = 1;
    let candidateId = `${baseId}-${index}`;

    while (existingIds.has(candidateId)) {
        index += 1;
        candidateId = `${baseId}-${index}`;
    }

    return candidateId;
}

/**
 * Picks a default position for a newly pinned evidence card.
 */
function getDefaultPinnedPosition(state: BoardState): BoardPosition {
    return defaultBoardPositions[
        state.pinnedEvidence.length % defaultBoardPositions.length
    ];
}

/**
 * Finds a pinned evidence item by ID.
 */
function findPinnedEvidence(
    state: BoardState,
    pinnedEvidenceId: string,
): PinnedEvidence | undefined {
    return state.pinnedEvidence.find(
        (pinnedEvidence) =>
            pinnedEvidence.pinnedEvidenceId === pinnedEvidenceId,
    );
}

/**
 * Creates a stable connection ID for two pinned evidence IDs.
 */
function createConnectionId(
    fromPinnedEvidenceId: string,
    toPinnedEvidenceId: string,
): string {
    const [left, right] = [fromPinnedEvidenceId, toPinnedEvidenceId].sort();

    return `connection-${toIdFragment(left)}-${toIdFragment(right)}`;
}

/**
 * Pins evidence to the board.
 *
 * MVP rule: each evidence file can only be pinned once. This can be relaxed
 * later because board connections already reference pinned item IDs.
 */
export function pinEvidenceToBoard(
    state: BoardState,
    evidenceId: string,
    validEvidenceIds: readonly string[],
    pinnedAt: string,
): RuleResult<BoardState> {
    if (!isKnownEvidenceId(validEvidenceIds, evidenceId)) {
        return ruleFail(
            "UNKNOWN_EVIDENCE",
            "That evidence file does not exist in the active ticket.",
            "error",
        );
    }

    if (
        state.pinnedEvidence.some(
            (pinnedEvidence) => pinnedEvidence.evidenceId === evidenceId,
        )
    ) {
        return ruleFail(
            "EVIDENCE_ALREADY_PINNED",
            "That evidence file is already pinned to the board.",
        );
    }

    const pinnedEvidence: PinnedEvidence = {
        pinnedEvidenceId: createPinnedEvidenceId(state, evidenceId),
        evidenceId,
        position: getDefaultPinnedPosition(state),
        pinnedAt,
    };

    return ruleOk({
        ...state,
        pinnedEvidence: [...state.pinnedEvidence, pinnedEvidence],
        selectedPinnedEvidenceId: pinnedEvidence.pinnedEvidenceId,
    });
}

/**
 * Removes a pinned evidence item and any connections that reference it.
 */
export function unpinEvidenceFromBoard(
    state: BoardState,
    pinnedEvidenceId: string,
): RuleResult<BoardState> {
    if (!findPinnedEvidence(state, pinnedEvidenceId)) {
        return ruleFail(
            "UNKNOWN_PINNED_EVIDENCE",
            "That pinned evidence item does not exist on the board.",
            "error",
        );
    }

    return ruleOk({
        ...state,
        pinnedEvidence: state.pinnedEvidence.filter(
            (pinnedEvidence) =>
                pinnedEvidence.pinnedEvidenceId !== pinnedEvidenceId,
        ),
        connections: state.connections.filter(
            (connection) =>
                connection.fromPinnedEvidenceId !== pinnedEvidenceId &&
                connection.toPinnedEvidenceId !== pinnedEvidenceId,
        ),
        selectedPinnedEvidenceId:
            state.selectedPinnedEvidenceId === pinnedEvidenceId
                ? null
                : state.selectedPinnedEvidenceId,
    });
}

/**
 * Moves a pinned evidence item to a new board position.
 */
export function movePinnedEvidence(
    state: BoardState,
    pinnedEvidenceId: string,
    position: BoardPosition,
): RuleResult<BoardState> {
    if (!findPinnedEvidence(state, pinnedEvidenceId)) {
        return ruleFail(
            "UNKNOWN_PINNED_EVIDENCE",
            "That pinned evidence item does not exist on the board.",
            "error",
        );
    }

    return ruleOk({
        ...state,
        pinnedEvidence: state.pinnedEvidence.map((pinnedEvidence) =>
            pinnedEvidence.pinnedEvidenceId === pinnedEvidenceId
                ? {
                      ...pinnedEvidence,
                      position: {
                          xPercent: clampPercent(position.xPercent),
                          yPercent: clampPercent(position.yPercent),
                      },
                  }
                : pinnedEvidence,
        ),
    });
}

/**
 * Selects or clears a pinned evidence item on the board.
 */
export function selectPinnedEvidence(
    state: BoardState,
    pinnedEvidenceId: string | null,
): RuleResult<BoardState> {
    if (pinnedEvidenceId && !findPinnedEvidence(state, pinnedEvidenceId)) {
        return ruleFail(
            "UNKNOWN_PINNED_EVIDENCE",
            "That pinned evidence item does not exist on the board.",
            "error",
        );
    }

    return ruleOk({
        ...state,
        selectedPinnedEvidenceId: pinnedEvidenceId,
    });
}

/**
 * Connects two pinned evidence items.
 */
export function connectPinnedEvidence(
    state: BoardState,
    fromPinnedEvidenceId: string,
    toPinnedEvidenceId: string,
    createdAt: string,
): RuleResult<BoardState> {
    if (fromPinnedEvidenceId === toPinnedEvidenceId) {
        return ruleFail(
            "SELF_CONNECTION",
            "A pinned evidence item cannot be connected to itself.",
        );
    }

    if (!findPinnedEvidence(state, fromPinnedEvidenceId)) {
        return ruleFail(
            "UNKNOWN_PINNED_EVIDENCE",
            "The first pinned evidence item does not exist on the board.",
            "error",
        );
    }

    if (!findPinnedEvidence(state, toPinnedEvidenceId)) {
        return ruleFail(
            "UNKNOWN_PINNED_EVIDENCE",
            "The second pinned evidence item does not exist on the board.",
            "error",
        );
    }

    const connectionId = createConnectionId(
        fromPinnedEvidenceId,
        toPinnedEvidenceId,
    );

    if (
        state.connections.some(
            (connection) => connection.connectionId === connectionId,
        )
    ) {
        return ruleFail(
            "DUPLICATE_CONNECTION",
            "Those pinned evidence items are already connected.",
        );
    }

    const connection: BoardConnection = {
        connectionId,
        fromPinnedEvidenceId,
        toPinnedEvidenceId,
        createdAt,
    };

    return ruleOk({
        ...state,
        connections: [...state.connections, connection],
    });
}

/**
 * Removes a board connection.
 */
export function disconnectBoardConnection(
    state: BoardState,
    connectionId: string,
): RuleResult<BoardState> {
    if (
        !state.connections.some(
            (connection) => connection.connectionId === connectionId,
        )
    ) {
        return ruleFail(
            "UNKNOWN_CONNECTION",
            "That board connection does not exist.",
            "error",
        );
    }

    return ruleOk({
        ...state,
        connections: state.connections.filter(
            (connection) => connection.connectionId !== connectionId,
        ),
    });
}
