import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "../../../components/ui/Badge";
import type {
    ExceptionsPageDescriptor,
    MissedFindingRecord,
    TicketResultExceptionRecord,
    UnsupportedFindingRecord,
} from "../ticket-result-pages";
import { formatCategory, formatSeverity } from "../ticket-result-formatters";

export interface ExceptionsPageProps {
    page: ExceptionsPageDescriptor;
}

/** Shows exception counts and one attached missed/unsupported record at a time. */
export function ExceptionsPage({ page }: ExceptionsPageProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const safeIndex = Math.min(
        selectedIndex,
        Math.max(page.records.length - 1, 0),
    );
    const record = page.records[safeIndex];

    return (
        <div className="rg-report-page">
            <header className="rg-report-page-header">
                <div>
                    <p className="rg-report-page-eyebrow">Exceptions</p>
                    <h2 className="rg-report-page-title">
                        Casework exceptions
                    </h2>
                </div>
            </header>

            <dl className="rg-report-ledger rg-report-ledger--exceptions">
                <div className="rg-report-ledger-row rg-report-ledger-row--described">
                    <dt>Missed Findings</dt>
                    <dd>
                        {page.missedFindingCount === 0
                            ? "None"
                            : page.missedFindingCount}
                    </dd>
                    <dd className="rg-report-ledger-description">
                        {page.missedFindingCount === 0
                            ? "No expected findings were missed."
                            : `${page.missedFindingCount} expected finding${page.missedFindingCount === 1 ? " was" : "s were"} not matched by filed casework.`}
                    </dd>
                </div>

                <div className="rg-report-ledger-row rg-report-ledger-row--described">
                    <dt>Unsupported Claims</dt>
                    <dd>
                        {page.unsupportedFindingCount === 0
                            ? "None"
                            : page.unsupportedFindingCount}
                    </dd>
                    <dd className="rg-report-ledger-description">
                        {page.unsupportedFindingCount === 0
                            ? "No unsupported findings were filed."
                            : `${page.unsupportedFindingCount} filed finding${page.unsupportedFindingCount === 1 ? " was" : "s were"} not matched to the authored answer key.`}
                    </dd>
                </div>
            </dl>

            {!record ? null : (
                <>
                    {page.records.length > 1 ? (
                        <ExceptionRecordNavigation
                            onSelectIndex={setSelectedIndex}
                            records={page.records}
                            selectedIndex={safeIndex}
                        />
                    ) : null}

                    <ExceptionRecord record={record} position={safeIndex + 1} />
                </>
            )}
        </div>
    );
}

interface ExceptionRecordNavigationProps {
    records: TicketResultExceptionRecord[];
    selectedIndex: number;
    onSelectIndex: (index: number) => void;
}

/** Local filing index for missed and unsupported exception records. */
function ExceptionRecordNavigation({
    records,
    selectedIndex,
    onSelectIndex,
}: ExceptionRecordNavigationProps) {
    return (
        <div className="rg-report-record-navigation">
            <button
                aria-label="Previous exception record"
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
                    aria-label="Exception record index"
                    onChange={(event) =>
                        onSelectIndex(Number(event.target.value))
                    }
                    value={selectedIndex}
                >
                    {records.map((record, index) => (
                        <option key={record.recordId} value={index}>
                            {formatExceptionOption(record, index)}
                        </option>
                    ))}
                </select>
            </label>

            <p aria-live="polite" className="rg-report-record-position">
                Exception {selectedIndex + 1} / {records.length}
            </p>

            <button
                aria-label="Next exception record"
                className="rg-report-record-step"
                disabled={selectedIndex === records.length - 1}
                onClick={() => onSelectIndex(selectedIndex + 1)}
                type="button"
            >
                Next
                <ChevronRight aria-hidden="true" size={15} />
            </button>
        </div>
    );
}

/** Formats one exception option without hiding its missed/unsupported type. */
function formatExceptionOption(
    record: TicketResultExceptionRecord,
    index: number,
): string {
    const prefix = String(index + 1).padStart(2, "0");

    if (record.kind === "missed") {
        return `${prefix} — MISSED — ${formatCategory(record.expectedCategory)}`;
    }

    return `${prefix} — UNSUPPORTED — ${record.findingTypeLabel}`;
}

interface ExceptionRecordProps {
    record: TicketResultExceptionRecord;
    position: number;
}

/** Renders the active exception record through discriminated-union narrowing. */
function ExceptionRecord({ record, position }: ExceptionRecordProps) {
    if (record.kind === "missed") {
        return <MissedRecord record={record} position={position} />;
    }

    return <UnsupportedRecord record={record} position={position} />;
}

interface MissedRecordProps {
    record: MissedFindingRecord;
    position: number;
}

/** Attached record for one expected finding missed by the submitted casework. */
function MissedRecord({ record, position }: MissedRecordProps) {
    return (
        <section className="rg-report-attached-record">
            <header className="rg-report-attached-record-header">
                <div>
                    <p className="rg-report-attached-record-kicker">
                        Exception Record {String(position).padStart(2, "0")}
                    </p>
                    <h3 className="rg-report-attached-record-title">
                        Missed finding
                    </h3>
                </div>

                <Badge kind="state" surface="paper" tone="warning">
                    Missed
                </Badge>
            </header>

            <section className="rg-report-finding-summary">
                <p className="rg-report-section-label">Expected Issue</p>
                <p className="rg-report-document-copy">
                    {record.expectedSummary}
                </p>
            </section>

            <dl className="rg-report-ledger">
                <div className="rg-report-ledger-row">
                    <dt>Risk Category</dt>
                    <dd>{formatCategory(record.expectedCategory)}</dd>
                </div>
                <div className="rg-report-ledger-row">
                    <dt>Expected Severity</dt>
                    <dd>{formatSeverity(record.expectedSeverity)}</dd>
                </div>
            </dl>

            <section className="rg-report-evidence-record">
                <h4>Required Evidence</h4>
                <EvidenceList evidence={record.requiredEvidence} />
            </section>
        </section>
    );
}

interface UnsupportedRecordProps {
    record: UnsupportedFindingRecord;
    position: number;
}

/** Attached record for one filed finding unsupported by the answer key. */
function UnsupportedRecord({ record, position }: UnsupportedRecordProps) {
    return (
        <section className="rg-report-attached-record">
            <header className="rg-report-attached-record-header">
                <div>
                    <p className="rg-report-attached-record-kicker">
                        Exception Record {String(position).padStart(2, "0")}
                    </p>
                    <h3 className="rg-report-attached-record-title">
                        {record.findingTypeLabel}
                    </h3>
                </div>

                <Badge kind="state" surface="paper" tone="danger">
                    Unsupported
                </Badge>
            </header>

            <section className="rg-report-finding-summary rg-report-finding-summary--danger">
                <p className="rg-report-section-label">Scoring Reason</p>
                <p className="rg-report-document-copy">{record.reason}</p>
            </section>

            <dl className="rg-report-ledger">
                <div className="rg-report-ledger-row">
                    <dt>Submitted Severity</dt>
                    <dd>{formatSeverity(record.selectedSeverity)}</dd>
                </div>
            </dl>

            <section className="rg-report-evidence-record">
                <h4>Submitted Support</h4>
                <EvidenceList evidence={record.supportedEvidence} />
            </section>
        </section>
    );
}

interface EvidenceListProps {
    evidence: { title: string }[];
}

/** Readable evidence-title list shared by exception record variants. */
function EvidenceList({ evidence }: EvidenceListProps) {
    if (evidence.length === 0) {
        return <p>No evidence recorded.</p>;
    }

    return (
        <ul>
            {evidence.map((item, index) => (
                <li key={`${item.title}:${index}`}>{item.title}</li>
            ))}
        </ul>
    );
}
