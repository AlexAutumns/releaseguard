import type { ComponentPropsWithoutRef } from "react";

import { cn, type ClassValue } from "../../lib/cn";

export type ButtonVariant =
    | "primary"
    | "secondary"
    | "ghost"
    | "danger"
    | "stamp";

export type ButtonSize = "sm" | "md" | "lg";

/**
 * Props used by the buttonClassName helper.
 *
 * Exporting this helper lets React Router Link components share button styling
 * without making Button responsible for routing.
 */
export interface ButtonClassNameOptions {
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: ClassValue;
}

/**
 * Returns the Tailwind className string for a ReleaseGuard button.
 *
 * This keeps repeated button styles out of screens and feature components.
 */
export function buttonClassName({
    variant = "secondary",
    size = "md",
    className,
}: ButtonClassNameOptions = {}): string {
    return cn(
        "inline-flex items-center justify-center gap-2 rounded-full border font-bold transition",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rg-accent",
        "disabled:pointer-events-none disabled:opacity-55",
        {
            "px-3 py-1.5 text-sm": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "px-5 py-3 text-base": size === "lg",
        },
        {
            "border-rg-accent bg-rg-accent text-white hover:bg-rg-accent-dark":
                variant === "primary",
            "border-rg-folder bg-rg-paper-strong text-rg-ink hover:border-rg-folder-dark hover:bg-rg-paper":
                variant === "secondary",
            "border-transparent bg-transparent text-rg-accent hover:bg-rg-accent/10":
                variant === "ghost",
            "border-rg-danger bg-rg-danger/10 text-rg-danger hover:bg-rg-danger hover:text-white":
                variant === "danger",
            "rounded-2xl border-2 border-rg-danger bg-rg-danger/10 px-6 py-4 text-sm uppercase tracking-[0.18em] text-rg-danger hover:bg-rg-danger hover:text-white":
                variant === "stamp",
        },
        className,
    );
}

/**
 * Reusable button primitive for ReleaseGuard UI.
 *
 * Keep this component gameplay-agnostic. It should not know about tickets,
 * findings, evidence cards, shifts, scoring, or navigation.
 */
export function Button({
    variant = "secondary",
    size = "md",
    className,
    type = "button",
    ...props
}: ComponentPropsWithoutRef<"button"> & ButtonClassNameOptions) {
    return (
        <button
            className={buttonClassName({ variant, size, className })}
            type={type}
            {...props}
        />
    );
}
