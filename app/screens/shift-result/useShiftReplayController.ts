import { useCallback, useState } from "react";
import { useNavigate } from "react-router";

import type { ShiftDefinition } from "../../features/content/content-types";
import {
    createShiftRun,
    getNextShiftRunTicketId,
} from "../../features/gameplay/shift-run/shift-run-rules";
import {
    loadIncompleteShiftRun,
    saveShiftRun,
} from "../../features/gameplay/shift-run/shift-run-storage";

/**
 * Shift Result replay controller state exposed to the report presentation.
 */
export interface ShiftReplayController {
    cancelReplay: () => void;
    confirmReplay: () => void;
    errorMessage: string | null;
    isReplayConfirmationOpen: boolean;
    isStartingReplay: boolean;
    requestReplay: () => void;
}

/**
 * Coordinates the minimal replay flow for one completed authored shift.
 *
 * Replay creates a fresh Shift Run using the authored ticket order, preserves
 * every historical completed run and Ticket Result, then opens the first ticket
 * briefing. The existing Shift Run repository remains the owner of the global
 * single-incomplete-run invariant.
 */
export function useShiftReplayController(
    shift: ShiftDefinition,
): ShiftReplayController {
    const navigate = useNavigate();
    const [isReplayConfirmationOpen, setIsReplayConfirmationOpen] =
        useState(false);
    const [isStartingReplay, setIsStartingReplay] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const requestReplay = useCallback(() => {
        setErrorMessage(null);
        setIsReplayConfirmationOpen(true);
    }, []);

    const cancelReplay = useCallback(() => {
        if (isStartingReplay) {
            return;
        }

        setErrorMessage(null);
        setIsReplayConfirmationOpen(false);
    }, [isStartingReplay]);

    const confirmReplay = useCallback(() => {
        if (isStartingReplay) {
            return;
        }

        setIsStartingReplay(true);
        setErrorMessage(null);

        const activeShiftRunResult = loadIncompleteShiftRun();

        if (!activeShiftRunResult.ok) {
            setErrorMessage(activeShiftRunResult.message);
            setIsStartingReplay(false);
            return;
        }

        if (activeShiftRunResult.value) {
            setErrorMessage(
                `Shift "${activeShiftRunResult.value.shiftId}" already has an active run. Continue the current case before starting a replay.`,
            );
            setIsStartingReplay(false);
            return;
        }

        const replayShiftRun = createShiftRun({
            shiftId: shift.id,
            orderedTicketIds: shift.ticketIds,
        });
        const saveResult = saveShiftRun(replayShiftRun);

        if (!saveResult.ok) {
            setErrorMessage(saveResult.message);
            setIsStartingReplay(false);
            return;
        }

        const firstTicketId = getNextShiftRunTicketId(saveResult.value);

        if (!firstTicketId) {
            setErrorMessage(
                `Shift "${shift.id}" could not resolve its first assigned ticket.`,
            );
            setIsStartingReplay(false);
            return;
        }

        navigate(`/tickets/${shift.id}/${firstTicketId}`, {
            viewTransition: true,
        });
    }, [isStartingReplay, navigate, shift.id, shift.ticketIds]);

    return {
        cancelReplay,
        confirmReplay,
        errorMessage,
        isReplayConfirmationOpen,
        isStartingReplay,
        requestReplay,
    };
}
