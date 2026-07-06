/**
 * Allowed values for the local class-name combiner.
 *
 * This intentionally supports the small set of patterns needed by the MVP:
 * strings, falsey values, arrays, and simple conditional object maps.
 */
export type ClassValue =
    | string
    | false
    | null
    | undefined
    | ClassValue[]
    | Record<string, boolean | null | undefined>;

/**
 * Combines class names into one space-separated string.
 *
 * This helper keeps Tailwind-heavy UI components readable without adding a new
 * dependency. It does not perform Tailwind conflict resolution, so avoid passing
 * conflicting utilities like "px-2" and "px-4" at the same time.
 */
export function cn(...values: ClassValue[]): string {
    const classes: string[] = [];

    for (const value of values) {
        if (!value) {
            continue;
        }

        if (typeof value === "string") {
            classes.push(value);
            continue;
        }

        if (Array.isArray(value)) {
            const nestedClassName = cn(...value);

            if (nestedClassName) {
                classes.push(nestedClassName);
            }

            continue;
        }

        for (const [className, shouldInclude] of Object.entries(value)) {
            if (shouldInclude) {
                classes.push(className);
            }
        }
    }

    return classes.join(" ");
}
