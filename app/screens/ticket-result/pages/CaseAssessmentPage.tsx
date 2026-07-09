import type { CaseAssessmentPageDescriptor } from "../ticket-result-pages";
import { formatScore } from "../ticket-result-formatters";

export interface CaseAssessmentPageProps {
    page: CaseAssessmentPageDescriptor;
}

/**
 * Explains the persisted score through the four authored scoring dimensions.
 *
 * The page renders saved breakdown copy exactly as stored and never recalculates
 * score percentages or ticket scoring rules.
 */
export function CaseAssessmentPage({ page }: CaseAssessmentPageProps) {
    return (
        <div className="rg-report-page">
            <header className="rg-report-page-header">
                <div>
                    <p className="rg-report-page-eyebrow">Case Assessment</p>
                    <h2 className="rg-report-page-title">
                        How the report was scored
                    </h2>
                </div>
            </header>

            <p className="rg-report-page-intro">
                The assessment is based on the submitted verdict, matched
                expected findings, required evidence support, and severity
                accuracy.
            </p>

            <dl className="rg-report-ledger rg-report-ledger--scoring">
                {page.lines.map((line) => (
                    <div
                        className="rg-report-ledger-row rg-report-ledger-row--described"
                        key={line.label}
                    >
                        <dt>{line.label}</dt>
                        <dd>
                            {formatScore(line.earnedPoints)} /{" "}
                            {formatScore(line.maxPoints)}
                        </dd>
                        <dd className="rg-report-ledger-description">
                            {line.description}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}
