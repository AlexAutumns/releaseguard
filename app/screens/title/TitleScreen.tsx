import { Link } from "react-router";

import { Button, buttonClassName } from "../../components/ui/Button";
import { Panel } from "../../components/ui/Panel";
import { ScreenShell } from "../../components/ui/ScreenShell";

/**
 * Title screen for ReleaseGuard.
 *
 * The hierarchy is intentionally game-first:
 * - ReleaseGuard is the product wordmark;
 * - the tagline supports the product instead of overpowering it;
 * - desk classifications are shown as a typed register line, not SaaS badges;
 * - paper content uses the case-file/typewriter voice.
 */
export function TitleScreen() {
    return (
        <ScreenShell>
            <div className="rg-scene-enter grid min-h-[calc(100vh-7rem)] place-items-center">
                <div className="grid w-full gap-5 xl:grid-cols-[1.25fr_0.75fr] xl:items-stretch">
                    <Panel className="min-h-[520px]" padding="lg" tone="raised">
                        <div className="flex h-full flex-col justify-between gap-8">
                            <section>
                                <div className="rg-register-line mb-7">
                                    <span>Case File RG-001</span>
                                    <span>Release Risk Desk</span>
                                    <span className="text-rg-danger">
                                        Verdict Pending
                                    </span>
                                </div>

                                <p className="rg-display-title text-[clamp(2.8rem,3.8vw,4.8rem)] text-rg-amber">
                                    ReleaseGuard
                                </p>

                                <h1 className="rg-display-title mt-5 max-w-4xl text-[clamp(3rem,4.5vw,5.1rem)] text-rg-text">
                                    Every release leaves a trail.
                                </h1>

                                <p className="rg-body-copy mt-6 max-w-3xl text-base text-rg-muted lg:text-lg">
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
                                        viewTransition
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

                                <p className="rg-technical-label mt-4 max-w-xl text-rg-faint">
                                    Continue locked until local save progress is
                                    implemented.
                                </p>
                            </section>
                        </div>
                    </Panel>

                    <Panel
                        className="min-h-[520px]"
                        padding="lg"
                        tone="notepad"
                    >
                        <p className="rg-folder-tab-label text-rg-paper-ink/78">
                            Desk Notes
                        </p>

                        <h2 className="rg-display-heading mt-4 text-4xl text-rg-paper-ink">
                            First Assignment
                        </h2>

                        <div className="mt-7 grid gap-6 pl-12">
                            <section>
                                <p className="rg-document-meta-value text-rg-paper-ink">
                                    MVP Objective
                                </p>
                                <p className="rg-document-copy mt-2 text-rg-paper-ink/82">
                                    Review fictional release tickets through
                                    evidence cards, findings, verdicts, scoring,
                                    and reports.
                                </p>
                            </section>

                            <section>
                                <p className="rg-document-meta-value text-rg-paper-ink">
                                    Investigator Rule
                                </p>
                                <p className="rg-document-copy mt-2 text-rg-paper-ink/82">
                                    A working feature is not automatically a
                                    safe release. Follow the evidence before
                                    stamping a verdict.
                                </p>
                            </section>

                            <aside className="rg-margin-note">
                                <p className="rg-document-meta-label text-rg-stamp">
                                    Reminder
                                </p>
                                <p className="rg-document-copy mt-2 text-rg-paper-ink/82">
                                    Unsupported findings weaken the case.
                                </p>
                            </aside>
                        </div>
                    </Panel>
                </div>
            </div>
        </ScreenShell>
    );
}
