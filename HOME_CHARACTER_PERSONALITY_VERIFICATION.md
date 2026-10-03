# Phase 6 · Quiet character personality

Release: 0.1.25 · 2026-10-03.

## Behavior

- Greeting is a 480ms double blink, with a 60-second cooldown across quick Home
  route changes and overlay dismissals. Cooldowns are in-memory presentation state,
  never saved to device records. A delayed draw does not replay an expired greeting.
- After 40 seconds of visible, uncovered inactivity, eyes ease to .48 openness
  over 600ms. The settled sleepy pose has no continuous rendering and only an
  8–12-second blink timer. Touch/keyboard activity postpones sleep; waking takes
  280ms. Resume starts fresh inactivity timing, without background-time catch-up.
- A Home completion must be confirmed in the action's state commit before a happy
  signal is emitted. A refused action loses its ticket; later data restores cannot
  trigger it. Loading completed tasks, restoring, midnight rollover and empty days
  do not create completion reactions. Undo cancels an existing happy expression.
- Happy uses the existing capsule eyes: 160ms to .36 openness, hold until 700ms,
  then 220ms to neutral (920ms total). A user action finishing a nonempty day uses
  .28 openness and holds until 1300ms (1520ms total). No text/banner is inserted.
- Positive reactions have a 1500ms rate limit; all-done may upgrade an active happy
  reaction. Events are not queued. Touch gaze wins immediately and wakes lids
  gently; release retains the existing 420ms return and fresh idle timing.
- The controller requests draws only during finite transitions. Happy holds wait
  on one timer; settled touch gaze has none. Input uses transient subscriptions,
  without React updates per move/frame. One task-level commit counter consumes
  rejected action tickets without changing task order, scheduling or persistence.
- Overlay, hidden/offscreen Home, unmount, Reduce Motion and graphics failure
  cancel timers, input subscriptions and expressions. Static fallback remains
  usable. Themes do not restart the controller. No body motion, mouth, sounds,
  guilt/sad reactions, palette, eye proportions, shell or navigation changes.

## Local verification

- Production TypeScript/Vite/offline-shell build passes. Existing large-bundle
  warnings remain; no new dependencies, assets, draw loop or render pass.
- 181/181 automated tests pass, including deterministic timing, priority/cooldown,
  slow sleepy blinks, zero settled draws, stale timer cancellation, channel cleanup,
  real mesh scaling, wrapper visibility/failure behavior, Home applied-event guards,
  completion/undo and all previous storage/date/backup/viewport regressions.
- Six-case browser matrix passes 826/826 invariants: Dark/Light at 390×844,
  320×568 and 844×390, plus existing editor/drawer/enlarged-text/layout checks.
- Real scene fixture was inspected for all-done squint, sleepy after an actual
  40-second wait, direct gaze wake and priority, and neutral Light Reduce Motion
  after a completion signal. No renderer error logs were reported.
- Production preview on a fresh localhost origin verified real completion/undo,
  0→50→100% progress, retained state after reload, and the final-task squint.
  Character, task slot and navigation bounds match before/after completion.
  Desktop safe-area values are not native iPhone evidence.
- Local-only ignored proofs in `tests/fixtures/.generated/`: `phase-6-all-done.png`,
  `phase-6-sleepy.png`, `phase-6-home-complete.png` and `phase-6-home-squint.png`.
  The renderer fixture uses supplied targets; it does not prove native gestures.

## Physical acceptance still pending

After the normal data-preserving update, confirm version **0.1.25** in Settings.
Leave Home alone for about 40 seconds, then drag a finger across the hero area;
check gentle wake and continued following. Complete a task and the final task,
then undo; check quiet squints and unchanged layout. Open/close an editor, leave
and return, and try Reduce Motion. Assess actual smoothness/GPU/battery cost on
the iPhone 13 Pro rather than inferring it from desktop tests.

Do not reinstall, clear storage or delete the Home Screen app. Broader integrated
device acceptance remains Phase 7; final handoff remains Phase 8.
