import {
    getIncompleteShiftRun,
    getIncompleteShiftRunByShiftId,
    getLatestCompletedShiftRunByShiftId,
    getShiftRunsByShiftId,
    isShiftRunComplete,
} from "./shift-run-rules";
import type { ShiftRun } from "./shift-run-types";

/**
 * Browser storage key for the complete persisted Shift Run collection.
 *
 * All runs remain in one small collection so progression and historical report
 * lookups can scan one source of truth without maintaining duplicate indexes.
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
 * Loads every historical Shift Run for one authored shift.
 */
export function loadShiftRunsByShiftId(
    shiftId: string,
): ShiftRunStorageResult<ShiftRun[]> {
    const result = loadShiftRuns();

    if (!result.ok) {
        return result;
    }

    return {
        ok: true,
        value: getShiftRunsByShiftId(result.value, shiftId),
    };
}

/**
 * Loads the single globally active incomplete Shift Run when one exists.
 */
export function loadIncompleteShiftRun(): ShiftRunStorageResult<ShiftRun | null> {
    const result = loadShiftRuns();

    if (!result.ok) {
        return result;
    }

    return {
        ok: true,
        value: getIncompleteShiftRun(result.value),
    };
}

/**
 * Loads the incomplete Shift Run for one authored shift when it exists.
 */
export function loadIncompleteShiftRunByShiftId(
    shiftId: string,
): ShiftRunStorageResult<ShiftRun | null> {
    const result = loadShiftRuns();

    if (!result.ok) {
        return result;
    }

    return {
        ok: true,
        value: getIncompleteShiftRunByShiftId(result.value, shiftId),
    };
}

/**
 * Loads the newest completed historical run for one authored shift.
 */
export function loadLatestCompletedShiftRunByShiftId(
    shiftId: string,
): ShiftRunStorageResult<ShiftRun | null> {
    const result = loadShiftRuns();

    if (!result.ok) {
        return result;
    }

    return {
        ok: true,
        value: getLatestCompletedShiftRunByShiftId(result.value, shiftId),
    };
}

/**
 * Resolves the exact Shift Run that owns one submitted Ticket Result attempt.
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
 * Saves one Shift Run while preserving replay-ready historical completed runs.
 *
 * Existing records with the same Shift Run ID are replaced. Multiple completed
 * runs for one shift are allowed, but the player may have at most one incomplete
 * run globally so Continue Case always has one unambiguous active checkpoint.
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

    const nextShiftRuns = collectionResult.value.filter(
        (item) => item.shiftRunId !== shiftRun.shiftRunId,
    );

    nextShiftRuns.push(shiftRun);

    const incompleteShiftRuns = nextShiftRuns.filter(
        (item) => !isShiftRunComplete(item),
    );

    if (incompleteShiftRuns.length > 1) {
        const conflictingShiftRun = incompleteShiftRuns.find(
            (item) => item.shiftRunId !== shiftRun.shiftRunId,
        );

        return {
            ok: false,
            message: conflictingShiftRun
                ? `Shift Run "${conflictingShiftRun.shiftRunId}" is already in progress. Complete the active shift before starting another run.`
                : "More than one incomplete Shift Run cannot be saved at the same time.",
        };
    }

    const duplicateAttemptId = findDuplicateAttemptId(nextShiftRuns);

    if (duplicateAttemptId) {
        return {
            ok: false,
            message: `Attempt "${duplicateAttemptId}" is already owned by another Shift Run completion record.`,
        };
    }

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
    if (
        !isRecord(value) ||
        value.schemaVersion !== 1 ||
        !Array.isArray(value.shiftRuns) ||
        !value.shiftRuns.every(isShiftRun)
    ) {
        return false;
    }

    return hasValidShiftRunCollectionIntegrity(value.shiftRuns);
}

/**
 * Runtime shape guard for one persisted Shift Run.
 *
 * This validates the fields required by sequencing and report lookup. Deeper
 * portable-save validation remains a separate responsibility for the later
 * save-file import boundary.
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
 * Validates collection-level ownership needed by progression and report lookup.
 */
function hasValidShiftRunCollectionIntegrity(shiftRuns: ShiftRun[]): boolean {
    const shiftRunIds = new Set<string>();
    const attemptIds = new Set<string>();
    let incompleteShiftRunCount = 0;

    for (const shiftRun of shiftRuns) {
        if (shiftRunIds.has(shiftRun.shiftRunId)) {
            return false;
        }

        shiftRunIds.add(shiftRun.shiftRunId);

        if (!isShiftRunComplete(shiftRun)) {
            incompleteShiftRunCount += 1;

            if (incompleteShiftRunCount > 1) {
                return false;
            }
        }

        for (const completedAttempt of shiftRun.completedTicketAttempts) {
            if (attemptIds.has(completedAttempt.attemptId)) {
                return false;
            }

            attemptIds.add(completedAttempt.attemptId);
        }
    }

    return true;
}

/**
 * Finds one attempt ID that appears in more than one Shift Run record.
 */
function findDuplicateAttemptId(shiftRuns: ShiftRun[]): string | null {
    const attemptIds = new Set<string>();

    for (const shiftRun of shiftRuns) {
        for (const completedAttempt of shiftRun.completedTicketAttempts) {
            if (attemptIds.has(completedAttempt.attemptId)) {
                return completedAttempt.attemptId;
            }

            attemptIds.add(completedAttempt.attemptId);
        }
    }

    return null;
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
