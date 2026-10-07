# Produce missing captures asynchronously

The missing state on each comparison side has **Produce this capture**. One click saves existing feedback and queues exactly that page, displayed source and selected viewport/platform/language/theme/state. The chosen feedback revision remains independent of the source revision. This authorizes capture preparation only; it does not approve a design or authorize product implementation.

Top axis buttons show **Available 2/2**, **One side 1/2** or **Missing 0/2**, relative to the two selected sources and all other selected axes. An unavailable option stays selectable so the reviewer can request it. A missing image file switches back to the missing state. Source changes recalculate the indicators.

## Request lifecycle

`review-captures.js` saves requests through the same-origin `/api/review-captures` endpoint. The server freezes the actual project/product/page, source id/revision/provider/fingerprint, selected axes and original asset hash when known. Identical queued/working requests reuse one job. Queued means waiting; only a real worker claim shows **Producing capture** and a spinner. Failures expose the reason and **Retry capture**. Requests and results survive navigation/reload in `feedback/captures.json`.

The visible board checks results every five seconds and resumes checking when shown again; the producer runs independently of the browser. Completion updates the matching missing side and availability badges in place. Other pages, exact historical links, feedback revisions and dirty notes remain selected. A notification identifies which page/view is ready.

An unconnected board still saves the request and says it is waiting for a connected worker. Connect the authorized review agent/driver to this queue during a live review, using its actual available capture/generator tools. Do not turn a saved request into a pretend running service. No account keys, recurring automation or external sharing are created by the button.

## Worker handoff

Use the existing loopback worker token through `review-worker.mjs`; never print or export it:

```sh
node review-worker.mjs captures
node review-worker.mjs capture-update --file <agent-written-action.json>
```

`REVIEW_URL`, `REVIEW_WORKER_ID` and `REVIEW_PAGES` work as for the issue worker. A capture action contains `action`, `id`, `expectedVersion` and `workerId`. Claim a queued request, record actual progress, then complete or fail. Ownership and current versions prevent competing or cancelled work from publishing.

Choose the producer according to the **frozen source**:

- **Current:** capture the current product/build or explicitly labeled fixture in the requested view. A new locale requires the actual localized screen or an explicitly commissioned mock fixture; changing a language label does not translate pixels.
- **Preserved revision:** render that revision's preserved source, or restore its recorded bytes. Do not use the latest app to fabricate an old revision's missing capture. If the source cannot reproduce it, fail with the specific dependency.
- **External design:** export/render that design's matching artboard. For a genuinely new platform/theme/locale alternative, use the authorized generator workflow in [design-generation-and-import.md](design-generation-and-import.md), preserving source provenance and explicitly labeling new mock variants. Split multi-artboard exports before publication. A missing hashed asset requires exact byte restoration; a redesign belongs to a new source/revision.

Use synthetic fixture data in demonstrations. Preserve language and platform distinctions. If a generator connection, route/build, locale, design export or renderable source is unavailable, report that failure instead of substituting another capture.

Save a new inspected PNG under `generated-captures/<job id>/<unique-name>.png`, inspect its full-page rendering, verify the exact state/content/platform/locale and record evidence. Complete with:

```json
{
  "action":"complete",
  "id":"the-capture-job-id",
  "expectedVersion":3,
  "workerId":"the-owning-review-agent",
  "image":"generated-captures/the-capture-job-id/mobile-he-light.png",
  "evidence":"fixture",
  "provenance":"Verified localized synthetic fixture for this exact source and state; design-only evidence."
}
```

Allowed evidence labels are `live`, `fixture`, `mock`, `imported` and `rendered`; explain device/build/export boundaries in provenance. `progress` and `fail` use `text`. Browser verification is part of the trusted producer's work; the publication API checks source identity, ownership, version, existing safe PNG paths, dimensions and recorded restoration hashes. It cannot infer semantic correctness from pixels.

Verified results are immutable supplemental captures attached to the requested source/view. They are overlaid by the viewer without rewriting the original revision registry, existing screenshot files, approvals or notes. Old source-bound flags stay with their original image; they are not moved onto the new filename. A capture-only completion needs no fake interactive preview or new design revision. A design change still follows the protected revision workflow.

For older boards, update `index.html`, `review-workspace.js/css`, `review-server.mjs`, `review-worker.mjs` and the new `review-captures.js/mjs` from this skill, preserving local customization/localization. Restart the managed local server after updating its module. Preserve configuration, captures, feedback and history. The agent performs this migration, not the reviewer.
