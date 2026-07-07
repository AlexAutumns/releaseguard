import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import type {
    ReleaseTicketDefinition,
    ShiftDefinition,
} from "../../features/content/content-types";
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
    | "locked"
    | "available"
    | "in-progress"
    | "completed"
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
 * The controller keeps localStorage access and sequencing decisions outside the
 * physical Desk screen while leaving authored content in the content repository.
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

    const resolvedShiftCards = useMemo<ResolvedDeskShiftCard[]>(() => {
        const shiftRunByShiftId = new Map(
            shiftRuns.map((shiftRun) => [shiftRun.shiftId, shiftRun]),
        );

        return shiftCards.map((shiftCard, index) => {
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

            if (storageStatus === "error") {
                return {
                    ...shiftCard,
                    status: "unavailable",
                };
            }

            const previousShift = shiftCards[index - 1]?.shift;
            const previousShiftRun = previousShift
                ? shiftRunByShiftId.get(previousShift.id)
                : undefined;
            const isUnlocked =
                shiftCard.shift.isUnlockedByDefault ||
                Boolean(previousShiftRun?.completedAt);

            if (!isUnlocked) {
                return {
                    ...shiftCard,
                    status: "locked",
                };
            }

            const shiftRun = shiftRunByShiftId.get(shiftCard.shift.id);

            if (!shiftRun) {
                return {
                    ...shiftCard,
                    status: "available",
                };
            }

            return {
                ...shiftCard,
                status:
                    shiftRun.completedAt === null ? "in-progress" : "completed",
            };
        });
    }, [shiftCards, shiftRuns, storageStatus]);

    const activeShift =
        resolvedShiftCards.find(
            (shiftCard) => shiftCard.status === "in-progress",
        )?.shift ??
        resolvedShiftCards.find((shiftCard) => shiftCard.status === "available")
            ?.shift;

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

        const resolvedShift = resolvedShiftCards.find(
            (shiftCard) => shiftCard.shift.id === shiftId,
        );

        if (!resolvedShift) {
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

        const existingShiftRun = shiftRuns.find(
            (shiftRun) => shiftRun.shiftId === shiftId,
        );

        if (resolvedShift.status === "completed") {
            if (!existingShiftRun) {
                setErrorMessage(
                    `Completed shift "${shiftId}" is missing its Shift Run record.`,
                );
                return;
            }

            navigate(`/results/shift/${existingShiftRun.shiftRunId}`, {
                viewTransition: true,
            });
            return;
        }

        if (existingShiftRun) {
            const nextTicketId = getNextShiftRunTicketId(existingShiftRun);

            if (!nextTicketId) {
                setErrorMessage(
                    `Shift Run "${existingShiftRun.shiftRunId}" has no next ticket and is not marked complete.`,
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
        errorMessage,
        openShift,
        resolvedShiftCards,
    };
}
