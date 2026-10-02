# Lumen · global theme, Settings and Home redesign

Design contract: `LUMEN_DESIGN_FOUNDATION.md`. Baseline 0.1.11 / de5bd2b.
Scope approved 2026-10-02: dark-by-default global theme with saved Light option,
welcome-inspired Home/glass navigation, Settings in +, and a real 3D character
with idle eyes. No cloud, character interactions or other-page layout overhaul.

## 1. Design foundation — complete

- [x] Review implemented styles and earlier accepted welcome/iPhone fixes.
- [x] Define dark/light semantic palette, typography, spacing and glass rules.
- [x] Audit routes, overlays, loading/error screens and source coupling.
- [x] Specify Home composition, character/performance boundaries and test gates.

Deliverable: design documentation only. No runtime, data, release/version or
deployment changes. The installed app continues to show the approved baseline.

## 2. Single app-wide theme — implemented; phone acceptance pending

- [x] Add typed Dark / Light preference and one theme owner, defaulting to Dark.
- [x] Apply a guarded saved choice before first paint; define storage failure
  behavior and an older-backup-safe preference policy without touching records.
- [x] Introduce semantic tokens; split overloaded ink/background aliases.
- [x] Convert every screen/overlay/field and meaningful semantic state, not just
  Home; retire page-forced color schemes while preserving their layout rules.
- [x] Adapt welcome artwork/material blending in Light without changing the
  installed icon; keep accepted Dark glint/glow and failure fallback intact.
- [x] Test unknown/missing preference, reload, access failure, both themes, route
  exit overlap and every overlay. Native status behavior requires phone checks.

Gate: no forced page mode, no wrong-theme startup flash under normal storage,
readable controls in both palettes, unchanged records and accepted shell geometry.
Settings UI is Phase 3; use a test harness until its user-facing selector exists.

Verification for 0.1.12 (2026-10-02): build and all 112 tests pass. Browser QA
checked welcome, Home, Brain/library, Projects/detail, Health/wellness/skincare,
exercise builder/library, Inspiration/image viewer, Collections, Journal, Focus,
People/detail and backup, plus task/project/person/journal/routine editors.
Light first paint, cross-tab changes, renderer disposal and local safe-update
reload were checked without clearing storage. Record counts before/after the
update stayed at 450 notes, 2 journal entries, 3 projects, 9 tasks and 0 embedded
images. This count check is not a byte-by-byte physical-phone backup test.
390 × 844, 320 × 568 and 844 × 390 browser checks found no document-width overflow;
the existing standalone full-height/safe-area geometry is unchanged.

Appearance lives in `lumen-appearance-v1`, separate from record backups. Denied
storage still allows an in-session choice but cannot promise persistence. Light
welcome uses the CSS button fallback and a deliberate dark artwork medallion;
accepted Dark artwork/material remains unchanged. Local preview QA controls are
opt-in and not emitted into the published offline shell. Native status-bar
contrast, cold launch/resume, rotation and keyboard behavior still require the
physical iPhone; desktop/browser geometry does not establish those results.

## 3. Settings and quick actions — implemented; phone acceptance pending

The production appearance selector is now available at + → Settings.

- [x] Add Settings route, originating-tab return behavior and accessible heading.
- [x] Replace only Health journal's + tile with Settings/gear; keep other actions.
- [x] Put Appearance, Data & backup, App & updates, Diagnostics and App identity
  inside Settings. Reuse services and existing backup/update guards.
- [x] Remove Home Data & backup link only after the new path is working.
- [x] Keep Home save-state/retry and app-wide failure banners; preserve health
  records and their Health-page entry point.
- [x] Verify + dismissal, nested back behavior, persisted toggle and unchanged
  export/restore/update workflows, including an unsaved-data update refusal.

Gate: every old backup capability remains reachable; theme control works without
editing personal data; Settings returns to the correct tab.

Verification for 0.1.13: build and all 117 tests pass, including native appearance
radio behavior, denied preference persistence, nested section back/focus/scroll,
and update refusal while loading/saving/errored (button and handler). Existing
storage, backup restore/integrity and update-monitor regressions remain in place.
Browser QA verified + → Settings, all four originating-tab returns, backup back
to Settings, Light persistence after reload, keyboard radio selection, identity,
live layout diagnostics and updates. A demo export from the moved backup page
passed Lumen's actual integrity checker (450 notes, 2 journals, 3 projects, 9 tasks;
no embedded images in this profile). No restore was performed on the user's
installation. Health → Sleep → Edit sleep check-in still opens the health editor.
390 × 844, 320 × 568 and 844 × 390 browser checks found no document-width overflow.
Physical iPhone native colors, file/share delivery, safe-area and keyboard checks
remain pending; local preview and automated results do not prove phone behavior.

## 4. Shared glass controls and navigation — implemented; phone acceptance pending

CSS-only shared finishes; no additional nav/button renderer and no replacement
of Home's circle/character in this release.

- [x] Implement lightweight theme-aware primary/icon button and nav/menu finishes.
- [x] Preserve all four tabs, active selection semantics and 44px targets.
- [x] Add pressed/focus/disabled states; validate actual composite contrast.
- [x] Use controlled top glints; no broad face stripe/lower rim, full-page blur,
  individual per-button canvas or decorative pointer-event interception.
- [x] Verify scrolling, menu fit, portrait/landscape and Reduce Motion.

Gate: visually related to approved welcome glass, readable and responsive, with
no duplicate reflection layers or navigation/layout regressions.

Verification for 0.1.14: production build and all 122 tests pass. The five new
tests cover native-button/current-tab semantics, menu routing, Escape/focus,
outside dismissal/listener cleanup, reduced-motion animation branches, sampled
actual gradient/hover composites in both modes, focus/selected-icon contrast and
CSS-only material boundaries. Primary labels remain at least 4.5:1 across the
opaque gradients and hover composites; selected icons/focus at least 3:1.
Disabled controls retain the existing tested opaque semantic pairings.

Browser QA checked Dark/Light Home, Brain, Projects, Health, Settings/updates and
editor controls. At 390 × 844 the nav (12,776; 314 × 56), four tab targets, and +
(332,780; 50 × 50) match their measured baseline browser bounds. Home task
controls and shared icons are now 44px; headings can wrap instead of overflow.
320 × 568, 844 × 390 and a short 320 × 320 browser viewport retained menu fit,
44px targets and no document-width overflow. Quick note remained reachable via
the internally scrolling short menu; opening/closing an empty editor saved no
record. The existing guarded updater applied local revisions without clearing
storage. Shared navigation has no backdrop blur; only the + glyph rotates.
Welcome source, standalone document height/safe-area CSS and record storage are
unchanged. Actual iPhone safe areas, keyboard/native colors, Reduce Motion and
scroll smoothness still need physical-device acceptance; automated/browser QA
does not establish those results.

## 5. Home visual overhaul — implemented; phone acceptance pending

- [x] Measure existing circle/stage at reference viewports before replacement.
- [x] Restyle progress, save status, date controls, cards and task groups.
- [x] Keep a static placeholder in the circle's established slot until Phase 6.
- [x] Remove obsolete color-shifting caption; preserve numerical daily progress.
- [x] Check long titles, empty/all-done lists, overdue/unscheduled/history groups,
  completion reorder, editing and nav-safe scrolling.
- [ ] Confirm larger text and native safe-area/keyboard behavior on the iPhone.

Gate: same functional data/ordering and responsive hero position; refined Home
presentation without new daily calculations or hidden controls.

Verification for 0.1.15 (2026-10-03): build and all 129 tests pass. Seven new
Home tests cover real date-derived progress and task groups, empty/all-done
states and undo, single-shot completion/reordering/scroll restoration, Reduce
Motion, timer/frame disposal, long-title/edit separation, save retry and scoped
CSS boundaries. Daily calculations, storage, backups, welcome and shell sizing
are unchanged; the static placeholder has no renderer or animation.

The baseline circle has a 216 × 216 CSS-pixel layout size (its old animated
transform made visual bounds fluctuate slightly). Before replacement, the
270px stage started at y=145.39 with a 20px top margin at each reference size:

| Browser viewport | Stage x / width | Circle center x | New static circle y / size |
| --- | --- | --- | --- |
| 390 × 844 | 20 / 350 | 195 | 145.39 / 216 × 216 |
| 320 × 568 | 20 / 280 | 160 | 145.39 / 216 × 216 |
| 844 × 390 | 20 / 804 | 422 | 145.39 / 216 × 216 |

Browser QA checked both palettes, 390 × 844, 320 × 568, 844 × 390 and document
width at a short 320 × 320 viewport. A disposable localhost task with a long
title wrapped to eight lines at 320px; its 44px edit target stayed below the
title and opened the correct editor. Completion advanced progress through
33/67/100%, reordered cards, showed the complete-day message and remained
undoable. At 320 × 568 the last task row ended at y=451.33, above navigation
at y=500, without scrolling the document. The existing Settings updater applied
the local build without clearing storage. Test records exist only on the
isolated preview origin, not in the published assets or the user's phone.

Cards expand for long content rather than clamping titles; typography uses
local system fonts and a regular Georgia date heading. Actual iPhone larger
text, keyboard, safe areas, native status colors and smoothness remain pending;
desktop/browser QA does not prove those results. Phase 6 adds the real 3D
character and eyes; this release intentionally uses only its static slot.

## 6. Static real 3D character — implemented; phone appearance acceptance pending

- [x] Add one lazy procedural espresso/bronze sphere with cream pill eyes.
- [x] Match the measured circle size/center and inspect both palettes in browser.
- [x] Cap renderer cost; no expensive transmission/post-processing by default.
- [x] Suppress rendering in the aria-hidden preview mirror; dispose on exit.
- [x] Test load/context failure, offline asset availability and static fallback.
- [ ] Inspect actual iPhone appearance/responsiveness before animation tuning.

Gate: depth is genuinely 3D; visible Home has one bounded scene; tasks/navigation
stay usable while loading or after renderer failure. Appearance approval first.

Verification for 0.1.16 (2026-10-03): production build and all 140 tests pass.
Eleven character tests exercise visibility/overlay/background loading gates,
the mirror exclusion, canceled imports, first-draw readiness, initialization and
context failures, stale callbacks, cleanup, actual spherical eye placement,
demand/never render branches and the precached scene chunk. The existing Home,
storage, backup, dates, theme, welcome, graph and update regressions still pass.

The original procedural model uses a 48 × 32 sphere (under 3,200 triangles),
two small capsule meshes oriented to surface normals, opaque polished bronze,
local cream/amber lights and an orthographic camera. Its canvas is 216 × 216 CSS
pixels at y=145.39 and x=87/52/314 for the three reference viewports. DPR is
capped at 1.5 (at most 324 × 324 backing pixels); no model download, remote HDR,
texture, shadow-map, transmission buffer or post-processing pass is introduced.
Geometry/materials are declarative and owned/disposed by Fiber. The shared
Three/Fiber dependency is a lazy chunk already used by welcome; the entire
release, including both scene chunks, is cached by the existing offline worker.

This phase has no blink/gaze timers or animation loop. Rendering is demand-only
while visible and uncovered, never while backgrounded/off-screen/behind an
editor, and unmounts on leaving Home. The CSS character with static cream eyes
is immediately available until a successful actual draw; failed graphics or
chunk loading retains that fallback without blocking navigation or tasks.
The mirror uses only the fallback and does not observe, load or mount a scene.

Browser QA checked Dark/Light, 390 × 844, 320 × 568 and 844 × 390; no document
width overflow or hero-slot changes. Opening an empty task editor paused the
scene without creating a record; scrolling the character off-screen paused it.
Brain navigation removed its canvas, returning Home produced one fresh canvas,
and the desktop phone/mirror pair had exactly one renderer across two hosts.
Task completion/undo still changed real progress 0 → 50 → 0. A local safe update
applied refined lighting without clearing records; browser logs had no errors.

These bounds/tests do not establish GPU timing, Airplane Mode or visual approval
on the iPhone. Inspect this static appearance and responsiveness there before
tuning/adding Phase 7 motion. No character interactions or data changes added.

## 6a. Pre-animation visual refinement — implemented; phone check pending

User checked 0.1.16 on the phone and requested these changes before idle eyes.
Implemented in 0.1.17. This supersedes the earlier main-app glint, serif date and bronze-body choices;
welcome remains unchanged. No phone GPU timing claim follows from that feedback.

1. Remove main-app above-edge glints/glows at their shared CSS source.
   - Remove the decorative `::after` glints on nav, + and shared primary pills,
     and the `::before` glow on shared primary/backup buttons.
   - Keep the warm glass gradients, readable selection, press/focus/disabled
     states, all targets and existing nav anchors. Do not blanket-remove icon
     pseudo-elements. Preserve welcome's separate top shine/light spread.
2. Remove the normal visible Home save-status label/checkmark.
   - Retain polite accessible saving/saved feedback and existing save services.
   - Keep failures and Retry visibly reachable; do not hide errors or imply
     that a local save is an external backup. Details stay in Settings.
   - Use deliberate page spacing rather than a hidden empty status-row spacer;
     preserve accepted safe areas and the character's measured slot.
3. Correct the two Home header rows structurally.
   - Replace Georgia on the date with medium-weight local system sans-serif
     and lining numerals. Keep month/day together in the same text style.
   - Put date and +/previous/next in one vertically aligned row; put task counts
     beneath, so counts no longer influence the controls' vertical position.
   - Top-align the signal label and state pill instead of centering the pill
     against the entire label/percentage stack. The state remains a badge,
     not a new clickable button. Verify visible glyph edges as well as boxes.
   - Preserve real dates/progress and control actions. Long months, larger text
     and small screens must wrap deliberately without clipped controls; retain
     44px targets and the normal right-hand control layout when space allows.
4. Revise the static character, including its no-GPU fallback.
   - Try warm cream `#e8d9c7` with gentle champagne/taupe shading, lower
     metallicity and softer lighting; avoid turning the lower hemisphere black.
   - Recommend deep espresso eyes (`#302b26`) for contrast against cream.
     Keep the pill shape and face arrangement; increase width/height about 25%.
   - Recheck surface attachment for the larger geometry. Mirror/loading/error
     fallback must match the cream body, dark eyes and new proportions.
   - Keep the 216px sphere, position, lazy/demand rendering, DPR cap and pause/
     failure/disposal guards. No blink/gaze timers or new graphics dependency.
5. Verify and publish this visual-only revision before Phase 7.
   - Extend tests for no shared shine, no visible success label, retained retry,
     lining-date/header layout and updated eye/fallback geometry.
   - Inspect both themes at reference viewports; test single/double-digit dates,
     long month names, overflow, reduced motion, editors and nav clearance.
   - Run the complete regressions/build, publish through the existing guarded
     update flow, and verify the exact public version/build.
   - Ask for a phone appearance check of the cream character and alignment
     before proceeding to idle animation. No record migrations/reset required.

Verification for 0.1.17 (2026-10-03): production build and all 142 tests pass.
The shared material retains its gradients/contrast/focus/press states but no
longer authors decorative pseudo-element edge lights. Welcome files are unchanged.
Home success/pending save feedback is a clipped polite live region; only a failed
save adds the visible Not saved/Retry row. Existing persistence is untouched.

Signal label and state badge both start at y=76. Date and 44px controls share
a centered row; counts are left-aligned underneath. System lining numerals
replace Georgia. The normal 216px sphere remains at y=145.39 and x=87/52/314
in 390/320/844-wide browser layouts. Low-metallicity cream, warm hemisphere
fill and softer key/rim lights replace bronze; espresso capsule eyes are 25%
larger and attached at radius 1.03. CSS mirror/loading/failure eyes are 13 × 34px.
No animation timers, renderer budget, lifecycle or shell/safe-area changes.

Browser QA checked both themes and narrow/portrait/landscape layouts without
horizontal document overflow; nav and + computed decoration is none. Shared
primary editor buttons also have no before/after light. The editor paused the
character without creating a task; scrolling off-screen paused it and the final
task row remained above nav. Actual completion/undo changed progress 0 → 50 → 0.
Safe local updates retained the demo records; browser logs had no errors.

A disposable, non-published fixture using the production header CSS checked
October 3, October 13, September 30 and 200% date/count text at 320px: long rows
wrap controls, and enlarged date text wraps without horizontal document overflow.
That fixture does not prove iOS Dynamic Type behavior. It was removed before
the release build. Physical iPhone appearance, larger text and native status/safe
area acceptance remain pending; ask the user to approve before Phase 7 motion.

Follow-up 0.1.18 (2026-10-03): user approved the rest of the appearance and
requested slightly bigger, wider eyes. Capsule radius .076 and straight length
.204 make width about 29% greater and total height about 12% greater than 0.1.17.
Surface attachment moves to radius 1.04; fallback eyes become 16 × 38px while
keeping their centers. Body, palette, lighting, headers and controls are unchanged.
Production build and all 142 tests pass; 390 × 844 browser preview has no errors.
No eye animation is introduced by this adjustment; physical appearance approval
for the new proportions remains the next checkpoint.

## 7. Idle eyes

- [ ] Add randomized quiet gaze/blink sequencing with short bounded animations.
- [ ] Keep eyes attached to the curved face, with smooth return to neutral.
- [ ] Render on demand while settled; avoid React state updates every frame.
- [ ] Pause hidden/off-screen/fully obscured; cancel frames/timers on exit.
- [ ] Honor Reduce Motion and verify fallback/remount cleanup.
- [ ] Tune on iPhone; no chat, tap reactions or task-driven emotion yet.

Gate: natural subtle motion without a constant idle render loop or background
activity; task navigation and scrolling remain responsive on the target phone.

## 8. Acceptance and controlled releases

- [ ] Run build and existing backup/storage/daily/graph/layout/icon/welcome/update
  regressions; evolve theme-specific assertions, retaining behavior guarantees.
- [ ] Add theme persistence, Settings navigation and character lifecycle checks.
- [ ] Check 390 × 844, 320 × 568, short/keyboard-like layouts and 844 × 390.
- [ ] Physical iPhone 13 Pro / iOS 17.3: both themes, cold launch/resume, native
  status contrast, rotation, keyboard, larger text, Reduce Motion and Airplane Mode.
- [ ] Exercise personal-data save/export/restore on a safe test profile; preserve
  phone records and exact image bytes. No destructive test on the user's install.
- [ ] Publish validated milestones through the existing GitHub Pages/update flow,
  with visible version numbers and unsaved-write protection. Verify deployment
  separately from physical-device acceptance; do not declare one proves the other.

Release policy: deploy working increments, not half-themed public UI. Phase 1
needs no deployment. Code rollback must not require resetting personal data.
Future character interactions, cloud/home-server sync and other page layout
redesigns require a new scoped plan.
