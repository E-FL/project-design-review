# Project jobs and progress

The header **Jobs** button and drawer **Jobs** tab show captures, design requests and pending review-detail/discussion replies across every page in this board. The badge counts active requests. Filter active, waiting, working, failed, completed or all records; search by page, source, language or worker.

Cards show the exact source/view or page/revision/part, actual reported stage, owner, elapsed waiting/working time and age of the last worker update. Opening a capture returns to its frozen page/source/axes; opening an issue returns to its saved revision and discussion. Page navigation preserves the Jobs tab, filters and notes. Captures support guarded retry/cancel; these actions do not approve a design.

**Waiting for worker** means no worker claimed that job. Saving a request does not launch an AI process. **Working** identifies a claimant and its last report; it does not prove a continuing connection. After 90 seconds without an update, show a possible-stall notice. Do not automatically cancel or reassign another worker's ownership.

The panel checks saved status every five seconds while visible, sharing updates with the existing capture/discussion modules. Returning to the board or **Refresh now** checks immediately. Refresh failure retains the last known state with a visible error and last successful check; do not present cached status as a fresh heartbeat.

## Worker reports

Send concise actual stages through the existing progress action after claiming real work. Report changes and periodically update the current stage during sustained live work when feasible. Never claim a batch merely to animate it or infer percentages from elapsed time.

An update may include measured units, for example `progress: {completed: 2, total: 4, unit: "platform captures inspected"}`. Use **capture-update --file** for captures or **update --file** for issues, retaining id, expectedVersion, workerId and text. Counts must be nonnegative integers, total positive, completed no larger than total, and unit nonempty. The meter describes those stated units, not an invented overall estimate. Unmeasured work shows its stage without a percentage. Completion still requires the protected verified-result publication contract.

New status/stage reports retain up to 40 timestamped activity events, including failures/retries and worker identity. Retry resets the previous attempt's timing and measured progress while retaining history. Legacy jobs show their actual latest fields; never reconstruct invented earlier events. Render stages and labels as text.

Localize the new controls and **reviewConfig.jobLabels** with the requested review language, independently of the captured product locale.

## Live-board migration

Add **review-jobs.js/css**, the header button, drawer tab/body and initialization from the starter. Update workspace, capture and issue frontend modules while preserving local additions/localization. The drawer displays legacy reports without restarting an active server.

Measured progress and activity history additionally require **review-job-progress.mjs**, **review-captures.mjs** and **review-issues.mjs** plus a safe server restart. Do not interrupt another worker's in-flight publication. Preserve its token, owner/version protections, notes, registry and captures.
