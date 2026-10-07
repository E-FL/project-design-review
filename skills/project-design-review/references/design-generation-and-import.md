# Design generation and individual-screen import

Read this when the user requests suggested designs from Stitch, Claude Design or another source, or supplies a multi-screen export. The agent owns the handoff and configuration; the user describes what to change and reviews it inside the canonical board.

## Automatic use and remembered choice

Use this skill for substantial page alternatives even when the user says only “redesign these pages in Stitch” or “compare this Claude design with the app.” Keep implicit invocation enabled. Native client skill discovery selects the skill; this package does not install a global tool interceptor or an unattended AI service.

Remember `designGeneration` through `configure_review.py` alongside existing project details:

```json
{"designGeneration":{"provider":"stitch","projectUrl":"https://stitch.withgoogle.com/projects/example"}}
```

Providers: `auto` (use an available appropriate generator), `stitch`, `claude-design`, `agent` (the active coding agent authors a local prototype), `external` (import supplied work), or a lowercase id for another available designer. Custom ids are remembered preferences, not installed adapters; discover the actual connected tools/export workflow before using them. `projectUrl` is optional and stays project-specific. Changing providers clears the old URL unless a new one is supplied; an explicit `projectUrl:null` also clears it. Never store credentials, claim connection from a saved preference, or silently replace an explicitly requested provider. The user never edits the profile or a manifest.

## Generate the actual alternatives

Inventory the requested product/page/state/view combinations and inspect the current captures. Prepare a bounded brief containing the raw request, design system, retained behaviors, desired changes and rationale, synthetic fixture data, viewport dimensions, screen locale, theme, platform conventions and relevant accessibility constraints. Use the selected review language for the brief and explanations; specify the captured product UI language separately. A shared component belongs to Shared, not to a made-up product.

Use `prepare_design_request.py --workspace <project> --stdin --expected-version <profile version>` to freeze the brief and baseline hashes:

```json
{
  "requestId":"home-alternative-1",
  "request":"Create a calmer home screen using Stitch.",
  "designBrief":"Preserve the primary action and all fixture information. Reduce competing emphasis; use the project's type and spacing tokens. Explain changed elements in English.",
  "targets":[{"pageId":"P01","views":[{"viewport":"mobile","platform":"pwa","language":"en","theme":"light","variant":"Default"}]}]
}
```

Omitting a target's `views` uses its actual baseline capture matrix. It does not invent all combinations. Explicit new-state targets may have `baseline:null`; keep the viewer's missing baseline honest. The immutable request under `.design-review/design-requests/` is **prepared**, not dispatched. It never means a remote job has started.

Then invoke the actual available generator:

| Source | Agent handoff |
| --- | --- |
| **Stitch** | Prefer an authenticated connected Stitch MCP capability. Discover its actual tools/schema, create or reuse the project's design project, and request named screen alternatives. Fetch individual screen renders and code when provided. If only the authorized browser is available, submit the same brief there and export the selected artboards. Read the [official MCP setup](https://stitch.withgoogle.com/docs/mcp/setup) when connection setup is needed; do not invent endpoints or embed keys. |
| **Claude Design** | In Claude Code, use the client's available `/design` workflow when supported. In another client, use an accessible connected capability or authorized Claude Design browser session. Import its available image, ZIP, standalone HTML or PDF export. See [Claude Design's export and Claude Code handoff](https://support.claude.com/en/articles/14604416-get-started-with-claude-design). An ordinary local HTML authored by the agent is labeled agent-authored, not a Claude Design export. |
| **Other designers** | Apply the same named-screen export contract to accessible Figma, image, HTML, PDF or design-tool exports. Renderer-specific steps belong to the available tools, not invented SDK calls. |

Check connection and account availability each run. If a requested generator is unavailable, report that concrete dependency and continue importing any supplied accessible exports; ask for the missing access only if new generation depends on it. Do not install plugins, subscribe, run arbitrary downloaded code or broaden external sharing from a saved preference. Track the actual provider job reference/status in the working conversation or connected worker. No generated/working state before real dispatch/claim. Inspect returned visuals before declaring the pass ready.

Request **one named artboard per page and state**, with exact page ids/view axes from the frozen request, and editable source where available. Different alternatives remain separate batches; platform variants remain separate verified views. A generator's depiction of an Android screen is design-only evidence, not an Android build.

## Extract what the viewer needs

1. Prefer the provider's individual screen exports. Preserve the original export and its source/project/artboard references.
2. For an HTML prototype, render each route/state at the intended viewport with the available browser, and capture the actual page. Retain inspected editable source separately for preview; screenshot import does not automatically enable a working preview.
3. For PDFs, render the relevant pages with available PDF tooling, then inspect them. Treat PDF pages/contact sheets like image exports after rendering.
4. For one large canvas containing several screens, inspect the original image, identify each complete artboard and measure its bounds in **original-image pixels**. Use visual/DOM artboard bounds when available. The agent maps screens to the page/state inventory; the user does not locate files or type coordinates. Never guess page identity from position alone. If the mapping is ambiguous, resolve it from labels/content before import.
5. Crop deterministically with `import_design.py`; it does not redraw, stretch, translate or synthesize pixels. Preserve the entire original alongside every extracted screen. Prefer a full-page extraction; an optional detail crop must be labeled as a region and retain a separately available full-page view. Do not crop away required actions or errors to make a design appear complete.

The helper requires Pillow only for image extraction. The agent installs `scripts/requirements-design.txt` in its Python environment if needed. PNG/JPEG/static WebP are supported. Render SVG, animated sources, HTML or PDFs before import. Upright exports are required before measuring crop bounds.

## Import manifest (agent-managed)

Stage inspected exports inside the active project workspace and pass relative paths:

```json
{
  "schemaVersion":1,
  "batchId":"stitch-home-pass-1",
  "provider":"Stitch",
  "label":"Stitch · home alternative 1",
  "evidence":"generated",
  "provenance":"Inspected Stitch artboard export; visual proposal, not implemented app evidence.",
  "sourceUrl":"https://stitch.withgoogle.com/projects/example",
  "screens":[{
    "id":"home-pwa-light",
    "pageId":"P01",
    "file":"design-exports/home-canvas.png",
    "artboardId":"provider-artboard-id",
    "artboardTitle":"Provider home",
    "crop":{"x":120,"y":80,"width":390,"height":844},
    "viewport":"mobile","platform":"pwa","language":"en","theme":"light","variant":"Default",
    "note":"The suggested hierarchy keeps the main action while grouping secondary information."
  }]
}
```

Omit `crop` to import an entire individual artboard. Use `evidence:imported` for an inspected supplied export without proof of this agent's generation, or `simulation` for a fictional demonstration. Provider labels are evidence supplied by the inspecting agent, not detected or authenticated by the crop helper. Use localized labels/provenance/notes. `sourceUrl` is optional; retain actual source/artboard identifiers when available.

Run `import_design.py --workspace <project> --stdin --expected-version <fresh profile version>`. It validates page/view mapping, crop bounds, duplicate variants, project-local paths and setup version before writes. It saves original bytes/hashes, isolated PNGs and an extraction receipt under `imports/<new batchId>/`, appends external sources to the matching pages, remembers the source inventory and defaults each affected page to Current / the imported alternative. Old assets, revisions, notes and decisions remain preserved. Every new pass uses a new batch id; exact filenames keep existing flags attached to their own evidence.

For an older board, update the trusted `review-workspace.js` module from this skill before relying on imported defaults/original links. Inspect and preserve any local localization or customization while applying the module changes. Setup does not overwrite existing runtime files automatically. The agent performs this migration and preserves capture/feedback/history files.

Open the returned exact review URL. The center shows the isolated page. **Open original canvas / artboard** gives optional context, while source selectors, full-size flipping, flags and Brief/Full work normally. Missing view combinations remain explicit. An explicit historical/shared URL takes priority over the new default pair.

## Iteration and publication

An imported external source is immediately comparable; it does not change the selected feedback revision or mark a proposal approved. Produce concise rationale or versioned Full explanations according to the saved mode. Keep the generated source, extracted screen and rationale together.

For live changes, follow [issue-worker.md](issue-worker.md): claim only the submitted page/view scope, send that scope and source-bound feedback to the selected generator, import its verified outputs as a new batch, and publish a prepared immutable suggested revision through protected worker completion. Never bypass publication/version guards or silently claim all pages in a generator canvas. If only images are available, explain that an interactive prototype remains unprepared rather than forging a completion URL. Importing screenshots alone does not complete a preview-dependent worker task.

Before delivery, verify the current/imported pair, exact crop/full-page content, page navigation, original link, missing states, source-bound flags, explicit old links and saved preferences. Resume uses the same board and provider preference; generation still needs an available agent/tool connection.
