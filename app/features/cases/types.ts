/**
 * Represents the final release decision that the player can make.
 *
 * The values are intentionally limited because ReleaseGuard needs verdicts
 * that are clear, scoreable, and easy to explain in the ticket report.
 */
export type ReleaseVerdict = "ship" | "watch" | "hold" | "block";

/**
 * Represents the broad risk area connected to an evidence item or finding.
 *
 * These categories are intentionally broad for the MVP. They are specific
 * enough for scoring and feedback, but not so narrow that authored ticket
 * writing becomes slow or fragile.
 */
export type RiskCategory =
  | "security"
  | "quality"
  | "privacy"
  | "operations"
  | "testing";

/**
 * Represents how serious an expected finding is.
 *
 * Severity is separate from category because the same category can contain
 * both small and serious problems depending on the release context.
 */
export type FindingSeverity = "low" | "medium" | "high" | "critical";

/**
 * Represents one evidence item shown to the player.
 *
 * Evidence cards are the main investigation objects in ReleaseGuard.
 * A card can represent QA notes, release notes, logs, pull request comments,
 * support tickets, configuration notes, or other fictional review material.
 */
export interface EvidenceCard {
  id: string;
  title: string;
  source: string;
  body: string;
  riskHints: RiskCategory[];
}

/**
 * Represents one expected finding in the authored answer key.
 *
 * The scoring engine compares player findings against these expected findings.
 * For Build 001A, matching is intentionally deterministic: category plus
 * required evidence links are used instead of fuzzy text matching.
 */
export interface ExpectedFinding {
  id: string;
  category: RiskCategory;
  summary: string;
  requiredEvidenceIds: string[];
  severity: FindingSeverity;
}

/**
 * Represents one authored release ticket variant.
 *
 * A ticket variant is one playable case. Later builds can place multiple
 * variants into shifts, difficulty bands, and ticket families.
 */
export interface ReleaseTicketVariant {
  id: string;
  title: string;
  productArea: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  briefing: string;
  evidenceCards: EvidenceCard[];
  expectedFindings: ExpectedFinding[];
  correctVerdict: ReleaseVerdict;
}

/**
 * Represents a finding written by the player during gameplay.
 *
 * For the MVP, a finding contains a risk category, a short written summary,
 * and the evidence cards the player believes support the finding.
 */
export interface PlayerFinding {
  id: string;
  category: RiskCategory;
  summary: string;
  linkedEvidenceIds: string[];
}