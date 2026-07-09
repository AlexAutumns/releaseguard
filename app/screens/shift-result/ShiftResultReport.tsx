import { useEffect, useRef } from "react";
import { Link } from "react-router";

import { FiledReport } from "../../components/report/FiledReport";
import { Button, buttonClassName } from "../../components/ui/Button";
import { ScreenShell } from "../../components/ui/ScreenShell";
import type { ShiftDefinition } from "../../features/content/content-types";
import type { TicketScoreResult } from "../../features/gameplay/scoring/scoring-types";
import type { ShiftRun } from "../../features/gameplay/shift-run/shift-run-types";
import { ShiftAssessmentPage } from "./pages/ShiftAssessmentPage";
import { ShiftRecordPage } from "./pages/ShiftRecordPage";
import { TicketRegisterPage } from "./pages/TicketRegisterPage";
import {
    buildShiftResultPages,
    type ShiftResultPageDescriptor,
} from "./shift-result-pages";
import { formatShiftDateTime } from "./shift-result-formatters";
import { useShiftReplayController } from "./useShiftReplayController";

export interface ShiftResultReportProps {
    shift: ShiftDefinition;
    shiftRun: ShiftRun;
    ticketResults: TicketScoreResult[];
}

/**
 * Adapts one completed Shift Run and its Ticket Results to FiledReport.
 */
export function ShiftResultReport({
    shift,
    shiftRun,
    ticketResults,
}: ShiftResultReportProps) {
    if (!shiftRun.completedAt) {
        throw new Error(
            `Shift Result report requires completed Shift Run "${shiftRun.shiftRunId}".`,
        );
    }

    const pages = buildShiftResultPages({
        shift,
        shiftRun,
        ticketResults,
    });
    const replayController = useShiftReplayController(shift);

    return (
        <ScreenShell>
            <FiledReport
                actions={
                    <>
                        <Button
                            onClick={replayController.requestReplay}
                            variant="secondary"
                        >
                            Replay Shift
                        </Button>

                        <Link
                            className={buttonClassName({
                                variant: "primary",
                            })}
                            to="/desk"
                            viewTransition
                        >
                            Return to Case Desk
                        </Link>
                    </>
                }
                eyebrow="Filed Shift Report"
                getPageLabel={(page) => page.label}
                initialPageId="shift-assessment"
                pages={pages}
                register={
                    <>
                        <span>{ticketResults.length} tickets filed</span>

                        <span>
                            Closed {formatShiftDateTime(shiftRun.completedAt)}
                        </span>
                    </>
                }
                renderPage={renderShiftResultPage}
                title={shift.title}
            />

            {replayController.isReplayConfirmationOpen && (
                <ReplayShiftConfirmationDialog
                    errorMessage={replayController.errorMessage}
                    isBusy={replayController.isStartingReplay}
                    onCancel={replayController.cancelReplay}
                    onConfirm={replayController.confirmReplay}
                    shiftTitle={shift.title}
                />
            )}
        </ScreenShell>
    );
}

interface ReplayShiftConfirmationDialogProps {
    errorMessage: string | null;
    isBusy: boolean;
    onCancel: () => void;
    onConfirm: () => void;
    shiftTitle: string;
}

/**
 * Confirms creation of a fresh Shift Run without mutating the filed report that
 * opened the replay action.
 */
function ReplayShiftConfirmationDialog({
    errorMessage,
    isBusy,
    onCancel,
    onConfirm,
    shiftTitle,
}: ReplayShiftConfirmationDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;

        if (!dialog || dialog.open) {
            return;
        }

        dialog.showModal();

        return () => {
            if (dialog.open) {
                dialog.close();
            }
        };
    }, []);

    return (
        <dialog
            aria-labelledby="replay-shift-title"
            className="m-auto w-[min(92vw,40rem)] border-0 bg-transparent p-0 text-rg-paper-ink shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-sm"
            onCancel={(event) => {
                event.preventDefault();

                if (!isBusy) {
                    onCancel();
                }
            }}
            ref={dialogRef}
        >
            <div className="rg-paper-sheet rg-paper-sheet--04 rounded-md p-6 sm:p-7">
                <p className="rg-folder-tab-label text-rg-paper-ink/78">
                    Shift Replay
                </p>

                <h2
                    className="rg-display-heading mt-3 text-3xl text-rg-paper-ink"
                    id="replay-shift-title"
                >
                    Replay {shiftTitle}?
                </h2>

                <p className="rg-document-copy mt-4 text-rg-paper-ink/86">
                    A fresh Shift Run will begin from the first assigned ticket.
                    This filed Shift Report and every Ticket Report from the
                    completed run will remain unchanged.
                </p>

                <div className="mt-6 border-l-2 border-rg-amber bg-rg-amber/8 px-4 py-3">
                    <p className="rg-technical-label text-rg-amber">
                        New Run, Preserved Record
                    </p>

                    <p className="rg-document-copy mt-2 text-sm text-rg-paper-ink/84">
                        New submissions create new attempt records. They do not
                        replace scores or verdicts stored in this historical
                        shift run.
                    </p>
                </div>

                {errorMessage && (
                    <div
                        className="mt-5 border-l-2 border-rg-danger bg-rg-danger/8 px-4 py-3"
                        role="alert"
                    >
                        <p className="rg-technical-label text-rg-danger">
                            Replay Could Not Start
                        </p>

                        <p className="rg-document-copy mt-2 text-sm text-rg-paper-ink/84">
                            {errorMessage}
                        </p>
                    </div>
                )}

                <div className="rg-document-rule mt-6 flex flex-wrap justify-end gap-3 pt-5">
                    <Button
                        disabled={isBusy}
                        onClick={onCancel}
                        variant="secondary"
                    >
                        Keep This Record
                    </Button>

                    <Button
                        disabled={isBusy}
                        onClick={onConfirm}
                        variant="primary"
                    >
                        {isBusy ? "Starting Replay" : "Replay Shift"}
                    </Button>
                </div>
            </div>
        </dialog>
    );
}

/**
 * Renders one top-level Shift Result sheet through exhaustive narrowing.
 */
function renderShiftResultPage(page: ShiftResultPageDescriptor) {
    switch (page.kind) {
        case "shift-assessment":
            return <ShiftAssessmentPage page={page} />;

        case "ticket-register":
            return <TicketRegisterPage page={page} />;

        case "shift-record":
            return <ShiftRecordPage page={page} />;

        default:
            return assertNever(page);
    }
}

/**
 * Compile-time exhaustiveness guard for Shift Result page kinds.
 */
function assertNever(value: never): never {
    throw new Error(`Unhandled Shift Result page: ${JSON.stringify(value)}`);
}
