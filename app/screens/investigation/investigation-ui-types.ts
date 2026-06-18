/**
 * Foldable side panels available in the investigation workspace.
 *
 * This is screen layout state, not gameplay state. It controls how much space
 * the board receives, but it does not affect scoring or ticket progress.
 */
export type InvestigationPanelId = "cabinet" | "casework";

/**
 * Tool identifiers shown in the bottom tool rack.
 *
 * The gameplay reducer will use these later when tool actions become active.
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
 * Icons are currently text symbols to avoid dependency and asset scope creep.
 * They can be replaced with local SVGs later without changing gameplay logic.
 */
export interface InvestigationToolDefinition {
    id: InvestigationToolId;
    icon: string;
    label: string;
    description: string;
}
