import type { RiskCategory } from "../../content/content-types";

/**
 * Stable ID for a generic player-facing finding stamp.
 *
 * These are not ticket-specific answers. They are reusable risk classifications
 * that the player applies to evidence they inspected, pinned, or later connected.
 */
export type FindingTypeId =
    | "security-control-risk"
    | "testing-coverage-concern"
    | "release-communication-gap"
    | "privacy-user-impact"
    | "operational-readiness-concern"
    | "quality-regression-risk"
    | "unsupported-weak-claim";

/**
 * Generic player-facing finding stamp/type.
 *
 * The hidden ticket answer key stays in expectedFindings. This catalog is shown
 * to the player so they can classify evidence without receiving ticket-specific
 * answer text.
 */
export interface FindingTypeDefinition {
    id: FindingTypeId;
    label: string;
    shortLabel: string;
    description: string;
    category: RiskCategory;
}

/**
 * Broad reusable finding stamps.
 *
 * Keep these generic. If these become ticket-specific, the notebook turns into
 * an answer bank and weakens the investigation gameplay.
 */
export const findingTypeCatalog: FindingTypeDefinition[] = [
    {
        id: "security-control-risk",
        label: "Security Control Risk",
        shortLabel: "Security",
        description:
            "A safeguard, control, or abuse-prevention behavior may be weakened.",
        category: "security",
    },
    {
        id: "testing-coverage-concern",
        label: "Testing Coverage Concern",
        shortLabel: "Testing",
        description:
            "The release may not have enough test coverage for its risk or scope.",
        category: "testing",
    },
    {
        id: "release-communication-gap",
        label: "Release Communication Gap",
        shortLabel: "Comms",
        description:
            "Release notes, review context, or stakeholder communication may omit important risk details.",
        category: "quality",
    },
    {
        id: "privacy-user-impact",
        label: "Privacy / User Impact Concern",
        shortLabel: "User Impact",
        description:
            "The change may affect user privacy, account safety, or user trust.",
        category: "privacy",
    },
    {
        id: "operational-readiness-concern",
        label: "Operational Readiness Concern",
        shortLabel: "Ops",
        description:
            "Monitoring, rollback, support handling, or deployment readiness may be insufficient.",
        category: "operations",
    },
    {
        id: "quality-regression-risk",
        label: "Quality Regression Risk",
        shortLabel: "Quality",
        description:
            "The change may break expected behavior or reduce reliability.",
        category: "quality",
    },
    {
        id: "unsupported-weak-claim",
        label: "Unsupported / Weak Claim",
        shortLabel: "Weak Claim",
        description:
            "The concern may be possible, but the current evidence does not strongly support filing it.",
        category: "quality",
    },
];

/**
 * Looks up one generic finding stamp by ID.
 */
export function getFindingTypeById(
    findingTypeId: FindingTypeId,
): FindingTypeDefinition | undefined {
    return findingTypeCatalog.find(
        (findingType) => findingType.id === findingTypeId,
    );
}
