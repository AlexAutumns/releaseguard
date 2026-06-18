/**
 * Runtime evidence interaction state for a ticket attempt.
 *
 * This stores only player interaction state. Authored evidence content remains
 * in the content repository.
 */
export interface EvidenceInteractionState {
    inspectedEvidenceIds: string[];
}

/**
 * Creates the initial evidence interaction state for a new ticket attempt.
 */
export function createInitialEvidenceInteractionState(): EvidenceInteractionState {
    return {
        inspectedEvidenceIds: [],
    };
}
