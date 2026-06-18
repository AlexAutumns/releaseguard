import type {
    InvestigationToolDefinition,
    InvestigationToolId,
} from "./tool-types";

/**
 * Ordered catalog of tools shown in the investigation tool rack.
 *
 * Tool metadata lives here so the UI can render from one source of truth instead
 * of hard-coding toolbar buttons in the screen.
 */
export const investigationToolCatalog: InvestigationToolDefinition[] = [
    {
        id: "select",
        icon: "⌖",
        label: "Select",
        description: "Click pinned board cards to select them.",
        isMvpEnabled: true,
    },
    {
        id: "inspect",
        icon: "⌕",
        label: "Inspect",
        description:
            "Click evidence files or pinned cards to open the inspection modal.",
        isMvpEnabled: true,
    },
    {
        id: "pin",
        icon: "◇",
        label: "Pin",
        description:
            "Click inspected cabinet files to pin them. Uninspected files open inspection first.",
        isMvpEnabled: true,
    },
    {
        id: "connect",
        icon: "⛓",
        label: "Connect",
        description: "Connect two pinned clues.",
        isMvpEnabled: false,
    },
    {
        id: "move",
        icon: "✥",
        label: "Move",
        description: "Move pinned clues around the board.",
        isMvpEnabled: false,
    },
];

/**
 * Finds one investigation tool by ID.
 */
export function getInvestigationToolById(
    toolId: InvestigationToolId,
): InvestigationToolDefinition | undefined {
    return investigationToolCatalog.find((tool) => tool.id === toolId);
}
