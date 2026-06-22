import { Badge } from "../../components/ui/Badge";
import type { EvidenceThreadColorId } from "../../features/gameplay/board/board-state";
import { cn } from "../../lib/cn";
import { threadColorVisuals } from "./thread-style";
import type { LinkableThreadItem } from "./useInvestigationController";

export interface LinkedThreadPickerProps {
    items: LinkableThreadItem[];
    onToggleThread: (threadId: EvidenceThreadColorId) => void;
}

/**
 * Lets the player attach a whole Evidence Thread to the current finding.
 *
 * This makes Connect mode matter in the casework loop without requiring the
 * player to manually reselect every evidence card inside the thread.
 */
export function LinkedThreadPicker({
    items,
    onToggleThread,
}: LinkedThreadPickerProps) {
    if (items.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-rg-border-soft bg-rg-surface/45 p-3">
                <p className="text-sm font-bold text-rg-text">
                    No evidence threads yet.
                </p>

                <p className="mt-1 text-xs leading-5 text-rg-muted">
                    Use Connect mode on the board to create a colored thread
                    between pinned evidence cards. Linked threads will appear
                    here as support.
                </p>
            </div>
        );
    }

    return (
        <section className="rounded-2xl border border-rg-border-soft bg-rg-surface/55 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                    <p className="font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-rg-muted">
                        Evidence Threads
                    </p>

                    <p className="mt-1 text-xs leading-5 text-rg-muted">
                        Link a whole colored board thread as support.
                    </p>
                </div>

                <Badge tone="neutral">{items.length}</Badge>
            </div>

            <div className="grid gap-2">
                {items.map((item) => {
                    const visual = threadColorVisuals[item.threadId];

                    return (
                        <button
                            className={cn(
                                "rounded-xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rg-amber",
                                item.isLinkedToDraft
                                    ? "border-rg-amber bg-rg-amber text-rg-night"
                                    : "border-rg-border-soft bg-rg-surface-raised text-rg-text hover:border-rg-amber/70 hover:bg-rg-surface-soft",
                            )}
                            key={item.threadId}
                            onClick={() => onToggleThread(item.threadId)}
                            type="button"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span
                                            aria-hidden="true"
                                            className="h-3 w-3 rounded-full border border-black/30"
                                            style={{
                                                backgroundColor: visual.stroke,
                                            }}
                                        />

                                        <p className="text-sm font-bold leading-5">
                                            {item.label} Thread
                                        </p>
                                    </div>

                                    <p
                                        className={cn(
                                            "mt-1 text-xs leading-5",
                                            item.isLinkedToDraft
                                                ? "text-rg-night/75"
                                                : "text-rg-muted",
                                        )}
                                    >
                                        {item.segmentCount} segment
                                        {item.segmentCount === 1
                                            ? ""
                                            : "s"} · {item.evidenceCards.length}{" "}
                                        evidence card
                                        {item.evidenceCards.length === 1
                                            ? ""
                                            : "s"}
                                    </p>

                                    <p
                                        className={cn(
                                            "mt-1 line-clamp-2 text-xs leading-5",
                                            item.isLinkedToDraft
                                                ? "text-rg-night/70"
                                                : "text-rg-muted",
                                        )}
                                    >
                                        {item.evidenceCards
                                            .map(
                                                (evidenceCard) =>
                                                    evidenceCard.title,
                                            )
                                            .join(" · ")}
                                    </p>
                                </div>

                                <Badge
                                    tone={
                                        item.isLinkedToDraft
                                            ? "warning"
                                            : "neutral"
                                    }
                                >
                                    {item.isLinkedToDraft ? "Linked" : "Link"}
                                </Badge>
                            </div>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
