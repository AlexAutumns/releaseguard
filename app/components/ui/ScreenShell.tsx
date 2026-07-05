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
 * Shared route shell for non-gameplay screens.
 *
 * The shell frames route content with a compact case-register header above a
 * physical desk surface. Active investigation gameplay intentionally keeps its
 * dedicated workspace shell because it uses a different spatial interaction
 * model.
 */
export function ScreenShell({
    eyebrow,
    title,
    description,
    actions,
    children,
    className,
}: ScreenShellProps) {
    const hasHeader = Boolean(eyebrow || title || description || actions);

    return (
        <main
            className={cn(
                "mx-auto flex min-h-screen w-full max-w-420 flex-col px-3 py-4 text-rg-text sm:px-4 lg:px-6",
                className,
            )}
        >
            {hasHeader && (
                <header className="rg-screen-register mb-4 px-4 py-3 sm:px-5 sm:py-4">
                    <div className="relative z-10">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rg-border/65 pb-2.5">
                            {eyebrow ? (
                                <p className="rg-technical-label text-rg-amber">
                                    {eyebrow}
                                </p>
                            ) : (
                                <span aria-hidden="true" />
                            )}

                            {actions && (
                                <div className="flex flex-wrap items-center gap-2">
                                    {actions}
                                </div>
                            )}
                        </div>

                        {(title || description) && (
                            <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
                                {title && (
                                    <h1 className="rg-display-title text-[clamp(2.35rem,3.2vw,3.7rem)] text-rg-text">
                                        {title}
                                    </h1>
                                )}

                                {description && (
                                    <p className="rg-body-copy max-w-3xl text-sm text-rg-muted sm:text-base lg:pb-1 lg:text-right">
                                        {description}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </header>
            )}

            <div className="rg-desk-surface rg-wood-texture flex-1 border border-rg-wood-light/35 bg-rg-wood p-3 sm:p-4 lg:p-5">
                <div className="relative z-10 min-h-full">{children}</div>
            </div>
        </main>
    );
}
