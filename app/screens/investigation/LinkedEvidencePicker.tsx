import type { LinkableEvidenceItem } from "./useInvestigationController";

export interface LinkedEvidencePickerProps {
    items: LinkableEvidenceItem[];
    onToggleEvidence: (evidenceId: string) => void;
}

/**
 * Direct-evidence filing checklist used by the New Finding case form.
 *
 * Selection remains controlled by the existing draft finding state. Native
 * checkboxes expose the filing action semantically while the Notepad material
 * supplies the physical check-mark presentation.
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
            <div className="rg-casework-inline-note px-2 py-2.5">
                <p className="font-case text-sm font-bold text-rg-paper-ink">
                    No reviewed evidence yet.
                </p>

                <p className="mt-1 font-case text-xs font-bold leading-5 text-rg-paper-ink/75">
                    Inspect a file from the drawer first. Reviewed and pinned
                    evidence will appear here as possible support.
                </p>
            </div>
        );
    }

    return (
        <div className="grid gap-4">
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
 * One direct-evidence register inside the filing checklist.
 */
function EvidenceSupportGroup({
    emptyMessage,
    items,
    label,
    onToggleEvidence,
}: EvidenceSupportGroupProps) {
    return (
        <section className="border-t-2 border-rg-folder-dark/35 pt-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="font-case text-[0.68rem] font-bold uppercase tracking-[0.08em] text-rg-paper-ink/85">
                    {label}
                </p>

                <span className="font-mono text-[0.56rem] font-extrabold uppercase tracking-[0.08em] text-rg-paper-ink/70">
                    {items.length} file{items.length === 1 ? "" : "s"}
                </span>
            </div>

            {items.length > 0 ? (
                <div className="grid gap-1.5">
                    {items.map((item) => (
                        <label
                            className="rg-casework-check-row relative grid cursor-pointer grid-cols-[1.4rem_minmax(0,1fr)] items-start gap-3 py-2.5 pl-1 pr-2"
                            data-checked={
                                item.isLinkedToDraft ? "true" : "false"
                            }
                            key={item.evidenceCard.id}
                        >
                            <input
                                checked={item.isLinkedToDraft}
                                className="rg-casework-check-input sr-only"
                                onChange={() =>
                                    onToggleEvidence(item.evidenceCard.id)
                                }
                                type="checkbox"
                            />

                            <span
                                aria-hidden="true"
                                className="rg-casework-check-mark mt-0.5"
                            />

                            <span className="min-w-0">
                                <span className="rg-casework-support-title line-clamp-2 block font-case text-sm font-bold leading-5 text-rg-paper-ink">
                                    {item.evidenceCard.title}
                                </span>

                                <span className="mt-0.5 block truncate font-mono text-[0.62rem] font-bold uppercase tracking-[0.09em] text-rg-paper-ink/65">
                                    {item.evidenceCard.source}
                                </span>
                            </span>
                        </label>
                    ))}
                </div>
            ) : (
                <p className="rg-casework-inline-note px-2 py-2.5 font-case text-xs font-bold leading-5 text-rg-paper-ink/70">
                    {emptyMessage}
                </p>
            )}
        </section>
    );
}
