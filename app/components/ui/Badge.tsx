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
 * The visual style is intentionally muted and stamped-looking so badges feel
 * like case labels rather than bright SaaS status pills.
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
                "inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-[0.68rem] font-bold uppercase tracking-[0.16em]",
                {
                    "border-rg-border-soft bg-rg-surface-raised text-rg-muted":
                        tone === "neutral",
                    "border-rg-success/45 bg-rg-success/12 text-rg-success":
                        tone === "success",
                    "border-rg-warning/45 bg-rg-warning/12 text-rg-warning":
                        tone === "warning",
                    "border-rg-danger/45 bg-rg-danger/12 text-rg-danger":
                        tone === "danger",
                    "border-rg-info/45 bg-rg-info/12 text-rg-info":
                        tone === "info",
                    "border-rg-cork bg-rg-cork/22 text-rg-paper-strong":
                        tone === "cork",
                },
                className,
            )}
            {...props}
        />
    );
}
