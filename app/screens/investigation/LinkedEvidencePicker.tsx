import { Badge } from "../../components/ui/Badge";
import type { LinkableEvidenceItem } from "./useInvestigationController";

export interface LinkedEvidencePickerProps {
    items: LinkableEvidenceItem[];
    onToggleEvidence: (evidenceId: string) => void;
}

/**
 * Evidence support selector used by the New Finding casework tab.
 *
 * Build 001F-A supports individual evidence selection. Build 001F-B will add
 * Evidence Threads above these individual evidence choices.
 */
export function LinkedEvidencePicker({
    items,
    onToggleEvidence,
}: LinkedEvidencePickerProps) {
    const pinnedItems = items.filter((item) => item.isPinned);
    const reviewedItems = items.filter(
        (item) => item.isInspected && !item.isPinned,
    );

    if (items.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-rg-border-soft bg-rg-surface/65 p-4">
                <p className="text-sm font-bold text-rg-text">
                    No reviewed evidence yet.
                </p>

                <p className="mt-1 text-xs leading-5 text-rg-muted">
                    Inspect evidence from the file drawer first. Reviewed and
                    pinned evidence will appear here as possible support.
                </p>
            </div>
        );
    }

    return (
        <div className="grid gap-3">
            <EvidenceSupportGroup
                emptyMessage="Pinned evidence will appear here."
                items={pinnedItems}
                label="Pinned Evidence"
                onToggleEvidence={onToggleEvidence}
            />

            <EvidenceSupportGroup
                emptyMessage="Reviewed but unpinned evidence will appear here."
                items={reviewedItems}
                label="Reviewed Evidence"
                onToggleEvidence={onToggleEvidence}
            />
        </div>
    );
}

interface EvidenceSupportGroupProps {
    emptyMessage: string;
    items: LinkableEvidenceItem[];
    label: string;
    onToggleEvidence: (evidenceId: string) => void;
}

/**
 * One evidence support section.
 */
function EvidenceSupportGroup({
    emptyMessage,
    items,
    label,
    onToggleEvidence,
}: EvidenceSupportGroupProps) {
    return (
        <section className="rounded-2xl border border-rg-border-soft bg-rg-surface/55 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-rg-muted">
                    {label}
                </p>

                <Badge tone="neutral">{items.length}</Badge>
            </div>

            {items.length > 0 ? (
                <div className="grid gap-2">
                    {items.map((item) => (
                        <button
                            className="rounded-xl border border-rg-border-soft bg-rg-surface-raised p-3 text-left transition hover:border-rg-amber/70 hover:bg-rg-surface-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rg-amber"
                            key={item.evidenceCard.id}
                            onClick={() =>
                                onToggleEvidence(item.evidenceCard.id)
                            }
                            type="button"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="line-clamp-2 text-sm font-bold leading-5 text-rg-text">
                                        {item.evidenceCard.title}
                                    </p>

                                    <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-rg-muted">
                                        {item.evidenceCard.source}
                                    </p>
                                </div>

                                <Badge
                                    tone={
                                        item.isLinkedToDraft
                                            ? "success"
                                            : "neutral"
                                    }
                                >
                                    {item.isLinkedToDraft ? "Linked" : "Link"}
                                </Badge>
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <p className="rounded-xl border border-dashed border-rg-border-soft bg-rg-surface/45 p-3 text-xs leading-5 text-rg-muted">
                    {emptyMessage}
                </p>
            )}
        </section>
    );
}