import type { EvidenceThreadColorId } from "../../features/gameplay/board/board-state";
import { threadColorVisuals } from "./thread-style";
import type { LinkableThreadItem } from "./useInvestigationController";

export interface LinkedThreadPickerProps {
    items: LinkableThreadItem[];
    onToggleThread: (threadId: EvidenceThreadColorId) => void;
}

/**
 * Evidence Thread filing checklist used by the New Finding case form.
 *
 * A checked thread still links the live draft thread through the existing
 * controller. Filing later snapshots the support through the existing domain
 * rule; this component changes presentation only.
 */
export function LinkedThreadPicker({
    items,
    onToggleThread,
}: LinkedThreadPickerProps) {
    if (items.length === 0) {
        return (
            <div className="rg-casework-inline-note border-t-2 border-rg-folder-dark/35 px-2 py-2.5">
                <p className="font-case text-sm font-bold text-rg-paper-ink">
                    No Evidence Threads yet.
                </p>

                <p className="mt-1 font-case text-xs font-bold leading-5 text-rg-paper-ink/75">
                    Use Connect on the Board to create a coloured thread between
                    pinned files. Available threads will appear here as support.
                </p>
            </div>
        );
    }

    return (
        <section className="border-t-2 border-rg-folder-dark/35 pt-3">
            <div className="mb-2 flex items-end justify-between gap-4">
                <div className="min-w-0">
                    <p className="font-case text-[0.68rem] font-bold uppercase tracking-[0.08em] text-rg-paper-ink/90">
                        Evidence Threads
                    </p>

                    <p className="mt-1 font-case text-xs font-bold leading-5 text-rg-paper-ink/80">
                        Check a whole Board thread to cite its connected files.
                    </p>
                </div>

                <span className="shrink-0 font-mono text-[0.56rem] font-extrabold uppercase tracking-[0.08em] text-rg-paper-ink/75">
                    {items.length} thread{items.length === 1 ? "" : "s"}
                </span>
            </div>

            <div className="grid gap-1.5">
                {items.map((item) => {
                    const visual = threadColorVisuals[item.threadId];

                    return (
                        <label
                            className="rg-casework-check-row relative grid cursor-pointer grid-cols-[1.4rem_minmax(0,1fr)] items-start gap-3 py-2.5 pl-1 pr-2"
                            data-checked={
                                item.isLinkedToDraft ? "true" : "false"
                            }
                            key={item.threadId}
                        >
                            <input
                                checked={item.isLinkedToDraft}
                                className="rg-casework-check-input sr-only"
                                onChange={() => onToggleThread(item.threadId)}
                                type="checkbox"
                            />

                            <span
                                aria-hidden="true"
                                className="rg-casework-check-mark mt-0.5"
                            />

                            <span className="min-w-0">
                                <span className="flex min-w-0 items-center gap-2.5">
                                    <span
                                        aria-hidden="true"
                                        className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/35"
                                        style={{
                                            backgroundColor: visual.stroke,
                                        }}
                                    />

                                    <span className="rg-casework-support-title truncate font-case text-sm font-bold leading-5 text-rg-paper-ink">
                                        {item.label} Thread
                                    </span>
                                </span>

                                <span className="mt-1 block font-mono text-[0.58rem] font-extrabold uppercase tracking-[0.075em] text-rg-paper-ink/72">
                                    {item.segmentCount} segment
                                    {item.segmentCount === 1 ? "" : "s"} /{" "}
                                    {item.evidenceCards.length} file
                                    {item.evidenceCards.length === 1 ? "" : "s"}
                                </span>

                                <span className="mt-1 line-clamp-2 block font-case text-xs font-bold leading-5 text-rg-paper-ink/78">
                                    {item.evidenceCards
                                        .map(
                                            (evidenceCard) =>
                                                evidenceCard.title,
                                        )
                                        .join(" · ")}
                                </span>
                            </span>
                        </label>
                    );
                })}
            </div>
        </section>
    );
}
