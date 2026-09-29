# Lumen: iPhone implementation plan

Status: phase 0 recovery path is live. Phase 1 storage changes are implemented and tested locally on `codex/indexeddb-storage`, but are not published. The iPhone backup and real-device verification are still required.

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

Local implementation: the repository, per-record transactions, image blobs/thumbnails, save-status/retry UI, and copy-then-verify migration are in the feature branch. Automated tests cover migration, reload, failure rollback, image bytes, and export/restore. The old `localStorage` record is intentionally left untouched. Do not publish this migration until a real iPhone archive has been saved, passed Lumen's integrity check, and copied off the phone. Then run the remaining iPhone checks below before calling this milestone done.

- [ ] Replace the single large `localStorage` JSON record with an IndexedDB repository. Store records separately and image originals as blobs; keep small UI preferences separate.
- [ ] Save changed records transactionally. Report storage and quota failures instead of silently showing success. Show a quiet save indicator and an explicit error/retry path.
- [ ] Add versioned, idempotent migration from `personal-os-demo-v1`. Compare record counts and image integrity after migration. Preserve the old record until the new store and export have been verified.
- [ ] Generate thumbnails for display without replacing original uploaded images. Load media only where needed so photos do not slow every screen.
- [ ] Test reload, app termination, storage-full failure, interrupted writes, export, import, and an app update with real user-created records.
- [ ] Keep data access behind a small repository interface so a future home-server sync option can be added without rewriting screens. Do not build that server now.

Done when: every create, edit, delete, and upload survives a reload; failed saves are visible; a verified export restores the same content on a clean installation.

## 2. iPhone layout and interaction pass

- [ ] Separate production full-screen layout rules from the simulated phone-frame styles. Consolidate shared colors, spacing, typography, safe-area, and viewport rules instead of stacking more page-specific overrides.
- [ ] Audit Home, Brain, Projects and project detail, Health, Journal, Inspiration, People, Focus, every popup, and the bottom navigation in the installed app.
- [ ] Fix clipped or stretched cards, horizontal overflow, awkward scroll containers, notch and home-indicator overlap, keyboard-covered fields, modal sizing, and touch targets.
- [ ] Check portrait layout first, then rotation, larger text, reduced motion, and Safari versus Home Screen mode where behavior differs.
- [ ] Replace the full-screen welcome tap target with a real **Enter Lumen** button. Tapping outside the button must do nothing. Add a short press animation and keyboard/focus behavior.

Done when: every control and text field is reachable on the target phone; no screen is cropped or unexpectedly stretched; the welcome button is the only entry action.

## 3. Performance pass, starting with Brain

- [ ] Measure Brain opening time, long frames, memory use, and tap/drag response on the iPhone before changing its renderer. Record a baseline for comparison.
- [ ] Stop rebuilding graph nodes and deduplicating links with repeated full-array scans on each render. Memoize stable graph data and use indexed lookup for links.
- [ ] Keep one dot for each note, but render the dense lines/dots with a lighter drawing approach and show detailed connections only when useful (for example, on selection or zoom). Retain a searchable, accessible note list.
- [ ] Avoid React state updates that redraw the entire graph for every pointer movement. Pause work when the graph is not visible and respect reduced-motion settings.
- [ ] Profile the other screens for oversized images, unnecessary rerenders, and animation work; optimize only where the device measurements show a problem.
- [ ] Keep demo graph notes separate from personal notes. Do not remove seeded notes from an existing installation as an automatic cleanup.

Done when: Brain opens and responds smoothly on the target iPhone without a noticeable multi-second freeze, and its dots still correspond to notes. Record before/after measurements.

## 4. Real dates, daily tasks, and workouts

- [ ] Replace the fixed August 25, 2026 preview date throughout the app with the device's local date. Refresh "today" after midnight and when returning to the app. Store event timestamps and local calendar dates separately.
- [ ] Model one-off tasks separately from recurring tasks. Record completion events by day so the Today view, history, and progress percentage use that day's work rather than a permanent boolean over all tasks.
- [ ] Decide explicitly which existing demo tasks or habits recur. Do not infer recurrence from their titles during migration.
- [ ] Show today's scheduled tasks and overdue open tasks clearly, with a separate place for unscheduled tasks. Preserve yesterday's completed list when a new day begins.
- [ ] Connect Start exercise to the selected day's saved plan. Track sets and workout completion in a dated session, support resuming an interrupted session, and handle rest days.
- [ ] Date journal entries, focus sessions, wellness logs, and uploaded images from the real clock. Preserve old demo dates as historical demo records rather than relabeling them as today.
- [ ] Test month and year changes, a midnight rollover while the app is open, daylight-saving changes, and a changed device time zone.

Done when: opening the app on a new day shows the correct day, previous completions remain in history, and the workout started is the workout planned for the selected date.

## 5. Offline launch, release checks, and recovery practice

- [ ] Add an app-shell cache for reliable offline launch, with a deliberate update strategy so new deployments do not leave an old interface paired with a new data schema.
- [ ] Test in Airplane Mode: launch, write a note, complete a task, attach a photo within available storage, close, and reopen. Show a clear error if a requested action cannot be completed offline.
- [ ] Run focused automated tests for date logic, storage migration, archive validation, and workout-session state. Run the production build and a manual iPhone smoke test for each milestone.
- [ ] Perform a restore drill from an exported archive and document the steps in plain language inside the app or README.
- [ ] Make Settings show the last successful local save and last verified export. Never label unexported phone-only data as "backed up."

Done when: the app starts and core local actions work without a connection; a deployment preserves existing data; a backup can be restored on a clean installation.

## Later: optional home server

The old laptop can later host private sync and off-device backups. That is a separate project: authentication, network availability, encryption, server updates, image storage, automated backups, and restore testing. The repository boundary in milestone 1 prepares the app for this without making the phone depend on a server now.

## Decisions to settle during implementation

- Where will the exported archive be kept outside the phone (Mac, external drive, or a Files location chosen by the user)? A second copy on the same phone does not protect against losing the phone.
- Should exported archives be password-encrypted? This protects sensitive journal and photo data but requires keeping the recovery password safe.
- Which tasks repeat, and should Today include overdue tasks by default? The plan above proposes an overdue section, with recurrence set explicitly per task.
