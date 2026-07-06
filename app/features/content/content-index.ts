import manifestJson from "../../game-content/manifest.json";
import evidenceTypeJson from "../../game-content/dictionaries/evidence-types.json";
import riskCategoryJson from "../../game-content/dictionaries/risk-categories.json";
import severityLevelJson from "../../game-content/dictionaries/severity-levels.json";
import verdictJson from "../../game-content/dictionaries/verdicts.json";

import type {
    ContentCatalog,
    ContentPackManifest,
    EvidenceTypeDefinition,
    FamilyReferenceDefinition,
    NarrativeSequenceDefinition,
    ReleaseTicketDefinition,
    RiskCategoryDefinition,
    SeverityLevelDefinition,
    ShiftDefinition,
    TicketFamilyDefinition,
    VerdictDefinition,
} from "./content-types";

/**
 * Imports all shift JSON files as authored game assets.
 *
 * The glob keeps each shift in its own small file while still allowing the game
 * to build a single in-memory catalog at runtime.
 */
const shiftModules = import.meta.glob<ShiftDefinition>(
    "../../game-content/shifts/*.shift.json",
    { eager: true, import: "default" },
);

/**
 * Imports all family metadata files as authored game assets.
 */
const familyModules = import.meta.glob<TicketFamilyDefinition>(
    "../../game-content/families/*/*.family.json",
    { eager: true, import: "default" },
);

/**
 * Imports all family baseline/reference files as authored game assets.
 */
const familyReferenceModules = import.meta.glob<FamilyReferenceDefinition>(
    "../../game-content/families/*/references/*.reference.json",
    { eager: true, import: "default" },
);

/**
 * Imports all ticket variant files as authored game assets.
 */
const ticketModules = import.meta.glob<ReleaseTicketDefinition>(
    "../../game-content/families/*/tickets/*.ticket.json",
    { eager: true, import: "default" },
);

/**
 * Imports all simple narrative sequence files.
 */
const narrativeModules = import.meta.glob<NarrativeSequenceDefinition>(
    "../../game-content/narrative/**/*.json",
    { eager: true, import: "default" },
);

/**
 * Converts Vite glob module records into a stable array sorted by content ID.
 *
 * Sorting makes UI output and validation reports deterministic even when file
 * discovery order changes between environments.
 */
function sortById<TContent extends { id: string }>(
    items: TContent[],
): TContent[] {
    return [...items].sort((left, right) => left.id.localeCompare(right.id));
}

/**
 * Bundled MVP content catalog.
 *
 * Routes and components should not import raw JSON files directly. They should
 * use repository helpers so content storage can evolve without rewriting UI.
 */
export const contentCatalog: ContentCatalog = {
    manifest: manifestJson as ContentPackManifest,
    riskCategories: riskCategoryJson as RiskCategoryDefinition[],
    severityLevels: severityLevelJson as SeverityLevelDefinition[],
    verdicts: verdictJson as VerdictDefinition[],
    evidenceTypes: evidenceTypeJson as EvidenceTypeDefinition[],
    shifts: sortById(Object.values(shiftModules)),
    families: sortById(Object.values(familyModules)),
    familyReferences: sortById(Object.values(familyReferenceModules)),
    tickets: sortById(Object.values(ticketModules)),
    narrativeSequences: sortById(Object.values(narrativeModules)),
};
