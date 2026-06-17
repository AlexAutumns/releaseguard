import { useParams } from "react-router";

import {
    getFamilyById,
    getFamilyReferenceById,
    getShiftById,
    getTicketById,
} from "../features/content/content-repository";
import { PlayTicketScreen } from "../screens/play-ticket/PlayTicketScreen";
import type { Route } from "./+types/play-ticket";

/**
 * Metadata for the play-ticket route.
 */
export function meta({}: Route.MetaArgs) {
    return [
        { title: "ReleaseGuard | Ticket Review" },
        {
            name: "description",
            content: "Review a release ticket and prepare a release verdict.",
        },
    ];
}

/**
 * Ticket gameplay route.
 *
 * This route reads the route parameters, resolves content through the
 * repository, and passes the resolved data into the play-ticket screen.
 */
export default function PlayTicketRoute() {
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
        <PlayTicketScreen
            family={family}
            familyReference={familyReference}
            requestedShiftId={shiftId}
            requestedTicketId={ticketId}
            shift={shift}
            ticket={ticket}
        />
    );
}
