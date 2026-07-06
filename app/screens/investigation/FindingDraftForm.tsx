import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import type { FindingSeverity } from "../../features/content/content-types";
import type { DraftFindingPatch } from "../../features/gameplay/findings/finding-rules";
import type { DraftFinding } from "../../features/gameplay/findings/finding-state";
import type { FindingTypeId } from "../../features/gameplay/findings/finding-types";
import { cn } from "../../lib/cn";
import { LinkedEvidencePicker } from "./LinkedEvidencePicker";
import type {
    FindingTypeItem,
    LinkableEvidenceItem,
    LinkableThreadItem,
} from "./useInvestigationController";
import type { EvidenceThreadColorId } from "../../features/gameplay/board/board-state";
import { LinkedThreadPicker } from "./LinkedThreadPicker";

const severityOptions: { id: FindingSeverity; label: string }[] = [
    { id: "low", label: "Low" },
    { id: "medium", label: "Medium" },
    { id: "high", label: "High" },
    { id: "critical", label: "Critical" },
];

export interface FindingDraftFormProps {
    canFileFinding: boolean;
    draft: DraftFinding;
    findingTypeItems: FindingTypeItem[];
    linkableEvidenceItems: LinkableEvidenceItem[];
    linkableThreadItems: LinkableThreadItem[];
    onDraftChange: (patch: DraftFindingPatch) => void;
    onFileFinding: () => void;
    onSelectFindingType: (findingTypeId: FindingTypeId) => void;
    onToggleEvidence: (evidenceId: string) => void;
    onToggleThread: (threadId: EvidenceThreadColorId) => void;
}

/**
 * Evidence-first finding form.
 *
 * The player starts by attaching support, then applies a generic finding stamp.
 * This avoids revealing ticket-specific expected findings.
 */
export function FindingDraftForm({
    canFileFinding,
    draft,
    findingTypeItems,
    linkableEvidenceItems,
    linkableThreadItems,
    onDraftChange,
    onFileFinding,
    onSelectFindingType,
    onToggleEvidence,
    onToggleThread,
}: FindingDraftFormProps) {
    const hasEvidenceSupport =
        draft.linkedEvidenceIds.length > 0 || draft.linkedThreadIds.length > 0;
    const hasFindingType = draft.findingTypeId !== null;
    const hasSeverity = draft.severity !== null;

    return (
        <section className="grid gap-4 pb-2">
            <div className="rounded-2xl border border-rg-border-soft bg-rg-surface/65 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-rg-amber">
                            New Finding
                        </p>

                        <h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-rg-text">
                            Build a supported case slip
                        </h3>
                    </div>

                    <Badge tone={canFileFinding ? "success" : "neutral"}>
                        {canFileFinding ? "Ready" : "Draft"}
                    </Badge>
                </div>

                <p className="mt-2 text-xs leading-5 text-rg-muted">
                    Link evidence first, then classify the risk with a generic
                    finding stamp.
                </p>
            </div>

            <FormSection
                helper="Choose direct evidence or link a whole board thread as support."
                required
                title="Evidence Support"
            >
                <div className="grid gap-3">
                    <LinkedEvidencePicker
                        items={linkableEvidenceItems}
                        onToggleEvidence={onToggleEvidence}
                    />

                    <LinkedThreadPicker
                        items={linkableThreadItems}
                        onToggleThread={onToggleThread}
                    />
                </div>
            </FormSection>

            <FormSection
                helper="These are reusable risk stamps, not ticket-specific answers."
                required
                title="Finding Stamp"
            >
                <div className="grid gap-2">
                    {findingTypeItems.map((item) => (
                        <button
                            className={cn(
                                "rounded-xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rg-amber",
                                item.isSelected
                                    ? "border-rg-amber bg-rg-amber text-rg-night"
                                    : "border-rg-border-soft bg-rg-surface-raised text-rg-text hover:border-rg-amber/70 hover:bg-rg-surface-soft",
                            )}
                            key={item.findingType.id}
                            onClick={() =>
                                onSelectFindingType(item.findingType.id)
                            }
                            type="button"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-bold leading-5">
                                        {item.findingType.label}
                                    </p>

                                    <p
                                        className={cn(
                                            "mt-1 text-xs leading-5",
                                            item.isSelected
                                                ? "text-rg-night/75"
                                                : "text-rg-muted",
                                        )}
                                    >
                                        {item.findingType.description}
                                    </p>
                                </div>

                                <Badge
                                    tone={
                                        item.isSelected ? "warning" : "neutral"
                                    }
                                >
                                    {item.findingType.shortLabel}
                                </Badge>
                            </div>
                        </button>
                    ))}
                </div>
            </FormSection>

            <FormSection
                helper="Choose how strongly this finding should affect the release decision."
                required
                title="Severity"
            >
                <select
                    className="w-full rounded-xl border border-rg-border-soft bg-rg-surface-raised px-3 py-2 text-sm font-bold text-rg-text outline-none transition focus:border-rg-amber"
                    onChange={(event) =>
                        onDraftChange({
                            severity: event.target.value
                                ? (event.target.value as FindingSeverity)
                                : null,
                        })
                    }
                    value={draft.severity ?? ""}
                >
                    <option value="">Choose severity</option>
                    {severityOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </FormSection>

            <FormSection
                helper="Optional. Use this only if it clarifies your reasoning."
                title="Investigator Note"
            >
                <textarea
                    className="min-h-24 w-full resize-none rounded-xl border border-rg-border-soft bg-rg-surface-raised px-3 py-2 text-sm leading-6 text-rg-text outline-none transition placeholder:text-rg-muted/70 focus:border-rg-amber"
                    maxLength={220}
                    onChange={(event) =>
                        onDraftChange({
                            optionalNote: event.target.value,
                        })
                    }
                    placeholder="Optional note..."
                    value={draft.optionalNote}
                />
            </FormSection>

            <div className="rounded-2xl border border-rg-border-soft bg-rg-surface/65 p-3">
                <p className="font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-rg-muted">
                    Filing Requirements
                </p>

                <ul className="mt-2 grid gap-1 text-xs leading-5 text-rg-muted">
                    <ChecklistItem
                        isComplete={hasEvidenceSupport}
                        label="Evidence support selected"
                    />
                    <ChecklistItem
                        isComplete={hasFindingType}
                        label="Finding stamp selected"
                    />
                    <ChecklistItem
                        isComplete={hasSeverity}
                        label="Severity selected"
                    />
                </ul>

                <Button
                    className="mt-3 w-full"
                    disabled={!canFileFinding}
                    onClick={onFileFinding}
                    size="sm"
                    title={
                        canFileFinding
                            ? "File this finding."
                            : "Select evidence support, finding stamp, and severity first."
                    }
                    variant="primary"
                >
                    File Finding
                </Button>
            </div>
        </section>
    );
}

interface FormSectionProps {
    children: React.ReactNode;
    helper?: string;
    required?: boolean;
    title: string;
}

/**
 * One section in the finding form.
 */
function FormSection({
    children,
    helper,
    required = false,
    title,
}: FormSectionProps) {
    return (
        <section className="rounded-2xl border border-rg-border-soft bg-rg-surface/55 p-3">
            <div className="mb-2">
                <h4 className="text-sm font-bold text-rg-text">
                    {title}{" "}
                    {required && <span className="text-rg-amber">*</span>}
                </h4>

                {helper && (
                    <p className="mt-1 text-xs leading-5 text-rg-muted">
                        {helper}
                    </p>
                )}
            </div>

            {children}
        </section>
    );
}

interface ChecklistItemProps {
    isComplete: boolean;
    label: string;
}

/**
 * One filing readiness item.
 */
function ChecklistItem({ isComplete, label }: ChecklistItemProps) {
    return (
        <li className={isComplete ? "text-rg-text" : undefined}>
            <span className="mr-1 font-black">{isComplete ? "✓" : "•"}</span>
            {label}
        </li>
    );
}
