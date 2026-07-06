import { Cable, Scissors, X } from "lucide-react";
import type { ReactNode } from "react";

import type { EvidenceThreadColorId } from "../../features/gameplay/board/board-state";
import {
    evidenceThreadColorCatalog,
    type ConnectInteractionState,
    type ConnectToolMode,
} from "../../features/gameplay/connect/connect-state";
import { cn } from "../../lib/cn";
import { threadColorVisuals } from "./thread-style";

export interface ConnectToolTrayProps {
    connectInteraction: ConnectInteractionState;
    isConnectArmed: boolean;
    pendingAnchorLabel: string | null;
    pinnedCount: number;
    segmentCount: number;
    onArmMode: (mode: ConnectToolMode) => void;
    onClearAnchor: () => void;
    onSetThreadId: (threadId: EvidenceThreadColorId) => void;
}

/**
 * Compact Connect overlay tray.
 *
 * Centered above the main tool rack so it stays close to the primary toolbar.
 */
export function ConnectToolTray({
    connectInteraction,
    isConnectArmed,
    pendingAnchorLabel,
    pinnedCount,
    segmentCount,
    onArmMode,
    onClearAnchor,
    onSetThreadId,
}: ConnectToolTrayProps) {
    const statusText = getConnectStatusText({
        activeMode: connectInteraction.activeMode,
        isConnectArmed,
        pendingAnchorLabel,
        pinnedCount,
    });

    return (
        <section className="absolute bottom-full left-1/2 z-40 mb-1.5 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl border border-rg-border bg-rg-surface/96 px-3 py-2 shadow-2xl shadow-black/45 backdrop-blur">
            <div className="flex flex-wrap items-center justify-center gap-2.5">
                <div className="flex min-w-[13rem] shrink-0 items-center gap-2">
                    <Cable
                        aria-hidden="true"
                        className="h-4 w-4 text-rg-amber"
                        strokeWidth={2.4}
                    />

                    <div className="min-w-0">
                        <p className="font-mono text-[0.58rem] font-extrabold uppercase leading-3 tracking-[0.18em] text-rg-amber">
                            Connect
                        </p>

                        <p className="max-w-[20rem] truncate text-[0.68rem] leading-4 text-rg-muted">
                            {statusText}
                        </p>
                    </div>
                </div>

                <div className="hidden h-7 w-px bg-rg-border-soft sm:block" />

                <div className="flex shrink-0 rounded-xl border border-rg-border-soft bg-rg-surface-raised p-1">
                    <ModeButton
                        icon={<Cable className="h-3.5 w-3.5" />}
                        isActive={
                            isConnectArmed &&
                            connectInteraction.activeMode === "string"
                        }
                        label="String"
                        mode="string"
                        onArmMode={onArmMode}
                    />

                    <ModeButton
                        icon={<Scissors className="h-3.5 w-3.5" />}
                        isActive={
                            isConnectArmed &&
                            connectInteraction.activeMode === "scissors"
                        }
                        label="Cut"
                        mode="scissors"
                        onArmMode={onArmMode}
                    />
                </div>

                <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-rg-border-soft bg-rg-surface-raised px-2 py-1.5">
                    {evidenceThreadColorCatalog.map((threadColor) => {
                        const isActive =
                            threadColor.id ===
                            connectInteraction.activeThreadId;
                        const visual = threadColorVisuals[threadColor.id];

                        return (
                            <button
                                aria-label={`Use ${threadColor.label} thread`}
                                className={cn(
                                    "h-5.5 w-5.5 rounded-full border transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rg-amber",
                                    isActive
                                        ? "border-rg-text"
                                        : "border-rg-border-soft",
                                )}
                                key={threadColor.id}
                                onClick={() => onSetThreadId(threadColor.id)}
                                style={{
                                    backgroundColor: visual.stroke,
                                    boxShadow: isActive
                                        ? `0 0 0 2px ${visual.stroke}55`
                                        : undefined,
                                }}
                                title={threadColor.description}
                                type="button"
                            />
                        );
                    })}
                </div>

                {connectInteraction.pendingAnchorPinnedEvidenceId && (
                    <button
                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl border border-rg-border-soft bg-rg-surface-raised px-2.5 text-xs font-bold text-rg-muted transition hover:border-rg-amber/60 hover:bg-rg-surface-soft hover:text-rg-text"
                        onClick={onClearAnchor}
                        title="Clear only the current string anchor."
                        type="button"
                    >
                        <X aria-hidden="true" className="h-3.5 w-3.5" />
                        Clear Anchor
                    </button>
                )}

                <span className="shrink-0 rounded-xl border border-rg-border-soft bg-rg-surface-raised px-2 py-1.5 font-mono text-[0.58rem] font-bold uppercase tracking-[0.12em] text-rg-muted">
                    {segmentCount} seg
                </span>
            </div>
        </section>
    );
}

interface ModeButtonProps {
    icon: ReactNode;
    isActive: boolean;
    label: string;
    mode: ConnectToolMode;
    onArmMode: (mode: ConnectToolMode) => void;
}

/**
 * Arms one Connect sub-mode.
 */
function ModeButton({
    icon,
    isActive,
    label,
    mode,
    onArmMode,
}: ModeButtonProps) {
    return (
        <button
            className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition",
                isActive
                    ? "bg-rg-amber text-rg-night"
                    : "text-rg-muted hover:bg-rg-surface-soft hover:text-rg-text",
            )}
            onClick={() => onArmMode(mode)}
            type="button"
        >
            {icon}
            {label}
        </button>
    );
}

interface ConnectStatusInput {
    activeMode: ConnectToolMode;
    isConnectArmed: boolean;
    pendingAnchorLabel: string | null;
    pinnedCount: number;
}

/**
 * Produces compact tray status text.
 */
function getConnectStatusText({
    activeMode,
    isConnectArmed,
    pendingAnchorLabel,
    pinnedCount,
}: ConnectStatusInput): string {
    if (pinnedCount < 2) {
        return "Pin two cards first.";
    }

    if (!isConnectArmed) {
        return "Choose String or Cut.";
    }

    if (activeMode === "scissors") {
        return "Click a segment to cut.";
    }

    if (pendingAnchorLabel) {
        return `Anchor: ${pendingAnchorLabel}`;
    }

    return "Click a card to start.";
}
