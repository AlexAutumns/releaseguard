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

const connectTrayControlClassName = [
    "inline-flex h-7 items-center justify-center gap-1.5 rounded-[0.24rem] border px-2",
    "transition-[transform,border-color,background-color,box-shadow,color] duration-[var(--rg-motion-control)] ease-[var(--rg-ease-out)]",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rg-amber",
].join(" ");

const connectTrayRaisedControlClassName = [
    "border-[rgb(126_96_62_/_52%)] text-[rgb(228_211_181_/_80%)]",
    "bg-[linear-gradient(180deg,rgb(56_48_41),rgb(39_33_29)_78%)]",
    "shadow-[inset_0_1px_0_rgb(255_238_199_/_7%),0_1px_2px_rgb(0_0_0_/_30%)]",
    "hover:-translate-y-px hover:border-rg-amber/60 hover:text-rg-paper-strong",
    "active:translate-y-px active:shadow-[inset_0_2px_4px_rgb(0_0_0_/_38%)]",
].join(" ");

const connectTrayPressedControlClassName = [
    "translate-y-px border-[rgb(184_138_58_/_86%)] text-[rgb(28_18_9)]",
    "bg-[linear-gradient(180deg,rgb(181_137_58),rgb(126_88_31)_82%)]",
    "shadow-[inset_0_2px_5px_rgb(50_29_7_/_48%),inset_0_-1px_0_rgb(243_207_127_/_18%)]",
].join(" ");

export interface ConnectToolTrayProps {
    connectInteraction: ConnectInteractionState;
    isConnectArmed: boolean;
    isVisible: boolean;
    pendingAnchorLabel: string | null;
    pinnedCount: number;
    segmentCount: number;
    onArmMode: (mode: ConnectToolMode) => void;
    onClearAnchor: () => void;
    onSetThreadId: (threadId: EvidenceThreadColorId) => void;
}

/**
 * Attached Evidence Thread tray centred over the Board Tool Rack working area.
 *
 * The tray reuses the existing Connect state and handlers. Its width follows
 * its controls instead of the viewport, its groups wrap instead of scrolling,
 * and the short visibility transition is presentation-only.
 */
export function ConnectToolTray({
    connectInteraction,
    isConnectArmed,
    isVisible,
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
        <section
            aria-hidden={!isVisible}
            className={cn(
                "rg-board-tool-furniture rg-board-tool-furniture--tray absolute bottom-[calc(100%-1px)] left-1/2 z-40 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 px-2.5 py-1.5",
                "transition-[opacity,transform] duration-[160ms] ease-[var(--rg-ease-out)]",
                isVisible
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none translate-y-[5px] opacity-0",
            )}
        >
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                <div className="flex w-[12.5rem] shrink-0 items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[0.24rem] border border-[rgb(173_128_54_/_52%)] bg-[rgb(22_18_15_/_76%)] text-rg-amber shadow-[inset_0_1px_3px_rgb(0_0_0_/_44%)]">
                        <Cable
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                            strokeWidth={2.3}
                        />
                    </span>

                    <div className="min-w-0">
                        <p className="font-mono text-[0.58rem] font-extrabold uppercase leading-3 tracking-[0.16em] text-rg-amber">
                            Evidence Thread
                        </p>

                        <p className="truncate font-sans text-[0.68rem] font-semibold leading-4 text-[rgb(221_205_176_/_74%)]">
                            {statusText}
                        </p>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 border-l border-[rgb(154_118_70_/_22%)] pl-3 font-sans text-[0.68rem] font-semibold">
                    <span className="font-mono text-[0.52rem] font-extrabold uppercase tracking-[0.12em] text-[rgb(210_188_148_/_56%)]">
                        Mode
                    </span>

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

                <div className="flex shrink-0 items-center gap-1.5 border-l border-[rgb(154_118_70_/_22%)] pl-3">
                    <span className="font-mono text-[0.52rem] font-extrabold uppercase tracking-[0.12em] text-[rgb(210_188_148_/_56%)]">
                        Thread
                    </span>

                    <div
                        aria-label="Evidence Thread color"
                        className="flex items-center gap-1.5"
                        role="group"
                    >
                        {evidenceThreadColorCatalog.map((threadColor) => {
                            const isActive =
                                threadColor.id ===
                                connectInteraction.activeThreadId;
                            const visual = threadColorVisuals[threadColor.id];

                            return (
                                <button
                                    aria-label={`Use ${threadColor.label} thread`}
                                    aria-pressed={isActive}
                                    className={cn(
                                        "grid h-7 w-7 place-items-center rounded-[0.24rem] border bg-[linear-gradient(180deg,rgb(44_38_33),rgb(27_23_20)_82%)]",
                                        "transition-[transform,border-color,box-shadow] duration-[var(--rg-motion-control)] ease-[var(--rg-ease-out)]",
                                        "hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rg-amber",
                                        isActive
                                            ? "translate-y-px border-rg-amber/85 shadow-[inset_0_2px_4px_rgb(0_0_0_/_52%),0_0_0_1px_rgb(190_145_65_/_20%)]"
                                            : "border-[rgb(126_96_62_/_52%)] shadow-[inset_0_1px_0_rgb(255_238_199_/_5%),0_1px_2px_rgb(0_0_0_/_30%)]",
                                    )}
                                    key={threadColor.id}
                                    onClick={() =>
                                        onSetThreadId(threadColor.id)
                                    }
                                    title={threadColor.description}
                                    type="button"
                                >
                                    <span
                                        aria-hidden="true"
                                        className="h-3.5 w-3.5 rounded-full border border-black/55 shadow-[inset_0_1px_1px_rgb(255_255_255_/_10%)]"
                                        style={{
                                            backgroundColor: visual.stroke,
                                        }}
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>

                {connectInteraction.pendingAnchorPinnedEvidenceId && (
                    <div className="border-l border-[rgb(154_118_70_/_22%)] pl-3 font-sans text-[0.68rem] font-semibold">
                        <button
                            className={cn(
                                connectTrayControlClassName,
                                connectTrayRaisedControlClassName,
                            )}
                            onClick={onClearAnchor}
                            title="Clear only the current string anchor."
                            type="button"
                        >
                            <X
                                aria-hidden="true"
                                className="h-3.5 w-3.5"
                                strokeWidth={2.25}
                            />
                            <span>Clear Anchor</span>
                        </button>
                    </div>
                )}

                <span className="shrink-0 border-l border-[rgb(154_118_70_/_22%)] pl-3 font-mono text-[0.56rem] font-extrabold uppercase tracking-[0.12em] text-[rgb(218_199_166_/_66%)]">
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
 * Arms one Connect sub-mode using the tray's shared physical control geometry.
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
            aria-pressed={isActive}
            className={cn(
                connectTrayControlClassName,
                isActive
                    ? connectTrayPressedControlClassName
                    : connectTrayRaisedControlClassName,
            )}
            onClick={() => onArmMode(mode)}
            type="button"
        >
            {icon}
            <span>{label}</span>
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
 * Produces compact tray status text from the current Connect interaction state.
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
