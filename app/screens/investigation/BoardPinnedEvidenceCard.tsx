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
 * The remove control is styled as a top-center board pin. The card itself no
 * longer changes tag text based on the active tool; active selection is shown
 * through border/ring state instead.
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
    return (
        <article
            className={cn(
                "absolute w-56 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-2xl border bg-rg-paper p-3 pt-5 text-rg-paper-ink shadow-xl shadow-black/35 transition",
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
                activeTool === "connect"
                    ? "Connect mode will use pinned cards in the next build."
                    : "Select this pinned evidence."
            }
        >
            <button
                aria-label="Remove pinned evidence from board"
                className="absolute left-1/2 top-0 z-20 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-rg-stamp bg-rg-stamp text-sm font-black text-rg-paper shadow-md shadow-black/25 transition hover:bg-rg-paper hover:text-rg-stamp focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rg-amber"
                onClick={(event) => {
                    event.stopPropagation();
                    onUnpin();
                }}
                title="Remove this pin"
                type="button"
            >
                ×
            </button>

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
    );
}
