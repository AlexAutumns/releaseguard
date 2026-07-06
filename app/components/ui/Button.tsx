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
 * Returns the shared class string for ReleaseGuard controls.
 *
 * Material contract:
 * - primary actions are brass-lit major controls;
 * - secondary actions are dark desk controls;
 * - ghost actions are quiet navigation controls;
 * - danger controls use oxblood warning ink;
 * - stamp controls use the verdict/stamp language.
 *
 * Object-specific controls such as folder pull labels and notebook bookmarks
 * remain separate because their shape and motion belong to their material.
 */
export function buttonClassName({
    variant = "secondary",
    size = "md",
    className,
}: ButtonClassNameOptions = {}): string {
    return cn(
        "rg-control inline-flex items-center justify-center gap-2 rounded-[0.28rem] border font-semibold",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rg-amber",
        "disabled:pointer-events-none disabled:opacity-50",
        {
            "px-3 py-1.5 text-xs": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "px-5 py-3 text-base": size === "lg",
        },
        {
            "rg-control--primary": variant === "primary",
            "rg-control--secondary": variant === "secondary",
            "rg-control--ghost": variant === "ghost",
            "rg-control--danger": variant === "danger",
            "rg-control--stamp rg-stamp-text": variant === "stamp",
        },
        className,
    );
}

/**
 * Reusable gameplay-agnostic button primitive.
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
