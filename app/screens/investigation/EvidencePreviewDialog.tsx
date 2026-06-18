import { useEffect } from "react";

import type {
    EvidenceAttachmentDefinition,
    EvidenceCardDefinition,
} from "../../features/content/content-types";

export interface EvidencePreviewDialogProps {
    evidenceCard?: EvidenceCardDefinition;
    isOpen: boolean;
    isPinned: boolean;
    onClose: () => void;
    onPinToBoard: () => void;
}

/**
 * Returns a readable language label for an evidence attachment.
 */
function getAttachmentLanguageLabel(
    attachment: EvidenceAttachmentDefinition,
): string {
    return attachment.language
        ? attachment.language.toUpperCase()
        : attachment.type;
}

/**
 * Renders one evidence attachment.
 *
 * Code and log attachments use a dedicated scroll container that allows both
 * vertical and horizontal scrolling. This keeps long code lines intact without
 * stretching the evidence modal.
 */
function EvidenceAttachmentView({
    attachment,
}: {
    attachment: EvidenceAttachmentDefinition;
}) {
    const isCodeLike = attachment.type === "code" || attachment.type === "log";

    if (!isCodeLike) {
        return (
            <section className="min-w-0 rounded-2xl border border-rg-folder-dark/30 bg-rg-folder/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-rg-folder-dark">
                        {attachment.title}
                    </p>

                    <span className="rounded-md border border-rg-folder-dark/45 bg-rg-folder-dark/16 px-2.5 py-1 font-mono text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-rg-folder-dark">
                        {attachment.type}
                    </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-rg-paper-muted">
                    {attachment.body}
                </p>
            </section>
        );
    }

    return (
        <section className="min-w-0 rounded-2xl border border-dashed border-rg-folder-dark/30 bg-rg-folder/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-rg-folder-dark">
                    {attachment.title}
                </p>

                <span className="rounded-md border border-rg-folder-dark/45 bg-rg-folder-dark/16 px-2.5 py-1 font-mono text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-rg-folder-dark">
                    {getAttachmentLanguageLabel(attachment)}
                </span>
            </div>

            <p className="mt-2 text-sm leading-6 text-rg-paper-muted">
                Technical evidence is shown in a locked code window. Scroll
                inside the code window if the snippet is wider or longer than
                the visible area.
            </p>

            <div className="mt-3 min-w-0 max-w-full overflow-hidden rounded-xl border border-rg-folder-dark/25 bg-rg-paper-ink">
                <div className="rg-code-scrollbar max-h-72 max-w-full sm:max-h-80">
                    <pre className="m-0 w-max min-w-full p-4 font-mono text-xs leading-6 text-rg-paper">
                        <code className="block whitespace-pre">
                            {attachment.body}
                        </code>
                    </pre>
                </div>
            </div>
        </section>
    );
}

/**
 * Evidence inspection popup for the investigation workspace.
 *
 * This modal reads authored evidence content and exposes the first real
 * gameplay action: pinning evidence to the board.
 */
export function EvidencePreviewDialog({
    evidenceCard,
    isOpen,
    isPinned,
    onClose,
    onPinToBoard,
}: EvidencePreviewDialogProps) {
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onClose();
            }
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen || !evidenceCard) {
        return null;
    }

    const attachments = evidenceCard.attachments ?? [];

    return (
        <div
            aria-modal="true"
            className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-rg-night/82 p-2 backdrop-blur-sm sm:p-4 lg:p-5"
            role="dialog"
        >
            <button
                aria-label="Close evidence preview"
                className="absolute inset-0 cursor-default"
                onClick={onClose}
                type="button"
            />

            <article className="relative z-10 grid max-h-[94dvh] min-h-0 w-[min(96vw,72rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-3xl border border-rg-folder-dark bg-rg-paper text-rg-paper-ink shadow-2xl shadow-black/75 sm:min-h-[560px] lg:min-h-[620px]">
                <div className="rg-paper-grain pointer-events-none absolute inset-0 opacity-45" />

                <header className="relative z-10 shrink-0 border-b border-rg-folder-dark/35 px-4 py-3 sm:px-6 sm:py-4 lg:px-7">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="font-mono text-[0.66rem] font-extrabold uppercase tracking-[0.22em] text-rg-folder-dark sm:text-[0.7rem]">
                                Evidence File
                            </p>

                            <h2 className="mt-2 break-words text-2xl font-black leading-none tracking-[-0.05em] text-rg-paper-ink sm:text-3xl lg:text-4xl">
                                {evidenceCard.title}
                            </h2>

                            <p className="mt-3 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-rg-paper-muted sm:text-xs">
                                Source: {evidenceCard.source}
                            </p>
                        </div>

                        <button
                            className="shrink-0 rounded-xl border border-rg-folder-dark bg-rg-paper-ink px-3 py-2 text-sm font-bold text-rg-paper hover:bg-rg-folder-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rg-folder-dark sm:px-4"
                            onClick={onClose}
                            type="button"
                        >
                            Close
                        </button>
                    </div>
                </header>

                <div className="relative z-10 grid min-h-0 min-w-0 overflow-hidden lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
                    <aside className="min-h-0 min-w-0 border-b border-rg-folder-dark/25 bg-rg-folder/12 px-4 py-3 sm:px-6 lg:border-b-0 lg:border-r lg:py-4">
                        <p className="font-mono text-[0.66rem] font-extrabold uppercase tracking-[0.22em] text-rg-folder-dark">
                            File Details
                        </p>

                        <dl className="mt-4 grid gap-4 text-sm">
                            <div className="min-w-0">
                                <dt className="font-mono text-[0.65rem] font-extrabold uppercase tracking-[0.16em] text-rg-paper-muted">
                                    Evidence Type
                                </dt>
                                <dd className="mt-1 break-words font-bold text-rg-paper-ink">
                                    {evidenceCard.type}
                                </dd>
                            </div>

                            <div className="min-w-0">
                                <dt className="font-mono text-[0.65rem] font-extrabold uppercase tracking-[0.16em] text-rg-paper-muted">
                                    Risk Hints
                                </dt>
                                <dd className="mt-2 flex flex-wrap gap-2">
                                    {evidenceCard.riskHints.map((riskHint) => (
                                        <span
                                            className="rounded-md border border-rg-folder-dark/45 bg-rg-folder-dark/16 px-2.5 py-1 font-mono text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-rg-folder-dark"
                                            key={riskHint}
                                        >
                                            {riskHint}
                                        </span>
                                    ))}
                                </dd>
                            </div>

                            <div className="min-w-0">
                                <dt className="font-mono text-[0.65rem] font-extrabold uppercase tracking-[0.16em] text-rg-paper-muted">
                                    Attachments
                                </dt>
                                <dd className="mt-1 font-bold text-rg-paper-ink">
                                    {attachments.length}
                                </dd>
                            </div>

                            <div className="min-w-0">
                                <dt className="font-mono text-[0.65rem] font-extrabold uppercase tracking-[0.16em] text-rg-paper-muted">
                                    Current Status
                                </dt>
                                <dd className="mt-2">
                                    <span className="rounded-md border border-rg-stamp/45 bg-rg-stamp/10 px-2.5 py-1 font-mono text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-rg-stamp">
                                        {isPinned ? "Pinned" : "Not pinned"}
                                    </span>
                                </dd>
                            </div>
                        </dl>
                    </aside>

                    <main className="rg-scrollbar min-h-0 min-w-0 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 lg:px-7 lg:py-5">
                        <section className="min-w-0">
                            <p className="font-mono text-[0.68rem] font-extrabold uppercase tracking-[0.22em] text-rg-folder-dark">
                                Evidence Body
                            </p>

                            <div className="mt-3 min-w-0 rounded-2xl border border-rg-folder-dark/30 bg-rg-paper-strong/58 p-4 shadow-inner shadow-rg-paper-ink/5 sm:p-5">
                                <p className="whitespace-pre-wrap break-words text-[0.94rem] leading-7 text-rg-paper-ink sm:text-[0.98rem] sm:leading-8">
                                    {evidenceCard.body}
                                </p>
                            </div>
                        </section>

                        <section className="mt-5 min-w-0">
                            <p className="font-mono text-[0.68rem] font-extrabold uppercase tracking-[0.22em] text-rg-folder-dark">
                                Attachments
                            </p>

                            {attachments.length > 0 ? (
                                <div className="mt-3 grid min-w-0 gap-4">
                                    {attachments.map((attachment) => (
                                        <EvidenceAttachmentView
                                            attachment={attachment}
                                            key={attachment.id}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-3 rounded-2xl border border-dashed border-rg-folder-dark/30 bg-rg-folder/10 p-4">
                                    <p className="text-sm leading-6 text-rg-paper-muted">
                                        This evidence file has no technical
                                        attachments.
                                    </p>
                                </div>
                            )}
                        </section>
                    </main>
                </div>

                <footer className="relative z-10 shrink-0 border-t border-rg-folder-dark/35 bg-rg-folder/10 px-4 py-3 sm:px-6 lg:px-7">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <p className="max-w-2xl text-sm leading-6 text-rg-paper-muted">
                            Inspect the evidence under the desk light, then
                            decide whether it belongs on the board.
                        </p>

                        <div className="flex shrink-0 flex-wrap justify-end gap-2">
                            <button
                                className="rounded-xl border border-rg-folder-dark/45 bg-rg-folder-dark/14 px-4 py-2 text-sm font-bold text-rg-folder-dark disabled:opacity-60"
                                disabled={isPinned}
                                onClick={onPinToBoard}
                                title={
                                    isPinned
                                        ? "This evidence is already pinned."
                                        : "Pin this evidence to the board."
                                }
                                type="button"
                            >
                                {isPinned ? "Pinned" : "◇ Pin to Board"}
                            </button>

                            <button
                                className="rounded-xl border border-rg-amber bg-rg-amber px-4 py-2 text-sm font-bold text-rg-night shadow-lg shadow-rg-amber/15 hover:bg-rg-paper-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rg-folder-dark"
                                onClick={onClose}
                                type="button"
                            >
                                Done Inspecting
                            </button>
                        </div>
                    </div>
                </footer>
            </article>
        </div>
    );
}
