import { useParams } from "react-router";

import { TicketResultScreen } from "../screens/ticket-result/TicketResultScreen";
import type { Route } from "./+types/ticket-result";

/**
 * Metadata for the ticket result route.
 */
export function meta({}: Route.MetaArgs) {
    return [
        { title: "ReleaseGuard | Ticket Result" },
        {
            name: "description",
            content: "Review the result of a submitted release ticket attempt.",
        },
    ];
}

/**
 * Ticket result route.
 *
 * Real attempt loading will be added once the local save repository exists.
 */
export default function TicketResultRoute() {
    const params = useParams();

    return <TicketResultScreen attemptId={params.attemptId ?? ""} />;
}
