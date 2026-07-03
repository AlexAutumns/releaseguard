import { isKnownEvidenceId } from "../evidence/evidence-rules";
import { ruleFail, ruleOk, type RuleResult } from "../shared/rule-result";
import type {
    BoardConnection,
    BoardPosition,
    BoardSpawnBounds,
    BoardState,
    EvidenceThreadColorId,
    PinnedEvidence,
} from "./board-state";

/**
 * Fallback spawn bounds for the initial visible viewport.
 *
 * These are used when the UI cannot provide current viewport bounds, such as
 * before board refs are available.
 */
const initialViewportSpawnBounds: BoardSpawnBounds = {
    minXPercent: 14,
    maxXPercent: 58,
    minYPercent: 18,
    maxYPercent: 56,
};

/**
 * Backup spawn bounds across the larger pannable board world.
 *
 * These should only be used when the preferred visible area is crowded.
 */
const expandedBoardSpawnBounds: BoardSpawnBounds = {
    minXPercent: 8,
    maxXPercent: 92,
    minYPercent: 10,
    maxYPercent: 88,
};

/**
 * Approximate pinned card footprint in board percentage units.
 *
 * The board stores card positions as centre points, but the visual cards are
 * rectangles. This footprint is used to reject spawn positions that would cause
 * destructive overlap with an existing pinned card.
 */
const pinnedCardFootprint = {
    widthPercent: 24,
    heightPercent: 35,
};

/**
 * Candidate count for secondary seeded positions.
 */
const randomSpawnCandidateCount = 36;

/**
 * Minimum centre-to-centre offset allowed when arranging cards.
 *
 * This does not prevent all overlap. It only prevents near-perfect stacking,
 * which can hide the older card's pin/title area and make accidental unpinning
 * more likely.
 */
const minimumReadableCardOffsetPercent = 9;

/**
 * Number of small passes used to nudge a moved card away from near-perfect
 * overlap with existing pinned cards.
 */
const readableOverlapResolutionPasses = 3;

/**
 * Clamps a board percentage coordinate to the board area.
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
 * Keeps spawn bounds valid and safely inside the board-world coordinate range.
 */
function normalizeSpawnBounds(bounds: BoardSpawnBounds): BoardSpawnBounds {
    const minXPercent = clampPercent(
        Math.min(bounds.minXPercent, bounds.maxXPercent),
    );
    const maxXPercent = clampPercent(
        Math.max(bounds.minXPercent, bounds.maxXPercent),
    );
    const minYPercent = clampPercent(
        Math.min(bounds.minYPercent, bounds.maxYPercent),
    );
    const maxYPercent = clampPercent(
        Math.max(bounds.minYPercent, bounds.maxYPercent),
    );

    return {
        minXPercent,
        maxXPercent,
        minYPercent,
        maxYPercent,
    };
}

/**
 * Creates anchor-like candidate points within a spawn bounds area.
 *
 * These candidates keep early card placement readable by trying corners and
 * centre points before seeded random positions.
 */
function createPreferredCandidatesForBounds(
    bounds: BoardSpawnBounds,
): BoardPosition[] {
    const normalizedBounds = normalizeSpawnBounds(bounds);
    const centerX =
        (normalizedBounds.minXPercent + normalizedBounds.maxXPercent) / 2;
    const centerY =
        (normalizedBounds.minYPercent + normalizedBounds.maxYPercent) / 2;

    return [
        {
            xPercent: normalizedBounds.minXPercent,
            yPercent: normalizedBounds.minYPercent,
        },
        {
            xPercent: centerX,
            yPercent: normalizedBounds.minYPercent,
        },
        {
            xPercent: normalizedBounds.maxXPercent,
            yPercent: normalizedBounds.minYPercent,
        },

        {
            xPercent: normalizedBounds.minXPercent,
            yPercent: centerY,
        },
        {
            xPercent: centerX,
            yPercent: centerY,
        },
        {
            xPercent: normalizedBounds.maxXPercent,
            yPercent: centerY,
        },

        {
            xPercent: normalizedBounds.minXPercent,
            yPercent: normalizedBounds.maxYPercent,
        },
        {
            xPercent: centerX,
            yPercent: normalizedBounds.maxYPercent,
        },
        {
            xPercent: normalizedBounds.maxXPercent,
            yPercent: normalizedBounds.maxYPercent,
        },
    ];
}

/**
 * Creates deterministic random spawn candidates inside a bounds area.
 */
function createBoundedRandomSpawnCandidates(
    seedValue: string,
    bounds: BoardSpawnBounds,
): BoardPosition[] {
    const normalizedBounds = normalizeSpawnBounds(bounds);
    const random = createSeededRandom(seedValue);
    const randomCandidates: BoardPosition[] = [];

    for (let index = 0; index < randomSpawnCandidateCount; index += 1) {
        const xRange =
            normalizedBounds.maxXPercent - normalizedBounds.minXPercent;
        const yRange =
            normalizedBounds.maxYPercent - normalizedBounds.minYPercent;

        randomCandidates.push({
            xPercent: normalizedBounds.minXPercent + random() * xRange,
            yPercent: normalizedBounds.minYPercent + random() * yRange,
        });
    }

    return randomCandidates;
}

/**
 * Creates deterministic spawn candidates for one bounds area.
 */
function createCandidatesForBounds(
    seedValue: string,
    bounds: BoardSpawnBounds,
): BoardPosition[] {
    return [
        ...createPreferredCandidatesForBounds(bounds),
        ...createBoundedRandomSpawnCandidates(seedValue, bounds),
    ];
}

/**
 * Checks whether two card rectangles would destructively overlap.
 *
 * Board positions are card centres. This function treats each card as an
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

    if (overlapPenalty > 0) {
        return -10_000 - overlapPenalty * 100 + closestDistance;
    }

    return closestDistance;
}

/**
 * Picks the best position from a list of candidates.
 */
function pickBestSpawnCandidate(
    candidates: readonly BoardPosition[],
    existingPositions: readonly BoardPosition[],
): BoardPosition {
    return candidates.reduce((bestPosition, candidatePosition) => {
        const bestScore = scoreCandidatePosition(
            bestPosition,
            existingPositions,
        );
        const candidateScore = scoreCandidatePosition(
            candidatePosition,
            existingPositions,
        );

        return candidateScore > bestScore ? candidatePosition : bestPosition;
    }, candidates[0]);
}

/**
 * Returns only candidates that do not destructively overlap existing cards.
 */
function getNonOverlappingCandidates(
    candidates: readonly BoardPosition[],
    existingPositions: readonly BoardPosition[],
): BoardPosition[] {
    return candidates.filter((candidatePosition) =>
        existingPositions.every(
            (existingPosition) =>
                !hasDestructiveCardOverlap(candidatePosition, existingPosition),
        ),
    );
}

/**
 * Picks a readable spawn position for newly pinned evidence.
 *
 * Spawn priority:
 * 1. non-overlapping candidates in the currently visible board viewport;
 * 2. least-destructive candidate in the currently visible board viewport;
 * 3. non-overlapping candidates in the initial/default viewport;
 * 4. non-overlapping candidates in the expanded board world;
 * 5. least-destructive expanded-board candidate.
 *
 * The current viewport preference is intentionally strong. A player who pans to
 * another section of the board expects new pinned files to appear near where
 * they are working, not back at the original top-left board view.
 */
function getDefaultPinnedPosition(
    state: BoardState,
    evidenceId: string,
    pinnedAt: string,
    preferredSpawnBounds?: BoardSpawnBounds,
): BoardPosition {
    const existingPositions = state.pinnedEvidence.map(
        (pinnedEvidence) => pinnedEvidence.position,
    );

    const seedValue = `${evidenceId}:${pinnedAt}:${state.pinnedEvidence.length}`;

    const preferredViewportCandidates = preferredSpawnBounds
        ? createCandidatesForBounds(
              `${seedValue}:current-viewport`,
              preferredSpawnBounds,
          )
        : [];

    const initialViewportCandidates = createCandidatesForBounds(
        `${seedValue}:initial-viewport`,
        initialViewportSpawnBounds,
    );

    const expandedBoardCandidates = createCandidatesForBounds(
        `${seedValue}:expanded-board`,
        expandedBoardSpawnBounds,
    );

    const currentNonOverlappingCandidates = getNonOverlappingCandidates(
        preferredViewportCandidates,
        existingPositions,
    );

    if (currentNonOverlappingCandidates.length > 0) {
        return pickBestSpawnCandidate(
            currentNonOverlappingCandidates,
            existingPositions,
        );
    }

    /**
     * If the current viewport is somewhat crowded, still prefer a visible
     * position for the first several cards. This matches player expectation:
     * early pinned cards should appear where the player is looking.
     */
    if (
        preferredViewportCandidates.length > 0 &&
        state.pinnedEvidence.length < 6
    ) {
        return pickBestSpawnCandidate(
            preferredViewportCandidates,
            existingPositions,
        );
    }

    const initialNonOverlappingCandidates = getNonOverlappingCandidates(
        initialViewportCandidates,
        existingPositions,
    );

    if (!preferredSpawnBounds && initialNonOverlappingCandidates.length > 0) {
        return pickBestSpawnCandidate(
            initialNonOverlappingCandidates,
            existingPositions,
        );
    }

    const expandedNonOverlappingCandidates = getNonOverlappingCandidates(
        expandedBoardCandidates,
        existingPositions,
    );

    if (expandedNonOverlappingCandidates.length > 0) {
        return pickBestSpawnCandidate(
            expandedNonOverlappingCandidates,
            existingPositions,
        );
    }

    return pickBestSpawnCandidate(expandedBoardCandidates, existingPositions);
}

/**
 * Adjusts a moved card position so it cannot perfectly cover another card.
 *
 * Overlap remains allowed because cork-board notes naturally stack. The guard
 * only nudges the moved card when the centres are so close that one card can
 * hide the other's pin and title area.
 */
function resolveReadableMovePosition(
    state: BoardState,
    movedPinnedEvidenceId: string,
    requestedPosition: BoardPosition,
): BoardPosition {
    let resolvedPosition = {
        xPercent: clampPercent(requestedPosition.xPercent),
        yPercent: clampPercent(requestedPosition.yPercent),
    };

    for (let pass = 0; pass < readableOverlapResolutionPasses; pass += 1) {
        state.pinnedEvidence.forEach((existingPinnedEvidence) => {
            if (
                existingPinnedEvidence.pinnedEvidenceId ===
                movedPinnedEvidenceId
            ) {
                return;
            }

            const existingPosition = existingPinnedEvidence.position;
            const deltaX =
                resolvedPosition.xPercent - existingPosition.xPercent;
            const deltaY =
                resolvedPosition.yPercent - existingPosition.yPercent;

            const isTooCloseOnX =
                Math.abs(deltaX) < minimumReadableCardOffsetPercent;
            const isTooCloseOnY =
                Math.abs(deltaY) < minimumReadableCardOffsetPercent;

            if (!isTooCloseOnX || !isTooCloseOnY) {
                return;
            }

            const xDirection =
                deltaX === 0
                    ? getStableNudgeDirection(
                          movedPinnedEvidenceId,
                          existingPinnedEvidence.pinnedEvidenceId,
                      )
                    : Math.sign(deltaX);

            const yDirection = deltaY === 0 ? 1 : Math.sign(deltaY);

            resolvedPosition = {
                xPercent: clampPercent(
                    existingPosition.xPercent +
                        xDirection * minimumReadableCardOffsetPercent,
                ),
                yPercent: clampPercent(
                    existingPosition.yPercent +
                        yDirection * minimumReadableCardOffsetPercent,
                ),
            };
        });
    }

    return resolvedPosition;
}

/**
 * Gives exact-overlap nudges a deterministic direction.
 */
function getStableNudgeDirection(leftId: string, rightId: string): -1 | 1 {
    return leftId.localeCompare(rightId) >= 0 ? 1 : -1;
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
    preferredSpawnBounds?: BoardSpawnBounds,
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
        position: getDefaultPinnedPosition(
            state,
            evidenceId,
            pinnedAt,
            preferredSpawnBounds,
        ),
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
 *
 * The final committed position is lightly guarded against near-perfect overlap
 * so players can still see enough of stacked cards to recover from a crowded
 * board.
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

    const safePosition = resolveReadableMovePosition(
        state,
        pinnedEvidenceId,
        position,
    );

    return ruleOk({
        ...state,
        pinnedEvidence: state.pinnedEvidence.map((pinnedEvidence) =>
            pinnedEvidence.pinnedEvidenceId === pinnedEvidenceId
                ? {
                      ...pinnedEvidence,
                      position: safePosition,
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
