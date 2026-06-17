import { useParams } from "react-router";

import { ShiftResultScreen } from "../screens/shift-result/ShiftResultScreen";
import type { Route } from "./+types/shift-result";

/**
 * Metadata for the shift result route.
 */
export function meta({}: Route.MetaArgs) {
    return [
        { title: "ReleaseGuard | Shift Result" },
        {
            name: "description",
            content: "Review the summary of a completed ReleaseGuard shift.",
        },
    ];
}

/**
 * Shift result route.
 *
 * Real shift run loading will be added after shift progression and save data
 * exist.
 */
export default function ShiftResultRoute() {
    const params = useParams();

    return <ShiftResultScreen shiftRunId={params.shiftRunId ?? ""} />;
}
