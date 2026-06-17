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
                <>
                    <Link
                        className={buttonClassName({ variant: "ghost" })}
                        to="/desk"
                    >
                        Back to Desk
                    </Link>
                    <Link
                        className={buttonClassName({ variant: "secondary" })}
                        to="/results/ticket/demo-attempt"
                    >
                        Preview Result Route
                    </Link>
                </>
            }
            description="This placeholder confirms the gameplay route can load shift, ticket, family, and baseline content."
            eyebrow={shift.title}
            title={ticket.title}
        >
            <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
                <Panel tone="strong">
                    <SectionHeader
                        eyebrow="Ticket Briefing"
                        meta={
                            <Badge tone="info">
                                Difficulty {ticket.difficulty}/5
                            </Badge>
                        }
                        title="Release Context"
                    />

                    <p className="text-base leading-8 text-rg-muted">
                        {ticket.briefing}
                    </p>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-rg-folder bg-rg-paper p-4">
                            <p className="text-xs font-extrabold uppercase tracking-wide text-rg-muted">
                                Product Area
                            </p>
                            <p className="mt-1 font-bold text-rg-ink">
                                {ticket.productArea}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-rg-folder bg-rg-paper p-4">
                            <p className="text-xs font-extrabold uppercase tracking-wide text-rg-muted">
                                Variant Type
                            </p>
                            <p className="mt-1 font-bold text-rg-ink">
                                {ticket.variantKind}
                            </p>
                        </div>
                    </div>
                </Panel>

                <Panel tone="paper">
                    <SectionHeader
                        eyebrow="Content Links"
                        title="Family and Baseline"
                    />

                    <div className="grid gap-4">
                        <div>
                            <p className="text-xs font-extrabold uppercase tracking-wide text-rg-muted">
                                Ticket Family
                            </p>
                            <p className="mt-1 font-bold text-rg-ink">
                                {family?.title ?? "Missing family"}
                            </p>
                            {family?.description && (
                                <p className="mt-2 text-sm leading-6 text-rg-muted">
                                    {family.description}
                                </p>
                            )}
                        </div>

                        <div>
                            <p className="text-xs font-extrabold uppercase tracking-wide text-rg-muted">
                                Baseline Reference
                            </p>
                            <p className="mt-1 font-bold text-rg-ink">
                                {familyReference?.title ??
                                    "Missing baseline reference"}
                            </p>
                            {familyReference?.purpose && (
                                <p className="mt-2 text-sm leading-6 text-rg-muted">
                                    {familyReference.purpose}
                                </p>
                            )}
                        </div>
                    </div>
                </Panel>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-3">
                <Panel tone="paper">
                    <SectionHeader
                        eyebrow="Evidence"
                        meta={
                            <Badge tone="cork">
                                {ticket.evidenceCards.length} card(s)
                            </Badge>
                        }
                        title="Evidence Deck"
                    />

                    <ul className="grid gap-3">
                        {ticket.evidenceCards.map((evidenceCard) => (
                            <li
                                className="rounded-2xl border border-rg-folder bg-rg-paper-strong p-4"
                                key={evidenceCard.id}
                            >
                                <p className="font-black text-rg-ink">
                                    {evidenceCard.title}
                                </p>
                                <p className="mt-1 text-sm text-rg-muted">
                                    {evidenceCard.source}
                                </p>
                            </li>
                        ))}
                    </ul>
                </Panel>

                <Panel tone="paper">
                    <SectionHeader
                        eyebrow="Answer Key"
                        meta={
                            <Badge tone="warning">
                                {ticket.expectedFindings.length} finding(s)
                            </Badge>
                        }
                        title="Expected Findings"
                    />

                    <p className="text-sm leading-6 text-rg-muted">
                        Gameplay scoring will use these expected findings later.
                        They are shown here only while the route skeleton is
                        being verified.
                    </p>
                </Panel>

                <Panel tone="warning">
                    <SectionHeader
                        eyebrow="Next Build"
                        title="Gameplay State"
                    />

                    <p className="text-sm leading-6 text-rg-muted">
                        Build 001D will add the ticket attempt reducer. Build
                        001E will add evidence, board, notebook, and verdict
                        components.
                    </p>
                </Panel>
            </div>
        </ScreenShell>
    );
}
