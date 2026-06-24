import type {
    FindingSeverity,
    ReleaseVerdict,
    RiskCategory,
} from "../../content/content-types";
import type { FindingTypeId } from "../findings/finding-types";

/**
 * Current schema version for saved ticket score results.
 *
 * Keep this explicit so future result migrations have a stable version marker
 * instead of guessing from object shape.
 */
export type TicketScoreSchemaVersion = 1;

/**
 * Stable scoring areas used by the result breakdown.
 *
 * These IDs are intentionally separate from display labels so UI copy can
 * change without affecting saved result data.
 */
export type ScoreBreakdownArea =
    | "verdict"
    | "findings"
    | "evidence-support"
    | "severity";

/**
 * Maximum score for one submitted ticket result.
 */
export const ticketScoreMaxPoints = 100;

/**
 * One row in the score breakdown.
 *
 * Example:
 * - Verdict: 30 / 30
 * - Findings: 33.3 / 50
 */
export interface ScoreBreakdownLine {
    area: ScoreBreakdownArea;
    label: string;
    earnedPoints: number;
    maxPoints: number;
    description: string;
}

/**
 * Full point breakdown for a submitted ticket.
 *
 * The total score is calculated from these lines. Keeping each line separate
 * makes the result report explainable instead of hiding everything inside one
 * opaque number.
 */
export interface TicketScoreBreakdown {
    verdict: ScoreBreakdownLine;
    findings: ScoreBreakdownLine;
    evidenceSupport: ScoreBreakdownLine;
    severity: ScoreBreakdownLine;
}

/**
 * Evidence reference stored in scoring results.
 *
 * The title is snapshotted so the result screen can still display readable
 * evidence names without depending heavily on live board state.
 */
export interface ScoreEvidenceReference {
    evidenceId: string;
    title: string;
}

/**
 * Result for one player finding that matched an authored expected finding.
 *
 * A match means the player's generic finding stamp category and submitted
 * evidence support matched one expected issue from the ticket answer key.
 */
export interface MatchedFindingScoreResult {
    expectedFindingId: string;
    expectedSummary: string;
    expectedCategory: RiskCategory;
    expectedSeverity: FindingSeverity;
    requiredEvidence: ScoreEvidenceReference[];

    filedFindingId: string;
    findingTypeId: FindingTypeId;
    findingTypeLabel: string;
    selectedSeverity: FindingSeverity;
    supportedEvidence: ScoreEvidenceReference[];

    findingPoints: number;
    evidenceSupportPoints: number;
    severityPoints: number;
}

/**
 * Result for one authored expected finding that the player did not identify.
 */
export interface MissedFindingScoreResult {
    expectedFindingId: string;
    expectedSummary: string;
    expectedCategory: RiskCategory;
    expectedSeverity: FindingSeverity;
    requiredEvidence: ScoreEvidenceReference[];
}

/**
 * Result for one player finding that did not match the answer key.
 *
 * This can happen because of a wrong category, weak evidence support, or a
 * duplicate finding after the matching expected issue was already claimed.
 */
export interface UnsupportedFindingScoreResult {
    filedFindingId: string;
    findingTypeId: FindingTypeId;
    findingTypeLabel: string;
    selectedSeverity: FindingSeverity;
    supportedEvidence: ScoreEvidenceReference[];
    reason: string;
}

/**
 * Basic investigation activity counters shown on the result report.
 *
 * These are not the main score. They help explain how much work the player did.
 */
export interface TicketScoreStats {
    inspectedEvidenceCount: number;
    pinnedEvidenceCount: number;
    filedFindingCount: number;
    boardConnectionCount: number;
}

/**
 * Saved result for one submitted ticket attempt.
 *
 * This is the object that later gets stored and loaded by the ticket result
 * screen. It should be stable enough to render after a page refresh without
 * recomputing from mutable board state.
 */
export interface TicketScoreResult {
    schemaVersion: TicketScoreSchemaVersion;

    attemptId: string;
    shiftId: string;
    ticketId: string;
    ticketTitle: string;
    submittedAt: string;

    selectedVerdict: ReleaseVerdict | null;
    correctVerdict: ReleaseVerdict;
    isVerdictCorrect: boolean;

    totalScore: number;
    maxScore: typeof ticketScoreMaxPoints;
    breakdown: TicketScoreBreakdown;

    matchedFindings: MatchedFindingScoreResult[];
    missedFindings: MissedFindingScoreResult[];
    unsupportedFindings: UnsupportedFindingScoreResult[];

    stats: TicketScoreStats;
}
