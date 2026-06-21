import type {
    InvestigationToolDefinition,
    InvestigationToolId,
} from "./tool-types";

/**
 * Ordered catalog of board tools shown in the investigation tool rack.
 *
 * Inspect and Pin are excluded because they are direct evidence actions, not
 * global board modes.
 */
export const investigationToolCatalog: InvestigationToolDefinition[] = [
    {
        id: "select",
        icon: "⌖",
        label: "Select",
        description: "Select pinned evidence cards and inspect the board.",
        isMvpEnabled: true,
    },
    {
        id: "connect",
        icon: "╱",
        label: "Connect",
        description:
            "Create and cut colored Evidence Threads between pinned clues.",
        isMvpEnabled: true,
    },
    {
        id: "arrange",
        icon: "✥",
        label: "Arrange",
        description:
            "Reposition pinned clues on the board. Planned for a later build.",
        isMvpEnabled: false,
    },
    {
        id: "pan",
        icon: "✣",
        label: "Pan",
        description: "Move around a larger board. Planned for a later build.",
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
