# Preview changes configuration

The Preview changes action creates an immutable visual snapshot from an already prepared prototype. It does not automatically interpret arbitrary written notes or generate new designs with AI. A request whose feedback is not covered by the source is saved under preview-requests and visibly requires a design pass.

Configure each page-revision key in preview-config.json with title, entry, files, baseline and views. entry and files are filenames directly in the review directory. Include the prototype HTML, scripts, CSS, fonts and images so future changes cannot alter an older snapshot.

Example:

```json
{
  "P01-r1": {
    "title": "Today",
    "entry": "today-proposal.html",
    "files": ["today-proposal.html", "today-proposal.css"],
    "baseline": {"preference":"unreviewed","notes":"","parts":{},"pins":[]},
    "views": [{"label":"Mobile", "width":390, "query":""}, {"label":"Desktop", "width":1200, "query":""}]
  }
}
```

Set baseline to the actual feedback implemented by the prototype, after inspecting and verifying it. Empty marks and approval bookkeeping do not create stale previews; real notes, part preferences and meaningful pins do. Never advance the baseline merely to suppress the warning. Prepare the visual changes first. Keep previous reviewed revisions and annotations unchanged.

The same-origin bounded POST /api/review-preview expects key and expectedVersion. It returns a ready snapshot URL or a needs-design-pass request. It checks the saved feedback version, preserves source files, and does not alter approval.
