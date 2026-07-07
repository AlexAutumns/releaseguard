import { Link } from "react-router";

import { buttonClassName } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { ScreenShell } from "../../components/ui/ScreenShell";
import type {
    ReleaseTicketDefinition,
    ShiftDefinition,
} from "../../features/content/content-types";
import {
    useDeskController,
    type DeskShiftCard,
    type DeskShiftStatus,
} from "./useDeskController";

export interface DeskScreenProps {
    shiftCards: DeskShiftCard[];
}

interface DeskLedgerProps {
    activeShift?: ShiftDefinition;
}

interface DeskShiftFolderProps {
    shift: ShiftDefinition;
    tickets: ReleaseTicketDefinition[];
    status: DeskShiftStatus;
    onOpen: () => void;
}

interface LedgerRowProps {
    label: string;
    value: string;
}

/**
 * Case desk / hub screen.
 *
 * The screen renders the physical desk ledger and resolved shift folders. Shift
 * Run loading, sequential unlock state, and folder destinations are coordinated
 * by the Desk controller rather than being inferred from static content alone.
 */
export function DeskScreen({ shiftCards }: DeskScreenProps) {
    const { activeShift, errorMessage, openShift, resolvedShiftCards } =
        useDeskController(shiftCards);

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
            description="Start, resume, or review an authored release-desk shift."
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
                                Open a case folder to start its authored ticket
                                sequence, resume the next incomplete ticket, or
                                review a closed shift.
                            </p>
                        </div>

                        <p className="rg-case-label text-rg-faint">
                            {shiftCards.length} shift
                            {shiftCards.length === 1 ? "" : "s"} registered
                        </p>
                    </div>

                    {errorMessage && (
                        <div
                            className="mb-5 border-l-2 border-rg-danger bg-rg-danger/8 px-4 py-3"
                            role="alert"
                        >
                            <p className="rg-technical-label text-rg-danger">
                                Shift Progression Error
                            </p>

                            <p className="rg-body-copy mt-2 text-sm text-rg-muted">
                                {errorMessage}
                            </p>
                        </div>
                    )}

                    {resolvedShiftCards.length === 0 ? (
                        <EmptyState
                            description="The content repository did not return any shifts. Check the content pipeline and validation output."
                            title="No case files available"
                        />
                    ) : (
                        <div className="grid items-stretch gap-5 xl:grid-cols-2">
                            {resolvedShiftCards.map(
                                ({ shift, tickets, status }) => (
                                    <DeskShiftFolder
                                        key={shift.id}
                                        onOpen={() => openShift(shift.id)}
                                        shift={shift}
                                        status={status}
                                        tickets={tickets}
                                    />
                                ),
                            )}
                        </div>
                    )}
                </section>
            </div>
        </ScreenShell>
    );
}

/**
 * Physical desk ledger displayed beside the active shift folders.
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
                    Start with the earliest unlocked shift. Returning to an open
                    folder resumes its next incomplete ticket; a closed folder
                    opens the completed shift report.
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
 * Renders one authored shift as a progression-aware physical case folder.
 *
 * Every lifecycle state uses the same folder shell structure so available,
 * locked, in-progress, and completed folders keep matching proportions. An
 * invisible action layer makes openable folders clickable without changing the
 * physical folder markup.
 */
function DeskShiftFolder({
    shift,
    tickets,
    status,
    onOpen,
}: DeskShiftFolderProps) {
    const canOpen =
        status === "available" ||
        status === "in-progress" ||
        status === "completed";

    const folderClassName = [
        "rg-folder-shell",
        "rg-folder-shell--compact",
        "rg-folder-enter",
        "flex",
        "h-full",
        "flex-col",
        canOpen ? "rg-folder-interactive" : "rg-folder-shell--locked",
    ].join(" ");

    return (
        <article
            aria-disabled={!canOpen || undefined}
            className={folderClassName}
        >
            <div aria-hidden="true" className="rg-folder-tab">
                <span className="rg-folder-tab-text">
                    Shift {String(shift.sequence).padStart(2, "0")}
                </span>
            </div>

            <div className="rg-folder-body flex min-h-72 flex-1 flex-col px-5 pb-5 pt-8 text-rg-night">
                <p className="rg-folder-tab-label text-rg-night/80">
                    Case Folder · {formatDeskShiftStatus(status)}
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

                <div className="mt-auto pt-6">
                    <span aria-hidden="true" className="rg-folder-action">
                        {getDeskShiftActionLabel(status)}

                        {canOpen && <span aria-hidden="true">→</span>}
                    </span>
                </div>
            </div>

            {canOpen && (
                <button
                    aria-label={`${getDeskShiftActionLabel(status)}: ${shift.title}`}
                    className="absolute inset-0 z-10 cursor-pointer appearance-none rounded-[0.8rem] border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rg-amber"
                    onClick={onOpen}
                    type="button"
                >
                    <span className="sr-only">
                        {getDeskShiftActionLabel(status)}: {shift.title}
                    </span>
                </button>
            )}
        </article>
    );
}
/**
 * Returns the visible folder state used by the physical shift label.
 */
function formatDeskShiftStatus(status: DeskShiftStatus): string {
    switch (status) {
        case "checking":
            return "Checking";
        case "available":
            return "Available";
        case "in-progress":
            return "In Progress";
        case "completed":
            return "Closed";
        case "locked":
            return "Locked";
        case "unavailable":
            return "Unavailable";
    }
}

/**
 * Returns the folder action associated with one resolved shift state.
 */
function getDeskShiftActionLabel(status: DeskShiftStatus): string {
    switch (status) {
        case "checking":
            return "Checking Case File";
        case "available":
            return "Open Folder";
        case "in-progress":
            return "Resume Shift";
        case "completed":
            return "Review Shift";
        case "locked":
            return "Folder Locked";
        case "unavailable":
            return "Progress Unavailable";
    }
}
