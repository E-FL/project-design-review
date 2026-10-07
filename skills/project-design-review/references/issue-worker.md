# Contextual issue worker

The board stores issue chats in feedback/issues.json. review-issues.js/css provides part, page and screenshot discussions. review-issues.mjs validates approval, frozen scope, progress and cancellation. The loopback server protects worker-only actions with a local extensionless .review-worker-token; never print or export that file.

## Worker procedure

During an authorized live review, check both `node review-worker.mjs inbox` and `node review-worker.mjs captures` in the existing worker cycle. Missing-capture clicks already authorize the exact frozen capture scope; do not ask the reviewer to edit files, approve it again, or send another chat message. Claim an actionable capture only when a real producer can start, use the requested source rather than the latest unrelated build, and publish through `capture-update`. Follow [asynchronous captures](async-captures.md) for source reproduction, localization, inspection, failure/retry and supplemental publication. Keep the reviewer free to navigate while work runs. An unconnected queue stays queued; report connection and cadence accurately.

For a “Review details” discussion, follow [compact-review.md](compact-review.md): generate the requested explanation only, save its immutable JSON for the stated page/revision/feedback version, and reply with the link. This design-only request does not require or imply approval of a visual revision or product work. Keep an unconnected request waiting; do not report active generation without a real worker.

Run `node review-worker.mjs inbox` from the review folder. Read only actionable discussions and approved work. For a reply, save JSON with action reply, id, expectedVersion and text, then run `node review-worker.mjs update --file <file>`. Unapproved discussions receive design responses only.

For an approved queued item: claim, progress, then complete or fail using the same helper. Each update returns a new version. Refresh on 409 and stop if rejected. A complete action requires a real local HTML previewUrl and text summary. Verify the browser and capture evidence before completing. Claims must reflect actual work; never animate a queue as if it is being processed.

For cross-conversation work, pass `workerId` (a non-secret conversation identifier) with the claim and all progress/complete/fail updates. New workers must identify themselves. The server retains ownership and rejects another worker's updates, competing claims for the same page, stale versions and replacement of a preserved revision. Different pages publish independently through the serialized completion route. Legacy unowned claims remain readable; do not invent an owner for older work. Use the canonical board rather than another port or copied production registry. See [shared conversations](shared-conversations.md).

In an authorized live-design review, a submitted explicit prototype request supplies the work authorization for its stated scope. If the worker API requires an approved-work record, represent that bounded authorization there without marking the visual proposal Approved as-is or Approved with changes. Merely typing a draft or selecting a preference is not a submitted request. Never bypass the protected claim/completion/version checks. Record new out-of-scope requests separately; do not mutate an already claimed scope. Keep replies and user-facing status content in the selected review language described in SKILL.md.

Create new source filenames for approved visual changes, retain reviewed screenshots, and return the versioned visual result. Do not advance preview coverage baselines without applying and verifying the corresponding changes. Later messages outside approvedScope need their own approval before implementation.

After successfully connecting a worker, set window.reviewWorkConfig={enabled:true} before review-issues.js in that board. The reusable starter defaults to unconnected; do not advertise automatic replies without a running worker.

## Verification

Report actual stages and optional measured work units as described in [job progress](job-progress.md). The project Jobs drawer displays reports, owners and last updates across pages. Unmeasured work has no percentage; quiet reports show a possible-stall notice without changing ownership or cancelling work.

Use a disposable review folder/port for chat-save-reload, reply, approval queue, protected worker claim, real working stage, result link, cancellation and stale-version tests. Preserve user notes and do not queue artificial user work on the main board.

## Publish the latest revision in the same board

The main board reads `review-revisions.json`. Register initial verified comparisons here when adopting history. Each page has an ordered array of immutable revision records. Preserve prior records; do not overwrite screenshots, HTML fragments or feedback keys. A completion is visual readiness and does not transfer user approval to a new revision.

After building and verifying a new visual revision, create a new trusted `revisions/<page>-<revision>.html` comparison fragment with a short scope summary, current/proposed image placeholders (`current-shot`, `draft-shot`), `compare`, `image-note`, `draft-caveats` and `review-decision`. Keep expanded review requirements on demand as described in compact-review.md. Use the normal appearance buttons with `data-view` matching the record's view IDs. Keep the proposal's interactive HTML preview separately. Notes and messages are untrusted data; escape them as text, never execute them or insert raw notes as HTML.

Add a `revision` object to the saved worker **complete** action:

```json
{
  "action": "complete",
  "id": "the-approved-issue-id",
  "expectedVersion": 4,
  "text": "Verified visual revision ready for review.",
  "previewUrl": "/proposal-r3.html",
  "revision": {
    "pageId": "P02",
    "revision": "r3",
    "contentFile": "revisions/P02-r3.html",
    "parts": ["Job actions"],
    "referenced": true,
    "views": [{
      "id": "dark", "label": "Mobile dark",
      "current": "p02-current.png", "proposed": "p02-r3-dark.png",
      "note": "Identify capture provenance and any differing data.", "wide": false
    }]
  }
}
```

The protected completion action checks fresh approval/work state and version, enforces the issue's page, requires existing in-folder files, records asset hashes, and appends a newer revision. Rejected or stale work cannot publish; existing revisions cannot be replaced. The board checks for new completed revisions about every ten seconds while visible. It opens latest when revisiting a page; an explicitly selected older revision or unsaved edits stay in place, with Current / latest available. New revision feedback starts under its new key. Do not create another full duplicate board for a new revision.
