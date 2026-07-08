import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import type {
    ReleaseTicketDefinition,
    ShiftDefinition,
} from "../../features/content/content-types";
import { resolveLocalProgress } from "../../features/gameplay/progress/local-progress-rules";
import type { LocalShiftProgressStatus } from "../../features/gameplay/progress/local-progress-types";
import {
    createShiftRun,
    getNextShiftRunTicketId,
} from "../../features/gameplay/shift-run/shift-run-rules";
import {
    loadShiftRuns,
    saveShiftRun,
} from "../../features/gameplay/shift-run/shift-run-storage";
import type { ShiftRun } from "../../features/gameplay/shift-run/shift-run-types";

/**
 * Authored shift content supplied to the Case Desk.
 */
export interface DeskShiftCard {
    shift: ShiftDefinition;
    tickets: ReleaseTicketDefinition[];
}

/**
 * Player-facing lifecycle state for one authored shift folder.
 */
export type DeskShiftStatus =
    | "checking"
    | LocalShiftProgressStatus
    | "unavailable";

/**
 * Shift folder with progression state derived from persisted Shift Runs.
 */
export interface ResolvedDeskShiftCard extends DeskShiftCard {
    status: DeskShiftStatus;
}

/**
 * Resolves Case Desk shift state and owns start/resume/completed navigation.
 *
 * Browser progression is loaded after mount because the app is server-rendered.
 * The controller delegates progression interpretation to the shared local
 * progress resolver so the Desk and Continue Case do not maintain separate
 * definitions of active, completed, unlocked, or latest historical runs.
 */
export function useDeskController(shiftCards: DeskShiftCard[]) {
    const navigate = useNavigate();
    const [shiftRuns, setShiftRuns] = useState<ShiftRun[]>([]);
    const [storageStatus, setStorageStatus] = useState<
        "checking" | "ready" | "error"
    >("checking");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const result = loadShiftRuns();

        if (!result.ok) {
            setStorageStatus("error");
            setErrorMessage(result.message);
            return;
        }

        setShiftRuns(result.value);
        setStorageStatus("ready");
    }, []);

    const progressResult = useMemo(() => {
        if (storageStatus !== "ready") {
            return null;
        }

        return resolveLocalProgress({
            shifts: shiftCards.map((shiftCard) => shiftCard.shift),
            shiftRuns,
        });
    }, [shiftCards, shiftRuns, storageStatus]);

    const resolvedShiftCards = useMemo<ResolvedDeskShiftCard[]>(() => {
        return shiftCards.map((shiftCard) => {
            if (shiftCard.tickets.length === 0) {
                return {
                    ...shiftCard,
                    status: "unavailable",
                };
            }

            if (storageStatus === "checking") {
                return {
                    ...shiftCard,
                    status: "checking",
                };
            }

            if (
                storageStatus === "error" ||
                !progressResult ||
                !progressResult.ok
            ) {
                return {
                    ...shiftCard,
                    status: "unavailable",
                };
            }

            const shiftProgress = progressResult.value.shifts.find(
                (item) => item.shiftId === shiftCard.shift.id,
            );

            return {
                ...shiftCard,
                status: shiftProgress?.status ?? "unavailable",
            };
        });
    }, [progressResult, shiftCards, storageStatus]);

    const activeShift =
        resolvedShiftCards.find(
            (shiftCard) => shiftCard.status === "in-progress",
        )?.shift ??
        resolvedShiftCards.find((shiftCard) => shiftCard.status === "available")
            ?.shift;
    const resolvedErrorMessage =
        errorMessage ??
        (progressResult && !progressResult.ok
            ? progressResult.issue.message
            : null);

    /**
     * Opens the correct destination for one authored shift lifecycle state.
     */
    function openShift(shiftId: string): void {
        setErrorMessage(null);

        if (storageStatus !== "ready") {
            setErrorMessage(
                storageStatus === "error"
                    ? "Shift progression is unavailable until the saved Shift Run data can be read."
                    : "The Case Desk is still checking saved shift progression.",
            );
            return;
        }

        if (!progressResult || !progressResult.ok) {
            setErrorMessage(
                progressResult?.issue.message ??
                    "Shift progression could not be resolved.",
            );
            return;
        }

        const resolvedShift = resolvedShiftCards.find(
            (shiftCard) => shiftCard.shift.id === shiftId,
        );
        const shiftProgress = progressResult.value.shifts.find(
            (item) => item.shiftId === shiftId,
        );

        if (!resolvedShift || !shiftProgress) {
            setErrorMessage(`Shift "${shiftId}" could not be resolved.`);
            return;
        }

        if (
            resolvedShift.status === "locked" ||
            resolvedShift.status === "unavailable" ||
            resolvedShift.status === "checking"
        ) {
            return;
        }

        if (shiftProgress.status === "completed") {
            if (!shiftProgress.latestCompletedShiftRun) {
                setErrorMessage(
                    `Completed shift "${shiftId}" is missing its latest completed Shift Run record.`,
                );
                return;
            }

            navigate(
                `/results/shift/${shiftProgress.latestCompletedShiftRun.shiftRunId}`,
                {
                    viewTransition: true,
                },
            );
            return;
        }

        if (shiftProgress.status === "in-progress") {
            if (!shiftProgress.activeShiftRun) {
                setErrorMessage(
                    `In-progress shift "${shiftId}" is missing its active Shift Run record.`,
                );
                return;
            }

            const nextTicketId = getNextShiftRunTicketId(
                shiftProgress.activeShiftRun,
            );

            if (!nextTicketId) {
                setErrorMessage(
                    `Shift Run "${shiftProgress.activeShiftRun.shiftRunId}" has no next ticket and is not marked complete.`,
                );
                return;
            }

            navigate(`/tickets/${shiftId}/${nextTicketId}`, {
                viewTransition: true,
            });
            return;
        }

        const newShiftRun = createShiftRun({
            shiftId,
            orderedTicketIds: resolvedShift.shift.ticketIds,
        });
        const saveResult = saveShiftRun(newShiftRun);

        if (!saveResult.ok) {
            setErrorMessage(saveResult.message);
            return;
        }

        const firstTicketId = getNextShiftRunTicketId(saveResult.value);

        if (!firstTicketId) {
            setErrorMessage(
                `Shift "${shiftId}" could not resolve its first assigned ticket.`,
            );
            return;
        }

        navigate(`/tickets/${shiftId}/${firstTicketId}`, {
            viewTransition: true,
        });
    }

    return {
        activeShift,
        errorMessage: resolvedErrorMessage,
        openShift,
        resolvedShiftCards,
    };
}
