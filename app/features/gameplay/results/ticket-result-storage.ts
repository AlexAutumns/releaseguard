import type { TicketScoreResult } from "../scoring/scoring-types";

/**
 * Prefix used for storing submitted ticket score results in browser storage.
 *
 * Keeping a prefix makes the stored data easier to identify and avoids key
 * collisions with unrelated localStorage entries.
 */
const ticketResultStorageKeyPrefix = "releaseguard:ticket-result:";

/**
 * Result returned by write operations.
 *
 * Storage can fail in browser privacy modes, disabled storage environments, or
 * quota errors. Returning an explicit result keeps the submission flow from
 * crashing unexpectedly.
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

        if (!rawValue) {
            return null;
        }

        const parsedValue: unknown = JSON.parse(rawValue);

        if (!isTicketScoreResult(parsedValue)) {
            return null;
        }

        return parsedValue;
    } catch {
        return null;
    }
}

/**
 * Creates the localStorage key for one submitted attempt result.
 */
function getTicketResultStorageKey(attemptId: string): string {
    return `${ticketResultStorageKeyPrefix}${attemptId}`;
}

/**
 * Safely returns browser localStorage when it exists.
 *
 * React Router builds and tests may execute code in environments where window
 * or localStorage is unavailable. This helper prevents those environments from
 * crashing during imports or result loading.
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
 * This is intentionally not a deep validator. It only checks the fields needed
 * to trust that the saved value is one of ReleaseGuard's submitted result
 * snapshots before the result screen renders it.
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
