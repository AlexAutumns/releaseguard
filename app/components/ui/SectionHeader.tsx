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
 * Shared section heading for dark UI panels and physical paper documents.
 *
 * Display headings use the noir identity voice. Eyebrows and supporting copy
 * switch between dark-UI and document typography according to the material.
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
                            isPaper
                                ? "rg-document-meta-label"
                                : "rg-technical-label",
                            isPaper ? "text-rg-paper-ink/72" : "text-rg-amber",
                        )}
                    >
                        {eyebrow}
                    </p>
                )}

                <div className="mt-1 flex flex-wrap items-center gap-3">
                    <h2
                        className={cn(
                            "rg-display-heading text-2xl",
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
                            isPaper
                                ? "rg-document-copy text-rg-paper-ink/82"
                                : "rg-body-copy text-rg-muted",
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
