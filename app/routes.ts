import { type RouteConfig, index, route } from "@react-router/dev/routes";

/**
 * ReleaseGuard route map.
 *
 * Routes are treated like major game screens:
 * - "/" is the title screen.
 * - "/desk" is the shift desk / hub.
 * - "/play/:shiftId/:ticketId" is the ticket gameplay scene.
 * - result routes show ticket and shift reports.
 *
 * Keep route files thin. Screen-specific UI belongs in app/screens, while
 * reusable systems live in app/features.
 */
export default [
    index("routes/home.tsx"),
    route("desk", "routes/desk.tsx"),
    route("play/:shiftId/:ticketId", "routes/play-ticket.tsx"),
    route("results/ticket/:attemptId", "routes/ticket-result.tsx"),
    route("results/shift/:shiftRunId", "routes/shift-result.tsx"),
] satisfies RouteConfig;
