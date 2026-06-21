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
import { useState, type ComponentType, type SVGProps } from "react";

import { Button } from "../../components/ui/Button";
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

const toolIconById: Record<InvestigationToolId, ToolIconComponent> = {
    select: MousePointer2,
    connect: Cable,
    arrange: Move,
    pan: Hand,
};

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
 * Bottom board tool rack.
 *
 * Base tools stay visible at all times. Connect is treated as a toggleable
 * overlay tray so the player does not need to move between the board header and
 * the bottom toolbar while connecting evidence.
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

    const baseTools = investigationToolCatalog.filter(
        (tool) => tool.id !== "connect",
    );

    const activeToolDefinition = investigationToolCatalog.find(
        (tool) => tool.id === activeTool,
    );

    const isConnectArmed = activeTool === "connect";
    const isConnectButtonActive = isConnectTrayOpen || isConnectArmed;

    const toggleConnectTray = () => {
        if (isConnectTrayOpen) {
            setIsConnectTrayOpen(false);
            onClearConnectAnchor();

            if (isConnectArmed) {
                onSelectTool("select");
            }

            return;
        }

        setIsConnectTrayOpen(true);
    };

    const armConnectMode = (mode: ConnectToolMode) => {
        setIsConnectTrayOpen(true);
        onSelectTool("connect");
        onSetConnectMode(mode);
    };

    return (
        <footer className="relative mt-2 shrink-0 border border-rg-border bg-rg-surface/95 px-3 py-2 shadow-xl shadow-black/35">
            {isConnectTrayOpen && (
                <ConnectToolTray
                    connectInteraction={connectInteraction}
                    isConnectArmed={isConnectArmed}
                    onArmMode={armConnectMode}
                    onClearAnchor={onClearConnectAnchor}
                    onSetThreadId={onSetConnectThreadId}
                    pendingAnchorLabel={pendingConnectAnchorLabel}
                    pinnedCount={pinnedCount}
                    segmentCount={segmentCount}
                />
            )}

            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex shrink-0 items-center gap-3">
                    <div>
                        <p className="font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.22em] text-rg-amber">
                            Board Tools
                        </p>

                        <p className="text-xs text-rg-muted">
                            Active:{" "}
                            <span className="font-bold text-rg-text">
                                {activeToolDefinition?.label}
                            </span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-1 flex-wrap gap-1.5 xl:justify-center">
                    {baseTools.map((tool) => {
                        const isActive = tool.id === activeTool;
                        const Icon = toolIconById[tool.id];

                        return (
                            <button
                                aria-pressed={isActive}
                                className={cn(
                                    "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition",
                                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rg-amber",
                                    isActive
                                        ? "border-rg-amber bg-rg-amber text-rg-night shadow-lg shadow-rg-amber/10"
                                        : "border-rg-border-soft bg-rg-surface-raised text-rg-text hover:border-rg-amber/70 hover:bg-rg-surface-soft",
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
                                    className="h-4 w-4"
                                    strokeWidth={2.3}
                                />
                                {tool.label}
                            </button>
                        );
                    })}

                    <button
                        aria-expanded={isConnectTrayOpen}
                        aria-pressed={isConnectButtonActive}
                        className={cn(
                            "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition",
                            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rg-amber",
                            isConnectButtonActive
                                ? "border-rg-amber bg-rg-amber text-rg-night shadow-lg shadow-rg-amber/10"
                                : "border-rg-border-soft bg-rg-surface-raised text-rg-text hover:border-rg-amber/70 hover:bg-rg-surface-soft",
                        )}
                        onClick={toggleConnectTray}
                        title="Open or close Evidence Thread controls."
                        type="button"
                    >
                        <Cable
                            aria-hidden="true"
                            className="h-4 w-4"
                            strokeWidth={2.3}
                        />
                        Connect
                        {isConnectTrayOpen ? (
                            <ChevronDown
                                aria-hidden="true"
                                className="h-3.5 w-3.5"
                            />
                        ) : (
                            <ChevronUp
                                aria-hidden="true"
                                className="h-3.5 w-3.5"
                            />
                        )}
                    </button>
                </div>

                <div className="flex shrink-0 flex-wrap gap-1.5">
                    <Button
                        className="h-9"
                        disabled={!canUndo}
                        onClick={onUndo}
                        size="sm"
                        title="Undo the last board action."
                        variant="secondary"
                    >
                        <Undo2
                            aria-hidden="true"
                            className="mr-1 h-4 w-4"
                            strokeWidth={2.3}
                        />
                        Undo
                    </Button>

                    <Button
                        className="h-9"
                        disabled={!canRedo}
                        onClick={onRedo}
                        size="sm"
                        title="Redo the most recently undone board action."
                        variant="secondary"
                    >
                        <Redo2
                            aria-hidden="true"
                            className="mr-1 h-4 w-4"
                            strokeWidth={2.3}
                        />
                        Redo
                    </Button>

                    <Button
                        className="h-9"
                        disabled={!canReset}
                        onClick={onReset}
                        size="sm"
                        title="Reset this ticket attempt."
                        variant="danger"
                    >
                        <RotateCcw
                            aria-hidden="true"
                            className="mr-1 h-4 w-4"
                            strokeWidth={2.3}
                        />
                        Reset
                    </Button>
                </div>
            </div>
        </footer>
    );
}
