import {
    useRef,
    useState,
    type CSSProperties,
    type PointerEvent as ReactPointerEvent,
} from "react";

import type { EvidenceCardDefinition } from "../../features/content/content-types";
import type {
    BoardPosition,
    EvidenceThreadColorId,
    PinnedEvidence,
} from "../../features/gameplay/board/board-state";
import type { InvestigationToolId } from "../../features/gameplay/tools/tool-types";
import { cn } from "../../lib/cn";
import { threadColorVisuals } from "./thread-style";

export interface BoardPinnedEvidenceCardProps {
    activeThreadId: EvidenceThreadColorId;
    activeTool: InvestigationToolId;
    evidenceCard: EvidenceCardDefinition;
    highlightedThreadId: EvidenceThreadColorId | null;
    pinnedEvidence: PinnedEvidence;
    visibleThreadIds: EvidenceThreadColorId[];
    isConnectAnchor: boolean;
    isSelected: boolean;
    onActivate: () => void;
    onInspect: () => void;

    /**
     * Called when Arrange mode finishes dragging this card to a new board
     * position.
     */
    onMove: (pinnedEvidenceId: string, position: BoardPosition) => void;

    /**
     * Sends a temporary Arrange drag position upward so the thread SVG layer can
     * follow the card while dragging.
     */
    onMovePreview: (pinnedEvidenceId: string, position: BoardPosition) => void;

    /**
     * Clears the temporary Arrange preview after drag completion or
     * cancellation.
     */
    onMovePreviewEnd: (pinnedEvidenceId: string) => void;

    onUnpin: () => void;
}

interface BoardCardDragState {
    pointerId: number;
    boardElement: HTMLElement;
    xOffsetPercent: number;
    yOffsetPercent: number;
    latestPosition: BoardPosition;
    hasMoved: boolean;
}

/**
 * Visual representation of one pinned evidence file on the board.
 *
 * This component is intentionally split into two positioned layers:
 * - card paper/content layer,
 * - pin/endpoint marker overlay layer.
 *
 * That lets the SVG string layer sit visually between card paper and the pin
 * controls without blocking basic card interactions.
 */
export function BoardPinnedEvidenceCard({
    activeThreadId,
    activeTool,
    evidenceCard,
    highlightedThreadId,
    pinnedEvidence,
    visibleThreadIds,
    isConnectAnchor,
    isSelected,
    onActivate,
    onInspect,
    onMove,
    onMovePreview,
    onMovePreviewEnd,
    onUnpin,
}: BoardPinnedEvidenceCardProps) {
    const priorityThreadId =
        highlightedThreadId ?? (isConnectAnchor ? activeThreadId : null);
    const priorityThreadVisual = priorityThreadId
        ? threadColorVisuals[priorityThreadId]
        : null;

    /**
     * Drag preview state is local UI state.
     *
     * The committed board position remains in the attempt reducer. During
     * dragging, this preview makes the card visibly follow the pointer without
     * dispatching a reducer action on every pointer move.
     */
    const [dragPreviewPosition, setDragPreviewPosition] =
        useState<BoardPosition | null>(null);

    const dragStateRef = useRef<BoardCardDragState | null>(null);

    const renderedPosition = dragPreviewPosition ?? pinnedEvidence.position;

    /**
     * True only for the card currently being rearranged.
     *
     * While dragging, the unpin control is hidden to prevent accidental removal
     * and to visually communicate that the card has been lifted from the board
     * before being pinned into a new position.
     */
    const isArrangeDragging = dragPreviewPosition !== null;

    const positionStyle: CSSProperties = {
        left: `${renderedPosition.xPercent}%`,
        top: `${renderedPosition.yPercent}%`,
    };

    /**
     * Keeps thread-hover and active-anchor emphasis visible without turning the
     * paper into a glowing application card.
     */
    const paperStyle: CSSProperties = {
        ...positionStyle,
    };

    if (priorityThreadVisual) {
        paperStyle.borderColor = priorityThreadVisual.stroke;
        paperStyle.outline = `2px solid ${priorityThreadVisual.stroke}`;
        paperStyle.outlineOffset = "1px";
    }

    const paperStockClassName = getBoardPaperStockClassName(evidenceCard.id);

    /**
     * Starts an Arrange-mode drag operation.
     *
     * Dragging is only active in Arrange mode. Other tools keep their current
     * behaviour: Select selects cards, Connect creates/cuts strings, and
     * buttons inside the card remain normal buttons.
     */
    function handlePointerDown(event: ReactPointerEvent<HTMLElement>): void {
        if (activeTool !== "arrange") {
            return;
        }

        const targetElement =
            event.target instanceof HTMLElement ? event.target : null;

        if (targetElement?.closest("button,a,input,textarea,select")) {
            return;
        }

        const boardElement = getBoardSurfaceFromCard(event.currentTarget);

        if (!boardElement) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const pointerPosition = getBoardPositionFromPointer(
            event,
            boardElement,
        );
        const currentPosition = pinnedEvidence.position;

        dragStateRef.current = {
            pointerId: event.pointerId,
            boardElement,
            xOffsetPercent: pointerPosition.xPercent - currentPosition.xPercent,
            yOffsetPercent: pointerPosition.yPercent - currentPosition.yPercent,
            latestPosition: currentPosition,
            hasMoved: false,
        };

        event.currentTarget.setPointerCapture(event.pointerId);
    }

    /**
     * Updates the local drag preview while the pointer is moving.
     */
    function handlePointerMove(event: ReactPointerEvent<HTMLElement>): void {
        const dragState = dragStateRef.current;

        if (!dragState || dragState.pointerId !== event.pointerId) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const pointerPosition = getBoardPositionFromPointer(
            event,
            dragState.boardElement,
        );

        const nextPosition = clampBoardPreviewPosition({
            xPercent: pointerPosition.xPercent - dragState.xOffsetPercent,
            yPercent: pointerPosition.yPercent - dragState.yOffsetPercent,
        });

        const deltaX = nextPosition.xPercent - pinnedEvidence.position.xPercent;
        const deltaY = nextPosition.yPercent - pinnedEvidence.position.yPercent;
        const distanceMoved = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        dragState.latestPosition = nextPosition;
        dragState.hasMoved = dragState.hasMoved || distanceMoved > 0.4;

        setDragPreviewPosition(nextPosition);
        onMovePreview(pinnedEvidence.pinnedEvidenceId, nextPosition);
    }

    /**
     * Commits the final Arrange movement once the pointer is released.
     *
     * This intentionally dispatches once at the end of the drag so undo history
     * does not get flooded with dozens of tiny pointer-move snapshots.
     */
    function handlePointerUp(event: ReactPointerEvent<HTMLElement>): void {
        const dragState = dragStateRef.current;

        if (!dragState || dragState.pointerId !== event.pointerId) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        dragStateRef.current = null;
        setDragPreviewPosition(null);

        if (dragState.hasMoved) {
            onMove(pinnedEvidence.pinnedEvidenceId, dragState.latestPosition);
        }

        onMovePreviewEnd(pinnedEvidence.pinnedEvidenceId);
    }

    /**
     * Cancels Arrange dragging without committing a reducer change.
     */
    function handlePointerCancel(event: ReactPointerEvent<HTMLElement>): void {
        const dragState = dragStateRef.current;

        if (!dragState || dragState.pointerId !== event.pointerId) {
            return;
        }

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        dragStateRef.current = null;
        setDragPreviewPosition(null);
        onMovePreviewEnd(pinnedEvidence.pinnedEvidenceId);
    }

    return (
        <>
            <article
                className={cn(
                    "rg-board-evidence-copy absolute z-10 h-[11.75rem] w-56 -translate-x-1/2 -translate-y-1/2 text-rg-paper-ink",
                    paperStockClassName,
                    activeTool === "arrange"
                        ? "cursor-grab active:cursor-grabbing"
                        : "cursor-pointer",
                    isArrangeDragging &&
                        "z-30 scale-[1.015] shadow-2xl shadow-black/45",
                    priorityThreadVisual && "z-20",
                )}
                data-board-pinned-card="true"
                data-selected={isSelected ? "true" : "false"}
                onClick={(event) => {
                    event.stopPropagation();

                    if (activeTool === "arrange") {
                        return;
                    }

                    onActivate();
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onActivate();
                    }
                }}
                onPointerCancel={handlePointerCancel}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                role="button"
                style={paperStyle}
                tabIndex={0}
                title={getPinnedCardTitle({
                    activeTool,
                    isConnectAnchor,
                    isThreadEndpointHighlighted: Boolean(highlightedThreadId),
                })}
            >
                <div className="grid h-full grid-rows-[2.75rem_1.6rem_minmax(0,1fr)_1.85rem] px-3.5 pb-2.5 pt-7">
                    <header className="min-w-0 overflow-hidden">
                        <p className="line-clamp-2 font-case text-[0.8rem] font-bold leading-[0.98rem] text-rg-paper-ink">
                            {evidenceCard.title}
                        </p>
                    </header>

                    <div className="flex min-w-0 items-center justify-between gap-2 border-b border-rg-folder-dark/25 pb-1">
                        <p className="min-w-0 truncate font-mono text-[0.58rem] uppercase tracking-[0.09em] text-rg-paper-muted">
                            {evidenceCard.source}
                        </p>

                        <span className="shrink-0 font-mono text-[0.54rem] font-bold uppercase tracking-[0.07em] text-rg-paper-muted/85">
                            {evidenceTypeLabelById[evidenceCard.type]}
                        </span>
                    </div>

                    <div className="min-h-0 overflow-hidden pt-2">
                        <p className="line-clamp-3 font-case text-xs leading-[1.05rem] text-rg-paper-muted">
                            {evidenceCard.body}
                        </p>
                    </div>

                    <footer className="flex items-end justify-end border-t border-rg-folder-dark/25 pt-1">
                        <button
                            aria-label="Inspect pinned evidence"
                            className="rg-board-copy-action"
                            onClick={(event) => {
                                event.stopPropagation();
                                onInspect();
                            }}
                            onPointerDown={(event) => {
                                event.stopPropagation();
                            }}
                            title="Inspect pinned evidence"
                            type="button"
                        >
                            Inspect
                        </button>
                    </footer>
                </div>
            </article>

            <div
                aria-hidden="false"
                className="pointer-events-none absolute z-[30] h-[11.75rem] w-56 -translate-x-1/2 -translate-y-1/2"
                style={positionStyle}
            >
                {!isArrangeDragging && (
                    <button
                        aria-label="Pull this pin from the board"
                        className="rg-board-tack pointer-events-auto absolute left-1/2 top-0 z-[35] -translate-x-1/2 -translate-y-1/2"
                        onClick={(event) => {
                            event.stopPropagation();
                            onUnpin();
                        }}
                        onPointerDown={(event) => {
                            event.stopPropagation();
                        }}
                        title="Pull this pin from the board"
                        type="button"
                    >
                        <span
                            aria-hidden="true"
                            className={cn(
                                "rg-board-tack__head",
                                priorityThreadVisual && "ring-4",
                                priorityThreadVisual?.anchorRingClass,
                            )}
                        />
                        <span aria-hidden="true" className="rg-board-tack__cue">
                            Pull
                        </span>
                    </button>
                )}

                {visibleThreadIds.length > 0 && (
                    <div
                        aria-hidden="true"
                        className="rg-board-thread-endpoints absolute right-2 top-2 z-[34]"
                        title="Thread endpoints attached to this pinned card."
                    >
                        {visibleThreadIds.slice(0, 5).map((threadId) => (
                            <span
                                className="rg-board-thread-endpoint"
                                key={threadId}
                                style={{
                                    backgroundColor:
                                        threadColorVisuals[threadId].stroke,
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

/**
 * Stable paper-stock choices for pinned Board working copies.
 *
 * The visual stock is derived from the authored evidence ID rather than the
 * evidence type, so paper colour remains decorative and never becomes a hidden
 * gameplay category code.
 */
const boardPaperStockClassNames = [
    "rg-board-evidence-copy--cream",
    "rg-board-evidence-copy--cool",
    "rg-board-evidence-copy--buff",
    "rg-board-evidence-copy--golden",
] as const;

const evidenceTypeLabelById: Record<EvidenceCardDefinition["type"], string> = {
    "qa-note": "QA Note",
    "pull-request-comment": "PR Comment",
    "support-ticket": "Support",
    "release-note": "Release Note",
};

/**
 * Returns one deterministic Board paper stock for an evidence working copy.
 */
function getBoardPaperStockClassName(evidenceId: string): string {
    let hash = 0;

    for (let index = 0; index < evidenceId.length; index += 1) {
        hash = (hash * 31 + evidenceId.charCodeAt(index)) % 997;
    }

    return boardPaperStockClassNames[hash % boardPaperStockClassNames.length];
}

interface GetPinnedCardTitleInput {
    activeTool: InvestigationToolId;
    isConnectAnchor: boolean;
    isThreadEndpointHighlighted: boolean;
}

/**
 * Returns helpful hover copy for the current board tool.
 */
function getPinnedCardTitle({
    activeTool,
    isConnectAnchor,
    isThreadEndpointHighlighted,
}: GetPinnedCardTitleInput): string {
    if (isThreadEndpointHighlighted) {
        return "Endpoint of the highlighted evidence thread.";
    }

    if (activeTool === "connect" && isConnectAnchor) {
        return "Current string anchor. Click another pinned card to connect.";
    }

    if (activeTool === "connect") {
        return "Use this pinned card with the Connect tool.";
    }

    if (activeTool === "arrange") {
        return "Drag to rearrange this pinned evidence.";
    }

    return "Select this pinned evidence.";
}

/**
 * Finds the nearest board surface for percentage coordinate conversion.
 */
function getBoardSurfaceFromCard(element: HTMLElement): HTMLElement | null {
    return element.closest(
        "[data-investigation-board-surface='true']",
    ) as HTMLElement | null;
}

/**
 * Converts a pointer location into board-space percentage coordinates.
 */
function getBoardPositionFromPointer(
    event: ReactPointerEvent<HTMLElement>,
    boardElement: HTMLElement,
): BoardPosition {
    const rect = boardElement.getBoundingClientRect();

    return {
        xPercent: ((event.clientX - rect.left) / rect.width) * 100,
        yPercent: ((event.clientY - rect.top) / rect.height) * 100,
    };
}

/**
 * Keeps preview dragging inside the same safe board range used by the reducer.
 */
function clampBoardPreviewPosition(position: BoardPosition): BoardPosition {
    return {
        xPercent: clampPreviewPercent(position.xPercent),
        yPercent: clampPreviewPercent(position.yPercent),
    };
}

/**
 * Clamps one preview coordinate to the visible board.
 */
function clampPreviewPercent(value: number): number {
    return Math.min(96, Math.max(4, value));
}
