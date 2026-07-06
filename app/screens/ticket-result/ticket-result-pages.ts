import type {
    FindingSeverity,
    ReleaseVerdict,
    RiskCategory,
} from "../../features/content/content-types";
import type { PagedDocumentPage } from "../../features/paged-document/paged-document-types";
import type {
    ScoreEvidenceReference,
    TicketScoreResult,
} from "../../features/gameplay/scoring/scoring-types";

/** Player-facing evidence title snapshotted into the report model. */
export interface TicketResultEvidenceRecord {
    title: string;
}

/** One persisted score-breakdown row used by the Scoring page. */
export interface CaseAssessmentLineRecord {
    label: string;
    earnedPoints: number;
    maxPoints: number;
    description: string;
}

/** One matched finding record inspected inside the Findings page. */
export interface MatchedFindingRecord {
    recordId: string;
    expectedSummary: string;
    expectedCategory: RiskCategory;
    expectedSeverity: FindingSeverity;
    requiredEvidence: TicketResultEvidenceRecord[];
    findingTypeLabel: string;
    selectedSeverity: FindingSeverity;
    supportedEvidence: TicketResultEvidenceRecord[];
}

/** One missed expected finding inspected inside the Exceptions page. */
export interface MissedFindingRecord {
    recordId: string;
    kind: "missed";
    expectedSummary: string;
    expectedCategory: RiskCategory;
    expectedSeverity: FindingSeverity;
    requiredEvidence: TicketResultEvidenceRecord[];
}

/** One unsupported filed finding inspected inside the Exceptions page. */
export interface UnsupportedFindingRecord {
    recordId: string;
    kind: "unsupported";
    findingTypeLabel: string;
    selectedSeverity: FindingSeverity;
    supportedEvidence: TicketResultEvidenceRecord[];
    reason: string;
}

/** Ordered exception record model used by the Exceptions register. */
export type TicketResultExceptionRecord =
    | MissedFindingRecord
    | UnsupportedFindingRecord;

interface TicketResultPageBase extends PagedDocumentPage {
    label: string;
}

export interface FiledAssessmentPageDescriptor extends TicketResultPageBase {
    id: "filed-assessment";
    kind: "filed-assessment";
    ticketTitle: string;
    ticketId: string;
    submittedAt: string;
    totalScore: number;
    maxScore: number;
    scoreLabel: string;
    selectedVerdict: ReleaseVerdict | null;
    correctVerdict: ReleaseVerdict;
    isVerdictCorrect: boolean;
}

export interface CaseAssessmentPageDescriptor extends TicketResultPageBase {
    id: "case-assessment";
    kind: "case-assessment";
    lines: CaseAssessmentLineRecord[];
}

export interface FindingsPageDescriptor extends TicketResultPageBase {
    id: "findings";
    kind: "findings";
    findings: MatchedFindingRecord[];
}

export interface ExceptionsPageDescriptor extends TicketResultPageBase {
    id: "exceptions";
    kind: "exceptions";
    missedFindingCount: number;
    unsupportedFindingCount: number;
    records: TicketResultExceptionRecord[];
}

export interface InvestigationRecordPageDescriptor extends TicketResultPageBase {
    id: "investigation-record";
    kind: "investigation-record";
    inspectedEvidenceCount: number;
    pinnedEvidenceCount: number;
    filedFindingCount: number;
    boardConnectionCount: number;
}

/** Five stable top-level Ticket Result sheets. */
export type TicketResultPageDescriptor =
    | FiledAssessmentPageDescriptor
    | CaseAssessmentPageDescriptor
    | FindingsPageDescriptor
    | ExceptionsPageDescriptor
    | InvestigationRecordPageDescriptor;

/**
 * Converts one saved score snapshot into five stable report sheets.
 *
 * Variable matched and exception records stay inside their owning report sheet
 * so top-level report navigation does not expand with ticket complexity.
 */
export function buildTicketResultPages(
    result: TicketScoreResult,
): TicketResultPageDescriptor[] {
    return [
        {
            id: "filed-assessment",
            kind: "filed-assessment",
            label: "Outcome",
            ticketTitle: result.ticketTitle,
            ticketId: result.ticketId,
            submittedAt: result.submittedAt,
            totalScore: result.totalScore,
            maxScore: result.maxScore,
            scoreLabel: getScoreLabel(result.totalScore),
            selectedVerdict: result.selectedVerdict,
            correctVerdict: result.correctVerdict,
            isVerdictCorrect: result.isVerdictCorrect,
        },
        {
            id: "case-assessment",
            kind: "case-assessment",
            label: "Scoring",
            lines: [
                result.breakdown.verdict,
                result.breakdown.findings,
                result.breakdown.evidenceSupport,
                result.breakdown.severity,
            ].map((line) => ({
                label: line.label,
                earnedPoints: line.earnedPoints,
                maxPoints: line.maxPoints,
                description: line.description,
            })),
        },
        {
            id: "findings",
            kind: "findings",
            label: "Findings",
            findings: result.matchedFindings.map((finding) => ({
                recordId: finding.filedFindingId,
                expectedSummary: finding.expectedSummary,
                expectedCategory: finding.expectedCategory,
                expectedSeverity: finding.expectedSeverity,
                requiredEvidence: mapEvidenceTitles(finding.requiredEvidence),
                findingTypeLabel: finding.findingTypeLabel,
                selectedSeverity: finding.selectedSeverity,
                supportedEvidence: mapEvidenceTitles(finding.supportedEvidence),
            })),
        },
        {
            id: "exceptions",
            kind: "exceptions",
            label: "Exceptions",
            missedFindingCount: result.missedFindings.length,
            unsupportedFindingCount: result.unsupportedFindings.length,
            records: [
                ...result.missedFindings.map(
                    (finding): MissedFindingRecord => ({
                        recordId: `missed:${finding.expectedFindingId}`,
                        kind: "missed",
                        expectedSummary: finding.expectedSummary,
                        expectedCategory: finding.expectedCategory,
                        expectedSeverity: finding.expectedSeverity,
                        requiredEvidence: mapEvidenceTitles(
                            finding.requiredEvidence,
                        ),
                    }),
                ),
                ...result.unsupportedFindings.map(
                    (finding): UnsupportedFindingRecord => ({
                        recordId: `unsupported:${finding.filedFindingId}`,
                        kind: "unsupported",
                        findingTypeLabel: finding.findingTypeLabel,
                        selectedSeverity: finding.selectedSeverity,
                        supportedEvidence: mapEvidenceTitles(
                            finding.supportedEvidence,
                        ),
                        reason: finding.reason,
                    }),
                ),
            ],
        },
        {
            id: "investigation-record",
            kind: "investigation-record",
            label: "Record",
            inspectedEvidenceCount: result.stats.inspectedEvidenceCount,
            pinnedEvidenceCount: result.stats.pinnedEvidenceCount,
            filedFindingCount: result.stats.filedFindingCount,
            boardConnectionCount: result.stats.boardConnectionCount,
        },
    ];
}

/** Keeps raw evidence IDs out of the report presentation model. */
function mapEvidenceTitles(
    evidence: ScoreEvidenceReference[],
): TicketResultEvidenceRecord[] {
    return evidence.map((item) => ({ title: item.title }));
}

/** Returns the report assessment label for one persisted total score. */
function getScoreLabel(score: number): string {
    if (score >= 90) {
        return "Strong Case";
    }

    if (score >= 70) {
        return "Solid Case";
    }

    if (score >= 50) {
        return "Partial Case";
    }

    return "Weak Case";
}
