import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface SectionHeaderProps {
    eyebrow?: string;
    title: string;
    description?: string;
    meta?: ReactNode;
    actions?: ReactNode;
    className?: string;
    tone?: "dark" | "paper";
}

/**
 * Shared section header for panels and screen sections.
 *
 * Use tone="paper" only when the header is placed inside an aged-paper object.
 * Most app screens should use the default dark tone.
 */
export function SectionHeader({
    eyebrow,
    title,
    description,
    meta,
    actions,
    className,
    tone = "dark",
}: SectionHeaderProps) {
    const isPaper = tone === "paper";

    return (
        <div
            className={cn(
                "mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
                className,
            )}
        >
            <div>
                {eyebrow && (
                    <p
                        className={cn(
                            "mb-1 font-mono text-xs font-extrabold uppercase tracking-[0.18em]",
                            isPaper ? "text-rg-folder-dark" : "text-rg-amber",
                        )}
                    >
                        {eyebrow}
                    </p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    <h2
                        className={cn(
                            "text-2xl font-black tracking-[-0.04em]",
                            isPaper ? "text-rg-paper-ink" : "text-rg-text",
                        )}
                    >
                        {title}
                    </h2>
                    {meta}
                </div>

                {description && (
                    <p
                        className={cn(
                            "mt-2 max-w-2xl text-sm leading-6",
                            isPaper ? "text-rg-paper-muted" : "text-rg-muted",
                        )}
                    >
                        {description}
                    </p>
                )}
            </div>

            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
    );
}
