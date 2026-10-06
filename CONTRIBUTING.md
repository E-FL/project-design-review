# Contributing

Use synthetic examples and disposable review folders. Preserve historical captures, hashes and feedback versions. Keep the skill portable between Codex and Claude Code and keep real worker state separate from demonstration status.

Run `python scripts/validate_package.py`, `python -m unittest discover -s tests -v` and the Node tests documented in the README before submitting a pull request. For UI changes, verify the affected interaction in a browser and include a fictional screenshot when useful.

Do not commit local worker tokens, saved private feedback, account information or real product captures. Explain changes to review/approval semantics explicitly.
