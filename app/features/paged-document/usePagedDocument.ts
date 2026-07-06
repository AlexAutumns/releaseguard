import { useCallback, useEffect, useRef, useState } from "react";

import type {
    PagedDocumentController,
    PagedDocumentDirection,
    PagedDocumentPage,
    PagedDocumentPhase,
    UsePagedDocumentInput,
} from "./paged-document-types";

/**
 * Internal page-navigation state owned by the hook.
 *
 * This remains separate from consumer page data so document-specific state
 * cannot leak into the shared navigation lifecycle.
 */
interface PagedDocumentState {
    currentPageId: string | null;
    pendingPageId: string | null;
    direction: PagedDocumentDirection | null;
    phase: PagedDocumentPhase;
}

/**
 * Creates an idle page state for the supplied current page.
 */
function createIdleState(currentPageId: string | null): PagedDocumentState {
    return {
        currentPageId,
        pendingPageId: null,
        direction: null,
        phase: "idle",
    };
}

/**
 * Validates the only invariants required by the shared page contract.
 *
 * Blank and duplicate IDs are programmer errors because stable page identity is
 * the basis of every navigation operation performed by this hook.
 */
function validatePageIds<TPage extends PagedDocumentPage>(
    pages: readonly TPage[],
): void {
    const seenPageIds = new Set<string>();

    for (const page of pages) {
        if (page.id.trim().length === 0) {
            throw new Error(
                "Paged document pages must use non-empty page IDs.",
            );
        }

        if (seenPageIds.has(page.id)) {
            throw new Error(
                `Paged document page ID "${page.id}" is duplicated.`,
            );
        }

        seenPageIds.add(page.id);
    }
}

/**
 * Resolves a usable current page ID without inventing consumer-specific rules.
 *
 * When the requested/current page no longer exists, the first available page
 * is used. An empty page list resolves to `null`.
 */
function resolveCurrentPageId<TPage extends PagedDocumentPage>(
    pages: readonly TPage[],
    pageId: string | null | undefined,
): string | null {
    if (pageId && pages.some((page) => page.id === pageId)) {
        return pageId;
    }

    return pages[0]?.id ?? null;
}

/**
 * Creates a requested page transition from the latest React state.
 *
 * Functional state updates are important here: repeated bookmark/button input
 * in the same render frame sees the latest transition phase, so only the first
 * valid request can start a page change.
 */
function requestPageChange<TPage extends PagedDocumentPage>(
    state: PagedDocumentState,
    pages: readonly TPage[],
    requestedPageId: string,
): PagedDocumentState {
    if (state.phase !== "idle") {
        return state;
    }

    const currentPageId = resolveCurrentPageId(pages, state.currentPageId);
    const currentPageIndex = pages.findIndex(
        (page) => page.id === currentPageId,
    );
    const requestedPageIndex = pages.findIndex(
        (page) => page.id === requestedPageId,
    );

    if (
        currentPageIndex < 0 ||
        requestedPageIndex < 0 ||
        currentPageId === requestedPageId
    ) {
        return state.currentPageId === currentPageId
            ? state
            : createIdleState(currentPageId);
    }

    return {
        currentPageId,
        pendingPageId: requestedPageId,
        direction:
            requestedPageIndex > currentPageIndex ? "forward" : "backward",
        phase: "leaving",
    };
}

/**
 * Manages stable-ID page navigation through an explicit
 * `idle -> leaving -> entering -> idle` lifecycle.
 *
 * Page requests do not immediately replace the logical current page. The
 * consumer first renders its outgoing state, then calls `commitPageChange()`
 * at the physical swap point. After the destination has settled, the consumer
 * calls `finishPageChange()`.
 *
 * The hook deliberately does not own animation timing, CSS, focus, scroll,
 * mounting strategy, gameplay state, or document-specific page metadata.
 */
export function usePagedDocument<TPage extends PagedDocumentPage>({
    pages,
    initialPageId,
}: UsePagedDocumentInput<TPage>): PagedDocumentController<TPage> {
    validatePageIds(pages);

    // The core reacts to page identity/order changes, not page object identity.
    const pageListKey = JSON.stringify(pages.map((page) => page.id));
    const previousPageListKeyRef = useRef(pageListKey);

    const [state, setState] = useState<PagedDocumentState>(() =>
        createIdleState(resolveCurrentPageId(pages, initialPageId)),
    );

    const resolvedCurrentPageId = resolveCurrentPageId(
        pages,
        state.currentPageId,
    );
    const currentPageIndex = pages.findIndex(
        (page) => page.id === resolvedCurrentPageId,
    );
    const currentPage = pages.find((page) => page.id === resolvedCurrentPageId);
    const pendingPage = state.pendingPageId
        ? pages.find((page) => page.id === state.pendingPageId)
        : undefined;
    const isChangingPage = state.phase !== "idle";

    useEffect(() => {
        if (previousPageListKeyRef.current === pageListKey) {
            return;
        }

        previousPageListKeyRef.current = pageListKey;

        setState((currentState) =>
            createIdleState(
                resolveCurrentPageId(pages, currentState.currentPageId),
            ),
        );
    }, [pageListKey, pages]);

    const requestPage = useCallback(
        (pageId: string) => {
            setState((currentState) =>
                requestPageChange(currentState, pages, pageId),
            );
        },
        [pages],
    );

    const requestPreviousPage = useCallback(() => {
        setState((currentState) => {
            const currentPageId = resolveCurrentPageId(
                pages,
                currentState.currentPageId,
            );
            const currentIndex = pages.findIndex(
                (page) => page.id === currentPageId,
            );
            const previousPageId = pages[currentIndex - 1]?.id;

            if (!previousPageId) {
                return currentState.currentPageId === currentPageId
                    ? currentState
                    : createIdleState(currentPageId);
            }

            return requestPageChange(currentState, pages, previousPageId);
        });
    }, [pages]);

    const requestNextPage = useCallback(() => {
        setState((currentState) => {
            const currentPageId = resolveCurrentPageId(
                pages,
                currentState.currentPageId,
            );
            const currentIndex = pages.findIndex(
                (page) => page.id === currentPageId,
            );
            const nextPageId = pages[currentIndex + 1]?.id;

            if (!nextPageId) {
                return currentState.currentPageId === currentPageId
                    ? currentState
                    : createIdleState(currentPageId);
            }

            return requestPageChange(currentState, pages, nextPageId);
        });
    }, [pages]);

    const commitPageChange = useCallback(() => {
        setState((currentState) => {
            if (
                currentState.phase !== "leaving" ||
                !currentState.pendingPageId ||
                !pages.some((page) => page.id === currentState.pendingPageId)
            ) {
                return currentState;
            }

            return {
                currentPageId: currentState.pendingPageId,
                pendingPageId: null,
                direction: currentState.direction,
                phase: "entering",
            };
        });
    }, [pages]);

    const finishPageChange = useCallback(() => {
        setState((currentState) => {
            if (currentState.phase !== "entering") {
                return currentState;
            }

            return createIdleState(currentState.currentPageId);
        });
    }, []);

    const cancelPageChange = useCallback(() => {
        setState((currentState) => {
            const currentPageId = resolveCurrentPageId(
                pages,
                currentState.currentPageId,
            );

            if (
                currentState.phase === "idle" &&
                currentState.currentPageId === currentPageId &&
                currentState.pendingPageId === null &&
                currentState.direction === null
            ) {
                return currentState;
            }

            return createIdleState(currentPageId);
        });
    }, [pages]);

    return {
        currentPage,
        pendingPage,
        currentPageId: resolvedCurrentPageId,
        pendingPageId: state.pendingPageId,
        currentPageIndex,
        currentPagePosition: currentPageIndex >= 0 ? currentPageIndex + 1 : 0,
        pageCount: pages.length,
        direction: state.direction,
        phase: state.phase,
        canGoPrevious: !isChangingPage && currentPageIndex > 0,
        canGoNext:
            !isChangingPage &&
            currentPageIndex >= 0 &&
            currentPageIndex < pages.length - 1,
        isChangingPage,
        requestPreviousPage,
        requestNextPage,
        requestPage,
        commitPageChange,
        finishPageChange,
        cancelPageChange,
    };
}
