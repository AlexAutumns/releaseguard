import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../../lib/cn";

export type PanelTone = "paper" | "strong" | "cork" | "dark" | "warning";
export type PanelPadding = "none" | "sm" | "md" | "lg";

/**
 * Reusable panel primitive for case-file cards, cork-board areas, and report
 * containers.
 *
 * Keep this component visual-only. Screen-specific layout belongs in screen
 * files or screen section components.
 */
export function Panel({
    tone = "paper",
    padding = "md",
    className,
    ...props
}: ComponentPropsWithoutRef<"section"> & {
    tone?: PanelTone;
    padding?: PanelPadding;
}) {
    return (
        <section
            className={cn(
                "rounded-3xl border shadow-xl",
                {
                    "border-rg-folder bg-rg-paper text-rg-ink":
                        tone === "paper",
                    "border-rg-folder bg-rg-paper-strong text-rg-ink":
                        tone === "strong",
                    "border-rg-cork-dark bg-rg-cork text-rg-paper-strong":
                        tone === "cork",
                    "border-rg-ink bg-rg-ink text-rg-paper-strong":
                        tone === "dark",
                    "border-rg-warning/40 bg-rg-warning/10 text-rg-ink":
                        tone === "warning",
                },
                {
                    "p-0": padding === "none",
                    "p-4": padding === "sm",
                    "p-6": padding === "md",
                    "p-8": padding === "lg",
                },
                className,
            )}
            {...props}
        />
    );
}
