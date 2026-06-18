import { useCallback, useEffect, useRef, useState } from "react";

import type {
    GameNotification,
    PushGameNotificationInput,
} from "./game-notification-types";

const DEFAULT_NOTIFICATION_DURATION_MS = 4200;
const DEFAULT_NOTIFICATION_LIMIT = 4;
const EXIT_ANIMATION_MS = 180;

/**
 * Options for the game notification queue.
 */
export interface UseGameNotificationsOptions {
    defaultDurationMs?: number;
    limit?: number;
}

/**
 * Result returned by the game notification hook.
 */
export interface UseGameNotificationsResult {
    notifications: GameNotification[];
    pushNotification: (input: PushGameNotificationInput) => void;
    dismissNotification: (fingerprint: string) => void;
    clearNotifications: () => void;
}

/**
 * Creates a fallback fingerprint for notifications that do not provide one.
 */
function createNotificationFingerprint(
    input: PushGameNotificationInput,
): string {
    return `${input.tone ?? "info"}:${input.title}:${input.message}`;
}

/**
 * UI-only notification queue for game feedback.
 *
 * Repeated notifications with the same fingerprint are merged and displayed
 * with an incrementing count. Auto-dismiss timers reset when the same
 * notification repeats, so repeated feedback does not spam the stack.
 */
export function useGameNotifications({
    defaultDurationMs = DEFAULT_NOTIFICATION_DURATION_MS,
    limit = DEFAULT_NOTIFICATION_LIMIT,
}: UseGameNotificationsOptions = {}): UseGameNotificationsResult {
    const [notifications, setNotifications] = useState<GameNotification[]>([]);
    const timersRef = useRef<Record<string, number>>({});
    const sequenceRef = useRef(0);

    const dismissNotification = useCallback((fingerprint: string) => {
        window.clearTimeout(timersRef.current[fingerprint]);
        delete timersRef.current[fingerprint];

        setNotifications((currentNotifications) =>
            currentNotifications.map((notification) =>
                notification.fingerprint === fingerprint
                    ? {
                          ...notification,
                          isLeaving: true,
                      }
                    : notification,
            ),
        );

        window.setTimeout(() => {
            setNotifications((currentNotifications) =>
                currentNotifications.filter(
                    (notification) =>
                        notification.fingerprint !== fingerprint ||
                        !notification.isLeaving,
                ),
            );
        }, EXIT_ANIMATION_MS);
    }, []);

    const scheduleDismiss = useCallback(
        (fingerprint: string, durationMs: number) => {
            window.clearTimeout(timersRef.current[fingerprint]);

            timersRef.current[fingerprint] = window.setTimeout(() => {
                dismissNotification(fingerprint);
            }, durationMs);
        },
        [dismissNotification],
    );

    const pushNotification = useCallback(
        (input: PushGameNotificationInput) => {
            const fingerprint =
                input.fingerprint ?? createNotificationFingerprint(input);
            const createdAt = new Date().toISOString();

            sequenceRef.current += 1;

            setNotifications((currentNotifications) => {
                const existingNotification = currentNotifications.find(
                    (notification) => notification.fingerprint === fingerprint,
                );

                if (existingNotification) {
                    return currentNotifications.map((notification) =>
                        notification.fingerprint === fingerprint
                            ? {
                                  ...notification,
                                  count: notification.count + 1,
                                  createdAt,
                                  isLeaving: false,
                              }
                            : notification,
                    );
                }

                const nextNotification: GameNotification = {
                    id: `game-notification-${sequenceRef.current}`,
                    fingerprint,
                    title: input.title,
                    message: input.message,
                    tone: input.tone ?? "info",
                    count: 1,
                    createdAt,
                    isLeaving: false,
                };

                return [nextNotification, ...currentNotifications].slice(
                    0,
                    limit,
                );
            });

            scheduleDismiss(fingerprint, input.durationMs ?? defaultDurationMs);
        },
        [defaultDurationMs, limit, scheduleDismiss],
    );

    const clearNotifications = useCallback(() => {
        Object.values(timersRef.current).forEach((timerId) => {
            window.clearTimeout(timerId);
        });

        timersRef.current = {};
        setNotifications([]);
    }, []);

    useEffect(() => {
        return () => {
            Object.values(timersRef.current).forEach((timerId) => {
                window.clearTimeout(timerId);
            });
        };
    }, []);

    return {
        notifications,
        pushNotification,
        dismissNotification,
        clearNotifications,
    };
}
