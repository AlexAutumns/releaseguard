import { useCallback, useEffect, useMemo, useReducer, useState } from "react";

import type {
    EvidenceCardDefinition,
    ReleaseTicketDefinition,
    ReleaseVerdict,
    ShiftDefinition,
} from "../../features/content/content-types";
import { useGameNotifications } from "../../features/game-notifications/use-game-notifications";
import { createTicketAttemptState } from "../../features/gameplay/attempt/attempt-factory";
import { ticketAttemptReducer } from "../../features/gameplay/attempt/attempt-reducer";
import type { TicketAttemptState } from "../../features/gameplay/attempt/attempt-state";
import type { PinnedEvidence } from "../../features/gameplay/board/board-state";
import type { DraftFindingPatch } from "../../features/gameplay/findings/finding-rules";
import type { FiledFinding } from "../../features/gameplay/findings/finding-state";
import {
    findingTypeCatalog,
    getFindingTypeById,
    type FindingTypeDefinition,
    type FindingTypeId,
} from "../../features/gameplay/findings/finding-types";
import type { InvestigationToolId } from "../../features/gameplay/tools/tool-types";

export interface UseInvestigationControllerInput {
    shift: ShiftDefinition;
    ticket: ReleaseTicketDefinition;
}

/**
 * View model for one evidence file in the cabinet.
 */
export interface EvidenceCabinetItem {
    evidenceCard: EvidenceCardDefinition;
    isInspected: boolean;
    isPinned: boolean;
}

/**
 * View model for one pinned evidence card on the board.
 */
export interface BoardPinnedEvidenceItem {
    pinnedEvidence: PinnedEvidence;
    evidenceCard: EvidenceCardDefinition;
    isSelected: boolean;
}

/**
 * Evidence support item shown in the New Finding casework tab.
 */
export interface LinkableEvidenceItem {
    evidenceCard: EvidenceCardDefinition;
    isInspected: boolean;
    isPinned: boolean;
    isLinkedToDraft: boolean;
}

/**
 * Generic finding stamp option shown in the New Finding casework tab.
 */
export interface FindingTypeItem {
    findingType: FindingTypeDefinition;
    isSelected: boolean;
}

/**
 * Filed finding view model with resolved display data.
 */
export interface FiledFindingItem {
    filedFinding: FiledFinding;
    findingType?: FindingTypeDefinition;
    linkedEvidenceCards: EvidenceCardDefinition[];
}

/**
 * Screen controller result for the investigation workspace.
 */
export interface InvestigationController {
    attempt: TicketAttemptState;
    evidenceItems: EvidenceCabinetItem[];
    pinnedBoardItems: BoardPinnedEvidenceItem[];
    linkableEvidenceItems: LinkableEvidenceItem[];
    findingTypeItems: FindingTypeItem[];
    filedFindingItems: FiledFindingItem[];
    previewEvidenceCard?: EvidenceCardDefinition;
    canFileDraftFinding: boolean;
    canUndo: boolean;
    canRedo: boolean;
    canReset: boolean;
    activateCabinetEvidence: (evidenceId: string) => void;
    activatePinnedBoardEvidence: (
        pinnedEvidenceId: string,
        evidenceId: string,
    ) => void;
    openEvidencePreview: (evidenceId: string) => void;
    closeEvidencePreview: () => void;
    pinEvidence: (evidenceId: string) => void;
    pinPreviewEvidence: () => void;
    unpinEvidence: (pinnedEvidenceId: string) => void;
    selectPinnedEvidence: (pinnedEvidenceId: string | null) => void;
    setActiveTool: (toolId: InvestigationToolId) => void;
    updateDraftFinding: (patch: DraftFindingPatch) => void;
    selectFindingType: (findingTypeId: FindingTypeId) => void;
    toggleDraftEvidenceLink: (evidenceId: string) => void;
    fileDraftFinding: () => void;
    removeFiledFinding: (filedFindingId: string) => void;
    selectVerdict: (verdict: ReleaseVerdict) => void;
    undoLastAction: () => void;
    redoLastAction: () => void;
    resetAttempt: () => void;
    notifications: ReturnType<typeof useGameNotifications>["notifications"];
    dismissNotification: ReturnType<
        typeof useGameNotifications
    >["dismissNotification"];
}

/**
 * Connects the investigation screen to the ticket attempt reducer.
 *
 * Gameplay state stays in the reducer. This hook resolves display-friendly view
 * models for the screen and exposes narrow action handlers.
 */
export function useInvestigationController({
    shift,
    ticket,
}: UseInvestigationControllerInput): InvestigationController {
    const evidenceIds = useMemo(
        () => ticket.evidenceCards.map((evidenceCard) => evidenceCard.id),
        [ticket.evidenceCards],
    );

    const [attempt, dispatch] = useReducer(
        ticketAttemptReducer,
        undefined,
        () =>
            createTicketAttemptState({
                shiftId: shift.id,
                ticketId: ticket.id,
                evidenceIds,
            }),
    );

    const { notifications, pushNotification, dismissNotification } =
        useGameNotifications();

    const [previewEvidenceId, setPreviewEvidenceId] = useState<string | null>(
        null,
    );

    const evidenceById = useMemo(() => {
        return new Map(
            ticket.evidenceCards.map((evidenceCard) => [
                evidenceCard.id,
                evidenceCard,
            ]),
        );
    }, [ticket.evidenceCards]);

    const pinnedEvidenceIds = useMemo(() => {
        return new Set(
            attempt.present.board.pinnedEvidence.map(
                (pinnedEvidence) => pinnedEvidence.evidenceId,
            ),
        );
    }, [attempt.present.board.pinnedEvidence]);

    const inspectedEvidenceIds = useMemo(() => {
        return new Set(attempt.present.evidence.inspectedEvidenceIds);
    }, [attempt.present.evidence.inspectedEvidenceIds]);

    const draftLinkedEvidenceIds = useMemo(() => {
        return new Set(attempt.present.findings.draft.linkedEvidenceIds);
    }, [attempt.present.findings.draft.linkedEvidenceIds]);

    const evidenceItems = useMemo<EvidenceCabinetItem[]>(() => {
        return ticket.evidenceCards.map((evidenceCard) => ({
            evidenceCard,
            isInspected: inspectedEvidenceIds.has(evidenceCard.id),
            isPinned: pinnedEvidenceIds.has(evidenceCard.id),
        }));
    }, [inspectedEvidenceIds, pinnedEvidenceIds, ticket.evidenceCards]);

    const pinnedBoardItems = useMemo<BoardPinnedEvidenceItem[]>(() => {
        return attempt.present.board.pinnedEvidence
            .map((pinnedEvidence) => {
                const evidenceCard = evidenceById.get(
                    pinnedEvidence.evidenceId,
                );

                if (!evidenceCard) {
                    return null;
                }

                return {
                    pinnedEvidence,
                    evidenceCard,
                    isSelected:
                        attempt.present.board.selectedPinnedEvidenceId ===
                        pinnedEvidence.pinnedEvidenceId,
                };
            })
            .filter((item): item is BoardPinnedEvidenceItem => item !== null);
    }, [
        attempt.present.board.pinnedEvidence,
        attempt.present.board.selectedPinnedEvidenceId,
        evidenceById,
    ]);

    const linkableEvidenceItems = useMemo<LinkableEvidenceItem[]>(() => {
        return evidenceItems
            .filter((item) => item.isPinned || item.isInspected)
            .sort((left, right) => {
                if (left.isPinned !== right.isPinned) {
                    return left.isPinned ? -1 : 1;
                }

                return left.evidenceCard.title.localeCompare(
                    right.evidenceCard.title,
                );
            })
            .map((item) => ({
                evidenceCard: item.evidenceCard,
                isInspected: item.isInspected,
                isPinned: item.isPinned,
                isLinkedToDraft: draftLinkedEvidenceIds.has(
                    item.evidenceCard.id,
                ),
            }));
    }, [draftLinkedEvidenceIds, evidenceItems]);

    const findingTypeItems = useMemo<FindingTypeItem[]>(() => {
        return findingTypeCatalog.map((findingType) => ({
            findingType,
            isSelected:
                attempt.present.findings.draft.findingTypeId ===
                findingType.id,
        }));
    }, [attempt.present.findings.draft.findingTypeId]);

    const filedFindingItems = useMemo<FiledFindingItem[]>(() => {
        return attempt.present.findings.filedFindings.map((filedFinding) => ({
            filedFinding,
            findingType: getFindingTypeById(filedFinding.findingTypeId),
            linkedEvidenceCards: filedFinding.linkedEvidenceIds
                .map((evidenceId) => evidenceById.get(evidenceId))
                .filter(
                    (
                        evidenceCard,
                    ): evidenceCard is EvidenceCardDefinition =>
                        Boolean(evidenceCard),
                ),
        }));
    }, [attempt.present.findings.filedFindings, evidenceById]);

    const previewEvidenceCard = previewEvidenceId
        ? evidenceById.get(previewEvidenceId)
        : undefined;

    const draft = attempt.present.findings.draft;

    const canFileDraftFinding = Boolean(
        (draft.linkedEvidenceIds.length > 0 ||
            draft.linkedThreadIds.length > 0) &&
            draft.findingTypeId &&
            draft.severity,
    );

    const canUndo = attempt.history.past.length > 0;
    const canRedo = attempt.history.future.length > 0;

    const canReset =
        canUndo ||
        canRedo ||
        attempt.present.evidence.inspectedEvidenceIds.length > 0 ||
        attempt.present.board.pinnedEvidence.length > 0 ||
        attempt.present.board.connections.length > 0 ||
        draft.findingTypeId !== null ||
        draft.severity !== null ||
        draft.linkedEvidenceIds.length > 0 ||
        draft.linkedThreadIds.length > 0 ||
        draft.optionalNote.trim().length > 0 ||
        attempt.present.findings.filedFindings.length > 0 ||
        attempt.present.verdict.selectedVerdict !== null;

    useEffect(() => {
        if (!attempt.lastIssue) {
            return;
        }

        pushNotification({
            fingerprint: `rule-issue:${attempt.lastIssue.code}`,
            title:
                attempt.lastIssue.severity === "error"
                    ? "Action blocked"
                    : "Action notice",
            message: attempt.lastIssue.message,
            tone:
                attempt.lastIssue.severity === "error"
                    ? "danger"
                    : attempt.lastIssue.severity,
        });

        dispatch({
            type: "CLEAR_LAST_ISSUE",
        });
    }, [attempt.lastIssue, pushNotification]);

    const openEvidencePreview = useCallback((evidenceId: string) => {
        dispatch({
            type: "MARK_EVIDENCE_INSPECTED",
            evidenceId,
        });
        setPreviewEvidenceId(evidenceId);
    }, []);

    const closeEvidencePreview = useCallback(() => {
        setPreviewEvidenceId(null);
    }, []);

    const pinEvidence = useCallback((evidenceId: string) => {
        dispatch({
            type: "PIN_EVIDENCE",
            evidenceId,
            nowIso: new Date().toISOString(),
        });
    }, []);

    const pinPreviewEvidence = useCallback(() => {
        if (
            !previewEvidenceCard ||
            pinnedEvidenceIds.has(previewEvidenceCard.id)
        ) {
            return;
        }

        dispatch({
            type: "PIN_EVIDENCE",
            evidenceId: previewEvidenceCard.id,
            nowIso: new Date().toISOString(),
        });

        setPreviewEvidenceId(null);
    }, [pinnedEvidenceIds, previewEvidenceCard]);

    const unpinEvidence = useCallback((pinnedEvidenceId: string) => {
        dispatch({
            type: "UNPIN_EVIDENCE",
            pinnedEvidenceId,
        });
    }, []);

    const selectPinnedEvidence = useCallback(
        (pinnedEvidenceId: string | null) => {
            dispatch({
                type: "SELECT_PINNED_EVIDENCE",
                pinnedEvidenceId,
            });
        },
        [],
    );

    const activateCabinetEvidence = useCallback(
        (evidenceId: string) => {
            openEvidencePreview(evidenceId);
        },
        [openEvidencePreview],
    );

    const activatePinnedBoardEvidence = useCallback(
        (pinnedEvidenceId: string, _evidenceId: string) => {
            selectPinnedEvidence(pinnedEvidenceId);
        },
        [selectPinnedEvidence],
    );

    const setActiveTool = useCallback((toolId: InvestigationToolId) => {
        dispatch({
            type: "SET_ACTIVE_TOOL",
            toolId,
        });
    }, []);

    const updateDraftFinding = useCallback((patch: DraftFindingPatch) => {
        dispatch({
            type: "UPDATE_DRAFT_FINDING",
            patch,
        });
    }, []);

    const selectFindingType = useCallback((findingTypeId: FindingTypeId) => {
        dispatch({
            type: "UPDATE_DRAFT_FINDING",
            patch: {
                findingTypeId,
            },
        });
    }, []);

    const toggleDraftEvidenceLink = useCallback(
        (evidenceId: string) => {
            if (draftLinkedEvidenceIds.has(evidenceId)) {
                dispatch({
                    type: "REMOVE_EVIDENCE_FROM_DRAFT",
                    evidenceId,
                });
                return;
            }

            dispatch({
                type: "ATTACH_EVIDENCE_TO_DRAFT",
                evidenceId,
            });
        },
        [draftLinkedEvidenceIds],
    );

    const fileDraftFinding = useCallback(() => {
        dispatch({
            type: "FILE_FINDING",
            nowIso: new Date().toISOString(),
        });
    }, []);

    const removeFiledFinding = useCallback((filedFindingId: string) => {
        dispatch({
            type: "REMOVE_FILED_FINDING",
            filedFindingId,
        });
    }, []);

    const selectVerdict = useCallback((verdict: ReleaseVerdict) => {
        dispatch({
            type: "SELECT_VERDICT",
            verdict,
        });
    }, []);

    const undoLastAction = useCallback(() => {
        dispatch({
            type: "UNDO_LAST_ACTION",
        });
    }, []);

    const redoLastAction = useCallback(() => {
        dispatch({
            type: "REDO_LAST_ACTION",
        });
    }, []);

    const resetAttempt = useCallback(() => {
        dispatch({
            type: "RESET_ATTEMPT",
        });
        setPreviewEvidenceId(null);
    }, []);

    return {
        attempt,
        evidenceItems,
        pinnedBoardItems,
        linkableEvidenceItems,
        findingTypeItems,
        filedFindingItems,
        previewEvidenceCard,
        canFileDraftFinding,
        canUndo,
        canRedo,
        canReset,
        notifications,
        activateCabinetEvidence,
        activatePinnedBoardEvidence,
        openEvidencePreview,
        closeEvidencePreview,
        pinEvidence,
        pinPreviewEvidence,
        unpinEvidence,
        selectPinnedEvidence,
        setActiveTool,
        updateDraftFinding,
        selectFindingType,
        toggleDraftEvidenceLink,
        fileDraftFinding,
        removeFiledFinding,
        selectVerdict,
        undoLastAction,
        redoLastAction,
        resetAttempt,
        dismissNotification,
    };
}