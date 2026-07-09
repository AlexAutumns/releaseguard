import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "../../../components/ui/Badge";
import type {
    FindingsPageDescriptor,
    MatchedFindingRecord,
} from "../ticket-result-pages";
import { formatCategory, formatSeverity } from "../ticket-result-formatters";

export interface FindingsPageProps {
    page: FindingsPageDescriptor;
}

/** Shows supported findings as one register with one attached record at a time. */
export function FindingsPage({ page }: FindingsPageProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const safeIndex = Math.min(
        selectedIndex,
        Math.max(page.findings.length - 1, 0),
    );
    const finding = page.findings[safeIndex];

    return (
        <div className="rg-report-page">
            <header className="rg-report-page-header">
                <div>
                    <p className="rg-report-page-eyebrow">Supported Findings</p>
                    <h2 className="rg-report-page-title">
                        Casework findings register
                    </h2>
                </div>

                <p className="rg-report-record-count">
                    {page.findings.length} matched
                </p>
            </header>

            {!finding ? (
                <div className="rg-report-zero-record">
                    <p className="rg-report-section-label">
                        No supported findings filed
                    </p>
                    <p className="rg-report-document-copy">
                        The submitted casework did not match any authored
                        expected findings. Review the Exceptions sheet for
                        missed or unsupported records.
                    </p>
                </div>
            ) : (
                <>
                    {page.findings.length > 1 ? (
                        <FindingRecordNavigation
                            findings={page.findings}
                            onSelectIndex={setSelectedIndex}
                            selectedIndex={safeIndex}
                        />
                    ) : null}

                    <FindingRecord finding={finding} position={safeIndex + 1} />
                </>
            )}
        </div>
    );
}

interface FindingRecordNavigationProps {
    findings: MatchedFindingRecord[];
    selectedIndex: number;
    onSelectIndex: (index: number) => void;
}

/** Small local filing index for navigating matched finding records. */
function FindingRecordNavigation({
    findings,
    selectedIndex,
    onSelectIndex,
}: FindingRecordNavigationProps) {
    return (
        <div className="rg-report-record-navigation">
            <button
                aria-label="Previous finding record"
                className="rg-report-record-step"
                disabled={selectedIndex === 0}
                onClick={() => onSelectIndex(selectedIndex - 1)}
                type="button"
            >
                <ChevronLeft aria-hidden="true" size={15} />
                Previous
            </button>

            <label className="rg-report-record-index">
                <span>Record Index</span>
                <select
                    aria-label="Finding record index"
                    onChange={(event) =>
                        onSelectIndex(Number(event.target.value))
                    }
                    value={selectedIndex}
                >
                    {findings.map((finding, index) => (
                        <option key={finding.recordId} value={index}>
                            {String(index + 1).padStart(2, "0")} —{" "}
                            {finding.findingTypeLabel}
                        </option>
                    ))}
                </select>
            </label>

            <p aria-live="polite" className="rg-report-record-position">
                Finding {selectedIndex + 1} / {findings.length}
            </p>

            <button
                aria-label="Next finding record"
                className="rg-report-record-step"
                disabled={selectedIndex === findings.length - 1}
                onClick={() => onSelectIndex(selectedIndex + 1)}
                type="button"
            >
                Next
                <ChevronRight aria-hidden="true" size={15} />
            </button>
        </div>
    );
}

interface FindingRecordProps {
    finding: MatchedFindingRecord;
    position: number;
}

/** One attached finding record displayed on the Findings register sheet. */
function FindingRecord({ finding, position }: FindingRecordProps) {
    return (
        <section className="rg-report-attached-record">
            <header className="rg-report-attached-record-header">
                <div>
                    <p className="rg-report-attached-record-kicker">
                        Attached Finding Record{" "}
                        {String(position).padStart(2, "0")}
                    </p>
                    <h3 className="rg-report-attached-record-title">
                        {finding.findingTypeLabel}
                    </h3>
                </div>

                <Badge kind="state" surface="paper" tone="success">
                    Matched
                </Badge>
            </header>

            <section className="rg-report-finding-summary">
                <p className="rg-report-section-label">Expected Issue</p>
                <p className="rg-report-document-copy">
                    {finding.expectedSummary}
                </p>
            </section>

            <dl className="rg-report-ledger">
                <div className="rg-report-ledger-row">
                    <dt>Risk Category</dt>
                    <dd>{formatCategory(finding.expectedCategory)}</dd>
                </div>
                <div className="rg-report-ledger-row">
                    <dt>Expected Severity</dt>
                    <dd>{formatSeverity(finding.expectedSeverity)}</dd>
                </div>
                <div className="rg-report-ledger-row">
                    <dt>Submitted Severity</dt>
                    <dd>{formatSeverity(finding.selectedSeverity)}</dd>
                </div>
            </dl>

            <div className="rg-report-evidence-grid">
                <EvidenceRecord
                    evidence={finding.requiredEvidence}
                    title="Required Evidence"
                />
                <EvidenceRecord
                    evidence={finding.supportedEvidence}
                    title="Submitted Support"
                />
            </div>
        </section>
    );
}

interface EvidenceRecordProps {
    evidence: MatchedFindingRecord["requiredEvidence"];
    title: string;
}

/** Typed evidence-title list used by the finding comparison record. */
function EvidenceRecord({ evidence, title }: EvidenceRecordProps) {
    return (
        <section className="rg-report-evidence-record">
            <h4>{title}</h4>

            {evidence.length === 0 ? (
                <p>No evidence recorded.</p>
            ) : (
                <ul>
                    {evidence.map((item, index) => (
                        <li key={`${item.title}:${index}`}>{item.title}</li>
                    ))}
                </ul>
            )}
        </section>
    );
}
