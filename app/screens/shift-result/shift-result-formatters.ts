import type { ReleaseVerdict } from "../../features/content/content-types";

/**
 * Formats score values without noisy trailing zeroes in official report fields.
 */
export function formatShiftScore(score: number): string {
    return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

/**
 * Formats a release-verdict ID for official Shift Result copy.
 */
export function formatShiftVerdict(verdict: ReleaseVerdict | null): string {
    if (!verdict) {
        return "No Verdict";
    }

    return verdict.charAt(0).toUpperCase() + verdict.slice(1);
}

/**
 * Formats an ISO datetime using the viewer's local browser locale.
 *
 * Invalid values are preserved verbatim so the report never invents a date.
 */
export function formatShiftDateTime(isoValue: string): string {
    const date = new Date(isoValue);

    if (Number.isNaN(date.getTime())) {
        return isoValue;
    }

    return date.toLocaleString();
}
