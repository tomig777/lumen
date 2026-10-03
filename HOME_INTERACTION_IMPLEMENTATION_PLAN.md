# Lumen · fixed Home, task dialogs and character interactions

Planning baseline: 0.1.19 / 99a866a, 2026-10-03.
Status: Phases 1–6 implementation/local verification complete; Phase 5 follow-up
fixes are in 0.1.24 and Phase 6 personality is in 0.1.25. The user accepted the Phase 2 keyboard fix, Phase 3 drawer and
Phase 4 primary Home layout on their iPhone. Their Phase 5 drag/long-press feedback
has been addressed locally; physical retest and detailed device edge cases remain
pending. Phase 6 physical feel remains pending; Phases 7–8 are final testing/handoff.

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

Physical follow-up (2026-10-03): the user reported “okay it works, you can continue”
after Phase 2. This accepts the main keyboard placement fix, not every native
picker, predictive-text, hardware-keyboard or rotation case listed above.

## Phase 3 · Add Yesterday and preserve access to all tasks

Primary areas: Home callbacks/overlay state in `src/App.tsx`, `src/daily.ts`,
theme-aware dialog styles and Home/daily tests.

- [x] Add a fourth task-control button, using a circular-arrow/history icon with
  an accessible Yesterday label. Updated user-approved order: Add, History,
  Previous, Next (Phase 4 follow-up).
- [x] Preserve heading/date/control alignment and touch sizes. Where four controls
  cannot fit beside the full date, give the control row its own predictable space.
- [x] Open a task drawer on Yesterday, showing the full local date, recorded
  completions and a neutral empty state. History entries are read-only; opening
  them must not repeat, undo or reschedule a task.
- [x] Include an All tasks tab containing existing daily, overdue, unscheduled,
  future and completed tasks, with existing edit/complete actions where meaningful.
  A historical row must never silently toggle today's task state.
- [x] Use the existing date/recurrence helpers; update yesterday on local midnight
  and return from background. Do not subtract a fixed 24 hours across DST changes.
- [x] Reuse centralized overlay ownership so the character pauses and underlying
  Home is inert. Keep internal list scrolling, focus/close and draft-safe editor
  transitions; restore drawer tab/context after editing an All tasks item.

Tests: month/year/DST boundaries, recurrence, missing dated events, empty history,
edited current titles, task visibility, nested editor return, focus restoration,
both themes and drawer scrolling without scrolling Home.

Gate: every task previously reachable below Home is accessible in the drawer
before the old groups are removed. History wording accurately describes the data.

Phase 3 verification recorded in `HOME_TASK_DRAWER_VERIFICATION.md` (0.1.21,
2026-10-03): production build, 164/164 Node tests and 288/288 task/Home browser
invariants across six theme/size cases pass. Production preview verifies edit/save,
completion/undo, persistence, focus restoration and normal data-preserving update.
The selected-tab contrast was checked in both themes. History remains read-only;
future/off-day tasks remain editable without recording a false completion today.
The old below-Home groups and completion paragraph deliberately remain for Phase 4.
No storage migration, shell-height change or eye animation changes. Physical
drawer testing on the installed iPhone was subsequently accepted by the user;
unreported rollover/rotation edge cases are not assumed tested.

Physical follow-up (2026-10-03): the user said the popup and functionality are
great, and requested Replay between Add and Previous alongside Phase 4.

## Phase 4 · Turn Home into a fixed, stable dashboard

Primary areas: `HomeScreen` in `src/App.tsx`, `src/home.css` and Home tests.

- [x] Remove the all-complete paragraph. Keep actual progress/badge and a concise
  non-layout-changing accessible completion announcement; no replacement banner.
- [x] Remove all task groups beneath today's carousel; do not change their data.
- [x] Allocate available Home height between progress header, character/caption,
  date/controls and one task-card region, reserving the existing nav/safe clearance.
- [x] Disable vertical scrolling on Home only, including background rubber-band
  gestures where feasible. Preserve task swipes, native system gestures and zoom;
  do not install a global touch-prevention handler.
- [x] Preserve the approved sphere diameter/placement on the normal iPhone portrait
  layout where space allows. Use compact gaps/stage/card variants for short screens
  and a deliberate landscape arrangement, not clipped content.
- [x] Keep cards and the empty state in the same allocated slot. Counts, all-done
  state and completion undo must not shift the header, sphere, controls or card frame.
- [x] Preserve existing horizontal open/done ordering unless testing reveals a
  separate unwanted jump; anchor the active task through updates. Do not silently
  redefine scheduling/order as part of removing the paragraph.
- [x] Handle long titles and large text with readable summaries plus accessible
  full details in the task dialog. Never hide Save errors/Retry to make Home fit.

Tests: no vertical Home overflow, horizontal carousel still works, first/last task,
completion/undo, empty/all-done, long date/title, increased text, save failure and
all-task access. Compare before/after geometry on the target portrait size.

Gate: Home is genuinely usable without vertical scrolling; nothing important
is merely hidden by overflow. Other routes/dialogs retain their normal scrolling.

Phase 4 verification recorded in `HOME_FIXED_DASHBOARD_VERIFICATION.md` (0.1.22,
2026-10-03): production build, 165/165 Node tests and 760/760 browser invariants
pass. Includes all earlier editor/drawer regression coverage, both themes, short
portrait, landscape notch padding, enlarged text, long dates/titles and save error.
The normal standalone portrait character remains 216 × 216 at y=148.39. Empty,
open and all-done task slots match; real production completion/undo does not move
the character, card slot or nav. Home alone cannot scroll vertically. Short-screen
copy/stage yields to readable controls; landscape uses two columns. Full titles
remain accessible in labels and the existing task editor. No records, shell,
keyboard, storage or animation-controller changes. The user subsequently confirmed
the fixed Home looks good on their iPhone and authorized Phase 5. Detailed edge-case
device checks remain separate; this acceptance is not a claim that every Phase 7
check was performed.

## Phase 5 · Add finger-following eyes

Primary areas: `HomeCharacter.tsx`, `HomeCharacterScene.tsx`,
`characterAnimation.ts` and character/Home tests.

- [x] Extend the existing animation controller, rather than starting another loop.
  Priority: suspended/hidden/overlay > direct touch > brief expression > idle.
- [x] Track one primary pointer on the empty Home background only. Exclude controls,
  cards/carousel, fields, overlays and system-edge gestures; do not steal their taps.
- [x] Map pointer coordinates relative to the character into bounded curved-surface
  gaze. Smooth movement and keep both eyes attached to the sphere.
- [x] On release/cancel/lost capture/route exit, blend to neutral and resume fresh
  idle timing. A touch waking sleepy eyes must not jump or replay old timers.
- [x] Use refs and coalesced draw requests, not React updates per pointer event/frame.
  A stationary finger should settle without continuous rendering.
- [x] Keep the existing single lazy scene, DPR cap, static failure fallback and
  cleanup. Reduce Motion stays neutral/static; task controls remain independent.

Tests: coordinate bounds, eye attachment, touch arbitration, pointer cancellation,
overlay interruption, hide/resume, unmount, theme change, stationary draw suppression,
Reduce Motion and graphics failure.

Gate: finger gaze feels smooth on the iPhone without interfering with card swipes
or buttons, and stops doing work when settled/hidden.

Phase 5 implementation/local verification recorded in
`HOME_FINGER_GAZE_VERIFICATION.md` (0.1.23, 2026-10-03): production build,
170/170 automated tests and 760/760 browser layout invariants pass. Empty hero
background alone starts tracking; task region, controls and system edges are
excluded. Direct gaze uses bounded .22/.14 surface offsets and finite 160ms easing;
release returns over 420ms then schedules fresh idle delays. No extra loop, renderer,
per-pointer React update or persistent interaction state. Hidden/overlay/failure
and Reduce Motion suspend input and animation; theme changes preserve gaze.
Physical gesture feel and system-edge behavior remain pending. Sleep/wake and
brief expressions are Phase 6, not part of this release.

Phase 5 physical-feedback follow-up (0.1.24, 2026-10-03): user reported drag not
following and selection/copy UI on long holds. Continuous input before each render
reproduced the controller's retarget-clock starvation; input now updates only the
target while a frame-owned 35ms exponential smoothing clock advances the pose.
An inspected production Canvas also overrode pointer-events:none with inline auto
on an overflow:hidden wrapper. All decorative renderer descendants are now
click-through, so hero pinch-zoom policy remains the gesture surface. Home-only
user-select/touch-callout rules suppress selection, with editable exceptions;
other routes/dialogs keep their defaults. Stationary gaze settles at .0001 tolerance
without continuous draws. Release remains 420ms with fresh idle timing. Build,
172/172 tests and 826/826 browser invariants pass. Real iPhone drag/hold retest is
pending; no global touch prevention, shell/data changes or personality work.

## Phase 6 · Add restrained personality states

Timing below is a starting point for phone tuning, not a fixed visual commitment.

- [x] Greeting: one short double blink when returning to Home, with a cooldown
  so transient editor dismissals do not cause repeated greetings.
- [x] Sleepy/wake: after roughly 30–45 seconds of visible, uncovered inactivity,
  ease into half-lidded eyes and slower blinks; wake gently on eligible interaction.
  No wall-clock catch-up or surprise sleep immediately after background resume.
- [x] Happy: a brief soft squint on a real user-triggered task completion. Use the
  current rounded eyes; a curved happy silhouette is optional only if it blends
  naturally. Undo, data load, restore and midnight rollover do not trigger delight.
- [x] All done: a slightly longer happy response only on a user action taking a
  nonempty day from incomplete to complete. No text insertion or layout movement.
- [x] Rate-limit/coalesce reactions during rapid completion. Direct gaze wins;
  do not queue a long series of expressions to play later.
- [x] Keep body, palette, lighting, size and numerical progress unchanged. Do not
  add sad/guilt reactions to inactivity or overdue tasks; puzzled moods are deferred.
- [x] Expressions remain transient presentation state, not stored personal data.
  Keep cancellation/reset and Reduce Motion behavior shared with idle/touch motion.

Tests: transition/priority matrix, one reaction per qualifying event, empty-day
exclusion, rapid taps/undo, no load/restore reactions, deterministic timings,
bounded timers/rendering and neutral fallback/cleanup.

Gate: the character feels supportive and quiet, never delays task actions, and
does not need continuous settled rendering or alter task semantics.

Phase 6 implementation/local verification is recorded in
`HOME_CHARACTER_PERSONALITY_VERIFICATION.md` (0.1.25, 2026-10-03): production build,
181/181 automated tests and 826/826 browser layout invariants pass. The real renderer
was checked for sleepy/wake, direct gaze priority, all-done squint and static Reduce
Motion in Light. Production Home completion/undo, reload persistence, stable geometry
and the applied final-completion squint were checked on disposable localhost data.
Greeting lasts 480ms with a 60s in-memory cooldown; sleep begins after 40s visible
inactivity, settles at .48 openness, and wakes over 280ms. Happy/all-done are finite
920/1520ms expressions with a 1500ms rate limit and an immediate happy-to-all-done
upgrade. Held expressions use timers rather than continuous draws. No reactions
are queued on restore/load/resume; no appearance, shell, storage or task-semantic
changes. Native iPhone performance/feel and the integrated Phase 7 checks remain
pending; local success is not a physical-device pass.

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
