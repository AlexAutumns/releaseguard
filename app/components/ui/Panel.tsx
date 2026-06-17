import type { ComponentPropsWithoutRef } from "react";

import { cn, type ClassValue } from "../../lib/cn";

export type PanelTone =
    | "surface"
    | "raised"
    | "paper"
    | "notepad"
    | "folder"
    | "wood"
    | "cork"
    | "danger"
    /**
     * Legacy compatibility tones from the earlier UI foundation.
     * Keep them temporarily so older skeleton files do not break.
     */
    | "strong"
    | "dark"
    | "warning";

export type PanelPadding = "none" | "sm" | "md" | "lg";

export interface PanelProps extends Omit<
    ComponentPropsWithoutRef<"section">,
    "className"
> {
    tone?: PanelTone;
    padding?: PanelPadding;
    className?: ClassValue;
}

/**
 * Reusable panel primitive for noir surfaces, desk wood, evidence paper,
 * notepad sheets, folder cards, and cork-board spaces.
 *
 * Default is a dark surface because the game environment should feel noir.
 * Paper/notepad/folder/cork tones are reserved for physical case objects.
 */
export function Panel({
    tone = "surface",
    padding = "md",
    className,
    children,
    ...props
}: PanelProps) {
    return (
        <section
            className={cn(
                "relative overflow-hidden rounded-3xl border shadow-2xl",
                {
                    "border-rg-border bg-rg-surface/95 text-rg-text shadow-black/35":
                        tone === "surface" || tone === "dark",
                    "border-rg-border-soft bg-rg-surface-raised/95 text-rg-text shadow-black/45":
                        tone === "raised" || tone === "strong",
                    "border-rg-folder-dark bg-rg-paper text-rg-paper-ink shadow-black/35":
                        tone === "paper",
                    "border-rg-notepad-line/45 bg-rg-notepad text-rg-paper-ink shadow-black/35":
                        tone === "notepad",
                    "border-rg-folder-dark bg-rg-folder/75 text-rg-text shadow-black/35":
                        tone === "folder",
                    "border-rg-wood-light/45 bg-rg-wood text-rg-text shadow-black/50":
                        tone === "wood",
                    "border-rg-cork-dark bg-rg-cork text-rg-paper-strong shadow-black/40":
                        tone === "cork",
                    "border-rg-stamp bg-rg-stamp/12 text-rg-text shadow-rg-stamp/10":
                        tone === "danger" || tone === "warning",
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
        >
            <div
                aria-hidden="true"
                className={cn(
                    "pointer-events-none absolute inset-0 opacity-45",
                    {
                        "rg-surface-grit":
                            tone === "surface" ||
                            tone === "raised" ||
                            tone === "strong" ||
                            tone === "dark",
                        "rg-paper-grain": tone === "paper",
                        "rg-notepad-texture": tone === "notepad",
                        "rg-wood-texture": tone === "wood",
                        "rg-cork-grain": tone === "cork",
                        "rg-danger-stripes":
                            tone === "danger" || tone === "warning",
                    },
                )}
            />

            <div className="relative z-10">{children}</div>
        </section>
    );
}
