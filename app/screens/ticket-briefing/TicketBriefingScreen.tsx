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

export interface TicketBriefingScreenProps {
    requestedShiftId: string;
    requestedTicketId: string;
    shift?: ShiftDefinition;
    ticket?: ReleaseTicketDefinition;
    family?: TicketFamilyDefinition;
    familyReference?: FamilyReferenceDefinition;
}

/**
 * Pre-investigation briefing screen for one release ticket.
 *
 * This screen lets the player read the ticket context before entering the full
 * investigation desk. It should not contain the board, notebook, or verdict UI.
 */
export function TicketBriefingScreen({
    requestedShiftId,
    requestedTicketId,
    shift,
    ticket,
    family,
    familyReference,
}: TicketBriefingScreenProps) {
    if (!shift || !ticket) {
        return (
            <ScreenShell
                actions={
                    <Link
                        className={buttonClassName({ variant: "secondary" })}
                        to="/desk"
                    >
                        Back to Case Desk
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
                        Back to Case Desk
                    </Link>
                    <Link
                        className={buttonClassName({ variant: "primary" })}
                        to={`/investigate/${shift.id}/${ticket.id}`}
                    >
                        Start Investigation
                    </Link>
                </>
            }
            description="Read the release ticket before opening the active investigation desk."
            eyebrow={shift.title}
            title="Ticket Briefing"
        >
            <div className="grid gap-5 xl:grid-cols-[1fr_0.82fr]">
                <Panel className="min-h-[520px]" padding="lg" tone="notepad">
                    <SectionHeader
                        eyebrow="Release Ticket"
                        meta={
                            <Badge tone="info">
                                Difficulty {ticket.difficulty}/5
                            </Badge>
                        }
                        title={ticket.title}
                        tone="paper"
                    />

                    <div className="space-y-6 pl-10 text-sm leading-7 text-rg-paper-muted">
                        <p className="text-base leading-8">{ticket.briefing}</p>

                        <div className="grid gap-4 lg:grid-cols-2">
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
                                    Ticket Type
                                </p>
                                <p className="mt-1 font-bold text-rg-paper-ink">
                                    {ticket.variantKind}
                                </p>
                            </div>
                        </div>

                        <div>
                            <p className="font-mono text-xs font-extrabold uppercase tracking-wide text-rg-folder-dark">
                                Evidence Packet
                            </p>
                            <p className="mt-1 text-rg-paper-muted">
                                {ticket.evidenceCards.length} sealed evidence
                                card(s) are attached to this ticket. Open the
                                investigation desk to inspect and pin them.
                            </p>
                        </div>

                        <div className="rounded-2xl border-2 border-rg-stamp/45 bg-rg-stamp/10 p-4">
                            <p className="font-mono text-xs font-extrabold uppercase tracking-[0.18em] text-rg-stamp">
                                Desk Reminder
                            </p>
                            <p className="mt-2 text-sm leading-6 text-rg-paper-muted">
                                The briefing is not the verdict. Use the
                                investigation desk to connect findings to
                                evidence before stamping a release decision.
                            </p>
                        </div>
                    </div>
                </Panel>

                <div className="grid gap-5">
                    <Panel tone="folder">
                        <SectionHeader
                            eyebrow="Family File"
                            title={family?.title ?? "Missing family"}
                        />

                        <p className="text-sm leading-6 text-rg-muted">
                            {family?.description ??
                                "The ticket family could not be loaded from the content repository."}
                        </p>

                        {family?.tags && family.tags.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {family.tags.map((tag) => (
                                    <Badge key={tag} tone="neutral">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        )}
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

                    <Panel tone="raised">
                        <SectionHeader
                            eyebrow="Evidence Packet"
                            meta={
                                <Badge tone="cork">
                                    {ticket.evidenceCards.length} card(s)
                                </Badge>
                            }
                            title="Sealed Contents"
                        />

                        <ul className="grid gap-2">
                            {ticket.evidenceCards.map((evidenceCard) => (
                                <li
                                    className="rounded-xl border border-rg-border bg-rg-surface/75 px-3 py-2"
                                    key={evidenceCard.id}
                                >
                                    <p className="font-bold text-rg-text">
                                        {evidenceCard.title}
                                    </p>
                                    <p className="font-mono text-xs uppercase tracking-[0.14em] text-rg-faint">
                                        {evidenceCard.source}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </Panel>
                </div>
            </div>
        </ScreenShell>
    );
}
