import { useParams } from "react-router";

import {
    getFamilyById,
    getFamilyReferenceById,
    getShiftById,
    getTicketById,
} from "../features/content/content-repository";
import { InvestigationScreen } from "../screens/investigation/InvestigationScreen";
import type { Route } from "./+types/investigation";

/**
 * Metadata for the active investigation route.
 */
export function meta({}: Route.MetaArgs) {
    return [
        { title: "ReleaseGuard | Investigation Desk" },
        {
            name: "description",
            content:
                "Use the investigation desk to inspect evidence, pin clues, file findings, and prepare a verdict.",
        },
    ];
}

/**
 * Active investigation route.
 *
 * This is the gameplay workspace. The route resolves authored content, while
 * gameplay state will be added in the next builds.
 */
export default function InvestigationRoute() {
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
        <InvestigationScreen
            family={family}
            familyReference={familyReference}
            requestedShiftId={shiftId}
            requestedTicketId={ticketId}
            shift={shift}
            ticket={ticket}
        />
    );
}
