import { isKnownEvidenceId } from "../evidence/evidence-rules";
import { ruleFail, ruleOk, type RuleResult } from "../shared/rule-result";
import type {
    BoardConnection,
    BoardPosition,
    BoardState,
    EvidenceThreadColorId,
    PinnedEvidence,
} from "./board-state";

/**
 * Temporary visible spawn area before real Pan/Viewport exists.
 *
 * This keeps cards in a readable cluster instead of spreading them too far
 * across the whole board.
 */
const visibleSpawnBounds = {
    minXPercent: 23,
    maxXPercent: 77,
    minYPercent: 29,
    maxYPercent: 69,
};

/**
 * Minimum spacing between card centers in board percentage units.
 *
 * Moderate spacing: enough to avoid overlap, but not so much that cards become
 * scattered and hard to scan quickly.
 */
const minimumSpawnSpacing = {
    xPercent: 23,
    yPercent: 24,
};

const randomSpawnCandidateCount = 24;

/**
 * Sensible fallback positions with vertical variety.
 */
const fallbackSpawnCandidatePositions: BoardPosition[] = [
    { xPercent: 30, yPercent: 34 },
    { xPercent: 52, yPercent: 31 },
    { xPercent: 72, yPercent: 37 },

    { xPercent: 26, yPercent: 52 },
    { xPercent: 50, yPercent: 50 },
    { xPercent: 72, yPercent: 55 },

    { xPercent: 35, yPercent: 66 },
    { xPercent: 58, yPercent: 65 },

    { xPercent: 40, yPercent: 40 },
    { xPercent: 63, yPercent: 43 },
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
 * Creates a simple deterministic hash from a string.
 */
function hashString(value: string): number {
    let hash = 2166136261;

    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
}

/**
 * Creates a deterministic pseudo-random number generator.
 *
 * Reducer rules should avoid Math.random so state transitions remain easier to
 * debug and reproduce.
 */
function createSeededRandom(seedValue: string): () => number {
    let seed = hashString(seedValue);

    return () => {
        seed += 0x6d2b79f5;

        let value = seed;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
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
 * Checks whether two candidate card centers are too close for comfortable use.
 */
function isPositionTooClose(
    leftPosition: BoardPosition,
    rightPosition: BoardPosition,
): boolean {
    return (
        Math.abs(leftPosition.xPercent - rightPosition.xPercent) <
            minimumSpawnSpacing.xPercent &&
        Math.abs(leftPosition.yPercent - rightPosition.yPercent) <
            minimumSpawnSpacing.yPercent
    );
}

/**
 * Scores a candidate by its closest distance to existing pinned cards.
 *
 * Higher is better.
 */
function scoreCandidatePosition(
    candidatePosition: BoardPosition,
    existingPositions: readonly BoardPosition[],
): number {
    if (existingPositions.length === 0) {
        return Number.POSITIVE_INFINITY;
    }

    return Math.min(
        ...existingPositions.map((existingPosition) => {
            const deltaX =
                candidatePosition.xPercent - existingPosition.xPercent;
            const deltaY =
                candidatePosition.yPercent - existingPosition.yPercent;

            return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        }),
    );
}

/**
 * Creates seeded spawn candidates inside the visible board area.
 *
 * Repinning uses pinnedAt in the seed, so the same evidence can land somewhere
 * slightly different after being unpinned and pinned again.
 */
function createSpawnCandidatePositions(seedValue: string): BoardPosition[] {
    const random = createSeededRandom(seedValue);
    const randomCandidates: BoardPosition[] = [];

    for (let index = 0; index < randomSpawnCandidateCount; index += 1) {
        const xRange =
            visibleSpawnBounds.maxXPercent - visibleSpawnBounds.minXPercent;
        const yRange =
            visibleSpawnBounds.maxYPercent - visibleSpawnBounds.minYPercent;

        randomCandidates.push({
            xPercent: visibleSpawnBounds.minXPercent + random() * xRange,
            yPercent: visibleSpawnBounds.minYPercent + random() * yRange,
        });
    }

    return [...randomCandidates, ...fallbackSpawnCandidatePositions];
}

/**
 * Picks a readable spawn position for newly pinned evidence.
 */
function getDefaultPinnedPosition(
    state: BoardState,
    evidenceId: string,
    pinnedAt: string,
): BoardPosition {
    const existingPositions = state.pinnedEvidence.map(
        (pinnedEvidence) => pinnedEvidence.position,
    );

    const candidates = createSpawnCandidatePositions(
        `${evidenceId}:${pinnedAt}:${state.pinnedEvidence.length}`,
    );

    const comfortableCandidates = candidates.filter((candidatePosition) =>
        existingPositions.every(
            (existingPosition) =>
                !isPositionTooClose(candidatePosition, existingPosition),
        ),
    );

    const candidatesToScore =
        comfortableCandidates.length > 0 ? comfortableCandidates : candidates;

    return candidatesToScore.reduce((bestPosition, candidatePosition) => {
        const bestScore = scoreCandidatePosition(
            bestPosition,
            existingPositions,
        );
        const candidateScore = scoreCandidatePosition(
            candidatePosition,
            existingPositions,
        );

        return candidateScore > bestScore ? candidatePosition : bestPosition;
    }, candidatesToScore[0]);
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
 * Creates a stable segment ID for one thread color and two pinned evidence IDs.
 *
 * Direction-insensitive: A -> B and B -> A are the same segment for the same
 * thread color.
 */
function createConnectionId(
    threadId: EvidenceThreadColorId,
    fromPinnedEvidenceId: string,
    toPinnedEvidenceId: string,
): string {
    const [left, right] = [fromPinnedEvidenceId, toPinnedEvidenceId].sort();

    return `thread-${threadId}-${toIdFragment(left)}-${toIdFragment(right)}`;
}

/**
 * Pins evidence to the board.
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
        position: getDefaultPinnedPosition(state, evidenceId, pinnedAt),
        pinnedAt,
    };

    return ruleOk({
        ...state,
        pinnedEvidence: [...state.pinnedEvidence, pinnedEvidence],
        selectedPinnedEvidenceId: pinnedEvidence.pinnedEvidenceId,
    });
}

/**
 * Removes a pinned evidence item and every thread segment touching it.
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
 * Creates one colored Evidence Thread segment between two pinned evidence cards.
 */
export function connectPinnedEvidence(
    state: BoardState,
    threadId: EvidenceThreadColorId,
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
        threadId,
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
            "Those pinned evidence items are already connected with that thread color.",
        );
    }

    const connection: BoardConnection = {
        connectionId,
        threadId,
        fromPinnedEvidenceId,
        toPinnedEvidenceId,
        createdAt,
    };

    return ruleOk({
        ...state,
        connections: [...state.connections, connection],
        selectedPinnedEvidenceId: toPinnedEvidenceId,
    });
}

/**
 * Removes one Evidence Thread segment.
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
