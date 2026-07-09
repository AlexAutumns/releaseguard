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

import {
    Archive,
    ChevronLeft,
    ChevronRight,
    NotepadText,
    Pin,
    ScanSearch,
} from "lucide-react";

import type {
    EvidenceType,
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
                className="rg-investigation-workspace-grid grid min-h-0 flex-1 gap-2"
                style={{
                    gridTemplateColumns: getWorkspaceGridColumns({
                        isCabinetOpen,
                        isCaseworkOpen,
                    }),
                }}
            >
                <div
                    className="rg-investigation-fold-slot"
                    data-open={isCabinetOpen ? "true" : "false"}
                    data-side="left"
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
                            disabled={caseworkDocument.isChangingPage}
                            icon={Archive}
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
                </div>

                <InvestigationBoardPanel
                    boardViewportRef={boardViewportRef}
                    boardWorldRef={boardWorldRef}
                    controller={controller}
                />

                <div
                    className="rg-investigation-fold-slot"
                    data-open={isCaseworkOpen ? "true" : "false"}
                    data-side="right"
                >
                    {isCaseworkOpen ? (
                        <CaseworkPanel
                            controller={controller}
                            document={caseworkDocument}
                            onCollapse={collapseCasework}
                            onSubmitReport={submitTicketReport}
                        />
                    ) : (
                        <InvestigationRail
                            icon={NotepadText}
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
 * Returns fluid, capped workspace columns for the current drawer state.
 *
 * Open side furniture narrows on laptop-sized viewports and caps on wider
 * desktops so the Board receives additional horizontal space. Collapsed work
 * areas keep the existing narrow spine width.
 */
function getWorkspaceGridColumns({
    isCabinetOpen,
    isCaseworkOpen,
}: WorkspaceGridColumnsInput): string {
    const cabinetColumn = isCabinetOpen ? "clamp(19rem, 27vw, 27rem)" : "48px";

    const caseworkColumn = isCaseworkOpen
        ? "clamp(20rem, 31vw, 32.5rem)"
        : "48px";

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
 * Human-readable labels for the authored evidence-file register.
 */
const evidenceFileTypeLabelById: Record<EvidenceType, string> = {
    "qa-note": "QA Note",
    "pull-request-comment": "PR Comment",
    "support-ticket": "Support Record",
    "release-note": "Release Note",
};

const evidenceDrawerClassName = [
    "rg-investigation-major-object relative h-full min-h-0 overflow-hidden",
    "rounded-[0.48rem] border border-[rgb(75_46_28_/_88%)] p-3",
    "bg-[linear-gradient(90deg,rgb(241_211_165_/_3%),transparent_17%,transparent_82%,rgb(12_8_6_/_25%)),linear-gradient(180deg,rgb(76_45_27),rgb(46_28_19)_62%,rgb(31_20_15))]",
    "shadow-[inset_0_1px_0_rgb(245_222_186_/_5%),inset_-0.5rem_0_1rem_rgb(17_10_7_/_20%),0.45rem_0.7rem_1.5rem_rgb(0_0_0_/_28%)]",
    "before:pointer-events-none before:absolute before:inset-0 before:z-0",
    "before:bg-[linear-gradient(92deg,transparent_0_21%,rgb(228_189_133_/_3%)_21.4%,transparent_22%),linear-gradient(87deg,transparent_0_69%,rgb(18_10_7_/_6%)_69.5%,transparent_70%)]",
    "before:content-['']",
].join(" ");

const evidenceFileSlipClassName = [
    "relative min-w-0 overflow-hidden rounded-[0.2rem]",
    "border border-[rgb(70_44_25_/_58%)] text-rg-paper-ink",
    "bg-[radial-gradient(ellipse_at_12%_8%,rgb(255_247_218_/_12%),transparent_34%),radial-gradient(circle_at_81%_72%,rgb(65_39_22_/_5%)_0_0.7px,transparent_1.1px),linear-gradient(145deg,rgb(216_194_151),rgb(196_164_113)_63%,rgb(174_132_82))]",
    "bg-[length:100%_100%,113px_101px,100%_100%]",
    "shadow-[0.18rem_0.28rem_0.55rem_rgb(0_0_0_/_22%),inset_0_1px_0_rgb(255_255_255_/_11%)]",
    "transition-[transform,border-color,box-shadow] duration-[var(--rg-motion-control)] ease-[var(--rg-ease-out)]",
    "before:absolute before:left-[1.05rem] before:top-[-1px] before:z-[2] before:h-[0.4rem] before:w-[1.8rem]",
    "before:rounded-b-[0.2rem] before:border before:border-t-0 before:border-[rgb(35_24_17_/_72%)]",
    "before:bg-[linear-gradient(180deg,rgb(91_72_53),rgb(46_35_26))] before:shadow-[0_0.12rem_0.22rem_rgb(0_0_0_/_22%)] before:content-['']",
    "hover:-translate-y-px hover:border-[rgb(112_72_37_/_78%)] hover:shadow-[0.24rem_0.38rem_0.7rem_rgb(0_0_0_/_26%),inset_0_1px_0_rgb(255_255_255_/_12%)]",
].join(" ");

const evidenceFileActionClassName = [
    "inline-flex min-h-[1.4rem] items-center justify-center gap-1",
    "rounded-[0.14rem] border border-[rgb(72_46_27_/_50%)] px-1.5 py-0.5",
    "bg-[rgb(75_48_28_/_6%)] font-case font-bold uppercase leading-none tracking-[0.025em] text-[rgb(54_35_22_/_92%)]",
    "transition-[transform,border-color,background-color,color] duration-[var(--rg-motion-control)] ease-[var(--rg-ease-out)]",
    "hover:not-disabled:-translate-y-px hover:not-disabled:border-[rgb(111_68_34_/_78%)] hover:not-disabled:bg-[rgb(75_48_28_/_12%)]",
    "active:not-disabled:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rg-stamp-dark",
    "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");

/**
 * Shallow evidence-file drawer for the current ticket.
 *
 * This component owns its one-off physical composition through Tailwind. The
 * fixed header remains outside the drawer's only vertical scroll owner, while
 * stable FILE numbers stay separate from live UNSEEN / SEEN / PINNED state.
 */
function EvidenceCabinetPanel({
    controller,
    onCollapse,
    onPinEvidence,
    ticket,
}: EvidenceCabinetPanelProps) {
    return (
        <section className={evidenceDrawerClassName}>
            <div className="relative z-10 flex h-full min-h-0 flex-col">
                <header className="mb-2 flex shrink-0 items-start justify-between gap-2 border-b border-rg-border-soft/55 pb-2">
                    <div className="min-w-0">
                        <p className="font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-rg-amber">
                            Evidence
                        </p>

                        <div className="flex items-center gap-2">
                            <h2 className="truncate text-lg font-black tracking-[-0.04em] text-rg-text">
                                File Drawer
                            </h2>

                            <span className="inline-flex min-h-[1.45rem] items-center rounded-[0.12rem] border border-rg-amber/40 px-1.5 pb-[0.15rem] pt-0.5 font-mono text-[0.55rem] font-extrabold uppercase leading-none tracking-[0.08em] text-[rgb(229_203_158_/_78%)]">
                                {ticket.evidenceCards.length} files
                            </span>
                        </div>
                    </div>

                    <Button
                        aria-label="Collapse evidence drawer"
                        className="h-8 w-8 shrink-0 px-0 text-rg-amber"
                        onClick={onCollapse}
                        size="sm"
                        title="Collapse evidence drawer"
                        variant="secondary"
                    >
                        <ChevronLeft
                            aria-hidden="true"
                            className="h-4 w-4 shrink-0"
                            strokeWidth={2.3}
                        />
                    </Button>
                </header>

                <div className="rg-scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[0.24rem] border border-[rgb(20_12_9_/_76%)] bg-[linear-gradient(90deg,rgb(255_233_190_/_2%),transparent_20%),linear-gradient(180deg,rgb(28_18_13),rgb(17_12_9))] shadow-[inset_0_0.55rem_0.9rem_rgb(0_0_0_/_34%),inset_0_0_0_1px_rgb(244_212_164_/_3%)]">
                    <div className="grid gap-3 px-3.5 py-2.5">
                        {controller.evidenceItems.map(
                            (
                                { evidenceCard, isInspected, isPinned },
                                index,
                            ) => {
                                const fileNumber = String(index + 1).padStart(
                                    2,
                                    "0",
                                );
                                const fileState = isPinned
                                    ? "pinned"
                                    : isInspected
                                      ? "seen"
                                      : "unseen";
                                const fileStateClassName =
                                    fileState === "pinned"
                                        ? "border-[rgb(76_104_52_/_72%)] text-[rgb(56_85_37_/_96%)]"
                                        : fileState === "seen"
                                          ? "border-[rgb(132_88_37_/_66%)] text-[rgb(104_66_26_/_92%)]"
                                          : "border-[rgb(73_47_27_/_44%)] text-[rgb(68_44_27_/_70%)]";

                                return (
                                    <article
                                        className={evidenceFileSlipClassName}
                                        data-state={fileState}
                                        key={evidenceCard.id}
                                    >
                                        <button
                                            className="block w-full min-w-0 px-3 pb-2.5 pt-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-rg-stamp-dark"
                                            onClick={() =>
                                                controller.activateCabinetEvidence(
                                                    evidenceCard.id,
                                                )
                                            }
                                            title="Inspect this evidence file."
                                            type="button"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="font-mono text-[0.58rem] font-extrabold uppercase leading-none tracking-[0.1em] text-[rgb(63_40_23_/_74%)]">
                                                    File {fileNumber}
                                                </span>

                                                <span
                                                    className={cn(
                                                        "inline-flex min-h-[1.3rem] items-center rounded-[0.08rem] border px-[0.36rem] pb-[0.15rem] pt-0.5 font-case text-[0.54rem] font-bold uppercase leading-none tracking-[0.07em]",
                                                        fileStateClassName,
                                                    )}
                                                >
                                                    {fileState}
                                                </span>
                                            </div>

                                            <p className="mt-2 line-clamp-2 font-case text-sm font-bold leading-5 text-rg-paper-ink">
                                                {evidenceCard.title}
                                            </p>

                                            <div className="mt-1.5 flex min-w-0 items-center justify-between gap-2 border-b border-rg-folder-dark/25 pb-1.5">
                                                <span className="min-w-0 truncate font-mono text-[0.57rem] font-bold uppercase tracking-[0.1em] text-rg-paper-ink/65">
                                                    {evidenceCard.source}
                                                </span>

                                                <span className="shrink-0 font-case text-[0.58rem] font-bold uppercase tracking-[0.06em] text-rg-paper-ink/70">
                                                    {
                                                        evidenceFileTypeLabelById[
                                                            evidenceCard.type
                                                        ]
                                                    }
                                                </span>
                                            </div>

                                            <p className="mt-2 line-clamp-2 break-words font-case text-xs font-bold leading-5 text-rg-paper-ink/72">
                                                {evidenceCard.body}
                                            </p>
                                        </button>

                                        <footer className="flex items-center justify-between gap-2 border-t border-rg-folder-dark/28 px-3 py-2 text-[0.7rem]">
                                            <button
                                                className={
                                                    evidenceFileActionClassName
                                                }
                                                onClick={() =>
                                                    controller.openEvidencePreview(
                                                        evidenceCard.id,
                                                    )
                                                }
                                                title="Inspect evidence file"
                                                type="button"
                                            >
                                                <ScanSearch
                                                    aria-hidden="true"
                                                    className="h-3 w-3"
                                                    strokeWidth={2.1}
                                                />
                                                Inspect
                                            </button>

                                            <button
                                                className={cn(
                                                    evidenceFileActionClassName,
                                                    !isPinned &&
                                                        "text-[rgb(96_57_27_/_96%)]",
                                                )}
                                                disabled={
                                                    !isInspected || isPinned
                                                }
                                                onClick={() =>
                                                    onPinEvidence(
                                                        evidenceCard.id,
                                                    )
                                                }
                                                title={
                                                    isPinned
                                                        ? "This evidence is already pinned."
                                                        : isInspected
                                                          ? "Pin this evidence to the Board."
                                                          : "Inspect this evidence before pinning it."
                                                }
                                                type="button"
                                            >
                                                <Pin
                                                    aria-hidden="true"
                                                    className="h-3 w-3"
                                                    strokeWidth={2.1}
                                                />

                                                {isPinned
                                                    ? "Pinned"
                                                    : "Pin to Board"}
                                            </button>
                                        </footer>
                                    </article>
                                );
                            },
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

interface InvestigationBoardPanelProps {
    boardViewportRef: RefObject<HTMLDivElement | null>;
    boardWorldRef: RefObject<HTMLDivElement | null>;
    controller: InvestigationController;
}

/**
 * Main cork-board viewport for pinned evidence and Evidence Threads.
 *
 * The frame and cork are physical presentation only. Board coordinates, Pan,
 * Arrange, thread geometry, and attempt state remain owned by the existing
 * gameplay/controller layers.
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
        <Panel
            className="rg-investigation-major-object h-full min-h-0"
            padding="sm"
            tone="wood"
        >
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

                <div className="rg-board-frame rg-investigation-board-frame relative min-h-0 flex-1 overflow-hidden">
                    <div className="relative z-10 h-full min-h-0 p-2">
                        <div
                            className={cn(
                                "rg-board-cork-surface rg-investigation-board-viewport relative h-full touch-none overflow-hidden",
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
                                <div className="pointer-events-none relative z-10 grid h-full place-items-center p-4">
                                    <section
                                        aria-label="Board start instructions"
                                        className="rg-board-start-slip"
                                    >
                                        <p className="rg-board-start-slip__kicker">
                                            Board Start
                                        </p>

                                        <ol className="rg-board-start-slip__steps">
                                            <li>
                                                <span>01</span>
                                                Inspect a file from the drawer.
                                            </li>

                                            <li>
                                                <span>02</span>
                                                Pin useful release evidence.
                                            </li>

                                            <li>
                                                <span>03</span>
                                                File a supported finding in
                                                Casework.
                                            </li>
                                        </ol>
                                    </section>
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
 * Interactive Casework Notepad backed by the shared paged-document lifecycle.
 *
 * All three Notepad pages remain mounted while this panel exists. Casework
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
     * Advances the logical page lifecycle at Notepad-owned animation
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
        <section className="rg-casework-notepad-shell rg-investigation-major-object h-full min-h-0 p-3">
            <div className="flex h-full min-h-0 flex-col">
                <div className="mb-2 flex shrink-0 items-start justify-between gap-2 border-b border-rg-border-soft/50 pb-2">
                    <div className="min-w-0">
                        <p className="font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-rg-amber">
                            Casework
                        </p>

                        <div className="flex items-center gap-2">
                            <h2 className="truncate text-lg font-black tracking-[-0.04em] text-rg-text">
                                Notepad
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
                        className="h-8 w-8 shrink-0 px-0 text-rg-amber"
                        disabled={document.isChangingPage}
                        onClick={onCollapse}
                        size="sm"
                        title={
                            document.isChangingPage
                                ? "Finish turning the Notepad page first."
                                : "Collapse casework drawer"
                        }
                        variant="secondary"
                    >
                        <ChevronRight
                            aria-hidden="true"
                            className="h-4 w-4 shrink-0"
                            strokeWidth={2.3}
                        />
                    </Button>
                </div>

                <nav
                    aria-label="Casework notepad sections"
                    className="rg-casework-bookmarks relative z-20 -mb-px shrink-0 pl-3"
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
                    className="rg-casework-page-stage min-h-0 flex-1"
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
        </section>
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
 * Physical Notepad index tab used for named section navigation.
 *
 * The button stays focusable while a turn is active so the selected tab can
 * retain focus. `aria-disabled` communicates the temporary interaction lock,
 * while usePagedDocument remains the final guard against repeated input.
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
 * One resident Casework Notepad page with its own scroll region.
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
            className="rg-casework-page rg-scrollbar-thin h-full min-h-0 overflow-y-auto overscroll-contain"
            data-casework-page-id={pageId}
            hidden={!isCurrentPage}
            inert={!isInteractive}
            role="region"
        >
            <div className="rg-casework-sheet rg-notepad-texture min-h-full px-2 pb-3 pr-2 pt-2">
                {children}
            </div>
        </section>
    );
}

/**
 * Returns the DOM ID used to connect a Casework page to its physical index tab.
 */
function getCaseworkBookmarkId(pageId: CaseworkPageId): string {
    return `casework-bookmark-${pageId.replace("casework:", "")}`;
}
interface FiledCaseworkProps {
    controller: InvestigationController;
}

/**
 * Filed findings ledger for the current ticket attempt.
 *
 * Filed support remains immutable snapshot data from the controller. This page
 * only resolves the saved finding records into a paper-ledger presentation.
 */
function FiledCasework({ controller }: FiledCaseworkProps) {
    return (
        <section className="grid gap-5 pb-6 pt-4 text-rg-paper-ink">
            <header className="border-b-[3px] border-rg-folder-dark/55 pb-4">
                <p className="font-case text-[0.68rem] font-bold uppercase tracking-[0.12em] text-rg-paper-ink/80">
                    Case Ledger / Filed Findings
                </p>

                <h3 className="mt-1 font-case text-lg font-bold leading-5 text-rg-paper-ink">
                    Filed Case Records
                </h3>

                <p className="mt-3 font-case text-xs font-bold leading-5 text-rg-paper-ink/80">
                    Filed findings preserve the evidence and Evidence Thread
                    support recorded at filing time.
                </p>
            </header>

            {controller.filedFindingItems.length === 0 ? (
                <section className="rg-casework-filed-empty border-y-2 border-rg-folder-dark/35 py-6">
                    <p className="font-case text-sm font-bold text-rg-paper-ink">
                        No filed findings.
                    </p>

                    <p className="mt-1 font-case text-xs font-bold leading-5 text-rg-paper-ink/72">
                        Complete a supported finding in the New section. Filed
                        case records will be entered here.
                    </p>
                </section>
            ) : (
                <div className="rg-casework-filed-ledger grid">
                    {controller.filedFindingItems.map((item, index) => (
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
                            sequenceNumber={index + 1}
                        />
                    ))}
                </div>
            )}
        </section>
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
