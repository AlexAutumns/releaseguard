import { useEffect, useState } from "react";

import { getAllShifts } from "../../features/content/content-repository";
import { resolveLocalProgress } from "../../features/gameplay/progress/local-progress-rules";
import { loadShiftRuns } from "../../features/gameplay/shift-run/shift-run-storage";

/**
 * Client-side Continue Case lifecycle shown by the ReleaseGuard title screen.
 */
export type ContinueCaseStatus = "checking" | "ready" | "unavailable";

/**
 * Resolved title-screen destination for completed-checkpoint progression.
 */
export interface ContinueCaseState {
    status: ContinueCaseStatus;
    destination: string | null;
    message: string;
}

/**
 * Resolves Continue Case after browser storage becomes available.
 *
 * ReleaseGuard currently resumes the next incomplete ticket briefing. It does
 * not claim to restore a live board, Evidence Threads, draft finding, modal, or
 * active investigation tool from an unfinished ticket.
 */
export function useTitleController(): ContinueCaseState {
    const [continueCaseState, setContinueCaseState] =
        useState<ContinueCaseState>({
            status: "checking",
            destination: null,
            message: "Checking locally saved shift progression.",
        });

    useEffect(() => {
        const shiftRunsResult = loadShiftRuns();

        if (!shiftRunsResult.ok) {
            setContinueCaseState({
                status: "unavailable",
                destination: null,
                message: shiftRunsResult.message,
            });
            return;
        }

        const shifts = getAllShifts();
        const progressResult = resolveLocalProgress({
            shifts,
            shiftRuns: shiftRunsResult.value,
        });

        if (!progressResult.ok) {
            setContinueCaseState({
                status: "unavailable",
                destination: null,
                message: progressResult.issue.message,
            });
            return;
        }

        const { activeShiftRun, nextIncompleteTicketId } = progressResult.value;

        if (activeShiftRun && nextIncompleteTicketId) {
            const activeShift = shifts.find(
                (shift) => shift.id === activeShiftRun.shiftId,
            );

            setContinueCaseState({
                status: "ready",
                destination: `/tickets/${activeShiftRun.shiftId}/${nextIncompleteTicketId}`,
                message: activeShift
                    ? `Resume ${activeShift.title} at its next incomplete ticket briefing.`
                    : "Resume the next incomplete ticket briefing.",
            });
            return;
        }

        setContinueCaseState({
            status: "ready",
            destination: "/desk",
            message:
                "No shift is currently incomplete. Continue Case opens the Case Desk.",
        });
    }, []);

    return continueCaseState;
}
