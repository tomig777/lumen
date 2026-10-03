# Home interaction baseline · Phase 1

Recorded 2026-10-03 against runtime source 0.1.19 / 99a866a. No app source,
appearance, record schema, version or deployment was changed for this baseline.

## Reproducible local checks

1. `npm run test:home-baseline` builds a **test-only** bundle from the actual
   internal HomeScreen, SheetFrame and RenderSheet functions. Extraction fails
   loudly if their source boundaries change; legacy editor markup is excluded.
2. Run Vite on a fresh localhost-only port, then open
   `/tests/fixtures/home-baseline.html` and press Run baseline matrix.
3. Six isolated frames test 390 × 844, 320 × 568 and 844 × 390 in Dark and Light.
   Full measurements are available under Full measurements for comparison later.
4. `npm run test:home` includes fixture/extraction regressions alongside the
   existing Home and actual character-controller/scene tests.

All records are disposable in-memory fixture objects. App/storage/launch/update
owners are not mounted, no service worker is registered, and no phone or public
site data is read/written. The generated bundle stays under ignored
`tests/fixtures/.generated/`; production Vite entry points do not include it.

Simulation limits: standalone CSS, safe areas, visible viewport height/offset and
keyboard events are substituted. The character uses its real static mirror
fallback to measure the 216px slot, NOT to assert actual GPU appearance. Layout
fixtures exercise the real task editor with its production focus trap enabled;
entrance timing uses Reduce Motion and a settling delay. Native keyboard delivery,
Safari auto-pan, Dynamic Type and iPhone animation feel are not established here.

## Home measurements

Dark and Light have matching geometry. Coordinates below are CSS pixels, at
scroll position zero with simulated installed safe areas.

| Frame | Character x/y/size | Open card region y/height | All-done card region y/height | Empty region y/height | Nav x/y/width/height | Main + x/y/size |
| --- | --- | --- | --- | --- | --- | --- |
| 390 × 844 | 87 / 148.39 / 216 | 552.39 / 200 | 589.39 / 200 | 552.39 / 72 | 12 / 754 / 314 / 56 | 332 / 758 / 50 |
| 320 × 568 | 52 / 145.39 / 216 | 549.39 / 200 | 586.39 / 200 | 549.39 / 72 | 12 / 500 / 244 / 56 | 262 / 504 / 50 |
| 844 × 390 | 314 / 145.39 / 216 | 549.39 / 200 | 586.39 / 200 | 549.39 / 72 | 12 / 313 / 768 / 56 | 786 / 317 / 50 |

Confirmed completion defect: a 21px paragraph plus 16px bottom margin inserts
**37px** before the carousel, in both themes at all three sizes. The character
and heading remain stationary; the card region is displaced. The empty state
also occupies only 72px instead of the card region's 200px.

| Frame height | Home content: open | All done | Empty | Mixed groups | Long title |
| --- | --- | --- | --- | --- | --- |
| 844 | 866 | 903 | 844 | 1302 | 1186 |
| 568 | 841 | 878 | 713 | 1277 | 1292 |
| 390 | 850 | 887 | 722 | 1286 | 1040 |

Home currently has `overflow-y: auto`. Even one ordinary card produces overflow
in the target portrait fixture; short/landscape layouts need deliberate fitting.
Disabling scrolling alone would cut off tasks. Long-title and mixed-list fixtures
demonstrate the need for an allocated card region plus accessible details/drawer.

The 390px character y is 3px below the ordinary-browser historical measurement:
this fixture applies the installed top-safe-area rule. Do not treat that
intentional rule difference as a new character-position regression.

## Task editor measurements and audit

The deployed RenderSheet is a sibling of the animated screen layer, inside the
phone app. Its task input auto-focuses; SheetFrame enters from y=100% via spring.
Current viewport CSS constrains `.sheet-layer`; the background screen layer's
`:has(input:focus)` selector does **not** match this sibling task form. There is
no observed double application to Home in this reproduction.

The entire bottom sheet scrolls, including its header and Save footer. Neither
is pinned independently of the form.

| Frame | Simulated visible keyboard area | Dialog y–bottom | Save y–bottom before scroll | Header y–bottom after scroll to Save |
| --- | --- | --- | --- | --- |
| 390 × 844 | 0–500 | 107–500 | 433–477 | 139–192 (no scroll needed) |
| 320 × 568 | 0–300 | 20–300 | 346–390 | 19–72 in the panned 80–380 test |
| 844 × 390 | 0–228 | 12–228 | 338–382 | -133–-80 |

In the 320px panned case, Save begins at 426 and ends at 470, below visible bottom
380. Scrolling by 113 brings Save to 313–357 but the header moves to 19–72,
entirely above visible top 80. Landscape shows the same conflict more strongly.
This proves a short-height form-access problem, not the exact cause of the user's
native iPhone opening animation or keyboard overlap.

Ordinary 390px portrait at simulated height 500 keeps heading/input/Save in view.
Thus we must not claim the phone's exact failure was reproduced at these metrics.
Physical keyboard readings/screenshot are still needed for focus/auto-pan timing.

The many-project case has 25 choices (Loose task plus 24 projects), compared with
4 ordinary choices. **It does not make the form taller in the current CSS**:
the choice row is a 46px-tall horizontal scroller, with content width 2439px.
Do not implement a project-selector rewrite on the unproven premise that chips
wrap vertically. Any selector polish should be justified separately.

All six frames confirm:

- Shell and background screen heights stay at the full fixture height, and nav
  bounds stay unchanged during keyboard shrink/pan/dismissal.
- Editor bounds follow visible height and offset.
- Keyboard dismissal clears editor overrides and restores the full dialog area
  even while the title input remains focused.
- The existing observer coalesces resize/scroll events and disposes listeners;
  its unit tests cover zoom, invalid readings, hide/resume and rotation.

## Character reference to retain

Runtime scene remains cream `#e8d9c7`, espresso eyes `#302b26`, radius-1 sphere,
48 × 32 sphere geometry and capsule eyes `[.076, .204, 6, 12]` attached at radius
1.04. The CSS fallback has 16 × 38px eyes. No body/material/eye-size changes.

One lazy scene; DPR 1–1.5; demand/never rendering; no second animated mirror.
Idle gaze is bounded ±.10 horizontal / ±.06 vertical, with finite blinks/glances
and at most two timer channels. Existing deterministic tests verify neutral
reset, stale-callback rejection, eye attachment, settled draw suppression,
overlay/off-screen/background pause, context failure and Reduce Motion.

## Verification and next-phase handoff

- Production build passes. The pre-existing large-chunk warning remains; no
  runtime bundling/performance optimization was introduced in Phase 1.
- All **151** Node tests pass (148 existing plus 3 baseline tests).
- Browser matrix captures all 6 cases with **114/114 invariant checks passing**.
  Those invariants do not call the recorded layout defects acceptable or fixed.
- No files under `src/`, install metadata or public assets were edited. Production
  output excludes these fixtures and no deployment was performed.
- A physical-phone screenshot/recording was requested non-blockingly. Exact
  keyboard opening/dismissal/auto-pan behavior remains pending device evidence.

Phase 2 should first separate persistent header/actions from the scrollable
task form, then inspect native focus/viewport timing using the actual device
symptom. Reuse the existing observer and preserve shell/nav geometry. Do not
start by replacing the already working full-screen fix or adding a second
keyboard observer.
