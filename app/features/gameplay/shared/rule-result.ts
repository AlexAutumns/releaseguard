/**
 * Severity level for a gameplay rule issue.
 *
 * Rule issues are used for invalid player actions such as trying to pin the
 * same evidence twice or filing a finding without evidence.
 */
export type GameplayRuleIssueSeverity = "info" | "warning" | "error";

/**
 * Serializable issue produced by gameplay rules.
 *
 * Keep this plain-data only so it can be shown in the UI, logged, saved, or
 * inspected during debugging.
 */
export interface GameplayRuleIssue {
    code: string;
    message: string;
    severity: GameplayRuleIssueSeverity;
}

/**
 * Standard return type for pure gameplay rule functions.
 *
 * Rules should not throw during normal invalid player actions. They should
 * return a failed result with a clear issue instead.
 */
export type RuleResult<TValue> =
    | {
          ok: true;
          value: TValue;
          issue?: undefined;
      }
    | {
          ok: false;
          issue: GameplayRuleIssue;
      };

/**
 * Creates a successful gameplay rule result.
 */
export function ruleOk<TValue>(value: TValue): RuleResult<TValue> {
    return {
        ok: true,
        value,
    };
}

/**
 * Creates a failed gameplay rule result.
 */
export function ruleFail<TValue>(
    code: string,
    message: string,
    severity: GameplayRuleIssueSeverity = "warning",
): RuleResult<TValue> {
    return {
        ok: false,
        issue: {
            code,
            message,
            severity,
        },
    };
}
