import type { EvidenceThreadColorId } from "../board/board-state";

/**
 * Connect tool sub-mode.
 *
 * String creates colored thread segments. Scissors cuts existing segments.
 */
export type ConnectToolMode = "string" | "scissors";

/**
 * One player-facing Evidence Thread color option.
 */
export interface EvidenceThreadColorDefinition {
    id: EvidenceThreadColorId;
    label: string;
    description: string;
}

/**
 * Fixed Evidence Thread color catalog.
 */
export const evidenceThreadColorCatalog: EvidenceThreadColorDefinition[] = [
    {
        id: "red",
        label: "Red",
        description: "Primary risk chain.",
    },
    {
        id: "blue",
        label: "Blue",
        description: "Secondary evidence chain.",
    },
    {
        id: "green",
        label: "Green",
        description: "Supporting context chain.",
    },
    {
        id: "amber",
        label: "Amber",
        description: "Unclear or cautionary chain.",
    },
    {
        id: "violet",
        label: "Violet",
        description: "Alternative hypothesis chain.",
    },
];

/**
 * UI interaction state for the Connect tool.
 *
 * This is deliberately outside board undo history. Undo/redo should affect
 * physical board changes, not temporary toolbar preferences or pending anchors.
 */
export interface ConnectInteractionState {
    activeThreadId: EvidenceThreadColorId;
    activeMode: ConnectToolMode;
    pendingAnchorPinnedEvidenceId: string | null;
}

/**
 * Creates the initial Connect tool state.
 */
export function createInitialConnectInteractionState(): ConnectInteractionState {
    return {
        activeThreadId: "red",
        activeMode: "string",
        pendingAnchorPinnedEvidenceId: null,
    };
}
