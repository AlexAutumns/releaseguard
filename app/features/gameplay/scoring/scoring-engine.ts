import type {
    EvidenceCardDefinition,
    ExpectedFindingDefinition,
    FindingSeverity,
    ReleaseTicketDefinition,
} from "../../content/content-types";
import type { TicketAttemptState } from "../attempt/attempt-state";
import type { FiledFinding } from "../findings/finding-state";
import {
    getFindingTypeById,
    type FindingTypeDefinition,
} from "../findings/finding-types";
import {
    ticketScoreMaxPoints,
    type MatchedFindingScoreResult,
    type MissedFindingScoreResult,
    type ScoreBreakdownLine,
    type ScoreEvidenceReference,
    type TicketScoreBreakdown,
    type TicketScoreResult,
    type UnsupportedFindingScoreResult,
} from "./scoring-types";

/**
 * Point weights for the first deterministic ticket scoring pass.
 *
 * These are intentionally simple and explainable:
 * - verdict: did the final release decision match the authored answer?
 * - findings: did the player identify expected issues?
 * - evidence support: did matched findings include required evidence?
 * - severity: did matched findings use the expected severity level?
 */
const scoreWeights = {
    verdict: 30,
    findings: 50,
    evidenceSupport: 15,
    severity: 5,
} as const;

/**
 * Generic explanation for findings that do not match the authored answer key.
 */
const unsupportedFindingReason =
    "No expected issue matched this finding's category and evidence support combination.";

/**
 * Ordered severity scale for partial severity scoring.
 */
const severityRank: Record<FindingSeverity, number> = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
};

export interface ScoreTicketAttemptInput {
    ticket: ReleaseTicketDefinition;
    attempt: TicketAttemptState;
    submittedAt: string;
}

/**
 * Scores a submitted ticket attempt using deterministic authored answer-key data.
 *
 * This function is intentionally pure. It does not mutate gameplay state, read
 * browser storage, write browser storage, dispatch reducer actions, or navigate.
 */
export function scoreTicketAttempt({
    ticket,
    attempt,
    submittedAt,
}: ScoreTicketAttemptInput): TicketScoreResult {
    const evidenceById = createEvidenceById(ticket.evidenceCards);
    const matchState = matchFiledFindingsToExpectedFindings({
        evidenceById,
        expectedFindings: ticket.expectedFindings,
        filedFindings: attempt.present.findings.filedFindings,
    });

    const expectedFindingCount = ticket.expectedFindings.length;
    const matchedFindingCount = matchState.matchedFindings.length;

    const verdictPoints =
        attempt.present.verdict.selectedVerdict === ticket.correctVerdict
            ? scoreWeights.verdict
            : 0;

    const findingPoints = calculateProportionalPoints({
        earnedItemCount: matchedFindingCount,
        maxPoints: scoreWeights.findings,
        totalItemCount: expectedFindingCount,
    });

    const evidenceSupportPoints = calculateProportionalPoints({
        earnedItemCount: matchedFindingCount,
        maxPoints: scoreWeights.evidenceSupport,
        totalItemCount: expectedFindingCount,
    });

    const severityPoints = clampScoreToMax(
        roundScore(
            matchState.matchedFindings.reduce(
                (totalPoints, matchedFinding) =>
                    totalPoints + matchedFinding.severityPoints,
                0,
            ),
        ),
        scoreWeights.severity,
    );

    const breakdown = createBreakdown({
        evidenceSupportPoints,
        findingPoints,
        severityPoints,
        verdictPoints,
    });

    const totalScore = clampScoreToMax(
        roundScore(
            breakdown.verdict.earnedPoints +
                breakdown.findings.earnedPoints +
                breakdown.evidenceSupport.earnedPoints +
                breakdown.severity.earnedPoints,
        ),
        ticketScoreMaxPoints,
    );

    return {
        schemaVersion: 1,

        attemptId: attempt.context.attemptId,
        shiftId: attempt.context.shiftId,
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        submittedAt,

        selectedVerdict: attempt.present.verdict.selectedVerdict,
        correctVerdict: ticket.correctVerdict,
        isVerdictCorrect:
            attempt.present.verdict.selectedVerdict === ticket.correctVerdict,

        totalScore,
        maxScore: ticketScoreMaxPoints,
        breakdown,

        matchedFindings: matchState.matchedFindings,
        missedFindings: matchState.missedFindings,
        unsupportedFindings: matchState.unsupportedFindings,

        stats: {
            inspectedEvidenceCount:
                attempt.present.evidence.inspectedEvidenceIds.length,
            pinnedEvidenceCount: attempt.present.board.pinnedEvidence.length,
            filedFindingCount: attempt.present.findings.filedFindings.length,
            boardConnectionCount: attempt.present.board.connections.length,
        },
    };
}

interface MatchFiledFindingsInput {
    evidenceById: ReadonlyMap<string, EvidenceCardDefinition>;
    expectedFindings: readonly ExpectedFindingDefinition[];
    filedFindings: readonly FiledFinding[];
}

interface MatchFiledFindingsResult {
    matchedFindings: MatchedFindingScoreResult[];
    missedFindings: MissedFindingScoreResult[];
    unsupportedFindings: UnsupportedFindingScoreResult[];
}

/**
 * Creates one-to-one matches between filed player findings and expected findings.
 *
 * Each expected finding can only be claimed once. This prevents score inflation
 * from filing the same supported issue multiple times.
 */
function matchFiledFindingsToExpectedFindings({
    evidenceById,
    expectedFindings,
    filedFindings,
}: MatchFiledFindingsInput): MatchFiledFindingsResult {
    const matchedExpectedFindingIds = new Set<string>();
    const matchedFindings: MatchedFindingScoreResult[] = [];
    const unsupportedFindings: UnsupportedFindingScoreResult[] = [];

    const findingMaxPerExpectedFinding =
        expectedFindings.length > 0
            ? scoreWeights.findings / expectedFindings.length
            : 0;

    const evidenceSupportMaxPerExpectedFinding =
        expectedFindings.length > 0
            ? scoreWeights.evidenceSupport / expectedFindings.length
            : 0;

    const severityMaxPerExpectedFinding =
        expectedFindings.length > 0
            ? scoreWeights.severity / expectedFindings.length
            : 0;

    filedFindings.forEach((filedFinding) => {
        const findingType = getFindingTypeById(filedFinding.findingTypeId);
        const supportedEvidenceIds =
            getFiledFindingSupportEvidenceIds(filedFinding);

        if (!findingType) {
            unsupportedFindings.push(
                createUnsupportedFindingScoreResult({
                    evidenceById,
                    filedFinding,
                    findingType,
                    reason: "The finding stamp could not be resolved.",
                    supportedEvidenceIds,
                }),
            );
            return;
        }

        const expectedFinding = expectedFindings.find(
            (candidateExpectedFinding) =>
                !matchedExpectedFindingIds.has(candidateExpectedFinding.id) &&
                doesFiledFindingMatchExpectedFinding({
                    expectedFinding: candidateExpectedFinding,
                    findingType,
                    supportedEvidenceIds,
                }),
        );

        if (!expectedFinding) {
            unsupportedFindings.push(
                createUnsupportedFindingScoreResult({
                    evidenceById,
                    filedFinding,
                    findingType,
                    reason: unsupportedFindingReason,
                    supportedEvidenceIds,
                }),
            );
            return;
        }

        matchedExpectedFindingIds.add(expectedFinding.id);

        matchedFindings.push(
            createMatchedFindingScoreResult({
                evidenceById,
                evidenceSupportPoints: evidenceSupportMaxPerExpectedFinding,
                expectedFinding,
                filedFinding,
                findingPoints: findingMaxPerExpectedFinding,
                findingType,
                severityMaxPoints: severityMaxPerExpectedFinding,
                supportedEvidenceIds,
            }),
        );
    });

    const missedFindings = expectedFindings
        .filter(
            (expectedFinding) =>
                !matchedExpectedFindingIds.has(expectedFinding.id),
        )
        .map((expectedFinding) =>
            createMissedFindingScoreResult({
                evidenceById,
                expectedFinding,
            }),
        );

    return {
        matchedFindings,
        missedFindings,
        unsupportedFindings,
    };
}

interface DoesFiledFindingMatchExpectedFindingInput {
    expectedFinding: ExpectedFindingDefinition;
    findingType: FindingTypeDefinition;
    supportedEvidenceIds: ReadonlySet<string>;
}

/**
 * Checks the MVP match rule:
 * - same risk category,
 * - all required evidence IDs present in filed support.
 */
function doesFiledFindingMatchExpectedFinding({
    expectedFinding,
    findingType,
    supportedEvidenceIds,
}: DoesFiledFindingMatchExpectedFindingInput): boolean {
    if (findingType.category !== expectedFinding.category) {
        return false;
    }

    return expectedFinding.requiredEvidenceIds.every((evidenceId) =>
        supportedEvidenceIds.has(evidenceId),
    );
}

interface CreateMatchedFindingScoreResultInput {
    evidenceById: ReadonlyMap<string, EvidenceCardDefinition>;
    evidenceSupportPoints: number;
    expectedFinding: ExpectedFindingDefinition;
    filedFinding: FiledFinding;
    findingPoints: number;
    findingType: FindingTypeDefinition;
    severityMaxPoints: number;
    supportedEvidenceIds: ReadonlySet<string>;
}

/**
 * Creates the report row for one matched finding.
 */
function createMatchedFindingScoreResult({
    evidenceById,
    evidenceSupportPoints,
    expectedFinding,
    filedFinding,
    findingPoints,
    findingType,
    severityMaxPoints,
    supportedEvidenceIds,
}: CreateMatchedFindingScoreResultInput): MatchedFindingScoreResult {
    return {
        expectedFindingId: expectedFinding.id,
        expectedSummary: expectedFinding.summary,
        expectedCategory: expectedFinding.category,
        expectedSeverity: expectedFinding.severity,
        requiredEvidence: createEvidenceReferences(
            expectedFinding.requiredEvidenceIds,
            evidenceById,
        ),

        filedFindingId: filedFinding.filedFindingId,
        findingTypeId: filedFinding.findingTypeId,
        findingTypeLabel: findingType.label,
        selectedSeverity: filedFinding.severity,
        supportedEvidence: createEvidenceReferences(
            Array.from(supportedEvidenceIds),
            evidenceById,
        ),

        findingPoints: roundScore(findingPoints),
        evidenceSupportPoints: roundScore(evidenceSupportPoints),
        severityPoints: calculateSeverityPoints({
            expectedSeverity: expectedFinding.severity,
            maxPoints: severityMaxPoints,
            selectedSeverity: filedFinding.severity,
        }),
    };
}

interface CreateMissedFindingScoreResultInput {
    evidenceById: ReadonlyMap<string, EvidenceCardDefinition>;
    expectedFinding: ExpectedFindingDefinition;
}

/**
 * Creates the report row for one missed authored expected finding.
 */
function createMissedFindingScoreResult({
    evidenceById,
    expectedFinding,
}: CreateMissedFindingScoreResultInput): MissedFindingScoreResult {
    return {
        expectedFindingId: expectedFinding.id,
        expectedSummary: expectedFinding.summary,
        expectedCategory: expectedFinding.category,
        expectedSeverity: expectedFinding.severity,
        requiredEvidence: createEvidenceReferences(
            expectedFinding.requiredEvidenceIds,
            evidenceById,
        ),
    };
}

interface CreateUnsupportedFindingScoreResultInput {
    evidenceById: ReadonlyMap<string, EvidenceCardDefinition>;
    filedFinding: FiledFinding;
    findingType: FindingTypeDefinition | undefined;
    reason: string;
    supportedEvidenceIds: ReadonlySet<string>;
}

/**
 * Creates the report row for one filed finding that did not match the answer key.
 */
function createUnsupportedFindingScoreResult({
    evidenceById,
    filedFinding,
    findingType,
    reason,
    supportedEvidenceIds,
}: CreateUnsupportedFindingScoreResultInput): UnsupportedFindingScoreResult {
    return {
        filedFindingId: filedFinding.filedFindingId,
        findingTypeId: filedFinding.findingTypeId,
        findingTypeLabel: findingType?.label ?? filedFinding.findingTypeId,
        selectedSeverity: filedFinding.severity,
        supportedEvidence: createEvidenceReferences(
            Array.from(supportedEvidenceIds),
            evidenceById,
        ),
        reason,
    };
}

/**
 * Resolves filed finding support from direct evidence plus filed thread snapshots.
 *
 * Important: this intentionally does not read current board connections. Filed
 * findings must stay stable even if the player later cuts or reuses strings.
 */
function getFiledFindingSupportEvidenceIds(
    filedFinding: FiledFinding,
): ReadonlySet<string> {
    const evidenceIds = new Set<string>(filedFinding.linkedEvidenceIds);

    filedFinding.linkedThreadSnapshots.forEach((threadSnapshot) => {
        threadSnapshot.evidenceIds.forEach((evidenceId) => {
            evidenceIds.add(evidenceId);
        });
    });

    return evidenceIds;
}

/**
 * Converts authored evidence IDs into stable report references.
 */
function createEvidenceReferences(
    evidenceIds: readonly string[],
    evidenceById: ReadonlyMap<string, EvidenceCardDefinition>,
): ScoreEvidenceReference[] {
    return evidenceIds.map((evidenceId) => ({
        evidenceId,
        title: evidenceById.get(evidenceId)?.title ?? evidenceId,
    }));
}

/**
 * Creates a lookup map for authored evidence cards.
 */
function createEvidenceById(
    evidenceCards: readonly EvidenceCardDefinition[],
): ReadonlyMap<string, EvidenceCardDefinition> {
    return new Map(
        evidenceCards.map((evidenceCard) => [evidenceCard.id, evidenceCard]),
    );
}

interface CalculateProportionalPointsInput {
    earnedItemCount: number;
    maxPoints: number;
    totalItemCount: number;
}

/**
 * Awards a proportional share of a score area.
 */
function calculateProportionalPoints({
    earnedItemCount,
    maxPoints,
    totalItemCount,
}: CalculateProportionalPointsInput): number {
    if (totalItemCount <= 0) {
        return maxPoints;
    }

    return roundScore((earnedItemCount / totalItemCount) * maxPoints);
}

interface CalculateSeverityPointsInput {
    expectedSeverity: FindingSeverity;
    maxPoints: number;
    selectedSeverity: FindingSeverity;
}

/**
 * Awards full, half, or zero severity credit based on severity distance.
 */
function calculateSeverityPoints({
    expectedSeverity,
    maxPoints,
    selectedSeverity,
}: CalculateSeverityPointsInput): number {
    const severityDistance = Math.abs(
        severityRank[expectedSeverity] - severityRank[selectedSeverity],
    );

    if (severityDistance === 0) {
        return roundScore(maxPoints);
    }

    if (severityDistance === 1) {
        return roundScore(maxPoints / 2);
    }

    return 0;
}

interface CreateBreakdownInput {
    evidenceSupportPoints: number;
    findingPoints: number;
    severityPoints: number;
    verdictPoints: number;
}

/**
 * Creates the score breakdown displayed by the future result screen.
 */
function createBreakdown({
    evidenceSupportPoints,
    findingPoints,
    severityPoints,
    verdictPoints,
}: CreateBreakdownInput): TicketScoreBreakdown {
    return {
        verdict: createBreakdownLine({
            area: "verdict",
            description:
                "Awards points when the final release verdict matches the authored expected decision.",
            earnedPoints: verdictPoints,
            label: "Verdict",
            maxPoints: scoreWeights.verdict,
        }),
        findings: createBreakdownLine({
            area: "findings",
            description:
                "Awards points for matching authored expected findings with the correct finding category and evidence support.",
            earnedPoints: findingPoints,
            label: "Finding Matches",
            maxPoints: scoreWeights.findings,
        }),
        evidenceSupport: createBreakdownLine({
            area: "evidence-support",
            description:
                "Awards points for using the required evidence on matched findings.",
            earnedPoints: evidenceSupportPoints,
            label: "Evidence Support",
            maxPoints: scoreWeights.evidenceSupport,
        }),
        severity: createBreakdownLine({
            area: "severity",
            description:
                "Awards points for choosing severity levels close to the authored expected severities.",
            earnedPoints: severityPoints,
            label: "Severity Accuracy",
            maxPoints: scoreWeights.severity,
        }),
    };
}

interface CreateBreakdownLineInput {
    area: ScoreBreakdownLine["area"];
    description: string;
    earnedPoints: number;
    label: string;
    maxPoints: number;
}

/**
 * Creates one score breakdown row with rounded points.
 */
function createBreakdownLine({
    area,
    description,
    earnedPoints,
    label,
    maxPoints,
}: CreateBreakdownLineInput): ScoreBreakdownLine {
    return {
        area,
        description,
        earnedPoints: roundScore(earnedPoints),
        label,
        maxPoints,
    };
}

/**
 * Rounds scores to one decimal place for stable display and storage.
 */
function roundScore(value: number): number {
    return Math.round(value * 10) / 10;
}

/**
 * Prevents rounded score areas from exceeding their authored maximum.
 *
 * This protects cases such as 5 / 3 severity points being rounded per matched
 * finding and accidentally summing to 5.1 instead of 5.
 */
function clampScoreToMax(value: number, maxPoints: number): number {
    return Math.min(value, maxPoints);
}
