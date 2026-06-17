import { Link } from "react-router";

import { Badge } from "../../components/ui/Badge";
import { buttonClassName } from "../../components/ui/Button";
import { Panel } from "../../components/ui/Panel";
import { ScreenShell } from "../../components/ui/ScreenShell";

/**
 * Title screen for ReleaseGuard.
 *
 * This screen acts like a game title screen, not a normal website homepage.
 * It introduces the premise and routes the player toward the shift desk.
 */
export function TitleScreen() {
    return (
        <ScreenShell>
            <div className="grid min-h-[calc(100vh-3rem)] place-items-center">
                <Panel className="w-full max-w-5xl" padding="lg" tone="strong">
                    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                        <section>
                            <div className="mb-5 flex flex-wrap gap-2">
                                <Badge tone="cork">
                                    Final Year Project MVP
                                </Badge>
                                <Badge tone="info">
                                    Desktop-first web game
                                </Badge>
                            </div>

                            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.24em] text-rg-accent">
                                ReleaseGuard
                            </p>

                            <h1 className="text-5xl font-black leading-none tracking-[-0.07em] text-rg-ink sm:text-6xl lg:text-7xl">
                                Review the release before it escapes.
                            </h1>

                            <p className="mt-6 max-w-2xl text-base leading-8 text-rg-muted">
                                Inspect evidence cards, pin suspicious clues,
                                file structured findings, and decide whether a
                                software release should ship, be watched, be
                                held, or be blocked.
                            </p>

                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link
                                    className={buttonClassName({
                                        variant: "primary",
                                        size: "lg",
                                    })}
                                    to="/desk"
                                >
                                    Start Shift
                                </Link>

                                <Link
                                    className={buttonClassName({
                                        variant: "secondary",
                                        size: "lg",
                                    })}
                                    to="/desk"
                                >
                                    Continue
                                </Link>
                            </div>
                        </section>

                        <aside className="rounded-3xl border border-rg-cork/30 bg-rg-cork/10 p-6">
                            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-rg-accent">
                                Current MVP target
                            </p>

                            <ul className="mt-5 grid gap-3 text-sm leading-6 text-rg-muted">
                                <li>Five themed shifts planned.</li>
                                <li>
                                    At least eight authored ticket variants
                                    planned.
                                </li>
                                <li>Local-first save progress.</li>
                                <li>
                                    Deterministic scoring and ticket reports.
                                </li>
                            </ul>
                        </aside>
                    </div>
                </Panel>
            </div>
        </ScreenShell>
    );
}
