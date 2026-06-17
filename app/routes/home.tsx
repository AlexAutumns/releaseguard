import { TitleScreen } from "../screens/title/TitleScreen";
import type { Route } from "./+types/home";

/**
 * Metadata for the title screen route.
 */
export function meta({}: Route.MetaArgs) {
    return [
        { title: "ReleaseGuard" },
        {
            name: "description",
            content:
                "ReleaseGuard is a gamified software release-risk investigation simulator.",
        },
    ];
}

/**
 * Index route for the application.
 *
 * This route intentionally stays thin. The title screen UI lives in
 * app/screens/title/TitleScreen.tsx so this route does not become the whole app.
 */
export default function HomeRoute() {
    return <TitleScreen />;
}
