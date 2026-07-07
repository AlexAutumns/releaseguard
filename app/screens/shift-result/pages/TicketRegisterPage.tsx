import type { TicketRegisterPageDescriptor } from "../shift-result-pages";
import {
    formatShiftScore,
    formatShiftVerdict,
} from "../shift-result-formatters";

export interface TicketRegisterPageProps {
    page: TicketRegisterPageDescriptor;
}

/**
 * Lists every immutable Ticket Result owned by the completed Shift Run.
 */
export function TicketRegisterPage({ page }: TicketRegisterPageProps) {
    return (
        <div className="rg-report-page">
            <header className="rg-report-page-header">
                <div>
                    <p className="rg-report-page-eyebrow">Ticket Register</p>

                    <h2 className="rg-report-page-title">
                        Filed ticket outcomes
                    </h2>
                </div>

                <p className="rg-report-record-count">
                    {page.tickets.length} filed
                </p>
            </header>

            <p className="rg-report-page-intro">
                Each ticket retains the verdict and assessment filed when its
                investigation closed. The register keeps those submitted
                outcomes in authored shift order.
            </p>

            <dl className="rg-report-ledger rg-report-ledger--scoring">
                {page.tickets.map((ticket) => (
                    <div
                        className="rg-report-ledger-row rg-report-ledger-row--described"
                        key={ticket.ticketId}
                    >
                        <dt>{ticket.ticketTitle}</dt>

                        <dd>
                            {formatShiftScore(ticket.totalScore)} /{" "}
                            {formatShiftScore(ticket.maxScore)}
                        </dd>

                        <dd className="rg-report-ledger-description">
                            Submitted{" "}
                            {formatShiftVerdict(ticket.selectedVerdict)};
                            expected {formatShiftVerdict(ticket.correctVerdict)}
                            . Decision{" "}
                            {ticket.isVerdictCorrect
                                ? "matched"
                                : "did not match"}
                            .
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}
