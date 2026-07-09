import type { ReactNode } from "react";

import { Button } from "../../components/ui/Button";
import type { FindingSeverity } from "../../features/content/content-types";
import type { EvidenceThreadColorId } from "../../features/gameplay/board/board-state";
import type { DraftFindingPatch } from "../../features/gameplay/findings/finding-rules";
import type { DraftFinding } from "../../features/gameplay/findings/finding-state";
import type { FindingTypeId } from "../../features/gameplay/findings/finding-types";
import { cn } from "../../lib/cn";
import { LinkedEvidencePicker } from "./LinkedEvidencePicker";
import { LinkedThreadPicker } from "./LinkedThreadPicker";
import type {
    FindingTypeItem,
    LinkableEvidenceItem,
    LinkableThreadItem,
} from "./useInvestigationController";

const severityOptions: { id: FindingSeverity; label: string }[] = [
    { id: "low", label: "Low" },
    { id: "medium", label: "Medium" },
    { id: "high", label: "High" },
    { id: "critical", label: "Critical" },
];

const severityOvalPathById: Record<FindingSeverity, string> = {
    low: "M8 23 C10 7 35 2 62 4 C90 5 111 13 111 24 C110 37 84 42 57 40 C29 40 6 35 8 23 Z",
    medium: "M7 22 C12 7 35 3 61 4 C91 4 113 12 111 25 C108 38 85 42 56 40 C27 39 5 35 7 22 Z",
    high: "M8 24 C8 9 33 2 61 4 C92 5 111 13 110 26 C108 39 82 42 55 40 C27 39 7 36 8 24 Z",
    critical:
        "M7 23 C11 8 36 1 63 4 C94 6 113 14 110 27 C107 40 80 42 54 40 C25 39 5 35 7 23 Z",
};

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
 * Pre-printed evidence-first finding form for the Casework Notepad.
 *
 * The gameplay contract is unchanged: support is linked first, a generic finding
 * type is selected, severity is chosen, and the completed draft is filed through
 * the existing controller handlers.
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
        <section className="grid gap-7 pb-6 pt-4 text-rg-paper-ink">
            <header className="border-b-[3px] border-rg-folder-dark/55 pb-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="font-case text-[0.68rem] font-bold uppercase tracking-[0.12em] text-rg-paper-ink/80">
                            Case Form / New Finding
                        </p>

                        <h3 className="mt-1 font-case text-lg font-bold leading-5 text-rg-paper-ink">
                            Supported Release Finding
                        </h3>
                    </div>

                    <span
                        className="rg-casework-draft-state shrink-0"
                        data-ready={canFileFinding ? "true" : "false"}
                    >
                        {canFileFinding ? "Ready to File" : "Draft Open"}
                    </span>
                </div>

                <p className="mt-3 max-w-[42rem] font-case text-xs font-bold leading-5 text-rg-paper-ink/80">
                    Attach direct evidence or an Evidence Thread, classify the
                    release risk, then record its severity.
                </p>
            </header>

            <CaseworkFormSection
                helper="Use direct files, whole Board threads, or both as support."
                number="01"
                required
                title="Evidence Support"
            >
                <div className="grid gap-5">
                    <LinkedEvidencePicker
                        items={linkableEvidenceItems}
                        onToggleEvidence={onToggleEvidence}
                    />

                    <LinkedThreadPicker
                        items={linkableThreadItems}
                        onToggleThread={onToggleThread}
                    />
                </div>
            </CaseworkFormSection>

            <CaseworkFormSection
                helper="Choose one reusable case classification. These are not ticket-specific answers."
                number="02"
                required
                title="Finding Stamp"
            >
                <div className="grid gap-1.5 border-t border-rg-folder-dark/30">
                    {findingTypeItems.map((item) => (
                        <button
                            aria-pressed={item.isSelected}
                            className="rg-casework-classification-row grid min-w-0 grid-cols-[1.25rem_minmax(0,1fr)_max-content] items-start gap-3 px-2 py-3 text-left"
                            data-selected={item.isSelected ? "true" : "false"}
                            key={item.findingType.id}
                            onClick={() =>
                                onSelectFindingType(item.findingType.id)
                            }
                            type="button"
                        >
                            <span
                                aria-hidden="true"
                                className="rg-casework-classification-mark mt-0.5"
                            />

                            <span className="min-w-0">
                                <span className="rg-casework-classification-title block font-case text-sm font-bold leading-5 text-rg-paper-ink">
                                    {item.findingType.label}
                                </span>

                                <span className="mt-0.5 block font-case text-[0.78rem] font-bold leading-5 text-rg-paper-ink/80">
                                    {item.findingType.description}
                                </span>
                            </span>

                            <span className="rg-casework-classification-code mt-0.5">
                                {item.findingType.shortLabel}
                            </span>
                        </button>
                    ))}
                </div>
            </CaseworkFormSection>

            <CaseworkFormSection
                helper="Circle how strongly this finding should affect the release decision."
                number="03"
                required
                title="Severity"
            >
                <fieldset>
                    <legend className="sr-only">Finding severity</legend>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 min-[1366px]:grid-cols-4">
                        {severityOptions.map((option) => {
                            const isSelected = draft.severity === option.id;

                            return (
                                <label
                                    className="rg-casework-severity-option relative grid min-h-11 min-w-0 cursor-pointer place-items-center px-2 py-1.5"
                                    data-selected={
                                        isSelected ? "true" : "false"
                                    }
                                    key={option.id}
                                >
                                    <input
                                        checked={isSelected}
                                        className="sr-only"
                                        name="finding-severity"
                                        onChange={() =>
                                            onDraftChange({
                                                severity: option.id,
                                            })
                                        }
                                        type="radio"
                                        value={option.id}
                                    />

                                    <span
                                        aria-hidden="true"
                                        className="rg-casework-severity-focus absolute inset-0"
                                    />

                                    <span className="relative z-10 font-case text-sm font-bold uppercase tracking-[0.07em] text-rg-paper-ink">
                                        {option.label}
                                    </span>

                                    {isSelected && (
                                        <svg
                                            aria-hidden="true"
                                            className="rg-casework-severity-oval absolute inset-0 h-full w-full"
                                            preserveAspectRatio="none"
                                            viewBox="0 0 120 44"
                                        >
                                            <path
                                                className="rg-casework-severity-oval__path"
                                                d={
                                                    severityOvalPathById[
                                                        option.id
                                                    ]
                                                }
                                                pathLength="1"
                                            />
                                        </svg>
                                    )}
                                </label>
                            );
                        })}
                    </div>
                </fieldset>
            </CaseworkFormSection>

            <CaseworkFormSection
                helper="Optional. Add a short investigator annotation only when it clarifies your reasoning."
                number="04"
                title="Investigator Note"
            >
                <textarea
                    className="rg-casework-note-input rg-handwriting-input min-h-28 w-full resize-none px-2 py-2 text-rg-hand-ink outline-none placeholder:text-rg-paper-muted/55"
                    maxLength={220}
                    onChange={(event) =>
                        onDraftChange({
                            optionalNote: event.target.value,
                        })
                    }
                    placeholder="Write a short investigator note..."
                    value={draft.optionalNote}
                />
            </CaseworkFormSection>

            <section className="rg-casework-filing-check border-y-2 border-rg-folder-dark/45 py-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="font-case text-[0.68rem] font-bold uppercase tracking-[0.12em] text-rg-paper-ink/80">
                            Filing Check
                        </p>

                        <ul className="mt-2 grid gap-2 font-case text-xs font-bold leading-5 text-rg-paper-ink/75">
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
                    </div>

                    <span
                        aria-hidden="true"
                        className={cn(
                            "rg-casework-filing-mark",
                            canFileFinding &&
                                "rg-casework-filing-mark--complete",
                        )}
                    >
                        {canFileFinding ? "Complete" : "Incomplete"}
                    </span>
                </div>

                <Button
                    className="mt-4 w-full"
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
            </section>
        </section>
    );
}

interface CaseworkFormSectionProps {
    children: ReactNode;
    helper?: string;
    number: string;
    required?: boolean;
    title: string;
}

/**
 * One numbered pre-printed section of the New Finding case form.
 */
function CaseworkFormSection({
    children,
    helper,
    number,
    required = false,
    title,
}: CaseworkFormSectionProps) {
    return (
        <section className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-4 border-b-[3px] border-rg-folder-dark/50 pb-6">
            <span
                aria-hidden="true"
                className="font-mono text-[0.62rem] font-extrabold tracking-[0.1em] text-rg-stamp-dark/85"
            >
                {number}
            </span>

            <div className="min-w-0">
                <div className="mb-4">
                    <h4 className="font-case text-[0.9rem] font-bold uppercase tracking-[0.055em] text-rg-paper-ink">
                        {title}

                        {required && (
                            <span className="ml-1 text-rg-stamp-dark">*</span>
                        )}
                    </h4>

                    {helper && (
                        <p className="mt-1 font-case text-[0.8rem] font-bold leading-5 text-rg-paper-ink/80">
                            {helper}
                        </p>
                    )}
                </div>

                {children}
            </div>
        </section>
    );
}

interface ChecklistItemProps {
    isComplete: boolean;
    label: string;
}

/**
 * One visual filing requirement.
 *
 * This is display-only readiness feedback and does not replace the controller's
 * canFileFinding rule.
 */
function ChecklistItem({ isComplete, label }: ChecklistItemProps) {
    return (
        <li
            className={cn(
                "flex items-center gap-2.5",
                isComplete && "text-rg-paper-ink",
            )}
        >
            <span
                aria-hidden="true"
                className="rg-casework-checklist-mark"
                data-complete={isComplete ? "true" : "false"}
            />

            {label}
        </li>
    );
}
