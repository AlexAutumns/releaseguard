import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../../lib/cn";

export type BadgeTone =
    | "neutral"
    | "account"
    | "authentication"
    | "security"
    | "testing"
    | "quality"
    | "privacy"
    | "operational"
    | "communication"
    | "reference"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "violet"
    | "cork";

export type BadgeKind = "classification" | "state";

export type BadgeSurface = "dark" | "paper";

const badgeToneClassName: Record<BadgeTone, string> = {
    neutral: "rg-tag--neutral",
    account: "rg-tag--account",
    authentication: "rg-tag--authentication",
    security: "rg-tag--security",
    testing: "rg-tag--testing",
    quality: "rg-tag--quality",
    privacy: "rg-tag--privacy",
    operational: "rg-tag--operational",
    communication: "rg-tag--communication",
    reference: "rg-tag--reference",
    success: "rg-tag--success",
    warning: "rg-tag--warning",
    danger: "rg-tag--danger",
    info: "rg-tag--info",
    violet: "rg-tag--violet",
    cork: "rg-tag--cork",
};

const badgeKindClassName: Record<BadgeKind, string> = {
    classification: "rg-tag--classification",
    state: "rg-tag--state",
};

const badgeSurfaceClassName: Record<BadgeSurface, string> = {
    dark: "rg-tag--dark",
    paper: "rg-tag--paper",
};

/**
 * Reusable physical classification or state marker.
 *
 * `kind` selects the physical label language:
 * - `classification` renders an archival case marker;
 * - `state` renders a compact office/status stamp.
 *
 * `tone` selects semantic pigment and `surface` selects the readable treatment
 * for the surrounding material. Machine-generated IDs, counters, and difficulty
 * fields should use dedicated register/docket presentation instead of Badge.
 *
 * Visible text remains the primary information carrier so colour improves
 * scanning without becoming a hidden code the player must memorise.
 */
export function Badge({
    kind = "state",
    tone = "neutral",
    surface = "dark",
    className,
    ...props
}: ComponentPropsWithoutRef<"span"> & {
    kind?: BadgeKind;
    tone?: BadgeTone;
    surface?: BadgeSurface;
}) {
    return (
        <span
            className={cn(
                "rg-tag",
                badgeKindClassName[kind],
                badgeToneClassName[tone],
                badgeSurfaceClassName[surface],
                className,
            )}
            {...props}
        />
    );
}
