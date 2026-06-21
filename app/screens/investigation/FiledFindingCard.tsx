import { Badge, type BadgeTone } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import type { EvidenceCardDefinition } from "../../features/content/content-types";
import type { FiledFinding } from "../../features/gameplay/findings/finding-state";
import type { FindingTypeDefinition } from "../../features/gameplay/findings/finding-types";

export interface FiledFindingCardProps {
    filedFinding: FiledFinding;
    findingType?: FindingTypeDefinition;
    linkedEvidenceCards: EvidenceCardDefinition[];
    onRemove: () => void;
}

/**
 * Returns badge tone for a filed finding severity.
 */
function getSeverityTone(severity: FiledFinding["severity"]): BadgeTone {
    if (severity === "critical") {
        return "danger";
    }

    if (severity === "high") {
        return "warning";
    }

    if (severity === "medium") {
        return "info";
    }

    return "neutral";
}

/**
 * Displays one filed finding with resolved type and evidence support.
 */
export function FiledFindingCard({
    filedFinding,
    findingType,
    linkedEvidenceCards,
    onRemove,
}: FiledFindingCardProps) {
    return (
        <article className="rounded-2xl border border-rg-border-soft bg-rg-surface/65 p-3">
            <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-rg-muted">
                        Filed Finding
                    </p>

                    <p className="mt-1 text-sm font-bold leading-5 text-rg-text">
                        {findingType?.label ?? "Unknown finding stamp"}
                    </p>
                </div>

                <Button
                    aria-label="Remove filed finding"
                    className="h-8 w-8 shrink-0 px-0"
                    onClick={onRemove}
                    size="sm"
                    title="Remove this finding"
                    variant="danger"
                >
                    ×
                </Button>
            </div>

            <div className="mb-3 flex flex-wrap gap-1.5">
                <Badge tone="neutral">
                    {findingType?.category ?? "unknown"}
                </Badge>

                <Badge tone={getSeverityTone(filedFinding.severity)}>
                    {filedFinding.severity}
                </Badge>
            </div>

            <div className="rounded-xl border border-rg-border-soft bg-rg-surface-raised p-2">
                <p className="font-mono text-[0.58rem] font-extrabold uppercase tracking-[0.14em] text-rg-muted">
                    Evidence Support
                </p>

                {linkedEvidenceCards.length > 0 ? (
                    <ul className="mt-2 grid gap-1.5">
                        {linkedEvidenceCards.map((evidenceCard) => (
                            <li
                                className="text-xs leading-5 text-rg-muted"
                                key={evidenceCard.id}
                            >
                                • {evidenceCard.title}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-2 text-xs leading-5 text-rg-muted">
                        Linked evidence could not be resolved.
                    </p>
                )}
            </div>

            {filedFinding.optionalNote && (
                <div className="mt-2 rounded-xl border border-rg-border-soft bg-rg-surface-raised p-2">
                    <p className="font-mono text-[0.58rem] font-extrabold uppercase tracking-[0.14em] text-rg-muted">
                        Optional Note
                    </p>

                    <p className="mt-1 text-sm leading-6 text-rg-text">
                        {filedFinding.optionalNote}
                    </p>
                </div>
            )}
        </article>
    );
}