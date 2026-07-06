import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { Badge, type BadgeTone } from "../../components/ui/Badge";
import { buttonClassName } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Panel } from "../../components/ui/Panel";
import { ScreenShell } from "../../components/ui/ScreenShell";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { loadTicketScoreResult } from "../../features/gameplay/results/ticket-result-storage";
import type {
    MatchedFindingScoreResult,
    MissedFindingScoreResult,
    ScoreBreakdownLine,
    ScoreEvidenceReference,
    TicketScoreResult,
    UnsupportedFindingScoreResult,
} from "../../features/gameplay/scoring/scoring-types";

export interface TicketResultScreenProps {
    attemptId: string;
}

/**
 * Ticket result report screen.
 *
 * The result is loaded from browser localStorage on the client because this app
 * still uses SSR and localStorage is not available during server render.
 */
export function TicketResultScreen({ attemptId }: TicketResultScreenProps) {
    const [result, setResult] = useState<TicketScoreResult | null>(null);
    const [hasLoaded, setHasLoaded] = useState(false);

    useEffect(() => {
        setResult(loadTicketScoreResult(attemptId));
        setHasLoaded(true);
    }, [attemptId]);

    const scoreTone = getScoreTone(result?.totalScore ?? 0);
    const scoreLabel = getScoreLabel(result?.totalScore ?? 0);

    if (!hasLoaded) {
        return (
            <ScreenShell
                actions={<BackToDeskAction />}
                description="Loading the submitted ticket report from local browser storage."
                eyebrow="Ticket Report"
                title="Verdict Report"
            >
                <Panel tone="raised">
                    <SectionHeader
                        eyebrow="Loading"
                        meta={<Badge tone="neutral">{attemptId}</Badge>}
                        title="Retrieving submitted report"
                    />

                    <p className="text-sm leading-6 text-rg-muted">
                        Checking local storage for the saved ticket result.
                    </p>
                </Panel>
            </ScreenShell>
        );
    }

    if (!attemptId || !result) {
        return (
            <ScreenShell
                actions={<BackToDeskAction />}
                description="The submitted ticket report could not be found in local browser storage."
                eyebrow="Ticket Report"
                title="Report Not Found"
            >
                <Panel tone="raised">
                    <EmptyState
                        action={<BackToDeskAction />}
                        description="This can happen if the report was opened in a different browser, local storage was cleared, or the attempt ID is incomplete."
                        title="No saved report was found for this attempt."
                    />
                </Panel>
            </ScreenShell>
        );
    }

    return (
        <ScreenShell
            actions={
                <>
                    <BackToDeskAction />
                    <Link
                        className={buttonClassName({ variant: "ghost" })}
                        to={`/tickets/${result.shiftId}/${result.ticketId}`}
                    >
                        Review Briefing
                    </Link>
                </>
            }
            description="Review the submitted verdict, matched findings, missed risks, unsupported claims, and investigation activity."
            eyebrow="Ticket Report"
            title={result.ticketTitle}
        >
            <div className="grid gap-5">
                <Panel tone="raised">
                    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
                        <ScoreSummaryCard
                            result={result}
                            scoreLabel={scoreLabel}
                            scoreTone={scoreTone}
                        />

                        <VerdictReviewCard result={result} />
                    </div>
                </Panel>

                <Panel tone="surface">
                    <SectionHeader
                        eyebrow="Score Breakdown"
                        title="How the report was scored"
                        description="The score is based on the final verdict, matched expected findings, required evidence support, and severity accuracy."
                    />

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <BreakdownCard line={result.breakdown.verdict} />
                        <BreakdownCard line={result.breakdown.findings} />
                        <BreakdownCard
                            line={result.breakdown.evidenceSupport}
                        />
                        <BreakdownCard line={result.breakdown.severity} />
                    </div>
                </Panel>

                <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                    <MatchedFindingsPanel result={result} />

                    <div className="grid gap-5">
                        <MissedFindingsPanel result={result} />
                        <UnsupportedFindingsPanel result={result} />
                    </div>
                </div>

                <InvestigationStatsPanel result={result} />
            </div>
        </ScreenShell>
    );
}

interface ScoreSummaryCardProps {
    result: TicketScoreResult;
    scoreLabel: string;
    scoreTone: BadgeTone;
}

/**
 * Shows the main ticket score in a large report-card style block.
 */
function ScoreSummaryCard({
    result,
    scoreLabel,
    scoreTone,
}: ScoreSummaryCardProps) {
    return (
        <section className="rounded-3xl border border-rg-border-soft bg-rg-surface-raised/75 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="font-mono text-xs font-extrabold uppercase tracking-[0.2em] text-rg-amber">
                        Final Score
                    </p>

                    <div className="mt-3 flex items-end gap-2">
                        <span className="text-6xl font-black leading-none tracking-[-0.08em] text-rg-text">
                            {formatScore(result.totalScore)}
                        </span>
                        <span className="pb-2 text-xl font-black text-rg-muted">
                            / {result.maxScore}
                        </span>
                    </div>
                </div>

                <Badge tone={scoreTone}>{scoreLabel}</Badge>
            </div>

            <p className="mt-4 text-sm leading-6 text-rg-muted">
                This score reflects the submitted casework snapshot. Filed
                findings use saved evidence support, so later board changes do
                not rewrite this report.
            </p>

            <div className="mt-5 rounded-2xl border border-rg-border-soft bg-rg-surface/70 p-4">
                <p className="font-mono text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-rg-muted">
                    Submitted
                </p>
                <p className="mt-1 text-sm font-bold text-rg-text">
                    {formatDateTime(result.submittedAt)}
                </p>
            </div>
        </section>
    );
}

interface VerdictReviewCardProps {
    result: TicketScoreResult;
}

/**
 * Shows whether the player's final release decision matched the authored
 * expected verdict.
 */
function VerdictReviewCard({ result }: VerdictReviewCardProps) {
    const verdictTone: BadgeTone = result.isVerdictCorrect
        ? "success"
        : "danger";

    return (
        <section className="rounded-3xl border border-rg-border-soft bg-rg-surface-raised/75 p-5">
            <SectionHeader
                eyebrow="Verdict Review"
                meta={
                    <Badge tone={verdictTone}>
                        {result.isVerdictCorrect ? "Correct" : "Mismatch"}
                    </Badge>
                }
                title="Release decision"
                description="The final verdict is scored separately from the supporting casework."
            />

            <div className="grid gap-3 sm:grid-cols-2">
                <VerdictMiniCard
                    label="Your Verdict"
                    verdict={result.selectedVerdict ?? "No verdict"}
                />
                <VerdictMiniCard
                    label="Expected Verdict"
                    verdict={result.correctVerdict}
                />
            </div>

            <p className="mt-4 text-sm leading-6 text-rg-muted">
                {result.isVerdictCorrect
                    ? "The submitted verdict matched the expected release decision for this ticket."
                    : "The submitted verdict did not match the expected release decision. The finding report below shows what was still identified correctly."}
            </p>
        </section>
    );
}

interface VerdictMiniCardProps {
    label: string;
    verdict: string;
}

/**
 * Small verdict label card used by the verdict review panel.
 */
function VerdictMiniCard({ label, verdict }: VerdictMiniCardProps) {
    return (
        <div className="rounded-2xl border border-rg-border-soft bg-rg-surface/70 p-4">
            <p className="font-mono text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-rg-muted">
                {label}
            </p>
            <p className="mt-2 text-2xl font-black uppercase tracking-[0.12em] text-rg-text">
                {formatVerdict(verdict)}
            </p>
        </div>
    );
}

interface BreakdownCardProps {
    line: ScoreBreakdownLine;
}

/**
 * Renders one score breakdown line.
 */
function BreakdownCard({ line }: BreakdownCardProps) {
    return (
        <article className="rounded-2xl border border-rg-border-soft bg-rg-surface-raised/70 p-4">
            <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-black text-rg-text">
                    {line.label}
                </h3>

                <Badge tone="neutral">
                    {formatScore(line.earnedPoints)} / {line.maxPoints}
                </Badge>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-rg-surface">
                <div
                    className="h-full rounded-full bg-rg-amber"
                    style={{
                        width: `${getPercent(line.earnedPoints, line.maxPoints)}%`,
                    }}
                />
            </div>

            <p className="mt-3 text-xs leading-5 text-rg-muted">
                {line.description}
            </p>
        </article>
    );
}

interface MatchedFindingsPanelProps {
    result: TicketScoreResult;
}

/**
 * Shows player findings that matched authored expected findings.
 */
function MatchedFindingsPanel({ result }: MatchedFindingsPanelProps) {
    return (
        <Panel tone="paper">
            <SectionHeader
                eyebrow="Matched Findings"
                meta={
                    <Badge tone="success">
                        {result.matchedFindings.length}
                    </Badge>
                }
                title="Supported issues identified"
                description="These filed findings matched expected risks using the correct category and required evidence."
                tone="paper"
            />

            {result.matchedFindings.length === 0 ? (
                <EmptyState
                    description="No filed findings matched the authored expected findings."
                    title="No matched findings"
                    tone="paper"
                />
            ) : (
                <div className="grid gap-3">
                    {result.matchedFindings.map((finding) => (
                        <MatchedFindingCard
                            finding={finding}
                            key={finding.filedFindingId}
                        />
                    ))}
                </div>
            )}
        </Panel>
    );
}

interface MatchedFindingCardProps {
    finding: MatchedFindingScoreResult;
}

/**
 * Renders one matched finding report card.
 */
function MatchedFindingCard({ finding }: MatchedFindingCardProps) {
    return (
        <article className="rounded-2xl border border-rg-folder-dark/35 bg-rg-paper-strong/55 p-4 text-rg-paper-ink">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-rg-folder-dark">
                        {formatCategory(finding.expectedCategory)}
                    </p>
                    <h3 className="mt-1 text-lg font-black tracking-[-0.03em]">
                        {finding.findingTypeLabel}
                    </h3>
                </div>

                <Badge tone="success">Matched</Badge>
            </div>

            <p className="mt-3 text-sm leading-6 text-rg-paper-muted">
                {finding.expectedSummary}
            </p>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <EvidenceList
                    evidence={finding.requiredEvidence}
                    title="Required Evidence"
                    tone="paper"
                />
                <EvidenceList
                    evidence={finding.supportedEvidence}
                    title="Submitted Support"
                    tone="paper"
                />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="neutral">
                    Expected: {formatSeverity(finding.expectedSeverity)}
                </Badge>
                <Badge
                    tone={
                        finding.selectedSeverity === finding.expectedSeverity
                            ? "success"
                            : "warning"
                    }
                >
                    Chosen: {formatSeverity(finding.selectedSeverity)}
                </Badge>
            </div>
        </article>
    );
}

interface MissedFindingsPanelProps {
    result: TicketScoreResult;
}

/**
 * Shows authored expected findings the player missed.
 */
function MissedFindingsPanel({ result }: MissedFindingsPanelProps) {
    return (
        <Panel tone="raised">
            <SectionHeader
                eyebrow="Missed Findings"
                meta={
                    <Badge tone="warning">{result.missedFindings.length}</Badge>
                }
                title="Risks not fully identified"
                description="These expected risks were not matched by filed casework."
            />

            {result.missedFindings.length === 0 ? (
                <p className="rounded-2xl border border-rg-success/30 bg-rg-success/10 p-4 text-sm leading-6 text-rg-success">
                    No expected findings were missed.
                </p>
            ) : (
                <div className="grid gap-3">
                    {result.missedFindings.map((finding) => (
                        <MissedFindingCard
                            finding={finding}
                            key={finding.expectedFindingId}
                        />
                    ))}
                </div>
            )}
        </Panel>
    );
}

interface MissedFindingCardProps {
    finding: MissedFindingScoreResult;
}

/**
 * Renders one missed expected finding.
 */
function MissedFindingCard({ finding }: MissedFindingCardProps) {
    return (
        <article className="rounded-2xl border border-rg-warning/35 bg-rg-warning/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-rg-warning">
                        {formatCategory(finding.expectedCategory)}
                    </p>
                    <h3 className="mt-1 text-sm font-black text-rg-text">
                        {formatSeverity(finding.expectedSeverity)} risk missed
                    </h3>
                </div>

                <Badge tone="warning">Missed</Badge>
            </div>

            <p className="mt-3 text-sm leading-6 text-rg-muted">
                {finding.expectedSummary}
            </p>

            <EvidenceList
                className="mt-3"
                evidence={finding.requiredEvidence}
                title="Evidence that would support this"
            />
        </article>
    );
}

interface UnsupportedFindingsPanelProps {
    result: TicketScoreResult;
}

/**
 * Shows player findings that did not match the authored answer key.
 */
function UnsupportedFindingsPanel({ result }: UnsupportedFindingsPanelProps) {
    return (
        <Panel tone="raised">
            <SectionHeader
                eyebrow="Unsupported Findings"
                meta={
                    <Badge tone="danger">
                        {result.unsupportedFindings.length}
                    </Badge>
                }
                title="Claims not matched"
                description="These filed findings did not match an expected category/evidence combination."
            />

            {result.unsupportedFindings.length === 0 ? (
                <p className="rounded-2xl border border-rg-success/30 bg-rg-success/10 p-4 text-sm leading-6 text-rg-success">
                    No unsupported findings were filed.
                </p>
            ) : (
                <div className="grid gap-3">
                    {result.unsupportedFindings.map((finding) => (
                        <UnsupportedFindingCard
                            finding={finding}
                            key={finding.filedFindingId}
                        />
                    ))}
                </div>
            )}
        </Panel>
    );
}

interface UnsupportedFindingCardProps {
    finding: UnsupportedFindingScoreResult;
}

/**
 * Renders one unsupported filed finding.
 */
function UnsupportedFindingCard({ finding }: UnsupportedFindingCardProps) {
    return (
        <article className="rounded-2xl border border-rg-danger/35 bg-rg-danger/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-rg-danger">
                        {formatSeverity(finding.selectedSeverity)}
                    </p>
                    <h3 className="mt-1 text-sm font-black text-rg-text">
                        {finding.findingTypeLabel}
                    </h3>
                </div>

                <Badge tone="danger">Unsupported</Badge>
            </div>

            <p className="mt-3 text-sm leading-6 text-rg-muted">
                {finding.reason}
            </p>

            <EvidenceList
                className="mt-3"
                evidence={finding.supportedEvidence}
                title="Submitted Support"
            />
        </article>
    );
}

interface InvestigationStatsPanelProps {
    result: TicketScoreResult;
}

/**
 * Shows simple non-scoring activity stats from the submitted attempt.
 */
function InvestigationStatsPanel({ result }: InvestigationStatsPanelProps) {
    return (
        <Panel tone="surface">
            <SectionHeader
                eyebrow="Investigation Activity"
                title="What was submitted"
                description="These counters describe the submitted attempt. They are useful context, but they are not the main score by themselves."
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Evidence Inspected"
                    value={result.stats.inspectedEvidenceCount}
                />
                <StatCard
                    label="Evidence Pinned"
                    value={result.stats.pinnedEvidenceCount}
                />
                <StatCard
                    label="Filed Findings"
                    value={result.stats.filedFindingCount}
                />
                <StatCard
                    label="Active Board Strings"
                    value={result.stats.boardConnectionCount}
                />
            </div>
        </Panel>
    );
}

interface StatCardProps {
    label: string;
    value: number;
}

/**
 * Small report statistic card.
 */
function StatCard({ label, value }: StatCardProps) {
    return (
        <div className="rounded-2xl border border-rg-border-soft bg-rg-surface-raised/75 p-4">
            <p className="text-3xl font-black tracking-[-0.06em] text-rg-text">
                {value}
            </p>
            <p className="mt-1 font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-rg-muted">
                {label}
            </p>
        </div>
    );
}

interface EvidenceListProps {
    evidence: ScoreEvidenceReference[];
    title: string;
    className?: string;
    tone?: "dark" | "paper";
}

/**
 * Shared evidence list used by matched, missed, and unsupported report cards.
 */
function EvidenceList({
    evidence,
    title,
    className,
    tone = "dark",
}: EvidenceListProps) {
    const isPaper = tone === "paper";

    return (
        <div
            className={[
                "rounded-xl border p-3",
                isPaper
                    ? "border-rg-folder-dark/25 bg-rg-paper/60"
                    : "border-rg-border-soft bg-rg-surface/55",
                className ?? "",
            ].join(" ")}
        >
            <p
                className={
                    isPaper
                        ? "font-mono text-[0.58rem] font-extrabold uppercase tracking-[0.14em] text-rg-folder-dark"
                        : "font-mono text-[0.58rem] font-extrabold uppercase tracking-[0.14em] text-rg-muted"
                }
            >
                {title}
            </p>

            {evidence.length === 0 ? (
                <p
                    className={
                        isPaper
                            ? "mt-2 text-xs leading-5 text-rg-paper-muted"
                            : "mt-2 text-xs leading-5 text-rg-muted"
                    }
                >
                    No evidence recorded.
                </p>
            ) : (
                <ul className="mt-2 grid gap-1.5">
                    {evidence.map((item) => (
                        <li
                            className={
                                isPaper
                                    ? "text-xs leading-5 text-rg-paper-muted"
                                    : "text-xs leading-5 text-rg-muted"
                            }
                            key={item.evidenceId}
                        >
                            • {item.title}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/**
 * Shared back-to-desk action.
 */
function BackToDeskAction() {
    return (
        <Link className={buttonClassName({ variant: "secondary" })} to="/desk">
            Back to Desk
        </Link>
    );
}

/**
 * Returns the player-facing score label.
 */
function getScoreLabel(score: number): string {
    if (score >= 90) {
        return "Strong Case";
    }

    if (score >= 70) {
        return "Solid Case";
    }

    if (score >= 50) {
        return "Partial Case";
    }

    return "Weak Case";
}

/**
 * Returns the badge tone for the final score.
 */
function getScoreTone(score: number): BadgeTone {
    if (score >= 90) {
        return "success";
    }

    if (score >= 70) {
        return "info";
    }

    if (score >= 50) {
        return "warning";
    }

    return "danger";
}

/**
 * Formats score numbers without noisy trailing decimals.
 */
function formatScore(score: number): string {
    return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

/**
 * Converts a score into a progress-bar percentage.
 */
function getPercent(earnedPoints: number, maxPoints: number): number {
    if (maxPoints <= 0) {
        return 0;
    }

    return Math.max(0, Math.min(100, (earnedPoints / maxPoints) * 100));
}

/**
 * Formats verdict IDs into report labels.
 */
function formatVerdict(verdict: string): string {
    return verdict
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

/**
 * Formats finding severity IDs into report labels.
 */
function formatSeverity(severity: string): string {
    return severity.charAt(0).toUpperCase() + severity.slice(1);
}

/**
 * Formats risk category IDs into report labels.
 */
function formatCategory(category: string): string {
    return category
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

/**
 * Formats ISO datetimes for report display.
 */
function formatDateTime(isoValue: string): string {
    const date = new Date(isoValue);

    if (Number.isNaN(date.getTime())) {
        return isoValue;
    }

    return date.toLocaleString();
}
