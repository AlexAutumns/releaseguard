import { Link } from "react-router";

import { buttonClassName } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { ScreenShell } from "../../components/ui/ScreenShell";
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

interface TicketBriefingSheetProps {
    ticket: ReleaseTicketDefinition;
}

interface DocumentTagProps {
    value: string;
}

interface TicketMetadataProps {
    label: string;
    value: string;
}

interface FamilyFileSheetProps {
    family?: TicketFamilyDefinition;
}

interface BaselineReferenceSheetProps {
    familyReference?: FamilyReferenceDefinition;
}

interface EvidenceIndexSheetProps {
    ticket: ReleaseTicketDefinition;
}

/**
 * Pre-investigation briefing screen for one release ticket.
 *
 * The route presents authored ticket content as an opened physical case folder.
 * Board, finding, and verdict interactions remain isolated inside the active
 * investigation workspace.
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
                        viewTransition
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
                <Link
                    className={buttonClassName({ variant: "ghost" })}
                    to="/desk"
                    viewTransition
                >
                    Back to Case Desk
                </Link>
            }
            description="Review the release file before opening the active investigation desk."
            eyebrow={shift.title}
            title="Ticket Briefing"
        >
            <section className="rg-folder-shell rg-folder-shell--wide rg-folder-enter">
                <div aria-hidden="true" className="rg-folder-tab">
                    <span className="rg-folder-tab-text">{shift.title}</span>
                </div>

                <div className="rg-folder-body p-4 text-rg-paper-ink">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
                        <TicketBriefingSheet ticket={ticket} />

                        <aside className="rg-folder-sheet-stack grid content-start gap-4">
                            <FamilyFileSheet family={family} />

                            <BaselineReferenceSheet
                                familyReference={familyReference}
                            />

                            <EvidenceIndexSheet ticket={ticket} />

                            <Link
                                className={buttonClassName({
                                    variant: "primary",
                                    size: "lg",
                                    className:
                                        "rg-stamp-text w-full text-center",
                                })}
                                to={`/investigate/${shift.id}/${ticket.id}`}
                                viewTransition
                            >
                                Start Investigation
                            </Link>
                        </aside>
                    </div>
                </div>
            </section>
        </ScreenShell>
    );
}

/**
 * Main release-ticket sheet placed inside the opened folder.
 */
function TicketBriefingSheet({ ticket }: TicketBriefingSheetProps) {
    return (
        <article className="rg-paper-sheet rg-sheet-enter min-h-130 rounded-md p-6 text-rg-paper-ink lg:p-7">
            <p className="rg-folder-tab-label text-rg-paper-ink/80">
                Release Ticket
            </p>

            <h2 className="rg-display-title mt-4 text-4xl text-rg-paper-ink sm:text-5xl">
                {ticket.title}
            </h2>

            <div className="mt-5 flex flex-wrap gap-2">
                <DocumentTag value={ticket.id} />
                <DocumentTag value={`Difficulty ${ticket.difficulty}/5`} />
            </div>

            <section className="rg-document-rule mt-7 pt-6">
                <h3 className="rg-display-heading text-xl text-rg-paper-ink">
                    Brief
                </h3>

                <p className="rg-document-copy mt-3 text-rg-paper-ink/90">
                    {ticket.briefing}
                </p>
            </section>

            <section className="rg-document-rule mt-7 pt-6">
                <h3 className="rg-display-heading text-xl text-rg-paper-ink">
                    Release Context
                </h3>

                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                    <TicketMetadata
                        label="Product Area"
                        value={ticket.productArea}
                    />

                    <TicketMetadata
                        label="Ticket Type"
                        value={formatVariantKind(ticket.variantKind)}
                    />
                </div>
            </section>

            <aside className="rg-margin-note mt-9">
                <p className="rg-document-meta-label text-rg-stamp">
                    Desk Reminder
                </p>

                <p className="rg-document-copy mt-2 text-rg-paper-ink/88">
                    The briefing is not the verdict. Inspect the evidence and
                    file supported findings before stamping a release decision.
                </p>
            </aside>
        </article>
    );
}

/**
 * Typewritten docket field printed on the release ticket.
 */
function DocumentTag({ value }: DocumentTagProps) {
    return <span className="rg-docket-stamp">{value}</span>;
}

/**
 * One typed metadata field on the release ticket.
 */
function TicketMetadata({ label, value }: TicketMetadataProps) {
    return (
        <div>
            <p className="rg-document-meta-label text-rg-paper-ink/76">
                {label}
            </p>

            <p className="rg-document-meta-value mt-1 capitalize text-rg-paper-ink/94">
                {value}
            </p>
        </div>
    );
}

/**
 * Ticket-family reference slip stored beside the release ticket.
 */
function FamilyFileSheet({ family }: FamilyFileSheetProps) {
    return (
        <section className="rg-paper-sheet rounded-md p-4 text-rg-paper-ink">
            <p className="rg-folder-tab-label text-rg-paper-ink/80">
                Family File
            </p>

            <h3 className="rg-display-heading mt-2 text-2xl text-rg-paper-ink">
                {family?.title ?? "Missing Family"}
            </h3>

            <p className="rg-document-copy mt-3 text-rg-paper-ink/88">
                {family?.description ??
                    "The ticket family could not be loaded from the content repository."}
            </p>

            {family?.tags && family.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-rg-paper-ink/20 pt-3">
                    {family.tags.map((tag) => (
                        <span
                            className="rg-document-meta-label text-rg-paper-ink/72"
                            key={tag}
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </section>
    );
}

/**
 * Baseline-reference slip attached to the ticket family.
 */
function BaselineReferenceSheet({
    familyReference,
}: BaselineReferenceSheetProps) {
    return (
        <section className="rg-paper-sheet rounded-md p-4 text-rg-paper-ink">
            <p className="rg-folder-tab-label text-rg-paper-ink/80">
                Baseline Reference
            </p>

            <h3 className="rg-display-heading mt-2 text-2xl text-rg-paper-ink">
                {familyReference?.title ?? "Missing Baseline"}
            </h3>

            <p className="rg-document-copy mt-3 text-rg-paper-ink/88">
                {familyReference?.purpose ??
                    "The baseline reference could not be loaded from the content repository."}
            </p>
        </section>
    );
}

/**
 * Sealed evidence index shown before investigation begins.
 *
 * Evidence bodies and attachments remain hidden until the player enters the
 * investigation workspace. Rows are presented as a typed file index instead of
 * individual rounded UI cards.
 */
function EvidenceIndexSheet({ ticket }: EvidenceIndexSheetProps) {
    return (
        <section className="rg-paper-sheet rounded-md p-4 text-rg-paper-ink">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="rg-folder-tab-label text-rg-paper-ink/80">
                        Evidence Packet
                    </p>

                    <h3 className="rg-display-heading mt-2 text-2xl text-rg-paper-ink">
                        Sealed Contents
                    </h3>
                </div>

                <span className="rg-docket-stamp">
                    {ticket.evidenceCards.length} cards
                </span>
            </div>

            <ol className="rg-document-rule mt-4 pt-2">
                {ticket.evidenceCards.map((evidenceCard, index) => (
                    <li className="rg-evidence-index-row" key={evidenceCard.id}>
                        <span className="rg-evidence-index-number">
                            {String(index + 1).padStart(2, "0")}
                        </span>

                        <div>
                            <p className="rg-document-meta-value text-rg-paper-ink/94">
                                {evidenceCard.title}
                            </p>

                            <p className="rg-document-meta-label mt-1 text-rg-paper-ink/68">
                                {evidenceCard.source}
                            </p>
                        </div>
                    </li>
                ))}
            </ol>
        </section>
    );
}

/**
 * Converts a machine-readable ticket variant into a readable document label.
 */
function formatVariantKind(
    variantKind: ReleaseTicketDefinition["variantKind"],
): string {
    return variantKind.split("-").join(" ");
}
