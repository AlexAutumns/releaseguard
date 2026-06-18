import { Button } from "../../components/ui/Button";
import { cn } from "../../lib/cn";
import type {
    InvestigationToolDefinition,
    InvestigationToolId,
} from "./investigation-ui-types";

export interface InvestigationToolRackProps {
    activeTool: InvestigationToolId;
}

const toolDefinitions: InvestigationToolDefinition[] = [
    {
        id: "select",
        icon: "⌖",
        label: "Select",
        description: "Select pinned evidence or board items.",
    },
    {
        id: "inspect",
        icon: "⌕",
        label: "Inspect",
        description: "Inspect an evidence file before pinning it.",
    },
    {
        id: "pin",
        icon: "◇",
        label: "Pin",
        description: "Pin evidence onto the board.",
    },
    {
        id: "connect",
        icon: "⛓",
        label: "Connect",
        description: "Connect two pinned clues.",
    },
    {
        id: "move",
        icon: "✥",
        label: "Move",
        description: "Move pinned clues around the board.",
    },
];

/**
 * Bottom tool rack for the investigation workspace.
 *
 * The current build keeps most tools visually present but inactive. Build 001D
 * will connect these tool IDs to the gameplay attempt reducer.
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
                                    toolDefinitions.find(
                                        (tool) => tool.id === activeTool,
                                    )?.label
                                }
                            </span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-1 flex-wrap gap-1.5 xl:justify-center">
                    {toolDefinitions.map((tool) => {
                        const isActive = tool.id === activeTool;
                        const isAvailable = tool.id === "select";

                        return (
                            <button
                                aria-pressed={isActive}
                                className={cn(
                                    "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition",
                                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rg-amber",
                                    isActive
                                        ? "border-rg-amber bg-rg-amber text-rg-night shadow-lg shadow-rg-amber/10"
                                        : "border-rg-border-soft bg-rg-surface-raised text-rg-text hover:border-rg-amber/70 hover:bg-rg-surface-soft",
                                    !isAvailable && "opacity-55",
                                )}
                                disabled={!isAvailable}
                                key={tool.id}
                                title={
                                    isAvailable
                                        ? tool.description
                                        : `${tool.description} This tool will activate after gameplay state is added.`
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
                        title="Undo is added with gameplay state."
                        variant="secondary"
                    >
                        ↶ Undo
                    </Button>

                    <Button
                        disabled
                        className="h-9"
                        size="sm"
                        title="Reset is added with gameplay state."
                        variant="danger"
                    >
                        × Reset
                    </Button>
                </div>
            </div>
        </footer>
    );
}
