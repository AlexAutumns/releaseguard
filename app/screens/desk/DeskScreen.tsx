import { Link } from "react-router";

import { Badge } from "../../components/ui/Badge";
import { buttonClassName } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Panel } from "../../components/ui/Panel";
import { ScreenShell } from "../../components/ui/ScreenShell";
import { SectionHeader } from "../../components/ui/SectionHeader";
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

/**
 * Case desk / hub screen.
 *
 * This is the player's level-select space. It should feel like an active
 * investigation desk, not a bright dashboard.
 */
export function DeskScreen({ shiftCards }: DeskScreenProps) {
    return (
        <ScreenShell
            actions={
                <Link className={buttonClassName({ variant: "ghost" })} to="/">
                    Back to Title
                </Link>
            }
            description="Open a shift file and begin reviewing release tickets."
            eyebrow="Case Desk"
            title="Open Case Files"
        >
            <div className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
                <Panel padding="lg" tone="notepad">
                    <SectionHeader
                        description="This desk will later show progress, unlocked shifts, and completed shift reports."
                        eyebrow="Desk Ledger"
                        title="Investigation Queue"
                        tone="paper"
                    />

                    <div className="grid gap-4 pl-10 text-sm leading-7 text-rg-paper-muted">
                        <p>
                            Start with the earliest unlocked shift. Each shift
                            contains a small batch of release tickets from the
                            authored content pool.
                        </p>
                        <p>
                            For this build, the first shift opens directly into
                            the first available ticket.
                        </p>
                    </div>
                </Panel>

                <Panel tone="raised">
                    <SectionHeader
                        description="Select a case file to begin the release review loop."
                        eyebrow="Active Desk"
                        meta={
                            <Badge tone="info">
                                {shiftCards.length} shift(s)
                            </Badge>
                        }
                        title="Available Investigations"
                    />

                    {shiftCards.length === 0 ? (
                        <EmptyState
                            description="The content repository did not return any shifts. Check the content pipeline and validation output."
                            title="No case files available"
                        />
                    ) : (
                        <div className="grid gap-4 xl:grid-cols-2">
                            {shiftCards.map(({ shift, tickets }) => {
                                const firstTicket = tickets[0];
                                const canStart = Boolean(firstTicket);

                                return (
                                    <article
                                        className="relative overflow-hidden rounded-2xl border border-rg-folder-dark bg-rg-folder/80 p-5 shadow-xl shadow-black/30"
                                        key={shift.id}
                                    >
                                        <div
                                            aria-hidden="true"
                                            className="rg-paper-grain pointer-events-none absolute inset-0 opacity-20"
                                        />

                                        <div className="relative z-10">
                                            <div className="mb-4 flex flex-wrap gap-2">
                                                <Badge
                                                    tone={
                                                        shift.isUnlockedByDefault
                                                            ? "success"
                                                            : "neutral"
                                                    }
                                                >
                                                    {shift.isUnlockedByDefault
                                                        ? "Unlocked"
                                                        : "Locked"}
                                                </Badge>
                                                <Badge tone="cork">
                                                    Shift {shift.sequence}
                                                </Badge>
                                                <Badge tone="info">
                                                    {tickets.length} ticket(s)
                                                </Badge>
                                            </div>

                                            <h2 className="text-2xl font-black tracking-[-0.04em] text-rg-text">
                                                {shift.title}
                                            </h2>

                                            <p className="mt-2 text-sm font-bold text-rg-amber">
                                                {shift.subtitle}
                                            </p>

                                            <p className="mt-4 font-mono text-xs uppercase tracking-[0.16em] text-rg-text/70">
                                                Difficulty band:{" "}
                                                {shift.difficultyBand[0]}–
                                                {shift.difficultyBand[1]}
                                            </p>

                                            <div className="mt-5">
                                                {canStart ? (
                                                    <Link
                                                        className={buttonClassName(
                                                            {
                                                                variant:
                                                                    "primary",
                                                            },
                                                        )}
                                                        to={`/play/${shift.id}/${firstTicket.id}`}
                                                    >
                                                        Open First Ticket
                                                    </Link>
                                                ) : (
                                                    <span className="text-sm font-bold text-rg-muted">
                                                        No tickets assigned yet.
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </Panel>
            </div>
        </ScreenShell>
    );
}
