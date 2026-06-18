import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import type { EvidenceCardDefinition } from "../../features/content/content-types";
import type { PinnedEvidence } from "../../features/gameplay/board/board-state";
import type { InvestigationToolId } from "../../features/gameplay/tools/tool-types";
import { cn } from "../../lib/cn";

export interface BoardPinnedEvidenceCardProps {
    activeTool: InvestigationToolId;
    evidenceCard: EvidenceCardDefinition;
    pinnedEvidence: PinnedEvidence;
    isSelected: boolean;
    onActivate: () => void;
    onInspect: () => void;
    onUnpin: () => void;
}

/**
 * Visual representation of one pinned evidence file on the board.
 *
 * The card responds to the active investigation tool:
 * - Select tool selects the card.
 * - Inspect tool opens the evidence modal.
 * - Pin tool reports that the evidence is already pinned.
 */
export function BoardPinnedEvidenceCard({
    activeTool,
    evidenceCard,
    pinnedEvidence,
    isSelected,
    onActivate,
    onInspect,
    onUnpin,
}: BoardPinnedEvidenceCardProps) {
    const activeBadgeLabel =
        activeTool === "inspect"
            ? "inspect"
            : activeTool === "pin"
              ? "pinned"
              : isSelected
                ? "active"
                : "pin";

    return (
        <article
            className={cn(
                "absolute w-56 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-2xl border bg-rg-paper p-3 text-rg-paper-ink shadow-xl shadow-black/35 transition",
                isSelected
                    ? "z-20 border-rg-amber ring-2 ring-rg-amber/70"
                    : "z-10 border-rg-folder-dark/40 hover:border-rg-amber/65",
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
            style={{
                left: `${pinnedEvidence.position.xPercent}%`,
                top: `${pinnedEvidence.position.yPercent}%`,
            }}
            tabIndex={0}
            title={
                activeTool === "inspect"
                    ? "Inspect this pinned evidence."
                    : activeTool === "pin"
                      ? "This evidence is already pinned."
                      : "Select this pinned evidence."
            }
        >
            <div
                aria-hidden="true"
                className="rg-paper-grain pointer-events-none absolute inset-0 rounded-2xl opacity-35"
            />

            <div className="relative z-10">
                <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 text-left">
                        <p className="line-clamp-2 text-sm font-black leading-5 text-rg-paper-ink">
                            {evidenceCard.title}
                        </p>
                        <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-rg-paper-muted">
                            {evidenceCard.source}
                        </p>
                    </div>

                    <Badge tone={isSelected ? "warning" : "neutral"}>
                        {activeBadgeLabel}
                    </Badge>
                </div>

                <p className="line-clamp-3 text-xs leading-5 text-rg-paper-muted">
                    {evidenceCard.body}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                    <Button
                        className="h-8"
                        onClick={(event) => {
                            event.stopPropagation();
                            onInspect();
                        }}
                        size="sm"
                        variant="secondary"
                    >
                        ⌕
                    </Button>

                    <Button
                        className="h-8"
                        onClick={(event) => {
                            event.stopPropagation();
                            onUnpin();
                        }}
                        size="sm"
                        variant="danger"
                    >
                        ×
                    </Button>
                </div>
            </div>
        </article>
    );
}
