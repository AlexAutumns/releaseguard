import type { ContentCatalog } from "../../content/content-types";
import type { TicketScoreResult } from "../scoring/scoring-types";
import type { ShiftRun } from "../shift-run/shift-run-types";
import {
    loadTicketScoreResults,
    replaceTicketScoreResults,
} from "../results/ticket-result-storage";
import {
    loadShiftRuns,
    replaceShiftRuns,
} from "../shift-run/shift-run-storage";
import {
    buildPortableSaveEnvelope,
    getEarliestActivityTimestamp,
} from "./portable-save-builder";
import type {
    LocalSaveIdentity,
    ValidatedPortableSave,
} from "./portable-save-types";
import { parseAndValidatePortableSave } from "./portable-save-validator";

/**
 * Browser storage key for stable local desk-file identity metadata.
 */
const localSaveIdentityStorageKey = "releaseguard:save-identity";

/**
 * Explicit result for portable-save snapshot and replacement operations.
 */
export type PortableSaveStorageResult<TValue> =
    | {
          ok: true;
          value: TValue;
      }
    | {
          ok: false;
          message: string;
      };

/**
 * Builds and revalidates one portable snapshot of current local progression.
 *
 * Export reads only persisted Shift Runs and immutable Ticket Results. The
 * resulting envelope is passed through the same deep validator used for imports
 * so ReleaseGuard does not knowingly export a save it would reject on re-import.
 */
export function createValidatedPortableSaveSnapshot(
    catalog: ContentCatalog,
    exportedAt: string = new Date().toISOString(),
): PortableSaveStorageResult<ValidatedPortableSave> {
    const shiftRunsResult = loadShiftRuns();

    if (!shiftRunsResult.ok) {
        return {
            ok: false,
            message: shiftRunsResult.message,
        };
    }

    const ticketResultsResult = loadTicketScoreResults();

    if (!ticketResultsResult.ok) {
        return {
            ok: false,
            message: ticketResultsResult.message,
        };
    }

    const identityResult = resolveLocalSaveIdentity({
        shiftRuns: shiftRunsResult.value,
        ticketResults: ticketResultsResult.value,
        fallbackTimestamp: exportedAt,
    });

    if (!identityResult.ok) {
        return identityResult;
    }

    const envelope = buildPortableSaveEnvelope({
        catalog,
        identity: identityResult.value.identity,
        shiftRuns: shiftRunsResult.value,
        ticketResults: ticketResultsResult.value,
        exportedAt,
    });

    const validationResult = parseAndValidatePortableSave(
        JSON.stringify(envelope),
        catalog,
    );

    if (!validationResult.ok) {
        return {
            ok: false,
            message: `Current local progress cannot be exported safely. ${validationResult.issue.message}`,
        };
    }

    if (identityResult.value.needsWrite) {
        const identityWriteResult = writeLocalSaveIdentity(
            identityResult.value.identity,
        );

        if (!identityWriteResult.ok) {
            return identityWriteResult;
        }
    }

    return {
        ok: true,
        value: validationResult.value,
    };
}

/**
 * Replaces local progression with one already validated portable save.
 *
 * Browser localStorage has no transaction spanning the Shift Run collection,
 * per-attempt Ticket Result keys, and save identity key. The replacement writes
 * Ticket Results first, then Shift Runs, then save identity. If a later step
 * fails, previously loaded source records are restored on a best-effort basis.
 */
export function replaceLocalProgressWithPortableSave(
    validatedSave: ValidatedPortableSave,
): PortableSaveStorageResult<ValidatedPortableSave> {
    const previousShiftRunsResult = loadShiftRuns();

    if (!previousShiftRunsResult.ok) {
        return {
            ok: false,
            message: previousShiftRunsResult.message,
        };
    }

    const previousTicketResultsResult = loadTicketScoreResults();

    if (!previousTicketResultsResult.ok) {
        return {
            ok: false,
            message: previousTicketResultsResult.message,
        };
    }

    const previousIdentityResult = readLocalSaveIdentity();

    if (!previousIdentityResult.ok) {
        return previousIdentityResult;
    }

    const ticketResultWrite = replaceTicketScoreResults(
        validatedSave.envelope.ticketResults,
    );

    if (!ticketResultWrite.ok) {
        return {
            ok: false,
            message: ticketResultWrite.message,
        };
    }

    const shiftRunWrite = replaceShiftRuns(validatedSave.envelope.shiftRuns);

    if (!shiftRunWrite.ok) {
        const rollbackSucceeded = restoreProgressSnapshot({
            shiftRuns: previousShiftRunsResult.value,
            ticketResults: previousTicketResultsResult.value,
            identity: previousIdentityResult.value,
        });

        return {
            ok: false,
            message: rollbackSucceeded
                ? `${shiftRunWrite.message} Previous local progress was restored.`
                : `${shiftRunWrite.message} Previous local progress could not be fully restored.`,
        };
    }

    const identityWrite = writeLocalSaveIdentity({
        schemaVersion: 1,
        saveId: validatedSave.envelope.saveId,
        createdAt: validatedSave.envelope.createdAt,
    });

    if (!identityWrite.ok) {
        const rollbackSucceeded = restoreProgressSnapshot({
            shiftRuns: previousShiftRunsResult.value,
            ticketResults: previousTicketResultsResult.value,
            identity: previousIdentityResult.value,
        });

        return {
            ok: false,
            message: rollbackSucceeded
                ? `${identityWrite.message} Previous local progress was restored.`
                : `${identityWrite.message} Previous local progress could not be fully restored.`,
        };
    }

    return {
        ok: true,
        value: validatedSave,
    };
}

/**
 * Resolves existing identity metadata or prepares a new stable local identity.
 */
function resolveLocalSaveIdentity({
    shiftRuns,
    ticketResults,
    fallbackTimestamp,
}: {
    shiftRuns: ShiftRun[];
    ticketResults: TicketScoreResult[];
    fallbackTimestamp: string;
}): PortableSaveStorageResult<{
    identity: LocalSaveIdentity;
    needsWrite: boolean;
}> {
    const identityResult = readLocalSaveIdentity();

    if (!identityResult.ok) {
        return identityResult;
    }

    if (identityResult.value) {
        return {
            ok: true,
            value: {
                identity: identityResult.value,
                needsWrite: false,
            },
        };
    }

    const createdAt = getEarliestActivityTimestamp({
        fallbackTimestamp,
        shiftRuns,
        ticketResults,
    });

    return {
        ok: true,
        value: {
            identity: {
                schemaVersion: 1,
                saveId: createLocalSaveId(createdAt),
                createdAt,
            },
            needsWrite: true,
        },
    };
}

/**
 * Reads stable local save identity without silently replacing malformed data.
 */
function readLocalSaveIdentity(): PortableSaveStorageResult<LocalSaveIdentity | null> {
    const storage = getBrowserLocalStorage();

    if (!storage) {
        return {
            ok: false,
            message:
                "Portable save storage is not available in this browser session.",
        };
    }

    try {
        const rawValue = storage.getItem(localSaveIdentityStorageKey);

        if (!rawValue) {
            return {
                ok: true,
                value: null,
            };
        }

        const parsedValue: unknown = JSON.parse(rawValue);

        if (!isLocalSaveIdentity(parsedValue)) {
            return {
                ok: false,
                message:
                    "Local save identity data is incompatible or malformed. Existing progress was not overwritten.",
            };
        }

        return {
            ok: true,
            value: parsedValue,
        };
    } catch {
        return {
            ok: false,
            message:
                "Local save identity data could not be read. Existing progress was not overwritten.",
        };
    }
}

/**
 * Writes one stable local save identity.
 */
function writeLocalSaveIdentity(
    identity: LocalSaveIdentity,
): PortableSaveStorageResult<LocalSaveIdentity> {
    const storage = getBrowserLocalStorage();

    if (!storage) {
        return {
            ok: false,
            message:
                "Portable save storage is not available in this browser session.",
        };
    }

    try {
        storage.setItem(localSaveIdentityStorageKey, JSON.stringify(identity));

        return {
            ok: true,
            value: identity,
        };
    } catch {
        return {
            ok: false,
            message:
                "Local save identity could not be saved. Browser storage may be full or restricted.",
        };
    }
}

/**
 * Restores all portable-save-owned local source records after a failed write.
 */
function restoreProgressSnapshot({
    shiftRuns,
    ticketResults,
    identity,
}: {
    shiftRuns: ShiftRun[];
    ticketResults: TicketScoreResult[];
    identity: LocalSaveIdentity | null;
}): boolean {
    const ticketResultRollback = replaceTicketScoreResults(ticketResults);
    const shiftRunRollback = replaceShiftRuns(shiftRuns);
    const identityRollback = identity
        ? writeLocalSaveIdentity(identity).ok
        : removeLocalSaveIdentity();

    return ticketResultRollback.ok && shiftRunRollback.ok && identityRollback;
}

/**
 * Removes generated identity metadata when rolling back to an identity-less save.
 */
function removeLocalSaveIdentity(): boolean {
    const storage = getBrowserLocalStorage();

    if (!storage) {
        return false;
    }

    try {
        storage.removeItem(localSaveIdentityStorageKey);

        return true;
    } catch {
        return false;
    }
}

/**
 * Creates a stable local save ID from the save-history creation timestamp.
 */
function createLocalSaveId(createdAt: string): string {
    const safeTimestamp = createdAt.replace(/[^0-9a-zA-Z]/g, "");

    return `save-${safeTimestamp}`;
}

/**
 * Runtime guard for persisted local save identity metadata.
 */
function isLocalSaveIdentity(value: unknown): value is LocalSaveIdentity {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const record = value as Record<string, unknown>;

    return (
        Object.keys(record).every((key) => localSaveIdentityKeys.has(key)) &&
        record.schemaVersion === 1 &&
        typeof record.saveId === "string" &&
        record.saveId.trim().length > 0 &&
        isCanonicalIsoDateTime(record.createdAt)
    );
}

/**
 * Checks one timestamp against the canonical ISO form produced by the app.
 */
function isCanonicalIsoDateTime(value: unknown): value is string {
    if (typeof value !== "string") {
        return false;
    }

    const timestamp = Date.parse(value);

    return (
        Number.isFinite(timestamp) &&
        new Date(timestamp).toISOString() === value
    );
}

/**
 * Safely returns browser localStorage when it exists.
 */
function getBrowserLocalStorage(): Storage | null {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

const localSaveIdentityKeys = new Set(["schemaVersion", "saveId", "createdAt"]);
