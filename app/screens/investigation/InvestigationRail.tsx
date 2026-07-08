import type { ComponentType, ReactNode, SVGProps } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type InvestigationRailIcon = ComponentType<SVGProps<SVGSVGElement>>;

export interface InvestigationRailProps {
    disabled?: boolean;
    side: "left" | "right";
    icon: InvestigationRailIcon;
    label: string;
    meta?: ReactNode;
    onOpen: () => void;
}

/**
 * Full-height control for reopening one folded Investigation work area.
 *
 * The whole visible spine is one semantic button so the physical furniture edge
 * and its interaction target agree. The component owns no open/closed state; it
 * only presents the current collapsed workspace state supplied by its parent.
 */
export function InvestigationRail({
    disabled = false,
    side,
    icon: Icon,
    label,
    meta,
    onOpen,
}: InvestigationRailProps) {
    const DirectionIcon = side === "left" ? ChevronRight : ChevronLeft;

    return (
        <button
            aria-label={`Open ${label}`}
            className="rg-investigation-rail"
            data-side={side}
            disabled={disabled}
            onClick={onOpen}
            title={
                disabled
                    ? "Finish turning the Notepad page first."
                    : `Open ${label}`
            }
            type="button"
        >
            <span aria-hidden="true" className="rg-investigation-rail__arrow">
                <DirectionIcon className="h-4 w-4" strokeWidth={2.3} />
            </span>

            <Icon
                aria-hidden="true"
                className="rg-investigation-rail__icon h-4 w-4"
                strokeWidth={2}
            />

            <span className="rg-investigation-rail__label">{label}</span>

            {meta && (
                <span className="rg-investigation-rail__meta">{meta}</span>
            )}
        </button>
    );
}
