import { Link } from "react-router";

import { buttonClassName } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { ScreenShell } from "../../components/ui/ScreenShell";
import type {
    ReleaseTicketDefinition,
    ShiftDefinition,
} from "../../features/content/content-types";

export interface DeskShiftCard {
    shift: ShiftDefinition;
    tickets: ReleaseTicketDefinition[];
}

export interface DeskScreenProps {
    shiftCards: DeskShiftCard[];
}

interface DeskLedgerProps {
    activeShift?: ShiftDefinition;
}

interface DeskShiftFolderProps {
    shift: ShiftDefinition;
    tickets: ReleaseTicketDefinition[];
}

interface LedgerRowProps {
    label: string;
    value: string;
}

/**
 * Case desk / hub screen.
 *
 * The screen coordinates the physical desk ledger and authored shift folders.
 * It does not own progression logic; open/locked state remains derived from the
 * supplied shift definitions and resolved content.
 */
export function DeskScreen({ shiftCards }: DeskScreenProps) {
    const activeShift = shiftCards.find(
        ({ shift, tickets }) => shift.isUnlockedByDefault && tickets.length > 0,
    )?.shift;

    return (
        <ScreenShell
            actions={
                <Link
                    className={buttonClassName({ variant: "ghost" })}
                    to="/"
                    viewTransition
                >
                    Back to Title
                </Link>
            }
            description="Open an assigned shift file and begin reviewing its release tickets."
            eyebrow="Case Desk"
            title="Open Case Files"
        >
            <div className="rg-scene-enter grid gap-5 xl:grid-cols-[minmax(280px,0.68fr)_minmax(0,1.32fr)]">
                <DeskLedger activeShift={activeShift} />

                <section className="rounded-xl border border-rg-border bg-rg-surface/92 p-5 shadow-2xl shadow-black/40">
                    <div className="mb-5 flex flex-col gap-3 border-b border-rg-border/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="rg-technical-label text-rg-amber">
                                Active Desk
                            </p>

                            <h2 className="rg-display-heading mt-2 text-3xl text-rg-text">
                                Available Investigations
                            </h2>

                            <p className="rg-body-copy mt-2 max-w-2xl text-base text-rg-muted">
                                Open an unlocked case folder to review its first
                                assigned release ticket.
                            </p>
                        </div>

                        <p className="rg-case-label text-rg-faint">
                            {shiftCards.length} shift
                            {shiftCards.length === 1 ? "" : "s"} registered
                        </p>
                    </div>

                    {shiftCards.length === 0 ? (
                        <EmptyState
                            description="The content repository did not return any shifts. Check the content pipeline and validation output."
                            title="No case files available"
                        />
                    ) : (
                        <div className="grid gap-5 xl:grid-cols-2">
                            {shiftCards.map(({ shift, tickets }) => (
                                <DeskShiftFolder
                                    key={shift.id}
                                    shift={shift}
                                    tickets={tickets}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </ScreenShell>
    );
}

/**
 * Physical desk ledger displayed beside the active shift folders.
 *
 * Paper copy uses the case-file/typewriter voice. Future progress analytics
 * should only be added after the local progress model exists.
 */
function DeskLedger({ activeShift }: DeskLedgerProps) {
    return (
        <section className="rg-paper-sheet rg-paper-sheet--02 rounded-md p-6 text-rg-paper-ink">
            <p className="rg-folder-tab-label text-rg-paper-ink/78">
                Desk Ledger
            </p>

            <h2 className="rg-display-heading mt-3 text-3xl text-rg-paper-ink">
                Release Desk
            </h2>

            <p className="rg-document-copy mt-4 text-rg-paper-ink/88">
                Review assigned release files, inspect the supporting evidence,
                and file a defensible release decision before the ticket reaches
                production.
            </p>

            <div className="rg-document-rule mt-6 space-y-4 pt-5">
                <LedgerRow
                    label="Desk Status"
                    value={activeShift ? "Active" : "Awaiting Assignment"}
                />

                <LedgerRow label="Review Mode" value="Training Simulation" />

                <LedgerRow
                    label="Current Stage"
                    value={activeShift?.title ?? "No Active Shift"}
                />
            </div>

            <div className="rg-document-rule mt-6 pt-5">
                <p className="rg-document-meta-label text-rg-paper-ink/76">
                    Desk Instruction
                </p>

                <p className="rg-document-copy mt-3 text-rg-paper-ink/86">
                    Start with the earliest unlocked shift. Each shift contains
                    release tickets selected from the authored content pack.
                </p>
            </div>
        </section>
    );
}

/**
 * One label/value row printed inside the desk ledger.
 */
function LedgerRow({ label, value }: LedgerRowProps) {
    return (
        <div className="flex items-baseline justify-between gap-5">
            <span className="rg-document-meta-label text-rg-paper-ink/76">
                {label}
            </span>

            <span className="rg-document-meta-value text-right text-rg-paper-ink/92">
                {value}
            </span>
        </div>
    );
}

/**
 * Renders one shift as a composed physical case folder.
 *
 * The folder can only navigate when the shift is unlocked and at least one
 * resolved ticket exists.
 */
function DeskShiftFolder({ shift, tickets }: DeskShiftFolderProps) {
    const firstTicket = tickets[0];
    const hasTicket = Boolean(firstTicket);
    const canOpen = shift.isUnlockedByDefault && hasTicket;

    const folderBody = (
        <div className="rg-folder-body min-h-72 px-5 pb-5 pt-8 text-rg-night">
            <p className="rg-folder-tab-label text-rg-night/80">
                Case Folder ·{" "}
                {shift.isUnlockedByDefault ? "Unlocked" : "Locked"}
            </p>

            <h3 className="rg-display-heading mt-4 text-3xl text-rg-night">
                {shift.title}
            </h3>

            <p className="rg-document-copy mt-2 text-rg-night/88">
                {shift.subtitle}
            </p>

            <div className="rg-document-rule mt-5 grid gap-4 pt-4 sm:grid-cols-2">
                <div>
                    <p className="rg-document-meta-label text-rg-night/76">
                        Difficulty Band
                    </p>

                    <p className="rg-document-meta-value mt-1 text-rg-night/94">
                        {shift.difficultyBand[0]}–{shift.difficultyBand[1]}
                    </p>
                </div>

                <div>
                    <p className="rg-document-meta-label text-rg-night/76">
                        Assigned Tickets
                    </p>

                    <p className="rg-document-meta-value mt-1 text-rg-night/94">
                        {tickets.length}
                    </p>
                </div>
            </div>

            <div className="mt-6">
                <span className="rg-folder-action">
                    {canOpen
                        ? "Open Folder"
                        : hasTicket
                          ? "Folder Locked"
                          : "No Tickets Assigned"}

                    {canOpen && <span aria-hidden="true">→</span>}
                </span>
            </div>
        </div>
    );

    const tab = (
        <div aria-hidden="true" className="rg-folder-tab">
            <span className="rg-folder-tab-text">
                Shift {String(shift.sequence).padStart(2, "0")}
            </span>
        </div>
    );

    if (!canOpen || !firstTicket) {
        return (
            <article
                aria-disabled="true"
                className="rg-folder-shell rg-folder-shell--compact rg-folder-enter block opacity-65"
            >
                {tab}
                {folderBody}
            </article>
        );
    }

    return (
        <Link
            aria-label={`Open ${shift.title}`}
            className="rg-folder-shell rg-folder-shell--compact rg-folder-interactive rg-folder-enter group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rg-amber"
            to={`/tickets/${shift.id}/${firstTicket.id}`}
            viewTransition
        >
            {tab}
            {folderBody}
        </Link>
    );
}
