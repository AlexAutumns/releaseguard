import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface ScreenShellProps {
    eyebrow?: string;
    title?: string;
    description?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}

/**
 * Shared outer wrapper for major game screens.
 *
 * This shell gives each route a dark noir environment and a wide wood-desk
 * play surface. It is intentionally desktop-first because ReleaseGuard's core
 * interaction model needs room for evidence, board, notebook, and verdict UI.
 */
export function ScreenShell({
    eyebrow,
    title,
    description,
    actions,
    children,
    className,
}: ScreenShellProps) {
    return (
        <main
            className={cn(
                "mx-auto flex min-h-screen w-full max-w-420 flex-col px-3 py-4 text-rg-text sm:px-4 lg:px-6",
                className,
            )}
        >
            {(eyebrow || title || description || actions) && (
                <header className="mb-4 overflow-hidden rounded-3xl border border-rg-border bg-rg-surface/90 p-5 shadow-2xl shadow-black/40 lg:p-6">
                    <div className="relative">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-rg-amber/10 blur-3xl"
                        />

                        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-4xl">
                                {eyebrow && (
                                    <p className="mb-2 font-mono text-xs font-extrabold uppercase tracking-[0.24em] text-rg-amber">
                                        {eyebrow}
                                    </p>
                                )}

                                {title && (
                                    <h1 className="text-4xl font-black leading-none tracking-[-0.06em] text-rg-text sm:text-5xl lg:text-6xl">
                                        {title}
                                    </h1>
                                )}

                                {description && (
                                    <p className="mt-4 max-w-3xl text-base leading-7 text-rg-muted">
                                        {description}
                                    </p>
                                )}
                            </div>

                            {actions && (
                                <div className="flex flex-wrap gap-3 lg:justify-end">
                                    {actions}
                                </div>
                            )}
                        </div>
                    </div>
                </header>
            )}

            <div className="rg-wood-texture flex-1 rounded-[2rem] border border-rg-wood-light/35 bg-rg-wood p-3 shadow-2xl shadow-black/45 sm:p-4 lg:p-5">
                <div className="relative z-10 min-h-full">{children}</div>
            </div>
        </main>
    );
}
