import type {
    ReleaseVerdict,
    ShiftDefinition,
} from "../../features/content/content-types";
import type { PagedDocumentPage } from "../../features/paged-document/paged-document-types";
import {
    ticketScoreMaxPoints,
    type TicketScoreResult,
} from "../../features/gameplay/scoring/scoring-types";
import type { ShiftRun } from "../../features/gameplay/shift-run/shift-run-types";

/** One submitted ticket row shown in the Shift Result ticket register. */
export interface ShiftTicketRegisterRecord {
    attemptId: string;
    ticketId: string;
    ticketTitle: string;
    totalScore: number;
    maxScore: number;
    selectedVerdict: ReleaseVerdict | null;
    correctVerdict: ReleaseVerdict;
    isVerdictCorrect: boolean;
}

/**
 * Shared fields required by every top-level Shift Result report sheet.
 */
interface ShiftResultPageBase extends PagedDocumentPage {
    label: string;
}

/**
 * First report sheet summarising the completed shift.
 */
export interface ShiftAssessmentPageDescriptor extends ShiftResultPageBase {
    id: "shift-assessment";
    kind: "shift-assessment";
    shiftTitle: string;
    shiftId: string;
    startedAt: string;
    completedAt: string;
    averageScore: number;
    maxScore: number;
    ticketCount: number;
    correctVerdictCount: number;
}

/**
 * Report sheet containing the immutable ticket-level outcomes in authored order.
 */
export interface TicketRegisterPageDescriptor extends ShiftResultPageBase {
    id: "ticket-register";
    kind: "ticket-register";
    tickets: ShiftTicketRegisterRecord[];
}

/**
 * Final report sheet summarising investigation activity and casework exceptions.
 */
export interface ShiftRecordPageDescriptor extends ShiftResultPageBase {
    id: "shift-record";
    kind: "shift-record";
    inspectedEvidenceCount: number;
    pinnedEvidenceCount: number;
    filedFindingCount: number;
    boardConnectionCount: number;
    missedFindingCount: number;
    unsupportedFindingCount: number;
}

/**
 * Three stable top-level Shift Result sheets.
 */
export type ShiftResultPageDescriptor =
    | ShiftAssessmentPageDescriptor
    | TicketRegisterPageDescriptor
    | ShiftRecordPageDescriptor;

/**
 * Inputs used to build one passive Shift Result document.
 */
export interface BuildShiftResultPagesInput {
    shift: ShiftDefinition;
    shiftRun: ShiftRun;
    ticketResults: TicketScoreResult[];
}

/**
 * Derives three passive Shift Result sheets from one completed run and its
 * immutable Ticket Result snapshots.
 *
 * No Shift Result snapshot or second scoring engine is created. Aggregates are
 * presentation data rebuilt from the persisted ticket-level sources of truth.
 */
export function buildShiftResultPages({
    shift,
    shiftRun,
    ticketResults,
}: BuildShiftResultPagesInput): ShiftResultPageDescriptor[] {
    if (!shiftRun.completedAt) {
        throw new Error(
            `Shift Result pages require completed Shift Run "${shiftRun.shiftRunId}".`,
        );
    }

    const ticketCount = ticketResults.length;
    const averageScore =
        ticketCount === 0
            ? 0
            : ticketResults.reduce(
                  (total, result) => total + result.totalScore,
                  0,
              ) / ticketCount;

    return [
        {
            id: "shift-assessment",
            kind: "shift-assessment",
            label: "Assessment",
            shiftTitle: shift.title,
            shiftId: shift.id,
            startedAt: shiftRun.startedAt,
            completedAt: shiftRun.completedAt,
            averageScore,
            maxScore: ticketScoreMaxPoints,
            ticketCount,
            correctVerdictCount: ticketResults.filter(
                (result) => result.isVerdictCorrect,
            ).length,
        },
        {
            id: "ticket-register",
            kind: "ticket-register",
            label: "Tickets",
            tickets: ticketResults.map((result) => ({
                attemptId: result.attemptId,
                ticketId: result.ticketId,
                ticketTitle: result.ticketTitle,
                totalScore: result.totalScore,
                maxScore: result.maxScore,
                selectedVerdict: result.selectedVerdict,
                correctVerdict: result.correctVerdict,
                isVerdictCorrect: result.isVerdictCorrect,
            })),
        },
        {
            id: "shift-record",
            kind: "shift-record",
            label: "Record",
            inspectedEvidenceCount: sumTicketStat(
                ticketResults,
                "inspectedEvidenceCount",
            ),
            pinnedEvidenceCount: sumTicketStat(
                ticketResults,
                "pinnedEvidenceCount",
            ),
            filedFindingCount: sumTicketStat(
                ticketResults,
                "filedFindingCount",
            ),
            boardConnectionCount: sumTicketStat(
                ticketResults,
                "boardConnectionCount",
            ),
            missedFindingCount: ticketResults.reduce(
                (total, result) => total + result.missedFindings.length,
                0,
            ),
            unsupportedFindingCount: ticketResults.reduce(
                (total, result) => total + result.unsupportedFindings.length,
                0,
            ),
        },
    ];
}

type TicketScoreStatKey = keyof TicketScoreResult["stats"];

/**
 * Sums one persisted investigation activity counter across ticket results.
 */
function sumTicketStat(
    ticketResults: TicketScoreResult[],
    statKey: TicketScoreStatKey,
): number {
    return ticketResults.reduce(
        (total, result) => total + result.stats[statKey],
        0,
    );
}
