import type {
    InvestigationToolDefinition,
    InvestigationToolId,
} from "./tool-types";

/**
 * Ordered catalog of tools shown in the investigation tool rack.
 *
 * Tools that are not enabled yet are still listed so the UI can communicate the
 * intended gameplay model without pretending every action is ready.
 */
export const investigationToolCatalog: InvestigationToolDefinition[] = [
    {
        id: "select",
        icon: "⌖",
        label: "Select",
        description: "Select pinned evidence or board items.",
        isMvpEnabled: true,
    },
    {
        id: "inspect",
        icon: "⌕",
        label: "Inspect",
        description: "Inspect an evidence file before pinning it.",
        isMvpEnabled: false,
    },
    {
        id: "pin",
        icon: "◇",
        label: "Pin",
        description: "Pin evidence onto the board.",
        isMvpEnabled: false,
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
