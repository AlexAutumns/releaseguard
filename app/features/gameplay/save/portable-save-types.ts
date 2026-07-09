import type { TicketScoreResult } from "../scoring/scoring-types";
import type { ShiftRun } from "../shift-run/shift-run-types";

/**
 * Current schema version for portable ReleaseGuard save files.
 */
export type PortableSaveSchemaVersion = 1;

/**
 * Stable local identity for one desk-file save history.
 *
 * The save ID is not a user account or authentication identity. It only
 * distinguishes one local save history from another exported/imported history.
 */
export interface LocalSaveIdentity {
    schemaVersion: PortableSaveSchemaVersion;
    saveId: string;
    createdAt: string;
}

/**
 * Portable ReleaseGuard save-file contract.
 *
 * The envelope stores only player progression/report source records and save
 * metadata. Authored tickets, shifts, evidence, and other content definitions
 * remain part of the installed content pack and are never imported from saves.
 */
export interface ReleaseGuardSaveEnvelope {
    schemaVersion: PortableSaveSchemaVersion;
    contentType: "releaseguard-save";
    contentPackId: string;
    saveId: string;
    createdAt: string;
    updatedAt: string;
    exportedAt: string;
    shiftRuns: ShiftRun[];
    ticketResults: TicketScoreResult[];
}

/**
 * Human-readable summary shown before a validated save replaces local progress.
 */
export interface PortableSaveSummary {
    saveId: string;
    createdAt: string;
    updatedAt: string;
    exportedAt: string;
    shiftRunCount: number;
    completedRunCount: number;
    completedShiftCount: number;
    ticketResultCount: number;
    activeShiftTitle: string | null;
}

/**
 * Deeply validated portable save ready for confirmed local replacement.
 *
 * Callers should only pass this branded workflow value into save replacement.
 * Parsing arbitrary JSON and storage mutation remain separate responsibilities.
 */
export interface ValidatedPortableSave {
    envelope: ReleaseGuardSaveEnvelope;
    summary: PortableSaveSummary;
}
