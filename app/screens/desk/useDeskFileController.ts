import { useCallback, useState } from "react";

import { getContentCatalog } from "../../features/content/content-repository";
import {
    createValidatedPortableSaveSnapshot,
    replaceLocalProgressWithPortableSave,
} from "../../features/gameplay/save/portable-save-storage";
import type {
    ReleaseGuardSaveEnvelope,
    ValidatedPortableSave,
} from "../../features/gameplay/save/portable-save-types";
import { parseAndValidatePortableSave } from "../../features/gameplay/save/portable-save-validator";

const portableSaveMaxFileSizeBytes = 5 * 1024 * 1024;

/**
 * Active Case Desk file-management operation.
 */
export type DeskFileOperation =
    | "idle"
    | "exporting"
    | "reading-import"
    | "replacing";

/**
 * Player-facing result of one Desk file-management operation.
 */
export interface DeskFileMessage {
    tone: "success" | "danger";
    title: string;
    message: string;
}

/**
 * Owns Case Desk export/import interaction state around the portable-save core.
 *
 * User-selected JSON is parsed and deeply validated before confirmation. Local
 * progression is replaced only after the player explicitly confirms the
 * validated summary; import never silently merges with the existing desk file.
 */
export function useDeskFileController() {
    const [operation, setOperation] = useState<DeskFileOperation>("idle");
    const [message, setMessage] = useState<DeskFileMessage | null>(null);
    const [pendingImport, setPendingImport] =
        useState<ValidatedPortableSave | null>(null);

    const isBusy = operation !== "idle";

    /**
     * Builds, validates, and downloads the current portable desk-file snapshot.
     */
    const exportDeskFile = useCallback((): void => {
        setOperation("exporting");
        setMessage(null);

        try {
            const result =
                createValidatedPortableSaveSnapshot(getContentCatalog());

            if (!result.ok) {
                setMessage({
                    tone: "danger",
                    title: "Desk file could not be exported",
                    message: result.message,
                });

                return;
            }

            downloadPortableSave(result.value.envelope);

            setMessage({
                tone: "success",
                title: "Desk file exported",
                message: `Saved ${result.value.summary.shiftRunCount} shift run${
                    result.value.summary.shiftRunCount === 1 ? "" : "s"
                } and ${result.value.summary.ticketResultCount} filed ticket report${
                    result.value.summary.ticketResultCount === 1 ? "" : "s"
                } to a portable JSON file.`,
            });
        } catch {
            setMessage({
                tone: "danger",
                title: "Desk file could not be exported",
                message:
                    "The browser could not prepare the portable desk file download.",
            });
        } finally {
            setOperation("idle");
        }
    }, []);

    /**
     * Reads and deeply validates one selected JSON file without replacing data.
     */
    const prepareDeskFileImport = useCallback(
        async (file: File): Promise<void> => {
            setOperation("reading-import");
            setMessage(null);
            setPendingImport(null);

            try {
                if (file.size > portableSaveMaxFileSizeBytes) {
                    setMessage({
                        tone: "danger",
                        title: "Desk file rejected",
                        message:
                            "The selected file is larger than 5 MB. ReleaseGuard portable saves are small JSON records and oversized files are not read.",
                    });

                    return;
                }

                const rawText = await file.text();
                const result = parseAndValidatePortableSave(
                    rawText,
                    getContentCatalog(),
                );

                if (!result.ok) {
                    setMessage({
                        tone: "danger",
                        title: "Desk file rejected",
                        message: result.issue.message,
                    });

                    return;
                }

                setPendingImport(result.value);
            } catch {
                setMessage({
                    tone: "danger",
                    title: "Desk file could not be read",
                    message:
                        "The browser could not read the selected JSON file.",
                });
            } finally {
                setOperation("idle");
            }
        },
        [],
    );

    /**
     * Closes the validated-import confirmation without changing local progress.
     */
    const cancelDeskFileImport = useCallback((): void => {
        if (operation === "replacing") {
            return;
        }

        setPendingImport(null);
    }, [operation]);

    /**
     * Replaces local progression with the currently validated imported save.
     */
    const confirmDeskFileImport = useCallback((): void => {
        if (!pendingImport || operation !== "idle") {
            return;
        }

        setOperation("replacing");
        setMessage(null);

        const result = replaceLocalProgressWithPortableSave(pendingImport);

        if (!result.ok) {
            setOperation("idle");
            setMessage({
                tone: "danger",
                title: "Desk file could not be imported",
                message: result.message,
            });

            return;
        }

        setPendingImport(null);

        window.location.reload();
    }, [operation, pendingImport]);

    return {
        cancelDeskFileImport,
        confirmDeskFileImport,
        exportDeskFile,
        isBusy,
        message,
        operation,
        pendingImport,
        prepareDeskFileImport,
    };
}

/**
 * Downloads one already validated portable save envelope as formatted JSON.
 */
function downloadPortableSave(envelope: ReleaseGuardSaveEnvelope): void {
    if (typeof document === "undefined" || typeof window === "undefined") {
        throw new Error("Portable save download requires a browser document.");
    }

    const blob = new Blob([`${JSON.stringify(envelope, null, 2)}\n`], {
        type: "application/json;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = objectUrl;
    anchor.download = createPortableSaveFileName(envelope.exportedAt);
    anchor.hidden = true;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
    }, 0);
}

/**
 * Creates a filesystem-safe timestamped name for one exported desk file.
 */
function createPortableSaveFileName(exportedAt: string): string {
    const safeTimestamp = exportedAt
        .replace(/\.\d{3}Z$/, "Z")
        .replace(/[^0-9A-Za-z]/g, "");

    return `releaseguard-desk-file-${safeTimestamp}.json`;
}
