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
 * Shift desk / hub screen.
 *
 * This screen is the player's current level-select space. It should eventually
 * show progress, locked shifts, saved attempts, and shift summaries.
 */
export function DeskScreen({ shiftCards }: DeskScreenProps) {
    return (
        <ScreenShell
            actions={
                <Link className={buttonClassName({ variant: "ghost" })} to="/">
                    Back to Title
                </Link>
            }
            description="Choose a shift and begin reviewing release tickets."
            eyebrow="Release Desk"
            title="Shift Desk"
        >
            <Panel tone="strong">
                <SectionHeader
                    description="For now, only the first authored shift is available. Later, this desk will show unlocks, progress, and shift completion status."
                    eyebrow="Available Work"
                    meta={
                        <Badge tone="info">{shiftCards.length} shift(s)</Badge>
                    }
                    title="Current Shifts"
                />

                {shiftCards.length === 0 ? (
                    <EmptyState
                        description="The content repository did not return any shifts. Check the content pipeline and validation output."
                        title="No shifts available"
                    />
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {shiftCards.map(({ shift, tickets }) => {
                            const firstTicket = tickets[0];
                            const canStart = Boolean(firstTicket);

                            return (
                                <article
                                    className="rounded-2xl border border-rg-folder bg-rg-paper p-5 shadow-sm"
                                    key={shift.id}
                                >
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

                                    <h2 className="text-2xl font-black tracking-[-0.04em] text-rg-ink">
                                        {shift.title}
                                    </h2>

                                    <p className="mt-2 text-sm font-bold text-rg-accent">
                                        {shift.subtitle}
                                    </p>

                                    <p className="mt-4 text-sm leading-6 text-rg-muted">
                                        Difficulty band:{" "}
                                        {shift.difficultyBand[0]}–
                                        {shift.difficultyBand[1]}
                                    </p>

                                    <div className="mt-5">
                                        {canStart ? (
                                            <Link
                                                className={buttonClassName({
                                                    variant: "primary",
                                                })}
                                                to={`/play/${shift.id}/${firstTicket.id}`}
                                            >
                                                Start First Ticket
                                            </Link>
                                        ) : (
                                            <span className="text-sm font-bold text-rg-muted">
                                                No tickets assigned yet.
                                            </span>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </Panel>
        </ScreenShell>
    );
}
