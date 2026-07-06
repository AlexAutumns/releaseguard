import {
    useCallback,
    useEffect,
    useRef,
    type AnimationEvent as ReactAnimationEvent,
    type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { PagedDocumentPage } from "../../features/paged-document/paged-document-types";
import { usePagedDocument } from "../../features/paged-document/usePagedDocument";
import { cn, type ClassValue } from "../../lib/cn";
import { Button } from "../ui/Button";

const REPORT_PAGE_PHASE_FAILSAFE_MS = 650;

export interface FiledReportProps<TPage extends PagedDocumentPage> {
    pages: readonly TPage[];
    initialPageId?: string;
    eyebrow: string;
    title: string;
    register?: ReactNode;
    actions?: ReactNode;
    className?: ClassValue;
    getPageLabel: (page: TPage) => string;
    renderPage: (page: TPage) => ReactNode;
}

/**
 * Physical filed-report shell for passive paged documents.
 *
 * The shell owns report navigation, page motion, active-only rendering, and the
 * stable report enclosure. Consumers own page data and page content.
 */
export function FiledReport<TPage extends PagedDocumentPage>({
    pages,
    initialPageId,
    eyebrow,
    title,
    register,
    actions,
    className,
    getPageLabel,
    renderPage,
}: FiledReportProps<TPage>) {
    const pagedDocument = usePagedDocument({ pages, initialPageId });
    const sheetScrollRef = useRef<HTMLDivElement>(null);
    const completedLifecycleKeyRef = useRef<string | null>(null);

    const lifecycleKey = [
        pagedDocument.phase,
        pagedDocument.currentPageId ?? "none",
        pagedDocument.pendingPageId ?? "none",
        pagedDocument.direction ?? "none",
    ].join(":");

    const completeActivePagePhase = useCallback(() => {
        if (pagedDocument.phase === "idle") {
            return;
        }

        if (completedLifecycleKeyRef.current === lifecycleKey) {
            return;
        }

        completedLifecycleKeyRef.current = lifecycleKey;

        if (pagedDocument.phase === "leaving") {
            pagedDocument.commitPageChange();
            return;
        }

        pagedDocument.finishPageChange();
    }, [
        lifecycleKey,
        pagedDocument.commitPageChange,
        pagedDocument.finishPageChange,
        pagedDocument.phase,
    ]);

    useEffect(() => {
        if (pagedDocument.phase === "idle") {
            return;
        }

        const timeoutId = window.setTimeout(
            completeActivePagePhase,
            REPORT_PAGE_PHASE_FAILSAFE_MS,
        );

        return () => window.clearTimeout(timeoutId);
    }, [completeActivePagePhase, pagedDocument.phase]);

    useEffect(() => {
        if (!pagedDocument.currentPageId || !sheetScrollRef.current) {
            return;
        }

        sheetScrollRef.current.scrollTop = 0;
        sheetScrollRef.current.scrollLeft = 0;
    }, [pagedDocument.currentPageId]);

    const handlePageAnimationEnd = (
        event: ReactAnimationEvent<HTMLDivElement>,
    ) => {
        if (event.currentTarget !== event.target) {
            return;
        }

        completeActivePagePhase();
    };

    const currentPage = pagedDocument.currentPage;
    const selectedPageId =
        pagedDocument.pendingPageId ?? pagedDocument.currentPageId;
    const isPageInteractive = !pagedDocument.isChangingPage;

    return (
        <section
            aria-label={`${eyebrow}: ${title}`}
            className={cn(
                "rg-report-file rg-folder-shell rg-folder-shell--wide",
                className,
            )}
        >
            <div aria-hidden="true" className="rg-folder-tab">
                <span className="rg-folder-tab-text">{eyebrow}</span>
            </div>

            <div className="rg-report-file-body rg-folder-body">
                <header className="rg-report-register">
                    <div className="min-w-0">
                        <p className="rg-report-register-label">{eyebrow}</p>
                        <h1 className="rg-report-register-title">{title}</h1>
                    </div>

                    {register ? (
                        <div className="rg-report-register-fields">
                            {register}
                        </div>
                    ) : null}
                </header>

                <div className="rg-report-toolbar">
                    <nav
                        aria-label="Filed report sections"
                        className="rg-report-index"
                    >
                        {pages.map((page, index) => (
                            <button
                                aria-current={
                                    pagedDocument.currentPageId === page.id
                                        ? "page"
                                        : undefined
                                }
                                aria-disabled={pagedDocument.isChangingPage}
                                className="rg-report-index-button"
                                data-selected={
                                    selectedPageId === page.id
                                        ? "true"
                                        : "false"
                                }
                                key={page.id}
                                onClick={() =>
                                    pagedDocument.requestPage(page.id)
                                }
                                type="button"
                            >
                                <span aria-hidden="true">
                                    {String(index + 1).padStart(2, "0")}
                                </span>
                                {getPageLabel(page)}
                            </button>
                        ))}
                    </nav>

                    <nav
                        aria-label="Filed report page movement"
                        className="rg-report-navigation"
                    >
                        <Button
                            disabled={!pagedDocument.canGoPrevious}
                            onClick={pagedDocument.requestPreviousPage}
                            size="sm"
                            variant="ghost"
                        >
                            <ChevronLeft aria-hidden="true" size={16} />
                            Previous
                        </Button>

                        <p aria-live="polite" className="rg-report-page-count">
                            Page {pagedDocument.currentPagePosition} /{" "}
                            {pagedDocument.pageCount}
                        </p>

                        <Button
                            disabled={!pagedDocument.canGoNext}
                            onClick={pagedDocument.requestNextPage}
                            size="sm"
                            variant="ghost"
                        >
                            Next
                            <ChevronRight aria-hidden="true" size={16} />
                        </Button>
                    </nav>
                </div>

                <div
                    className="rg-report-page-stack"
                    data-page-direction={pagedDocument.direction ?? undefined}
                    data-page-phase={pagedDocument.phase}
                >
                    <div
                        aria-busy={pagedDocument.isChangingPage}
                        aria-hidden={!isPageInteractive}
                        className="rg-report-page-stage"
                        data-page-direction={
                            pagedDocument.direction ?? undefined
                        }
                        data-page-phase={pagedDocument.phase}
                        inert={!isPageInteractive}
                        onAnimationEnd={handlePageAnimationEnd}
                    >
                        <div
                            aria-hidden="true"
                            className="rg-report-shadow-sweep"
                        />

                        <article className="rg-report-sheet rg-paper-sheet">
                            <div
                                className="rg-report-sheet-scroll rg-scrollbar-thin"
                                ref={sheetScrollRef}
                            >
                                {currentPage ? (
                                    <div
                                        className="rg-report-page-content"
                                        key={currentPage.id}
                                    >
                                        {renderPage(currentPage)}
                                    </div>
                                ) : (
                                    <div className="rg-report-empty-page">
                                        <p className="rg-report-empty-page-label">
                                            Filed Report
                                        </p>
                                        <h2 className="rg-report-empty-page-title">
                                            No report pages available
                                        </h2>
                                        <p className="rg-report-empty-page-copy">
                                            This document does not currently
                                            contain a page record to display.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </article>
                    </div>
                </div>

                {actions ? (
                    <footer className="rg-report-footer">
                        <div className="rg-report-actions">{actions}</div>
                    </footer>
                ) : null}
            </div>
        </section>
    );
}
