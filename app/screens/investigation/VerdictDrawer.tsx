import { Button } from "../../components/ui/Button";
import type { ReleaseVerdict } from "../../features/content/content-types";

const verdictOptions: {
    id: ReleaseVerdict;
    label: string;
    description: string;
}[] = [
    {
        id: "ship",
        label: "Ship",
        description: "Proceed with release.",
    },
    {
        id: "watch",
        label: "Watch",
        description: "Release with monitoring.",
    },
    {
        id: "hold",
        label: "Hold",
        description: "Pause for review.",
    },
    {
        id: "block",
        label: "Block",
        description: "Do not release.",
    },
];

export interface VerdictDrawerProps {
    canSubmitReport: boolean;
    filedFindingCount: number;
    onSelectVerdict: (verdict: ReleaseVerdict) => void;
    onSubmitReport: () => void;
    selectedVerdict: ReleaseVerdict | null;
}

/**
 * Physical verdict-stamp and report-filing page for the Casework Notepad.
 *
 * This component only presents verdict selection and the existing readiness
 * contract. Scoring, immutable report snapshots, persistence, and navigation
 * remain owned by the Investigation controller and domain layers.
 */
export function VerdictDrawer({
    canSubmitReport,
    filedFindingCount,
    onSelectVerdict,
    onSubmitReport,
    selectedVerdict,
}: VerdictDrawerProps) {
    const hasFiledFindings = filedFindingCount > 0;
    const selectedVerdictOption = verdictOptions.find(
        (verdict) => verdict.id === selectedVerdict,
    );

    return (
        <section className="grid gap-6 pb-6 pt-4 text-rg-paper-ink">
            <header className="border-b-[3px] border-rg-folder-dark/55 pb-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="font-case text-[0.68rem] font-bold uppercase tracking-[0.12em] text-rg-paper-ink/80">
                            Release Decision / Final Filing
                        </p>

                        <h3 className="mt-1 font-case text-lg font-bold leading-5 text-rg-paper-ink">
                            Stamp Release Decision
                        </h3>
                    </div>

                    <span
                        className="rg-casework-verdict-state shrink-0"
                        data-stamped={selectedVerdict ? "true" : "false"}
                    >
                        {selectedVerdictOption
                            ? `${selectedVerdictOption.label} Stamped`
                            : "Awaiting Stamp"}
                    </span>
                </div>

                <p className="mt-3 font-case text-xs font-bold leading-5 text-rg-paper-ink/80">
                    Apply one official verdict that matches the evidence and
                    filed case records. Submission scores and saves the ticket
                    report locally.
                </p>
            </header>

            <fieldset>
                <legend className="font-case text-[0.68rem] font-bold uppercase tracking-[0.1em] text-rg-paper-ink/85">
                    Official Verdict Stamp
                </legend>

                <div className="mt-3 grid grid-cols-2 gap-3">
                    {verdictOptions.map((verdict) => {
                        const isSelected = selectedVerdict === verdict.id;

                        return (
                            <button
                                aria-pressed={isSelected}
                                className="rg-casework-verdict-stamp"
                                data-selected={isSelected ? "true" : "false"}
                                data-verdict={verdict.id}
                                key={verdict.id}
                                onClick={() => onSelectVerdict(verdict.id)}
                                type="button"
                            >
                                <span className="rg-casework-verdict-stamp__impression">
                                    {verdict.label}
                                </span>

                                <span className="rg-casework-verdict-stamp__description">
                                    {verdict.description}
                                </span>

                                <span
                                    aria-hidden="true"
                                    className="rg-casework-verdict-stamp__state"
                                >
                                    {isSelected ? "Applied" : "Dry Stamp"}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </fieldset>

            <section className="border-y-2 border-rg-folder-dark/45 py-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="font-case text-[0.68rem] font-bold uppercase tracking-[0.12em] text-rg-paper-ink/80">
                            Filing Check
                        </p>

                        <ul className="mt-2 grid gap-2 font-case text-xs font-bold leading-5 text-rg-paper-ink/75">
                            <ReadinessItem
                                isComplete={hasFiledFindings}
                                label="At least one finding filed"
                            />

                            <ReadinessItem
                                isComplete={selectedVerdict !== null}
                                label="Official verdict stamped"
                            />
                        </ul>
                    </div>

                    <span
                        className="rg-casework-filing-mark"
                        data-ready={canSubmitReport ? "true" : "false"}
                    >
                        {canSubmitReport ? "Ready" : "Incomplete"}
                    </span>
                </div>

                <Button
                    className="mt-4 min-h-11 w-full"
                    disabled={!canSubmitReport}
                    onClick={onSubmitReport}
                    size="sm"
                    title={
                        canSubmitReport
                            ? "Submit and score this ticket report."
                            : "File at least one finding and select a verdict before submitting."
                    }
                    variant={canSubmitReport ? "stamp" : "secondary"}
                >
                    {canSubmitReport ? "Submit Report" : "Report Locked"}
                </Button>
            </section>
        </section>
    );
}

interface ReadinessItemProps {
    isComplete: boolean;
    label: string;
}

/**
 * One paper-native report filing requirement.
 *
 * This display mirrors the existing submission readiness rule and does not own
 * or replace any gameplay state.
 */
function ReadinessItem({ isComplete, label }: ReadinessItemProps) {
    return (
        <li className="flex items-center gap-2.5">
            <span
                aria-hidden="true"
                className="rg-casework-checklist-mark"
                data-complete={isComplete ? "true" : "false"}
            />

            <span className={isComplete ? "text-rg-paper-ink" : ""}>
                {label}
            </span>
        </li>
    );
}
