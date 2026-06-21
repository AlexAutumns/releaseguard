import type { CSSProperties } from "react";

import { Button } from "../../components/ui/Button";
import type { EvidenceCardDefinition } from "../../features/content/content-types";
import type {
    EvidenceThreadColorId,
    PinnedEvidence,
} from "../../features/gameplay/board/board-state";
import type { InvestigationToolId } from "../../features/gameplay/tools/tool-types";
import { cn } from "../../lib/cn";
import { threadColorVisuals } from "./thread-style";

export interface BoardPinnedEvidenceCardProps {
    activeThreadId: EvidenceThreadColorId;
    activeTool: InvestigationToolId;
    evidenceCard: EvidenceCardDefinition;
    highlightedThreadId: EvidenceThreadColorId | null;
    pinnedEvidence: PinnedEvidence;
    visibleThreadIds: EvidenceThreadColorId[];
    isConnectAnchor: boolean;
    isSelected: boolean;
    onActivate: () => void;
    onInspect: () => void;
    onUnpin: () => void;
}

/**
 * Visual representation of one pinned evidence file on the board.
 *
 * This component is intentionally split into two positioned layers:
 * - card paper/content layer,
 * - pin/endpoint marker overlay layer.
 *
 * That lets the SVG string layer sit visually between card paper and the pin
 * controls without blocking basic card interactions.
 */
export function BoardPinnedEvidenceCard({
    activeThreadId,
    activeTool,
    evidenceCard,
    highlightedThreadId,
    pinnedEvidence,
    visibleThreadIds,
    isConnectAnchor,
    isSelected,
    onActivate,
    onInspect,
    onUnpin,
}: BoardPinnedEvidenceCardProps) {
    const priorityThreadId =
        highlightedThreadId ?? (isConnectAnchor ? activeThreadId : null);
    const priorityThreadVisual = priorityThreadId
        ? threadColorVisuals[priorityThreadId]
        : null;

    const positionStyle: CSSProperties = {
        left: `${pinnedEvidence.position.xPercent}%`,
        top: `${pinnedEvidence.position.yPercent}%`,
    };

    const paperStyle: CSSProperties = {
        ...positionStyle,
    };

    if (priorityThreadVisual) {
        paperStyle.borderColor = priorityThreadVisual.stroke;
        paperStyle.boxShadow = [
            `0 0 0 4px ${priorityThreadVisual.stroke}88`,
            "0 18px 36px rgba(0,0,0,0.36)",
        ].join(", ");
    }

    return (
        <>
            <article
                className={cn(
                    "absolute z-10 w-56 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-2xl border bg-rg-paper p-3 pt-8 text-rg-paper-ink shadow-xl shadow-black/35 transition",
                    priorityThreadVisual
                        ? "z-20"
                        : isSelected
                          ? "border-rg-amber ring-2 ring-rg-amber/70"
                          : "border-rg-folder-dark/40 hover:border-rg-amber/65",
                )}
                onClick={(event) => {
                    event.stopPropagation();
                    onActivate();
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onActivate();
                    }
                }}
                role="button"
                style={paperStyle}
                tabIndex={0}
                title={getPinnedCardTitle({
                    activeTool,
                    isConnectAnchor,
                    isThreadEndpointHighlighted: Boolean(highlightedThreadId),
                })}
            >
                <div
                    aria-hidden="true"
                    className="rg-paper-grain pointer-events-none absolute inset-0 rounded-2xl opacity-35"
                />

                <div className="relative z-10">
                    <div className="mb-2 min-w-0 text-left">
                        <p className="line-clamp-2 text-sm font-black leading-5 text-rg-paper-ink">
                            {evidenceCard.title}
                        </p>

                        <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-rg-paper-muted">
                            {evidenceCard.source}
                        </p>
                    </div>

                    <p className="line-clamp-3 text-xs leading-5 text-rg-paper-muted">
                        {evidenceCard.body}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                        <Button
                            aria-label="Inspect pinned evidence"
                            className="h-8 w-10 px-0"
                            onClick={(event) => {
                                event.stopPropagation();
                                onInspect();
                            }}
                            size="sm"
                            title="Inspect pinned evidence"
                            variant="secondary"
                        >
                            ⌕
                        </Button>
                    </div>
                </div>
            </article>

            <div
                aria-hidden="false"
                className="pointer-events-none absolute z-[30] h-[11.75rem] w-56 -translate-x-1/2 -translate-y-1/2"
                style={positionStyle}
            >
                <button
                    aria-label="Remove pinned evidence from board"
                    className="pointer-events-auto absolute left-1/2 top-0 z-[35] flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-rg-stamp bg-rg-stamp text-sm font-black text-rg-paper shadow-md shadow-black/25 transition hover:-translate-y-[60%] hover:border-rg-amber hover:bg-rg-stamp hover:text-rg-paper hover:shadow-lg hover:shadow-rg-stamp/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rg-amber"
                    onClick={(event) => {
                        event.stopPropagation();
                        onUnpin();
                    }}
                    title="Pull this pin from the board"
                    type="button"
                >
                    ×
                </button>

                {visibleThreadIds.length > 0 && (
                    <div
                        aria-hidden="true"
                        className="absolute right-2 top-2 z-[34] flex max-w-[4.8rem] items-center justify-center gap-1 rounded-full border border-rg-folder-dark/20 bg-rg-paper/90 px-1.5 py-0.5 shadow-sm shadow-black/10"
                        title="Thread endpoints attached to this pinned card."
                    >
                        {visibleThreadIds.slice(0, 5).map((threadId) => (
                            <span
                                className="h-2 w-2 rounded-full border border-black/30"
                                key={threadId}
                                style={{
                                    backgroundColor:
                                        threadColorVisuals[threadId].stroke,
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

interface GetPinnedCardTitleInput {
    activeTool: InvestigationToolId;
    isConnectAnchor: boolean;
    isThreadEndpointHighlighted: boolean;
}

/**
 * Returns helpful hover copy for the current board tool.
 */
function getPinnedCardTitle({
    activeTool,
    isConnectAnchor,
    isThreadEndpointHighlighted,
}: GetPinnedCardTitleInput): string {
    if (isThreadEndpointHighlighted) {
        return "Endpoint of the highlighted evidence thread.";
    }

    if (activeTool === "connect" && isConnectAnchor) {
        return "Current string anchor. Click another pinned card to connect.";
    }

    if (activeTool === "connect") {
        return "Use this pinned card with the Connect tool.";
    }

    return "Select this pinned evidence.";
}
