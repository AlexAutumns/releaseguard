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
 * Compact three-zone register for the active Investigation desk.
 *
 * Navigation and status remain content-sized. The case identity owns flexible
 * horizontal space and separates the desk register from the active ticket title
 * so both remain readable without increasing the HUD's height.
 */
export function InvestigationHud({ shift, ticket }: InvestigationHudProps) {
    return (
        <header className="rg-investigation-hud mb-2 grid min-h-12 min-w-0 grid-cols-[max-content_minmax(0,1fr)_max-content] items-center gap-2 px-2.5 py-1.5">
            <nav
                aria-label="Investigation navigation"
                className="flex min-w-max items-center gap-1.5"
            >
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
            </nav>

            <div className="flex min-w-0 items-center gap-4 border-l border-rg-border px-3">
                <p className="rg-technical-label shrink-0 truncate text-[0.72rem] leading-none text-rg-amber">
                    {shift.title}
                </p>

                <h1 className="rg-display-heading min-w-0 truncate text-[0.9rem] leading-none text-rg-text sm:text-[0.95rem]">
                    {ticket.title}
                </h1>
            </div>

            <div className="flex min-w-max flex-nowrap items-center justify-end gap-1.5">
                <span className="rg-register-field">
                    D{ticket.difficulty}/5
                </span>

                <span className="rg-register-field">
                    {ticket.evidenceCards.length} files
                </span>

                <Badge kind="state" surface="dark" tone="warning">
                    Verdict pending
                </Badge>
            </div>
        </header>
    );
}
