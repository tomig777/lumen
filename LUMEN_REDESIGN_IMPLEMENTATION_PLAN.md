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

## 3. Settings and quick actions

Next implementation phase. The production appearance selector will be added here.

- [ ] Add Settings route, originating-tab return behavior and accessible heading.
- [ ] Replace only Health journal's + tile with Settings/gear; keep other actions.
- [ ] Put Appearance, Data & backup, App & updates, Diagnostics and App identity
  inside Settings. Reuse services and existing backup/update guards.
- [ ] Remove Home Data & backup link only after the new path is working.
- [ ] Keep Home save-state/retry and app-wide failure banners; preserve health
  records and their Health-page entry point.
- [ ] Verify + dismissal, nested back behavior, persisted toggle and unchanged
  export/restore/update workflows, including an unsaved-data update refusal.

Gate: every old backup capability remains reachable; theme control works without
editing personal data; Settings returns to the correct tab.

## 4. Shared glass controls and navigation

- [ ] Implement lightweight theme-aware primary/icon button and nav/menu finishes.
- [ ] Preserve all four tabs, active selection semantics and 44px targets.
- [ ] Add pressed/focus/disabled states; validate actual composite contrast.
- [ ] Use controlled top glints; no broad face stripe/lower rim, full-page blur,
  individual per-button canvas or decorative pointer-event interception.
- [ ] Verify scrolling, menu fit, portrait/landscape and Reduce Motion.

Gate: visually related to approved welcome glass, readable and responsive, with
no duplicate reflection layers or navigation/layout regressions.

## 5. Home visual overhaul

- [ ] Measure existing circle/stage at reference viewports before replacement.
- [ ] Restyle progress, save status, date controls, cards and task groups.
- [ ] Keep a static placeholder in the circle's established slot until Phase 6.
- [ ] Remove obsolete color-shifting caption; preserve numerical daily progress.
- [ ] Check long titles, empty/all-done lists, overdue/unscheduled groups,
  completion reorder, editing, larger text and nav-safe scrolling.

Gate: same functional data/ordering and responsive hero position; refined Home
presentation without new daily calculations or hidden controls.

## 6. Static real 3D character

- [ ] Add one lazy procedural espresso/bronze sphere with cream pill eyes.
- [ ] Match the measured circle size/center and contrast in both modes.
- [ ] Cap renderer cost; no expensive transmission/post-processing by default.
- [ ] Suppress rendering in the aria-hidden preview mirror; dispose on exit.
- [ ] Test load/context failure, offline asset availability and static fallback.
- [ ] Inspect actual iPhone appearance/responsiveness before animation tuning.

Gate: depth is genuinely 3D; visible Home has one bounded scene; tasks/navigation
stay usable while loading or after renderer failure. Appearance approval first.

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
