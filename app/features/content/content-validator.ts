import type {
    ContentCatalog,
    EvidenceCardDefinition,
    EvidenceAttachmentDefinition,
    ExpectedConfirmationDefinition,
    ExpectedFindingDefinition,
    FamilyReferenceDefinition,
    IntroducedIssueDefinition,
    ReleaseTicketDefinition,
    ShiftDefinition,
} from "./content-types";

/**
 * Validation issue produced when authored content has an unsafe reference or
 * structural problem.
 */
export interface ContentValidationIssue {
    severity: "error" | "warning";
    message: string;
    contentId?: string;
}

/**
 * Validation result for the bundled content catalog.
 */
export interface ContentValidationResult {
    isValid: boolean;
    issues: ContentValidationIssue[];
}

/**
 * Adds a validation issue to the active validation issue list.
 */
function addIssue(
    issues: ContentValidationIssue[],
    issue: ContentValidationIssue,
): void {
    issues.push(issue);
}

/**
 * Finds duplicate IDs in a content collection.
 */
function findDuplicateIds<TContent extends { id: string }>(
    items: TContent[],
): string[] {
    const seenIds = new Set<string>();
    const duplicateIds = new Set<string>();

    for (const item of items) {
        if (seenIds.has(item.id)) {
            duplicateIds.add(item.id);
        }

        seenIds.add(item.id);
    }

    return [...duplicateIds].sort();
}

/**
 * Creates a lookup map by stable content ID.
 */
function createIdMap<TContent extends { id: string }>(
    items: TContent[],
): Map<string, TContent> {
    return new Map(items.map((item) => [item.id, item]));
}

/**
 * Creates the normalized scoring signature used to distinguish expected findings.
 *
 * Scoring matches by category and required evidence presence. Evidence order does
 * not affect that rule, so the authored IDs are de-duplicated and sorted before
 * the signature is created.
 */
function createExpectedFindingScoringSignature(
    expectedFinding: ExpectedFindingDefinition,
): string {
    const normalizedRequiredEvidenceIds = [
        ...new Set(expectedFinding.requiredEvidenceIds),
    ].sort();

    return JSON.stringify([
        expectedFinding.category,
        normalizedRequiredEvidenceIds,
    ]);
}

/**
 * Validates the evidence requirements used to score expected findings.
 *
 * Every expected finding must require real, unique evidence from the same
 * ticket. Empty or repeated requirements would create ambiguous answer keys and
 * misleading result-report rows.
 */
function validateExpectedFindingEvidenceRequirements(
    issues: ContentValidationIssue[],
    ticket: ReleaseTicketDefinition,
): void {
    const evidenceIds = new Set(
        ticket.evidenceCards.map(
            (evidenceCard: EvidenceCardDefinition) => evidenceCard.id,
        ),
    );

    for (const expectedFinding of ticket.expectedFindings) {
        if (expectedFinding.requiredEvidenceIds.length === 0) {
            addIssue(issues, {
                severity: "error",
                contentId: ticket.id,
                message: `Expected finding "${expectedFinding.id}" must require at least one evidence card.`,
            });
        }

        const seenRequiredEvidenceIds = new Set<string>();
        const duplicateRequiredEvidenceIds = new Set<string>();

        for (const requiredEvidenceId of expectedFinding.requiredEvidenceIds) {
            if (seenRequiredEvidenceIds.has(requiredEvidenceId)) {
                duplicateRequiredEvidenceIds.add(requiredEvidenceId);
                continue;
            }

            seenRequiredEvidenceIds.add(requiredEvidenceId);

            if (!evidenceIds.has(requiredEvidenceId)) {
                addIssue(issues, {
                    severity: "error",
                    contentId: ticket.id,
                    message: `Expected finding "${expectedFinding.id}" references missing evidence "${requiredEvidenceId}".`,
                });
            }
        }

        for (const duplicateRequiredEvidenceId of [
            ...duplicateRequiredEvidenceIds,
        ].sort()) {
            addIssue(issues, {
                severity: "error",
                contentId: ticket.id,
                message: `Expected finding "${expectedFinding.id}" contains duplicate required evidence "${duplicateRequiredEvidenceId}".`,
            });
        }
    }
}

/**
 * Rejects expected findings that the scoring engine cannot distinguish.
 *
 * Two expected findings with the same category and required evidence set are
 * equivalent to the current deterministic match rule, even when evidence IDs
 * are authored in a different order.
 */
function validateExpectedFindingScoringSignatures(
    issues: ContentValidationIssue[],
    ticket: ReleaseTicketDefinition,
): void {
    const expectedFindingIdBySignature = new Map<string, string>();

    for (const expectedFinding of ticket.expectedFindings) {
        const scoringSignature =
            createExpectedFindingScoringSignature(expectedFinding);
        const existingExpectedFindingId =
            expectedFindingIdBySignature.get(scoringSignature);

        if (existingExpectedFindingId) {
            addIssue(issues, {
                severity: "error",
                contentId: ticket.id,
                message: `Expected finding "${expectedFinding.id}" duplicates the scoring signature of "${existingExpectedFindingId}": category "${expectedFinding.category}" with the same required evidence set.`,
            });
            continue;
        }

        expectedFindingIdBySignature.set(scoringSignature, expectedFinding.id);
    }
}

/**
 * Validates that optional expected confirmations point to evidence cards that
 * exist in the same ticket.
 *
 * Expected confirmations are not required for MVP safe-control tickets, but
 * this keeps the future extension safe once the field is used.
 */
function validateExpectedConfirmationEvidenceReferences(
    issues: ContentValidationIssue[],
    ticket: ReleaseTicketDefinition,
): void {
    const expectedConfirmations = ticket.expectedConfirmations ?? [];
    const evidenceIds = new Set(
        ticket.evidenceCards.map(
            (evidenceCard: EvidenceCardDefinition) => evidenceCard.id,
        ),
    );

    for (const expectedConfirmation of expectedConfirmations) {
        for (const requiredEvidenceId of expectedConfirmation.requiredEvidenceIds) {
            if (!evidenceIds.has(requiredEvidenceId)) {
                addIssue(issues, {
                    severity: "error",
                    contentId: ticket.id,
                    message: `Expected confirmation "${expectedConfirmation.id}" references missing evidence "${requiredEvidenceId}".`,
                });
            }
        }
    }
}

/**
 * Validates duplicate evidence IDs, expected finding IDs, expected confirmation
 * IDs, and introduced issue IDs within one ticket.
 */
function validateTicketInternalIds(
    issues: ContentValidationIssue[],
    ticket: ReleaseTicketDefinition,
): void {
    for (const duplicateEvidenceId of findDuplicateIds(ticket.evidenceCards)) {
        addIssue(issues, {
            severity: "error",
            contentId: ticket.id,
            message: `Duplicate evidence card ID "${duplicateEvidenceId}" found in ticket.`,
        });
    }

    for (const evidenceCard of ticket.evidenceCards) {
        for (const duplicateAttachmentId of findDuplicateIds(
            (evidenceCard.attachments ?? []) as EvidenceAttachmentDefinition[],
        )) {
            addIssue(issues, {
                severity: "error",
                contentId: ticket.id,
                message: `Duplicate attachment ID "${duplicateAttachmentId}" found in evidence card "${evidenceCard.id}".`,
            });
        }
    }

    for (const duplicateFindingId of findDuplicateIds(
        ticket.expectedFindings as ExpectedFindingDefinition[],
    )) {
        addIssue(issues, {
            severity: "error",
            contentId: ticket.id,
            message: `Duplicate expected finding ID "${duplicateFindingId}" found in ticket.`,
        });
    }

    for (const duplicateConfirmationId of findDuplicateIds(
        (ticket.expectedConfirmations ??
            []) as ExpectedConfirmationDefinition[],
    )) {
        addIssue(issues, {
            severity: "error",
            contentId: ticket.id,
            message: `Duplicate expected confirmation ID "${duplicateConfirmationId}" found in ticket.`,
        });
    }

    for (const duplicateIssueId of findDuplicateIds(
        ticket.introducedIssues as IntroducedIssueDefinition[],
    )) {
        addIssue(issues, {
            severity: "error",
            contentId: ticket.id,
            message: `Duplicate introduced issue ID "${duplicateIssueId}" found in ticket.`,
        });
    }
}

/**
 * Validates that a family reference belongs to an existing family and does not
 * contain duplicate reference artifact IDs.
 */
function validateFamilyReference(
    issues: ContentValidationIssue[],
    familyReference: FamilyReferenceDefinition,
    familyIds: Set<string>,
): void {
    if (!familyIds.has(familyReference.familyId)) {
        addIssue(issues, {
            severity: "error",
            contentId: familyReference.id,
            message: `Family reference points to missing family "${familyReference.familyId}".`,
        });
    }

    for (const duplicateArtifactId of findDuplicateIds(
        familyReference.referenceArtifacts,
    )) {
        addIssue(issues, {
            severity: "error",
            contentId: familyReference.id,
            message: `Duplicate reference artifact ID "${duplicateArtifactId}" found in family reference.`,
        });
    }
}

/**
 * Validates introduced issues against the ticket baseline and answer key.
 *
 * Introduced issues remain authoring metadata rather than scoring rules. The
 * validator keeps that metadata aligned with every linked expected finding and
 * ensures risk-bearing ticket variants do not contain orphan answer-key items.
 */
function validateIntroducedIssues(
    issues: ContentValidationIssue[],
    ticket: ReleaseTicketDefinition,
    familyReference: FamilyReferenceDefinition | undefined,
): void {
    if (
        ticket.variantKind === "risk-variant" &&
        ticket.introducedIssues.length === 0
    ) {
        addIssue(issues, {
            severity: "error",
            contentId: ticket.id,
            message:
                "Risk variant tickets must define at least one introduced issue.",
        });
    }

    if (
        ticket.variantKind === "safe-control" &&
        ticket.introducedIssues.length > 0
    ) {
        addIssue(issues, {
            severity: "error",
            contentId: ticket.id,
            message:
                "Safe-control tickets should not define introduced issues.",
        });
    }

    const expectedFindingById = createIdMap(ticket.expectedFindings);
    const linkedExpectedFindingIds = new Set<string>();
    const referenceArtifactIds = new Set(
        familyReference?.referenceArtifacts.map((artifact) => artifact.id) ??
            [],
    );

    for (const introducedIssue of ticket.introducedIssues) {
        if (
            familyReference &&
            !referenceArtifactIds.has(introducedIssue.referenceArtifactId)
        ) {
            addIssue(issues, {
                severity: "error",
                contentId: ticket.id,
                message: `Introduced issue "${introducedIssue.id}" references missing baseline artifact "${introducedIssue.referenceArtifactId}".`,
            });
        }

        for (const expectedFindingId of introducedIssue.expectedFindingIds) {
            const expectedFinding = expectedFindingById.get(expectedFindingId);

            if (!expectedFinding) {
                addIssue(issues, {
                    severity: "error",
                    contentId: ticket.id,
                    message: `Introduced issue "${introducedIssue.id}" references missing expected finding "${expectedFindingId}".`,
                });
                continue;
            }

            linkedExpectedFindingIds.add(expectedFindingId);

            if (introducedIssue.category !== expectedFinding.category) {
                addIssue(issues, {
                    severity: "error",
                    contentId: ticket.id,
                    message: `Introduced issue "${introducedIssue.id}" category "${introducedIssue.category}" does not match linked expected finding "${expectedFinding.id}" category "${expectedFinding.category}".`,
                });
            }

            if (introducedIssue.severity !== expectedFinding.severity) {
                addIssue(issues, {
                    severity: "error",
                    contentId: ticket.id,
                    message: `Introduced issue "${introducedIssue.id}" severity "${introducedIssue.severity}" does not match linked expected finding "${expectedFinding.id}" severity "${expectedFinding.severity}".`,
                });
            }
        }
    }

    if (
        ticket.variantKind === "risk-variant" ||
        ticket.variantKind === "mixed-variant"
    ) {
        for (const expectedFinding of ticket.expectedFindings) {
            if (!linkedExpectedFindingIds.has(expectedFinding.id)) {
                addIssue(issues, {
                    severity: "error",
                    contentId: ticket.id,
                    message: `Expected finding "${expectedFinding.id}" is not linked from any introduced issue.`,
                });
            }
        }
    }
}

/**
 * Validates authored ticket assignments inside one shift.
 *
 * Shifts must contain a non-empty, duplicate-free ticket sequence, and every
 * real assigned ticket must stay inside the shift's declared difficulty band.
 */
function validateShiftTicketAssignments(
    issues: ContentValidationIssue[],
    shift: ShiftDefinition,
    ticketById: Map<string, ReleaseTicketDefinition>,
): void {
    if (shift.ticketIds.length === 0) {
        addIssue(issues, {
            severity: "error",
            contentId: shift.id,
            message: "Shift must contain at least one ticket.",
        });
    }

    const seenTicketIds = new Set<string>();
    const duplicateTicketIds = new Set<string>();
    const [minimumDifficulty, maximumDifficulty] = shift.difficultyBand;

    for (const ticketId of shift.ticketIds) {
        if (seenTicketIds.has(ticketId)) {
            duplicateTicketIds.add(ticketId);
            continue;
        }

        seenTicketIds.add(ticketId);

        const ticket = ticketById.get(ticketId);

        if (!ticket) {
            addIssue(issues, {
                severity: "error",
                contentId: shift.id,
                message: `Shift references missing ticket "${ticketId}".`,
            });
            continue;
        }

        if (
            ticket.difficulty < minimumDifficulty ||
            ticket.difficulty > maximumDifficulty
        ) {
            addIssue(issues, {
                severity: "error",
                contentId: shift.id,
                message: `Ticket "${ticket.id}" difficulty ${ticket.difficulty} falls outside shift difficulty band ${minimumDifficulty}-${maximumDifficulty}.`,
            });
        }
    }

    for (const duplicateTicketId of [...duplicateTicketIds].sort()) {
        addIssue(issues, {
            severity: "error",
            contentId: shift.id,
            message: `Duplicate ticket ID "${duplicateTicketId}" found in shift.`,
        });
    }
}

/**
 * Warns when the bundled content pack has not yet reached its authored minimums.
 *
 * Manifest minimums describe roadmap/content targets rather than structural
 * validity, so falling below them must remain non-blocking during development.
 */
function validateManifestMinimumContentCounts(
    issues: ContentValidationIssue[],
    catalog: ContentCatalog,
): void {
    if (catalog.tickets.length < catalog.manifest.minimumTicketVariants) {
        addIssue(issues, {
            severity: "warning",
            contentId: catalog.manifest.contentPackId,
            message: `Content pack contains ${catalog.tickets.length} ticket variant(s), below manifest minimum ${catalog.manifest.minimumTicketVariants}.`,
        });
    }

    if (catalog.shifts.length < catalog.manifest.minimumShifts) {
        addIssue(issues, {
            severity: "warning",
            contentId: catalog.manifest.contentPackId,
            message: `Content pack contains ${catalog.shifts.length} shift(s), below manifest minimum ${catalog.manifest.minimumShifts}.`,
        });
    }
}

/**
 * Validates the bundled authored content catalog.
 *
 * This validator intentionally checks only high-value MVP risks. It is not a
 * full schema engine, because the project deadline does not justify that yet.
 */
export function validateContentCatalog(
    catalog: ContentCatalog,
): ContentValidationResult {
    const issues: ContentValidationIssue[] = [];

    const familyIds = new Set(catalog.families.map((family) => family.id));
    const ticketById = createIdMap(catalog.tickets);
    const shiftIds = new Set(catalog.shifts.map((shift) => shift.id));
    const narrativeIds = new Set(
        catalog.narrativeSequences.map((sequence) => sequence.id),
    );

    const familyReferenceById = createIdMap(catalog.familyReferences);

    validateManifestMinimumContentCounts(issues, catalog);

    for (const duplicateFamilyId of findDuplicateIds(catalog.families)) {
        addIssue(issues, {
            severity: "error",
            contentId: duplicateFamilyId,
            message: `Duplicate ticket family ID "${duplicateFamilyId}" found.`,
        });
    }

    for (const duplicateReferenceId of findDuplicateIds(
        catalog.familyReferences,
    )) {
        addIssue(issues, {
            severity: "error",
            contentId: duplicateReferenceId,
            message: `Duplicate family reference ID "${duplicateReferenceId}" found.`,
        });
    }

    for (const duplicateTicketId of findDuplicateIds(catalog.tickets)) {
        addIssue(issues, {
            severity: "error",
            contentId: duplicateTicketId,
            message: `Duplicate release ticket ID "${duplicateTicketId}" found.`,
        });
    }

    for (const duplicateShiftId of findDuplicateIds(catalog.shifts)) {
        addIssue(issues, {
            severity: "error",
            contentId: duplicateShiftId,
            message: `Duplicate shift ID "${duplicateShiftId}" found.`,
        });
    }

    if (!shiftIds.has(catalog.manifest.defaultShiftId)) {
        addIssue(issues, {
            severity: "error",
            contentId: catalog.manifest.contentPackId,
            message: `Manifest defaultShiftId "${catalog.manifest.defaultShiftId}" does not match any shift.`,
        });
    }

    for (const familyReference of catalog.familyReferences) {
        validateFamilyReference(issues, familyReference, familyIds);
    }

    for (const ticket of catalog.tickets) {
        const familyReference = familyReferenceById.get(
            ticket.baselineReferenceId,
        );

        if (!familyIds.has(ticket.familyId)) {
            addIssue(issues, {
                severity: "error",
                contentId: ticket.id,
                message: `Ticket references missing family "${ticket.familyId}".`,
            });
        }

        if (!familyReference) {
            addIssue(issues, {
                severity: "error",
                contentId: ticket.id,
                message: `Ticket references missing baseline reference "${ticket.baselineReferenceId}".`,
            });
        }

        if (familyReference && familyReference.familyId !== ticket.familyId) {
            addIssue(issues, {
                severity: "error",
                contentId: ticket.id,
                message: `Ticket baseline reference "${familyReference.id}" belongs to "${familyReference.familyId}", not ticket family "${ticket.familyId}".`,
            });
        }

        validateTicketInternalIds(issues, ticket);
        validateExpectedFindingEvidenceRequirements(issues, ticket);
        validateExpectedFindingScoringSignatures(issues, ticket);
        validateExpectedConfirmationEvidenceReferences(issues, ticket);
        validateIntroducedIssues(issues, ticket, familyReference);
    }

    for (const shift of catalog.shifts) {
        validateShiftTicketAssignments(issues, shift, ticketById);

        if (
            shift.introNarrativeId &&
            !narrativeIds.has(shift.introNarrativeId)
        ) {
            addIssue(issues, {
                severity: "error",
                contentId: shift.id,
                message: `Shift references missing intro narrative "${shift.introNarrativeId}".`,
            });
        }
    }

    return {
        isValid: issues.every((issue) => issue.severity !== "error"),
        issues,
    };
}

/**
 * Throws if the bundled content catalog has blocking validation errors.
 *
 * This is useful during development because broken authored content should fail
 * loudly instead of silently creating impossible gameplay states.
 */
export function assertValidContentCatalog(catalog: ContentCatalog): void {
    const result = validateContentCatalog(catalog);

    if (!result.isValid) {
        const messages = result.issues
            .filter((issue) => issue.severity === "error")
            .map(
                (issue) =>
                    `- ${issue.contentId ?? "unknown"}: ${issue.message}`,
            )
            .join("\n");

        throw new Error(`ReleaseGuard content validation failed:\n${messages}`);
    }
}
