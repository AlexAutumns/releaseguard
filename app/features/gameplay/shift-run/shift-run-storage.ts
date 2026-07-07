import type { ShiftRun } from "./shift-run-types";

/**
 * Browser storage key for the complete persisted Shift Run collection.
 *
 * The July checkpoint stores all runs in one small collection so Shift Run
 * lookups can scan one source of truth instead of maintaining duplicate indexes.
 */
const shiftRunStorageKey = "releaseguard:shift-runs";

/**
 * Current schema version for the stored Shift Run collection envelope.
 */
type ShiftRunCollectionSchemaVersion = 1;

/**
 * Persisted envelope for the Shift Run collection.
 */
interface StoredShiftRunCollection {
    schemaVersion: ShiftRunCollectionSchemaVersion;
    shiftRuns: ShiftRun[];
}

/**
 * Explicit storage result for Shift Run reads and writes.
 */
export type ShiftRunStorageResult<TValue> =
    | {
          ok: true;
          value: TValue;
      }
    | {
          ok: false;
          message: string;
      };

/**
 * Loads every valid persisted Shift Run.
 *
 * Missing storage starts as an empty collection. Malformed stored data fails
 * explicitly so later writes do not silently overwrite an incompatible save.
 */
export function loadShiftRuns(): ShiftRunStorageResult<ShiftRun[]> {
    const storage = getBrowserLocalStorage();

    if (!storage) {
        return {
            ok: false,
            message:
                "Shift Run storage is not available in this browser session.",
        };
    }

    return readShiftRunCollection(storage);
}

/**
 * Loads one Shift Run by stable run ID.
 */
export function loadShiftRunById(
    shiftRunId: string,
): ShiftRunStorageResult<ShiftRun | null> {
    const result = loadShiftRuns();

    if (!result.ok) {
        return result;
    }

    return {
        ok: true,
        value:
            result.value.find(
                (shiftRun) => shiftRun.shiftRunId === shiftRunId,
            ) ?? null,
    };
}

/**
 * Loads the single July-checkpoint Shift Run owned by one authored shift.
 */
export function loadShiftRunByShiftId(
    shiftId: string,
): ShiftRunStorageResult<ShiftRun | null> {
    const result = loadShiftRuns();

    if (!result.ok) {
        return result;
    }

    return {
        ok: true,
        value:
            result.value.find((shiftRun) => shiftRun.shiftId === shiftId) ??
            null,
    };
}

/**
 * Resolves the Shift Run that owns one submitted Ticket Result attempt.
 */
export function loadShiftRunByAttemptId(
    attemptId: string,
): ShiftRunStorageResult<ShiftRun | null> {
    const result = loadShiftRuns();

    if (!result.ok) {
        return result;
    }

    return {
        ok: true,
        value:
            result.value.find((shiftRun) =>
                shiftRun.completedTicketAttempts.some(
                    (item) => item.attemptId === attemptId,
                ),
            ) ?? null,
    };
}

/**
 * Saves one Shift Run without creating a second progression run for its shift.
 *
 * Existing records with the same Shift Run ID are replaced. A different run ID
 * for the same shift is rejected because formal replay is outside the July
 * checkpoint and one authored shift has one progression run.
 */
export function saveShiftRun(
    shiftRun: ShiftRun,
): ShiftRunStorageResult<ShiftRun> {
    const storage = getBrowserLocalStorage();

    if (!storage) {
        return {
            ok: false,
            message:
                "Shift Run storage is not available in this browser session.",
        };
    }

    const collectionResult = readShiftRunCollection(storage);

    if (!collectionResult.ok) {
        return collectionResult;
    }

    const conflictingShiftRun = collectionResult.value.find(
        (item) =>
            item.shiftId === shiftRun.shiftId &&
            item.shiftRunId !== shiftRun.shiftRunId,
    );

    if (conflictingShiftRun) {
        return {
            ok: false,
            message: `Shift "${shiftRun.shiftId}" already has progression run "${conflictingShiftRun.shiftRunId}".`,
        };
    }

    const nextShiftRuns = collectionResult.value.filter(
        (item) => item.shiftRunId !== shiftRun.shiftRunId,
    );

    nextShiftRuns.push(shiftRun);

    try {
        const storedCollection: StoredShiftRunCollection = {
            schemaVersion: 1,
            shiftRuns: nextShiftRuns,
        };

        storage.setItem(shiftRunStorageKey, JSON.stringify(storedCollection));

        return {
            ok: true,
            value: shiftRun,
        };
    } catch {
        return {
            ok: false,
            message:
                "Shift Run could not be saved. Browser storage may be full or restricted.",
        };
    }
}

/**
 * Reads and validates the stored Shift Run collection envelope.
 */
function readShiftRunCollection(
    storage: Storage,
): ShiftRunStorageResult<ShiftRun[]> {
    try {
        const rawValue = storage.getItem(shiftRunStorageKey);

        if (!rawValue) {
            return {
                ok: true,
                value: [],
            };
        }

        const parsedValue: unknown = JSON.parse(rawValue);

        if (!isStoredShiftRunCollection(parsedValue)) {
            return {
                ok: false,
                message:
                    "Saved Shift Run data is incompatible or malformed. Existing progression was not overwritten.",
            };
        }

        return {
            ok: true,
            value: parsedValue.shiftRuns,
        };
    } catch {
        return {
            ok: false,
            message:
                "Saved Shift Run data could not be read. Existing progression was not overwritten.",
        };
    }
}

/**
 * Runtime guard for the persisted Shift Run collection envelope.
 */
function isStoredShiftRunCollection(
    value: unknown,
): value is StoredShiftRunCollection {
    return (
        isRecord(value) &&
        value.schemaVersion === 1 &&
        Array.isArray(value.shiftRuns) &&
        value.shiftRuns.every(isShiftRun)
    );
}

/**
 * Runtime shape guard for one persisted Shift Run.
 *
 * This validates the fields required by sequencing and report lookup. Deeper
 * import validation remains a separate responsibility for the later save-file
 * import boundary.
 */
function isShiftRun(value: unknown): value is ShiftRun {
    if (!isRecord(value)) {
        return false;
    }

    return (
        value.schemaVersion === 1 &&
        typeof value.shiftRunId === "string" &&
        typeof value.shiftId === "string" &&
        Array.isArray(value.orderedTicketIds) &&
        value.orderedTicketIds.every(
            (ticketId) => typeof ticketId === "string",
        ) &&
        Number.isInteger(value.nextTicketIndex) &&
        typeof value.nextTicketIndex === "number" &&
        value.nextTicketIndex >= 0 &&
        value.nextTicketIndex <= value.orderedTicketIds.length &&
        Array.isArray(value.completedTicketAttempts) &&
        value.completedTicketAttempts.every(isCompletedTicketAttempt) &&
        typeof value.startedAt === "string" &&
        (value.completedAt === null || typeof value.completedAt === "string")
    );
}

/**
 * Runtime guard for one ticket-to-attempt completion relationship.
 */
function isCompletedTicketAttempt(value: unknown): boolean {
    return (
        isRecord(value) &&
        typeof value.ticketId === "string" &&
        typeof value.attemptId === "string"
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

/**
 * Runtime helper for checking object-like parsed JSON values.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
