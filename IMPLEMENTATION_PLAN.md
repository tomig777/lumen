# Lumen: iPhone implementation plan

Status: phases 0–5 have implementation releases. Phase 5 adds a versioned offline app shell, explicit update action, release tests, recovery drill, and truthful save/export status. Real-iPhone performance, layout, date/timezone, Airplane Mode, and wider-screen acceptance remain. Real-iPhone validation is deferred at the user's request until all implementation steps are implemented. The current phone contains disposable demo data only, so the pre-migration archive was waived for these releases. Make an off-phone backup before relying on future personal data.

Target: the installed Home Screen app on an iPhone 13 Pro running iOS 17.3. Keep GitHub Pages for the app. Keep personal data on the phone for now; do not add a cloud account or home server in this phase.

## Rules for every milestone

- Preserve existing phone data. Never reset, replace, or delete it as part of a migration without a verified export and a recoverable rollback path.
- Verify in the installed Home Screen app on the real iPhone, as well as in desktop development. The simulated phone frame is not the acceptance test.
- Show the true save state. "Saved on this iPhone" and "Exported backup" must remain distinct; local storage alone is not an off-device backup.
- Keep the current visual direction and one-dot-per-note meaning in the Brain graph. Support reduced motion and accessible alternatives to gesture-only controls.
- Release one completed milestone at a time. Build and test locally, publish through the existing GitHub Pages workflow, and smoke-test the installed app after each release.

## 0. Baseline and first recovery path

- [ ] Record a screen-by-screen issue list from the installed app: clipping, stretching, scrolling, keyboard, safe areas, navigation, and failed interactions. Capture screenshots or short recordings for the affected screens.
- [x] Inventory the app's `personal-os-demo-v1` format, including notes, journal entries, tasks, projects, embedded image data, and health records. The PC's browser cannot inspect the phone's actual records.
- [x] Add a production-visible **Export data** action before any storage rewrite. The archive contains the actual image bytes as well as text and metadata, a format version, checksum, and a manifest of record counts.
- [x] Add **Import data** with archive validation and a preview of what will be restored. The user must explicitly choose replacement and confirm a separate current-data copy; no merge is offered yet.
- [ ] Test export and restore on a separate clean browser/profile. Have the user save one verified archive outside the Home Screen app before milestone 1.

Done when: a note, journal entry, project, and uploaded image from the phone can all be restored from the exported file, and the original phone data is still intact.

## 1. Reliable on-device storage

Implementation: the repository, per-record transactions, image blobs/thumbnails, save-status/retry UI, and copy-then-verify migration are in the release. Automated tests cover migration, reload, failure rollback, image bytes, and export/restore. The old `localStorage` record is intentionally left untouched. This milestone is not done until the installed iPhone app passes the remaining checks below.

- [x] Replace the single large `localStorage` JSON record with an IndexedDB repository. Store records separately and image originals as blobs; keep small UI preferences separate.
- [x] Save changed records transactionally. Report storage and quota failures instead of silently showing success. Show a quiet save indicator and an explicit error/retry path.
- [x] Add versioned, idempotent migration from `personal-os-demo-v1`. Compare record counts and image integrity after migration. Preserve the old record; a verified off-phone export remains the user's responsibility once personal data exists.
- [x] Generate thumbnails for display without replacing original uploaded images. Load media only where needed so photos do not slow every screen.
- [ ] Test reload, app termination, storage-full failure, interrupted writes, export, import, and an app update with real user-created records.
- [x] Keep data access behind a small repository interface so a future home-server sync option can be added without rewriting screens. Do not build that server now.

Done when: every create, edit, delete, and upload survives a reload; failed saves are visible; a verified export restores the same content on a clean installation.

## 2. iPhone layout and interaction pass

- [x] Move production full-screen viewport, safe-area, keyboard, and touch-target rules into `src/mobile.css`, separate from the simulated phone frame. Shared colors remain in `src/polish.css`.
- [x] Audit Home, Brain, Projects and project detail, Health, Journal, Inspiration, People, Focus, popups, and the bottom navigation in a browser at phone sizes. Check 390 × 844 portrait, 320 × 568 narrow portrait, 390 × 500 short/keyboard-like height, and 844 × 390 landscape.
- [x] Fix the layout issues found in the simulation: double top spacing, fixed-height bottom bar in safe areas, dialog reachability at short heights, form focus zoom, small sheet/menu targets, and the duplicate People home indicator. Keep scrolling content above the navigation.
- [x] Replace the full-screen welcome tap target with a real **Enter Lumen** button. Tapping outside the button does nothing; it has a press animation and native keyboard focus/activation.
- [ ] Verify every page, popup, keyboard interaction, and safe-area inset on the installed iPhone 13 Pro. Correct any differences from browser simulation.
- [ ] Check larger text, reduced motion, and Safari versus Home Screen mode on the actual phone. Consolidate any legacy page-specific overrides exposed by those checks.

Implementation checks: production build and simulated browser layouts. Device acceptance is intentionally pending; the phase is not fully done until every control and text field is reachable on the target phone, no screen is cropped or unexpectedly stretched, and the welcome button is the only entry action.

## 3. Performance pass, starting with Brain

- [ ] Measure Brain opening time, long frames, memory use, and tap/drag response on the iPhone before changing its renderer. Record a baseline for comparison.
- [x] Build graph nodes once per note/search change; deduplicate links with indexed sets rather than repeated full-array scans.
- [x] Keep one dot per note while drawing the 450-dot/3,475-link demo constellation on a single canvas. Tap a dot to open its note; the searchable All notes tab remains the accessible text route.
- [x] Move dot dragging out of React state. Redraw at most once per animation frame, cap canvas pixel density, stop drawing when offscreen or the app is hidden, and use no inertial motion that would conflict with Reduce Motion.
- [ ] Profile the other screens for oversized images, unnecessary rerenders, and animation work; optimize only where the device measurements show a problem.
- [x] Keep legacy demo graph notes in storage and in the constellation, but collapse them behind a separate, searchable group in All notes. Render long lists in batches; never remove seeded notes as an automatic cleanup.

Browser baseline: 450 dot buttons, 450 SVG circles, 3,475 SVG lines, 4,829 graph descendants at 390 × 844. Browser implementation check: one canvas descendant, 450 modeled dots, tap-to-open and drag verified. This is structural evidence, not an iPhone speed claim. Done when Brain opens and responds smoothly on the target iPhone without a noticeable multi-second freeze; record actual before/after measurements there.

## 4. Real dates, daily tasks, and workouts

- [x] Replace the fixed August 25, 2026 preview date with the device's local date. Refresh "today" after midnight and when returning to the app. Store event timestamps and local calendar dates separately.
- [x] Model one-off tasks separately from daily/weekday tasks. Record completion events by day so the Today view, history, and progress percentage use that day's work rather than a permanent boolean over all tasks.
- [x] Decide explicitly which demo tasks recur: new demo tasks 1 and 6 daily, task 2 weekdays. Existing stored tasks are not silently reclassified; they remain unscheduled until edited. Demo habits do not infer recurrence and are not currently surfaced as actionable daily tasks.
- [x] Show today's scheduled tasks and overdue open tasks clearly, with a separate place for unscheduled tasks. Preserve yesterday's completed list when a new day begins.
- [x] Connect Start exercise to the selected day's saved plan via a compact visible date picker. Track sets and workout completion in a dated session, support resuming an interrupted session, and handle rest days.
- [x] Date journal entries, focus sessions, wellness logs, and uploaded images from the real clock. Preserve old demo dates as historical demo records rather than relabeling them as today.
- [ ] Test month and year changes, a midnight rollover while the app is open, daylight-saving changes, and a changed device time zone.

Browser checks: production build; daily/task/workout unit tests; IndexedDB reload tests for completion events and partial workout sessions; local UI check of the date picker, historical plan selection, set completion, and Resume exercise. iPhone rollover, time-zone changes, and installed-app acceptance are still pending. Done when: opening the app on a new day shows the correct day, previous completions remain in history, and the workout started is the workout planned for the selected date on the actual iPhone.

## 5. Offline launch, release checks, and recovery practice

- [x] Add an app-shell cache for reliable offline launch, with a deliberate update strategy so new deployments do not leave an old interface paired with a new data schema. A new shell is installed atomically; existing sessions remain on their release until a user-initiated update or later launch, and the previous shell is retained for open tabs.
- [ ] Test in Airplane Mode: launch, write a note, complete a task, attach a photo within available storage, close, and reopen. Show a clear error if a requested action cannot be completed offline.
- [x] Run focused automated tests for date logic, storage migration, archive validation, workout-session state, and offline shell as a pre-deployment gate. Production build passes. Manual iPhone smoke tests remain deferred.
- [x] Perform an automated restore drill from an exported archive into a clean IndexedDB repository and document the separate-device steps in README. A real second-browser/profile drill remains for device acceptance.
- [x] Make Data & backup show the last successful local save and last integrity-verified export file. Never label unexported phone-only data as "backed up."

Implementation checks: build and focused tests, including an offline worker harness and isolated-database recovery of a note, journal, project, and original photo bytes. Real iPhone Airplane Mode and separate-device recovery acceptance remain open.

Done when: the app starts and core local actions work without a connection; a deployment preserves existing data; a backup can be restored on a clean installation.

## Later: optional home server

The old laptop can later host private sync and off-device backups. That is a separate project: authentication, network availability, encryption, server updates, image storage, automated backups, and restore testing. The repository boundary in milestone 1 prepares the app for this without making the phone depend on a server now.

## Decisions to settle during implementation

- Where will the exported archive be kept outside the phone (Mac, external drive, or a Files location chosen by the user)? A second copy on the same phone does not protect against losing the phone.
- Should exported archives be password-encrypted? This protects sensitive journal and photo data but requires keeping the recovery password safe.
- Which tasks repeat, and should Today include overdue tasks by default? The plan above proposes an overdue section, with recurrence set explicitly per task.
