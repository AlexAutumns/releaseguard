import { Link } from "react-router";

import { FiledReport } from "../../components/report/FiledReport";
import { buttonClassName } from "../../components/ui/Button";
import { ScreenShell } from "../../components/ui/ScreenShell";
import type { TicketScoreResult } from "../../features/gameplay/scoring/scoring-types";
import { getNextShiftRunTicketId } from "../../features/gameplay/shift-run/shift-run-rules";
import type { ShiftRun } from "../../features/gameplay/shift-run/shift-run-types";
import { CaseAssessmentPage } from "./pages/CaseAssessmentPage";
import { ExceptionsPage } from "./pages/ExceptionsPage";
import { FiledAssessmentPage } from "./pages/FiledAssessmentPage";
import { FindingsPage } from "./pages/FindingsPage";
import { InvestigationRecordPage } from "./pages/InvestigationRecordPage";
import {
    buildTicketResultPages,
    type TicketResultPageDescriptor,
} from "./ticket-result-pages";

export interface TicketResultReportProps {
    result: TicketScoreResult;
    shiftRun: ShiftRun | null;
}

/** Adapts one saved TicketScoreResult snapshot to the filed report shell. */
export function TicketResultReport({
    result,
    shiftRun,
}: TicketResultReportProps) {
    const pages = buildTicketResultPages(result);
    const nextTicketId = shiftRun ? getNextShiftRunTicketId(shiftRun) : null;
    const hasRunAwarePrimaryAction = Boolean(
        shiftRun?.completedAt || nextTicketId,
    );

    return (
        <ScreenShell>
            <FiledReport
                actions={
                    <>
                        {shiftRun?.completedAt ? (
                            <Link
                                className={buttonClassName({
                                    variant: "primary",
                                })}
                                to={`/results/shift/${shiftRun.shiftRunId}`}
                                viewTransition
                            >
                                Review Shift
                            </Link>
                        ) : nextTicketId ? (
                            <Link
                                className={buttonClassName({
                                    variant: "primary",
                                })}
                                to={`/tickets/${result.shiftId}/${nextTicketId}`}
                                viewTransition
                            >
                                Continue Shift
                            </Link>
                        ) : (
                            <Link
                                className={buttonClassName({
                                    variant: "primary",
                                })}
                                to="/desk"
                                viewTransition
                            >
                                Back to Desk
                            </Link>
                        )}

                        <Link
                            className={buttonClassName({ variant: "ghost" })}
                            to={`/tickets/${result.shiftId}/${result.ticketId}`}
                            viewTransition
                        >
                            Review Briefing
                        </Link>

                        {hasRunAwarePrimaryAction && (
                            <Link
                                className={buttonClassName({
                                    variant: "ghost",
                                })}
                                to="/desk"
                                viewTransition
                            >
                                Back to Desk
                            </Link>
                        )}
                    </>
                }
                eyebrow="Filed Ticket Report"
                getPageLabel={(page) => page.label}
                initialPageId="filed-assessment"
                pages={pages}
                renderPage={renderTicketResultPage}
                title={result.ticketTitle}
            />
        </ScreenShell>
    );
}

/** Renders one top-level Ticket Result sheet through exhaustive narrowing. */
function renderTicketResultPage(page: TicketResultPageDescriptor) {
    switch (page.kind) {
        case "filed-assessment":
            return <FiledAssessmentPage page={page} />;

        case "case-assessment":
            return <CaseAssessmentPage page={page} />;

        case "findings":
            return <FindingsPage page={page} />;

        case "exceptions":
            return <ExceptionsPage page={page} />;

        case "investigation-record":
            return <InvestigationRecordPage page={page} />;

        default:
            return assertNever(page);
    }
}

/** Compile-time exhaustiveness guard for Ticket Result page kinds. */
function assertNever(value: never): never {
    throw new Error(`Unhandled Ticket Result page: ${JSON.stringify(value)}`);
}
