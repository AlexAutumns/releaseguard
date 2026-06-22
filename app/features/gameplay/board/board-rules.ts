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
 * The bounds are intentionally a little conservative because the pinned cards
 * are large. Keeping spawn candidates away from the board edges reduces cases
 * where a card appears clipped, crowded, or hard to interact with.
 */
const visibleSpawnBounds = {
    minXPercent: 23,
    maxXPercent: 77,
    minYPercent: 28,
    maxYPercent: 71,
};

/**
 * Approximate pinned card footprint in board percentage units.
 *
 * The board stores card positions as center points, but the visual cards are
 * rectangles. This footprint is used to reject spawn positions that would cause
 * destructive overlap with an existing pinned card.
 */
const pinnedCardFootprint = {
    widthPercent: 24,
    heightPercent: 35,
};

/**
 * Candidate count for secondary seeded positions.
 *
 * Preferred slots are tried first, then seeded candidates provide variation if
 * the board already has unusual card placement.
 */
const randomSpawnCandidateCount = 36;

/**
 * Preferred spawn slots for the current desktop-first board.
 *
 * These slots form a loose readable grid for the first several pinned cards.
 * They are not a final Arrange/Pan replacement; they are a safety net so basic
 * board play does not become destructive before Arrange exists.
 */
const preferredSpawnCandidatePositions: BoardPosition[] = [
    { xPercent: 29, yPercent: 32 },
    { xPercent: 54, yPercent: 31 },
    { xPercent: 76, yPercent: 34 },

    { xPercent: 28, yPercent: 69 },
    { xPercent: 53, yPercent: 70 },
    { xPercent: 76, yPercent: 67 },

    { xPercent: 41, yPercent: 50 },
    { xPercent: 65, yPercent: 51 },
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
 * Checks whether two card rectangles would destructively overlap.
 *
 * Board positions are card centers. This function treats each card as an
 * approximate rectangle and rejects positions where both horizontal and vertical
 * overlap are significant.
 */
function hasDestructiveCardOverlap(
    leftPosition: BoardPosition,
    rightPosition: BoardPosition,
): boolean {
    const deltaX = Math.abs(leftPosition.xPercent - rightPosition.xPercent);
    const deltaY = Math.abs(leftPosition.yPercent - rightPosition.yPercent);

    return (
        deltaX < pinnedCardFootprint.widthPercent &&
        deltaY < pinnedCardFootprint.heightPercent
    );
}

/**
 * Returns an approximate overlap penalty between two card footprints.
 *
 * Zero means the candidate does not overlap the existing card footprint.
 * Higher values mean more destructive overlap.
 */
function getCardOverlapPenalty(
    leftPosition: BoardPosition,
    rightPosition: BoardPosition,
): number {
    const deltaX = Math.abs(leftPosition.xPercent - rightPosition.xPercent);
    const deltaY = Math.abs(leftPosition.yPercent - rightPosition.yPercent);

    const overlapX = Math.max(0, pinnedCardFootprint.widthPercent - deltaX);
    const overlapY = Math.max(0, pinnedCardFootprint.heightPercent - deltaY);

    return overlapX * overlapY;
}

/**
 * Scores a candidate by overlap safety first, then distance from existing cards.
 *
 * Higher is better. Non-overlapping candidates are strongly preferred. If every
 * available candidate overlaps, the reducer still chooses the least destructive
 * option instead of falling back to a random-looking collision.
 */
function scoreCandidatePosition(
    candidatePosition: BoardPosition,
    existingPositions: readonly BoardPosition[],
): number {
    if (existingPositions.length === 0) {
        return 0;
    }

    const overlapPenalty = existingPositions.reduce(
        (totalPenalty, existingPosition) =>
            totalPenalty +
            getCardOverlapPenalty(candidatePosition, existingPosition),
        0,
    );

    const closestDistance = Math.min(
        ...existingPositions.map((existingPosition) => {
            const deltaX =
                candidatePosition.xPercent - existingPosition.xPercent;
            const deltaY =
                candidatePosition.yPercent - existingPosition.yPercent;

            return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        }),
    );

    const centerDeltaX = candidatePosition.xPercent - 50;
    const centerDeltaY = candidatePosition.yPercent - 50;
    const distanceFromBoardCenter = Math.sqrt(
        centerDeltaX * centerDeltaX + centerDeltaY * centerDeltaY,
    );

    if (overlapPenalty > 0) {
        return -10_000 - overlapPenalty * 100 + closestDistance;
    }

    return closestDistance - distanceFromBoardCenter * 0.04;
}

/**
 * Creates seeded spawn candidates inside the visible board area.
 *
 * Preferred slots come first so early board layouts are readable and stable.
 * Seeded candidates are still included as backups for unusual board states.
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

    return [...preferredSpawnCandidatePositions, ...randomCandidates];
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

    const nonOverlappingCandidates = candidates.filter((candidatePosition) =>
        existingPositions.every(
            (existingPosition) =>
                !hasDestructiveCardOverlap(candidatePosition, existingPosition),
        ),
    );

    const candidatesToScore =
        nonOverlappingCandidates.length > 0
            ? nonOverlappingCandidates
            : candidates;

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
