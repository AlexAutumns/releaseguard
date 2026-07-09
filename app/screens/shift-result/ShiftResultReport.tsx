import { Link } from "react-router";

import { FiledReport } from "../../components/report/FiledReport";
import { buttonClassName } from "../../components/ui/Button";
import { ScreenShell } from "../../components/ui/ScreenShell";
import type { ShiftDefinition } from "../../features/content/content-types";
import type { TicketScoreResult } from "../../features/gameplay/scoring/scoring-types";
import type { ShiftRun } from "../../features/gameplay/shift-run/shift-run-types";
import { ShiftAssessmentPage } from "./pages/ShiftAssessmentPage";
import { ShiftRecordPage } from "./pages/ShiftRecordPage";
import { TicketRegisterPage } from "./pages/TicketRegisterPage";
import {
    buildShiftResultPages,
    type ShiftResultPageDescriptor,
} from "./shift-result-pages";
import { formatShiftDateTime } from "./shift-result-formatters";

export interface ShiftResultReportProps {
    shift: ShiftDefinition;
    shiftRun: ShiftRun;
    ticketResults: TicketScoreResult[];
}

/**
 * Adapts one completed Shift Run and its Ticket Results to FiledReport.
 */
export function ShiftResultReport({
    shift,
    shiftRun,
    ticketResults,
}: ShiftResultReportProps) {
    if (!shiftRun.completedAt) {
        throw new Error(
            `Shift Result report requires completed Shift Run "${shiftRun.shiftRunId}".`,
        );
    }

    const pages = buildShiftResultPages({
        shift,
        shiftRun,
        ticketResults,
    });

    return (
        <ScreenShell>
            <FiledReport
                actions={
                    <Link
                        className={buttonClassName({
                            variant: "primary",
                        })}
                        to="/desk"
                        viewTransition
                    >
                        Return to Case Desk
                    </Link>
                }
                eyebrow="Filed Shift Report"
                getPageLabel={(page) => page.label}
                initialPageId="shift-assessment"
                pages={pages}
                register={
                    <>
                        <span>{ticketResults.length} tickets filed</span>

                        <span>
                            Closed {formatShiftDateTime(shiftRun.completedAt)}
                        </span>
                    </>
                }
                renderPage={renderShiftResultPage}
                title={shift.title}
            />
        </ScreenShell>
    );
}

/**
 * Renders one top-level Shift Result sheet through exhaustive narrowing.
 */
function renderShiftResultPage(page: ShiftResultPageDescriptor) {
    switch (page.kind) {
        case "shift-assessment":
            return <ShiftAssessmentPage page={page} />;

        case "ticket-register":
            return <TicketRegisterPage page={page} />;

        case "shift-record":
            return <ShiftRecordPage page={page} />;

        default:
            return assertNever(page);
    }
}

/**
 * Compile-time exhaustiveness guard for Shift Result page kinds.
 */
function assertNever(value: never): never {
    throw new Error(`Unhandled Shift Result page: ${JSON.stringify(value)}`);
}
