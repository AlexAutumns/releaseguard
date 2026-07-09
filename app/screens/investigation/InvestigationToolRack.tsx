import {
    Cable,
    ChevronDown,
    ChevronUp,
    Hand,
    MousePointer2,
    Move,
    Redo2,
    RotateCcw,
    Undo2,
} from "lucide-react";
import {
    useEffect,
    useRef,
    useState,
    type ComponentType,
    type SVGProps,
} from "react";

import type { EvidenceThreadColorId } from "../../features/gameplay/board/board-state";
import type {
    ConnectInteractionState,
    ConnectToolMode,
} from "../../features/gameplay/connect/connect-state";
import { investigationToolCatalog } from "../../features/gameplay/tools/tool-catalog";
import type { InvestigationToolId } from "../../features/gameplay/tools/tool-types";
import { cn } from "../../lib/cn";
import { ConnectToolTray } from "./ConnectToolTray";

type ToolIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const connectTrayTransitionDurationMs = 160;

const toolIconById: Record<InvestigationToolId, ToolIconComponent> = {
    select: MousePointer2,
    connect: Cable,
    arrange: Move,
    pan: Hand,
};

/**
 * Shared one-off geometry for controls mounted in the Board Tool Rack.
 *
 * The rack is the only consumer of this control geometry, so the Tailwind
 * composition stays local. The rack and tray's genuinely shared furniture
 * material lives in board-tool-rack.css instead.
 */
const rackControlClassName = [
    "inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-[0.28rem] border px-2.5",
    "transition-[transform,border-color,background-color,box-shadow,color] duration-[var(--rg-motion-control)] ease-[var(--rg-ease-out)]",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rg-amber",
    "disabled:cursor-not-allowed disabled:opacity-40",
].join(" ");

const rackRaisedControlClassName = [
    "border-[rgb(126_96_62_/_56%)] text-[rgb(235_218_186_/_86%)]",
    "bg-[linear-gradient(180deg,rgb(56_48_41),rgb(40_34_29)_76%)]",
    "shadow-[inset_0_1px_0_rgb(255_238_199_/_7%),0_2px_3px_rgb(0_0_0_/_32%)]",
    "hover:not-disabled:-translate-y-px hover:not-disabled:border-rg-amber/65 hover:not-disabled:text-rg-paper-strong",
    "active:not-disabled:translate-y-px active:not-disabled:shadow-[inset_0_2px_4px_rgb(0_0_0_/_38%)]",
].join(" ");

const rackPressedControlClassName = [
    "translate-y-px border-[rgb(185_139_59_/_88%)] text-[rgb(28_18_9)]",
    "bg-[linear-gradient(180deg,rgb(181_137_58),rgb(126_88_31)_82%)]",
    "shadow-[inset_0_2px_5px_rgb(50_29_7_/_48%),inset_0_-1px_0_rgb(243_207_127_/_20%)]",
].join(" ");

const rackDangerControlClassName = [
    "border-[rgb(133_57_47_/_78%)] text-[rgb(225_167_153_/_92%)]",
    "bg-[linear-gradient(180deg,rgb(63_42_38),rgb(43_30_28)_80%)]",
    "shadow-[inset_0_1px_0_rgb(255_220_208_/_5%),0_2px_3px_rgb(0_0_0_/_32%)]",
    "hover:not-disabled:-translate-y-px hover:not-disabled:border-[rgb(166_72_58_/_92%)] hover:not-disabled:bg-[linear-gradient(180deg,rgb(75_45_40),rgb(47_30_28)_80%)] hover:not-disabled:text-[rgb(240_188_174)]",
    "active:not-disabled:translate-y-px active:not-disabled:shadow-[inset_0_2px_4px_rgb(25_8_6_/_44%)]",
].join(" ");

export interface InvestigationToolRackProps {
    activeTool: InvestigationToolId;
    canRedo: boolean;
    canReset: boolean;
    canUndo: boolean;
    connectInteraction: ConnectInteractionState;
    pendingConnectAnchorLabel: string | null;
    pinnedCount: number;
    segmentCount: number;
    onClearConnectAnchor: () => void;
    onRedo: () => void;
    onReset: () => void;
    onSelectTool: (toolId: InvestigationToolId) => void;
    onSetConnectMode: (mode: ConnectToolMode) => void;
    onSetConnectThreadId: (threadId: EvidenceThreadColorId) => void;
    onUndo: () => void;
}

/**
 * Physical Board Tool Rack mounted below the investigation workspace.
 *
 * The rack uses a three-zone layout: furniture identity on the left, frequent
 * Board tools in the visual centre, and lower-frequency history/destructive
 * actions on the right. The Connect tray is centred over the same working area
 * so the repeated Board -> tool -> Board interaction loop stays short.
 */
export function InvestigationToolRack({
    activeTool,
    canRedo,
    canReset,
    canUndo,
    connectInteraction,
    pendingConnectAnchorLabel,
    pinnedCount,
    segmentCount,
    onClearConnectAnchor,
    onRedo,
    onReset,
    onSelectTool,
    onSetConnectMode,
    onSetConnectThreadId,
    onUndo,
}: InvestigationToolRackProps) {
    const [isConnectTrayOpen, setIsConnectTrayOpen] = useState(false);
    const [isConnectTrayMounted, setIsConnectTrayMounted] = useState(false);
    const [isConnectTrayVisible, setIsConnectTrayVisible] = useState(false);

    const connectTrayExitTimerRef = useRef<number | null>(null);
    const connectTrayOpenFrameRef = useRef<number | null>(null);

    const baseTools = investigationToolCatalog.filter(
        (tool) => tool.id !== "connect",
    );

    const activeToolDefinition = investigationToolCatalog.find(
        (tool) => tool.id === activeTool,
    );

    const isConnectArmed = activeTool === "connect";
    const isConnectButtonActive = isConnectTrayOpen || isConnectArmed;

    /**
     * Cancels presentation-only tray timers before a new open/close request.
     */
    const clearConnectTrayPresentationHandles = () => {
        if (connectTrayExitTimerRef.current !== null) {
            window.clearTimeout(connectTrayExitTimerRef.current);
            connectTrayExitTimerRef.current = null;
        }

        if (connectTrayOpenFrameRef.current !== null) {
            window.cancelAnimationFrame(connectTrayOpenFrameRef.current);
            connectTrayOpenFrameRef.current = null;
        }
    };

    /**
     * Opens the Connect tray and starts its short presentation transition.
     *
     * Motion preference changes only how the shell appears. Connect gameplay
     * state remains owned by the existing controller handlers.
     */
    const openConnectTray = () => {
        clearConnectTrayPresentationHandles();
        setIsConnectTrayOpen(true);
        setIsConnectTrayMounted(true);

        if (usesReducedMotion()) {
            setIsConnectTrayVisible(true);
            return;
        }

        setIsConnectTrayVisible(false);
        connectTrayOpenFrameRef.current = window.requestAnimationFrame(() => {
            setIsConnectTrayVisible(true);
            connectTrayOpenFrameRef.current = null;
        });
    };

    /**
     * Closes the logical tray immediately while keeping its visual shell mounted
     * just long enough to complete the 160ms exit transition.
     */
    const closeConnectTray = () => {
        clearConnectTrayPresentationHandles();
        setIsConnectTrayOpen(false);
        setIsConnectTrayVisible(false);

        if (usesReducedMotion()) {
            setIsConnectTrayMounted(false);
            return;
        }

        connectTrayExitTimerRef.current = window.setTimeout(() => {
            setIsConnectTrayMounted(false);
            connectTrayExitTimerRef.current = null;
        }, connectTrayTransitionDurationMs);
    };

    useEffect(() => {
        return () => {
            if (connectTrayExitTimerRef.current !== null) {
                window.clearTimeout(connectTrayExitTimerRef.current);
            }

            if (connectTrayOpenFrameRef.current !== null) {
                window.cancelAnimationFrame(connectTrayOpenFrameRef.current);
            }
        };
    }, []);

    /**
     * Opens or closes the attached Connect tray.
     *
     * Closing preserves the existing behavior: clear only the pending anchor
     * and return to Select when Connect itself was armed. Those gameplay actions
     * happen immediately; only the tray shell waits for the exit transition.
     */
    const toggleConnectTray = () => {
        if (isConnectTrayOpen) {
            closeConnectTray();
            onClearConnectAnchor();

            if (isConnectArmed) {
                onSelectTool("select");
            }

            return;
        }

        openConnectTray();
    };

    /**
     * Arms one Connect sub-mode without changing connection rules.
     */
    const armConnectMode = (mode: ConnectToolMode) => {
        if (!isConnectTrayOpen) {
            openConnectTray();
        }

        onSelectTool("connect");
        onSetConnectMode(mode);
    };

    return (
        <footer className="rg-board-tool-furniture rg-board-tool-furniture--rack relative z-30 mt-2 shrink-0 overflow-visible px-2.5 py-1.5">
            {isConnectTrayMounted && (
                <ConnectToolTray
                    connectInteraction={connectInteraction}
                    isConnectArmed={isConnectArmed}
                    isVisible={isConnectTrayVisible}
                    onArmMode={armConnectMode}
                    onClearAnchor={onClearConnectAnchor}
                    onSetThreadId={onSetConnectThreadId}
                    pendingAnchorLabel={pendingConnectAnchorLabel}
                    pinnedCount={pinnedCount}
                    segmentCount={segmentCount}
                />
            )}

            <div className="relative z-10 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                <div className="flex min-w-0 justify-self-start">
                    <div className="min-w-0">
                        <p className="font-mono text-[0.6rem] font-extrabold uppercase leading-3 tracking-[0.18em] text-rg-amber">
                            Board Tool Rack
                        </p>

                        <p className="truncate font-sans text-[0.64rem] font-semibold leading-4 text-[rgb(218_202_173_/_70%)]">
                            Active /{" "}
                            <span className="text-rg-paper-strong">
                                {activeToolDefinition?.label}
                            </span>
                        </p>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 justify-self-center font-sans text-[0.72rem] font-semibold">
                    {baseTools.map((tool) => {
                        const isActive = tool.id === activeTool;
                        const Icon = toolIconById[tool.id];

                        return (
                            <button
                                aria-pressed={isActive}
                                className={cn(
                                    rackControlClassName,
                                    isActive
                                        ? rackPressedControlClassName
                                        : rackRaisedControlClassName,
                                    !tool.isMvpEnabled &&
                                        "cursor-not-allowed opacity-45",
                                )}
                                disabled={!tool.isMvpEnabled}
                                key={tool.id}
                                onClick={() => onSelectTool(tool.id)}
                                title={tool.description}
                                type="button"
                            >
                                <Icon
                                    aria-hidden="true"
                                    className="h-3.5 w-3.5 shrink-0"
                                    strokeWidth={2.25}
                                />

                                <span>{tool.label}</span>
                            </button>
                        );
                    })}

                    <button
                        aria-expanded={isConnectTrayOpen}
                        aria-pressed={isConnectButtonActive}
                        className={cn(
                            rackControlClassName,
                            isConnectButtonActive
                                ? rackPressedControlClassName
                                : rackRaisedControlClassName,
                        )}
                        onClick={toggleConnectTray}
                        title="Open or close Evidence Thread controls."
                        type="button"
                    >
                        <Cable
                            aria-hidden="true"
                            className="h-3.5 w-3.5 shrink-0"
                            strokeWidth={2.25}
                        />

                        <span>Connect</span>

                        {isConnectTrayOpen ? (
                            <ChevronDown
                                aria-hidden="true"
                                className="h-3 w-3 shrink-0"
                                strokeWidth={2.25}
                            />
                        ) : (
                            <ChevronUp
                                aria-hidden="true"
                                className="h-3 w-3 shrink-0"
                                strokeWidth={2.25}
                            />
                        )}
                    </button>
                </div>

                <div className="flex shrink-0 items-center gap-3 justify-self-end font-sans text-[0.72rem] font-semibold">
                    <div className="flex items-center gap-2">
                        <button
                            className={cn(
                                rackControlClassName,
                                rackRaisedControlClassName,
                            )}
                            disabled={!canUndo}
                            onClick={onUndo}
                            title="Undo the last board action."
                            type="button"
                        >
                            <Undo2
                                aria-hidden="true"
                                className="h-3.5 w-3.5 shrink-0"
                                strokeWidth={2.25}
                            />
                            <span>Undo</span>
                        </button>

                        <button
                            className={cn(
                                rackControlClassName,
                                rackRaisedControlClassName,
                            )}
                            disabled={!canRedo}
                            onClick={onRedo}
                            title="Redo the most recently undone board action."
                            type="button"
                        >
                            <Redo2
                                aria-hidden="true"
                                className="h-3.5 w-3.5 shrink-0"
                                strokeWidth={2.25}
                            />
                            <span>Redo</span>
                        </button>
                    </div>

                    <div className="flex items-center border-l border-[rgb(154_118_70_/_22%)] pl-3">
                        <button
                            className={cn(
                                rackControlClassName,
                                rackDangerControlClassName,
                            )}
                            disabled={!canReset}
                            onClick={onReset}
                            title="Reset this ticket attempt."
                            type="button"
                        >
                            <RotateCcw
                                aria-hidden="true"
                                className="h-3.5 w-3.5 shrink-0"
                                strokeWidth={2.25}
                            />
                            <span>Reset</span>
                        </button>
                    </div>
                </div>
            </div>
        </footer>
    );
}

/**
 * Reads the explicit ReleaseGuard motion preference for local presentation-only
 * transitions. Gameplay state never depends on this preference.
 */
function usesReducedMotion(): boolean {
    return (
        typeof document !== "undefined" &&
        document.documentElement.dataset.rgMotion === "reduced"
    );
}
