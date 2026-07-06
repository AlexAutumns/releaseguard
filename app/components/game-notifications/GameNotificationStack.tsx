import type {
    GameNotification,
    GameNotificationTone,
} from "../../features/game-notifications/game-notification-types";
import { cn } from "../../lib/cn";

export interface GameNotificationStackProps {
    notifications: GameNotification[];
    onDismiss: (fingerprint: string) => void;
    position?: "top-right" | "top-center";
}

/**
 * Returns subtle accent classes for a notification tone.
 *
 * The card itself stays dark for readability across the investigation desk,
 * cork board, and notebook surfaces. Tone is shown through a small accent
 * stripe and label instead of making the whole message yellow/red.
 */
function getToneAccentClassName(tone: GameNotificationTone): string {
    switch (tone) {
        case "success":
            return "border-l-rg-cork";
        case "warning":
            return "border-l-rg-amber";
        case "danger":
            return "border-l-rg-stamp";
        case "info":
        default:
            return "border-l-rg-amber";
    }
}

/**
 * Returns a compact label for a notification tone.
 */
function getToneLabel(tone: GameNotificationTone): string {
    switch (tone) {
        case "success":
            return "Done";
        case "warning":
            return "Notice";
        case "danger":
            return "Blocked";
        case "info":
        default:
            return "Info";
    }
}

/**
 * Returns label text color for the notification tone.
 */
function getToneLabelClassName(tone: GameNotificationTone): string {
    switch (tone) {
        case "success":
            return "text-rg-cork";
        case "warning":
            return "text-rg-amber";
        case "danger":
            return "text-rg-stamp";
        case "info":
        default:
            return "text-rg-amber";
    }
}

/**
 * Top-screen notification stack for temporary in-game feedback.
 *
 * Notifications are intentionally compact and readable over all desk surfaces.
 * They auto-dismiss, can be closed with the X button, and repeated messages
 * merge into one card with a count badge.
 */
export function GameNotificationStack({
    notifications,
    onDismiss,
    position = "top-center",
}: GameNotificationStackProps) {
    if (notifications.length === 0) {
        return null;
    }

    return (
        <section
            aria-label="Game notifications"
            aria-live="polite"
            className={cn(
                "pointer-events-none fixed top-[4.75rem] z-40 flex w-[min(26rem,calc(100vw-1.5rem))] flex-col gap-2",
                position === "top-center"
                    ? "left-1/2 -translate-x-1/2"
                    : "right-3 sm:right-5",
            )}
        >
            {notifications.map((notification) => (
                <article
                    className={cn(
                        "pointer-events-auto relative overflow-visible rounded-2xl border border-rg-border bg-rg-surface/92 px-3.5 py-3 text-rg-text shadow-xl shadow-black/45 backdrop-blur-md",
                        "border-l-4",
                        notification.isLeaving
                            ? "rg-notification-leave"
                            : "rg-notification-enter",
                        getToneAccentClassName(notification.tone),
                    )}
                    key={notification.id}
                >
                    {notification.count > 1 && (
                        <div className="absolute -right-2 -top-2 rounded-full border border-rg-amber bg-rg-amber px-2 py-0.5 font-mono text-[0.65rem] font-black text-rg-night shadow-lg shadow-black/35">
                            ×{notification.count}
                        </div>
                    )}

                    <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                            <p
                                className={cn(
                                    "font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.18em]",
                                    getToneLabelClassName(notification.tone),
                                )}
                            >
                                {getToneLabel(notification.tone)}
                            </p>

                            <h2 className="mt-1 text-sm font-black leading-5 text-rg-text">
                                {notification.title}
                            </h2>

                            <p className="mt-1 text-xs leading-5 text-rg-muted">
                                {notification.message}
                            </p>
                        </div>

                        <button
                            aria-label="Dismiss notification"
                            className="shrink-0 rounded-lg border border-rg-border-soft bg-rg-surface-raised px-2 py-1 font-mono text-xs font-black text-rg-muted transition hover:border-rg-amber/60 hover:text-rg-text"
                            onClick={() => onDismiss(notification.fingerprint)}
                            title="Dismiss notification"
                            type="button"
                        >
                            ×
                        </button>
                    </div>
                </article>
            ))}
        </section>
    );
}
