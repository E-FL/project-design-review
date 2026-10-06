# Brief and Full reviews

Brief is the default: comparisons, provenance, a short summary, feedback and decisions. Full includes the same working controls and adds detailed element explanations below the center comparison. `reviewConfig.reviewMode` sets the initial mode; `?detail=brief|full` overrides it. The visible selector saves a per-project browser preference and includes the selected mode in shared links. Mode switches do not change feedback, source choices or approvals.

For a new Brief review, do not pre-generate long prose and hide it. For an explicitly requested Full review, prepare useful explanations for the reviewed page: current behavior, proposed behavior, rationale, retained features, accessibility, platform parity, evidence/implementation status and unresolved choices. Avoid filling fields with repetitive boilerplate. Clearly separate already visible changes from pending requests.

## Saved details and generation

- Authored `requirements` with `elements`, `items`, `scope`, `open` or `detailsGenerated:true` can show immediately. Existing authored legacy sections remain readable. Immutable historical fragments may contain their own explanations.
- Full automatically checks for details matching the selected page/revision and current saved feedback version. If absent, it shows **Generate review details**. Switching modes does not submit work automatically.
- Clicking Generate saves the feedback and requests a design-only explanation through the issue API. It does not accept a proposal, authorize product implementation or start a recurring automation. Show active work only after a real claim. Without a connected agent the request remains saved until an authorized agent handles it.
- Brief can reveal saved details on demand in the drawer. Full displays them below the comparison. Closing optional details keeps Preview, Request changes, Approve and Reject available.
- Editing the feedback invalidates loaded versioned explanations. Never substitute another revision or feedback version. Preserve old explanation files.

## Explanation schema

Read the selected revision and raw feedback, then write immutable `review-details/<page-revision>-v<feedbackVersion>.json`:

```json
{
  "key": "P01-r3",
  "feedbackVersion": 2,
  "summary": "Explain the scope of this review.",
  "elements": [{
    "name": "Primary action",
    "current": "The action is separated from its task context.",
    "proposed": "Place it inside the task card.",
    "reason": "The user can act where they read the relevant information.",
    "keep": "Retain task details and eligibility rules.",
    "accessibility": "Verify the named button and focus order in the app.",
    "platform": "Match the task and state on Android, iOS and PWA.",
    "status": "Requested; not yet applied to the shown revision."
  }],
  "items": [{"title": "Bounded requirement", "detail": "An actionable explanation."}],
  "scope": "Actual implementation and verification status.",
  "open": ["An unresolved choice, if any."]
}
```

Fields are rendered as escaped text. Use the selected review language in every human-readable value; stable JSON keys remain unchanged. Reply to the originating discussion with the saved file link. **Check requested details** loads it on the next click; revisiting Full also checks for prepared data. Historical explanations describe their own review revision, even if the comparators display other sources.

“Changes requested” is pending feedback, not acceptance. Approved as-is and Approved with changes require explicit acceptance. Generating explanations or authorizing prototype work does not supply visual approval.
