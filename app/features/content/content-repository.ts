import { contentCatalog } from "./content-index";
import type {
    ContentCatalog,
    FamilyReferenceDefinition,
    NarrativeSequenceDefinition,
    ReleaseTicketDefinition,
    ShiftDefinition,
    TicketFamilyDefinition,
} from "./content-types";
import {
    assertValidContentCatalog,
    validateContentCatalog,
} from "./content-validator";

/**
 * Validates bundled content as soon as the repository module is imported.
 *
 * This intentionally fails loudly during development if a ticket references a
 * missing family, missing baseline, missing evidence card, or missing shift
 * ticket.
 */
assertValidContentCatalog(contentCatalog);

/**
 * Returns the full bundled content catalog.
 *
 * Most screens should prefer narrower helper functions, but this is useful for
 * diagnostics and future content overview screens.
 */
export function getContentCatalog(): ContentCatalog {
    return contentCatalog;
}

/**
 * Returns validation details for debug UI or development checks.
 */
export function getContentValidationResult() {
    return validateContentCatalog(contentCatalog);
}

/**
 * Returns all authored shifts in display order.
 */
export function getAllShifts(): ShiftDefinition[] {
    return [...contentCatalog.shifts].sort(
        (left, right) => left.sequence - right.sequence,
    );
}

/**
 * Finds one shift by stable ID.
 */
export function getShiftById(shiftId: string): ShiftDefinition | undefined {
    return contentCatalog.shifts.find((shift) => shift.id === shiftId);
}

/**
 * Returns all authored ticket families sorted by title.
 */
export function getAllFamilies(): TicketFamilyDefinition[] {
    return [...contentCatalog.families].sort((left, right) =>
        left.title.localeCompare(right.title),
    );
}

/**
 * Finds one ticket family by stable ID.
 */
export function getFamilyById(
    familyId: string,
): TicketFamilyDefinition | undefined {
    return contentCatalog.families.find((family) => family.id === familyId);
}

/**
 * Returns all family baseline references sorted by title.
 */
export function getAllFamilyReferences(): FamilyReferenceDefinition[] {
    return [...contentCatalog.familyReferences].sort((left, right) =>
        left.title.localeCompare(right.title),
    );
}

/**
 * Finds one family baseline reference by stable ID.
 */
export function getFamilyReferenceById(
    familyReferenceId: string,
): FamilyReferenceDefinition | undefined {
    return contentCatalog.familyReferences.find(
        (familyReference) => familyReference.id === familyReferenceId,
    );
}

/**
 * Returns all baseline references for a specific ticket family.
 */
export function getReferencesForFamily(
    familyId: string,
): FamilyReferenceDefinition[] {
    return getAllFamilyReferences().filter(
        (familyReference) => familyReference.familyId === familyId,
    );
}

/**
 * Returns all authored release tickets sorted by title.
 */
export function getAllTickets(): ReleaseTicketDefinition[] {
    return [...contentCatalog.tickets].sort((left, right) =>
        left.title.localeCompare(right.title),
    );
}

/**
 * Finds one release ticket by stable ID.
 */
export function getTicketById(
    ticketId: string,
): ReleaseTicketDefinition | undefined {
    return contentCatalog.tickets.find((ticket) => ticket.id === ticketId);
}

/**
 * Returns all tickets that belong to a specific ticket family.
 */
export function getTicketsForFamily(
    familyId: string,
): ReleaseTicketDefinition[] {
    return getAllTickets().filter((ticket) => ticket.familyId === familyId);
}

/**
 * Returns the ticket definitions referenced by one shift.
 *
 * Missing ticket references should already be caught by content validation, but
 * this helper still filters defensively to keep screens from crashing.
 */
export function getTicketsForShift(shiftId: string): ReleaseTicketDefinition[] {
    const shift = getShiftById(shiftId);

    if (!shift) {
        return [];
    }

    return shift.ticketIds
        .map((ticketId) => getTicketById(ticketId))
        .filter((ticket): ticket is ReleaseTicketDefinition => Boolean(ticket));
}

/**
 * Finds one narrative sequence by stable ID.
 */
export function getNarrativeSequenceById(
    narrativeSequenceId: string,
): NarrativeSequenceDefinition | undefined {
    return contentCatalog.narrativeSequences.find(
        (sequence) => sequence.id === narrativeSequenceId,
    );
}
