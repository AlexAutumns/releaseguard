import { Link } from "react-router";

import { Badge } from "../../components/ui/Badge";
import { buttonClassName } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Panel } from "../../components/ui/Panel";
import { ScreenShell } from "../../components/ui/ScreenShell";
import { SectionHeader } from "../../components/ui/SectionHeader";
import type {
    FamilyReferenceDefinition,
    ReleaseTicketDefinition,
    ShiftDefinition,
    TicketFamilyDefinition,
} from "../../features/content/content-types";

export interface PlayTicketScreenProps {
    requestedShiftId: string;
    requestedTicketId: string;
    shift?: ShiftDefinition;
    ticket?: ReleaseTicketDefinition;
    family?: TicketFamilyDefinition;
    familyReference?: FamilyReferenceDefinition;
}

/**
 * Placeholder gameplay screen for one ticket.
 *
 * This is not the full gameplay scene yet. It proves that route params can load
 * shift/ticket content from the repository before gameplay state is added.
 */
export function PlayTicketScreen({
    requestedShiftId,
    requestedTicketId,
    shift,
    ticket,
    family,
    familyReference,
}: PlayTicketScreenProps) {
    if (!shift || !ticket) {
        return (
            <ScreenShell
                actions={
                    <Link
                        className={buttonClassName({ variant: "secondary" })}
                        to="/desk"
                    >
                        Back to Desk
                    </Link>
                }
                description="The requested shift or ticket could not be found in the content repository."
                eyebrow="Missing Content"
                title="Ticket not found"
            >
                <EmptyState
                    description={`Requested shift: ${requestedShiftId || "missing"} | Requested ticket: ${requestedTicketId || "missing"}`}
                    title="The selected ticket cannot be loaded"
                />
            </ScreenShell>
        );
    }

    return (
        <ScreenShell
            actions={
                <Link
                    className={buttonClassName({ variant: "ghost" })}
                    to="/desk"
                >
                    Back to Case Desk
                </Link>
            }
            description="Inspect the release context, review the evidence deck, and prepare the case before stamping a verdict."
            eyebrow={shift.title}
            title={ticket.title}
        >
            <div className="grid gap-5 2xl:grid-cols-[0.9fr_1.35fr_0.9fr]">
                <Panel className="min-h-[420px]" tone="notepad">
                    <SectionHeader
                        eyebrow="Ticket Briefing"
                        meta={
                            <Badge tone="info">
                                Difficulty {ticket.difficulty}/5
                            </Badge>
                        }
                        title="Release Context"
                        tone="paper"
                    />

                    <div className="space-y-5 pl-10 text-sm leading-7 text-rg-paper-muted">
                        <p>{ticket.briefing}</p>

                        <div>
                            <p className="font-mono text-xs font-extrabold uppercase tracking-wide text-rg-folder-dark">
                                Product Area
                            </p>
                            <p className="mt-1 font-bold text-rg-paper-ink">
                                {ticket.productArea}
                            </p>
                        </div>

                        <div>
                            <p className="font-mono text-xs font-extrabold uppercase tracking-wide text-rg-folder-dark">
                                Variant Type
                            </p>
                            <p className="mt-1 font-bold text-rg-paper-ink">
                                {ticket.variantKind}
                            </p>
                        </div>
                    </div>
                </Panel>

                <Panel className="min-h-[420px]" tone="paper">
                    <SectionHeader
                        eyebrow="Evidence"
                        meta={
                            <Badge tone="cork">
                                {ticket.evidenceCards.length} card(s)
                            </Badge>
                        }
                        title="Evidence Deck"
                        tone="paper"
                    />

                    <div className="grid gap-3 lg:grid-cols-2">
                        {ticket.evidenceCards.map((evidenceCard) => (
                            <article
                                className="rounded-2xl border border-rg-folder-dark/35 bg-rg-paper-strong/70 p-4 shadow-md shadow-rg-paper-ink/10"
                                key={evidenceCard.id}
                            >
                                <p className="font-black text-rg-paper-ink">
                                    {evidenceCard.title}
                                </p>
                                <p className="mt-1 font-mono text-xs uppercase tracking-[0.14em] text-rg-paper-muted">
                                    {evidenceCard.source}
                                </p>
                                <p className="mt-3 line-clamp-4 text-sm leading-6 text-rg-paper-muted">
                                    {evidenceCard.body}
                                </p>
                            </article>
                        ))}
                    </div>
                </Panel>

                <div className="grid gap-5">
                    <Panel tone="cork">
                        <SectionHeader
                            eyebrow="Board"
                            meta={<Badge tone="neutral">0 pinned</Badge>}
                            title="Pinned Clues"
                        />

                        <EmptyState
                            description="Pinned evidence will appear here once the board interaction is implemented."
                            title="No clues pinned"
                        />
                    </Panel>

                    <Panel tone="raised">
                        <SectionHeader eyebrow="Verdict" title="Stamp Desk" />

                        <p className="text-sm leading-6 text-rg-muted">
                            Verdict stamping will appear here after the gameplay
                            state system is added.
                        </p>
                    </Panel>
                </div>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
                <Panel tone="surface">
                    <SectionHeader
                        eyebrow="Family File"
                        title={family?.title ?? "Missing family"}
                    />

                    <p className="text-sm leading-6 text-rg-muted">
                        {family?.description ??
                            "The ticket family could not be loaded from the content repository."}
                    </p>
                </Panel>

                <Panel tone="surface">
                    <SectionHeader
                        eyebrow="Baseline Reference"
                        title={familyReference?.title ?? "Missing baseline"}
                    />

                    <p className="text-sm leading-6 text-rg-muted">
                        {familyReference?.purpose ??
                            "The baseline reference could not be loaded from the content repository."}
                    </p>
                </Panel>
            </div>
        </ScreenShell>
    );
}
