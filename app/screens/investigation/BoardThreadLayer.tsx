import { useMemo } from "react";

import type { BoardConnection } from "../../features/gameplay/board/board-state";
import type { ConnectToolMode } from "../../features/gameplay/connect/connect-state";
import type { InvestigationToolId } from "../../features/gameplay/tools/tool-types";
import type { BoardPinnedEvidenceItem } from "./useInvestigationController";
import { getThreadStrokeColor } from "./thread-style";

export interface BoardThreadLayerProps {
    activeMode: ConnectToolMode;
    activeTool: InvestigationToolId;
    connections: BoardConnection[];
    hoveredConnectionId: string | null;
    pinnedBoardItems: BoardPinnedEvidenceItem[];
    onCutConnection: (connectionId: string) => void;
    onHoveredConnectionChange: (connectionId: string | null) => void;
}

interface ThreadEndpoint {
    x: number;
    y: number;
}

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
    pinnedBoardItems,
    onCutConnection,
    onHoveredConnectionChange,
}: BoardThreadLayerProps) {
    const pinnedPositionById = useMemo(() => {
        return new Map(
            pinnedBoardItems.map((item) => [
                item.pinnedEvidence.pinnedEvidenceId,
                item.pinnedEvidence.position,
            ]),
        );
    }, [pinnedBoardItems]);

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
            className="pointer-events-none absolute inset-0 z-[15] h-full w-full"
            preserveAspectRatio="none"
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

                const pairOffsetIndex = getPairOffsetIndex(
                    connection,
                    connectionGroupsByPair,
                );

                const fromPosition = toPinEndpoint(
                    rawFromPosition,
                    pairOffsetIndex,
                );
                const toPosition = toPinEndpoint(
                    rawToPosition,
                    pairOffsetIndex,
                );

                const pathData = createSaggingThreadPath(
                    fromPosition,
                    toPosition,
                    pairOffsetIndex,
                );

                const isHovered =
                    hoveredConnectionId === connection.connectionId;
                const strokeColor = getThreadStrokeColor(connection.threadId);

                return (
                    <g key={connection.connectionId}>
                        <path
                            d={pathData}
                            fill="none"
                            stroke={strokeColor}
                            strokeLinecap="round"
                            strokeOpacity={isHovered ? 1 : 0.96}
                            strokeWidth={isHovered ? 3.1 : 2.35}
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
                                strokeWidth={12}
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
 * Returns a centered offset index for parallel paths between the same pair.
 */
function getPairOffsetIndex(
    connection: BoardConnection,
    groupsByPair: ReadonlyMap<string, BoardConnection[]>,
): number {
    const group = groupsByPair.get(getConnectionPairKey(connection)) ?? [];
    const index = group.findIndex(
        (groupConnection) =>
            groupConnection.connectionId === connection.connectionId,
    );

    if (index < 0) {
        return 0;
    }

    return index - (group.length - 1) / 2;
}

/**
 * Converts card center coordinates into a top-pin endpoint.
 *
 * The x-coordinate stays aligned with the unpin button. The y-coordinate is
 * raised so the string visually tucks under the pin instead of entering lower
 * through the card title/body area.
 */
function toPinEndpoint(
    position: {
        xPercent: number;
        yPercent: number;
    },
    pairOffsetIndex: number,
): ThreadEndpoint {
    return {
        x: position.xPercent + pairOffsetIndex * 1.1,
        y: Math.max(4, position.yPercent - 14),
    };
}

/**
 * Creates a simple gravity-like string path.
 *
 * The string is now slightly thicker and slightly more droopy, without using a
 * dark outline stroke.
 */
function createSaggingThreadPath(
    fromPosition: ThreadEndpoint,
    toPosition: ThreadEndpoint,
    pairOffsetIndex: number,
): string {
    const deltaX = toPosition.x - fromPosition.x;
    const deltaY = toPosition.y - fromPosition.y;
    const distance = Math.max(1, Math.sqrt(deltaX * deltaX + deltaY * deltaY));

    const midpointX = (fromPosition.x + toPosition.x) / 2;
    const midpointY = (fromPosition.y + toPosition.y) / 2;

    const normalX = -deltaY / distance;
    const normalY = deltaX / distance;

    const parallelOffset = pairOffsetIndex * 5.2;
    const sag = Math.min(9.4, Math.max(4.8, distance / 10.4));

    const controlX = midpointX + normalX * parallelOffset;
    const controlY = midpointY + normalY * parallelOffset + sag;

    return `M ${fromPosition.x} ${fromPosition.y} Q ${controlX} ${controlY} ${toPosition.x} ${toPosition.y}`;
}
