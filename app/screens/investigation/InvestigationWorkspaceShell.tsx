import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface InvestigationWorkspaceShellProps {
    children: ReactNode;
    className?: string;
}

/**
 * Viewport-bound shell for the active Investigation desk.
 *
 * The route consumes the current dynamic CSS viewport and intentionally keeps
 * browser-level overflow hidden. Named inner regions own document scrolling,
 * while the Board uses Pan to traverse its larger logical world.
 */
export function InvestigationWorkspaceShell({
    children,
    className,
}: InvestigationWorkspaceShellProps) {
    return (
        <main
            className={cn(
                "h-dvh w-full overflow-hidden bg-rg-night p-1.5 text-rg-text sm:p-2",
                className,
            )}
        >
            <div className="rg-investigation-desk rg-wood-texture flex h-full min-h-0 flex-col border border-rg-wood-light/35 bg-rg-wood p-2 shadow-2xl shadow-black/60">
                {children}
            </div>
        </main>
    );
}
