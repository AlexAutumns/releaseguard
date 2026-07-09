import { Paperclip, Pin, X } from "lucide-react";
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
} from "react";

import { Button } from "../../components/ui/Button";
import type {
    EvidenceAttachmentDefinition,
    EvidenceCardDefinition,
    EvidenceType,
} from "../../features/content/content-types";
import { cn } from "../../lib/cn";

export interface EvidencePreviewDialogProps {
    evidenceCard?: EvidenceCardDefinition;
    isOpen: boolean;
    isPinned: boolean;
    onClose: () => void;
    onPinToBoard: () => void;
}

const evidenceTypeLabelById: Record<EvidenceType, string> = {
    "qa-note": "QA Note",
    "pull-request-comment": "PR Comment",
    "support-ticket": "Support Record",
    "release-note": "Release Note",
};

const dossierTransitionDurationMs = 140;

/**
 * Returns whether ReleaseGuard's explicit reduced-motion mode is active.
 */
function isReducedMotionMode(): boolean {
    return document.documentElement.dataset.rgMotion === "reduced";
}

/**
 * Returns a readable language label for an evidence attachment.
 */
function getAttachmentLanguageLabel(
    attachment: EvidenceAttachmentDefinition,
): string {
    return attachment.language
        ? attachment.language.toUpperCase()
        : attachment.type.toUpperCase();
}

/**
 * Renders one attachment inside the evidence dossier.
 *
 * Code and log artifacts retain their authored line structure and own both
 * horizontal and vertical scrolling through the shared technical scrollbar.
 * Note attachments remain normal document copy on the dossier sheet.
 */
function EvidenceAttachmentView({
    attachment,
}: {
    attachment: EvidenceAttachmentDefinition;
}) {
    const isCodeLike = attachment.type === "code" || attachment.type === "log";

    return (
        <section className="min-w-0 border-t border-rg-folder-dark/35 pt-4 first:border-t-0 first:pt-0">
            <div className="flex min-w-0 items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="rg-document-meta-label break-words text-rg-paper-ink">
                        {attachment.title}
                    </p>

                    <p className="mt-1 font-mono text-[0.6rem] font-extrabold uppercase tracking-[0.12em] text-rg-paper-ink/65">
                        Attachment / {getAttachmentLanguageLabel(attachment)}
                    </p>
                </div>

                <Paperclip
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-rg-folder-dark/70"
                    strokeWidth={2}
                />
            </div>

            {isCodeLike ? (
                <div className="rg-technical-surface mt-3 min-w-0 overflow-hidden rounded-[0.22rem] border border-rg-paper-ink/70">
                    <div className="rg-code-scrollbar max-h-72 max-w-full sm:max-h-80">
                        <pre className="m-0 w-max min-w-full p-4 font-mono text-xs leading-6 text-rg-paper">
                            <code className="block whitespace-pre">
                                {attachment.body}
                            </code>
                        </pre>
                    </div>
                </div>
            ) : (
                <p className="rg-document-copy mt-3 whitespace-pre-wrap break-words text-rg-paper-ink/88">
                    {attachment.body}
                </p>
            )}
        </section>
    );
}

/**
 * Evidence dossier for one authored evidence file.
 *
 * The dialog owns only inspection presentation and the existing pin/close
 * actions. Its fixed header and action footer frame one vertically scrolling
 * document body; technical attachments keep their own x/y scroll region.
 *
 * Full motion uses a restrained 140ms opacity/scale transition. Closing is
 * delayed only long enough to finish that local presentation; reduced motion
 * commits the existing close action immediately.
 */
export function EvidencePreviewDialog({
    evidenceCard,
    isOpen,
    isPinned,
    onClose,
    onPinToBoard,
}: EvidencePreviewDialogProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [usesReducedMotion, setUsesReducedMotion] = useState(false);
    const closeTimerRef = useRef<number | null>(null);

    const requestClose = useCallback(() => {
        if (isClosing) {
            return;
        }

        if (isReducedMotionMode()) {
            onClose();
            return;
        }

        setIsClosing(true);
        setIsVisible(false);

        closeTimerRef.current = window.setTimeout(() => {
            closeTimerRef.current = null;
            onClose();
        }, dossierTransitionDurationMs);
    }, [isClosing, onClose]);

    useEffect(() => {
        if (!isOpen || !evidenceCard) {
            setIsVisible(false);
            setIsClosing(false);
            return;
        }

        const reducedMotion = isReducedMotionMode();
        setUsesReducedMotion(reducedMotion);
        setIsClosing(false);

        if (reducedMotion) {
            setIsVisible(true);
            return;
        }

        setIsVisible(false);

        const frameId = window.requestAnimationFrame(() => {
            setIsVisible(true);
        });

        return () => {
            window.cancelAnimationFrame(frameId);
        };
    }, [evidenceCard, isOpen]);

    useEffect(() => {
        return () => {
            if (closeTimerRef.current !== null) {
                window.clearTimeout(closeTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                requestClose();
            }
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, requestClose]);

    if (!isOpen || !evidenceCard) {
        return null;
    }

    const attachments = evidenceCard.attachments ?? [];
    const transitionStyle: CSSProperties | undefined = usesReducedMotion
        ? undefined
        : {
              transitionDuration: `${dossierTransitionDurationMs}ms`,
          };

    return (
        <div
            aria-labelledby="rg-evidence-dossier-title"
            aria-modal="true"
            className="fixed inset-0 z-50 grid place-items-center overflow-hidden p-2 sm:p-4 lg:p-5"
            role="dialog"
        >
            <div
                aria-hidden="true"
                className={cn(
                    "absolute inset-0 bg-rg-night/82 backdrop-blur-sm transition-opacity ease-out",
                    usesReducedMotion && "transition-none",
                    isVisible ? "opacity-100" : "opacity-0",
                )}
                style={transitionStyle}
            />

            <button
                aria-label="Close evidence dossier"
                className="absolute inset-0 cursor-default"
                disabled={isClosing}
                onClick={requestClose}
                type="button"
            />

            <article
                className={cn(
                    "rg-paper-sheet rg-paper-sheet--03 relative z-10 grid max-h-[94dvh] min-h-0 w-[min(96vw,72rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden text-rg-paper-ink shadow-2xl shadow-black/75",
                    "transform-gpu transition-[opacity,transform] ease-out",
                    usesReducedMotion && "transition-none",
                    isVisible
                        ? "translate-y-0 scale-100 opacity-100"
                        : "translate-y-1 scale-[0.985] opacity-0",
                )}
                style={transitionStyle}
            >
                <header className="shrink-0 border-b-2 border-rg-folder-dark/45 px-4 py-3 sm:px-6 sm:py-4 lg:px-7">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="font-case text-[0.7rem] font-bold uppercase tracking-[0.12em] text-rg-paper-ink/75">
                                Evidence Dossier
                            </p>

                            <h2
                                className="mt-1 break-words font-case text-2xl font-bold leading-[1.05] text-rg-paper-ink sm:text-3xl"
                                id="rg-evidence-dossier-title"
                            >
                                {evidenceCard.title}
                            </h2>
                        </div>

                        <Button
                            aria-label="Close evidence dossier"
                            className="h-8 w-8 shrink-0 px-0"
                            disabled={isClosing}
                            onClick={requestClose}
                            size="sm"
                            title="Close evidence dossier"
                            variant="secondary"
                        >
                            <X
                                aria-hidden="true"
                                className="h-4 w-4"
                                strokeWidth={2.2}
                            />
                        </Button>
                    </div>
                </header>

                <main className="rg-scrollbar min-h-0 min-w-0 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 lg:px-7 lg:py-5">
                    <dl className="grid grid-cols-2 border-y-2 border-rg-folder-dark/40 md:grid-cols-4">
                        <DossierField
                            label="Source"
                            value={evidenceCard.source}
                        />
                        <DossierField
                            label="Type"
                            value={evidenceTypeLabelById[evidenceCard.type]}
                        />
                        <DossierField
                            label="Attachments"
                            value={String(attachments.length).padStart(2, "0")}
                        />
                        <DossierField
                            label="Board"
                            tone={isPinned ? "stamp" : "normal"}
                            value={isPinned ? "Pinned" : "Not Pinned"}
                        />
                    </dl>

                    <section className="mt-5 min-w-0">
                        <p className="rg-document-meta-label text-rg-paper-ink/76">
                            Evidence Statement
                        </p>

                        <p className="rg-document-copy mt-3 whitespace-pre-wrap break-words text-rg-paper-ink">
                            {evidenceCard.body}
                        </p>
                    </section>

                    <section className="mt-6 min-w-0 border-t-2 border-rg-folder-dark/42 pt-4">
                        <div className="flex items-end justify-between gap-4">
                            <p className="rg-document-meta-label text-rg-paper-ink/76">
                                Attachments
                            </p>

                            <span className="font-mono text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-rg-paper-ink/65">
                                {attachments.length} item
                                {attachments.length === 1 ? "" : "s"}
                            </span>
                        </div>

                        {attachments.length > 0 ? (
                            <div className="mt-4 grid min-w-0 gap-5">
                                {attachments.map((attachment) => (
                                    <EvidenceAttachmentView
                                        attachment={attachment}
                                        key={attachment.id}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="rg-document-copy mt-3 border-l-2 border-rg-folder-dark/35 pl-3 text-rg-paper-ink/70">
                                No technical attachments are filed with this
                                evidence record.
                            </p>
                        )}
                    </section>
                </main>

                <footer className="shrink-0 border-t-2 border-rg-folder-dark/45 bg-rg-folder-dark/8 px-4 py-3 sm:px-6 lg:px-7">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <p className="max-w-2xl font-case text-xs font-bold leading-5 text-rg-paper-ink/70">
                            Review the complete statement and any attached
                            technical record before filing it on the Board.
                        </p>

                        <div className="flex shrink-0 flex-wrap justify-end gap-2">
                            <Button
                                disabled={isPinned || isClosing}
                                onClick={onPinToBoard}
                                size="sm"
                                title={
                                    isPinned
                                        ? "This evidence is already pinned."
                                        : "Pin this evidence to the Board."
                                }
                                variant="secondary"
                            >
                                <Pin
                                    aria-hidden="true"
                                    className="h-4 w-4"
                                    strokeWidth={2.2}
                                />

                                {isPinned ? "Pinned" : "Pin to Board"}
                            </Button>

                            <Button
                                disabled={isClosing}
                                onClick={requestClose}
                                size="sm"
                                variant="primary"
                            >
                                Done Inspecting
                            </Button>
                        </div>
                    </div>
                </footer>
            </article>
        </div>
    );
}

interface DossierFieldProps {
    label: string;
    tone?: "normal" | "stamp";
    value: string;
}

/**
 * One pre-printed docket field in the evidence dossier metadata register.
 */
function DossierField({ label, tone = "normal", value }: DossierFieldProps) {
    return (
        <div className="min-w-0 border-r border-rg-folder-dark/30 px-3 py-3 last:border-r-0 md:px-4">
            <dt className="rg-document-meta-label text-rg-paper-ink/66">
                {label}
            </dt>

            <dd
                className={
                    tone === "stamp"
                        ? "mt-1 font-case text-sm font-bold uppercase tracking-[0.04em] text-rg-stamp-dark"
                        : "rg-document-meta-value mt-1 break-words text-rg-paper-ink"
                }
            >
                {value}
            </dd>
        </div>
    );
}
