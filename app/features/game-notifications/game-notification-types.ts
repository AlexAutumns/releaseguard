/**
 * Visual tone for in-game notifications.
 *
 * Notifications are UI feedback, not saved gameplay progress. They can be used
 * for tool warnings, save confirmations, scoring feedback, tutorial hints, and
 * other future game events.
 */
export type GameNotificationTone = "info" | "success" | "warning" | "danger";

/**
 * One notification currently shown in the game notification stack.
 */
export interface GameNotification {
    id: string;
    fingerprint: string;
    title: string;
    message: string;
    tone: GameNotificationTone;
    count: number;
    createdAt: string;
    isLeaving: boolean;
}

/**
 * Input used when pushing a new notification.
 */
export interface PushGameNotificationInput {
    title: string;
    message: string;
    tone?: GameNotificationTone;
    fingerprint?: string;
    durationMs?: number;
}
