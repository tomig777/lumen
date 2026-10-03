# Phase 4 · Fixed Home dashboard

Release: 0.1.22. Date: 2026-10-03.
Scope: fixed Home and requested Replay position only. No finger gaze, new eye
expressions, other-page redesign or data migration.

## Implementation and constraints

- Order the date controls Add, Replay, Previous, Next; keep native buttons and
  accessible labels with 44px touch targets. Retain aligned system utility type.
- Remove the visible all-complete paragraph and all groups beneath daily cards.
  Retain actual progress/counts, completed cards, Undo and a visually hidden polite
  all-complete announcement. No new banner or shifting visible text.
- Keep all task records and dated completion events unchanged. The user-approved
  Replay → All tasks is the replacement for overdue/unscheduled/finished/history
  sections; Yesterday remains recorded completions only and read-only.
- Home uses a full-height local grid: a yielding character stage and a task region
  with a bounded card slot. Empty/open/all-done states use identical allocated
  slots. Reserve the existing nav clearance; do not move the nav or shell.
- Normal installed portrait retains the character's 216px diameter and original
  y=148.39 origin. Smaller layouts contract the decoration, not actions. Landscape
  deliberately places the hero and task region side by side with notch padding.
- Home-only overflow/overscroll and `pan-x pinch-zoom` prohibit vertical page
  movement without a global touch handler. Horizontal carousel/controls and zoom
  remain available; other routes and dialogs retain their internal scrolling.
- Size queries use the existing route/Home content box, including handset preview,
  not keyboard metrics. The accepted standalone full-height ancestor fix and
  editor-only visual-viewport rules are unchanged. Editors/drawer sit outside the
  contained Home route.
- Use readable title previews within bounded cards (three lines normally, shorter
  compact summaries). Full text remains in DOM/accessible labels and Edit opens
  the existing full-title editor. On very short/narrow screens optional caption
  copy yields space to larger text and reachable controls.
- Preserve open-before-done ordering and existing completion fade/visual-slot
  behavior. Track visible task ID and relative offset to preserve context through
  edits/other task updates. Reduce Motion still avoids optional frames/timers.
- Save failure/Retry remains visible and reachable. Existing persistence, backup,
  daily recurrence/date rules, offline/update handling and quiet glass finishes
  are retained. No glints, new renderer or scene/controller modifications.
- Static fallback eye dimensions now scale proportionally on compact stages;
  at 216px the existing 16 × 38px eyes and offsets are unchanged.

## Verification

- Production build/TypeScript/offline shell succeeds (21 files). Existing chunk
  size warnings remain; no new dependency, cloud service or renderer.
- `node --test tests/*.test.mjs`: 165/165 pass, including all storage, backup,
  recurrence/date, theme, viewport/editor, character and update safety coverage.
  Superseded scrolling/group assertions now verify removal plus unchanged data
  and replacement drawer access; an anchor test covers insertion/edit context.
- Actual Home/TaskDrawer/RenderSheet browser fixture: 760/760 invariants across
  390 × 844, 320 × 568 and 844 × 390 in both themes. All earlier keyboard/drawer
  checks remain, plus eight Home states: open, done, empty, mixed, long title,
  long date, enlarged text and save error. Landscape uses 47px side safe areas.
- Measured portrait open/done/empty slot: y=534, height=196, bottom=730; nav starts
  at y=754. Normal portrait character remains 216 × 216 at y=148.39. Home's scroll
  height equals its viewport; an attempted vertical scroll cannot move it.
- First/last horizontal navigation, controls/order/touch size, title readability,
  Edit/Retry bounds, no visible completion paragraph, equal task slot geometry,
  internal drawer scroll and nested editor return all pass.
- Enlarged-text fixtures explicitly assert computed text size increased; they do
  not silently rely on a style overridden by legacy theme selectors. Visual review
  through the computer-use skill caught partial compact title clipping. Bounded
  readable summaries and optional-caption yielding resolve that tested case.
- Isolated production preview with the real 3D scene: complete both demo daily
  tasks, verify 100% plus hidden announcement and unchanged character/card/nav
  bounds, Undo, reload and observe persisted 50%. Replay exposes all nine demo
  records; edit an unscheduled task and return to the same drawer tab/scroll/focus.
  Verify both themes and that Brain retains `overflow-y: auto`. No console errors.
- Local production screenshot:
  `tests/fixtures/.generated/phase-4-fixed-home-portrait.png` (ignored).

Desktop safe areas, enlarged-text overrides and keyboard bounds are simulations,
not native iOS gesture/paint/keyboard evidence. No installed-phone data, cache,
service worker or saved records was cleared. Only disposable localhost data was
used for production UI verification.

## Physical Home acceptance · primary layout accepted

On 2026-10-03 the user confirmed the fixed Home looks good on their iPhone and
authorized Phase 5. Keep the detailed checklist below for broader Phase 7 testing;
their confirmation does not explicitly report every edge case.

Update through + → Settings → App & updates and confirm 0.1.22.

1. Check Add, Replay, Previous, Next order and no vertical Home scrolling.
2. Complete/undo the last daily task; cards, character and nav must not shift or
   acquire a completion paragraph. Swipe cards and use both arrows.
3. Open Replay to reach removed groups, edit/save a task and verify drawer return.
4. Check portrait/rotation, both themes, long titles and real keyboard opening.
   Confirm no pale bottom strip or nav/Save regression.

The user accepted the Phase 2 keyboard fix, Phase 3 drawer and primary Phase 4
fixed Home. Later phase/device acceptance is recorded independently.
