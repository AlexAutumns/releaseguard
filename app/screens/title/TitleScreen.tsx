import { Link } from "react-router";

import { Badge } from "../../components/ui/Badge";
import { Button, buttonClassName } from "../../components/ui/Button";
import { Panel } from "../../components/ui/Panel";
import { ScreenShell } from "../../components/ui/ScreenShell";

/**
 * Title screen for ReleaseGuard.
 *
 * This screen acts like a game title screen, not a normal website homepage.
 * The tone should be noir detective first, academic project second.
 */
export function TitleScreen() {
    return (
        <ScreenShell>
            <div className="grid min-h-[calc(100vh-7rem)] place-items-center">
                <div className="grid w-full gap-5 xl:grid-cols-[1.25fr_0.75fr] xl:items-stretch">
                    <Panel className="min-h-[520px]" padding="lg" tone="raised">
                        <div className="flex h-full flex-col justify-between gap-8">
                            <section>
                                <div className="mb-5 flex flex-wrap gap-2">
                                    <Badge tone="warning">Case File</Badge>
                                    <Badge tone="info">Release Risk Desk</Badge>
                                    <Badge tone="danger">Verdict Pending</Badge>
                                </div>

                                <p className="mb-3 font-mono text-xs font-extrabold uppercase tracking-[0.26em] text-rg-amber">
                                    ReleaseGuard
                                </p>

                                <h1 className="max-w-5xl text-5xl font-black leading-none tracking-[-0.07em] text-rg-text sm:text-6xl lg:text-7xl xl:text-8xl">
                                    Every release leaves a trail.
                                </h1>

                                <p className="mt-6 max-w-3xl text-base leading-8 text-rg-muted lg:text-lg">
                                    Step into the release desk. Inspect
                                    evidence, pin clues, file findings, and
                                    stamp a verdict before risky code escapes
                                    into production.
                                </p>
                            </section>

                            <section>
                                <div className="flex flex-wrap gap-3">
                                    <Link
                                        className={buttonClassName({
                                            variant: "primary",
                                            size: "lg",
                                        })}
                                        to="/desk"
                                    >
                                        Begin Investigation
                                    </Link>

                                    <Button
                                        disabled
                                        size="lg"
                                        title="Continue will be enabled after local save progress is implemented."
                                        variant="secondary"
                                    >
                                        Continue Case
                                    </Button>
                                </div>

                                <p className="mt-3 max-w-xl font-mono text-xs uppercase tracking-[0.16em] text-rg-faint">
                                    Continue is locked until local save progress
                                    is implemented.
                                </p>
                            </section>
                        </div>
                    </Panel>

                    <Panel
                        className="min-h-[520px]"
                        padding="lg"
                        tone="notepad"
                    >
                        <p className="font-mono text-xs font-extrabold uppercase tracking-[0.22em] text-rg-folder-dark">
                            Desk Notes
                        </p>

                        <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-rg-paper-ink">
                            First assignment
                        </h2>

                        <div className="mt-6 grid gap-5 pl-12">
                            <div>
                                <p className="font-bold text-rg-paper-ink">
                                    MVP objective
                                </p>
                                <p className="mt-2 text-sm leading-7 text-rg-paper-muted">
                                    Review fictional release tickets through
                                    evidence cards, findings, verdicts, scoring,
                                    and reports.
                                </p>
                            </div>

                            <div>
                                <p className="font-bold text-rg-paper-ink">
                                    Investigator rule
                                </p>
                                <p className="mt-2 text-sm leading-7 text-rg-paper-muted">
                                    A working feature is not automatically a
                                    safe release. Follow the evidence before
                                    stamping a verdict.
                                </p>
                            </div>

                            <div className="rounded-2xl border-2 border-rg-stamp/45 bg-rg-stamp/10 p-4">
                                <p className="font-mono text-xs font-extrabold uppercase tracking-[0.18em] text-rg-stamp">
                                    Reminder
                                </p>
                                <p className="mt-2 text-sm leading-6 text-rg-paper-muted">
                                    Unsupported findings weaken the case.
                                </p>
                            </div>
                        </div>
                    </Panel>
                </div>
            </div>
        </ScreenShell>
    );
}
