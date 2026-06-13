import type { ReleaseTicketVariant } from "./types";

/**
 * First authored ticket used for the initial playable vertical slice.
 *
 * This case is intentionally small. Its job is to prove the core investigation
 * loop before the project expands into five shifts and at least eight ticket
 * variants.
 */
export const sampleTicket: ReleaseTicketVariant = {
  id: "ticket-auth-reset-001",
  title: "Password Reset Flow Update",
  productArea: "Account Security",
  difficulty: 2,
  briefing:
    "The account team wants to release an updated password reset flow. QA says the happy path works, but the release manager wants one last risk review before deployment.",
  correctVerdict: "hold",
  evidenceCards: [
    {
      id: "ev-qa-note",
      title: "QA Smoke Test Note",
      source: "QA Tester",
      body:
        "The reset link works when requested by the account owner. Login succeeds after changing the password. No full regression test was completed because the change was considered small.",
      riskHints: ["testing", "quality"],
    },
    {
      id: "ev-dev-comment",
      title: "Developer Comment",
      source: "Pull Request Discussion",
      body:
        "The token expiry value was temporarily increased to 24 hours to reduce support complaints. We can reduce it later if needed.",
      riskHints: ["security"],
    },
    {
      id: "ev-support-ticket",
      title: "Support Ticket Summary",
      source: "Support Desk",
      body:
        "Several users previously reported receiving password reset emails they did not request. Support marked the issue as low priority because no confirmed account takeover was reported.",
      riskHints: ["security", "privacy"],
    },
    {
      id: "ev-release-note",
      title: "Release Note Draft",
      source: "Release Manager",
      body:
        "Improves password reset reliability and user experience. No user-facing security changes are mentioned in the draft release note.",
      riskHints: ["quality"],
    },
  ],
  expectedFindings: [
    {
      id: "finding-token-expiry",
      category: "security",
      summary:
        "The password reset token expiry was increased to 24 hours, which may increase account takeover risk if reset emails are accessed by someone else.",
      requiredEvidenceIds: ["ev-dev-comment"],
      severity: "high",
    },
    {
      id: "finding-incomplete-testing",
      category: "testing",
      summary:
        "The change only received smoke testing even though it affects an account security flow.",
      requiredEvidenceIds: ["ev-qa-note"],
      severity: "medium",
    },
    {
      id: "finding-prior-reset-issues",
      category: "privacy",
      summary:
        "Previous unsolicited password reset emails suggest the release should be reviewed carefully before shipping.",
      requiredEvidenceIds: ["ev-support-ticket"],
      severity: "medium",
    },
  ],
};

/**
 * Temporary ticket pool for early development.
 *
 * Later builds will replace this with a larger authored content pool containing
 * at least eight release ticket variants.
 */
export const sampleTickets = [sampleTicket] satisfies ReleaseTicketVariant[];