import type { ReactNode } from "react";

import { Button } from "../../components/ui/Button";
import { cn } from "../../lib/cn";

export interface InvestigationRailProps {
    side: "left" | "right";
    icon: string;
    label: string;
    meta?: ReactNode;
    onOpen: () => void;
}

/**
 * Collapsed side rail for the investigation workspace.
 *
 * The rail keeps folded panels discoverable while giving the main board more
 * room. The open button stays at the top so collapse and expand controls feel
 * spatially consistent.
 */
export function InvestigationRail({
    side,
    icon,
    label,
    meta,
    onOpen,
}: InvestigationRailProps) {
    return (
        <aside
            className={cn(
                "flex min-h-0 w-12 flex-col items-center rounded-2xl border border-rg-border bg-rg-surface/92 p-2 shadow-xl shadow-black/35",
                side === "left" ? "order-first" : "order-last",
            )}
        >
            <Button
                aria-label={`Open ${label}`}
                className="h-8 w-8 px-0"
                onClick={onOpen}
                size="sm"
                title={`Open ${label}`}
                variant="secondary"
            >
                {side === "left" ? "→" : "←"}
            </Button>

            <div className="mt-3 flex flex-1 flex-col items-center gap-3 overflow-hidden">
                <span className="text-lg" aria-hidden="true">
                    {icon}
                </span>

                <p className="font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-rg-muted [writing-mode:vertical-rl]">
                    {label}
                </p>

                {meta && <div className="mt-1">{meta}</div>}
            </div>
        </aside>
    );
}
