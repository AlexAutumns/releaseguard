import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import type { ReleaseVerdict } from "../../features/content/content-types";
import { cn } from "../../lib/cn";

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
 * Verdict selection and ticket report submission panel.
 *
 * This component only renders readiness and calls submit handlers. Scoring,
 * storage, and navigation stay outside this drawer.
 */
export function VerdictDrawer({
    canSubmitReport,
    filedFindingCount,
    onSelectVerdict,
    onSubmitReport,
    selectedVerdict,
}: VerdictDrawerProps) {
    const hasFiledFindings = filedFindingCount > 0;
    const isReadyForReport = hasFiledFindings && selectedVerdict !== null;

    return (
        <section className="grid gap-4 pb-2">
            <div className="rounded-2xl border border-rg-border-soft bg-rg-surface/65 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-rg-amber">
                            Verdict
                        </p>

                        <h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-rg-text">
                            Stamp release decision
                        </h3>
                    </div>

                    <Badge tone={selectedVerdict ? "warning" : "danger"}>
                        {selectedVerdict ?? "Unstamped"}
                    </Badge>
                </div>

                <p className="mt-2 text-xs leading-5 text-rg-muted">
                    The verdict should match the evidence and filed findings.
                    Submitting will score the filed casework and save a ticket
                    report locally.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {verdictOptions.map((verdict) => {
                    const isSelected = selectedVerdict === verdict.id;

                    return (
                        <button
                            className={cn(
                                "rounded-2xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rg-amber",
                                isSelected
                                    ? "border-rg-amber bg-rg-amber text-rg-night"
                                    : "border-rg-border-soft bg-rg-surface-raised text-rg-text hover:border-rg-amber/70 hover:bg-rg-surface-soft",
                            )}
                            key={verdict.id}
                            onClick={() => onSelectVerdict(verdict.id)}
                            type="button"
                        >
                            <span className="block text-sm font-black">
                                {verdict.label}
                            </span>

                            <span
                                className={cn(
                                    "mt-1 block text-xs leading-5",
                                    isSelected
                                        ? "text-rg-night/75"
                                        : "text-rg-muted",
                                )}
                            >
                                {verdict.description}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="rounded-2xl border border-rg-border-soft bg-rg-surface/65 p-3">
                <p className="font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-rg-muted">
                    Report Readiness
                </p>

                <ul className="mt-2 grid gap-1 text-xs leading-5 text-rg-muted">
                    <ReadinessItem
                        isComplete={hasFiledFindings}
                        label="At least one finding filed"
                    />
                    <ReadinessItem
                        isComplete={selectedVerdict !== null}
                        label="Verdict selected"
                    />
                </ul>

                <Button
                    className="mt-3 w-full"
                    disabled={!canSubmitReport}
                    onClick={onSubmitReport}
                    size="sm"
                    title={
                        canSubmitReport
                            ? "Submit and score this ticket report."
                            : "File at least one finding and select a verdict before submitting."
                    }
                    variant={isReadyForReport ? "stamp" : "secondary"}
                >
                    {canSubmitReport ? "Submit Report" : "Report Locked"}
                </Button>
            </div>
        </section>
    );
}

interface ReadinessItemProps {
    isComplete: boolean;
    label: string;
}

/**
 * One verdict readiness line.
 */
function ReadinessItem({ isComplete, label }: ReadinessItemProps) {
    return (
        <li className={isComplete ? "text-rg-text" : ""}>
            <span className="mr-1 font-black">{isComplete ? "✓" : "•"}</span>
            {label}
        </li>
    );
}
