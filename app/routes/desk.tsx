import {
    getAllShifts,
    getTicketsForShift,
} from "../features/content/content-repository";
import { DeskScreen } from "../screens/desk/DeskScreen";
import type { Route } from "./+types/desk";

/**
 * Metadata for the shift desk route.
 */
export function meta({}: Route.MetaArgs) {
    return [
        { title: "ReleaseGuard | Shift Desk" },
        {
            name: "description",
            content: "Choose a ReleaseGuard shift and begin reviewing tickets.",
        },
    ];
}

/**
 * Shift desk route.
 *
 * The route collects content from the repository and passes a simple view model
 * to the screen. This keeps raw content loading out of the screen component.
 */
export default function DeskRoute() {
    const shiftCards = getAllShifts().map((shift) => ({
        shift,
        tickets: getTicketsForShift(shift.id),
    }));

    return <DeskScreen shiftCards={shiftCards} />;
}
