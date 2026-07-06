import type { InvestigationRecordPageDescriptor } from "../ticket-result-pages";

export interface InvestigationRecordPageProps {
    page: InvestigationRecordPageDescriptor;
}

/**
 * Final Ticket Result page showing non-scoring investigation activity context.
 */
export function InvestigationRecordPage({
    page,
}: InvestigationRecordPageProps) {
    return (
        <div className="rg-report-page">
            <header className="rg-report-page-header">
                <div>
                    <p className="rg-report-page-eyebrow">
                        Investigation Record
                    </p>
                    <h2 className="rg-report-page-title">
                        Submitted casework activity
                    </h2>
                </div>
            </header>

            <p className="rg-report-page-intro">
                These counters describe the submitted investigation. They are
                casework context and are not separate scoring dimensions.
            </p>

            <dl className="rg-report-ledger rg-report-ledger--record">
                <div className="rg-report-ledger-row">
                    <dt>Evidence Inspected</dt>
                    <dd>{page.inspectedEvidenceCount}</dd>
                </div>

                <div className="rg-report-ledger-row">
                    <dt>Evidence Pinned</dt>
                    <dd>{page.pinnedEvidenceCount}</dd>
                </div>

                <div className="rg-report-ledger-row">
                    <dt>Filed Findings</dt>
                    <dd>{page.filedFindingCount}</dd>
                </div>

                <div className="rg-report-ledger-row">
                    <dt>Active Board Strings</dt>
                    <dd>{page.boardConnectionCount}</dd>
                </div>
            </dl>
        </div>
    );
}
