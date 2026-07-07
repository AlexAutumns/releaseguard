import type { ShiftRecordPageDescriptor } from "../shift-result-pages";

export interface ShiftRecordPageProps {
    page: ShiftRecordPageDescriptor;
}

/**
 * Final Shift Result page showing aggregate casework activity and exceptions.
 */
export function ShiftRecordPage({ page }: ShiftRecordPageProps) {
    return (
        <div className="rg-report-page">
            <header className="rg-report-page-header">
                <div>
                    <p className="rg-report-page-eyebrow">Shift Record</p>

                    <h2 className="rg-report-page-title">
                        Submitted casework totals
                    </h2>
                </div>
            </header>

            <p className="rg-report-page-intro">
                These totals summarize investigation activity and casework
                exceptions across the tickets closed during this shift.
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

                <div className="rg-report-ledger-row">
                    <dt>Missed Findings</dt>
                    <dd>{page.missedFindingCount}</dd>
                </div>

                <div className="rg-report-ledger-row">
                    <dt>Unsupported Findings</dt>
                    <dd>{page.unsupportedFindingCount}</dd>
                </div>
            </dl>
        </div>
    );
}
