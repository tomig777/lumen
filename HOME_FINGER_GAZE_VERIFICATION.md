# Phase 5 · Finger-following eyes

Current release: 0.1.24 · 2026-10-03; initial implementation was 0.1.23.
Phase 6 expressions are not implemented.

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
  priority over idle and cancels stale idle timers. Frame-owned 35ms exponential
  smoothing coalesces draw requests; pointer moves update targets without restarting
  the clock. Held gaze settles at .0001 tolerance with no timers/continuous draws. Release/cancel
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
- 172/172 Node tests pass. Tests exercise actual wrapper/controller/scene lifecycle,
  pointer arbitration/capture cleanup, primary/secondary input, controls/edges,
  finite mapping bounds, spherical attachment, theme changes, settled rendering,
  stale callbacks, overlay/hide/resume, Reduce Motion and graphics failures. Added
  move-before-render checks at 30/60/120Hz and stationary three-second holds.
- Existing six-frame Home/browser matrix passes 826/826 invariants: Dark/Light at
  390×844, 320×568 and 844×390, with all earlier fixed Home/drawer/editor regressions.
- Local `tests/fixtures/character-gaze.html` runs the real scene/controller without
  app data/service worker. UI buttons supply held targets, release, theme, suspension
  and Reduce Motion. Dark upper-left and Light lower-right extremes were inspected;
  this is renderer evidence, not native touch evidence.
- Local ignored proofs: `tests/fixtures/.generated/phase-5-gaze-portrait.png`
  (initial renderer QA) and `tests/fixtures/.generated/phase-5-drag-fix-home.png`
  (final production Home; desktop safe-area values are not native iPhone evidence).

## Physical-feedback fix · 0.1.24

The user reported that eyes respond to touch-down but not dragging, and long holds
open selection/copy UI. Two concrete drag failure paths were verified locally:

1. Retargeting restarted the easing timestamp on every input. A deterministic
   move-immediately-before-render test failed on 0.1.23. It now passes at 30/60/120Hz;
   smoothing time advances with rendering rather than restarting with each move.
2. Actual production hit testing reached R3F's canvas, whose inline
   pointer-events:auto wrapper has overflow:hidden and touch-action:auto. That
   inner scroll-container policy can let native panning cancel pointer input before
   the hero policy participates. `.home-character *` now overrides that inline
   style narrowly with pointer-events:none!important. Final real-renderer hit
   testing reaches `.liquid-bowl-stage`, not a renderer child. The matrix includes
   an injected inline-auto wrapper regression to protect this behavior.

Home/character/cards explicitly disable standard/WebKit user selection and iOS
touch callouts. Inputs/editable descendants are exempt; dialogs and other routes
are outside the selector. Production Add dialog still opens, all task-title text
can be selected, and Close restores focus without saving. Browser computed CSS
uses user-select:none on Home and auto on the editable field (auto is selectable).
No pointer/touch preventDefault handler, global event blocker or pinch-zoom ban.

Sources checked: [Apple Safari CSS properties](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariCSSRef/Articles/StandardCSSProperties.html)
for selection/callout controls and [W3C Pointer Events](https://www.w3.org/TR/pointerevents/)
for touch-action arbitration/cancellation. Native iOS callout suppression and drag
feel still require the user's physical retest; a desktop pass is not that proof.

## Physical iPhone acceptance · pending

Update through + → Settings → App & updates; confirm 0.1.24. Do not remove the
installed app or clear storage.

1. Press/hold empty space around the sphere and move slowly: eyes follow smoothly
   within their surface bounds. Hold still for at least three seconds: no text
   selection/copy/loupe UI; then lift and confirm a gentle return to idle.
2. Swipe task cards and use Add, Replay, arrows, Edit, completion/Undo, nav and +:
   those actions work normally and must not initiate finger tracking.
3. Try a second finger, pinch zoom, edge/system gestures, rotation, background/resume
   and an overlay during a gesture: no stuck gaze, unintended click or stale motion.
4. Try both themes and iOS Reduce Motion. Reduce Motion keeps neutral static eyes.
5. Confirm no pale strip, clipped nav or task-editor keyboard regression. Check
   responsiveness/battery feel on the physical iPhone; desktop tests cannot prove it.
