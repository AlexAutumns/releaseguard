import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface EmptyStateProps {
    title: string;
    description?: string;
    action?: ReactNode;
    className?: string;
}

/**
 * Reusable empty state for panels where the player has not created or unlocked
 * anything yet.
 *
 * Examples: no pinned evidence, no filed findings, no saved attempts, or no
 * available shift result.
 */
export function EmptyState({
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                "rounded-2xl border border-dashed border-rg-folder bg-rg-paper-strong/65 p-6 text-center",
                className,
            )}
        >
            <h3 className="text-lg font-black tracking-[-0.03em] text-rg-ink">
                {title}
            </h3>

            {description && (
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-rg-muted">
                    {description}
                </p>
            )}

            {action && <div className="mt-4 flex justify-center">{action}</div>}
        </div>
    );
}
