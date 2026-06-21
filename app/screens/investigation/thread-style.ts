import type { EvidenceThreadColorId } from "../../features/gameplay/board/board-state";

/**
 * Visual styling metadata for fixed Evidence Thread colors.
 *
 * Kept separate from gameplay state so board rules stay UI-agnostic.
 */
export interface ThreadColorVisual {
    stroke: string;
    softBackgroundClass: string;
    activeBackgroundClass: string;
    borderClass: string;
    anchorRingClass: string;
}

/**
 * UI color styles for Evidence Threads.
 *
 * These are intentionally static strings so Tailwind can see the class names.
 */
export const threadColorVisuals: Record<
    EvidenceThreadColorId,
    ThreadColorVisual
> = {
    red: {
        stroke: "#ef4444",
        softBackgroundClass: "bg-red-500/12 text-red-100",
        activeBackgroundClass: "bg-red-500 text-rg-night",
        borderClass: "border-red-400/70",
        anchorRingClass: "ring-red-400/80",
    },
    blue: {
        stroke: "#60a5fa",
        softBackgroundClass: "bg-blue-500/12 text-blue-100",
        activeBackgroundClass: "bg-blue-400 text-rg-night",
        borderClass: "border-blue-300/70",
        anchorRingClass: "ring-blue-300/80",
    },
    green: {
        stroke: "#4ade80",
        softBackgroundClass: "bg-green-500/12 text-green-100",
        activeBackgroundClass: "bg-green-400 text-rg-night",
        borderClass: "border-green-300/70",
        anchorRingClass: "ring-green-300/80",
    },
    amber: {
        stroke: "#f59e0b",
        softBackgroundClass: "bg-amber-500/12 text-amber-100",
        activeBackgroundClass: "bg-amber-400 text-rg-night",
        borderClass: "border-amber-300/70",
        anchorRingClass: "ring-amber-300/80",
    },
    violet: {
        stroke: "#a78bfa",
        softBackgroundClass: "bg-violet-500/12 text-violet-100",
        activeBackgroundClass: "bg-violet-400 text-rg-night",
        borderClass: "border-violet-300/70",
        anchorRingClass: "ring-violet-300/80",
    },
};

/**
 * Returns the SVG stroke color for an Evidence Thread.
 */
export function getThreadStrokeColor(threadId: EvidenceThreadColorId): string {
    return threadColorVisuals[threadId].stroke;
}
