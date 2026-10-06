# Independent review switches

The project workspace renders appearance and viewport above both comparators: Light/Dark, Mobile/Desktop where relevant, then Android/iOS/PWA while Mobile is selected, plus configured screen language. Product axes define relevance, with page overrides. Deferred platforms may be labeled paused. Scenario extras remain secondary. External designs belong in the independent source selectors. `review-views.js` / `.css` retain normalization and legacy-board controls during migration.

New views must carry explicit metadata, for example:

```json
{"id":"android-he-light","viewport":"mobile","platform":"android","language":"he","theme":"light","variant":"Default","label":"Android · Hebrew · Light","current":"current-android-he.png","proposed":"proposal-android-he-light.png","note":"Actual emulator UI; matching synthetic job.","wide":false}
```

Product or page config can specify `viewports`, `platforms`, `languages`, `themes`, `deferredPlatforms`, `defaultPlatform`, `defaultLanguage`, `defaultTheme`. Use explicit `viewport:'mobile'|'desktop'`; infer legacy wide captures without rewriting files/hashes. Defaults interpret metadata, not evidence. Languages are configured for each project. A selected unavailable combination hides only the missing side and disables flags on that side. Never substitute another locale, theme, state or platform. Axis changes preserve other selections. Desktop does not claim Android/iOS evidence. Caption/provenance must disclose mocks and unmatched data. For cross-platform parity compare the same task/state/fixture at the same revision with matched content viewport; keep native differences and functional validation separate.

Optional `referenceLinks` (`href`, `label`, `note`) attach separate immutable reference assets below the basic controls without changing a preserved proposal record. Label unadopted generated material as source only; disclose invented data, mixed locales/themes or unrelated content. Do not treat it as production evidence or silently adopt it.

Verify platform and language independently, unavailable states, reference selection, annotation image association, narrow layout and keyboard access. Do not approve real review pages while testing.
