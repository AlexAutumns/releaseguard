import { Button } from "../../components/ui/Button";
import { investigationToolCatalog } from "../../features/gameplay/tools/tool-catalog";
import type { InvestigationToolId } from "../../features/gameplay/tools/tool-types";
import { cn } from "../../lib/cn";

export interface InvestigationToolRackProps {
    activeTool: InvestigationToolId;
}

/**
 * Bottom tool rack for the investigation workspace.
 *
 * Build 001D moves tool IDs into gameplay state. Build 001E will connect tool
 * selection to the attempt reducer.
 */
export function InvestigationToolRack({
    activeTool,
}: InvestigationToolRackProps) {
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
                                {
                                    investigationToolCatalog.find(
                                        (tool) => tool.id === activeTool,
                                    )?.label
                                }
                            </span>
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
                                title={
                                    tool.isMvpEnabled
                                        ? tool.description
                                        : `${tool.description} This tool will activate after gameplay state is connected.`
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
                        disabled
                        className="h-9"
                        size="sm"
                        title="Undo is added with gameplay state wiring."
                        variant="secondary"
                    >
                        ↶ Undo
                    </Button>

                    <Button
                        disabled
                        className="h-9"
                        size="sm"
                        title="Reset is added with gameplay state wiring."
                        variant="danger"
                    >
                        × Reset
                    </Button>
                </div>
            </div>
        </footer>
    );
}
