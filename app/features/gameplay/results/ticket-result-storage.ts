import type { TicketScoreResult } from "../scoring/scoring-types";

/**
 * Prefix used for storing submitted ticket score results in browser storage.
 *
 * Keeping a prefix makes the stored data easier to identify and avoids key
 * collisions with unrelated localStorage entries.
 */
const ticketResultStorageKeyPrefix = "releaseguard:ticket-result:";

/**
 * Explicit result returned by Ticket Result collection reads.
 */
export type TicketResultStorageResult<TValue> =
    | {
          ok: true;
          value: TValue;
      }
    | {
          ok: false;
          message: string;
      };

/**
 * Result returned by Ticket Result write operations.
 */
export type TicketResultStorageWriteResult =
    | {
          ok: true;
      }
    | {
          ok: false;
          message: string;
      };

/**
 * Saves a submitted ticket score result to browser localStorage.
 *
 * This function does not calculate scores. It only persists an already-created
 * result snapshot so the report page can load after navigation or refresh.
 */
export function saveTicketScoreResult(
    result: TicketScoreResult,
): TicketResultStorageWriteResult {
    const storage = getBrowserLocalStorage();

    if (!storage) {
        return {
            ok: false,
            message:
                "Ticket result storage is not available in this browser session.",
        };
    }

    try {
        storage.setItem(
            getTicketResultStorageKey(result.attemptId),
            JSON.stringify(result),
        );

        return {
            ok: true,
        };
    } catch {
        return {
            ok: false,
            message:
                "Ticket result could not be saved. Browser storage may be full or restricted.",
        };
    }
}

/**
 * Loads one submitted ticket score result by attempt ID.
 *
 * Invalid, missing, or incompatible stored data returns null instead of
 * throwing. The result screen can then show a safe fallback.
 */
export function loadTicketScoreResult(
    attemptId: string,
): TicketScoreResult | null {
    const storage = getBrowserLocalStorage();

    if (!storage) {
        return null;
    }

    try {
        const rawValue = storage.getItem(getTicketResultStorageKey(attemptId));

        return rawValue ? parseStoredTicketScoreResult(rawValue) : null;
    } catch {
        return null;
    }
}

/**
 * Loads every persisted Ticket Result owned by ReleaseGuard.
 *
 * Export is fail-closed: if any ReleaseGuard result key contains malformed or
 * incompatible data, the collection read fails instead of silently omitting a
 * report from the portable save.
 */
export function loadTicketScoreResults(): TicketResultStorageResult<
    TicketScoreResult[]
> {
    const storage = getBrowserLocalStorage();

    if (!storage) {
        return {
            ok: false,
            message:
                "Ticket result storage is not available in this browser session.",
        };
    }

    try {
        const results: TicketScoreResult[] = [];

        for (const key of getTicketResultStorageKeys(storage)) {
            const rawValue = storage.getItem(key);
            const result = rawValue
                ? parseStoredTicketScoreResult(rawValue)
                : null;

            if (!result) {
                return {
                    ok: false,
                    message: `Saved Ticket Result data at "${key}" is incompatible or malformed. Existing reports were not changed.`,
                };
            }

            results.push(result);
        }

        results.sort(compareTicketScoreResultsOldestFirst);

        return {
            ok: true,
            value: results,
        };
    } catch {
        return {
            ok: false,
            message:
                "Saved Ticket Result data could not be read. Existing reports were not changed.",
        };
    }
}

/**
 * Replaces every persisted Ticket Result with one validated snapshot set.
 *
 * localStorage has no multi-key transaction API. This function therefore keeps
 * the previous raw ReleaseGuard result entries and restores them on a write
 * failure as a best-effort domain-level rollback.
 */
export function replaceTicketScoreResults(
    results: TicketScoreResult[],
): TicketResultStorageWriteResult {
    const storage = getBrowserLocalStorage();

    if (!storage) {
        return {
            ok: false,
            message:
                "Ticket result storage is not available in this browser session.",
        };
    }

    if (!hasValidTicketResultReplacement(results)) {
        return {
            ok: false,
            message:
                "Ticket Result replacement was rejected because the snapshot contains malformed or duplicate attempt records.",
        };
    }

    const previousEntriesResult = readRawTicketResultEntries(storage);

    if (!previousEntriesResult.ok) {
        return previousEntriesResult;
    }

    try {
        removeTicketResultEntries(storage);

        for (const result of results) {
            storage.setItem(
                getTicketResultStorageKey(result.attemptId),
                JSON.stringify(result),
            );
        }

        return {
            ok: true,
        };
    } catch {
        const rollbackSucceeded = restoreRawTicketResultEntries(
            storage,
            previousEntriesResult.value,
        );

        return {
            ok: false,
            message: rollbackSucceeded
                ? "Ticket Results could not be replaced. Previous local reports were restored."
                : "Ticket Results could not be replaced, and the previous report snapshot could not be fully restored. Browser storage may be full or restricted.",
        };
    }
}

/**
 * Creates the localStorage key for one submitted attempt result.
 */
function getTicketResultStorageKey(attemptId: string): string {
    return `${ticketResultStorageKeyPrefix}${attemptId}`;
}

/**
 * Returns every ReleaseGuard Ticket Result storage key.
 */
function getTicketResultStorageKeys(storage: Storage): string[] {
    const keys: string[] = [];

    for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);

        if (key?.startsWith(ticketResultStorageKeyPrefix)) {
            keys.push(key);
        }
    }

    return keys.sort((left, right) => left.localeCompare(right));
}

/**
 * Reads the raw Ticket Result entries needed for a best-effort rollback.
 */
function readRawTicketResultEntries(
    storage: Storage,
): TicketResultStorageResult<Array<[string, string]>> {
    try {
        const entries: Array<[string, string]> = [];

        for (const key of getTicketResultStorageKeys(storage)) {
            const rawValue = storage.getItem(key);

            if (rawValue === null) {
                return {
                    ok: false,
                    message:
                        "Ticket Result storage changed while preparing a replacement snapshot.",
                };
            }

            entries.push([key, rawValue]);
        }

        return {
            ok: true,
            value: entries,
        };
    } catch {
        return {
            ok: false,
            message:
                "Existing Ticket Results could not be snapshotted before replacement.",
        };
    }
}

/**
 * Removes every ReleaseGuard Ticket Result key without touching other storage.
 */
function removeTicketResultEntries(storage: Storage): void {
    for (const key of getTicketResultStorageKeys(storage)) {
        storage.removeItem(key);
    }
}

/**
 * Restores a previously captured raw Ticket Result snapshot.
 */
function restoreRawTicketResultEntries(
    storage: Storage,
    entries: Array<[string, string]>,
): boolean {
    try {
        removeTicketResultEntries(storage);

        for (const [key, rawValue] of entries) {
            storage.setItem(key, rawValue);
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Checks one replacement snapshot before any existing reports are removed.
 */
function hasValidTicketResultReplacement(
    results: TicketScoreResult[],
): boolean {
    const attemptIds = new Set<string>();

    for (const result of results) {
        if (!isTicketScoreResult(result) || attemptIds.has(result.attemptId)) {
            return false;
        }

        attemptIds.add(result.attemptId);
    }

    return true;
}

/**
 * Orders Ticket Results deterministically for portable-save snapshots.
 */
function compareTicketScoreResultsOldestFirst(
    left: TicketScoreResult,
    right: TicketScoreResult,
): number {
    return (
        left.submittedAt.localeCompare(right.submittedAt) ||
        left.attemptId.localeCompare(right.attemptId)
    );
}

/**
 * Parses one shallow app-owned Ticket Result snapshot.
 */
function parseStoredTicketScoreResult(
    rawValue: string,
): TicketScoreResult | null {
    try {
        const parsedValue: unknown = JSON.parse(rawValue);

        return isTicketScoreResult(parsedValue) ? parsedValue : null;
    } catch {
        return null;
    }
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
 * Minimal runtime guard for loaded ticket score results.
 *
 * This remains intentionally shallow for app-written route loading. The
 * portable-save import boundary performs the deep authored-content validation.
 */
function isTicketScoreResult(value: unknown): value is TicketScoreResult {
    if (!isRecord(value)) {
        return false;
    }

    return (
        value.schemaVersion === 1 &&
        typeof value.attemptId === "string" &&
        typeof value.shiftId === "string" &&
        typeof value.ticketId === "string" &&
        typeof value.ticketTitle === "string" &&
        typeof value.submittedAt === "string" &&
        typeof value.totalScore === "number" &&
        typeof value.maxScore === "number" &&
        isRecord(value.breakdown) &&
        Array.isArray(value.matchedFindings) &&
        Array.isArray(value.missedFindings) &&
        Array.isArray(value.unsupportedFindings) &&
        isRecord(value.stats)
    );
}

/**
 * Runtime helper for checking object-like parsed JSON values.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
