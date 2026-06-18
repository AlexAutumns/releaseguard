import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface InvestigationWorkspaceShellProps {
    children: ReactNode;
    className?: string;
}

/**
 * Dedicated shell for the active investigation route.
 *
 * This shell avoids the normal large page header and decorative page margins.
 * The investigation route needs maximum usable screen space for the board,
 * evidence cabinet, notebook, verdict drawer, and tool rack.
 */
export function InvestigationWorkspaceShell({
    children,
    className,
}: InvestigationWorkspaceShellProps) {
    return (
        <main
            className={cn(
                "h-screen w-screen overflow-hidden bg-rg-night p-1.5 text-rg-text sm:p-2",
                className,
            )}
        >
            <div className="rg-wood-texture flex h-full min-h-0 flex-col rounded-[1.5rem] border border-rg-wood-light/35 bg-rg-wood p-2 shadow-2xl shadow-black/60">
                {children}
            </div>
        </main>
    );
}
