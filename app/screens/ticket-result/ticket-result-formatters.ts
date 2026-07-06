import type {
    FindingSeverity,
    ReleaseVerdict,
    RiskCategory,
} from "../../features/content/content-types";

/**
 * Formats score values without noisy trailing zeroes in official report fields.
 */
export function formatScore(score: number): string {
    return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

/**
 * Formats one release-verdict ID for official report copy.
 */
export function formatVerdict(verdict: ReleaseVerdict | null): string {
    if (!verdict) {
        return "No Verdict";
    }

    return formatIdentifier(verdict);
}

/**
 * Formats a finding severity for official report copy.
 */
export function formatSeverity(severity: FindingSeverity): string {
    return formatIdentifier(severity);
}

/**
 * Formats a risk category for official report copy.
 */
export function formatCategory(category: RiskCategory): string {
    return formatIdentifier(category);
}

/**
 * Formats an ISO datetime using the viewer's local browser locale.
 *
 * Invalid values are preserved verbatim so the report never invents a date.
 */
export function formatDateTime(isoValue: string): string {
    const date = new Date(isoValue);

    if (Number.isNaN(date.getTime())) {
        return isoValue;
    }

    return date.toLocaleString();
}

/**
 * Converts a stable kebab-case identifier into readable title case.
 */
function formatIdentifier(value: string): string {
    return value
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}
