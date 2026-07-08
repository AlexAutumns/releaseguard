import { useEffect, useRef, type ChangeEvent } from "react";

import { Button } from "../../components/ui/Button";
import type { PortableSaveSummary } from "../../features/gameplay/save/portable-save-types";
import { useDeskFileController } from "./useDeskFileController";

/**
 * Case Desk controls for exporting and replacing the local portable desk file.
 */
export function DeskFileControls() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const {
        cancelDeskFileImport,
        confirmDeskFileImport,
        exportDeskFile,
        isBusy,
        message,
        operation,
        pendingImport,
        prepareDeskFileImport,
    } = useDeskFileController();

    /**
     * Reads one chosen file and immediately clears the native input value.
     *
     * Clearing the value lets the player select the same rejected file again
     * after fixing it without the browser suppressing a duplicate change event.
     */
    async function handleFileChange(
        event: ChangeEvent<HTMLInputElement>,
    ): Promise<void> {
        const file = event.currentTarget.files?.[0];

        event.currentTarget.value = "";

        if (file) {
            await prepareDeskFileImport(file);
        }
    }

    return (
        <section className="rg-paper-sheet rg-paper-sheet--03 rounded-md p-6 text-rg-paper-ink">
            <p className="rg-folder-tab-label text-rg-paper-ink/78">
                Desk File
            </p>

            <h2 className="rg-display-heading mt-3 text-3xl text-rg-paper-ink">
                Local Progress Copy
            </h2>

            <p className="rg-document-copy mt-4 text-rg-paper-ink/88">
                Export the current shift checkpoints and filed Ticket Reports as
                a portable JSON desk file. A validated import replaces the local
                desk file only after confirmation; saves are never silently
                merged.
            </p>

            <input
                accept=".json,application/json"
                className="sr-only"
                onChange={handleFileChange}
                ref={fileInputRef}
                type="file"
            />

            <div className="rg-document-rule mt-6 flex flex-wrap gap-3 pt-5">
                <Button
                    disabled={isBusy}
                    onClick={exportDeskFile}
                    variant="primary"
                >
                    {operation === "exporting"
                        ? "Preparing Desk File"
                        : "Export Desk File"}
                </Button>

                <Button
                    disabled={isBusy}
                    onClick={() => fileInputRef.current?.click()}
                    variant="secondary"
                >
                    {operation === "reading-import"
                        ? "Reading Desk File"
                        : "Import Desk File"}
                </Button>
            </div>

            {message && (
                <div
                    aria-live="polite"
                    className={`mt-5 border-l-2 px-4 py-3 ${
                        message.tone === "danger"
                            ? "border-rg-danger bg-rg-danger/8"
                            : "border-rg-success bg-rg-success/8"
                    }`}
                    role={message.tone === "danger" ? "alert" : "status"}
                >
                    <p
                        className={`rg-technical-label ${
                            message.tone === "danger"
                                ? "text-rg-danger"
                                : "text-rg-success"
                        }`}
                    >
                        {message.title}
                    </p>

                    <p className="rg-document-copy mt-2 text-sm text-rg-paper-ink/82">
                        {message.message}
                    </p>
                </div>
            )}

            {pendingImport && (
                <DeskImportConfirmationDialog
                    isBusy={operation === "replacing"}
                    onCancel={cancelDeskFileImport}
                    onConfirm={confirmDeskFileImport}
                    summary={pendingImport.summary}
                />
            )}
        </section>
    );
}

interface DeskImportConfirmationDialogProps {
    summary: PortableSaveSummary;
    isBusy: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

/**
 * Shows the validated import summary before destructive local replacement.
 *
 * The native modal dialog gives the confirmation a real browser interaction
 * boundary without introducing a generic application-wide modal framework.
 */
function DeskImportConfirmationDialog({
    summary,
    isBusy,
    onCancel,
    onConfirm,
}: DeskImportConfirmationDialogProps) {
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
            aria-labelledby="desk-import-title"
            className="m-auto w-[min(92vw,42rem)] border-0 bg-transparent p-0 text-rg-paper-ink shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-sm"
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
                    Validated Desk File
                </p>

                <h2
                    className="rg-display-heading mt-3 text-3xl text-rg-paper-ink"
                    id="desk-import-title"
                >
                    Replace Local Progress?
                </h2>

                <p className="rg-document-copy mt-4 text-rg-paper-ink/86">
                    The selected file passed ReleaseGuard save validation.
                    Review its summary before replacing the Shift Runs and
                    Ticket Reports currently stored in this browser.
                </p>

                <dl className="rg-document-rule mt-6 grid gap-4 pt-5 sm:grid-cols-2">
                    <DeskFileSummaryField
                        label="Shift Runs"
                        value={String(summary.shiftRunCount)}
                    />

                    <DeskFileSummaryField
                        label="Completed Runs"
                        value={String(summary.completedRunCount)}
                    />

                    <DeskFileSummaryField
                        label="Completed Shifts"
                        value={String(summary.completedShiftCount)}
                    />

                    <DeskFileSummaryField
                        label="Ticket Reports"
                        value={String(summary.ticketResultCount)}
                    />

                    <DeskFileSummaryField
                        label="Active Shift"
                        value={summary.activeShiftTitle ?? "None"}
                    />

                    <DeskFileSummaryField
                        label="Last Activity"
                        value={formatDeskFileDateTime(summary.updatedAt)}
                    />
                </dl>

                <div className="mt-6 border-l-2 border-rg-danger bg-rg-danger/8 px-4 py-3">
                    <p className="rg-technical-label text-rg-danger">
                        Replace-Only Import
                    </p>

                    <p className="rg-document-copy mt-2 text-sm text-rg-paper-ink/84">
                        This does not merge saves. Current local Shift Runs and
                        filed Ticket Reports will be replaced. Authored tickets,
                        evidence, answer keys, and other game content are not
                        imported from the file.
                    </p>
                </div>

                <div className="rg-document-rule mt-6 flex flex-wrap justify-end gap-3 pt-5">
                    <Button
                        disabled={isBusy}
                        onClick={onCancel}
                        variant="secondary"
                    >
                        Keep Current Progress
                    </Button>

                    <Button
                        disabled={isBusy}
                        onClick={onConfirm}
                        variant="danger"
                    >
                        {isBusy
                            ? "Replacing Local Progress"
                            : "Replace Local Progress"}
                    </Button>
                </div>
            </div>
        </dialog>
    );
}

interface DeskFileSummaryFieldProps {
    label: string;
    value: string;
}

/**
 * One typed summary field in the validated desk-file confirmation sheet.
 */
function DeskFileSummaryField({ label, value }: DeskFileSummaryFieldProps) {
    return (
        <div>
            <dt className="rg-document-meta-label text-rg-paper-ink/72">
                {label}
            </dt>

            <dd className="rg-document-meta-value mt-1 break-words text-rg-paper-ink/94">
                {value}
            </dd>
        </div>
    );
}

/**
 * Formats a validated portable-save timestamp for the local browser locale.
 *
 * The confirmation dialog only exists after a client-side file selection, so
 * browser locale formatting cannot create an SSR hydration mismatch here.
 */
function formatDeskFileDateTime(isoValue: string): string {
    const date = new Date(isoValue);

    return Number.isNaN(date.getTime()) ? isoValue : date.toLocaleString();
}
