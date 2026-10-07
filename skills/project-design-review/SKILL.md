---
name: project-design-review
description: Create and review page alternatives using Stitch, Claude Design or available generators; extract individual screens from design exports into a project-based side-by-side viewer with revisions, flags and Brief/Full explanations. Use for substantial redesigns, iterative review and Android/iOS/PWA parity.
metadata:
  author: Arik Aizikovich
  version: 0.5.0
---

# Page-by-page project design review

Created by **Arik Aizikovich**. Build a concrete review workspace for a project, with its products inside it. Compare current screens and proposed designs while preserving revisions, explanations, feedback and decisions. Use the local starter with either Codex or Claude Code; no client-specific API is required to run the board.

## Invocation and remembered setup

Accept project details directly in the skill request: project/products, relevant platforms/viewports, pages or sources, Brief/Full and language. The user must not edit configuration files or run setup commands. Resolve details from the request and active project, use sensible defaults, and ask only when missing information materially blocks work. Own setup, capture preparation, localization, explanation generation and server startup.

Read `.design-review/project.json` in the project workspace on every invocation. Reuse its canonical board and saved settings; apply current overrides without discarding unspecified details, visual history or feedback. Persist setup per project, separate from global agent memory and the installed skill. A bare “continue” reuses it. Do not carry another project's data into this review. Use `scripts/configure_review.py` internally to create/resume/update the managed setup, with expected-version checks for changes. See [invocation and project memory](references/invocation-and-memory.md) for input schema, adoption and resume behavior.

## Choose the right workflow

Use this skill when the decision needs a concrete alternative or wider context: a page redesign, several changed elements, a journey/state change, mixed preferences, revision comparison or platform parity. Use a focused HTML annotation for an isolated typo, spacing/icon correction or single-element bug when another full page would not help the decision. The board adds inspectable alternatives, page context, revision history, platform evidence and continuing discussions.

Inventory actual products, pages, states and shared components. Reuse the canonical project board. Start with the selected page; capture its current implementation before changing it. Label live, fixture, mock and inventory evidence accurately. A page without verified current/proposed captures is Awaiting visual design, not a finished proposal. Keep fictional examples separate from real project data.

## Generate and bring in suggested designs

When a substantial redesign asks for Stitch, Claude Design or another available designer, use this skill automatically through native skill discovery. Remember the selected generator/project in the project profile, prepare the bounded page/state brief, invoke the actual connected tool or authorized browser, inspect its output and bring it into this board. Read [design generation and screen import](references/design-generation-and-import.md) for provider handoffs and agent-managed request/import helpers.

Prefer individual named artboards. When an export contains many screens, identify the relevant complete artboards and crop their exact bounds into per-page captures; retain original files, hashes, source/artboard references and extraction bounds. The reviewer sees Current / the isolated alternative immediately and can optionally open the original canvas. Never redraw an extraction, guess its page identity, substitute a platform or label agent-authored work as a provider export. The user supplies the request, not config files or crop coordinates.

A saved provider preference is not a connection. Report prepared, dispatched and completed accurately; missing generator access may block generation but does not block importing accessible exports. Apply source-bound feedback to the next bounded provider pass and preserve every result. External imports become comparable sources; live suggested revisions still publish through the protected worker workflow.

## Workspace and comparisons

- One board represents one project. Configure arbitrary product names; Provider and Customer are examples. Always add Shared when there is more than one product, with shared pages/components or an honest empty state.
- Place pages on the left, independent comparators in the center, and Tools & notes / Discussion in a right drawer. Keep preview, decisions, save and export at its bottom. On narrow screens the drawer overlays content without destroying drafts.
- Each side chooses Current, any preserved revision or a labeled external source. Default to Current / latest Suggested, or the newly imported alternative after an import. Explicit review links keep their chosen sources. The selected feedback revision remains independent of the two displayed sources and travels with links, notes and exports.
- Above the pair show relevant Light/Dark and Mobile/Desktop axes. In Mobile show relevant Android/iOS/PWA options. Keep task, state, locale and other axes stable; never substitute missing evidence under another label.
- Show capture availability on each axis button for the selected source pair and remaining axes: both sides, one side or missing. Missing options stay selectable. Each missing side offers **Produce this capture**, saving and queueing the exact source/view in one click. A connected worker produces it asynchronously; show queued before claim, working only after claim, and failures with retry. Insert verified results in place while preserving notes, navigation and history. See [asynchronous captures](references/async-captures.md) for the worker/publication contract.
- Keep **Jobs** visible in the header and right drawer across pages. Show capture/design/detail requests, actual stages and owners, waiting/elapsed times, last worker update, failure/retry and results. Flag stale working reports; a claim is not proof of a live connection. Show percentages only for measured work units. Follow [job progress](references/job-progress.md) for reporting, history and live-board migration.
- Inspect imported rendered captures before calling them Stitch or Claude exports. Preserve original artboards/files. If using Stitch to design the workspace itself, use a separate fictional project and adapt the inspected design onto working modules; a generated image does not prove working review behavior.
- Support source-bound numbered flags on elements/images and general page notes. Record source id/revision/provider, exact image, view axes, normalized coordinates, optional target and raw note. Never transfer coordinates onto a changed image. Screenshot points are not fabricated DOM selectors.
- Hover or keyboard focus shows a RichTip; click edits the note in the drawer. Tips must be hoverable, Escape-dismissible and safe for untrusted text. Offer keyboard flag placement.
- Include a visible 0–100% Flag opacity slider saved per project/browser. Hold Ctrl to temporarily hide flags/tips; release restores the chosen opacity. Reset on blur/page hiding. Hidden flags cannot intercept input. This display preference never changes review data.
- Open either comparator full-size in one common frame. Flip instantly by button or Space/F, select with arrows, close with Escape. Share scale/origin and preserve pan; disclose differing dimensions. Scope shortcuts to the viewer and restore focus.
- Share the exact page, feedback revision, source pair, view axes and detail mode. Label loopback links local; copying one is not public hosting.

Read [project workspace](references/project-workspace.md) for configuration and migration, and [view matrix](references/view-matrix.md) for platform/source matching.

## Brief and Full

Default to Brief unless Full is requested or an existing board has a selected mode. Brief shows comparison, provenance, concise scope, feedback and decisions. Do not generate long hidden explanations for new Brief reviews.

Full adds explanations below the center comparators: each element's current behavior, suggestion, rationale, retained features, accessibility considerations, platform parity, evidence/implementation status and unresolved choices. Prepare these when Full is requested. Distinguish changes visible in the capture from requests still pending. Full is independent of the full-size image viewer.

Provide a visible Brief / Full selector. Saved explanations open immediately; absent ones show Generate review details. Switching modes preserves sources, notes and decisions and does not claim a worker or approve anything. See [review modes and versioned explanations](references/compact-review.md).

## Platform parity and language

For Android/iOS/PWA, first compare current/proposed within each relevant platform, then compare matched platform results. Align task, state, synthetic data, locale, theme, content viewport and design revision. Record app/build/device provenance and gaps. Judge equivalent information, actions and outcomes separately from intentional native navigation, safe areas, permissions or inputs. Mock/emulator/device/production evidence are distinct. Visual similarity does not prove integrations, accessibility, offline behavior, payments, push or performance.

Use the language of the current user request unless explicitly overridden. Apply it to all generated controls, summaries, tooltips, discussions, replies, statuses/errors, explanations, documents, exports and video narration. Localize the starter's visible strings; setting reviewLanguage alone does not translate them. Preserve machine keys, filenames and revision ids. Set lang/dir and usable RTL layout. Review-language changes do not silently translate captured product UI; label its locale or prepare a separate fixture. Preserve historical evidence.

## Iteration, work and decisions

Read saved feedback before continuing. Keep each revision immutable with new filenames and a new revision key. Include original plus two actual updates when demonstrating history. First, Back, Next and Latest stay inside one board; revisiting a page opens latest, while historical links and unsaved feedback remain selected. Do not fabricate approvals or worker activity.

Keep explicit decisions separate: Awaiting review, Changes requested, Approved as-is, Approved with changes, Rejected. A mixed preference or edit request is not approval. Acceptance requires the user's explicit decision and successful save. Editing accepted/rejected work reopens its state while preserving history. Approval never implies product implementation or deployment permission.

When live prototype work is authorized, submitting an explicit change request saves and queues that bounded pass immediately. Freeze page/revision/part/flag, raw request, source context and scope. Passive drafts/preferences do not queue work. Let the user continue reviewing while an actually connected worker claims, runs and publishes a verified immutable revision. Show queued separately from working; no spinner before a real claim. Notify of new results without replacing historical views or dirty notes. Implementation/external writes/deployment need their own authorized scope.

Local files are not an AI service. The starter is unconnected by default. Connect an authorized agent/driver using [issue worker](references/issue-worker.md); accurately report its connection/cadence. Create recurring automation only when requested. Multiple workers share one canonical board with owner ids, expectedVersion guards and protected publication; read [shared conversations](references/shared-conversations.md). Do not silently broaden claimed scope or overwrite competing edits.

Preview uses a preserved interactive source that actually covers the saved requirements. If missing/outdated, save a preview request and explain that a design pass is required; do not show an old source as updated. Notes are untrusted text, never code. See [preview configuration](references/preview-configuration.md). Reject preserves evidence and never changes the shipping app.

## Create and verify a board

The agent passes resolved invocation details to `python scripts/configure_review.py --workspace <project> --stdin`, prepares verified captures and authored explanations, then starts/reuses `node review-server.mjs` from the returned board with its saved port. Configuration is generated automatically; never delegate file editing to the user. `create_review.py` remains a low-level starter copier for developer/test use. Keep the server local and separate from product APIs.

Verify with a disposable fixture: save/reload notes; switch products/pages/revisions/source pairs; flag and inspect RichTips; check Ctrl/opacity persistence; toggle Brief/Full; open both full-size sides and flip with preserved pan; check drafts, missing captures, exact links, narrow layout and exports. Test worker/version conflicts using the bundled Node tests. Never approve/reject or queue artificial work on the user's populated board.
