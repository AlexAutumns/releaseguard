/**
 * Canonical investigation tool IDs.
 *
 * The gameplay reducer, toolbar UI, and future keyboard shortcuts should all
 * use these IDs instead of each screen inventing its own tool strings.
 */
export type InvestigationToolId =
    | "select"
    | "inspect"
    | "pin"
    | "connect"
    | "move";

/**
 * Display metadata for one investigation tool.
 *
 * This is UI metadata, not gameplay state. The active gameplay state should
 * store only the tool ID.
 */
export interface InvestigationToolDefinition {
    id: InvestigationToolId;
    icon: string;
    label: string;
    description: string;
    isMvpEnabled: boolean;
}
