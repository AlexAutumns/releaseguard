import type { ContentCatalog } from "../../content/content-types";
import { ruleFail, ruleOk, type RuleResult } from "../shared/rule-result";
import type { ShiftRun } from "../shift-run/shift-run-types";
import { createPortableSaveSummary } from "./portable-save-builder";
import type {
    ReleaseGuardSaveEnvelope,
    ValidatedPortableSave,
} from "./portable-save-types";
import { validateImportedTicketScoreResult } from "./ticket-result-save-validator";

/**
 * Parses and deeply validates one user-selected portable save file.
 *
 * Validation covers the complete envelope, current content-pack identity,
 * authored Shift Run sequencing, nested Ticket Result contracts, replay-ready
 * active-run limits, and Shift Run-to-result ownership before local replacement.
 */
export function parseAndValidatePortableSave(
    rawText: string,
    catalog: ContentCatalog,
): RuleResult<ValidatedPortableSave> {
    let parsedValue: unknown;

    try {
        parsedValue = JSON.parse(rawText);
    } catch {
        return invalidSave(
            "portable-save:malformed-json",
            "The selected file is not valid JSON.",
        );
    }

    const envelope = validatePortableSaveEnvelope(parsedValue, catalog);

    if (!envelope.ok) {
        return envelope;
    }

    return ruleOk({
        envelope: envelope.value,
        summary: createPortableSaveSummary(envelope.value, catalog),
    });
}

/**
 * Validates the top-level save contract and nested owned records.
 */
function validatePortableSaveEnvelope(
    value: unknown,
    catalog: ContentCatalog,
): RuleResult<ReleaseGuardSaveEnvelope> {
    if (!isRecord(value) || !hasOnlyKeys(value, topLevelKeys)) {
        return invalidSave(
            "portable-save:invalid-envelope",
            "The selected JSON root must contain only supported ReleaseGuard save fields.",
        );
    }

    if (value.schemaVersion !== 1) {
        return invalidSave(
            "portable-save:unsupported-schema",
            `Save schema version "${String(value.schemaVersion)}" is not supported by this build.`,
        );
    }

    if (value.contentType !== "releaseguard-save") {
        return invalidSave(
            "portable-save:wrong-content-type",
            "The selected JSON file is not a ReleaseGuard portable save.",
        );
    }

    if (
        value.contentPackId !== catalog.manifest.contentPackId ||
        !isNonEmptyString(value.contentPackId)
    ) {
        return invalidSave(
            "portable-save:content-pack-mismatch",
            `Save content pack "${String(value.contentPackId)}" does not match current pack "${catalog.manifest.contentPackId}".`,
        );
    }

    if (
        !isNonEmptyString(value.saveId) ||
        !isCanonicalIsoDateTime(value.createdAt) ||
        !isCanonicalIsoDateTime(value.updatedAt) ||
        !isCanonicalIsoDateTime(value.exportedAt)
    ) {
        return invalidSave(
            "portable-save:invalid-metadata",
            "The save identity or timestamps are malformed.",
        );
    }

    if (
        !Array.isArray(value.shiftRuns) ||
        !Array.isArray(value.ticketResults)
    ) {
        return invalidSave(
            "portable-save:invalid-collections",
            "shiftRuns and ticketResults must be arrays.",
        );
    }

    const shiftRuns: ShiftRun[] = [];

    for (const [index, item] of value.shiftRuns.entries()) {
        const result = validateImportedShiftRun(
            item,
            catalog,
            `shiftRuns[${index}]`,
        );

        if (!result.ok) {
            return result;
        }

        shiftRuns.push(result.value);
    }

    const ticketResults: ReleaseGuardSaveEnvelope["ticketResults"] = [];

    for (const [index, item] of value.ticketResults.entries()) {
        const result = validateImportedTicketScoreResult(
            item,
            catalog,
            `ticketResults[${index}]`,
        );

        if (!result.ok) {
            return result;
        }

        ticketResults.push(result.value);
    }

    const relationships = validateRelationships(shiftRuns, ticketResults);

    if (!relationships.ok) {
        return relationships;
    }

    return ruleOk({
        schemaVersion: 1,
        contentType: "releaseguard-save",
        contentPackId: value.contentPackId,
        saveId: value.saveId,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
        exportedAt: value.exportedAt,
        shiftRuns,
        ticketResults,
    });
}

/**
 * Validates one Shift Run against current authored shift sequencing.
 */
function validateImportedShiftRun(
    value: unknown,
    catalog: ContentCatalog,
    path: string,
): RuleResult<ShiftRun> {
    if (!isRecord(value) || !hasOnlyKeys(value, shiftRunKeys)) {
        return invalidRecord(path, "must be a valid Shift Run object.");
    }

    if (
        value.schemaVersion !== 1 ||
        !isNonEmptyString(value.shiftRunId) ||
        !isNonEmptyString(value.shiftId) ||
        !isCanonicalIsoDateTime(value.startedAt)
    ) {
        return invalidRecord(
            path,
            "contains invalid identity or start fields.",
        );
    }

    const shift = catalog.shifts.find((item) => item.id === value.shiftId);

    if (!shift) {
        return invalidRecord(
            path,
            `references unavailable shift "${value.shiftId}".`,
        );
    }

    if (
        !Array.isArray(value.orderedTicketIds) ||
        !value.orderedTicketIds.every(isNonEmptyString)
    ) {
        return invalidRecord(
            `${path}.orderedTicketIds`,
            "must be a ticket ID array.",
        );
    }

    const orderedTicketIds = [...value.orderedTicketIds] as string[];

    if (
        orderedTicketIds.length !== shift.ticketIds.length ||
        orderedTicketIds.some(
            (ticketId, index) => ticketId !== shift.ticketIds[index],
        )
    ) {
        return invalidRecord(
            `${path}.orderedTicketIds`,
            `must match the authored ticket sequence for shift "${shift.id}".`,
        );
    }

    if (
        typeof value.nextTicketIndex !== "number" ||
        !Number.isInteger(value.nextTicketIndex) ||
        value.nextTicketIndex < 0 ||
        value.nextTicketIndex > orderedTicketIds.length ||
        !Array.isArray(value.completedTicketAttempts) ||
        value.completedTicketAttempts.length !== value.nextTicketIndex
    ) {
        return invalidRecord(path, "contains inconsistent ticket progression.");
    }

    const completedTicketAttempts: ShiftRun["completedTicketAttempts"] = [];

    for (const [index, item] of value.completedTicketAttempts.entries()) {
        if (
            !isRecord(item) ||
            !hasOnlyKeys(item, completedAttemptKeys) ||
            !isNonEmptyString(item.ticketId) ||
            !isNonEmptyString(item.attemptId) ||
            item.ticketId !== orderedTicketIds[index]
        ) {
            return invalidRecord(
                `${path}.completedTicketAttempts[${index}]`,
                "does not match the completed authored ticket sequence.",
            );
        }

        completedTicketAttempts.push({
            ticketId: item.ticketId,
            attemptId: item.attemptId,
        });
    }

    const isComplete = value.nextTicketIndex === orderedTicketIds.length;

    if (
        (isComplete && !isCanonicalIsoDateTime(value.completedAt)) ||
        (!isComplete && value.completedAt !== null)
    ) {
        return invalidRecord(
            path,
            "contains an inconsistent completion timestamp.",
        );
    }

    if (
        typeof value.completedAt === "string" &&
        value.completedAt.localeCompare(value.startedAt) < 0
    ) {
        return invalidRecord(path, "completes before its start timestamp.");
    }

    return ruleOk({
        schemaVersion: 1,
        shiftRunId: value.shiftRunId,
        shiftId: value.shiftId,
        orderedTicketIds,
        nextTicketIndex: value.nextTicketIndex,
        completedTicketAttempts,
        startedAt: value.startedAt,
        completedAt:
            typeof value.completedAt === "string" ? value.completedAt : null,
    });
}

/**
 * Validates collection-level replay and Ticket Result ownership invariants.
 */
function validateRelationships(
    shiftRuns: ShiftRun[],
    ticketResults: ReleaseGuardSaveEnvelope["ticketResults"],
): RuleResult<true> {
    const shiftRunIds = new Set<string>();
    const ownedAttemptIds = new Set<string>();
    const resultByAttemptId = new Map(
        ticketResults.map((result) => [result.attemptId, result]),
    );

    if (resultByAttemptId.size !== ticketResults.length) {
        return invalidSave(
            "portable-save:duplicate-ticket-result",
            "The save contains duplicate Ticket Result attempt IDs.",
        );
    }

    if (
        shiftRuns.filter((shiftRun) => shiftRun.completedAt === null).length > 1
    ) {
        return invalidSave(
            "portable-save:multiple-active-runs",
            "The save contains more than one incomplete Shift Run. Continue Case requires one unambiguous active run.",
        );
    }

    for (const shiftRun of shiftRuns) {
        if (shiftRunIds.has(shiftRun.shiftRunId)) {
            return invalidSave(
                "portable-save:duplicate-shift-run",
                `Shift Run ID "${shiftRun.shiftRunId}" appears more than once.`,
            );
        }

        shiftRunIds.add(shiftRun.shiftRunId);

        for (const completion of shiftRun.completedTicketAttempts) {
            if (ownedAttemptIds.has(completion.attemptId)) {
                return invalidSave(
                    "portable-save:duplicate-attempt-owner",
                    `Attempt "${completion.attemptId}" is owned by more than one Shift Run.`,
                );
            }

            ownedAttemptIds.add(completion.attemptId);

            const result = resultByAttemptId.get(completion.attemptId);

            if (!result) {
                return invalidSave(
                    "portable-save:missing-ticket-result",
                    `Completed ticket "${completion.ticketId}" is missing Ticket Result "${completion.attemptId}".`,
                );
            }

            if (
                result.shiftId !== shiftRun.shiftId ||
                result.ticketId !== completion.ticketId
            ) {
                return invalidSave(
                    "portable-save:ticket-result-owner-mismatch",
                    `Ticket Result "${completion.attemptId}" does not match its Shift Run owner.`,
                );
            }
        }
    }

    return ruleOk(true);
}

/**
 * Checks whether one value is the canonical ISO form produced by the app.
 */
function isCanonicalIsoDateTime(value: unknown): value is string {
    if (typeof value !== "string") {
        return false;
    }

    const timestamp = Date.parse(value);

    return (
        Number.isFinite(timestamp) &&
        new Date(timestamp).toISOString() === value
    );
}

/**
 * Checks whether one runtime value is a non-empty string.
 */
function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

/**
 * Checks whether one runtime value is an object-like parsed JSON record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

/**
 * Checks that an imported object contains no unsupported properties.
 */
function hasOnlyKeys(
    value: Record<string, unknown>,
    keys: Set<string>,
): boolean {
    return Object.keys(value).every((key) => keys.has(key));
}

/**
 * Creates one path-specific imported-record validation failure.
 */
function invalidRecord<TValue = never>(
    path: string,
    message: string,
): RuleResult<TValue> {
    return invalidSave("portable-save:invalid-record", `${path} ${message}`);
}

/**
 * Creates one portable-save validation failure.
 */
function invalidSave<TValue = never>(
    code: string,
    message: string,
): RuleResult<TValue> {
    return ruleFail(code, message, "error");
}

const topLevelKeys = new Set([
    "schemaVersion",
    "contentType",
    "contentPackId",
    "saveId",
    "createdAt",
    "updatedAt",
    "exportedAt",
    "shiftRuns",
    "ticketResults",
]);

const shiftRunKeys = new Set([
    "schemaVersion",
    "shiftRunId",
    "shiftId",
    "orderedTicketIds",
    "nextTicketIndex",
    "completedTicketAttempts",
    "startedAt",
    "completedAt",
]);

const completedAttemptKeys = new Set(["ticketId", "attemptId"]);
