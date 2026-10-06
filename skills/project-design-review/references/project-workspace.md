# Project review workspace

`review-workspace.js` / `.css` coordinate the existing feedback, issue, requirements, preview and revision modules. They do not change worker claims, saved-note version checks or visual approval semantics.

## Configuration

```js
window.reviewConfig = {
 reviewLanguage: 'en', direction: 'ltr',
 project: {id:'morrow', title:'Morrow', products:[
  {id:'provider', title:'Provider', viewports:['mobile','desktop'], platforms:['android','ios','pwa'], languages:['en'], themes:['light','dark']},
  {id:'customer', title:'Customer', viewports:['mobile'], platforms:['pwa'], languages:['en'], themes:['light','dark']}
 ]},
 pages:[{
  id:'P01', productId:'provider', title:'Dashboard', revision:'r1',
  views:[{id:'pwa-mobile-en-light',viewport:'mobile',platform:'pwa',language:'en',theme:'light',variant:'Default',label:'PWA · English · Light',wide:false,current:'p01-current.png',proposed:'p01-r1.png',note:'Fictional matching fixture.'}],
  parts:[{name:'Primary action',current:'Earlier hierarchy',proposed:'Suggested hierarchy'}],
  externalSources:[{id:'stitch-1',label:'Stitch concept 1',provider:'Stitch',provenance:'Inspected export; original artboard retained.',views:[{id:'pwa-mobile-en-light',viewport:'mobile',platform:'pwa',language:'en',theme:'light',variant:'Default',image:'sources/stitch-1.png'}]}]
 }]
};
```

Use actual project/product names. The example is fictional. `productId:'shared'` identifies cross-product pages; `sharedWith:['provider','customer']` can record participating products. Shared appears automatically for two or more products even without entries. Single-product boards do not need a Shared tab. Legacy pages without `productId` are assigned to the first configured product.

Page-specific axes override product axes. Relevance and capture availability are different: configure relevant platforms even when evidence is not prepared. Such choices display the precise missing combination. Screen locale is independent of the board's review language. Localize all starter strings for the user's requested language; setting `reviewLanguage` alone does not translate the English starter.

## Sources, revisions and flags

Current baseline comes from inventory captures. Each preserved revision supplies proposed captures via `review-revisions.json`. Each comparator lists these independently, plus page `externalSources` and existing reference captures. Use a new external source id and file when its design changes; never overwrite a flag's image. Capture filenames must be local safe paths; preserve file hashes and imported provenance when available.

The page's selected **review revision** owns feedback, decisions and conversations. Left/right displayed revisions are independent and included in contextual discussions and shared URLs. New notes snapshot the source id, label, kind, provider/revision, image and view axes. Existing flags stay on their recorded image only, even when that image moves to the other side. A screenshot flag is a coordinate on captured evidence, with an editable element/image label. Only claim a DOM selector when actually inspected and recorded separately.

RichTips show raw note text safely using text nodes, with mouse hover, keyboard focus, Escape and pointer movement into the tip. Keyboard flag placement accepts a side and normalized position. General page notes require no coordinate.

The edit panel always includes a labeled **Flag opacity** range control with a visible percentage: **0% hides flags**, **100% is solid**. It applies immediately to all screenshot flags and persists per project in this browser across pages, revisions and reloads, independently of feedback and decisions. Hold **Ctrl** to temporarily hide flags and their RichTips; release restores the saved opacity. Clear the temporary override on window blur or page hiding so a missed keyup cannot leave the review hidden. Hidden flags must not block pointer input or keyboard focus. Do not consume normal Ctrl shortcuts. Opacity is a display preference, never a change request or revision edit.

## Full-size inspection and sharing

Open either side full-size. Both images occupy one frame; Flip, Space/F and arrows switch synchronously without transitions. Fit/Actual-size mode and pan are shared. Use a common scale/origin and flag different dimensions; different evidence must not be described as exact pixel alignment. Escape closes and restores focus. Shortcuts are scoped to the viewer.

Share review captures page, feedback revision, left/right source ids, viewport, platform, screen language, theme and state. Restoring an unavailable source shows its missing state; never silently select latest. Loopback URLs are useful on the same local review server and are labeled local. Remote publication needs a separately authorized hosting/sharing mechanism.

## Migrate an existing board

Read saved feedback and decisions first. Add the workspace CSS/JS and shell; move existing module nodes into the drawer rather than copying their state. Preserve revision registry entries and captures. Assign project/product/page ids without renaming feedback keys. Do not rewrite old hashes or coordinates. Test a disposable copy before applying to a user's populated board. Current saved feedback versions, immutable publication and protected worker scope remain mandatory.

An explicit **Request these changes & start** action saves its draft and queues a bounded prototype request in one action. Sending a discussion note alone does not authorize a design pass. A connected worker can run while users review elsewhere; show queued versus actually claimed work accurately. Keep new revision ready notifications from replacing a selected historical source pair or unsaved feedback.

## Review detail modes

The Brief / Full selector sits above the comparators. Brief keeps the center compact; Full opens page parts and prepared element explanations below the comparison. Mode is a saved project display preference and is included in exact links. It is distinct from the full-size image viewer. See [compact-review.md](compact-review.md) for generated content, missing details and version invalidation.
