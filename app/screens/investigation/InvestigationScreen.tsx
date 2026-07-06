import {
    useRef,
    useState,
    type AnimationEvent as ReactAnimationEvent,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
    type RefObject,
} from "react";
import { Link, useNavigate } from "react-router";

import { GameNotificationStack } from "../../components/game-notifications/GameNotificationStack";
import { Badge } from "../../components/ui/Badge";
import { Button, buttonClassName } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Panel } from "../../components/ui/Panel";

import type {
    FamilyReferenceDefinition,
    ReleaseTicketDefinition,
    ShiftDefinition,
    TicketFamilyDefinition,
} from "../../features/content/content-types";

import type {
    BoardPosition,
    BoardSpawnBounds,
} from "../../features/gameplay/board/board-state";
import type {
    PagedDocumentController,
    PagedDocumentPage,
} from "../../features/paged-document/paged-document-types";
import { usePagedDocument } from "../../features/paged-document/usePagedDocument";

import { cn } from "../../lib/cn";

import { BoardPinnedEvidenceCard } from "./BoardPinnedEvidenceCard";
import { BoardThreadLayer } from "./BoardThreadLayer";
import { EvidencePreviewDialog } from "./EvidencePreviewDialog";
import { FiledFindingCard } from "./FiledFindingCard";
import { FindingDraftForm } from "./FindingDraftForm";
import { InvestigationHud } from "./InvestigationHud";
import { InvestigationRail } from "./InvestigationRail";
import { InvestigationToolRack } from "./InvestigationToolRack";
import { InvestigationWorkspaceShell } from "./InvestigationWorkspaceShell";
import {
    useInvestigationController,
    type InvestigationController,
} from "./useInvestigationController";
import { VerdictDrawer } from "./VerdictDrawer";

export interface InvestigationScreenProps {
    requestedShiftId: string;
    requestedTicketId: string;
    shift?: ShiftDefinition;
    ticket?: ReleaseTicketDefinition;
    family?: TicketFamilyDefinition;
    familyReference?: FamilyReferenceDefinition;
}

type CaseworkPageId = "casework:new" | "casework:filed" | "casework:verdict";

interface CaseworkPage extends PagedDocumentPage {
    id: CaseworkPageId;
    label: string;
}

const caseworkPages = [
    { id: "casework:new", label: "New" },
    { id: "casework:filed", label: "Filed" },
    { id: "casework:verdict", label: "Verdict" },
] as const satisfies readonly CaseworkPage[];

type DragPreviewPositionsByPinnedId = Record<string, BoardPosition>;

interface BoardPanOffset {
    xPx: number;
    yPx: number;
}

interface BoardPanState {
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startOffset: BoardPanOffset;
}

const defaultBoardPanOffset: BoardPanOffset = {
    xPx: 0,
    yPx: 0,
};

const boardWorldSizePercent = 140;

/**
 * Active investigation workspace for one ticket.
 *
 * This wrapper safely handles missing content. The real gameplay workspace only
 * renders after a valid shift and ticket are available.
 */
export function InvestigationScreen({
    requestedShiftId,
    requestedTicketId,
    shift,
    ticket,
}: InvestigationScreenProps) {
    if (!shift || !ticket) {
        return (
            <InvestigationWorkspaceShell>
                <div className="flex h-full min-h-0 flex-col">
                    <div className="mb-2 flex shrink-0 justify-between border border-rg-border bg-rg-surface/92 p-3">
                        <Link
                            className={buttonClassName({
                                variant: "secondary",
                            })}
                            to="/desk"
                        >
                            Back to Case Desk
                        </Link>
                    </div>

                    <div className="grid min-h-0 flex-1 place-items-center">
                        <EmptyState
                            description={`Requested shift: ${
                                requestedShiftId || "missing"
                            } | Requested ticket: ${
                                requestedTicketId || "missing"
                            }`}
                            title="The investigation desk cannot be opened"
                        />
                    </div>
                </div>
            </InvestigationWorkspaceShell>
        );
    }

    return <InvestigationWorkspace shift={shift} ticket={ticket} />;
}

interface InvestigationWorkspaceProps {
    shift: ShiftDefinition;
    ticket: ReleaseTicketDefinition;
}

/**
 * Valid ticket investigation workspace.
 *
 * The layout keeps only two major work zones open at once:
 * - Files + Board while investigating evidence.
 * - Board + Casework while filing findings.
 */
function InvestigationWorkspace({
    shift,
    ticket,
}: InvestigationWorkspaceProps) {
    const [isCabinetOpen, setIsCabinetOpen] = useState(true);
    const [isCaseworkOpen, setIsCaseworkOpen] = useState(false);
    const caseworkDocument = usePagedDocument({
        pages: caseworkPages,
        initialPageId: "casework:new",
    });

    const controller = useInvestigationController({ shift, ticket });
    const boardViewportRef = useRef<HTMLDivElement | null>(null);
    const boardWorldRef = useRef<HTMLDivElement | null>(null);

    const navigate = useNavigate();

    /**
     * Submits the ticket report through the controller, then routes to the
     * saved result page only after scoring/storage succeeds.
     */
    const submitTicketReport = () => {
        const submittedAttemptId = controller.submitTicketReport();

        if (!submittedAttemptId) {
            return;
        }

        navigate(`/results/ticket/${submittedAttemptId}`);
    };

    const previewIsPinned = controller.previewEvidenceCard
        ? controller.evidenceItems.some(
              (item) =>
                  item.evidenceCard.id === controller.previewEvidenceCard?.id &&
                  item.isPinned,
          )
        : false;

    /**
     * Opens the evidence cabinet only when the Notebook is not turning a page.
     *
     * Opening Files closes Casework, so allowing this during a page animation
     * would unmount the Notebook before its lifecycle can commit or finish.
     */
    const openCabinet = () => {
        if (caseworkDocument.isChangingPage) {
            return;
        }

        setIsCabinetOpen(true);
        setIsCaseworkOpen(false);
    };

    const openCasework = () => {
        setIsCaseworkOpen(true);
        setIsCabinetOpen(false);
    };

    /**
     * Folds Casework only when no Notebook page turn is active.
     *
     * The paged-document hook intentionally knows nothing about the workspace
     * drawer lifecycle, so this interaction conflict stays local to Casework.
     */
    const collapseCasework = () => {
        if (caseworkDocument.isChangingPage) {
            return;
        }

        setIsCaseworkOpen(false);
    };

    /**
     * Returns the current visible board-world spawn bounds.
     *
     * This lets pinned evidence appear near the section of the cork board the
     * player is currently viewing, instead of always spawning in the original
     * starting area.
     */
    const getCurrentBoardSpawnBounds = (): BoardSpawnBounds | undefined => {
        return getBoardViewportSpawnBounds(
            boardViewportRef.current,
            boardWorldRef.current,
        );
    };

    /**
     * Pins an evidence file into the current visible board area.
     */
    const pinEvidenceInCurrentBoardView = (evidenceId: string) => {
        controller.pinEvidence(evidenceId, getCurrentBoardSpawnBounds());
    };

    /**
     * Pins the currently previewed evidence into the current visible board area.
     */
    const pinPreviewEvidenceInCurrentBoardView = () => {
        controller.pinPreviewEvidence(getCurrentBoardSpawnBounds());
    };

    return (
        <InvestigationWorkspaceShell>
            <InvestigationHud shift={shift} ticket={ticket} />

            <GameNotificationStack
                notifications={controller.notifications}
                onDismiss={controller.dismissNotification}
                position="top-center"
            />

            <div
                className="grid min-h-0 flex-1 gap-2"
                style={{
                    gridTemplateColumns: getWorkspaceGridColumns({
                        isCabinetOpen,
                        isCaseworkOpen,
                    }),
                }}
            >
                {isCabinetOpen ? (
                    <EvidenceCabinetPanel
                        controller={controller}
                        onCollapse={() => setIsCabinetOpen(false)}
                        onPinEvidence={pinEvidenceInCurrentBoardView}
                        ticket={ticket}
                    />
                ) : (
                    <InvestigationRail
                        icon="▤"
                        label="Files"
                        meta={
                            <Badge tone="cork">
                                {ticket.evidenceCards.length}
                            </Badge>
                        }
                        onOpen={openCabinet}
                        side="left"
                    />
                )}

                <InvestigationBoardPanel
                    boardViewportRef={boardViewportRef}
                    boardWorldRef={boardWorldRef}
                    controller={controller}
                />

                {isCaseworkOpen ? (
                    <CaseworkPanel
                        controller={controller}
                        document={caseworkDocument}
                        onCollapse={collapseCasework}
                        onSubmitReport={submitTicketReport}
                    />
                ) : (
                    <InvestigationRail
                        icon="▥"
                        label="Casework"
                        meta={
                            <Badge tone="warning">
                                {
                                    controller.attempt.present.findings
                                        .filedFindings.length
                                }
                            </Badge>
                        }
                        onOpen={openCasework}
                        side="right"
                    />
                )}
            </div>

            <InvestigationToolRack
                activeTool={controller.attempt.present.activeTool}
                canRedo={controller.canRedo}
                canReset={controller.canReset}
                canUndo={controller.canUndo}
                connectInteraction={controller.connectInteraction}
                onClearConnectAnchor={controller.clearConnectAnchor}
                onRedo={controller.redoLastAction}
                onReset={controller.resetAttempt}
                onSelectTool={controller.setActiveTool}
                onSetConnectMode={controller.setConnectMode}
                onSetConnectThreadId={controller.setConnectThreadId}
                onUndo={controller.undoLastAction}
                pendingConnectAnchorLabel={controller.pendingConnectAnchorLabel}
                pinnedCount={
                    controller.attempt.present.board.pinnedEvidence.length
                }
                segmentCount={
                    controller.attempt.present.board.connections.length
                }
            />

            <EvidencePreviewDialog
                evidenceCard={controller.previewEvidenceCard}
                isOpen={Boolean(controller.previewEvidenceCard)}
                isPinned={previewIsPinned}
                onClose={controller.closeEvidencePreview}
                onPinToBoard={pinPreviewEvidenceInCurrentBoardView}
            />
        </InvestigationWorkspaceShell>
    );
}

interface WorkspaceGridColumnsInput {
    isCabinetOpen: boolean;
    isCaseworkOpen: boolean;
}

/**
 * Returns the workspace grid columns for the current drawer state.
 */
function getWorkspaceGridColumns({
    isCabinetOpen,
    isCaseworkOpen,
}: WorkspaceGridColumnsInput): string {
    const cabinetColumn = isCabinetOpen ? "minmax(320px, 390px)" : "48px";
    const caseworkColumn = isCaseworkOpen ? "minmax(420px, 520px)" : "48px";

    return `${cabinetColumn} minmax(0, 1fr) ${caseworkColumn}`;
}

interface EvidenceCabinetPanelProps {
    controller: InvestigationController;
    onCollapse: () => void;

    /**
     * Pins evidence into the current visible board viewport.
     */
    onPinEvidence: (evidenceId: string) => void;

    ticket: ReleaseTicketDefinition;
}

/**
 * Evidence file cabinet.
 *
 * Evidence actions remain direct object actions:
 * - inspect from the evidence card,
 * - pin from the evidence card after inspection.
 */
function EvidenceCabinetPanel({
    controller,
    onCollapse,
    onPinEvidence,
    ticket,
}: EvidenceCabinetPanelProps) {
    return (
        <Panel className="h-full min-h-0" padding="sm" tone="folder">
            <div className="flex h-full min-h-0 flex-col">
                <div className="mb-3 flex shrink-0 items-start justify-between gap-2 border-b border-rg-border-soft/50 pb-2">
                    <div className="min-w-0">
                        <p className="font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-rg-amber">
                            Evidence
                        </p>

                        <div className="flex items-center gap-2">
                            <h2 className="truncate text-lg font-black tracking-[-0.04em] text-rg-text">
                                File Drawer
                            </h2>

                            <Badge tone="cork">
                                {ticket.evidenceCards.length}
                            </Badge>
                        </div>
                    </div>

                    <Button
                        aria-label="Collapse evidence cabinet"
                        className="h-8 w-8 shrink-0 px-0"
                        onClick={onCollapse}
                        size="sm"
                        title="Collapse evidence cabinet"
                        variant="secondary"
                    >
                        ←
                    </Button>
                </div>

                <div className="rg-scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                    <div className="grid gap-2 pb-2">
                        {controller.evidenceItems.map(
                            (
                                { evidenceCard, isInspected, isPinned },
                                index,
                            ) => (
                                <article
                                    className="min-w-0 cursor-pointer rounded-2xl border border-rg-border-soft bg-rg-surface/78 p-3 shadow-lg shadow-black/20 transition hover:border-rg-amber/60 hover:bg-rg-surface-raised"
                                    key={evidenceCard.id}
                                    onClick={() =>
                                        controller.activateCabinetEvidence(
                                            evidenceCard.id,
                                        )
                                    }
                                    title="Inspect this evidence file."
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="line-clamp-2 font-bold leading-5 text-rg-text">
                                                {evidenceCard.title}
                                            </p>

                                            <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-rg-muted">
                                                {evidenceCard.source}
                                            </p>
                                        </div>

                                        <Badge
                                            tone={
                                                isPinned
                                                    ? "success"
                                                    : isInspected
                                                      ? "warning"
                                                      : "neutral"
                                            }
                                        >
                                            {isPinned
                                                ? "Pinned"
                                                : isInspected
                                                  ? "Seen"
                                                  : `#${index + 1}`}
                                        </Badge>
                                    </div>

                                    <p className="mt-3 line-clamp-2 break-words text-xs leading-5 text-rg-muted">
                                        {evidenceCard.body}
                                    </p>

                                    <div
                                        className="mt-3 flex flex-wrap gap-1.5"
                                        onClick={(event) =>
                                            event.stopPropagation()
                                        }
                                    >
                                        <Button
                                            className="h-8"
                                            onClick={() =>
                                                controller.openEvidencePreview(
                                                    evidenceCard.id,
                                                )
                                            }
                                            size="sm"
                                            title="Inspect evidence file"
                                            variant="secondary"
                                        >
                                            ⌕ Inspect
                                        </Button>

                                        <Button
                                            className="h-8"
                                            disabled={!isInspected || isPinned}
                                            onClick={() =>
                                                onPinEvidence(evidenceCard.id)
                                            }
                                            size="sm"
                                            title={
                                                isPinned
                                                    ? "This evidence is already pinned."
                                                    : isInspected
                                                      ? "Pin this evidence to the board."
                                                      : "Inspect this evidence before pinning it."
                                            }
                                            variant="ghost"
                                        >
                                            {isPinned
                                                ? "Pinned"
                                                : "◇ Pin to Board"}
                                        </Button>
                                    </div>
                                </article>
                            ),
                        )}
                    </div>
                </div>
            </div>
        </Panel>
    );
}

interface InvestigationBoardPanelProps {
    boardViewportRef: RefObject<HTMLDivElement | null>;
    boardWorldRef: RefObject<HTMLDivElement | null>;
    controller: InvestigationController;
}

/**
 * Main cork board area.
 */
function InvestigationBoardPanel({
    boardViewportRef,
    boardWorldRef,
    controller,
}: InvestigationBoardPanelProps) {
    const activeTool = controller.attempt.present.activeTool;
    const [hoveredConnectionId, setHoveredConnectionId] = useState<
        string | null
    >(null);
    const [dragPreviewPositionsByPinnedId, setDragPreviewPositionsByPinnedId] =
        useState<DragPreviewPositionsByPinnedId>({});

    const panStateRef = useRef<BoardPanState | null>(null);
    const [boardPanOffset, setBoardPanOffset] = useState<BoardPanOffset>(
        defaultBoardPanOffset,
    );

    const isBoardPanned =
        boardPanOffset.xPx !== defaultBoardPanOffset.xPx ||
        boardPanOffset.yPx !== defaultBoardPanOffset.yPx;

    const hoveredConnection =
        controller.attempt.present.board.connections.find(
            (connection) => connection.connectionId === hoveredConnectionId,
        ) ?? null;

    /**
     * Stores a temporary card position while Arrange dragging is active.
     *
     * This keeps thread strings visually attached during drag without committing
     * every pointer movement into the reducer or undo history.
     */
    const previewPinnedEvidenceMove = (
        pinnedEvidenceId: string,
        position: BoardPosition,
    ) => {
        setDragPreviewPositionsByPinnedId((currentPositions) => ({
            ...currentPositions,
            [pinnedEvidenceId]: position,
        }));
    };

    /**
     * Clears a temporary Arrange preview after the drag is committed or
     * cancelled.
     */
    const clearPinnedEvidenceMovePreview = (pinnedEvidenceId: string) => {
        setDragPreviewPositionsByPinnedId((currentPositions) => {
            const nextPositions = { ...currentPositions };

            delete nextPositions[pinnedEvidenceId];

            return nextPositions;
        });
    };

    /**
     * Starts a Pan-mode drag from empty board space.
     *
     * Pan is intentionally UI-only. It moves the board viewport, not card
     * coordinates, evidence support, findings, verdicts, or scoring state.
     */
    const handleBoardPanPointerDown = (
        event: ReactPointerEvent<HTMLDivElement>,
    ) => {
        if (activeTool !== "pan") {
            return;
        }

        const targetElement =
            event.target instanceof HTMLElement ? event.target : null;

        if (
            targetElement?.closest(
                "[data-board-pinned-card='true'],button,a,input,textarea,select",
            )
        ) {
            return;
        }

        const viewportElement = boardViewportRef.current;
        const worldElement = boardWorldRef.current;

        if (!viewportElement || !worldElement) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        panStateRef.current = {
            pointerId: event.pointerId,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startOffset: boardPanOffset,
        };

        event.currentTarget.setPointerCapture(event.pointerId);
    };

    /**
     * Updates the board viewport offset while the Pan tool is dragging.
     */
    const handleBoardPanPointerMove = (
        event: ReactPointerEvent<HTMLDivElement>,
    ) => {
        const panState = panStateRef.current;

        if (!panState || panState.pointerId !== event.pointerId) {
            return;
        }

        const viewportElement = boardViewportRef.current;
        const worldElement = boardWorldRef.current;

        if (!viewportElement || !worldElement) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const nextOffset = clampBoardPanOffset(
            {
                xPx:
                    panState.startOffset.xPx +
                    (event.clientX - panState.startClientX),
                yPx:
                    panState.startOffset.yPx +
                    (event.clientY - panState.startClientY),
            },
            viewportElement,
            worldElement,
        );

        setBoardPanOffset(nextOffset);
    };

    /**
     * Ends a Pan-mode drag.
     */
    const handleBoardPanPointerUp = (
        event: ReactPointerEvent<HTMLDivElement>,
    ) => {
        const panState = panStateRef.current;

        if (!panState || panState.pointerId !== event.pointerId) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        panStateRef.current = null;
    };

    /**
     * Cancels a Pan-mode drag without changing the latest viewport offset.
     */
    const handleBoardPanPointerCancel = (
        event: ReactPointerEvent<HTMLDivElement>,
    ) => {
        const panState = panStateRef.current;

        if (!panState || panState.pointerId !== event.pointerId) {
            return;
        }

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        panStateRef.current = null;
    };

    /**
     * Restores the board viewport to the default view.
     */
    const resetBoardPan = () => {
        panStateRef.current = null;
        setBoardPanOffset(defaultBoardPanOffset);
    };

    return (
        <Panel className="h-full min-h-0" padding="sm" tone="cork">
            <div className="flex h-full min-h-0 flex-col">
                <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
                    <div className="min-w-0">
                        <p className="font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-rg-paper-strong">
                            Main Board
                        </p>

                        <h2 className="truncate text-lg font-black tracking-[-0.04em] text-rg-paper-strong">
                            Investigation Board
                        </h2>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        <Badge tone="warning">{activeTool}</Badge>
                        <Badge tone="neutral">
                            {
                                controller.attempt.present.board.pinnedEvidence
                                    .length
                            }{" "}
                            pinned
                        </Badge>
                        <Badge tone="neutral">
                            {
                                controller.attempt.present.board.connections
                                    .length
                            }{" "}
                            links
                        </Badge>

                        <Button
                            className="h-7 px-2 text-[0.65rem]"
                            disabled={!isBoardPanned}
                            onClick={resetBoardPan}
                            size="sm"
                            title="Reset board viewport"
                            variant="secondary"
                        >
                            Reset View
                        </Button>
                    </div>
                </div>

                <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-rg-paper-strong/28 bg-rg-cork-dark/20">
                    <div className="absolute inset-0 opacity-70">
                        <div className="rg-cork-grain h-full w-full" />
                    </div>

                    <div className="relative z-10 h-full min-h-[420px] p-2">
                        <div
                            className={cn(
                                "relative h-full touch-none overflow-hidden rounded-xl border border-dashed border-rg-paper-strong/20 bg-rg-cork-dark/20",
                                activeTool === "pan"
                                    ? "cursor-grab active:cursor-grabbing"
                                    : "",
                            )}
                            onClick={() =>
                                controller.selectPinnedEvidence(null)
                            }
                            onPointerCancel={handleBoardPanPointerCancel}
                            onPointerDown={handleBoardPanPointerDown}
                            onPointerMove={handleBoardPanPointerMove}
                            onPointerUp={handleBoardPanPointerUp}
                            ref={boardViewportRef}
                        >
                            {controller.pinnedBoardItems.length === 0 && (
                                <div className="relative z-10 grid h-full place-items-center">
                                    <div className="max-w-sm rounded-2xl border border-rg-paper-strong/25 bg-rg-cork-dark/50 p-4 text-center shadow-xl shadow-black/25">
                                        <p className="text-base font-black text-rg-paper-strong">
                                            Board is clear
                                        </p>

                                        <p className="mt-2 text-xs leading-5 text-rg-paper-strong/75">
                                            Inspect evidence from the file
                                            drawer, then pin useful clues here.
                                            Open Casework when you are ready to
                                            file a supported finding.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div
                                className="absolute left-0 top-0"
                                data-investigation-board-surface="true"
                                ref={boardWorldRef}
                                style={{
                                    height: `${boardWorldSizePercent}%`,
                                    transform: `translate3d(${boardPanOffset.xPx}px, ${boardPanOffset.yPx}px, 0)`,
                                    width: `${boardWorldSizePercent}%`,
                                }}
                            >
                                <BoardThreadLayer
                                    activeMode={
                                        controller.connectInteraction.activeMode
                                    }
                                    activeTool={activeTool}
                                    connections={
                                        controller.attempt.present.board
                                            .connections
                                    }
                                    hoveredConnectionId={hoveredConnectionId}
                                    onCutConnection={
                                        controller.cutBoardConnection
                                    }
                                    onHoveredConnectionChange={
                                        setHoveredConnectionId
                                    }
                                    pinnedBoardItems={
                                        controller.pinnedBoardItems
                                    }
                                    previewPositionsByPinnedId={
                                        dragPreviewPositionsByPinnedId
                                    }
                                />

                                {controller.pinnedBoardItems.map((item) => {
                                    const isHoveredThreadEndpoint =
                                        Boolean(hoveredConnection) &&
                                        (hoveredConnection?.fromPinnedEvidenceId ===
                                            item.pinnedEvidence
                                                .pinnedEvidenceId ||
                                            hoveredConnection?.toPinnedEvidenceId ===
                                                item.pinnedEvidence
                                                    .pinnedEvidenceId);

                                    const visibleThreadIds = Array.from(
                                        new Set(
                                            controller.attempt.present.board.connections
                                                .filter(
                                                    (connection) =>
                                                        connection.fromPinnedEvidenceId ===
                                                            item.pinnedEvidence
                                                                .pinnedEvidenceId ||
                                                        connection.toPinnedEvidenceId ===
                                                            item.pinnedEvidence
                                                                .pinnedEvidenceId,
                                                )
                                                .map(
                                                    (connection) =>
                                                        connection.threadId,
                                                ),
                                        ),
                                    );

                                    return (
                                        <BoardPinnedEvidenceCard
                                            activeThreadId={
                                                controller.connectInteraction
                                                    .activeThreadId
                                            }
                                            activeTool={activeTool}
                                            evidenceCard={item.evidenceCard}
                                            highlightedThreadId={
                                                isHoveredThreadEndpoint &&
                                                hoveredConnection
                                                    ? hoveredConnection.threadId
                                                    : null
                                            }
                                            isConnectAnchor={
                                                controller.connectInteraction
                                                    .pendingAnchorPinnedEvidenceId ===
                                                item.pinnedEvidence
                                                    .pinnedEvidenceId
                                            }
                                            isSelected={item.isSelected}
                                            key={
                                                item.pinnedEvidence
                                                    .pinnedEvidenceId
                                            }
                                            onActivate={() =>
                                                controller.activatePinnedBoardEvidence(
                                                    item.pinnedEvidence
                                                        .pinnedEvidenceId,
                                                    item.evidenceCard.id,
                                                )
                                            }
                                            onInspect={() =>
                                                controller.openEvidencePreview(
                                                    item.evidenceCard.id,
                                                )
                                            }
                                            onMove={
                                                controller.movePinnedEvidence
                                            }
                                            onMovePreview={
                                                previewPinnedEvidenceMove
                                            }
                                            onMovePreviewEnd={
                                                clearPinnedEvidenceMovePreview
                                            }
                                            onUnpin={() =>
                                                controller.unpinEvidence(
                                                    item.pinnedEvidence
                                                        .pinnedEvidenceId,
                                                )
                                            }
                                            pinnedEvidence={item.pinnedEvidence}
                                            visibleThreadIds={visibleThreadIds}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Panel>
    );
}

interface CaseworkPanelProps {
    controller: InvestigationController;
    document: PagedDocumentController<CaseworkPage>;
    onCollapse: () => void;
    onSubmitReport: () => void;
}

/**
 * Interactive Casework Notebook backed by the shared paged-document lifecycle.
 *
 * All three Notebook pages remain mounted while this panel exists. Casework
 * owns residency, scroll, interaction locking, and physical page motion; the
 * shared pager owns only the logical page-change lifecycle.
 */
function CaseworkPanel({
    controller,
    document,
    onCollapse,
    onSubmitReport,
}: CaseworkPanelProps) {
    /**
     * Advances the logical page lifecycle at Notebook-owned animation
     * boundaries. Child animations are ignored because only the physical page
     * stage is allowed to commit or finish a page turn.
     */
    const handlePageAnimationEnd = (
        event: ReactAnimationEvent<HTMLDivElement>,
    ) => {
        if (event.currentTarget !== event.target) {
            return;
        }

        if (document.phase === "leaving") {
            document.commitPageChange();
            return;
        }

        if (document.phase === "entering") {
            document.finishPageChange();
        }
    };

    return (
        <Panel className="h-full min-h-0" padding="sm" tone="notepad">
            <div className="flex h-full min-h-0 flex-col">
                <div className="mb-2 flex shrink-0 items-start justify-between gap-2 border-b border-rg-border-soft/50 pb-2">
                    <div className="min-w-0">
                        <p className="font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-rg-amber">
                            Casework
                        </p>

                        <div className="flex items-center gap-2">
                            <h2 className="truncate text-lg font-black tracking-[-0.04em] text-rg-text">
                                Notebook
                            </h2>

                            <Badge tone="neutral">
                                {
                                    controller.attempt.present.findings
                                        .filedFindings.length
                                }{" "}
                                filed
                            </Badge>
                        </div>
                    </div>

                    <Button
                        aria-label="Collapse casework drawer"
                        className="h-8 w-8 shrink-0 px-0"
                        disabled={document.isChangingPage}
                        onClick={onCollapse}
                        size="sm"
                        title={
                            document.isChangingPage
                                ? "Finish turning the Notebook page first."
                                : "Collapse casework drawer"
                        }
                        variant="secondary"
                    >
                        →
                    </Button>
                </div>

                <nav
                    aria-label="Casework notebook pages"
                    className="rg-casework-bookmarks mb-3 shrink-0"
                >
                    {caseworkPages.map((page) => {
                        const isCurrentPage =
                            document.currentPageId === page.id;
                        const isSelectedBookmark =
                            document.pendingPageId === page.id ||
                            (document.pendingPageId === null && isCurrentPage);

                        return (
                            <CaseworkBookmarkButton
                                isCurrentPage={isCurrentPage}
                                isPageChanging={document.isChangingPage}
                                isSelected={isSelectedBookmark}
                                key={page.id}
                                label={
                                    page.id === "casework:filed"
                                        ? `${page.label} (${controller.filedFindingItems.length})`
                                        : page.label
                                }
                                onRequestPage={document.requestPage}
                                pageId={page.id}
                            />
                        );
                    })}
                </nav>

                <div
                    aria-busy={document.isChangingPage}
                    className="rg-casework-page-stage rg-notepad-texture min-h-0 flex-1"
                    data-page-direction={document.direction ?? undefined}
                    data-page-phase={document.phase}
                    onAnimationEnd={handlePageAnimationEnd}
                >
                    <CaseworkPageSection
                        isCurrentPage={
                            document.currentPageId === "casework:new"
                        }
                        isPageChanging={document.isChangingPage}
                        pageId="casework:new"
                    >
                        <FindingDraftForm
                            canFileFinding={controller.canFileDraftFinding}
                            draft={controller.attempt.present.findings.draft}
                            findingTypeItems={controller.findingTypeItems}
                            linkableEvidenceItems={
                                controller.linkableEvidenceItems
                            }
                            linkableThreadItems={controller.linkableThreadItems}
                            onDraftChange={controller.updateDraftFinding}
                            onFileFinding={controller.fileDraftFinding}
                            onSelectFindingType={controller.selectFindingType}
                            onToggleEvidence={
                                controller.toggleDraftEvidenceLink
                            }
                            onToggleThread={controller.toggleDraftThreadLink}
                        />
                    </CaseworkPageSection>

                    <CaseworkPageSection
                        isCurrentPage={
                            document.currentPageId === "casework:filed"
                        }
                        isPageChanging={document.isChangingPage}
                        pageId="casework:filed"
                    >
                        <FiledCasework controller={controller} />
                    </CaseworkPageSection>

                    <CaseworkPageSection
                        isCurrentPage={
                            document.currentPageId === "casework:verdict"
                        }
                        isPageChanging={document.isChangingPage}
                        pageId="casework:verdict"
                    >
                        <VerdictDrawer
                            canSubmitReport={controller.canSubmitReport}
                            filedFindingCount={
                                controller.attempt.present.findings
                                    .filedFindings.length
                            }
                            onSelectVerdict={controller.selectVerdict}
                            onSubmitReport={onSubmitReport}
                            selectedVerdict={
                                controller.attempt.present.verdict
                                    .selectedVerdict
                            }
                        />
                    </CaseworkPageSection>
                </div>
            </div>
        </Panel>
    );
}

interface CaseworkBookmarkButtonProps {
    isCurrentPage: boolean;
    isPageChanging: boolean;
    isSelected: boolean;
    label: string;
    onRequestPage: (pageId: string) => void;
    pageId: CaseworkPageId;
}

/**
 * Physical Notebook bookmark used for named direct page navigation.
 *
 * The button stays focusable while a turn is active so the selected bookmark
 * can retain focus. `aria-disabled` communicates the temporary interaction
 * lock, while usePagedDocument remains the final guard against repeated input.
 */
function CaseworkBookmarkButton({
    isCurrentPage,
    isPageChanging,
    isSelected,
    label,
    onRequestPage,
    pageId,
}: CaseworkBookmarkButtonProps) {
    return (
        <button
            aria-current={isCurrentPage ? "page" : undefined}
            aria-disabled={isPageChanging}
            className="rg-casework-bookmark"
            data-selected={isSelected ? "true" : "false"}
            id={getCaseworkBookmarkId(pageId)}
            onClick={() => onRequestPage(pageId)}
            type="button"
        >
            {label}
        </button>
    );
}

interface CaseworkPageSectionProps {
    children: ReactNode;
    isCurrentPage: boolean;
    isPageChanging: boolean;
    pageId: CaseworkPageId;
}

/**
 * One resident Casework Notebook page with its own scroll region.
 *
 * Inactive pages stay mounted so browser-maintained page state, such as scroll
 * position, can survive page visits without moving presentation state into the
 * gameplay reducer. Only the settled current page is interactive and exposed as
 * active content.
 */
function CaseworkPageSection({
    children,
    isCurrentPage,
    isPageChanging,
    pageId,
}: CaseworkPageSectionProps) {
    const isInteractive = isCurrentPage && !isPageChanging;

    return (
        <section
            aria-hidden={!isInteractive}
            aria-labelledby={getCaseworkBookmarkId(pageId)}
            className="rg-casework-page rg-scrollbar-thin h-full min-h-0 overflow-y-auto overscroll-contain pr-1"
            data-casework-page-id={pageId}
            hidden={!isCurrentPage}
            inert={!isInteractive}
            role="region"
        >
            {children}
        </section>
    );
}

/**
 * Returns the DOM ID used to connect a Casework page to its physical bookmark.
 */
function getCaseworkBookmarkId(pageId: CaseworkPageId): string {
    return `casework-bookmark-${pageId.replace("casework:", "")}`;
}
interface FiledCaseworkProps {
    controller: InvestigationController;
}

/**
 * Filed findings tab.
 */
function FiledCasework({ controller }: FiledCaseworkProps) {
    if (controller.filedFindingItems.length === 0) {
        return (
            <EmptyState
                description="File a supported finding from the New tab."
                title="No filed findings"
                tone="paper"
            />
        );
    }

    return (
        <div className="grid gap-2 pb-2">
            {controller.filedFindingItems.map((item) => (
                <FiledFindingCard
                    filedFinding={item.filedFinding}
                    findingType={item.findingType}
                    key={item.filedFinding.filedFindingId}
                    linkedEvidenceCards={item.linkedEvidenceCards}
                    linkedThreadItems={item.linkedThreadItems}
                    onRemove={() =>
                        controller.removeFiledFinding(
                            item.filedFinding.filedFindingId,
                        )
                    }
                />
            ))}
        </div>
    );
}

/**
 * Clamps the board viewport offset so the larger board world cannot be dragged
 * so far that the viewport becomes mostly empty.
 */
function clampBoardPanOffset(
    requestedOffset: BoardPanOffset,
    viewportElement: HTMLElement,
    worldElement: HTMLElement,
): BoardPanOffset {
    const viewportRect = viewportElement.getBoundingClientRect();
    const worldRect = worldElement.getBoundingClientRect();

    const minX = Math.min(0, viewportRect.width - worldRect.width);
    const minY = Math.min(0, viewportRect.height - worldRect.height);

    return {
        xPx: clampNumber(requestedOffset.xPx, minX, 0),
        yPx: clampNumber(requestedOffset.yPx, minY, 0),
    };
}

/**
 * Clamps a number between a lower and upper bound.
 */
function clampNumber(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

/**
 * Creates safe spawn bounds from the currently visible board viewport.
 *
 * The viewport and world rectangles are measured from the DOM, so this works
 * even after the board has been panned with CSS transforms.
 */
function getBoardViewportSpawnBounds(
    viewportElement: HTMLElement | null,
    worldElement: HTMLElement | null,
): BoardSpawnBounds | undefined {
    if (!viewportElement || !worldElement) {
        return undefined;
    }

    const viewportRect = viewportElement.getBoundingClientRect();
    const worldRect = worldElement.getBoundingClientRect();

    if (worldRect.width <= 0 || worldRect.height <= 0) {
        return undefined;
    }

    const visibleLeftPercent =
        ((viewportRect.left - worldRect.left) / worldRect.width) * 100;
    const visibleRightPercent =
        ((viewportRect.right - worldRect.left) / worldRect.width) * 100;
    const visibleTopPercent =
        ((viewportRect.top - worldRect.top) / worldRect.height) * 100;
    const visibleBottomPercent =
        ((viewportRect.bottom - worldRect.top) / worldRect.height) * 100;

    return createCardSafeSpawnBounds({
        minXPercent: visibleLeftPercent,
        maxXPercent: visibleRightPercent,
        minYPercent: visibleTopPercent,
        maxYPercent: visibleBottomPercent,
    });
}

/**
 * Insets visible bounds so spawned card centres stay mostly inside the current
 * viewport instead of appearing clipped at the edges.
 */
function createCardSafeSpawnBounds(bounds: BoardSpawnBounds): BoardSpawnBounds {
    const xInsetPercent = 12;
    const yInsetPercent = 16;

    const minXPercent = clampNumber(bounds.minXPercent + xInsetPercent, 4, 96);
    const maxXPercent = clampNumber(bounds.maxXPercent - xInsetPercent, 4, 96);
    const minYPercent = clampNumber(bounds.minYPercent + yInsetPercent, 4, 96);
    const maxYPercent = clampNumber(bounds.maxYPercent - yInsetPercent, 4, 96);

    if (minXPercent < maxXPercent && minYPercent < maxYPercent) {
        return {
            minXPercent,
            maxXPercent,
            minYPercent,
            maxYPercent,
        };
    }

    const centerXPercent = clampNumber(
        (bounds.minXPercent + bounds.maxXPercent) / 2,
        8,
        92,
    );
    const centerYPercent = clampNumber(
        (bounds.minYPercent + bounds.maxYPercent) / 2,
        8,
        92,
    );

    return {
        minXPercent: clampNumber(centerXPercent - 4, 4, 96),
        maxXPercent: clampNumber(centerXPercent + 4, 4, 96),
        minYPercent: clampNumber(centerYPercent - 4, 4, 96),
        maxYPercent: clampNumber(centerYPercent + 4, 4, 96),
    };
}
