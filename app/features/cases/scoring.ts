import type {
  ExpectedFinding,
  PlayerFinding,
  ReleaseTicketVariant,
  ReleaseVerdict,
} from "./types";

/**
 * Represents one matched expected finding.
 *
 * This stores both sides of the match so the report can explain which player
 * finding matched which authored expected finding.
 */
export interface FindingMatch {
  expectedFinding: ExpectedFinding;
  playerFinding: PlayerFinding;
}

/**
 * Represents the final score report for one ticket attempt.
 *
 * The report is deliberately explicit because the player should understand
 * why they received the result, not only see a number.
 */
export interface TicketScoreReport {
  totalScore: number;
  findingScore: number;
  verdictScore: number;
  cleanSubmissionScore: number;
  maxScore: number;
  selectedVerdict: ReleaseVerdict;
  correctVerdict: ReleaseVerdict;
  matchedFindings: FindingMatch[];
  missedFindings: ExpectedFinding[];
  unsupportedFindings: PlayerFinding[];
  feedback: string[];
}

/**
 * Input required to score one ticket attempt.
 */
export interface ScoreTicketAttemptInput {
  ticket: ReleaseTicketVariant;
  playerFindings: PlayerFinding[];
  selectedVerdict: ReleaseVerdict;
}

/**
 * Checks whether the player linked all evidence required by an expected finding.
 *
 * Evidence matching is strict in Build 001A. This makes the scoring predictable
 * and easy to validate before adding more advanced feedback later.
 */
function hasRequiredEvidence(
  playerFinding: PlayerFinding,
  expectedFinding: ExpectedFinding,
): boolean {
  return expectedFinding.requiredEvidenceIds.every((requiredEvidenceId) =>
    playerFinding.linkedEvidenceIds.includes(requiredEvidenceId),
  );
}

/**
 * Finds the first expected finding that a player finding can match.
 *
 * A match currently requires:
 * 1. same risk category;
 * 2. all required evidence IDs linked;
 * 3. expected finding has not already been matched by another player finding.
 *
 * This avoids double-counting one expected finding multiple times.
 */
function findMatchingExpectedFinding(
  playerFinding: PlayerFinding,
  expectedFindings: ExpectedFinding[],
  alreadyMatchedExpectedIds: Set<string>,
): ExpectedFinding | undefined {
  return expectedFindings.find((expectedFinding) => {
    const isAlreadyMatched = alreadyMatchedExpectedIds.has(expectedFinding.id);
    const categoryMatches = playerFinding.category === expectedFinding.category;
    const evidenceMatches = hasRequiredEvidence(playerFinding, expectedFinding);

    return !isAlreadyMatched && categoryMatches && evidenceMatches;
  });
}

/**
 * Builds simple feedback messages for the ticket report.
 *
 * This keeps the feedback generation separate from the score calculation so
 * the scoring function remains easier to read and modify.
 */
function buildFeedback(report: Omit<TicketScoreReport, "feedback">): string[] {
  const feedback: string[] = [];

  if (report.matchedFindings.length > 0) {
    feedback.push(
      `Matched ${report.matchedFindings.length} expected finding(s).`,
    );
  } else {
    feedback.push("No expected findings were matched.");
  }

  if (report.missedFindings.length > 0) {
    feedback.push(
      `Missed ${report.missedFindings.length} expected finding(s). Review the evidence more carefully.`,
    );
  } else {
    feedback.push("All expected findings were identified.");
  }

  if (report.verdictScore > 0) {
    feedback.push("The selected verdict matched the expected release decision.");
  } else {
    feedback.push(
      `The selected verdict did not match the expected decision. Expected verdict: ${report.correctVerdict}.`,
    );
  }

  if (report.unsupportedFindings.length > 0) {
    feedback.push(
      `${report.unsupportedFindings.length} submitted finding(s) did not match the expected evidence/category pairs.`,
    );
  }

  return feedback;
}

/**
 * Scores one ReleaseGuard ticket attempt.
 *
 * Current scoring model:
 * - 70 points: expected findings matched;
 * - 20 points: correct verdict;
 * - 10 points: clean submission score, reduced by unsupported findings.
 *
 * The scoring is intentionally deterministic for the MVP. It does not use AI,
 * fuzzy text matching, or hidden judgement rules.
 */
export function scoreTicketAttempt({
  ticket,
  playerFindings,
  selectedVerdict,
}: ScoreTicketAttemptInput): TicketScoreReport {
  const matchedFindings: FindingMatch[] = [];
  const unsupportedFindings: PlayerFinding[] = [];
  const matchedExpectedIds = new Set<string>();

  for (const playerFinding of playerFindings) {
    const matchingExpectedFinding = findMatchingExpectedFinding(
      playerFinding,
      ticket.expectedFindings,
      matchedExpectedIds,
    );

    if (matchingExpectedFinding) {
      matchedExpectedIds.add(matchingExpectedFinding.id);
      matchedFindings.push({
        expectedFinding: matchingExpectedFinding,
        playerFinding,
      });
    } else {
      unsupportedFindings.push(playerFinding);
    }
  }

  const missedFindings = ticket.expectedFindings.filter(
    (expectedFinding) => !matchedExpectedIds.has(expectedFinding.id),
  );

  const findingScore =
    ticket.expectedFindings.length === 0
      ? 70
      : Math.round(
          (matchedFindings.length / ticket.expectedFindings.length) * 70,
        );

  const verdictScore = selectedVerdict === ticket.correctVerdict ? 20 : 0;

  const cleanSubmissionScore = Math.max(
    0,
    10 - unsupportedFindings.length * 5,
  );

  const reportWithoutFeedback: Omit<TicketScoreReport, "feedback"> = {
    totalScore: findingScore + verdictScore + cleanSubmissionScore,
    findingScore,
    verdictScore,
    cleanSubmissionScore,
    maxScore: 100,
    selectedVerdict,
    correctVerdict: ticket.correctVerdict,
    matchedFindings,
    missedFindings,
    unsupportedFindings,
  };

  return {
    ...reportWithoutFeedback,
    feedback: buildFeedback(reportWithoutFeedback),
  };
}