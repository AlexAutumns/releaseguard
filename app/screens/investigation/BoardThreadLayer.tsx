import { useEffect, useMemo, useRef, useState } from "react";

import type {
    BoardConnection,
    BoardPosition,
} from "../../features/gameplay/board/board-state";
import type { ConnectToolMode } from "../../features/gameplay/connect/connect-state";
import type { InvestigationToolId } from "../../features/gameplay/tools/tool-types";
import type { BoardPinnedEvidenceItem } from "./useInvestigationController";
import { getThreadStrokeColor } from "./thread-style";

export interface BoardThreadLayerProps {
    activeMode: ConnectToolMode;
    activeTool: InvestigationToolId;
    connections: BoardConnection[];
    hoveredConnectionId: string | null;

    /**
     * Temporary board positions used while Arrange dragging is in progress.
     *
     * These are UI-only preview positions. The committed board positions still
     * live in the attempt reducer after the player releases the card.
     */
    previewPositionsByPinnedId?: Readonly<Record<string, BoardPosition>>;

    pinnedBoardItems: BoardPinnedEvidenceItem[];
    onCutConnection: (connectionId: string) => void;
    onHoveredConnectionChange: (connectionId: string | null) => void;
}

interface ThreadEndpoint {
    x: number;
    y: number;
}

interface PairPathLayout {
    pairIndex: number;
    pairCount: number;
    centeredIndex: number;
}

/**
 * Half of the pinned-card overlay height.
 *
 * The visual card overlay uses `h-[11.75rem]` in BoardPinnedEvidenceCard.
 * The top pin sits at the top-center of that overlay, so the string endpoint is
 * roughly half the overlay height above the card centre.
 */
const cardCenterToTopPinOffsetRem = 5.875;

/**
 * Fallback used before the SVG is measured.
 *
 * The measured value replaces this after the first browser layout pass.
 */
const fallbackPinEndpointYOffsetPercent = 10.5;

/**
 * Minimum downward sag so short strings still look physical.
 */
const minGravitySagPercent = 2.2;

/**
 * Maximum base gravity sag before parallel-string layering is added.
 */
const maxGravitySagPercent = 5.8;

/**
 * How quickly string distance contributes to gravity sag.
 */
const gravityDistanceDivisor = 22;

/**
 * Sideways spacing between multiple strings that connect the same two cards.
 *
 * This matters most for vertical/diagonal connections.
 */
const parallelSideSpacingPercent = 5.4;

/**
 * Extra downward sag per parallel string lane.
 *
 * This matters most for horizontal connections, where sideways separation does
 * not visually separate the strings enough.
 */
const parallelSagSpacingPercent = 2.65;

/**
 * Cap for added sag from parallel string lanes.
 */
const maxAdditionalParallelSagPercent = 8.8;

/**
 * Small endpoint fan-out so multiple strings do not leave exactly the same
 * pixel at the pin. Kept small so strings still appear attached to the pin.
 */
const endpointFanSpacingPercent = 0.42;

/**
 * Maximum endpoint fan-out around the pin.
 */
const maxEndpointFanPercent = 1.35;

/**
 * SVG layer that renders Evidence Thread segments.
 *
 * Layer order is intentionally:
 * - card paper/content below this layer,
 * - strings in this layer,
 * - pin buttons and endpoint indicators above this layer.
 *
 * The root SVG does not capture pointer events. Only the transparent hit-paths
 * can receive pointer events when Select/Cut interaction needs them.
 */
export function BoardThreadLayer({
    activeMode,
    activeTool,
    connections,
    hoveredConnectionId,
    previewPositionsByPinnedId = {},
    pinnedBoardItems,
    onCutConnection,
    onHoveredConnectionChange,
}: BoardThreadLayerProps) {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [pinEndpointYOffsetPercent, setPinEndpointYOffsetPercent] = useState(
        fallbackPinEndpointYOffsetPercent,
    );

    useEffect(() => {
        const svgElement = svgRef.current;

        if (!svgElement || typeof window === "undefined") {
            return;
        }

        /**
         * Measures the card centre-to-pin offset as a percentage of the current
         * board world height.
         *
         * This is more reliable than a fixed percentage because Pan introduced a
         * larger board world whose rendered size can change with the viewport.
         */
        const updatePinOffset = () => {
            const svgRect = svgElement.getBoundingClientRect();

            if (svgRect.height <= 0) {
                return;
            }

            const rootFontSize = Number.parseFloat(
                window.getComputedStyle(document.documentElement).fontSize,
            );

            const safeRootFontSize = Number.isFinite(rootFontSize)
                ? rootFontSize
                : 16;

            const offsetPx = cardCenterToTopPinOffsetRem * safeRootFontSize;
            const nextOffsetPercent = (offsetPx / svgRect.height) * 100;

            setPinEndpointYOffsetPercent(nextOffsetPercent);
        };

        updatePinOffset();

        const resizeObserver = new ResizeObserver(updatePinOffset);
        resizeObserver.observe(svgElement);

        window.addEventListener("resize", updatePinOffset);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", updatePinOffset);
        };
    }, []);

    const pinnedPositionById = useMemo(() => {
        return new Map(
            pinnedBoardItems.map((item) => {
                const pinnedEvidenceId = item.pinnedEvidence.pinnedEvidenceId;

                return [
                    pinnedEvidenceId,
                    previewPositionsByPinnedId[pinnedEvidenceId] ??
                        item.pinnedEvidence.position,
                ];
            }),
        );
    }, [pinnedBoardItems, previewPositionsByPinnedId]);

    const connectionGroupsByPair = useMemo(() => {
        const groups = new Map<string, BoardConnection[]>();

        connections.forEach((connection) => {
            const pairKey = getConnectionPairKey(connection);
            const existingGroup = groups.get(pairKey) ?? [];

            groups.set(pairKey, [...existingGroup, connection]);
        });

        return groups;
    }, [connections]);

    const canCut = activeTool === "connect" && activeMode === "scissors";
    const canHoverSegment =
        activeTool === "select" ||
        (activeTool === "connect" && activeMode === "scissors");

    return (
        <svg
            className="pointer-events-none absolute inset-0 z-[15] h-full w-full overflow-visible"
            preserveAspectRatio="none"
            ref={svgRef}
            viewBox="0 0 100 100"
        >
            {connections.map((connection) => {
                const rawFromPosition = pinnedPositionById.get(
                    connection.fromPinnedEvidenceId,
                );
                const rawToPosition = pinnedPositionById.get(
                    connection.toPinnedEvidenceId,
                );

                if (!rawFromPosition || !rawToPosition) {
                    return null;
                }

                const pairLayout = getPairPathLayout(
                    connection,
                    connectionGroupsByPair,
                );

                const fromPosition = toPinEndpoint(
                    rawFromPosition,
                    pinEndpointYOffsetPercent,
                );
                const toPosition = toPinEndpoint(
                    rawToPosition,
                    pinEndpointYOffsetPercent,
                );

                const pathData = createCorkStringPath(
                    fromPosition,
                    toPosition,
                    pairLayout,
                    connection.connectionId,
                );

                const isHovered =
                    hoveredConnectionId === connection.connectionId;
                const strokeColor = getThreadStrokeColor(connection.threadId);

                return (
                    <g key={connection.connectionId}>
                        <path
                            d={pathData}
                            fill="none"
                            stroke="rgba(0,0,0,0.42)"
                            strokeLinecap="round"
                            strokeOpacity={isHovered ? 0.42 : 0.26}
                            strokeWidth={isHovered ? 4.1 : 3.15}
                            transform="translate(0.18 0.28)"
                            vectorEffect="non-scaling-stroke"
                        />

                        <path
                            d={pathData}
                            fill="none"
                            stroke={strokeColor}
                            strokeLinecap="round"
                            strokeOpacity={isHovered ? 1 : 0.96}
                            strokeWidth={isHovered ? 3.05 : 2.25}
                            vectorEffect="non-scaling-stroke"
                        />

                        {canHoverSegment && (
                            <path
                                className={
                                    canCut
                                        ? "pointer-events-auto cursor-crosshair"
                                        : "pointer-events-auto cursor-help"
                                }
                                d={pathData}
                                fill="none"
                                onClick={(event) => {
                                    if (!canCut) {
                                        return;
                                    }

                                    event.stopPropagation();
                                    onCutConnection(connection.connectionId);
                                    onHoveredConnectionChange(null);
                                }}
                                onMouseEnter={() =>
                                    onHoveredConnectionChange(
                                        connection.connectionId,
                                    )
                                }
                                onMouseLeave={() =>
                                    onHoveredConnectionChange(null)
                                }
                                pointerEvents="stroke"
                                stroke="transparent"
                                strokeLinecap="round"
                                strokeWidth={14}
                                vectorEffect="non-scaling-stroke"
                            />
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

/**
 * Returns an unordered pair key for grouping parallel thread segments.
 */
function getConnectionPairKey(connection: BoardConnection): string {
    const [left, right] = [
        connection.fromPinnedEvidenceId,
        connection.toPinnedEvidenceId,
    ].sort();

    return `${left}::${right}`;
}

/**
 * Returns the parallel-string layout information for one connection.
 */
function getPairPathLayout(
    connection: BoardConnection,
    groupsByPair: ReadonlyMap<string, BoardConnection[]>,
): PairPathLayout {
    const group = groupsByPair.get(getConnectionPairKey(connection)) ?? [];
    const pairIndex = group.findIndex(
        (groupConnection) =>
            groupConnection.connectionId === connection.connectionId,
    );

    const safePairIndex = pairIndex < 0 ? 0 : pairIndex;
    const pairCount = Math.max(1, group.length);

    return {
        pairIndex: safePairIndex,
        pairCount,
        centeredIndex: safePairIndex - (pairCount - 1) / 2,
    };
}

/**
 * Converts a card centre coordinate into the approximate top-pin coordinate.
 *
 * This deliberately does not clamp the endpoint to the visible board. If a card
 * is partly outside the visible area, the string should continue toward the
 * actual off-screen pin coordinate instead of snapping near the board edge.
 */
function toPinEndpoint(
    position: BoardPosition,
    pinEndpointYOffsetPercent: number,
): ThreadEndpoint {
    return {
        x: position.xPercent,
        y: position.yPercent - pinEndpointYOffsetPercent,
    };
}

/**
 * Creates a cork-board string path between two pin endpoints.
 *
 * The curve is gravity-first:
 * - every string sags downward;
 * - parallel strings get additional downward lanes so they remain visible;
 * - vertical/diagonal strings also get mild sideways separation.
 *
 * This is intentionally not a graph-layout algorithm. It is a small visual
 * rule for cork-board string readability.
 */
function createCorkStringPath(
    fromPosition: ThreadEndpoint,
    toPosition: ThreadEndpoint,
    pairLayout: PairPathLayout,
    connectionId: string,
): string {
    const deltaX = toPosition.x - fromPosition.x;
    const deltaY = toPosition.y - fromPosition.y;
    const distance = Math.max(1, Math.sqrt(deltaX * deltaX + deltaY * deltaY));

    const baseNormalX = -deltaY / distance;
    const baseNormalY = deltaX / distance;

    const endpointFanOffset = clampNumber(
        pairLayout.centeredIndex * endpointFanSpacingPercent,
        -maxEndpointFanPercent,
        maxEndpointFanPercent,
    );

    const fromX = fromPosition.x + baseNormalX * endpointFanOffset;
    const fromY = fromPosition.y + baseNormalY * endpointFanOffset;
    const toX = toPosition.x + baseNormalX * endpointFanOffset;
    const toY = toPosition.y + baseNormalY * endpointFanOffset;

    const adjustedDeltaX = toX - fromX;
    const adjustedDeltaY = toY - fromY;
    const adjustedDistance = Math.max(
        1,
        Math.sqrt(
            adjustedDeltaX * adjustedDeltaX + adjustedDeltaY * adjustedDeltaY,
        ),
    );

    const midpointX = (fromX + toX) / 2;
    const midpointY = (fromY + toY) / 2;

    const normalX = -adjustedDeltaY / adjustedDistance;
    const normalY = adjustedDeltaX / adjustedDistance;

    const gravitySag = Math.min(
        maxGravitySagPercent,
        Math.max(
            minGravitySagPercent,
            adjustedDistance / gravityDistanceDivisor,
        ),
    );

    const additionalParallelSag = Math.min(
        maxAdditionalParallelSagPercent,
        pairLayout.pairIndex * parallelSagSpacingPercent,
    );

    const sideOffset = pairLayout.centeredIndex * parallelSideSpacingPercent;

    const sideOffsetX = normalX * sideOffset;

    /**
     * Side offset can move the curve up or down depending on geometry.
     * Clamp its vertical effect so it can separate paths, but cannot cancel the
     * physical downward sag.
     */
    const sideOffsetY = clampNumber(
        normalY * sideOffset,
        -gravitySag * 0.35,
        gravitySag * 0.55,
    );

    const stableMicroOffset = getStableMicroOffset(connectionId);

    const controlX = midpointX + sideOffsetX + stableMicroOffset;
    const controlY = Math.max(
        midpointY + minGravitySagPercent,
        midpointY + gravitySag + additionalParallelSag + sideOffsetY,
    );

    return `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`;
}

/**
 * Adds a tiny stable horizontal variation so repeated strings do not look too
 * mathematically perfect.
 */
function getStableMicroOffset(connectionId: string): number {
    let hash = 0;

    for (let index = 0; index < connectionId.length; index += 1) {
        hash = (hash + connectionId.charCodeAt(index)) % 7;
    }

    return (hash - 3) * 0.18;
}

/**
 * Clamps a number between a lower and upper bound.
 */
function clampNumber(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}
