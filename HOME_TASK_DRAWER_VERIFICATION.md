# Phase 3 · Yesterday and All tasks

Release: 0.1.21. Date: 2026-10-03.
Scope: replacement task access before Phase 4 removes the sections below Home.
No fixed-Home, finger-following or personality changes in this release.

## Behavior and data safety

- Fourth Home control: Add, Previous, Next, Replay. All have 44px touch targets.
  Existing wrapping gives the controls their own row when a full date cannot fit.
- Replay opens Yesterday with its full local calendar date and recorded completion
  events only. Rows have no edit/complete actions. Legacy boolean-only completion
  does not acquire an invented date. Titles/project names reflect current records,
  not immutable historical snapshots; the drawer says this explicitly.
- All tasks includes each task exactly once under Today, Overdue, Unscheduled,
  Upcoming or Completed. Every row can open the existing editor. Complete/Undo
  follows existing current-day semantics; future/off-day occurrences cannot be
  recorded as completed today. The action also checks the real local day at tap.
- Reuse the existing App date refresh and local-calendar helpers, including
  midnight, foreground return and DST-safe previous-day calculation. No new clock.
- The app owns the drawer outside route scrollers. Its list scrolls internally;
  underlying Home/navigation are inert and the character is suspended. Escape,
  backdrop and Close dismiss, restoring opener focus after background unlock.
- Nested editing hides, but does not unmount, the drawer. Save/cancel returns to
  the same tab, scroll and row focus. If editing/removal/regrouping disconnects a
  focused row, focus returns inside the drawer without moving its scroll position.
- Use both global palettes, selected-tab contrast, quiet surfaces, accessible
  tabs and keyboard focus trap. No main-app glints, WebGL, extra render loop or
  blur layer. Reduce Motion skips optional entrance movement.
- Keep existing task save/delete handlers, save failure/Retry, offline and update
  paths. No storage schema change, migration, cache wipe or installed-phone data
  changes. No personal records are bundled or published.

## Evidence

- `npm run build`: TypeScript/build/offline generation succeed (21 shell files).
  Existing large-chunk warnings remain; no new graphics dependency or renderer.
- `node --test tests/*.test.mjs`: 164/164 pass, including storage/backup, dates,
  recurrence, viewport/editor, themes, character lifecycle and safe update coverage.
- Browser fixture using actual Home, TaskDrawer and RenderSheet: 288/288 checks
  across 390 × 844, 320 × 568 and 844 × 390 in Dark and Light. Retains all 210
  Phase 2 keyboard/Home checks plus read-only history, every-task access, safe
  bounds, internal scrolling, future-action guards, nested editor tab/scroll/focus,
  background locking/unlocking and selected-tab surface/text contrast.
- Isolated localhost production preview: empty Yesterday, All task groups,
  edit/save and completion/undo, persisted edit/completion after reload, return
  focus, Escape/opener restoration, both themes, and safe update from the earlier
  local bundle to 0.1.21 without losing the disposable test task.
- Visual checking through the computer-use skill caught a more-specific legacy
  theme rule hiding the selected-tab surface. Scoped drawer selectors now override
  it; fixture checks assert distinct selected surface/text in both themes.
- Production checking caught focus falling onto the document body when a completed
  row moves group. Disconnected-row focus recovery and a regression test cover it.
- Local screenshot: `tests/fixtures/.generated/phase-3-task-drawer-portrait.png`.
  Ignored, local preview evidence only; it is not physical iPhone acceptance.

The previous phase's 48 shared-editor checks are not rerun here: Phase 3 changes
no shared editor geometry. All Node editor regressions and 210 keyboard/Home
browser checks were rerun. Desktop simulated safe areas/keyboard bounds do not
prove native iOS painting or keyboard event delivery.

## Physical acceptance · pending

Update the installed app through + → Settings → App & updates; confirm 0.1.21.

1. Tap Replay beside the task arrows. Check Yesterday's date, empty state or actual
   recorded completions. History rows must not change today's tasks when tapped.
2. Switch to All tasks. Check overdue/unscheduled/future/completed records remain
   reachable and long lists scroll inside the drawer, not the page behind it.
3. Edit a task, save/close, and verify return to All tasks. Complete/undo a current
   task, reopen the app, and confirm persistence and daily progress.
4. Check both themes, rotation and reopening. Confirm no pale strip, clipped Close
   or keyboard regression. The main Phase 2 keyboard fix is already user-confirmed;
   unreported edge cases are not assumed tested.

The completion paragraph, below-Home task groups and vertical Home scrolling are
intentionally unchanged until Phase 4. The drawer supplies replacement access
first, so the next phase can remove those sections without hiding any tasks.
