import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../../lib/cn";

export type BadgeTone =
    | "neutral"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "cork";

/**
 * Reusable badge primitive for short labels and status markers.
 *
 * This component is deliberately generic. Gameplay-specific meaning should come
 * from the text passed into the badge, not from the badge itself.
 */
export function Badge({
    tone = "neutral",
    className,
    ...props
}: ComponentPropsWithoutRef<"span"> & {
    tone?: BadgeTone;
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
                {
                    "border-rg-folder bg-rg-paper-strong text-rg-muted":
                        tone === "neutral",
                    "border-rg-success/30 bg-rg-success/10 text-rg-success":
                        tone === "success",
                    "border-rg-warning/35 bg-rg-warning/10 text-rg-warning":
                        tone === "warning",
                    "border-rg-danger/35 bg-rg-danger/10 text-rg-danger":
                        tone === "danger",
                    "border-rg-info/35 bg-rg-info/10 text-rg-info":
                        tone === "info",
                    "border-rg-cork/35 bg-rg-cork/10 text-rg-cork-dark":
                        tone === "cork",
                },
                className,
            )}
            {...props}
        />
    );
}
