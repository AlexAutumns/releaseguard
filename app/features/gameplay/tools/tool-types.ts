/**
 * Canonical board-mode tool IDs.
 *
 * Evidence actions such as Inspect and Pin are intentionally not board modes.
 * They live directly on evidence files, evidence modals, and pinned cards.
 */
export type InvestigationToolId = "select" | "connect" | "arrange";

/**
 * Display metadata for one investigation board tool.
 *
 * This is UI metadata, not gameplay state. Runtime state should store only the
 * tool ID.
 */
export interface InvestigationToolDefinition {
    id: InvestigationToolId;
    icon: string;
    label: string;
    description: string;
    isMvpEnabled: boolean;
}
