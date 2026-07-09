import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

import type { EvidenceCardDefinition } from "../../features/content/content-types";
import type { FiledFinding } from "../../features/gameplay/findings/finding-state";
import type { FindingTypeDefinition } from "../../features/gameplay/findings/finding-types";
import { threadColorVisuals } from "./thread-style";
import type { ThreadSupportItem } from "./useInvestigationController";

const filedFindingEraseDurationMs = 220;

export interface FiledFindingCardProps {
    filedFinding: FiledFinding;
    findingType?: FindingTypeDefinition;
    linkedEvidenceCards: EvidenceCardDefinition[];
    linkedThreadItems: ThreadSupportItem[];
    onRemove: () => void;
    sequenceNumber: number;
}

/**
 * One filed case record in the Casework Notepad ledger.
 *
 * The left gutter visually owns the record number and ledger bracket while the
 * content column stays aligned with the New Finding form. Removing a record
 * delegates to the existing controller after a short presentation-only erase
 * pass in full-motion mode; reduced motion removes the record immediately.
 */
export function FiledFindingCard({
    filedFinding,
    findingType,
    linkedEvidenceCards,
    linkedThreadItems,
    onRemove,
    sequenceNumber,
}: FiledFindingCardProps) {
    const [isErasing, setIsErasing] = useState(false);
    const eraseTimeoutRef = useRef<number | null>(null);
    const filingNumber = String(sequenceNumber).padStart(2, "0");

    /**
     * Clears the local erase timer if the filed record leaves the page before
     * the presentation finishes.
     */
    useEffect(() => {
        return () => {
            if (eraseTimeoutRef.current !== null) {
                window.clearTimeout(eraseTimeoutRef.current);
            }
        };
    }, []);

    /**
     * Starts the local ink-lift presentation before delegating removal.
     *
     * This state is presentation-only and never enters the attempt aggregate or
     * persisted finding data. Explicit reduced motion bypasses the delay so the
     * domain action does not depend on animation timing.
     */
    const handleErase = () => {
        if (isErasing) {
            return;
        }

        if (document.documentElement.dataset.rgMotion === "reduced") {
            onRemove();
            return;
        }

        setIsErasing(true);

        eraseTimeoutRef.current = window.setTimeout(() => {
            eraseTimeoutRef.current = null;
            onRemove();
        }, filedFindingEraseDurationMs);
    };

    return (
        <article
            aria-busy={isErasing}
            className="rg-casework-filed-record grid grid-cols-[3.25rem_minmax(0,1fr)] gap-4"
            data-erasing={isErasing ? "true" : "false"}
            style={
                {
                    "--rg-filed-erase-duration": `${filedFindingEraseDurationMs}ms`,
                } as CSSProperties
            }
        >
            <aside aria-hidden="true" className="rg-casework-filed-gutter">
                <span className="rg-casework-filed-number">{filingNumber}</span>
            </aside>

            <div className="rg-casework-filed-body min-w-0 py-6">
                <header className="rg-casework-filed-header flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="font-mono text-[0.58rem] font-extrabold uppercase tracking-[0.1em] text-rg-paper-ink/65">
                            Filed Finding
                        </p>

                        <h4 className="mt-1 font-case text-base font-bold leading-5 text-rg-paper-ink">
                            {findingType?.label ?? "Unknown finding stamp"}
                        </h4>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                        <span className="rg-casework-filed-code">
                            {findingType?.shortLabel ??
                                findingType?.category ??
                                "Unknown"}
                        </span>

                        <span
                            className="rg-casework-filed-severity"
                            data-severity={filedFinding.severity}
                        >
                            {filedFinding.severity}
                        </span>

                        <button
                            aria-label={`Erase filed finding ${filingNumber}`}
                            className="rg-casework-filed-remove"
                            disabled={isErasing}
                            onClick={handleErase}
                            title="Erase this filed finding"
                            type="button"
                        >
                            <Eraser
                                aria-hidden="true"
                                className="h-4 w-4"
                                strokeWidth={2}
                            />
                        </button>
                    </div>
                </header>

                <section className="rg-casework-filed-section mt-5">
                    <p className="font-case text-[0.68rem] font-bold uppercase tracking-[0.08em] text-rg-paper-ink/85">
                        Direct Evidence Support
                    </p>

                    {linkedEvidenceCards.length > 0 ? (
                        <ul className="mt-2 grid gap-1.5">
                            {linkedEvidenceCards.map((evidenceCard, index) => (
                                <li
                                    className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2 font-case text-xs font-bold leading-5 text-rg-paper-ink/82"
                                    key={evidenceCard.id}
                                >
                                    <span className="font-mono text-[0.55rem] font-extrabold text-rg-paper-ink/55">
                                        {String(index + 1).padStart(2, "0")}
                                    </span>

                                    <span>{evidenceCard.title}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-2 font-case text-xs font-bold leading-5 text-rg-paper-ink/62">
                            No direct evidence linked.
                        </p>
                    )}
                </section>

                {linkedThreadItems.length > 0 && (
                    <section className="rg-casework-filed-section mt-5">
                        <p className="font-case text-[0.68rem] font-bold uppercase tracking-[0.08em] text-rg-paper-ink/85">
                            Evidence Thread Support
                        </p>

                        <div className="mt-2 grid gap-3">
                            {linkedThreadItems.map((threadItem) => {
                                const visual =
                                    threadColorVisuals[threadItem.threadId];

                                return (
                                    <div
                                        className="rg-casework-filed-thread-line"
                                        key={threadItem.threadId}
                                    >
                                        <div className="flex min-w-0 items-center gap-2.5">
                                            <span
                                                aria-hidden="true"
                                                className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/35"
                                                style={{
                                                    backgroundColor:
                                                        visual.stroke,
                                                }}
                                            />

                                            <span className="truncate font-case text-sm font-bold text-rg-paper-ink">
                                                {threadItem.label} Thread
                                            </span>

                                            <span className="ml-auto shrink-0 font-mono text-[0.56rem] font-extrabold uppercase tracking-[0.07em] text-rg-paper-ink/68">
                                                {threadItem.segmentCount} seg /{" "}
                                                {
                                                    threadItem.evidenceCards
                                                        .length
                                                }{" "}
                                                file
                                                {threadItem.evidenceCards
                                                    .length === 1
                                                    ? ""
                                                    : "s"}
                                            </span>
                                        </div>

                                        <p className="mt-1.5 font-case text-xs font-bold leading-5 text-rg-paper-ink/76">
                                            {threadItem.evidenceCards
                                                .map(
                                                    (evidenceCard) =>
                                                        evidenceCard.title,
                                                )
                                                .join(" · ")}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {filedFinding.optionalNote && (
                    <section className="rg-casework-filed-section mt-5">
                        <p className="font-case text-[0.68rem] font-bold uppercase tracking-[0.08em] text-rg-paper-ink/85">
                            Investigator Note
                        </p>

                        <p className="rg-handwriting-note mt-2 text-rg-hand-ink">
                            {filedFinding.optionalNote}
                        </p>
                    </section>
                )}
            </div>
        </article>
    );
}
