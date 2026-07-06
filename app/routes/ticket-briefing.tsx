import { useParams } from "react-router";

import {
    getFamilyById,
    getFamilyReferenceById,
    getShiftById,
    getTicketById,
} from "../features/content/content-repository";
import { TicketBriefingScreen } from "../screens/ticket-briefing/TicketBriefingScreen";
import type { Route } from "./+types/ticket-briefing";

/**
 * Metadata for the ticket briefing route.
 */
export function meta({}: Route.MetaArgs) {
    return [
        { title: "ReleaseGuard | Ticket Briefing" },
        {
            name: "description",
            content:
                "Review a release ticket briefing before opening the investigation desk.",
        },
    ];
}

/**
 * Ticket briefing route.
 *
 * This route is not the active gameplay workspace. It lets the player inspect
 * the release ticket context before starting the interactive investigation.
 */
export default function TicketBriefingRoute() {
    const params = useParams();
    const shiftId = params.shiftId ?? "";
    const ticketId = params.ticketId ?? "";

    const shift = getShiftById(shiftId);
    const ticket = getTicketById(ticketId);
    const family = ticket ? getFamilyById(ticket.familyId) : undefined;
    const familyReference = ticket
        ? getFamilyReferenceById(ticket.baselineReferenceId)
        : undefined;

    return (
        <TicketBriefingScreen
            family={family}
            familyReference={familyReference}
            requestedShiftId={shiftId}
            requestedTicketId={ticketId}
            shift={shift}
            ticket={ticket}
        />
    );
}
