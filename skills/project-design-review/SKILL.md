---
name: project-design-review
description: Build project-based page-by-page design review workspaces with side-by-side current, revision and external-source comparisons, saved flags, discussions, Brief/Full explanations and instant full-size flipping. Use for redesigns, iterative review and Android/iOS/PWA parity.
metadata:
  author: Arik Aizikovich
  version: 0.1.0
---

# Page-by-page project design review

Created by **Arik Aizikovich**. Build a concrete review workspace for a project, with its products inside it. Compare current screens and proposed designs while preserving revisions, explanations, feedback and decisions. Use the local starter with either Codex or Claude Code; no client-specific API is required to run the board.

## Choose the right workflow

Use this skill when the decision needs a concrete alternative or wider context: a page redesign, several changed elements, a journey/state change, mixed preferences, revision comparison or platform parity. Use a focused HTML annotation for an isolated typo, spacing/icon correction or single-element bug when another full page would not help the decision. The board adds inspectable alternatives, page context, revision history, platform evidence and continuing discussions.

Inventory actual products, pages, states and shared components. Reuse the canonical project board. Start with the selected page; capture its current implementation before changing it. Label live, fixture, mock and inventory evidence accurately. A page without verified current/proposed captures is Awaiting visual design, not a finished proposal. Keep fictional examples separate from real project data.

## Workspace and comparisons

- One board represents one project. Configure arbitrary product names; Provider and Customer are examples. Always add Shared when there is more than one product, with shared pages/components or an honest empty state.
- Place pages on the left, independent comparators in the center, and Tools & notes / Discussion in a right drawer. Keep preview, decisions, save and export at its bottom. On narrow screens the drawer overlays content without destroying drafts.
- Each side chooses Current, any preserved revision or a labeled external source. Default to Current / latest Suggested. The selected feedback revision remains independent of the two displayed sources and travels with links, notes and exports.
- Above the pair show relevant Light/Dark and Mobile/Desktop axes. In Mobile show relevant Android/iOS/PWA options. Keep task, state, locale and other axes stable; never substitute missing evidence under another label.
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

Run `python scripts/create_review.py <new-directory> --mode brief` (or `full`) relative to this skill. Edit review-data.js, add verified screenshots and authored explanations, then run `node review-server.mjs` from the new folder. Default port: 5217; REVIEW_PORT selects another port. Reuse an existing server where practical. Keep the server local and separate from product APIs.

Verify with a disposable fixture: save/reload notes; switch products/pages/revisions/source pairs; flag and inspect RichTips; check Ctrl/opacity persistence; toggle Brief/Full; open both full-size sides and flip with preserved pan; check drafts, missing captures, exact links, narrow layout and exports. Test worker/version conflicts using the bundled Node tests. Never approve/reject or queue artificial work on the user's populated board.
