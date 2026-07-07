import { useEffect, useState } from "react";
import { Link } from "react-router";

import { Badge } from "../../components/ui/Badge";
import { buttonClassName } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Panel } from "../../components/ui/Panel";
import { ScreenShell } from "../../components/ui/ScreenShell";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { getShiftById } from "../../features/content/content-repository";
import type { ShiftDefinition } from "../../features/content/content-types";
import { loadTicketScoreResult } from "../../features/gameplay/results/ticket-result-storage";
import type { TicketScoreResult } from "../../features/gameplay/scoring/scoring-types";
import { loadShiftRunById } from "../../features/gameplay/shift-run/shift-run-storage";
import type { ShiftRun } from "../../features/gameplay/shift-run/shift-run-types";
import { ShiftResultReport } from "./ShiftResultReport";

export interface ShiftResultScreenProps {
    shiftRunId: string;
}

/**
 * Successfully loaded sources required by the paged Shift Result.
 */
interface LoadedShiftResult {
    shift: ShiftDefinition;
    shiftRun: ShiftRun;
    ticketResults: TicketScoreResult[];
}

/**
 * Client-side Shift Result loading state.
 */
type ShiftResultLoadState =
    | {
          status: "loading";
      }
    | {
          status: "missing";
          message: string;
      }
    | {
          status: "ready";
          value: LoadedShiftResult;
      };

/**
 * Loads one completed Shift Run and the immutable Ticket Results it owns.
 *
 * The screen fails closed when the run is incomplete or one required Ticket
 * Result is missing/inconsistent so aggregate shift reporting never invents or
 * silently recomputes ticket outcomes.
 */
export function ShiftResultScreen({ shiftRunId }: ShiftResultScreenProps) {
    const [loadState, setLoadState] = useState<ShiftResultLoadState>({
        status: "loading",
    });

    useEffect(() => {
        setLoadState({
            status: "loading",
        });

        setLoadState(loadCompletedShiftResult(shiftRunId));
    }, [shiftRunId]);

    if (loadState.status === "loading") {
        return (
            <ScreenShell
                actions={<BackToDeskAction />}
                description="Loading the completed shift report from local browser storage."
                eyebrow="Shift Report"
                title="End-of-Shift Summary"
            >
                <Panel tone="raised">
                    <SectionHeader
                        eyebrow="Loading"
                        meta={<Badge tone="neutral">{shiftRunId}</Badge>}
                        title="Retrieving completed shift records"
                    />

                    <p className="text-sm leading-6 text-rg-muted">
                        Checking the saved Shift Run and its submitted Ticket
                        Results.
                    </p>
                </Panel>
            </ScreenShell>
        );
    }

    if (loadState.status === "missing") {
        return (
            <ScreenShell
                actions={<BackToDeskAction />}
                description="The completed shift report could not be rebuilt from local browser storage."
                eyebrow="Shift Report"
                title="Shift Report Unavailable"
            >
                <Panel tone="raised">
                    <EmptyState
                        action={<BackToDeskAction />}
                        description={loadState.message}
                        title="The shift report is not available."
                    />
                </Panel>
            </ScreenShell>
        );
    }

    return <ShiftResultReport {...loadState.value} />;
}

/**
 * Loads and verifies the persisted sources needed to render one Shift Result.
 */
function loadCompletedShiftResult(shiftRunId: string): ShiftResultLoadState {
    if (!shiftRunId) {
        return {
            status: "missing",
            message: "The shift result route is missing its Shift Run ID.",
        };
    }

    const shiftRunResult = loadShiftRunById(shiftRunId);

    if (!shiftRunResult.ok) {
        return {
            status: "missing",
            message: shiftRunResult.message,
        };
    }

    const shiftRun = shiftRunResult.value;

    if (!shiftRun) {
        return {
            status: "missing",
            message: "No saved Shift Run was found for this report.",
        };
    }

    if (
        !shiftRun.completedAt ||
        shiftRun.nextTicketIndex !== shiftRun.orderedTicketIds.length
    ) {
        return {
            status: "missing",
            message:
                "This Shift Run is not complete yet. Finish every assigned ticket before opening its filed shift report.",
        };
    }

    const shift = getShiftById(shiftRun.shiftId);

    if (!shift) {
        return {
            status: "missing",
            message: `The authored shift "${shiftRun.shiftId}" is no longer available in the current content pack.`,
        };
    }

    const completionByTicketId = new Map(
        shiftRun.completedTicketAttempts.map((item) => [item.ticketId, item]),
    );

    if (
        shiftRun.completedTicketAttempts.length !==
            shiftRun.orderedTicketIds.length ||
        completionByTicketId.size !== shiftRun.orderedTicketIds.length
    ) {
        return {
            status: "missing",
            message:
                "The completed Shift Run has inconsistent ticket completion records and cannot be reported safely.",
        };
    }

    const ticketResults: TicketScoreResult[] = [];

    for (const ticketId of shiftRun.orderedTicketIds) {
        const completedAttempt = completionByTicketId.get(ticketId);

        if (!completedAttempt) {
            return {
                status: "missing",
                message: `Completed ticket "${ticketId}" is missing its Shift Run attempt record.`,
            };
        }

        const ticketResult = loadTicketScoreResult(completedAttempt.attemptId);

        if (!ticketResult) {
            return {
                status: "missing",
                message: `Completed ticket "${ticketId}" is missing its saved Ticket Result.`,
            };
        }

        if (
            ticketResult.attemptId !== completedAttempt.attemptId ||
            ticketResult.shiftId !== shiftRun.shiftId ||
            ticketResult.ticketId !== ticketId
        ) {
            return {
                status: "missing",
                message: `Saved Ticket Result "${completedAttempt.attemptId}" does not match its Shift Run completion record.`,
            };
        }

        ticketResults.push(ticketResult);
    }

    return {
        status: "ready",
        value: {
            shift,
            shiftRun,
            ticketResults,
        },
    };
}

/**
 * Shared route action used by Shift Result loading and missing states.
 */
function BackToDeskAction() {
    return (
        <Link
            className={buttonClassName({
                variant: "secondary",
            })}
            to="/desk"
            viewTransition
        >
            Back to Desk
        </Link>
    );
}
