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
 * Routes should stay thin, and screens should use this shell to keep spacing,
 * page width, and top-level presentation consistent.
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
                "mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 text-rg-ink sm:px-6 lg:px-8",
                className,
            )}
        >
            {(eyebrow || title || description || actions) && (
                <header className="mb-6 rounded-3xl border border-rg-folder bg-rg-paper-strong/90 p-6 shadow-xl">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            {eyebrow && (
                                <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.22em] text-rg-accent">
                                    {eyebrow}
                                </p>
                            )}

                            {title && (
                                <h1 className="text-4xl font-black leading-none tracking-[-0.06em] text-rg-ink sm:text-5xl lg:text-6xl">
                                    {title}
                                </h1>
                            )}

                            {description && (
                                <p className="mt-4 max-w-2xl text-base leading-7 text-rg-muted">
                                    {description}
                                </p>
                            )}
                        </div>

                        {actions && (
                            <div className="flex flex-wrap gap-3">
                                {actions}
                            </div>
                        )}
                    </div>
                </header>
            )}

            <div className="flex-1">{children}</div>
        </main>
    );
}
