# Phase 5 · Finger-following eyes

Release: 0.1.23 · 2026-10-03. Phase 6 expressions are not implemented.

## Behavior and boundaries

- One primary pointer starts on empty Home hero background. Controls, all task
  cards/carousel, fields, dialogs and native-edge margins cannot initiate gaze.
  Crossing controls/tasks, leaving Home or reaching an edge ends the gesture.
- Pointer capture is local to Home, never global. No click prevention, global
  touch handler or carousel gesture interception. Hero background permits native
  pinch zoom; task region retains its existing horizontal swipe behavior.
- Coordinates use the current character rectangle. Smooth tanh bounds constrain
  offsets to ±.22 horizontal and ±.14 vertical. Existing `eyePose` keeps both capsule
  eyes oriented to the sphere surface at radius 1.04; body/lighting/size are unchanged.
- The existing demand-rendered controller owns touch and idle motion. Touch takes
  priority over idle and cancels stale idle timers. Finite 160ms retargeting coalesces
  draw requests; held gaze settles with no timers/continuous draws. Release/cancel
  returns to neutral over 420ms and schedules fresh idle gaze/blink delays.
- A ref-backed input channel carries no saved target and no React pointer/frame
  updates. Overlay, route exit, blur, resize, hiding, lost capture and unmount clean
  up. Offscreen/Reduce Motion/renderer failure disable tracking and keep the static
  fallback. Theme changes do not restart the controller or renderer.
- No personal records, storage, dates, backups, shell heights, safe-area rules or
  keyboard behavior changed. No new runtime dependencies or assets.

## Verified locally

- Production TypeScript/Vite/service-worker build passes. Existing large-chunk
  warnings remain; no added animation loop or rendering pass.
- 170/170 Node tests pass. Tests exercise actual wrapper/controller/scene lifecycle,
  pointer arbitration/capture cleanup, primary/secondary input, controls/edges,
  finite mapping bounds, spherical attachment, theme changes, settled rendering,
  stale callbacks, overlay/hide/resume, Reduce Motion and graphics failures.
- Existing six-frame Home/browser matrix passes 760/760 invariants: Dark/Light at
  390×844, 320×568 and 844×390, with all earlier fixed Home/drawer/editor regressions.
- Local `tests/fixtures/character-gaze.html` runs the real scene/controller without
  app data/service worker. UI buttons supply held targets, release, theme, suspension
  and Reduce Motion. Dark upper-left and Light lower-right extremes were inspected;
  this is renderer evidence, not native touch evidence.
- Local ignored proof: `tests/fixtures/.generated/phase-5-gaze-portrait.png`.

## Physical iPhone acceptance · pending

Update through + → Settings → App & updates; confirm 0.1.23. Do not remove the
installed app or clear storage.

1. Press/hold empty space around the sphere and move slowly: eyes follow smoothly
   within their surface bounds. Hold still, then lift: return gently to idle.
2. Swipe task cards and use Add, Replay, arrows, Edit, completion/Undo, nav and +:
   those actions work normally and must not initiate finger tracking.
3. Try a second finger, pinch zoom, edge/system gestures, rotation, background/resume
   and an overlay during a gesture: no stuck gaze, unintended click or stale motion.
4. Try both themes and iOS Reduce Motion. Reduce Motion keeps neutral static eyes.
5. Confirm no pale strip, clipped nav or task-editor keyboard regression. Check
   responsiveness/battery feel on the physical iPhone; desktop tests cannot prove it.
