import { useCallback, useEffect, useMemo, useReducer, useState } from "react";

import type {
    EvidenceCardDefinition,
    ReleaseTicketDefinition,
    ShiftDefinition,
} from "../../features/content/content-types";
import { createTicketAttemptState } from "../../features/gameplay/attempt/attempt-factory";
import { ticketAttemptReducer } from "../../features/gameplay/attempt/attempt-reducer";
import type { TicketAttemptState } from "../../features/gameplay/attempt/attempt-state";
import type { PinnedEvidence } from "../../features/gameplay/board/board-state";
import type { InvestigationToolId } from "../../features/gameplay/tools/tool-types";
import { useGameNotifications } from "../../features/game-notifications/use-game-notifications";

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
 * Screen controller result for the investigation workspace.
 *
 * This keeps gameplay state handling out of InvestigationScreen so the screen
 * can focus on layout and rendering.
 */
export interface InvestigationController {
    attempt: TicketAttemptState;
    evidenceItems: EvidenceCabinetItem[];
    pinnedBoardItems: BoardPinnedEvidenceItem[];
    previewEvidenceCard?: EvidenceCardDefinition;
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
    undoLastAction: () => void;
    redoLastAction: () => void;
    resetAttempt: () => void;
    // clearLastIssue: () => void;

    // Notifications
    notifications: ReturnType<typeof useGameNotifications>["notifications"];
    dismissNotification: ReturnType<
        typeof useGameNotifications
    >["dismissNotification"];
}

/**
 * Hook that connects the investigation screen to the gameplay attempt reducer.
 *
 * Layout state such as folded panels should stay in the screen. Gameplay state,
 * such as pinned evidence and active tool, belongs in this controller/reducer.
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

    const previewEvidenceCard = previewEvidenceId
        ? evidenceById.get(previewEvidenceId)
        : undefined;

    const canUndo = attempt.history.past.length > 0;
    const canRedo = attempt.history.future.length > 0;

    const canReset =
        canUndo ||
        canRedo ||
        attempt.present.evidence.inspectedEvidenceIds.length > 0 ||
        attempt.present.board.pinnedEvidence.length > 0 ||
        attempt.present.board.connections.length > 0 ||
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
            const activeTool = attempt.present.activeTool;
            const isPinned = pinnedEvidenceIds.has(evidenceId);
            const isInspected = inspectedEvidenceIds.has(evidenceId);

            if (activeTool === "inspect") {
                openEvidencePreview(evidenceId);
                return;
            }

            if (activeTool === "pin") {
                if (isPinned) {
                    dispatch({
                        type: "PIN_EVIDENCE",
                        evidenceId,
                        nowIso: new Date().toISOString(),
                    });
                    return;
                }

                if (!isInspected) {
                    openEvidencePreview(evidenceId);
                    return;
                }

                dispatch({
                    type: "PIN_EVIDENCE",
                    evidenceId,
                    nowIso: new Date().toISOString(),
                });
            }
        },
        [
            attempt.present.activeTool,
            inspectedEvidenceIds,
            openEvidencePreview,
            pinnedEvidenceIds,
        ],
    );

    const activatePinnedBoardEvidence = useCallback(
        (pinnedEvidenceId: string, evidenceId: string) => {
            const activeTool = attempt.present.activeTool;

            if (activeTool === "inspect") {
                openEvidencePreview(evidenceId);
                return;
            }

            if (activeTool === "pin") {
                dispatch({
                    type: "PIN_EVIDENCE",
                    evidenceId,
                    nowIso: new Date().toISOString(),
                });
                return;
            }

            selectPinnedEvidence(pinnedEvidenceId);
        },
        [attempt.present.activeTool, openEvidencePreview, selectPinnedEvidence],
    );

    const setActiveTool = useCallback((toolId: InvestigationToolId) => {
        dispatch({
            type: "SET_ACTIVE_TOOL",
            toolId,
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
        previewEvidenceCard,
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
        undoLastAction,
        redoLastAction,
        resetAttempt,
        dismissNotification,
    };
}
