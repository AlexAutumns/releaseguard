import type { ComponentPropsWithoutRef } from "react";

import { cn, type ClassValue } from "../../lib/cn";

export type ButtonVariant =
    | "primary"
    | "secondary"
    | "ghost"
    | "danger"
    | "stamp";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonClassNameOptions {
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: ClassValue;
}

export interface ButtonProps
    extends
        Omit<ComponentPropsWithoutRef<"button">, "className">,
        ButtonClassNameOptions {}

/**
 * Returns the Tailwind className string for a ReleaseGuard button.
 *
 * Design rule:
 * - primary = desk lamp / main investigation action;
 * - secondary = dark case desk control;
 * - ghost = quiet navigation;
 * - danger = destructive or warning action;
 * - stamp = verdict-style action.
 */
export function buttonClassName({
    variant = "secondary",
    size = "md",
    className,
}: ButtonClassNameOptions = {}): string {
    return cn(
        "inline-flex items-center justify-center gap-2 border font-bold transition",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rg-amber",
        "disabled:pointer-events-none disabled:opacity-55",
        {
            "rounded-xl px-3 py-1.5 text-xs": size === "sm",
            "rounded-2xl px-4 py-2 text-sm": size === "md",
            "rounded-2xl px-5 py-3 text-base": size === "lg",
        },
        {
            "border-rg-amber bg-rg-amber text-rg-night shadow-lg shadow-rg-amber/10 hover:bg-rg-paper-strong":
                variant === "primary",
            "border-rg-border-soft bg-rg-surface-raised text-rg-text shadow-lg shadow-black/25 hover:border-rg-amber/70 hover:bg-rg-surface-soft":
                variant === "secondary",
            "border-transparent bg-transparent text-rg-muted hover:bg-rg-surface-raised hover:text-rg-text":
                variant === "ghost",
            "border-rg-danger bg-rg-danger/10 text-rg-danger hover:bg-rg-danger hover:text-rg-text":
                variant === "danger",
            "rounded-xl border-2 border-rg-stamp bg-rg-stamp/10 px-6 py-4 text-sm uppercase tracking-[0.2em] text-rg-stamp shadow-xl shadow-rg-stamp/10 hover:bg-rg-stamp hover:text-rg-text":
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
}: ButtonProps) {
    return (
        <button
            className={buttonClassName({ variant, size, className })}
            type={type}
            {...props}
        />
    );
}
