import {
    useRef,
    useState,
    type CSSProperties,
    type PointerEvent as ReactPointerEvent,
} from "react";

import { Button } from "../../components/ui/Button";
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

    const paperStyle: CSSProperties = {
        ...positionStyle,
    };

    if (priorityThreadVisual) {
        paperStyle.borderColor = priorityThreadVisual.stroke;
        paperStyle.boxShadow = [
            `0 0 0 4px ${priorityThreadVisual.stroke}88`,
            "0 18px 36px rgba(0,0,0,0.36)",
        ].join(", ");
    }

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
                    "absolute z-10 w-56 -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-rg-paper p-3 pt-8 text-rg-paper-ink shadow-xl shadow-black/35 transition",
                    activeTool === "arrange"
                        ? "cursor-grab active:cursor-grabbing"
                        : "cursor-pointer",
                    isArrangeDragging &&
                        "z-30 scale-[1.015] shadow-2xl shadow-black/45",
                    priorityThreadVisual
                        ? "z-20"
                        : isSelected
                          ? "border-rg-amber ring-2 ring-rg-amber/70"
                          : "border-rg-folder-dark/40 hover:border-rg-amber/65",
                )}
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
                <div
                    aria-hidden="true"
                    className="rg-paper-grain pointer-events-none absolute inset-0 rounded-2xl opacity-35"
                />

                <div className="relative z-10">
                    <div className="mb-2 min-w-0 text-left">
                        <p className="line-clamp-2 text-sm font-black leading-5 text-rg-paper-ink">
                            {evidenceCard.title}
                        </p>

                        <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-rg-paper-muted">
                            {evidenceCard.source}
                        </p>
                    </div>

                    <p className="line-clamp-3 text-xs leading-5 text-rg-paper-muted">
                        {evidenceCard.body}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                        <Button
                            aria-label="Inspect pinned evidence"
                            className="h-8 w-10 px-0"
                            onClick={(event) => {
                                event.stopPropagation();
                                onInspect();
                            }}
                            onPointerDown={(event) => {
                                event.stopPropagation();
                            }}
                            size="sm"
                            title="Inspect pinned evidence"
                            variant="secondary"
                        >
                            ⌕
                        </Button>
                    </div>
                </div>
            </article>

            <div
                aria-hidden="false"
                className="pointer-events-none absolute z-[30] h-[11.75rem] w-56 -translate-x-1/2 -translate-y-1/2"
                style={positionStyle}
            >
                {!isArrangeDragging && (
                    <button
                        aria-label="Remove pinned evidence from board"
                        className="pointer-events-auto absolute left-1/2 top-0 z-[35] flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-rg-stamp bg-rg-stamp text-sm font-black text-rg-paper shadow-md shadow-black/25 transition hover:-translate-y-[60%] hover:border-rg-amber hover:bg-rg-stamp hover:text-rg-paper hover:shadow-lg hover:shadow-rg-stamp/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rg-amber"
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
                        ×
                    </button>
                )}

                {visibleThreadIds.length > 0 && (
                    <div
                        aria-hidden="true"
                        className="absolute right-2 top-2 z-[34] flex max-w-[4.8rem] items-center justify-center gap-1 rounded-full border border-rg-folder-dark/20 bg-rg-paper/90 px-1.5 py-0.5 shadow-sm shadow-black/10"
                        title="Thread endpoints attached to this pinned card."
                    >
                        {visibleThreadIds.slice(0, 5).map((threadId) => (
                            <span
                                className="h-2 w-2 rounded-full border border-black/30"
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
