# Home interaction · Phase 7 verification

Date: 2026-10-03. Runtime tested: 0.1.26, source `2fc408a`.
Local production builds intentionally show `Local preview` rather than a GitHub
build ID. This phase changes tests/documentation only; no new UI, storage schema,
animation behavior, release version or viewport workaround.

## Automated checks — passed

- Production TypeScript/Vite build and service-worker generation: passed. The
  complete offline shell includes the lazy character/graph assets. Existing large
  chunk warnings remain; a successful desktop build does not prove phone speed.
- `node --test tests/*.test.mjs`: **185/185 passed**.
- `npm run test:storage`: **12/12 passed**. Added tests run the real storage hook
  with a disposable mocked repository: pending saves commit in order, an older
  commit cannot claim the latest draft is saved, failed writes preserve the draft
  and retry from the committed snapshot, and failed startup cannot overwrite
  existing data with demo records. Included in the existing CI storage command.
- Existing repository tests verify atomic abort/retry, migration, original image
  bytes, reloads and clean-repository restore. Backup tests verify checksums,
  counts and rejection of malformed/tampered archives. These are automated tests,
  not a completed iPhone Files export/restore drill.
- Settings tests refuse update application during loading/saving/error at both
  the disabled control and handler. Editor/drawer tests preserve drafts and nested
  return state. Update-monitor tests do not force reload when another tab activates
  a worker; new workers wait for explicit application. No new production test hooks.
- Personality/input tests cover finite smiles, touch priority, sleepy/wake,
  stationary settling, cleanup, background suspension and neutral Reduce Motion.
  Those checks do not measure physical-phone GPU use or native touch delivery.

## Browser checks — passed, with limitations

Computer-use testing used separate disposable local origins, never the live
GitHub Pages app's records. No cache/storage reset, uninstall or personal-data
replacement was performed.

### Responsive fixture

`npm run test:home-baseline` regenerated the extracted real Home/editor/drawer/CSS
fixture. Its six-profile matrix passed **826/826 invariant checks**:

- Dark and Light: 390 × 844, 320 × 568, 844 × 390.
- Simulated visible keyboard heights: 500, 300, 228; offset viewport cases.
- Long titles, many tasks/projects, enlarged text, empty/all-done days, save-error
  Retry reachability, nested editing and drawer scrolling/focus.
- Fixed Home and navigation clearance; completion moved the task cards **0px**.

Safe areas, viewport metrics and keyboards in that fixture are simulated. Its
character is a static fallback, not the live renderer. This is not iOS paint proof.

### Real production app, disposable data

Preview origin: `http://127.0.0.1:53654/`; production bundle, real IndexedDB and
service worker. Verified:

1. Welcome entry, required empty-title validation, creating a dated task.
2. Yesterday is read-only; All tasks exposes Today/Unscheduled/Upcoming/Completed.
3. Nested edit/save returns to the selected All tasks tab with the updated edit
   control focused. Cancel returns to Home without adding a task.
4. Completion updates real progress/counts, and undo remains available.
5. Settings reports 0.1.26 and Data & backup reports offline shell **Ready**.
6. Download backup action reached the app's downloaded-file confirmation message.
   The browser automation's download event timed out, so the actual saved file was
   **not confirmed or reselected**. Do not treat this as a successful UI restore
   drill or off-device backup. Automated archive/repository restore checks passed.
7. Stopped only this preview server and confirmed no listener on port 53654.
   Reload still opened the cached welcome/Home shell, including the character;
   the renamed task and completion survived.
8. With the server still stopped: edited the task, undid its completion, opened the
   cached Brain graph route, changed Dark → Light, reloaded and verified the new
   title/open state/theme persisted. Returned to Dark. No console errors/warnings
   were captured for this production tab.

This is a **server-unavailable cached-shell test**, not airplane mode. The host
remained online, so `navigator.onLine` stayed true. Real phone offline launch and
network-indicator behavior are still separate acceptance checks.

### Real character renderer

The isolated no-storage renderer fixture became Ready. Reduce Motion stayed
neutral despite a Happy event; pause/resume and the finite all-done lifted smiling
arches were visually checked. It does not simulate native finger dragging.

Local proof files (ignored generated artifacts):

- `tests/fixtures/.generated/phase-7-offline-dark.png`
- `tests/fixtures/.generated/phase-7-offline-light.png`
- `tests/fixtures/.generated/phase-7-all-done.png`

Test tabs were closed and the temporary viewport override removed. Both test
servers were stopped. Disposable browser test records/cache were left intact;
user data was not deleted. No runtime bug was found in these local checks.

## Physical iPhone acceptance — still pending

Earlier feedback confirms the full-height strip fix, the relocated history
control, task popup functionality and sleepy animation. It does not establish
that every integration case or the revised 0.1.26 happy eyes passes.

Use the existing Home Screen installation, **do not reinstall or clear data**.
Check version 0.1.26 in **+ → Settings → App & updates**.

1. **Tasks/layout:** create and edit a task, hide/refocus the real keyboard, use the
   date picker, rotate both ways, swipe cards, complete/undo, and open Yesterday /
   All tasks. Repeat in Light. Save and navigation must remain reachable; Home
   must not scroll vertically or show the old bottom strip. Try larger system
   text if you use it.
2. **Character:** drag continuously through empty Home space, hold for 3 seconds
   without text selection, release, complete tasks and undo. Confirm the lifted
   smiling eyes look happy, sleepy remains distinct, and interactions feel smooth.
   Background/resume should not replay a greeting or queued expressions. Check
   Reduce Motion; physical settled/background GPU behavior is not measured here.
3. **Offline:** after shell Ready, close and reopen in airplane mode, edit a task,
   close/reopen and confirm it persists, then reconnect. Do not remove the app.
   A backup recovery drill should use an empty/disposable installation; never
   replace the personal installation's data merely for QA. Export/checking a copy
   in the existing app is non-destructive, but copying it off the phone is needed
   before relying on it as recovery.

Gate: local Phase 7 checks complete; physical layout/gesture/offline/performance
acceptance remains open. Phase 8 handoff is not marked complete by these results.
