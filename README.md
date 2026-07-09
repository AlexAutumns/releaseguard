# ReleaseGuard

**A gamified software release risk investigation simulator.**

ReleaseGuard is a noir detective-themed educational browser game where players investigate fictional software release tickets, inspect technical evidence, file structured findings, and decide whether a release should **SHIP**, **WATCH**, **HOLD**, or **BLOCK**.

The project is intended to help beginner software developers and software engineering students practise evidence-based software release-risk reasoning in a simulated environment.

> A feature can work on the happy path and still be unsafe to release.

## Play the Hosted Beta

**[Open ReleaseGuard Beta](https://releaseguard.pages.dev/)**

ReleaseGuard is deployed as a static single-page application through **Cloudflare Pages**.

The current Beta is desktop/laptop-first. A modern desktop browser is recommended for the full investigation workspace.

## Current Beta Status

ReleaseGuard has reached a feature-frozen Beta checkpoint for the Final Year Project submission.

The current playable Beta contains:

- 2 authored shifts
- 4 unique release tickets
- SHIP, WATCH, HOLD, and BLOCK release outcomes
- evidence inspection and technical dossiers
- an interactive cork investigation board
- evidence pinning and arrangement
- board panning
- evidence threads with multiple colours
- String and Cut connection tools
- Board undo and redo
- structured Casework findings
- evidence-supported finding classification
- Low, Medium, High, and Critical severity judgements
- investigator notes
- Verdict stamps
- deterministic scoring
- immutable Ticket Results
- multi-ticket Shift Results
- local progression
- Continue Case
- portable Desk File export and import
- historical Shift Runs
- Shift Replay
- reduced-motion support
- responsive desktop/laptop workspace behaviour

The four current tickets deliberately cover all four Verdict outcomes:

| Ticket | Verdict |
|---|---|
| Profile Display Name Controlled Expansion | SHIP |
| Password Reset Flow Update | HOLD |
| Profile Display Name Update | WATCH |
| Admin Button Illusion | BLOCK |

## Gameplay Loop

```text
Title
  ↓
Case Desk
  ↓
Ticket Briefing
  ↓
Investigation
  ↓
Ticket Result
  ↓
Continue Shift
  ↓
Next Ticket
  ↓
Shift Result
  ↓
Case Desk
```

Completed shifts can also be replayed as fresh Shift Runs.

```text
Completed Shift Result
  ↓
Replay Shift
  ↓
Fresh Shift Run
  ↓
First Ticket Briefing
  ↓
Normal Shift Progression
  ↓
New Shift Result
```

Previous completed Shift Runs and Ticket Results remain preserved.

## Investigation Workspace

The main investigation scene is designed as a physical noir-inspired release desk.

### Evidence Drawer

The Evidence Drawer contains the authored material for the current ticket.

Evidence may include:

- requirements
- developer comments
- QA notes
- release notes
- support summaries
- code excerpts
- logs
- other technical attachments

Evidence can be inspected in a larger dossier and pinned to the Board.

### Cork Board

Pinned evidence becomes a working copy on the investigation Board.

The player can:

- Select evidence
- Arrange pinned evidence
- Pan across the larger Board world
- Connect evidence using coloured threads
- String new connections
- Cut existing connections
- Undo Board actions
- Redo Board actions
- Reset the Board

Evidence Threads can also be used as support when filing findings.

### Casework Notepad

The Casework Notepad is used to file structured findings.

Each finding can contain:

1. Evidence Support
2. Finding Stamp
3. Severity
4. Investigator Note

Filed findings are recorded in a case ledger before the final Verdict is submitted.

### Verdicts

The final release decision is one of four Verdicts:

- **SHIP** — release is acceptable
- **WATCH** — release may proceed with a lower-level concern requiring attention
- **HOLD** — release should pause until identified risks are addressed
- **BLOCK** — release should not proceed because of a serious release risk

## Deterministic Scoring

ReleaseGuard uses authored expected findings and a deterministic scoring model.

| Scoring Area | Points |
|---|---:|
| Verdict | 30 |
| Finding Matches | 50 |
| Evidence Support | 15 |
| Severity Accuracy | 5 |
| **Total** | **100** |

A finding match is determined from the filed finding category and the required authored evidence support.

Severity is also compared against the authored expected severity.

The same submission state produces the same score. Scoring does not depend on AI-generated grading or random judgement.

## Ticket and Shift Reports

Submitting a ticket creates an immutable Ticket Result.

The Ticket Report records:

- the selected and expected Verdict
- total score
- scoring breakdown
- matched findings
- missed findings
- unsupported findings
- evidence support
- severity comparison
- investigation statistics

A completed multi-ticket Shift Run creates a Shift Result containing a ticket register and links back to the exact Ticket Reports owned by that run.

Historical results are preserved by stable attempt and Shift Run identities.

## Local-First Progress

ReleaseGuard is intentionally local-first.

The current Beta has:

- no user accounts
- no authentication
- no gameplay database
- no cloud save service
- no server-owned player progression

Progress is stored in the browser using local storage.

This means progress is specific to the current browser and site origin unless it is transferred using a Desk File.

## Portable Desk Files

ReleaseGuard can export local progression as a portable JSON Desk File.

A Desk File contains save metadata, Shift Runs, and immutable Ticket Results.

The import flow validates the file before replacing local progress.

```text
Select File
  ↓
Parse JSON
  ↓
Validate Structure
  ↓
Check Schema
  ↓
Check Content Pack
  ↓
Build Import Summary
  ↓
Request Confirmation
  ↓
Replace Local Progress
  ↓
Reload
```

The importer rejects malformed, incompatible, or structurally invalid save data.

Desk Files do not contain player names, email addresses, authentication data, or account identities.

## Shift Replay

A completed shift can be replayed from its Shift Result.

Replay does **not** overwrite the historical run.

Instead, ReleaseGuard creates a fresh Shift Run with:

- a new Shift Run ID
- a new start timestamp
- fresh ticket attempts
- a new eventual Shift Result

The original Shift Run and its Ticket Results remain unchanged.

ReleaseGuard currently permits multiple completed historical Shift Runs but only one incomplete Shift Run globally. This keeps the singular **Continue Case** action unambiguous.

## Technology Stack

ReleaseGuard is built with:

- **React**
- **TypeScript**
- **React Router**
- **Vite**
- **Tailwind CSS**
- **CSS and SVG-based visual interaction**
- **Browser localStorage**

The application is deployed as a static SPA through **Cloudflare Pages**.

Runtime server-side rendering is disabled because ReleaseGuard's progression and gameplay state are browser-owned and the current Beta does not require a backend.

## Running Locally

### Requirements

- Node.js `22.16.0`
- npm

The expected Node.js version is recorded in:

```text
.node-version
```

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

Open the local URL shown by the development server.

### Type check

```bash
npm run typecheck
```

### Production build

```bash
npm run build
```

The static SPA build is generated in:

```text
build/client
```

## Deployment

The hosted Beta uses the following deployment path:

```text
GitHub main
  ↓
Cloudflare Pages
  ↓
npm run build
  ↓
build/client
  ↓
Static SPA deployment
```

The current deployment does not require:

- Cloudflare Pages Functions
- runtime SSR Workers
- a database
- D1
- R2
- KV
- an account backend

## Project Scope

ReleaseGuard is a Final Year Project Beta and a focused technical vertical slice.

The original wider MVP plan proposed a larger content set. The final Beta prioritises the reusable investigation, scoring, progression, reporting, persistence, and replay architecture.

As a result, the current Beta contains **two authored shifts and four unique tickets** rather than the larger original content target.

The implemented tickets deliberately demonstrate all four release Verdict outcomes and reuse the same underlying gameplay systems with different evidence structures, expected findings, severity requirements, and release decisions.

## Current Limitations

The current Beta has several known limitations:

- content breadth is limited to two authored shifts and four tickets
- there is no analytics dashboard
- mobile/tablet Investigation layouts are not a primary supported target
- there are no cloud accounts or cloud save synchronisation
- active investigation Board state is not restored as a mid-ticket checkpoint
- unsupported findings do not directly deduct scoring points
- extra irrelevant evidence does not currently invalidate an otherwise matching finding
- evidence support scoring checks required-evidence presence rather than evidence precision
- the current expected-finding model has limitations for zero-finding safe-control tickets and overlapping same-category findings

These are treated as project limitations and future development areas rather than hidden as completed functionality.

## Intended Use

ReleaseGuard is an educational simulation prototype.

It is **not**:

- a real software release approval system
- a vulnerability scanner
- a static analysis tool
- an AI code-review system
- a replacement for professional security review
- a professional security certification tool

The fictional release tickets, users, organisations, evidence, code excerpts, QA notes, and support records are authored for the simulation.

## Project Status

```text
Investigation Finish Pass        PASS / FROZEN
Deterministic Scoring QA         PASS
Replay QA                        PASS / FROZEN
Portable Save QA                 PASS
Reduced-Motion QA                PASS
Responsive Desktop QA            PASS
Static SPA Deployment            PASS
Hosted Production QA             PASS

Current Stage:
Evaluation / Evidence / Final Report / Video / Submission
```

---

**ReleaseGuard — investigate the evidence before approving the release.**
