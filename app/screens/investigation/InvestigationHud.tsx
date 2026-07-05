import { Link } from "react-router";

import { Badge } from "../../components/ui/Badge";
import { buttonClassName } from "../../components/ui/Button";
import type {
    ReleaseTicketDefinition,
    ShiftDefinition,
} from "../../features/content/content-types";

export interface InvestigationHudProps {
    shift: ShiftDefinition;
    ticket: ReleaseTicketDefinition;
}

/**
 * Compact top HUD for the active investigation workspace.
 *
 * Route navigation and ticket identity remain visible without stealing board
 * space from the gameplay desk. Machine-generated ticket metadata uses register
 * fields, while semantic gameplay state uses the shared Badge marker contract.
 */
export function InvestigationHud({ shift, ticket }: InvestigationHudProps) {
    return (
        <header className="mb-2 flex min-h-12 shrink-0 items-center gap-2 rounded-2xl border border-rg-border bg-rg-surface/92 px-2.5 py-2 shadow-xl shadow-black/35">
            <div className="flex shrink-0 items-center gap-2">
                <Link
                    className={buttonClassName({
                        variant: "ghost",
                        size: "sm",
                        className: "h-8 px-2.5",
                    })}
                    to={`/tickets/${shift.id}/${ticket.id}`}
                >
                    ← Briefing
                </Link>

                <Link
                    className={buttonClassName({
                        variant: "ghost",
                        size: "sm",
                        className: "h-8 px-2.5",
                    })}
                    to="/desk"
                >
                    Desk
                </Link>
            </div>

            <div className="min-w-0 flex-1 border-l border-rg-border-soft pl-3">
                <p className="font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-rg-amber">
                    {shift.title}
                </p>

                <h1 className="truncate text-sm font-black tracking-[-0.03em] text-rg-text sm:text-base">
                    {ticket.title}
                </h1>
            </div>

            <div className="hidden shrink-0 flex-wrap gap-1.5 md:flex">
                <span className="rg-register-field">
                    D{ticket.difficulty}/5
                </span>

                <span className="rg-register-field">
                    {ticket.evidenceCards.length} evidence
                </span>

                <Badge kind="state" surface="dark" tone="warning">
                    Verdict pending
                </Badge>
            </div>
        </header>
    );
}
