import { Link } from "react-router";

import { Badge } from "../../components/ui/Badge";
import { buttonClassName } from "../../components/ui/Button";
import { Panel } from "../../components/ui/Panel";
import { ScreenShell } from "../../components/ui/ScreenShell";
import { SectionHeader } from "../../components/ui/SectionHeader";

export interface ShiftResultScreenProps {
    shiftRunId: string;
}

/**
 * Placeholder shift result screen.
 *
 * Later this screen will summarize all ticket attempts inside one completed
 * shift run.
 */
export function ShiftResultScreen({ shiftRunId }: ShiftResultScreenProps) {
    return (
        <ScreenShell
            actions={
                <Link
                    className={buttonClassName({ variant: "primary" })}
                    to="/desk"
                >
                    Return to Case Desk
                </Link>
            }
            description="This route will later show shift score, ticket outcomes, and basic progress analytics."
            eyebrow="Shift Report"
            title="End-of-Shift Summary"
        >
            <Panel tone="raised">
                <SectionHeader
                    eyebrow="Saved Shift Run"
                    meta={
                        <Badge tone="neutral">
                            {shiftRunId || "missing shift run ID"}
                        </Badge>
                    }
                    title="Shift result route is ready"
                />

                <p className="text-sm leading-6 text-rg-muted">
                    Shift progression is not implemented yet. This route exists
                    so the game flow already has a destination for future shift
                    reports.
                </p>
            </Panel>
        </ScreenShell>
    );
}
