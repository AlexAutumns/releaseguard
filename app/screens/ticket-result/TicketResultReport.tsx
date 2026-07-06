import { Link } from "react-router";

import { FiledReport } from "../../components/report/FiledReport";
import { buttonClassName } from "../../components/ui/Button";
import { ScreenShell } from "../../components/ui/ScreenShell";
import type { TicketScoreResult } from "../../features/gameplay/scoring/scoring-types";
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
}

/** Adapts one saved TicketScoreResult snapshot to the filed report shell. */
export function TicketResultReport({ result }: TicketResultReportProps) {
    const pages = buildTicketResultPages(result);

    return (
        <ScreenShell>
            <FiledReport
                actions={
                    <>
                        <Link
                            className={buttonClassName({
                                variant: "secondary",
                            })}
                            to="/desk"
                        >
                            Back to Desk
                        </Link>

                        <Link
                            className={buttonClassName({ variant: "ghost" })}
                            to={`/tickets/${result.shiftId}/${result.ticketId}`}
                        >
                            Review Briefing
                        </Link>
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
