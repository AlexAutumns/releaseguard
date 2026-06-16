import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface SectionHeaderProps {
    eyebrow?: string;
    title: string;
    description?: string;
    meta?: ReactNode;
    actions?: ReactNode;
    className?: string;
}

/**
 * Shared section header for panels and screen sections.
 *
 * This keeps Evidence, Notebook, Board, and Report headings consistent without
 * forcing each feature component to repeat title layout classes.
 */
export function SectionHeader({
    eyebrow,
    title,
    description,
    meta,
    actions,
    className,
}: SectionHeaderProps) {
    return (
        <div
            className={cn(
                "mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
                className,
            )}
        >
            <div>
                {eyebrow && (
                    <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.18em] text-rg-accent">
                        {eyebrow}
                    </p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-black tracking-[-0.04em] text-rg-ink">
                        {title}
                    </h2>
                    {meta}
                </div>

                {description && (
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-rg-muted">
                        {description}
                    </p>
                )}
            </div>

            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
    );
}
