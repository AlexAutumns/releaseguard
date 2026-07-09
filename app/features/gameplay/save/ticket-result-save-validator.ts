import type {
    ContentCatalog,
    FindingSeverity,
    ReleaseVerdict,
} from "../../content/content-types";
import { findingTypeCatalog } from "../findings/finding-types";
import type {
    MatchedFindingScoreResult,
    MissedFindingScoreResult,
    ScoreBreakdownArea,
    ScoreBreakdownLine,
    ScoreEvidenceReference,
    TicketScoreBreakdown,
    TicketScoreResult,
    UnsupportedFindingScoreResult,
} from "../scoring/scoring-types";
import { ruleFail, ruleOk, type RuleResult } from "../shared/rule-result";

const verdicts = new Set<ReleaseVerdict>(["ship", "watch", "hold", "block"]);

const severities = new Set<FindingSeverity>([
    "low",
    "medium",
    "high",
    "critical",
]);

const scoreAreaDefinitions = {
    verdict: {
        area: "verdict",
        maxPoints: 30,
    },
    findings: {
        area: "findings",
        maxPoints: 50,
    },
    evidenceSupport: {
        area: "evidence-support",
        maxPoints: 15,
    },
    severity: {
        area: "severity",
        maxPoints: 5,
    },
} as const satisfies Record<
    keyof TicketScoreBreakdown,
    {
        area: ScoreBreakdownArea;
        maxPoints: number;
    }
>;

/**
 * Deeply validates one imported immutable Ticket Result.
 *
 * The validator checks persisted shape, current authored-content compatibility,
 * score-row consistency, and finding/evidence relationships. It deliberately
 * does not recreate the scoring engine from absent live attempt state.
 */
export function validateImportedTicketScoreResult(
    value: unknown,
    catalog: ContentCatalog,
    path: string,
): RuleResult<TicketScoreResult> {
    if (!isRecord(value) || !hasOnlyKeys(value, ticketResultKeys)) {
        return invalidRecord(path, "must be a valid Ticket Result object.");
    }

    if (
        value.schemaVersion !== 1 ||
        !isNonEmptyString(value.attemptId) ||
        !isNonEmptyString(value.shiftId) ||
        !isNonEmptyString(value.ticketId) ||
        !isNonEmptyString(value.ticketTitle) ||
        !isCanonicalIsoDateTime(value.submittedAt)
    ) {
        return invalidRecord(
            path,
            "contains invalid result identity or submission fields.",
        );
    }

    const shift = catalog.shifts.find((item) => item.id === value.shiftId);
    const ticket = catalog.tickets.find((item) => item.id === value.ticketId);

    if (!shift) {
        return invalidRecord(
            path,
            `references unavailable shift "${value.shiftId}".`,
        );
    }

    if (!ticket) {
        return invalidRecord(
            path,
            `references unavailable ticket "${value.ticketId}".`,
        );
    }

    if (!shift.ticketIds.includes(ticket.id)) {
        return invalidRecord(
            path,
            `ticket "${ticket.id}" is not assigned to shift "${shift.id}".`,
        );
    }

    if (value.ticketTitle !== ticket.title) {
        return invalidRecord(
            `${path}.ticketTitle`,
            `must match authored ticket title "${ticket.title}".`,
        );
    }

    if (
        !isNullableVerdict(value.selectedVerdict) ||
        !isVerdict(value.correctVerdict) ||
        value.correctVerdict !== ticket.correctVerdict ||
        typeof value.isVerdictCorrect !== "boolean" ||
        value.isVerdictCorrect !==
            (value.selectedVerdict === value.correctVerdict)
    ) {
        return invalidRecord(path, "contains inconsistent verdict fields.");
    }

    const breakdownResult = validateScoreBreakdown(value.breakdown, path);

    if (!breakdownResult.ok) {
        return breakdownResult;
    }

    if (
        !isFiniteNumber(value.totalScore) ||
        value.maxScore !== 100 ||
        value.totalScore < 0 ||
        value.totalScore > value.maxScore
    ) {
        return invalidRecord(path, "contains an invalid total score.");
    }

    if (
        !Array.isArray(value.matchedFindings) ||
        !Array.isArray(value.missedFindings) ||
        !Array.isArray(value.unsupportedFindings)
    ) {
        return invalidRecord(
            path,
            "contains invalid finding result collections.",
        );
    }

    const matchedFindings: MatchedFindingScoreResult[] = [];

    for (const [index, item] of value.matchedFindings.entries()) {
        const result = validateMatchedFinding({
            value: item,
            catalog,
            ticketId: ticket.id,
            path: `${path}.matchedFindings[${index}]`,
        });

        if (!result.ok) {
            return result;
        }

        matchedFindings.push(result.value);
    }

    const missedFindings: MissedFindingScoreResult[] = [];

    for (const [index, item] of value.missedFindings.entries()) {
        const result = validateMissedFinding({
            value: item,
            catalog,
            ticketId: ticket.id,
            path: `${path}.missedFindings[${index}]`,
        });

        if (!result.ok) {
            return result;
        }

        missedFindings.push(result.value);
    }

    const unsupportedFindings: UnsupportedFindingScoreResult[] = [];

    for (const [index, item] of value.unsupportedFindings.entries()) {
        const result = validateUnsupportedFinding({
            value: item,
            catalog,
            ticketId: ticket.id,
            path: `${path}.unsupportedFindings[${index}]`,
        });

        if (!result.ok) {
            return result;
        }

        unsupportedFindings.push(result.value);
    }

    const findingCoverageResult = validateExpectedFindingCoverage({
        ticketId: ticket.id,
        catalog,
        matchedFindings,
        missedFindings,
        path,
    });

    if (!findingCoverageResult.ok) {
        return findingCoverageResult;
    }

    const filedFindingIds = [
        ...matchedFindings.map((finding) => finding.filedFindingId),
        ...unsupportedFindings.map((finding) => finding.filedFindingId),
    ];

    if (new Set(filedFindingIds).size !== filedFindingIds.length) {
        return invalidRecord(path, "contains duplicate filed finding IDs.");
    }

    const statsResult = validateTicketResultStats({
        value: value.stats,
        ticketEvidenceCount: ticket.evidenceCards.length,
        filedFindingCount: filedFindingIds.length,
        resultPath: path,
    });

    if (!statsResult.ok) {
        return statsResult;
    }

    const scoreConsistencyResult = validateScoreConsistency({
        breakdown: breakdownResult.value,
        isVerdictCorrect: value.isVerdictCorrect,
        matchedFindings,
        totalScore: value.totalScore,
        path,
    });

    if (!scoreConsistencyResult.ok) {
        return scoreConsistencyResult;
    }

    return ruleOk({
        schemaVersion: 1,
        attemptId: value.attemptId,
        shiftId: value.shiftId,
        ticketId: value.ticketId,
        ticketTitle: value.ticketTitle,
        submittedAt: value.submittedAt,

        selectedVerdict: value.selectedVerdict,
        correctVerdict: value.correctVerdict,
        isVerdictCorrect: value.isVerdictCorrect,

        totalScore: value.totalScore,
        maxScore: 100,
        breakdown: breakdownResult.value,

        matchedFindings,
        missedFindings,
        unsupportedFindings,

        stats: statsResult.value,
    });
}

/**
 * Validates the fixed four-area scoring breakdown.
 */
function validateScoreBreakdown(
    value: unknown,
    resultPath: string,
): RuleResult<TicketScoreBreakdown> {
    if (!isRecord(value) || !hasOnlyKeys(value, breakdownKeys)) {
        return invalidRecord(
            `${resultPath}.breakdown`,
            "must contain only the supported scoring areas.",
        );
    }

    const verdict = validateScoreBreakdownLine({
        value: value.verdict,
        ...scoreAreaDefinitions.verdict,
        path: `${resultPath}.breakdown.verdict`,
    });

    if (!verdict.ok) {
        return verdict;
    }

    const findings = validateScoreBreakdownLine({
        value: value.findings,
        ...scoreAreaDefinitions.findings,
        path: `${resultPath}.breakdown.findings`,
    });

    if (!findings.ok) {
        return findings;
    }

    const evidenceSupport = validateScoreBreakdownLine({
        value: value.evidenceSupport,
        ...scoreAreaDefinitions.evidenceSupport,
        path: `${resultPath}.breakdown.evidenceSupport`,
    });

    if (!evidenceSupport.ok) {
        return evidenceSupport;
    }

    const severity = validateScoreBreakdownLine({
        value: value.severity,
        ...scoreAreaDefinitions.severity,
        path: `${resultPath}.breakdown.severity`,
    });

    if (!severity.ok) {
        return severity;
    }

    return ruleOk({
        verdict: verdict.value,
        findings: findings.value,
        evidenceSupport: evidenceSupport.value,
        severity: severity.value,
    });
}

/**
 * Validates one immutable score-breakdown row.
 */
function validateScoreBreakdownLine({
    value,
    area,
    maxPoints,
    path,
}: {
    value: unknown;
    area: ScoreBreakdownArea;
    maxPoints: number;
    path: string;
}): RuleResult<ScoreBreakdownLine> {
    if (
        !isRecord(value) ||
        !hasOnlyKeys(value, breakdownLineKeys) ||
        value.area !== area ||
        !isNonEmptyString(value.label) ||
        !isFiniteNumber(value.earnedPoints) ||
        value.earnedPoints < 0 ||
        value.earnedPoints > maxPoints ||
        value.maxPoints !== maxPoints ||
        !isNonEmptyString(value.description)
    ) {
        return invalidRecord(path, `must be a valid "${area}" scoring row.`);
    }

    return ruleOk({
        area,
        label: value.label,
        earnedPoints: value.earnedPoints,
        maxPoints,
        description: value.description,
    });
}

/**
 * Validates one matched player finding against current authored answer data.
 */
function validateMatchedFinding({
    value,
    catalog,
    ticketId,
    path,
}: {
    value: unknown;
    catalog: ContentCatalog;
    ticketId: string;
    path: string;
}): RuleResult<MatchedFindingScoreResult> {
    if (!isRecord(value) || !hasOnlyKeys(value, matchedFindingKeys)) {
        return invalidRecord(path, "must be a valid matched finding record.");
    }

    const ticket = catalog.tickets.find((item) => item.id === ticketId);

    if (!ticket) {
        return invalidRecord(path, `cannot resolve ticket "${ticketId}".`);
    }

    const expectedFinding = ticket.expectedFindings.find(
        (finding) => finding.id === value.expectedFindingId,
    );
    const findingType = findingTypeCatalog.find(
        (finding) => finding.id === value.findingTypeId,
    );

    if (
        !isNonEmptyString(value.filedFindingId) ||
        !expectedFinding ||
        !findingType ||
        value.findingTypeLabel !== findingType.label ||
        value.expectedSummary !== expectedFinding.summary ||
        value.expectedCategory !== expectedFinding.category ||
        value.expectedSeverity !== expectedFinding.severity ||
        findingType.category !== expectedFinding.category ||
        !isSeverity(value.selectedSeverity) ||
        !isScoreWithinArea(value.findingPoints, 50) ||
        !isScoreWithinArea(value.evidenceSupportPoints, 15) ||
        !isScoreWithinArea(value.severityPoints, 5)
    ) {
        return invalidRecord(
            path,
            "contains data inconsistent with its authored finding or finding stamp.",
        );
    }

    const requiredEvidenceResult = validateEvidenceReferences({
        value: value.requiredEvidence,
        catalog,
        ticketId,
        path: `${path}.requiredEvidence`,
    });

    if (!requiredEvidenceResult.ok) {
        return requiredEvidenceResult;
    }

    const supportedEvidenceResult = validateEvidenceReferences({
        value: value.supportedEvidence,
        catalog,
        ticketId,
        path: `${path}.supportedEvidence`,
    });

    if (!supportedEvidenceResult.ok) {
        return supportedEvidenceResult;
    }

    if (
        !sameEvidenceIdSet(
            requiredEvidenceResult.value,
            expectedFinding.requiredEvidenceIds,
        )
    ) {
        return invalidRecord(
            `${path}.requiredEvidence`,
            "does not match the authored required evidence set.",
        );
    }

    const supportedEvidenceIds = new Set(
        supportedEvidenceResult.value.map((evidence) => evidence.evidenceId),
    );

    if (
        expectedFinding.requiredEvidenceIds.some(
            (evidenceId) => !supportedEvidenceIds.has(evidenceId),
        )
    ) {
        return invalidRecord(
            `${path}.supportedEvidence`,
            "does not contain every authored required evidence item.",
        );
    }

    return ruleOk({
        expectedFindingId: expectedFinding.id,
        expectedSummary: expectedFinding.summary,
        expectedCategory: expectedFinding.category,
        expectedSeverity: expectedFinding.severity,
        requiredEvidence: requiredEvidenceResult.value,

        filedFindingId: value.filedFindingId,
        findingTypeId: findingType.id,
        findingTypeLabel: findingType.label,
        selectedSeverity: value.selectedSeverity,
        supportedEvidence: supportedEvidenceResult.value,

        findingPoints: value.findingPoints,
        evidenceSupportPoints: value.evidenceSupportPoints,
        severityPoints: value.severityPoints,
    });
}

/**
 * Validates one missed expected finding against current authored answer data.
 */
function validateMissedFinding({
    value,
    catalog,
    ticketId,
    path,
}: {
    value: unknown;
    catalog: ContentCatalog;
    ticketId: string;
    path: string;
}): RuleResult<MissedFindingScoreResult> {
    if (!isRecord(value) || !hasOnlyKeys(value, missedFindingKeys)) {
        return invalidRecord(path, "must be a valid missed finding record.");
    }

    const ticket = catalog.tickets.find((item) => item.id === ticketId);
    const expectedFinding = ticket?.expectedFindings.find(
        (finding) => finding.id === value.expectedFindingId,
    );

    if (
        !expectedFinding ||
        value.expectedSummary !== expectedFinding.summary ||
        value.expectedCategory !== expectedFinding.category ||
        value.expectedSeverity !== expectedFinding.severity
    ) {
        return invalidRecord(
            path,
            "does not match a current authored expected finding.",
        );
    }

    const requiredEvidenceResult = validateEvidenceReferences({
        value: value.requiredEvidence,
        catalog,
        ticketId,
        path: `${path}.requiredEvidence`,
    });

    if (!requiredEvidenceResult.ok) {
        return requiredEvidenceResult;
    }

    if (
        !sameEvidenceIdSet(
            requiredEvidenceResult.value,
            expectedFinding.requiredEvidenceIds,
        )
    ) {
        return invalidRecord(
            `${path}.requiredEvidence`,
            "does not match the authored required evidence set.",
        );
    }

    return ruleOk({
        expectedFindingId: expectedFinding.id,
        expectedSummary: expectedFinding.summary,
        expectedCategory: expectedFinding.category,
        expectedSeverity: expectedFinding.severity,
        requiredEvidence: requiredEvidenceResult.value,
    });
}

/**
 * Validates one unsupported filed finding and its submitted evidence references.
 */
function validateUnsupportedFinding({
    value,
    catalog,
    ticketId,
    path,
}: {
    value: unknown;
    catalog: ContentCatalog;
    ticketId: string;
    path: string;
}): RuleResult<UnsupportedFindingScoreResult> {
    if (!isRecord(value) || !hasOnlyKeys(value, unsupportedFindingKeys)) {
        return invalidRecord(
            path,
            "must be a valid unsupported finding record.",
        );
    }

    const findingType = findingTypeCatalog.find(
        (finding) => finding.id === value.findingTypeId,
    );

    if (
        !isNonEmptyString(value.filedFindingId) ||
        !findingType ||
        value.findingTypeLabel !== findingType.label ||
        !isSeverity(value.selectedSeverity) ||
        !isNonEmptyString(value.reason)
    ) {
        return invalidRecord(
            path,
            "contains invalid finding stamp, severity, or reason data.",
        );
    }

    const supportedEvidenceResult = validateEvidenceReferences({
        value: value.supportedEvidence,
        catalog,
        ticketId,
        path: `${path}.supportedEvidence`,
    });

    if (!supportedEvidenceResult.ok) {
        return supportedEvidenceResult;
    }

    return ruleOk({
        filedFindingId: value.filedFindingId,
        findingTypeId: findingType.id,
        findingTypeLabel: findingType.label,
        selectedSeverity: value.selectedSeverity,
        supportedEvidence: supportedEvidenceResult.value,
        reason: value.reason,
    });
}

/**
 * Verifies that matched and missed records cover the authored answer key once.
 */
function validateExpectedFindingCoverage({
    ticketId,
    catalog,
    matchedFindings,
    missedFindings,
    path,
}: {
    ticketId: string;
    catalog: ContentCatalog;
    matchedFindings: MatchedFindingScoreResult[];
    missedFindings: MissedFindingScoreResult[];
    path: string;
}): RuleResult<true> {
    const ticket = catalog.tickets.find((item) => item.id === ticketId);

    if (!ticket) {
        return invalidRecord(path, `cannot resolve ticket "${ticketId}".`);
    }

    const reportedExpectedFindingIds = [
        ...matchedFindings.map((finding) => finding.expectedFindingId),
        ...missedFindings.map((finding) => finding.expectedFindingId),
    ];

    if (
        new Set(reportedExpectedFindingIds).size !==
        reportedExpectedFindingIds.length
    ) {
        return invalidRecord(
            path,
            "reports one expected finding more than once.",
        );
    }

    const authoredExpectedFindingIds = new Set(
        ticket.expectedFindings.map((finding) => finding.id),
    );

    if (
        reportedExpectedFindingIds.length !== authoredExpectedFindingIds.size ||
        reportedExpectedFindingIds.some(
            (findingId) => !authoredExpectedFindingIds.has(findingId),
        )
    ) {
        return invalidRecord(
            path,
            "does not report every authored expected finding exactly once as matched or missed.",
        );
    }

    return ruleOk(true);
}

/**
 * Verifies that persisted score rows agree with the persisted finding rows.
 *
 * This checks internal save consistency without becoming a second scoring
 * engine. Per-finding points remain validated as bounded persisted data.
 */
function validateScoreConsistency({
    breakdown,
    isVerdictCorrect,
    matchedFindings,
    totalScore,
    path,
}: {
    breakdown: TicketScoreBreakdown;
    isVerdictCorrect: boolean;
    matchedFindings: MatchedFindingScoreResult[];
    totalScore: number;
    path: string;
}): RuleResult<true> {
    const expectedVerdictPoints = isVerdictCorrect ? 30 : 0;
    const findingPoints = clampScoreToMax(
        roundScore(
            matchedFindings.reduce(
                (total, finding) => total + finding.findingPoints,
                0,
            ),
        ),
        50,
    );
    const evidenceSupportPoints = clampScoreToMax(
        roundScore(
            matchedFindings.reduce(
                (total, finding) => total + finding.evidenceSupportPoints,
                0,
            ),
        ),
        15,
    );
    const severityPoints = clampScoreToMax(
        roundScore(
            matchedFindings.reduce(
                (total, finding) => total + finding.severityPoints,
                0,
            ),
        ),
        5,
    );

    if (
        breakdown.verdict.earnedPoints !== expectedVerdictPoints ||
        breakdown.findings.earnedPoints !== findingPoints ||
        breakdown.evidenceSupport.earnedPoints !== evidenceSupportPoints ||
        breakdown.severity.earnedPoints !== severityPoints
    ) {
        return invalidRecord(
            `${path}.breakdown`,
            "does not agree with the persisted verdict and matched-finding score rows.",
        );
    }

    const expectedTotalScore = clampScoreToMax(
        roundScore(
            breakdown.verdict.earnedPoints +
                breakdown.findings.earnedPoints +
                breakdown.evidenceSupport.earnedPoints +
                breakdown.severity.earnedPoints,
        ),
        100,
    );

    if (totalScore !== expectedTotalScore) {
        return invalidRecord(
            `${path}.totalScore`,
            "does not equal the persisted score breakdown total.",
        );
    }

    return ruleOk(true);
}

/**
 * Validates one imported evidence reference against current ticket evidence.
 */
function validateEvidenceReferences({
    value,
    catalog,
    ticketId,
    path,
}: {
    value: unknown;
    catalog: ContentCatalog;
    ticketId: string;
    path: string;
}): RuleResult<ScoreEvidenceReference[]> {
    if (!Array.isArray(value)) {
        return invalidRecord(path, "must be an evidence-reference array.");
    }

    const ticket = catalog.tickets.find((item) => item.id === ticketId);

    if (!ticket) {
        return invalidRecord(path, `cannot resolve ticket "${ticketId}".`);
    }

    const references: ScoreEvidenceReference[] = [];
    const evidenceIds = new Set<string>();

    for (const [index, item] of value.entries()) {
        if (
            !isRecord(item) ||
            !hasOnlyKeys(item, evidenceReferenceKeys) ||
            !isNonEmptyString(item.evidenceId) ||
            !isNonEmptyString(item.title)
        ) {
            return invalidRecord(
                `${path}[${index}]`,
                "must be a valid evidence reference.",
            );
        }

        const evidence = ticket.evidenceCards.find(
            (card) => card.id === item.evidenceId,
        );

        if (
            !evidence ||
            item.title !== evidence.title ||
            evidenceIds.has(item.evidenceId)
        ) {
            return invalidRecord(
                `${path}[${index}]`,
                "references unavailable, renamed, or duplicated ticket evidence.",
            );
        }

        evidenceIds.add(item.evidenceId);

        references.push({
            evidenceId: evidence.id,
            title: evidence.title,
        });
    }

    return ruleOk(references);
}

/**
 * Validates immutable investigation activity counters.
 */
function validateTicketResultStats({
    value,
    ticketEvidenceCount,
    filedFindingCount,
    resultPath,
}: {
    value: unknown;
    ticketEvidenceCount: number;
    filedFindingCount: number;
    resultPath: string;
}): RuleResult<TicketScoreResult["stats"]> {
    if (!isRecord(value) || !hasOnlyKeys(value, statsKeys)) {
        return invalidRecord(
            `${resultPath}.stats`,
            "must contain only supported investigation counters.",
        );
    }

    if (
        !isNonNegativeInteger(value.inspectedEvidenceCount) ||
        value.inspectedEvidenceCount > ticketEvidenceCount ||
        !isNonNegativeInteger(value.pinnedEvidenceCount) ||
        value.pinnedEvidenceCount > ticketEvidenceCount ||
        !isNonNegativeInteger(value.filedFindingCount) ||
        value.filedFindingCount !== filedFindingCount ||
        !isNonNegativeInteger(value.boardConnectionCount)
    ) {
        return invalidRecord(
            `${resultPath}.stats`,
            "contains counters inconsistent with the submitted Ticket Result.",
        );
    }

    return ruleOk({
        inspectedEvidenceCount: value.inspectedEvidenceCount,
        pinnedEvidenceCount: value.pinnedEvidenceCount,
        filedFindingCount: value.filedFindingCount,
        boardConnectionCount: value.boardConnectionCount,
    });
}

/**
 * Returns whether references contain the same evidence IDs as an authored set.
 */
function sameEvidenceIdSet(
    references: ScoreEvidenceReference[],
    expectedEvidenceIds: string[],
): boolean {
    if (references.length !== expectedEvidenceIds.length) {
        return false;
    }

    const referenceIds = new Set(
        references.map((reference) => reference.evidenceId),
    );

    return expectedEvidenceIds.every((evidenceId) =>
        referenceIds.has(evidenceId),
    );
}

/**
 * Checks one score value against a fixed persisted score-area maximum.
 */
function isScoreWithinArea(value: unknown, maxPoints: number): value is number {
    return isFiniteNumber(value) && value >= 0 && value <= maxPoints;
}

/**
 * Checks one runtime value against the supported release-verdict enum.
 */
function isVerdict(value: unknown): value is ReleaseVerdict {
    return typeof value === "string" && verdicts.has(value as ReleaseVerdict);
}

/**
 * Checks one runtime value as a nullable release verdict.
 */
function isNullableVerdict(value: unknown): value is ReleaseVerdict | null {
    return value === null || isVerdict(value);
}

/**
 * Checks one runtime value against the supported severity enum.
 */
function isSeverity(value: unknown): value is FindingSeverity {
    return (
        typeof value === "string" && severities.has(value as FindingSeverity)
    );
}

/**
 * Checks one runtime value as a finite number.
 */
function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

/**
 * Checks one runtime value as a non-negative integer.
 */
function isNonNegativeInteger(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/**
 * Checks whether one value is the canonical ISO form produced by the app.
 */
function isCanonicalIsoDateTime(value: unknown): value is string {
    if (typeof value !== "string") {
        return false;
    }

    const timestamp = Date.parse(value);

    return (
        Number.isFinite(timestamp) &&
        new Date(timestamp).toISOString() === value
    );
}

/**
 * Checks whether one runtime value is a non-empty string.
 */
function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

/**
 * Checks whether one runtime value is an object-like parsed JSON record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

/**
 * Checks that an imported object contains no unsupported properties.
 */
function hasOnlyKeys(
    value: Record<string, unknown>,
    keys: Set<string>,
): boolean {
    return Object.keys(value).every((key) => keys.has(key));
}

/**
 * Creates one path-specific imported-record validation failure.
 */
function invalidRecord<TValue = never>(
    path: string,
    message: string,
): RuleResult<TValue> {
    return ruleFail(
        "portable-save:invalid-record",
        `${path} ${message}`,
        "error",
    );
}

/**
 * Rounds score values using the scoring engine's persisted precision.
 */
function roundScore(value: number): number {
    return Math.round(value * 10) / 10;
}

/**
 * Clamps one rounded persisted score to its fixed score-area maximum.
 */
function clampScoreToMax(value: number, maxPoints: number): number {
    return Math.min(value, maxPoints);
}

const ticketResultKeys = new Set([
    "schemaVersion",
    "attemptId",
    "shiftId",
    "ticketId",
    "ticketTitle",
    "submittedAt",
    "selectedVerdict",
    "correctVerdict",
    "isVerdictCorrect",
    "totalScore",
    "maxScore",
    "breakdown",
    "matchedFindings",
    "missedFindings",
    "unsupportedFindings",
    "stats",
]);

const breakdownKeys = new Set([
    "verdict",
    "findings",
    "evidenceSupport",
    "severity",
]);

const breakdownLineKeys = new Set([
    "area",
    "label",
    "earnedPoints",
    "maxPoints",
    "description",
]);

const matchedFindingKeys = new Set([
    "expectedFindingId",
    "expectedSummary",
    "expectedCategory",
    "expectedSeverity",
    "requiredEvidence",
    "filedFindingId",
    "findingTypeId",
    "findingTypeLabel",
    "selectedSeverity",
    "supportedEvidence",
    "findingPoints",
    "evidenceSupportPoints",
    "severityPoints",
]);

const missedFindingKeys = new Set([
    "expectedFindingId",
    "expectedSummary",
    "expectedCategory",
    "expectedSeverity",
    "requiredEvidence",
]);

const unsupportedFindingKeys = new Set([
    "filedFindingId",
    "findingTypeId",
    "findingTypeLabel",
    "selectedSeverity",
    "supportedEvidence",
    "reason",
]);

const evidenceReferenceKeys = new Set(["evidenceId", "title"]);

const statsKeys = new Set([
    "inspectedEvidenceCount",
    "pinnedEvidenceCount",
    "filedFindingCount",
    "boardConnectionCount",
]);
