# Lumen · fixed Home, task dialogs and character interactions

Planning baseline: 0.1.19 / 99a866a, 2026-10-03.
Status: Phase 1 baseline and Phase 2 implementation/local verification complete.
Phase 2 physical iPhone keyboard acceptance is pending; later phases are untouched.

This plan extends the completed theme/Home/idle-eye work in
`LUMEN_REDESIGN_IMPLEMENTATION_PLAN.md`. Later user-approved appearance changes
take precedence over the historical `LUMEN_DESIGN_FOUNDATION.md`: the character
is cream with enlarged espresso eyes, Home uses aligned system utility type,
successful saves are not visibly announced, and main-app controls have no glints.
The new fixed Home and interactions supersede the old scrolling/no-touch scope.

## Scope and constraints

- Home becomes a single non-vertically-scrolling page. Horizontal task navigation
  stays. Longer lists/forms scroll inside dialogs, not behind them.
- Remove the visible all-complete paragraph and all groups below daily cards.
  Do not remove records, completion events, completion undo or real progress.
- Add a history/replay icon beside the task + and previous/next controls.
  It initially opens Yesterday; provide All tasks in the same drawer so removed
  overdue/unscheduled groups remain reachable without another Home button.
- Yesterday means **recorded completions yesterday**, not an immutable record of
  everything planned then. No invented dates for legacy boolean completions.
  Historical title/schedule snapshots and deleted-task recovery are out of scope.
- Correct the task editor's keyboard placement and dismissal transitions.
- Extend existing eyes with direct gaze, sleepy/wake, happy and greeting states.
  No sadness based on missed tasks, chat, mouth, limbs, audio or body bouncing.
- Preserve global Dark/Light, warm brown/cream/sand/amber, quiet glass finishes,
  current eye proportions and the normal iPhone portrait character composition.
  The welcome screen alone retains its approved light/glint effect.
- Preserve the physically accepted standalone ancestor/full-height shell fix,
  native safe areas, navigation position and the working offline/update flow.
  Never resize the entire app to accommodate an editor keyboard.
- Preserve local storage, backup integrity, real dates/recurrence and save retry.
  No cloud, storage reset, reinstall, historical-data migration or cache wipe.
- Retain 44px touch targets, accessible labels/focus, readable fields and Reduce
  Motion. Decorative layers cannot intercept control activation.

## Phase 1 · Capture the baseline and add regression fixtures

- [x] Record Home, empty/all-done Home, task editor and navigation bounds at
  390 × 844, 320 × 568 and 844 × 390 in both themes.
- [x] Use disposable test data: empty day, open/completed tasks, yesterday events,
  recurring tasks, overdue/unscheduled tasks, long titles and many projects.
- [x] Inspect the actual `SheetFrame`/`RenderSheet` path, entrance/focus timing,
  containing blocks and `observeEditorViewport` handling; ignore dead legacy UI.
- [x] Add fixtures/assertions for the completion paragraph's current layout shift,
  oversized task form, keyboard-open/dismissed metrics and underlying-page bounds.
- [x] Request a physical-phone task-editor screenshot/recording if the exact
  overlap remains unclear. Separate confirmed cause from unverified candidates.
- [x] Record current character appearance, demand-rendering and lifecycle tests;
  keep those as the reference for later interaction changes.

Gate: reproducible local layout cases and explicit physical-device unknowns.
Desktop keyboard-like fixtures do not establish native iPhone keyboard behavior.

Phase 1 recorded in `HOME_INTERACTION_BASELINE.md` (2026-10-03): six browser
cases, 114 baseline invariants, production build and all 151 Node tests pass.
The completion paragraph displaces cards by 37px; short-height dialogs cannot
keep header and Save visible together. Portrait keyboard delivery remains a
device-only unknown. Actual project choices scroll horizontally rather than
wrapping/tallening the form; Phase 2 must not assume otherwise. No runtime,
version, personal-data or deployment changes. Physical screenshot requested;
phase gate is reproducible cases plus documented unknowns, not an iPhone pass.

## Phase 2 · Make the task editor keyboard-safe

Primary areas: `src/App.tsx`, `src/mobileViewport.ts`, `src/mobile.css` and the
existing mobile-editor/viewport tests.

- [x] Reuse one viewport observer. Compute editor bounds from visible height and
  offset relative to the app, with safe top clearance and a small keyboard gap.
  Coalesce events; handle resize, scrolling, orientation and focus changes.
- [x] Ensure only the intended editing layer consumes these bounds; no double
  offsets, ancestor transformations or unrelated Home/navigation resizing.
- [ ] Check keyboard dismissal while the input still has focus, refocus, native
  date/select controls, predictive text, hardware keyboard and zoom. Do not
  equate input focus alone with a keyboard being present.
- [x] Structure the dialog into persistent heading/close, an internally scrolling
  form and persistent Save/action footer. Keep title and validation accessible.
- [x] Make project selection compact if many project chips exhaust the available
  height; retain all choices and existing schedule/date behavior.
- [x] Coordinate tap-triggered focus with the entrance transition; preserve iOS
  user-gesture keyboard activation, rather than relying on delayed auto-focus.
- [x] Add Done to dismiss the keyboard without closing or discarding the draft.
  On dismissal, ease to the normal resting position; avoid a second animation
  fighting the keyboard's changing bounds. Remove optional motion in Reduce Motion.
- [x] Retain modal focus handling, Escape/back dismissal, save/delete semantics
  and focus restoration; block background interactions while the dialog is open.

Tests: short-height forms, focused field visibility, title/Save reachability,
draft retention across keyboard hide/show, repeated opening, theme changes,
rotation, event cleanup and no shell/nav geometry change. Recheck shared editors.

Gate: local geometry/behavior tests pass; physical iPhone test verifies placement
above the real keyboard and smooth return. If not yet verified, report it as
pending rather than declaring the keyboard problem solved.

Phase 2 verification recorded in `HOME_TASK_EDITOR_VERIFICATION.md` (0.1.20,
2026-10-03): production build, all 156 Node tests, 210/210 task/Home browser
invariants across six theme/size cases, and 48/48 shared-editor checks pass.
The title, heading and Save fit above simulated keyboards; short landscape
uses a compact heading without shrinking 44px actions or 16px fields. Many
projects retain the existing horizontal selector. Production task create/edit,
required-title validation, reload persistence, both themes, Escape and opener
focus restoration were checked in a separate local origin. Done was checked
without saving/discarding the draft. The native keyboard/picker/predictive-text/
hardware-keyboard/rotation checks above remain unchecked until physical testing.
No storage migration, shell-height change, Home content removal or eye changes.

## Phase 3 · Add Yesterday and preserve access to all tasks

Primary areas: Home callbacks/overlay state in `src/App.tsx`, `src/daily.ts`,
theme-aware dialog styles and Home/daily tests.

- [ ] Add a fourth task-control button, using a circular-arrow/history icon with
  an accessible Yesterday label. Order: Add, Previous, Next, History.
- [ ] Preserve heading/date/control alignment and touch sizes. Where four controls
  cannot fit beside the full date, give the control row its own predictable space.
- [ ] Open a task drawer on Yesterday, showing the full local date, recorded
  completions and a neutral empty state. History entries are read-only; opening
  them must not repeat, undo or reschedule a task.
- [ ] Include an All tasks tab containing existing daily, overdue, unscheduled,
  future and completed tasks, with existing edit/complete actions where meaningful.
  A historical row must never silently toggle today's task state.
- [ ] Use the existing date/recurrence helpers; update yesterday on local midnight
  and return from background. Do not subtract a fixed 24 hours across DST changes.
- [ ] Reuse centralized overlay ownership so the character pauses and underlying
  Home is inert. Keep internal list scrolling, focus/close and draft-safe editor
  transitions; restore drawer tab/context after editing an All tasks item.

Tests: month/year/DST boundaries, recurrence, missing dated events, empty history,
edited current titles, task visibility, nested editor return, focus restoration,
both themes and drawer scrolling without scrolling Home.

Gate: every task previously reachable below Home is accessible in the drawer
before the old groups are removed. History wording accurately describes the data.

## Phase 4 · Turn Home into a fixed, stable dashboard

Primary areas: `HomeScreen` in `src/App.tsx`, `src/home.css` and Home tests.

- [ ] Remove the all-complete paragraph. Keep actual progress/badge and a concise
  non-layout-changing accessible completion announcement; no replacement banner.
- [ ] Remove all task groups beneath today's carousel; do not change their data.
- [ ] Allocate available Home height between progress header, character/caption,
  date/controls and one task-card region, reserving the existing nav/safe clearance.
- [ ] Disable vertical scrolling on Home only, including background rubber-band
  gestures where feasible. Preserve task swipes, native system gestures and zoom;
  do not install a global touch-prevention handler.
- [ ] Preserve the approved sphere diameter/placement on the normal iPhone portrait
  layout where space allows. Use compact gaps/stage/card variants for short screens
  and a deliberate landscape arrangement, not clipped content.
- [ ] Keep cards and the empty state in the same allocated slot. Counts, all-done
  state and completion undo must not shift the header, sphere, controls or card frame.
- [ ] Preserve existing horizontal open/done ordering unless testing reveals a
  separate unwanted jump; anchor the active task through updates. Do not silently
  redefine scheduling/order as part of removing the paragraph.
- [ ] Handle long titles and large text with readable summaries plus accessible
  full details in the task dialog. Never hide Save errors/Retry to make Home fit.

Tests: no vertical Home overflow, horizontal carousel still works, first/last task,
completion/undo, empty/all-done, long date/title, increased text, save failure and
all-task access. Compare before/after geometry on the target portrait size.

Gate: Home is genuinely usable without vertical scrolling; nothing important
is merely hidden by overflow. Other routes/dialogs retain their normal scrolling.

## Phase 5 · Add finger-following eyes

Primary areas: `HomeCharacter.tsx`, `HomeCharacterScene.tsx`,
`characterAnimation.ts` and character/Home tests.

- [ ] Extend the existing animation controller, rather than starting another loop.
  Priority: suspended/hidden/overlay > direct touch > brief expression > idle.
- [ ] Track one primary pointer on the empty Home background only. Exclude controls,
  cards/carousel, fields, overlays and system-edge gestures; do not steal their taps.
- [ ] Map pointer coordinates relative to the character into bounded curved-surface
  gaze. Smooth movement and keep both eyes attached to the sphere.
- [ ] On release/cancel/lost capture/route exit, blend to neutral and resume fresh
  idle timing. A touch waking sleepy eyes must not jump or replay old timers.
- [ ] Use refs and coalesced draw requests, not React updates per pointer event/frame.
  A stationary finger should settle without continuous rendering.
- [ ] Keep the existing single lazy scene, DPR cap, static failure fallback and
  cleanup. Reduce Motion stays neutral/static; task controls remain independent.

Tests: coordinate bounds, eye attachment, touch arbitration, pointer cancellation,
overlay interruption, hide/resume, unmount, theme change, stationary draw suppression,
Reduce Motion and graphics failure.

Gate: finger gaze feels smooth on the iPhone without interfering with card swipes
or buttons, and stops doing work when settled/hidden.

## Phase 6 · Add restrained personality states

Timing below is a starting point for phone tuning, not a fixed visual commitment.

- [ ] Greeting: one short double blink when returning to Home, with a cooldown
  so transient editor dismissals do not cause repeated greetings.
- [ ] Sleepy/wake: after roughly 30–45 seconds of visible, uncovered inactivity,
  ease into half-lidded eyes and slower blinks; wake gently on eligible interaction.
  No wall-clock catch-up or surprise sleep immediately after background resume.
- [ ] Happy: a brief soft squint on a real user-triggered task completion. Use the
  current rounded eyes; a curved happy silhouette is optional only if it blends
  naturally. Undo, data load, restore and midnight rollover do not trigger delight.
- [ ] All done: a slightly longer happy response only on a user action taking a
  nonempty day from incomplete to complete. No text insertion or layout movement.
- [ ] Rate-limit/coalesce reactions during rapid completion. Direct gaze wins;
  do not queue a long series of expressions to play later.
- [ ] Keep body, palette, lighting, size and numerical progress unchanged. Do not
  add sad/guilt reactions to inactivity or overdue tasks; puzzled moods are deferred.
- [ ] Expressions remain transient presentation state, not stored personal data.
  Keep cancellation/reset and Reduce Motion behavior shared with idle/touch motion.

Tests: transition/priority matrix, one reaction per qualifying event, empty-day
exclusion, rapid taps/undo, no load/restore reactions, deterministic timings,
bounded timers/rendering and neutral fallback/cleanup.

Gate: the character feels supportive and quiet, never delays task actions, and
does not need continuous settled rendering or alter task semantics.

## Phase 7 · Integrated regression and physical-phone acceptance

- [ ] Run production build and all existing tests, plus new Home/history/editor/
  interaction tests. Update deliberately superseded assertions without removing
  storage, daily-date, viewport or lifecycle safety coverage.
- [ ] Check Dark/Light at 390 × 844, 320 × 568, 844 × 390, keyboard-like heights,
  long titles/many tasks, larger text, fallback scene and Reduce Motion.
- [ ] On the actual iPhone Home Screen app: cold launch, resume, real keyboard open/
  hide/refocus, date picker, rotation, task swipe/edit/complete/undo, history and
  All tasks. Confirm no pale strip, clipped nav or hidden Save action.
- [ ] Check save failure/retry, safe update refusal with unsaved work, and offline
  access. Use disposable profiles for export/restore tests, never reset user data.
- [ ] Check character feel, responsiveness and active/settled/background GPU work
  on the phone. If expensive, lower animation/draw cost; do not mask lag with timers.
- [ ] Record what was browser-tested, automated-tested and physically confirmed
  separately. Outstanding device checks remain explicitly pending.

Gate: core tasks are reliable with or without animation; fixed layout and keyboard
behavior pass physical testing, or the exact remaining limitation is reported.

## Phase 8 · Controlled releases and handoff

- [ ] Use existing GitHub Pages/service-worker/version flow for validated milestones;
  no new deployment system or forced reload while a draft/write is pending.
- [ ] Suggested milestones: editor + task drawer + fixed Home, then finger gaze,
  then personality. Do not publish removal of task groups before replacement access.
- [ ] Verify deployment separately from phone acceptance. Give the expected version
  and short testing instructions; do not call a build/deploy a physical-device pass.
- [ ] Keep updates data-compatible and rollback code-only. Never require removing
  the installed Home Screen app or clearing storage to apply this work.
- [ ] Mark completed checkboxes, findings and device-tuned parameters here as each
  phase is implemented. Stop after the phase the user asks for unless they authorize
  progressing further.

## Explicitly deferred

Immutable full-day history (including deleted/edited planned tasks), cloud/home
server sync, redesign of other pages, new sounds/chat, body motion, extra emotions
and a new user-visible animation settings menu. None is necessary for this scope.
