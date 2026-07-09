import { Badge, type BadgeTone } from "../../../components/ui/Badge";
import type { ShiftAssessmentPageDescriptor } from "../shift-result-pages";
import {
    formatShiftDateTime,
    formatShiftScore,
} from "../shift-result-formatters";

export interface ShiftAssessmentPageProps {
    page: ShiftAssessmentPageDescriptor;
}

/**
 * First Shift Result page summarising the completed shift outcome.
 */
export function ShiftAssessmentPage({ page }: ShiftAssessmentPageProps) {
    const assessmentLabel = getShiftAssessmentLabel(page.averageScore);
    const assessmentTone = getShiftAssessmentTone(page.averageScore);

    return (
        <div className="rg-report-page rg-report-page--assessment">
            <header className="rg-report-page-header">
                <div>
                    <p className="rg-report-page-eyebrow">Filed Shift Report</p>

                    <h2 className="rg-report-page-title">{page.shiftTitle}</h2>
                </div>

                <Badge kind="state" surface="paper" tone={assessmentTone}>
                    {assessmentLabel}
                </Badge>
            </header>

            <dl className="rg-report-metadata">
                <div className="rg-report-metadata-field">
                    <dt>Shift File</dt>
                    <dd>{page.shiftId}</dd>
                </div>

                <div className="rg-report-metadata-field">
                    <dt>Closed</dt>
                    <dd>{formatShiftDateTime(page.completedAt)}</dd>
                </div>
            </dl>

            <section className="rg-report-assessment-grid">
                <div className="rg-report-score-block">
                    <p className="rg-report-section-label">
                        Average Assessment
                    </p>

                    <p className="rg-report-score-value">
                        {formatShiftScore(page.averageScore)}
                        <span> / {formatShiftScore(page.maxScore)}</span>
                    </p>
                </div>

                <div className="rg-report-decision-block">
                    <h3 className="rg-report-section-heading">Shift Outcome</h3>

                    <dl className="rg-report-ledger">
                        <div className="rg-report-ledger-row">
                            <dt>Tickets Reviewed</dt>
                            <dd>{page.ticketCount}</dd>
                        </div>

                        <div className="rg-report-ledger-row">
                            <dt>Verdicts Matched</dt>
                            <dd>
                                {page.correctVerdictCount} / {page.ticketCount}
                            </dd>
                        </div>

                        <div className="rg-report-ledger-row rg-report-ledger-row--copy">
                            <dt>Shift Window</dt>
                            <dd>
                                Started {formatShiftDateTime(page.startedAt)}.
                                The shift closed after all assigned tickets were
                                reviewed and filed.
                            </dd>
                        </div>
                    </dl>
                </div>
            </section>
        </div>
    );
}

/**
 * Maps one average ticket score to a concise shift assessment label.
 */
function getShiftAssessmentLabel(score: number): string {
    if (score >= 90) {
        return "Strong Shift";
    }

    if (score >= 70) {
        return "Solid Shift";
    }

    if (score >= 50) {
        return "Partial Shift";
    }

    return "Weak Shift";
}

/**
 * Maps the average ticket score to the existing semantic report pigment.
 */
function getShiftAssessmentTone(score: number): BadgeTone {
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
