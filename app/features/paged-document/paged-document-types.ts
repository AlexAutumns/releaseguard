/**
 * Minimum page contract required by the paged-document core.
 *
 * Consumers own all document-specific metadata and page content. The paging
 * core only requires a stable page ID so navigation is not coupled to array
 * indexes that may change when a consumer rebuilds its page list.
 */
export interface PagedDocumentPage {
    id: string;
}

/**
 * Direction of one valid page change.
 *
 * Consumers may use this value to choose their own physical transition. The
 * paged-document core does not prescribe animation distances or materials.
 */
export type PagedDocumentDirection = "backward" | "forward";

/**
 * Logical lifecycle for one page change.
 *
 * `leaving` keeps the current page active until the consumer confirms its
 * outgoing presentation is complete. `entering` starts after the destination
 * page is committed and ends when the consumer confirms the new page settled.
 */
export type PagedDocumentPhase = "idle" | "leaving" | "entering";

/**
 * Inputs required to create one paged-document controller.
 *
 * `initialPageId` is only used when the hook creates its initial state. If it
 * is absent or unavailable, the first page becomes current.
 */
export interface UsePagedDocumentInput<TPage extends PagedDocumentPage> {
    pages: readonly TPage[];
    initialPageId?: string;
}

/**
 * Navigation state and commands for one paged document.
 *
 * The controller owns page-change truth only. Consumers remain responsible for
 * rendering, page residency, interaction locking, focus, scroll, and motion.
 */
export interface PagedDocumentController<TPage extends PagedDocumentPage> {
    currentPage?: TPage;
    pendingPage?: TPage;
    currentPageId: string | null;
    pendingPageId: string | null;
    currentPageIndex: number;
    currentPagePosition: number;
    pageCount: number;
    direction: PagedDocumentDirection | null;
    phase: PagedDocumentPhase;
    canGoPrevious: boolean;
    canGoNext: boolean;
    isChangingPage: boolean;
    requestPreviousPage: () => void;
    requestNextPage: () => void;
    requestPage: (pageId: string) => void;
    commitPageChange: () => void;
    finishPageChange: () => void;
    cancelPageChange: () => void;
}
