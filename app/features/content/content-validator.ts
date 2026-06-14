import type {
    ContentCatalog,
    EvidenceCardDefinition,
    ExpectedConfirmationDefinition,
    ExpectedFindingDefinition,
    FamilyReferenceDefinition,
    IntroducedIssueDefinition,
    ReleaseTicketDefinition,
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
 * Validates that every expected finding points to evidence cards that exist in
 * the same ticket.
 */
function validateExpectedFindingEvidenceReferences(
    issues: ContentValidationIssue[],
    ticket: ReleaseTicketDefinition,
): void {
    const evidenceIds = new Set(
        ticket.evidenceCards.map(
            (evidenceCard: EvidenceCardDefinition) => evidenceCard.id,
        ),
    );

    for (const expectedFinding of ticket.expectedFindings) {
        for (const requiredEvidenceId of expectedFinding.requiredEvidenceIds) {
            if (!evidenceIds.has(requiredEvidenceId)) {
                addIssue(issues, {
                    severity: "error",
                    contentId: ticket.id,
                    message: `Expected finding "${expectedFinding.id}" references missing evidence "${requiredEvidenceId}".`,
                });
            }
        }
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
 * Validates introduced issues against the ticket's baseline reference and
 * expected findings.
 *
 * Introduced issues are authoring metadata, not scoring rules. These checks make
 * sure that metadata stays connected to the real answer key.
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

    const expectedFindingIds = new Set(
        ticket.expectedFindings.map((expectedFinding) => expectedFinding.id),
    );

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
            if (!expectedFindingIds.has(expectedFindingId)) {
                addIssue(issues, {
                    severity: "error",
                    contentId: ticket.id,
                    message: `Introduced issue "${introducedIssue.id}" references missing expected finding "${expectedFindingId}".`,
                });
            }
        }
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
    const ticketIds = new Set(catalog.tickets.map((ticket) => ticket.id));
    const shiftIds = new Set(catalog.shifts.map((shift) => shift.id));
    const narrativeIds = new Set(
        catalog.narrativeSequences.map((sequence) => sequence.id),
    );
    const familyReferenceById = createIdMap(catalog.familyReferences);

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
        validateExpectedFindingEvidenceReferences(issues, ticket);
        validateExpectedConfirmationEvidenceReferences(issues, ticket);
        validateIntroducedIssues(issues, ticket, familyReference);
    }

    for (const shift of catalog.shifts) {
        for (const ticketId of shift.ticketIds) {
            if (!ticketIds.has(ticketId)) {
                addIssue(issues, {
                    severity: "error",
                    contentId: shift.id,
                    message: `Shift references missing ticket "${ticketId}".`,
                });
            }
        }

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
