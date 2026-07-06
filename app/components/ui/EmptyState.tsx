import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface EmptyStateProps {
    title: string;
    description?: string;
    action?: ReactNode;
    className?: string;
    tone?: "dark" | "paper";
}

/**
 * Reusable empty state for panels where the player has not created or unlocked
 * anything yet.
 */
export function EmptyState({
    title,
    description,
    action,
    className,
    tone = "dark",
}: EmptyStateProps) {
    const isPaper = tone === "paper";

    return (
        <div
            className={cn(
                "rounded-2xl border border-dashed p-6 text-center",
                isPaper
                    ? "border-rg-folder-dark/50 bg-rg-paper-strong/45 text-rg-paper-ink"
                    : "border-rg-border-soft bg-rg-surface-raised/65 text-rg-text",
                className,
            )}
        >
            <h3
                className={cn(
                    "text-lg font-black tracking-[-0.03em]",
                    isPaper ? "text-rg-paper-ink" : "text-rg-text",
                )}
            >
                {title}
            </h3>

            {description && (
                <p
                    className={cn(
                        "mx-auto mt-2 max-w-md text-sm leading-6",
                        isPaper ? "text-rg-paper-muted" : "text-rg-muted",
                    )}
                >
                    {description}
                </p>
            )}

            {action && <div className="mt-4 flex justify-center">{action}</div>}
        </div>
    );
}
