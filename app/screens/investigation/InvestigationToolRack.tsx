import { Button } from "../../components/ui/Button";
import { investigationToolCatalog } from "../../features/gameplay/tools/tool-catalog";
import type { InvestigationToolId } from "../../features/gameplay/tools/tool-types";
import { cn } from "../../lib/cn";

export interface InvestigationToolRackProps {
    activeTool: InvestigationToolId;
    canReset: boolean;
    canUndo: boolean;
    onReset: () => void;
    onSelectTool: (toolId: InvestigationToolId) => void;
    onUndo: () => void;
}

/**
 * Bottom tool rack for the investigation workspace.
 *
 * The rack controls the active investigation tool and attempt-level actions.
 * Temporary warnings are shown in the game notification stack instead of here.
 */
export function InvestigationToolRack({
    activeTool,
    canReset,
    canUndo,
    onReset,
    onSelectTool,
    onUndo,
}: InvestigationToolRackProps) {
    const activeToolDefinition = investigationToolCatalog.find(
        (tool) => tool.id === activeTool,
    );

    return (
        <footer className="mt-2 shrink-0 rounded-2xl border border-rg-border bg-rg-surface/94 px-2.5 py-2 shadow-xl shadow-black/35">
            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex shrink-0 items-center gap-3">
                    <div>
                        <p className="font-mono text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-rg-amber">
                            Tool Rack
                        </p>

                        <p className="text-xs text-rg-muted">
                            Active:{" "}
                            <span className="font-bold text-rg-text">
                                {activeToolDefinition?.label}
                            </span>
                        </p>

                        <p className="mt-0.5 max-w-xs text-[0.7rem] leading-4 text-rg-faint">
                            {activeToolDefinition?.description}
                        </p>
                    </div>
                </div>

                <div className="flex flex-1 flex-wrap gap-1.5 xl:justify-center">
                    {investigationToolCatalog.map((tool) => {
                        const isActive = tool.id === activeTool;

                        return (
                            <button
                                aria-pressed={isActive}
                                className={cn(
                                    "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition",
                                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rg-amber",
                                    isActive
                                        ? "border-rg-amber bg-rg-amber text-rg-night shadow-lg shadow-rg-amber/10"
                                        : "border-rg-border-soft bg-rg-surface-raised text-rg-text hover:border-rg-amber/70 hover:bg-rg-surface-soft",
                                    !tool.isMvpEnabled && "opacity-55",
                                )}
                                disabled={!tool.isMvpEnabled}
                                key={tool.id}
                                onClick={() => onSelectTool(tool.id)}
                                title={
                                    tool.isMvpEnabled
                                        ? tool.description
                                        : `${tool.description} This tool will activate in a later build.`
                                }
                                type="button"
                            >
                                <span
                                    className="font-mono text-base"
                                    aria-hidden="true"
                                >
                                    {tool.icon}
                                </span>
                                {tool.label}
                            </button>
                        );
                    })}
                </div>

                <div className="flex shrink-0 flex-wrap gap-1.5">
                    <Button
                        className="h-9"
                        disabled={!canUndo}
                        onClick={onUndo}
                        size="sm"
                        title="Undo the last board or answer action."
                        variant="secondary"
                    >
                        ↶ Undo
                    </Button>

                    <Button
                        className="h-9"
                        disabled={!canReset}
                        onClick={onReset}
                        size="sm"
                        title="Reset this ticket attempt."
                        variant="danger"
                    >
                        × Reset
                    </Button>
                </div>
            </div>
        </footer>
    );
}
