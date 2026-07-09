import { Badge, type BadgeTone } from "../../../components/ui/Badge";
import type { FiledAssessmentPageDescriptor } from "../ticket-result-pages";
import {
    formatDateTime,
    formatScore,
    formatVerdict,
} from "../ticket-result-formatters";

export interface FiledAssessmentPageProps {
    page: FiledAssessmentPageDescriptor;
}

/**
 * First Ticket Result page summarising the filed outcome.
 *
 * The player can understand the ticket, score, verdict comparison, and decision
 * status from this page without navigating deeper into the report.
 */
export function FiledAssessmentPage({ page }: FiledAssessmentPageProps) {
    const assessmentTone = getAssessmentTone(page.totalScore);
    const decisionTone: BadgeTone = page.isVerdictCorrect
        ? "success"
        : "danger";

    return (
        <div className="rg-report-page rg-report-page--assessment">
            <header className="rg-report-page-header">
                <div>
                    <p className="rg-report-page-eyebrow">
                        Filed Ticket Report
                    </p>
                    <h2 className="rg-report-page-title">{page.ticketTitle}</h2>
                </div>

                <Badge kind="state" surface="paper" tone={assessmentTone}>
                    {page.scoreLabel}
                </Badge>
            </header>

            <dl className="rg-report-metadata">
                <div className="rg-report-metadata-field">
                    <dt>Ticket File</dt>
                    <dd>{page.ticketId}</dd>
                </div>

                <div className="rg-report-metadata-field">
                    <dt>Filed</dt>
                    <dd>{formatDateTime(page.submittedAt)}</dd>
                </div>
            </dl>

            <section className="rg-report-assessment-grid">
                <div className="rg-report-score-block">
                    <p className="rg-report-section-label">Final Assessment</p>

                    <p className="rg-report-score-value">
                        {formatScore(page.totalScore)}
                        <span> / {formatScore(page.maxScore)}</span>
                    </p>
                </div>

                <div className="rg-report-decision-block">
                    <div className="rg-report-section-heading-row">
                        <h3 className="rg-report-section-heading">
                            Release Decision
                        </h3>

                        <Badge kind="state" surface="paper" tone={decisionTone}>
                            {page.isVerdictCorrect ? "Matched" : "Mismatch"}
                        </Badge>
                    </div>

                    <dl className="rg-report-ledger">
                        <div className="rg-report-ledger-row">
                            <dt>Submitted</dt>
                            <dd>{formatVerdict(page.selectedVerdict)}</dd>
                        </div>

                        <div className="rg-report-ledger-row">
                            <dt>Expected</dt>
                            <dd>{formatVerdict(page.correctVerdict)}</dd>
                        </div>

                        <div className="rg-report-ledger-row rg-report-ledger-row--copy">
                            <dt>Status</dt>
                            <dd>
                                {page.isVerdictCorrect
                                    ? "The submitted release decision matched the expected decision."
                                    : "The submitted release decision did not match the expected decision."}
                            </dd>
                        </div>
                    </dl>
                </div>
            </section>
        </div>
    );
}

/**
 * Maps the persisted total score to the existing semantic assessment pigment.
 */
function getAssessmentTone(score: number): BadgeTone {
    if (score >= 90) {
        return "success";
    }

    if (score >= 70) {
        return "info";
    }

    if (score >= 50) {
        return "warning";
    }

    return "danger";
}
