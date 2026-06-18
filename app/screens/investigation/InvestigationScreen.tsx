import { useState } from "react";
import { Link } from "react-router";

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
import { InvestigationHud } from "./InvestigationHud";
import { InvestigationRail } from "./InvestigationRail";
import { InvestigationToolRack } from "./InvestigationToolRack";
import { InvestigationWorkspaceShell } from "./InvestigationWorkspaceShell";
import type { InvestigationToolId } from "./investigation-ui-types";
import { EvidencePreviewDialog } from "./EvidencePreviewDialog";

export interface InvestigationScreenProps {
    requestedShiftId: string;
    requestedTicketId: string;
    shift?: ShiftDefinition;
    ticket?: ReleaseTicketDefinition;
    family?: TicketFamilyDefinition;
    familyReference?: FamilyReferenceDefinition;
}

/**
 * Active investigation workspace for one ticket.
 *
 * This screen owns workspace layout state such as folded side panels. Gameplay
 * state will be added later through a reducer so layout concerns and gameplay
 * rules stay separated.
 */
export function InvestigationScreen({
    requestedShiftId,
    requestedTicketId,
    shift,
    ticket,
}: InvestigationScreenProps) {
    const [isCabinetOpen, setIsCabinetOpen] = useState(true);
    const [isCaseworkOpen, setIsCaseworkOpen] = useState(true);
    const [activeTool] = useState<InvestigationToolId>("select");
    const [previewEvidenceId, setPreviewEvidenceId] = useState<string | null>(
        null,
    );

    const previewEvidenceCard = ticket?.evidenceCards.find(
        (evidenceCard) => evidenceCard.id === previewEvidenceId,
    );

    if (!shift || !ticket) {
        return (
            <InvestigationWorkspaceShell>
                <div className="flex h-full min-h-0 flex-col">
                    <div className="mb-2 flex shrink-0 justify-between rounded-2xl border border-rg-border bg-rg-surface/92 p-3">
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
                            description={`Requested shift: ${requestedShiftId || "missing"} | Requested ticket: ${requestedTicketId || "missing"}`}
                            title="The investigation desk cannot be opened"
                        />
                    </div>
                </div>
            </InvestigationWorkspaceShell>
        );
    }

    return (
        <InvestigationWorkspaceShell>
            <InvestigationHud shift={shift} ticket={ticket} />

            <div
                className="grid min-h-0 flex-1 gap-2"
                style={{
                    gridTemplateColumns: `${isCabinetOpen ? "minmax(270px, 330px)" : "48px"} minmax(0, 1fr) ${
                        isCaseworkOpen ? "minmax(300px, 360px)" : "48px"
                    }`,
                }}
            >
                {isCabinetOpen ? (
                    <Panel
                        className="h-full min-h-0"
                        padding="sm"
                        tone="folder"
                    >
                        <div className="flex h-full min-h-0 flex-col">
                            <div className="mb-2 flex shrink-0 items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-rg-amber">
                                        Cabinet
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <h2 className="truncate text-lg font-black tracking-[-0.04em] text-rg-text">
                                            Evidence Files
                                        </h2>
                                        <Badge tone="cork">
                                            {ticket.evidenceCards.length}
                                        </Badge>
                                    </div>
                                </div>

                                <Button
                                    aria-label="Collapse evidence cabinet"
                                    className="h-8 w-8 shrink-0 px-0"
                                    onClick={() => setIsCabinetOpen(false)}
                                    size="sm"
                                    title="Collapse evidence cabinet"
                                    variant="secondary"
                                >
                                    ←
                                </Button>
                            </div>

                            <div className="rg-scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                                <div className="grid gap-2 pb-2">
                                    {ticket.evidenceCards.map(
                                        (evidenceCard, index) => (
                                            <article
                                                className="min-w-0 rounded-2xl border border-rg-border-soft bg-rg-surface/78 p-3 shadow-lg shadow-black/20 transition hover:border-rg-amber/60"
                                                key={evidenceCard.id}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="truncate font-bold text-rg-text">
                                                            {evidenceCard.title}
                                                        </p>
                                                        <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-rg-faint">
                                                            {
                                                                evidenceCard.source
                                                            }
                                                        </p>
                                                    </div>

                                                    <Badge tone="neutral">
                                                        #{index + 1}
                                                    </Badge>
                                                </div>

                                                <p className="mt-3 line-clamp-3 break-words text-xs leading-5 text-rg-muted">
                                                    {evidenceCard.body}
                                                </p>

                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    <Button
                                                        className="h-8"
                                                        onClick={() =>
                                                            setPreviewEvidenceId(
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
                                                        disabled
                                                        className="h-8"
                                                        size="sm"
                                                        title="Pinning is added with gameplay state."
                                                        variant="ghost"
                                                    >
                                                        ◇ Pin
                                                    </Button>
                                                </div>
                                            </article>
                                        ),
                                    )}
                                </div>
                            </div>
                        </div>
                    </Panel>
                ) : (
                    <InvestigationRail
                        icon="▤"
                        label="Files"
                        meta={
                            <Badge tone="cork">
                                {ticket.evidenceCards.length}
                            </Badge>
                        }
                        onOpen={() => setIsCabinetOpen(true)}
                        side="left"
                    />
                )}

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
                                <Badge tone="neutral">0 pinned</Badge>
                                <Badge tone="neutral">0 links</Badge>
                            </div>
                        </div>

                        <div className="relative min-h-0 flex-1 overflow-hidden rounded-3xl border border-rg-paper-strong/28 bg-rg-cork-dark/20">
                            <div className="absolute inset-0 opacity-70">
                                <div className="rg-cork-grain h-full w-full" />
                            </div>

                            <div className="relative z-10 h-full min-h-[420px] p-2">
                                <div className="grid h-full place-items-center rounded-2xl border border-dashed border-rg-paper-strong/20 bg-rg-cork-dark/20">
                                    <div className="max-w-sm rounded-2xl border border-rg-paper-strong/25 bg-rg-cork-dark/50 p-4 text-center shadow-xl shadow-black/25">
                                        <p className="text-base font-black text-rg-paper-strong">
                                            Board is clear
                                        </p>
                                        <p className="mt-2 text-xs leading-5 text-rg-paper-strong/75">
                                            Inspect evidence from the cabinet,
                                            then pin selected clues here. Fold
                                            side panels to gain more board
                                            space.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Panel>

                {isCaseworkOpen ? (
                    <div className="grid h-full min-h-0 grid-rows-[1fr_auto] gap-2">
                        <Panel className="min-h-0" padding="sm" tone="notepad">
                            <div className="flex h-full min-h-0 flex-col">
                                <div className="mb-2 flex shrink-0 items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-rg-folder-dark">
                                            Notebook
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <h2 className="truncate text-lg font-black tracking-[-0.04em] text-rg-paper-ink">
                                                Findings
                                            </h2>
                                            <Badge tone="neutral">
                                                0 filed
                                            </Badge>
                                        </div>
                                    </div>

                                    <Button
                                        aria-label="Collapse casework drawer"
                                        className="h-8 w-8 shrink-0 px-0"
                                        onClick={() => setIsCaseworkOpen(false)}
                                        size="sm"
                                        title="Collapse notebook and verdict drawer"
                                        variant="secondary"
                                    >
                                        →
                                    </Button>
                                </div>

                                <div className="rg-scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain pl-7 pr-1">
                                    <EmptyState
                                        description="Filed findings will appear here once evidence has been reviewed."
                                        title="No findings filed"
                                        tone="paper"
                                    />
                                </div>
                            </div>
                        </Panel>

                        <Panel padding="sm" tone="danger">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <div>
                                    <p className="font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-rg-amber">
                                        Verdict
                                    </p>
                                    <h2 className="text-lg font-black tracking-[-0.04em] text-rg-text">
                                        Stamp Drawer
                                    </h2>
                                </div>

                                <Badge tone="danger">Unstamped</Badge>
                            </div>

                            <p className="text-xs leading-5 text-rg-muted">
                                Hold the verdict until the board and findings
                                support the decision.
                            </p>

                            <div className="mt-3 grid grid-cols-2 gap-1.5">
                                <Button
                                    disabled
                                    className="h-8"
                                    size="sm"
                                    variant="secondary"
                                >
                                    Ship
                                </Button>
                                <Button
                                    disabled
                                    className="h-8"
                                    size="sm"
                                    variant="secondary"
                                >
                                    Watch
                                </Button>
                                <Button
                                    disabled
                                    className="h-8"
                                    size="sm"
                                    variant="secondary"
                                >
                                    Hold
                                </Button>
                                <Button
                                    disabled
                                    className="h-8"
                                    size="sm"
                                    variant="stamp"
                                >
                                    Block
                                </Button>
                            </div>
                        </Panel>
                    </div>
                ) : (
                    <InvestigationRail
                        icon="▥"
                        label="Casework"
                        meta={<Badge tone="warning">0</Badge>}
                        onOpen={() => setIsCaseworkOpen(true)}
                        side="right"
                    />
                )}
            </div>

            <InvestigationToolRack activeTool={activeTool} />

            <EvidencePreviewDialog
                evidenceCard={previewEvidenceCard}
                isOpen={Boolean(previewEvidenceCard)}
                onClose={() => setPreviewEvidenceId(null)}
            />
        </InvestigationWorkspaceShell>
    );
}
