import type { ContentCatalog } from "../../content/content-types";
import type { TicketScoreResult } from "../scoring/scoring-types";
import type { ShiftRun } from "../shift-run/shift-run-types";
import type {
    LocalSaveIdentity,
    PortableSaveSummary,
    ReleaseGuardSaveEnvelope,
} from "./portable-save-types";

/**
 * Builds one deterministic portable save snapshot from persisted source records.
 */
export function buildPortableSaveEnvelope({
    catalog,
    identity,
    shiftRuns,
    ticketResults,
    exportedAt,
}: {
    catalog: ContentCatalog;
    identity: LocalSaveIdentity;
    shiftRuns: ShiftRun[];
    ticketResults: TicketScoreResult[];
    exportedAt: string;
}): ReleaseGuardSaveEnvelope {
    const orderedShiftRuns = [...shiftRuns].sort(compareShiftRunsOldestFirst);
    const orderedTicketResults = [...ticketResults].sort(
        compareTicketResultsOldestFirst,
    );

    return {
        schemaVersion: 1,
        contentType: "releaseguard-save",
        contentPackId: catalog.manifest.contentPackId,
        saveId: identity.saveId,
        createdAt: identity.createdAt,
        updatedAt: getLatestActivityTimestamp({
            fallbackTimestamp: identity.createdAt,
            shiftRuns: orderedShiftRuns,
            ticketResults: orderedTicketResults,
        }),
        exportedAt,
        shiftRuns: orderedShiftRuns,
        ticketResults: orderedTicketResults,
    };
}

/**
 * Creates the human-readable confirmation summary for one validated save.
 */
export function createPortableSaveSummary(
    envelope: ReleaseGuardSaveEnvelope,
    catalog: ContentCatalog,
): PortableSaveSummary {
    const completedShiftIds = new Set(
        envelope.shiftRuns
            .filter((shiftRun) => shiftRun.completedAt !== null)
            .map((shiftRun) => shiftRun.shiftId),
    );
    const activeShiftRun = envelope.shiftRuns.find(
        (shiftRun) => shiftRun.completedAt === null,
    );

    return {
        saveId: envelope.saveId,
        createdAt: envelope.createdAt,
        updatedAt: envelope.updatedAt,
        exportedAt: envelope.exportedAt,
        shiftRunCount: envelope.shiftRuns.length,
        completedRunCount: envelope.shiftRuns.filter(
            (shiftRun) => shiftRun.completedAt !== null,
        ).length,
        completedShiftCount: completedShiftIds.size,
        ticketResultCount: envelope.ticketResults.length,
        activeShiftTitle: activeShiftRun
            ? (catalog.shifts.find(
                  (shift) => shift.id === activeShiftRun.shiftId,
              )?.title ?? activeShiftRun.shiftId)
            : null,
    };
}

/**
 * Returns the earliest persisted gameplay timestamp for new save identity data.
 */
export function getEarliestActivityTimestamp({
    fallbackTimestamp,
    shiftRuns,
    ticketResults,
}: {
    fallbackTimestamp: string;
    shiftRuns: ShiftRun[];
    ticketResults: TicketScoreResult[];
}): string {
    const timestamps = [
        fallbackTimestamp,
        ...shiftRuns.map((shiftRun) => shiftRun.startedAt),
        ...ticketResults.map((result) => result.submittedAt),
    ].filter(isCanonicalIsoDateTime);

    return (
        timestamps.sort((left, right) => left.localeCompare(right))[0] ??
        fallbackTimestamp
    );
}

/**
 * Returns the newest persisted gameplay activity timestamp.
 */
function getLatestActivityTimestamp({
    fallbackTimestamp,
    shiftRuns,
    ticketResults,
}: {
    fallbackTimestamp: string;
    shiftRuns: ShiftRun[];
    ticketResults: TicketScoreResult[];
}): string {
    const timestamps = [
        fallbackTimestamp,
        ...shiftRuns.flatMap((shiftRun) =>
            shiftRun.completedAt
                ? [shiftRun.startedAt, shiftRun.completedAt]
                : [shiftRun.startedAt],
        ),
        ...ticketResults.map((result) => result.submittedAt),
    ].filter(isCanonicalIsoDateTime);

    return (
        timestamps.sort((left, right) => right.localeCompare(left))[0] ??
        fallbackTimestamp
    );
}

/**
 * Orders Shift Runs deterministically for export.
 */
function compareShiftRunsOldestFirst(left: ShiftRun, right: ShiftRun): number {
    return (
        left.startedAt.localeCompare(right.startedAt) ||
        left.shiftRunId.localeCompare(right.shiftRunId)
    );
}

/**
 * Orders Ticket Results deterministically for export.
 */
function compareTicketResultsOldestFirst(
    left: TicketScoreResult,
    right: TicketScoreResult,
): number {
    return (
        left.submittedAt.localeCompare(right.submittedAt) ||
        left.attemptId.localeCompare(right.attemptId)
    );
}

/**
 * Checks whether one timestamp is the canonical ISO form produced by the app.
 */
function isCanonicalIsoDateTime(value: string): boolean {
    const timestamp = Date.parse(value);

    return (
        Number.isFinite(timestamp) &&
        new Date(timestamp).toISOString() === value
    );
}
