# Phase 2 · Task editor verification

Release: 0.1.20. Date: 2026-10-03.
Scope: keyboard-safe task dialog only; later Home/history/character phases are
not implemented in this release. GitHub deployment and phone acceptance are
separate from the checks below.

## Evidence and implementation

The user's iPhone screenshots show an upward-panned Home and a task dialog with
only its heading above the keyboard. They establish the symptom, not the exact
WebKit event sequence. Earlier local short-height cases independently showed
that scrolling the whole sheet could not keep heading and Save visible together.

- Keep the existing observer and editor-only VisualViewport height/offset rules.
  A task dialog retains the measured constraint during focus changes until the
  actual visible viewport recovers. Focus alone does not imply a keyboard.
- Separate persistent heading/actions and Save footer from scrollable fields.
  Keep project choices horizontal, including 25 fixture choices; no lost choices.
- Focus the title synchronously after commit with `preventScroll`, in a final
  un-translated layout. Task entrance is a short opacity transition, not a slide
  from beneath the keyboard. Native user-gesture activation still needs testing.
- Done blurs the focused control without saving, clearing the draft or closing.
  Recovery eases the editor layer for 180ms; active keyboard events are immediate.
  Reduce Motion removes optional editor motion.
- Keep background screen/navigation inert while open; restore prior inert flags
  and opener focus on close. Preserve focus trap, Escape and original save/delete
  handlers. Task title is labelled and required.
- On short, keyboard-open layouts only, omit the decorative handle/eyebrow and
  compact heading gaps. Do not shrink native field type or 44px action targets.

The accepted standalone full-height document/shell fix, native safe areas,
navigation geometry, themes, local persistence, backup and update flow remain
unchanged. The completion paragraph and scrolling Home remain Phase 4 work.

## Automated and browser verification

- `npm run build`: succeeds, including TypeScript and the 21-file offline shell.
  Existing large-chunk warnings remain; no new graphics dependency or renderer.
- `node --test tests/*.test.mjs`: 156/156 pass, including storage/backup, dates,
  viewport cleanup, task semantics, character lifecycle and offline/update safety.
- Actual extracted Home/RenderSheet CSS fixture: 210/210 checks across 390 × 844,
  320 × 568 and 844 × 390 in Dark and Light. Keyboard-like heights 500, 300 and
  228px, portrait offset 80px, many projects, form scrolling, dismissal while
  still focused and draft retention. Full title, heading and Save are visible;
  shell/page/navigation dimensions remain unchanged.
- Added title visibility assertions caught an initially clipped landscape field
  even though Save was visible; compact heading rules resolved this measured case.
- Shared category/sheet/quick/page-editor fixture: 48/48 pass, including pinch
  zoom, focus-preserving dismissal, suspend/resume and shell/nav invariance.
- Production preview in an isolated localhost origin: create a disposable task,
  reject an empty required title, edit it, reload and observe the persisted edit.
  Check schedule choices, Dark/Light, modal background inert, Escape and focus
  restoration. Done leaves the fixture draft and dialog intact without saving.
- Local screenshot: `tests/fixtures/.generated/phase-2-keyboard-portrait.jpg`.
  Generated/ignored and simulated; not a physical-phone screenshot.

No installed-phone data, cache, saved records or service worker was cleared.
Fixture measurement code is not included in the production app shell.

## Physical iPhone acceptance · pending

Use the installed Home Screen app, not the desktop preview. Update through
**+ → Settings → App & updates**, and confirm version **0.1.20**.

1. Open today's task +. Verify title, close/Done and Save stay above the keyboard;
   Home and navigation must not pan/crop as in the original screenshot.
2. Type a disposable draft, scroll only the fields, hide keyboard with Done and
   the native control, then refocus. Draft and schedule must remain intact.
3. Check date/select pickers, predictive text changes and rotation. Header/actions
   should remain usable. Check a hardware keyboard if one is available.
4. Repeat in Light, close/reopen and background/resume. Save/edit a disposable
   task and verify after reopening the app. Confirm no pale bottom strip returns.

Browser simulation cannot establish native iOS 17.3 keyboard delivery, animation
feel or system paint. Those checks remain pending until user confirmation.
