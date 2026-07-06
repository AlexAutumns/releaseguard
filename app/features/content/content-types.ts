/**
 * Stable release verdicts that can be selected by the player and scored by the
 * deterministic scoring engine.
 */
export type ReleaseVerdict = "ship" | "watch" | "hold" | "block";

/**
 * Broad risk categories used by evidence cards, expected findings, introduced
 * issues, and future expected confirmations.
 */
export type RiskCategory =
    | "security"
    | "quality"
    | "privacy"
    | "operations"
    | "testing";

/**
 * Supported severity levels for authored expected findings and introduced
 * issues.
 */
export type FindingSeverity = "low" | "medium" | "high" | "critical";

/**
 * Supported evidence content types for authored evidence cards.
 */
export type EvidenceType =
    | "qa-note"
    | "pull-request-comment"
    | "support-ticket"
    | "release-note";

/**
 * Describes whether a playable ticket is mainly risky, safe, or mixed.
 *
 * This helps content selection avoid repetitive gameplay where every ticket has
 * the same obvious verdict.
 */
export type TicketVariantKind =
    | "risk-variant"
    | "safe-control"
    | "mixed-variant";

/**
 * Reference artifact categories used by family baselines.
 *
 * These are authoring references, not playable evidence cards.
 */
export type ReferenceArtifactType =
    | "implementation-reference"
    | "qa-reference"
    | "release-reference"
    | "operations-reference"
    | "privacy-reference";

/**
 * Authoring metadata that helps track whether content is ready for playtesting.
 */
export interface AuthoringMetadata {
    status: "draft" | "reviewed" | "final";
    notes?: string;
}

/**
 * Global metadata for the currently bundled content pack.
 */
export interface ContentPackManifest {
    schemaVersion: 1;
    contentType: "content-pack-manifest";
    contentPackId: string;
    title: string;
    defaultShiftId: string;
    minimumTicketVariants: number;
    minimumShifts: number;
}

/**
 * Dictionary item used for readable risk category descriptions.
 */
export interface RiskCategoryDefinition {
    id: RiskCategory;
    label: string;
    description: string;
}

/**
 * Dictionary item used for readable severity levels and scoring weights.
 */
export interface SeverityLevelDefinition {
    id: FindingSeverity;
    label: string;
    scoreWeight: number;
}

/**
 * Dictionary item used for readable verdict choices.
 */
export interface VerdictDefinition {
    id: ReleaseVerdict;
    label: string;
    description: string;
}

/**
 * Dictionary item used for readable evidence source/type labels.
 */
export interface EvidenceTypeDefinition {
    id: EvidenceType;
    label: string;
}

/**
 * Authored group for related release-ticket variants.
 *
 * Families let future content scale without one huge file. For example, several
 * password reset tickets can share one family while still being separate cases.
 */
export interface TicketFamilyDefinition {
    schemaVersion: 1;
    contentType: "ticket-family";
    id: string;
    title: string;
    description: string;
    tags: string[];
}

/**
 * One authoring reference artifact inside a family baseline.
 *
 * This is not shown as playable evidence by default. It explains what the safe
 * or intended version of a family behaviour should look like.
 */
export interface ReferenceArtifactDefinition {
    id: string;
    type: ReferenceArtifactType;
    title: string;
    body: string;
}

/**
 * Baseline/golden reference for one ticket family.
 *
 * This acts as an authoring safety net. Playable ticket variants can reference
 * this file and list how they deviate from it.
 */
export interface FamilyReferenceDefinition {
    schemaVersion: 1;
    contentType: "family-reference";
    id: string;
    familyId: string;
    title: string;
    purpose: string;
    referenceArtifacts: ReferenceArtifactDefinition[];
}

/**
 * Optional attachment type for evidence cards.
 *
 * Attachments keep technical artifacts, such as code snippets or logs, separate
 * from the evidence summary body. This prevents long code from damaging cabinet
 * layout while still allowing detailed inspection in the evidence modal.
 */
export type EvidenceAttachmentType = "code" | "log" | "note";

/**
 * Optional technical artifact attached to an evidence card.
 */
export interface EvidenceAttachmentDefinition {
    id: string;
    type: EvidenceAttachmentType;
    title: string;
    body: string;
    language?: string;
}

/**
 * One authored evidence item shown during a ticket investigation.
 */
export interface EvidenceCardDefinition {
    id: string;
    type: EvidenceType;
    title: string;
    source: string;
    body: string;
    riskHints: RiskCategory[];
    attachments?: EvidenceAttachmentDefinition[];
}

/**
 * One answer-key finding expected from the player.
 *
 * The scoring engine compares runtime player findings to these definitions.
 */
export interface ExpectedFindingDefinition {
    id: string;
    category: RiskCategory;
    summary: string;
    requiredEvidenceIds: string[];
    severity: FindingSeverity;
}

/**
 * Optional future answer-key item for safe-control tickets.
 *
 * MVP safe-control tickets can stay simple with no expected findings. Later,
 * this can support positive evidence such as "regression testing passed" or
 * "token expiry remains short" without rewriting the content model.
 */
export interface ExpectedConfirmationDefinition {
    id: string;
    category: RiskCategory;
    summary: string;
    requiredEvidenceIds: string[];
}

/**
 * Authoring metadata that explains how a playable ticket variant deviates from
 * its family baseline.
 *
 * This is not the scoring answer key. It exists to make ticket authoring easier
 * to audit and maintain.
 */
export interface IntroducedIssueDefinition {
    id: string;
    referenceArtifactId: string;
    expectedFindingIds: string[];
    category: RiskCategory;
    severity: FindingSeverity;
    summary: string;
}

/**
 * One playable authored release ticket.
 */
export interface ReleaseTicketDefinition {
    schemaVersion: 1;
    contentType: "release-ticket";
    id: string;
    familyId: string;
    baselineReferenceId: string;
    variantKind: TicketVariantKind;
    title: string;
    productArea: string;
    difficulty: 1 | 2 | 3 | 4 | 5;
    briefing: string;
    tags: string[];
    correctVerdict: ReleaseVerdict;
    introducedIssues: IntroducedIssueDefinition[];
    evidenceCards: EvidenceCardDefinition[];
    expectedFindings: ExpectedFindingDefinition[];

    /**
     * Optional for now. This keeps the content model open for future safe-control
     * tickets where the player may need to confirm why a release is safe.
     */
    expectedConfirmations?: ExpectedConfirmationDefinition[];

    authoring: AuthoringMetadata;
}

/**
 * Authored shift definition.
 *
 * Shifts work like small level playlists. They reference tickets by stable ID
 * instead of embedding ticket data directly.
 */
export interface ShiftDefinition {
    schemaVersion: 1;
    contentType: "shift-definition";
    id: string;
    title: string;
    subtitle: string;
    sequence: number;
    difficultyBand: [number, number];
    ticketIds: string[];
    introNarrativeId?: string;
    isUnlockedByDefault: boolean;
}

/**
 * Mood values for simple MVP narrative panels.
 */
export type NarrativeMood =
    | "briefing"
    | "warning"
    | "success"
    | "failure"
    | "neutral";

/**
 * Narrative trigger values. These keep simple cutscene-like content tied to a
 * specific game moment without building a complex cinematic system.
 */
export type NarrativeTrigger =
    | "shift-intro"
    | "ticket-success"
    | "ticket-failure"
    | "tutorial";

/**
 * One panel inside a simple narrative sequence.
 */
export interface NarrativePanelDefinition {
    id: string;
    speaker?: string;
    mood: NarrativeMood;
    title: string;
    body: string;
}

/**
 * Simple panel-based narrative sequence.
 *
 * This supports shift intros and result consequences without building a heavy
 * cutscene engine.
 */
export interface NarrativeSequenceDefinition {
    schemaVersion: 1;
    contentType: "narrative-sequence";
    id: string;
    title: string;
    trigger: NarrativeTrigger;
    panels: NarrativePanelDefinition[];
}

/**
 * Fully indexed content catalog used by repository helpers.
 */
export interface ContentCatalog {
    manifest: ContentPackManifest;
    riskCategories: RiskCategoryDefinition[];
    severityLevels: SeverityLevelDefinition[];
    verdicts: VerdictDefinition[];
    evidenceTypes: EvidenceTypeDefinition[];
    shifts: ShiftDefinition[];
    families: TicketFamilyDefinition[];
    familyReferences: FamilyReferenceDefinition[];
    tickets: ReleaseTicketDefinition[];
    narrativeSequences: NarrativeSequenceDefinition[];
}
