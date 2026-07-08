import type { ShiftDefinition } from "../../content/content-types";
import { ruleFail, ruleOk, type RuleResult } from "../shared/rule-result";
import {
    getIncompleteShiftRun,
    getLatestCompletedShiftRunByShiftId,
    getNextShiftRunTicketId,
} from "../shift-run/shift-run-rules";
import type { ShiftRun } from "../shift-run/shift-run-types";
import type {
    LocalShiftProgress,
    ResolvedLocalProgress,
} from "./local-progress-types";

/**
 * Inputs used to derive ReleaseGuard's completed-checkpoint progression state.
 */
export interface ResolveLocalProgressInput {
    shifts: ShiftDefinition[];
    shiftRuns: ShiftRun[];
}

/**
 * Derives local progression from authored shift order and persisted Shift Runs.
 *
 * Completed shift IDs, latest completed runs, unlock state, the active incomplete
 * run, and the next playable ticket are derived rather than saved separately.
 * This prevents duplicate progress indexes from drifting away from Shift Run
 * history and keeps the model ready for multiple completed replay runs later.
 */
export function resolveLocalProgress({
    shifts,
    shiftRuns,
}: ResolveLocalProgressInput): RuleResult<ResolvedLocalProgress> {
    const orderedShifts = [...shifts].sort(
        (left, right) => left.sequence - right.sequence,
    );
    const authoredShiftIds = new Set(orderedShifts.map((shift) => shift.id));
    const unavailableShiftRun = shiftRuns.find(
        (shiftRun) => !authoredShiftIds.has(shiftRun.shiftId),
    );

    if (unavailableShiftRun) {
        return ruleFail(
            "local-progress:missing-authored-shift",
            `Saved Shift Run "${unavailableShiftRun.shiftRunId}" references unavailable shift "${unavailableShiftRun.shiftId}".`,
            "error",
        );
    }

    const incompleteShiftRuns = shiftRuns.filter(
        (shiftRun) => shiftRun.completedAt === null,
    );

    if (incompleteShiftRuns.length > 1) {
        return ruleFail(
            "local-progress:multiple-active-shift-runs",
            "Saved progression contains more than one incomplete Shift Run. Continue Case cannot choose an unambiguous active case.",
            "error",
        );
    }

    const activeShiftRun = getIncompleteShiftRun(shiftRuns);
    const nextIncompleteTicketId = activeShiftRun
        ? getNextShiftRunTicketId(activeShiftRun)
        : null;

    if (activeShiftRun && !nextIncompleteTicketId) {
        return ruleFail(
            "local-progress:active-run-missing-next-ticket",
            `Incomplete Shift Run "${activeShiftRun.shiftRunId}" has no next ticket to resume.`,
            "error",
        );
    }

    const completedShiftIds = orderedShifts
        .filter((shift) =>
            shiftRuns.some(
                (shiftRun) =>
                    shiftRun.shiftId === shift.id &&
                    shiftRun.completedAt !== null,
            ),
        )
        .map((shift) => shift.id);
    const completedShiftIdSet = new Set(completedShiftIds);

    const resolvedShifts: LocalShiftProgress[] = orderedShifts.map(
        (shift, index) => {
            const previousShift = orderedShifts[index - 1];
            const isUnlocked =
                shift.isUnlockedByDefault ||
                Boolean(
                    previousShift && completedShiftIdSet.has(previousShift.id),
                );
            const activeRunForShift =
                activeShiftRun?.shiftId === shift.id ? activeShiftRun : null;
            const latestCompletedShiftRun = getLatestCompletedShiftRunByShiftId(
                shiftRuns,
                shift.id,
            );

            if (activeRunForShift) {
                return {
                    shiftId: shift.id,
                    status: "in-progress",
                    activeShiftRun: activeRunForShift,
                    latestCompletedShiftRun,
                };
            }

            if (latestCompletedShiftRun) {
                return {
                    shiftId: shift.id,
                    status: "completed",
                    activeShiftRun: null,
                    latestCompletedShiftRun,
                };
            }

            return {
                shiftId: shift.id,
                status: isUnlocked ? "available" : "locked",
                activeShiftRun: null,
                latestCompletedShiftRun: null,
            };
        },
    );

    return ruleOk({
        activeShiftRun,
        completedShiftIds,
        latestCompletedShiftRuns: resolvedShifts.flatMap((shiftProgress) =>
            shiftProgress.latestCompletedShiftRun
                ? [shiftProgress.latestCompletedShiftRun]
                : [],
        ),
        nextIncompleteTicketId,
        nextAvailableShiftId:
            resolvedShifts.find(
                (shiftProgress) => shiftProgress.status === "available",
            )?.shiftId ?? null,
        shifts: resolvedShifts,
    });
}
