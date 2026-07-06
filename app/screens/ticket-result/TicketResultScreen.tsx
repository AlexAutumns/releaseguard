import { useEffect, useState } from "react";
import { Link } from "react-router";

import { Badge } from "../../components/ui/Badge";
import { buttonClassName } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Panel } from "../../components/ui/Panel";
import { ScreenShell } from "../../components/ui/ScreenShell";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { loadTicketScoreResult } from "../../features/gameplay/results/ticket-result-storage";
import type { TicketScoreResult } from "../../features/gameplay/scoring/scoring-types";
import { TicketResultReport } from "./TicketResultReport";

export interface TicketResultScreenProps {
    attemptId: string;
}

/**
 * Ticket Result route screen.
 *
 * The screen owns client-side saved-result loading and safe loading/missing
 * fallbacks. A successfully loaded snapshot is passed unchanged to the paged
 * TicketResultReport presentation.
 */
export function TicketResultScreen({ attemptId }: TicketResultScreenProps) {
    const [result, setResult] = useState<TicketScoreResult | null>(null);
    const [hasLoaded, setHasLoaded] = useState(false);

    useEffect(() => {
        setResult(loadTicketScoreResult(attemptId));
        setHasLoaded(true);
    }, [attemptId]);

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

    return <TicketResultReport result={result} />;
}

/**
 * Shared route action used by Ticket Result loading and missing-result states.
 */
function BackToDeskAction() {
    return (
        <Link className={buttonClassName({ variant: "secondary" })} to="/desk">
            Back to Desk
        </Link>
    );
}
