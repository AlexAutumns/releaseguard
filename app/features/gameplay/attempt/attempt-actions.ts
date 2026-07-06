import type {
    BoardPosition,
    BoardSpawnBounds,
    EvidenceThreadColorId,
} from "../board/board-state";
import type { ConnectToolMode } from "../connect/connect-state";
import type { DraftFindingPatch } from "../findings/finding-rules";
import type { InvestigationToolId } from "../tools/tool-types";
import type { ReleaseVerdict } from "../../content/content-types";

/**
 * Gameplay actions supported by the ticket attempt reducer.
 *
 * UI-only actions such as opening modals or folding side panels should not be
 * placed here. This action list is for gameplay progress and attempt state.
 */
export type TicketAttemptAction =
    | {
          type: "SET_ACTIVE_TOOL";
          toolId: InvestigationToolId;
      }
    | {
          type: "CLEAR_ACTIVE_TOOL";
      }
    | {
          type: "SET_CONNECT_THREAD_ID";
          threadId: EvidenceThreadColorId;
      }
    | {
          type: "SET_CONNECT_MODE";
          mode: ConnectToolMode;
      }
    | {
          type: "CLEAR_CONNECT_ANCHOR";
      }
    | {
          type: "USE_CONNECT_STRING_ON_PINNED_EVIDENCE";
          pinnedEvidenceId: string;
          nowIso: string;
      }
    | {
          type: "MARK_EVIDENCE_INSPECTED";
          evidenceId: string;
      }
    | {
          type: "PIN_EVIDENCE";
          evidenceId: string;
          nowIso: string;

          /**
           * Preferred board-world area for the new pinned card.
           *
           * The board rule treats this as a preference, not an absolute command,
           * because it still needs to avoid destructive overlap with existing cards.
           */
          spawnBounds?: BoardSpawnBounds;
      }
    | {
          type: "UNPIN_EVIDENCE";
          pinnedEvidenceId: string;
      }
    | {
          type: "MOVE_PINNED_EVIDENCE";
          pinnedEvidenceId: string;
          position: BoardPosition;
      }
    | {
          type: "SELECT_PINNED_EVIDENCE";
          pinnedEvidenceId: string | null;
      }
    | {
          type: "CONNECT_PINNED_EVIDENCE";
          threadId: EvidenceThreadColorId;
          fromPinnedEvidenceId: string;
          toPinnedEvidenceId: string;
          nowIso: string;
      }
    | {
          type: "DISCONNECT_CONNECTION";
          connectionId: string;
      }
    | {
          type: "UPDATE_DRAFT_FINDING";
          patch: DraftFindingPatch;
      }
    | {
          type: "ATTACH_EVIDENCE_TO_DRAFT";
          evidenceId: string;
      }
    | {
          type: "REMOVE_EVIDENCE_FROM_DRAFT";
          evidenceId: string;
      }
    | {
          type: "ATTACH_THREAD_TO_DRAFT";
          threadId: EvidenceThreadColorId;
      }
    | {
          type: "REMOVE_THREAD_FROM_DRAFT";
          threadId: EvidenceThreadColorId;
      }
    | {
          type: "FILE_FINDING";
          nowIso: string;
      }
    | {
          type: "REMOVE_FILED_FINDING";
          filedFindingId: string;
      }
    | {
          type: "SELECT_VERDICT";
          verdict: ReleaseVerdict;
      }
    | {
          type: "UNDO_LAST_ACTION";
      }
    | {
          type: "REDO_LAST_ACTION";
      }
    | {
          type: "RESET_ATTEMPT";
      }
    | {
          type: "CLEAR_LAST_ISSUE";
      };
