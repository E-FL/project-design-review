# Invocation details and project memory

The user invokes the skill conversationally. Do not ask them to edit JavaScript, JSON, manifests or environment files. The agent resolves their request, writes the managed setup, inventories/captures the project, localizes the board and starts/reuses its server. Helpers below are agent implementation tools, not user setup steps.

## First invocation

Choose one stable project root for remembered setup: normally the repository root, or the explicit workspace the user selected. A later run from a nested folder should resolve that same root. Fictional demos use their own workspace rather than adopting an unrelated real product's setup.

Example: “Review Morrow, with Provider and Customer products, Android/iOS/PWA mobile and desktop, Full mode, in Hebrew. Remember this setup.”

Use the active project/workspace. Read any `.design-review/project.json` first. With no saved setup, infer the project title, products, page inventory and relevant axes from the request and repository. Use an honest single-product default if no product inventory is known; do not invent multiple products or shipping screens. Ask only for a missing choice that materially blocks the review. Default to Brief, and use the user's request language unless explicitly overridden.

Resolve the request to a data-only object matching `reviewConfig`. Pass it to the helper internally:

```sh
python scripts/configure_review.py --workspace /path/to/project --stdin
```

JSON input example:

```json
{
  "project": {"id": "morrow", "title": "Morrow", "products": [
    {"id": "provider", "title": "Provider", "platforms": ["android", "ios", "pwa"], "viewports": ["mobile", "desktop"]},
    {"id": "customer", "title": "Customer", "platforms": ["pwa"], "viewports": ["mobile", "desktop"]}
  ]},
  "reviewMode": "full",
  "reviewLanguage": "he",
  "runtime": {"port": 5217}
}
```

Supply actual page inventory, view metadata and inspected sources when known; omitted evidence stays missing. `--input` can read an agent-created temporary JSON file when stdin is awkward. Simple overrides such as `--mode full`, `--language he`, `--project-title Morrow` and repeated `--product` are available. Stable ids remain constant when titles change.

The helper creates the board and generates `review-data.js` automatically. It saves `.design-review/project.json` with project configuration, canonical relative board location, runtime port and a version. Defaults describe relevant axes, not prepared captures. The agent supplies real captures, suggestions and requested Full explanations under the normal review rules; generation of those artifacts is agent work, never a user file-editing task.

Start/reuse `node review-server.mjs` from the returned board, using its returned port. First verify an existing listener belongs to this exact board; do not treat another service on the port as the same review. If the port is occupied by another service, choose an available loopback port and save it through the helper. Open the returned URL, which includes the requested detail mode. Set REVIEW_URL consistently for worker calls. Do not claim a running board until its page is reachable.

## Later invocations

“Continue the review” loads the saved project and canonical board. The user need not repeat project/products/platforms/language/mode. Invoke the helper with the same workspace and no new details to resolve the remembered setup. A no-op resume does not create a setup version. Read current feedback, discussion queue and preserved revisions before continuing.

“Switch to Brief” or “add the Customer PWA” is a new override. Apply only the changed fields and keep unspecified details. Supply `--expected-version` when updating an existing profile; refresh on conflict. Product arrays are explicit inventories, so preserve existing products when adding one. Removing a product with retained pages is rejected instead of orphaning them. A different project id requires a separate workspace. Multiple project reviews therefore cannot borrow another project's remembered details.

The helper reads the board's current data-only configuration before merging, so agent-prepared page/source updates are retained. It never writes feedback, issues, capture files, preview snapshots or the revision registry. Prior setup versions are retained in `.design-review/history/`. These are configuration history, independent of visual revisions. Legacy JavaScript configuration must be inspected and migrated by the agent as data; never execute a config just to import it. Explicit adoption: `--board existing-review --adopt`. Do not automatically select among competing boards when the canonical location is ambiguous.

## Language and scope

Explicit current instructions override remembered choices. For a substantive new request, follow its language unless the user specifically set another language; a bare “continue” retains the existing language. Localize all generated controls/content, not just reviewLanguage. Preserve screen locale and historical evidence. Remembered live-work settings describe the previous connection only; verify the worker is running and recheck current work scope before dispatching.

Project memory is local project state, not universal agent memory. Never copy accounts, tokens, credentials or private examples into the installed skill or its public repository. Add `.design-review/` to the project's ignore rules where appropriate, using targeted edits that preserve existing rules. `--show` reports saved settings for the user or agent. Forgetting/resetting setup must be explicit and must preserve visual history and feedback; do not clear them as a side effect of changing configuration.
