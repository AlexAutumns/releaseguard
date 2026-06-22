import { useState } from "react";
import { Link } from "react-router";

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

type CaseworkTab = "new-finding" | "filed" | "verdict";

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
    const [activeCaseworkTab, setActiveCaseworkTab] =
        useState<CaseworkTab>("new-finding");

    const controller = useInvestigationController({ shift, ticket });

    const previewIsPinned = controller.previewEvidenceCard
        ? controller.evidenceItems.some(
              (item) =>
                  item.evidenceCard.id === controller.previewEvidenceCard?.id &&
                  item.isPinned,
          )
        : false;

    const openCabinet = () => {
        setIsCabinetOpen(true);
        setIsCaseworkOpen(false);
    };

    const openCasework = (tab: CaseworkTab = activeCaseworkTab) => {
        setActiveCaseworkTab(tab);
        setIsCaseworkOpen(true);
        setIsCabinetOpen(false);
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

                <InvestigationBoardPanel controller={controller} />

                {isCaseworkOpen ? (
                    <CaseworkPanel
                        activeTab={activeCaseworkTab}
                        controller={controller}
                        onCollapse={() => setIsCaseworkOpen(false)}
                        onSelectTab={setActiveCaseworkTab}
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
                        onOpen={() => openCasework("new-finding")}
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
                onPinToBoard={controller.pinPreviewEvidence}
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
                                                controller.pinEvidence(
                                                    evidenceCard.id,
                                                )
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
    controller: InvestigationController;
}

/**
 * Main cork board area.
 */
function InvestigationBoardPanel({ controller }: InvestigationBoardPanelProps) {
    const activeTool = controller.attempt.present.activeTool;
    const [hoveredConnectionId, setHoveredConnectionId] = useState<
        string | null
    >(null);

    const hoveredConnection =
        controller.attempt.present.board.connections.find(
            (connection) => connection.connectionId === hoveredConnectionId,
        ) ?? null;

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

                    <div className="flex shrink-0 flex-wrap gap-1.5">
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
                    </div>
                </div>

                <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-rg-paper-strong/28 bg-rg-cork-dark/20">
                    <div className="absolute inset-0 opacity-70">
                        <div className="rg-cork-grain h-full w-full" />
                    </div>

                    <div className="relative z-10 h-full min-h-[420px] p-2">
                        <div
                            className="relative h-full overflow-hidden rounded-xl border border-dashed border-rg-paper-strong/20 bg-rg-cork-dark/20"
                            onClick={() =>
                                controller.selectPinnedEvidence(null)
                            }
                        >
                            <BoardThreadLayer
                                activeMode={
                                    controller.connectInteraction.activeMode
                                }
                                activeTool={activeTool}
                                connections={
                                    controller.attempt.present.board.connections
                                }
                                hoveredConnectionId={hoveredConnectionId}
                                onCutConnection={controller.cutBoardConnection}
                                onHoveredConnectionChange={
                                    setHoveredConnectionId
                                }
                                pinnedBoardItems={controller.pinnedBoardItems}
                            />

                            {controller.pinnedBoardItems.length === 0 ? (
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
                            ) : (
                                controller.pinnedBoardItems.map((item) => {
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
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Panel>
    );
}

interface CaseworkPanelProps {
    activeTab: CaseworkTab;
    controller: InvestigationController;
    onCollapse: () => void;
    onSelectTab: (tab: CaseworkTab) => void;
}

/**
 * Casework panel for structured findings and verdict selection.
 */
function CaseworkPanel({
    activeTab,
    controller,
    onCollapse,
    onSelectTab,
}: CaseworkPanelProps) {
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
                        onClick={onCollapse}
                        size="sm"
                        title="Collapse casework drawer"
                        variant="secondary"
                    >
                        →
                    </Button>
                </div>

                <div className="mb-3 grid shrink-0 grid-cols-3 gap-1">
                    <CaseworkTabButton
                        isActive={activeTab === "new-finding"}
                        label="New"
                        onClick={() => onSelectTab("new-finding")}
                    />

                    <CaseworkTabButton
                        isActive={activeTab === "filed"}
                        label={`Filed (${controller.filedFindingItems.length})`}
                        onClick={() => onSelectTab("filed")}
                    />

                    <CaseworkTabButton
                        isActive={activeTab === "verdict"}
                        label="Verdict"
                        onClick={() => onSelectTab("verdict")}
                    />
                </div>

                <div className="rg-scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                    {activeTab === "new-finding" && (
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
                    )}

                    {activeTab === "filed" && (
                        <FiledCasework controller={controller} />
                    )}

                    {activeTab === "verdict" && (
                        <VerdictDrawer
                            filedFindingCount={
                                controller.attempt.present.findings
                                    .filedFindings.length
                            }
                            onSelectVerdict={controller.selectVerdict}
                            selectedVerdict={
                                controller.attempt.present.verdict
                                    .selectedVerdict
                            }
                        />
                    )}
                </div>
            </div>
        </Panel>
    );
}

interface CaseworkTabButtonProps {
    isActive: boolean;
    label: string;
    onClick: () => void;
}

/**
 * Simple casework tab button.
 */
function CaseworkTabButton({
    isActive,
    label,
    onClick,
}: CaseworkTabButtonProps) {
    return (
        <button
            className={cn(
                "rounded-xl border px-2 py-2 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rg-amber",
                isActive
                    ? "border-rg-amber bg-rg-amber text-rg-night"
                    : "border-rg-border-soft bg-rg-surface-raised text-rg-text hover:border-rg-amber/70 hover:bg-rg-surface-soft",
            )}
            onClick={onClick}
            type="button"
        >
            {label}
        </button>
    );
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
