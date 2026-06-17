import { Link } from "react-router";

import { Badge } from "../../components/ui/Badge";
import { buttonClassName } from "../../components/ui/Button";
import { Panel } from "../../components/ui/Panel";
import { ScreenShell } from "../../components/ui/ScreenShell";
import { SectionHeader } from "../../components/ui/SectionHeader";

export interface TicketResultScreenProps {
    attemptId: string;
}

/**
 * Placeholder ticket result screen.
 *
 * Later this screen will load a saved ticket attempt report from local storage
 * by attemptId.
 */
export function TicketResultScreen({ attemptId }: TicketResultScreenProps) {
    return (
        <ScreenShell
            actions={
                <>
                    <Link
                        className={buttonClassName({ variant: "secondary" })}
                        to="/desk"
                    >
                        Back to Desk
                    </Link>
                    <Link
                        className={buttonClassName({ variant: "ghost" })}
                        to="/results/shift/demo-shift-run"
                    >
                        Preview Shift Result
                    </Link>
                </>
            }
            description="This placeholder route will later show score breakdown, matched findings, missed findings, and consequence panels."
            eyebrow="Ticket Report"
            title="Ticket Result"
        >
            <Panel tone="strong">
                <SectionHeader
                    eyebrow="Saved Attempt"
                    meta={
                        <Badge tone="neutral">
                            {attemptId || "missing attempt ID"}
                        </Badge>
                    }
                    title="Result route is ready"
                />

                <p className="text-sm leading-6 text-rg-muted">
                    The save repository is not implemented yet. In a later
                    build, verdict submission will score the attempt, save the
                    report locally, and navigate here using the generated
                    attempt ID.
                </p>
            </Panel>
        </ScreenShell>
    );
}
