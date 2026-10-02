# iPhone layout baseline: bottom gap

This baseline preserves the original provisional diagnosis and subsequent verification history. Actual installed-iPhone readings arrived on 2026-10-02 and are recorded under **Measured Home Screen viewport** below. Release 0.1.3 corrects the app-layer height, but the user's subsequent screenshots and report confirm that bottom clipping remains. See **0.1.3 physical failure and document-layer investigation** below. The earlier implementation records at the end are historical, not proof that the phone issue was fixed.

## Screenshot evidence

Both supplied JPEGs are 591 × 1280 pixels. Their page background ends at approximately row 1208, leaving a 72-pixel band to the physical bottom. JPEG compression softens the boundary by a few pixels.

Assuming the iPhone 13 Pro's 390 × 844 logical display, this corresponds to an app boundary around 797 CSS pixels and an exposed band around 47 CSS pixels. These are image-derived estimates, not readings from the phone's browser.

| Observation | Home screenshot | Welcome screenshot |
| --- | --- | --- |
| Page/background boundary | Around row 1208 | Around row 1208 |
| Exposed bottom band | Approximately 72 image pixels / 47 CSS pixels | Approximately 72 image pixels / 47 CSS pixels |
| Primary control position, visually estimated | Navigation spans rows 1072–1157, about CSS y=707–763 | Enter button spans rows 1032–1114, about CSS y=680–735 |
| Space from control bottom to page boundary | About 34 CSS pixels | About 62 CSS pixels |

The welcome page above the boundary samples as `#f3ece2`, matching `.lumen-start`. The band samples near `#f7f4ed`, within JPEG error of the app/document paper color `#f7f3ed`. Both the artwork and Home content stop at the same boundary. This supports an outer-container problem rather than a decorative line inside one page.

## Relevant source behavior

- `src/hooks/useMobileViewport.ts:13` writes `visualViewport.height` into `--lumen-viewport-height` on every update, even when no field is focused. Line 14 similarly copies `visualViewport.offsetTop` into the app's top position.
- `src/mobile.css:10` applies that height to the entire fixed `.deployed-app-root`; the page layers inherit its dimensions and clip overflow.
- `src/mobile.css:43` positions navigation at `max(12px, safe-area-inset-bottom)`. A 34-pixel inset would explain its approximately 34-pixel clearance above the screenshot's page boundary.
- `src/mobile.css:55` positions Enter Lumen at `29px + safe-area-inset-bottom`. A 34-pixel inset predicts 63 pixels of clearance, consistent with the approximately 62-pixel screenshot estimate.
- `src/mobile.css:31` also reserves scrolling clearance for the navigation plus the bottom safe area. This padding is inside the scrolling page; it does not itself explain a full-width band outside the welcome artwork.
- `src/mobile.css:2` fixes the surrounding body's background to paper, while `src/polish.css:152` sets the welcome page to a different cream. Dark page themes apply inside the app, so a shortened wrapper can also expose an incorrect surrounding color there.
- `index.html` already contains `viewport-fit=cover`, standalone capability, and `black-translucent` status-bar metadata. Adding the missing viewport-fit flag is therefore not the remedy.

## Production-browser measurements

Measured the live production page through the Codex in-app browser. Its loaded entry asset was `assets/index-Dxj0MXbY.js`. This is a desktop browser, not Mobile Safari; standalone mode was false and its safe-area spacing behaved as zero.

| Browser viewport | visualViewport height / offsetTop | App rectangle | Navigation rectangle |
| --- | --- | --- | --- |
| Default 567 × 672, welcome | 672 / 0 | y=0–672 | Hidden on welcome |
| 390 × 844, welcome | 844 / 0 | y=0–844 | Enter button y=761–815, bottom offset 29 |
| 390 × 844, Home | 844 / 0 | y=0–844 | y=776–832, height 56, bottom offset 12 |
| 844 × 390, Home | 390 / 0 | y=0–390 | y=322–378, height 56 |
| 390 × 500, Home | 500 / 0 | y=0–500 | y=432–488, height 56 |
| Restored 390 × 844, Home | 844 / 0 | y=0–844 | y=776–832, height 56 |

The wrapper follows every visual-viewport height exactly and recovers on ordinary desktop resizing. The screenshot's bottom band does not reproduce here. The 500-pixel check tests reduced height only; it does not reproduce an iOS keyboard, safe areas, or Home Screen launch behavior. The browser's original size and welcome page were restored after inspection.

## Provisional diagnosis and next implementation target

The strongest explanation is that iOS reports a visual viewport shorter than the physical full-screen layout, and Lumen applies that shorter height to the whole app at its current origin. If the phone reports a height around 797 with offsetTop zero, the present code would create the observed approximately 47-pixel band. The discrepancy is also compatible with status-bar/safe-area viewport behavior, but the exact mechanism is not confirmed without device readings.

The navigation and welcome-button offsets already match the safe-area formulas relative to that shortened page. Removing their bottom inset would move buttons toward the gesture area without repairing the app/background boundary.

Step 2 should establish a stable full-screen page surface and restrict keyboard-sensitive positioning to the controls/forms that need it. Step 3 should coordinate the surrounding theme with the current page. Do not hard-code a 47-pixel correction or treat desktop resize recovery as iPhone acceptance.

## Device evidence still needed

For installed Home Screen mode and Safari, record the actual iOS version, standalone flag, innerHeight, document clientHeight, visualViewport height/offsetTop/scale, wrapper top/bottom/height, and computed top/bottom safe-area insets. Compare launch, resume, landscape, keyboard open, and keyboard dismissed.

These observations can be obtained with temporary opt-in diagnostics or Safari's remote inspector during the next implementation. No phone-only result has been marked verified in this baseline.

## Updated physical-device report (2026-10-01)

The user confirmed they are running the newly released app, then supplied another Home screenshot with the same bottom boundary around row 1208 of a 591 × 1280 image. They also confirmed the strip appears on **every screen**, including welcome and dark Brain. The CSS shell/background changes did not resolve the physical-device issue. An old cached app version is not an adequate explanation of this report.

Release 0.1.2 adds an opt-in **Data & backup → Screen layout** snapshot. It compares `vh`, `dvh`, `lvh`, a fixed inset-zero probe outside page transforms, the actual shell bounds, window/document/visual viewport dimensions, safe-area values, mode, and reported iOS version. No layout compensation is applied, no personal records are read, and nothing is automatically transmitted. The actual iPhone readings are required before choosing between an under-sized CSS shell and an inset outside the DOM viewport. The initial hypothesis remains provisional, not a confirmed fix. The user has also been asked to confirm their current iOS version in Settings.

Local diagnostic checks: build and all 49 regression tests passed. A separate production preview showed the opt-in report at 390 × 844, 320 × 568, and 844 × 390; Refresh reread the current dimensions. Document bounds remained unchanged, no horizontal overflow was introduced, buttons were at least 44 pixels high, and all invisible probes were removed after each snapshot. Copy reported success in the UI; the automation browser's separate clipboard API returned an empty value, so a pasted-report round trip was not established and remains a phone check. No personal records were edited during validation. This does not establish the cause or resolve the physical-device strip.

## Measured Home Screen viewport (2026-10-02)

The user copied the opt-in report from release **0.1.2 / 0b99c54**, opened from the iPhone Home Screen. It reports iOS **17.3**, standalone mode, scale 1, and no document scrolling.

| Measurement | Reported value |
| --- | --- |
| Screen | 390 × 844 |
| Window / document / visual viewport | 390 × 797 |
| App top–bottom | 0–797; height 797 |
| Fixed inset-zero probe | 0–797; height 797 |
| CSS viewport heights | `vh=844`, `dvh=797`, `lvh=844` |
| Safe top / right / bottom / left | 47 / 0 / 34 / 0 points |
| Visual viewport top / scale | 0 / 1 |
| Document scroll / scroll height | 0, 0 / 797 |
| App computed height | 797px |
| Document / body background | `rgb(250, 247, 242)` |

The app is 47 points shorter than the screen, exactly matching the top safe-area value rather than the bottom inset of 34. The current `100dvh` override chooses the shorter measurement. Using fixed edges alone would still produce 797, as the independent probe shows. Repainting the surrounding document or removing bottom safe-area spacing cannot correct the shell's height and the relative positions of its contents.

`viewport-fit=cover` and `black-translucent` were present in the first application HTML commit, before the initial Pages deployment. Missing initial metadata is not the leading explanation; reinstalling the user's app is not part of this correction.

### Measured correction, step 1: implemented locally

`src/mobile.css` now overrides the shell height only under `(display-mode: standalone)`, using `100lvh` with a preceding `100vh` fallback. It sets `bottom: auto` so the explicit full height is anchored at the top without a conflicting bottom constraint. Normal browser tabs retain the existing `100dvh` rule. The desktop handset preview, status-bar metadata, safe-area offsets, editor-only keyboard hook, storage, update behavior and published release remain unchanged.

Verification: production build and all **49** existing tests passed. The isolated `tests/fixtures/mobile-shell.html` rendered the actual mobile stylesheet with substituted viewport-unit values and an explicitly simulated display-mode condition. All **six** cases passed: browser 797, Home Screen 844, stable installed shell with reduced dynamic height, browser dynamic resizing to 500, landscape-height selection, and portrait-height restoration. This checks the CSS cascade and actual DOM rectangles, not native iOS clipping, safe-area delivery, keyboard events, or painting. The fixture does not import the app, register its worker, or access saved data, and is excluded from the production output.

The separate production browser preview also passed welcome/Home portrait at 390 × 844, Brain landscape at 844 × 390, reduced-height browser at 390 × 500, and restored portrait at 390 × 844. The shell matched each browser viewport; document scroll stayed zero with no second document scrollbar. Home navigation remained y=776–832 in portrait with desktop safe-area values of zero; Brain's surrounding background remained `#24211e`.

The change is **not published** and the physical-device strip is **not marked resolved**. The following step records the bottom-control audit. Safe-area/editor recovery and a controlled release on the actual iPhone remain required. Require both full-height geometry and screenshots proving the formerly missing area is drawn and controls are reachable.

### Measured correction, step 2: bottom anchors verified locally

People was the remaining viewport-fixed bottom control. Its component now has a full-height `.people-page` wrapper. The inner `.people-screen` retains its landscape scrolling, while the return button and preview-only Home indicator are siblings outside that scroller. The mobile button uses absolute positioning against the wrapper rather than native-viewport fixed positioning. Its existing offset (`14px + safe-area-inset-bottom`), appearance and Back action are unchanged. The component is shared by the production app and the isolated regression fixture.

Navigation and its separate + button already belong to the full-height `.phone-app`; welcome's button belongs to its full-height `.lumen-start`; Focus's timeline and buttons belong to the flexible full-height `.focus-player`. No arbitrary translation or new bottom inset was added to those controls.

| Simulated profile | App height / native viewport | People return bottom | Nav bottom | Last content row bottom |
| --- | --- | --- | --- | --- |
| Installed portrait, safe bottom 34 | 844 / 797 | 796 | 810 | 730 |
| Browser portrait, safe bottom 34 | 797 / 797 | 749 | 763 | 683 |
| Installed landscape, safe bottom 21 | 390 / 369 | 355 | 369 | 289 |
| Installed portrait restored | 844 / 797 | 796 | 810 | 730 |

All 16 rendered checks in `tests/fixtures/mobile-controls.html` passed, including unchanged button position after landscape scrolling, navigation/+ bounds and 24-point clearance above navigation for the final content row. The fixture uses the actual People and BottomNav components/styles inside isolated frames, with substituted viewport units, display mode and safe-area values. It does not load the app, storage or worker. These measurements establish anchoring/scrolling behavior, not painting outside iOS's native viewport. The six earlier shell-height cases also still pass.

In the updated production browser preview, People used `.people-page` outside the scroller and an absolute return button. At 844 × 390, the button remained x=748–824/y=332–376 after scrolling 340 pixels; clicking it returned to Home. At 390 × 844 it was y=786–830. Welcome Enter was y=761–815 in portrait and y=307–361 in landscape. Focus controls were y=711–779 in portrait and y=315–367 in landscape, and Pause/Back worked. There was no document scroll. These browser checks have native safe-area values of zero, unlike the isolated simulated-inset cases above.

The production build and all 49 existing tests passed. The local update loaded entry `assets/index-p9ry8rdf.js`, CSS `assets/index-Bk3i-_gB.css`, and shell `lumen-shell-f2278f699a7acc90`. Local demo record counts and its last successful save timestamp were unchanged. No personal/live records, metadata, keyboard code, storage or deployment changed. Next is safe-area/keyboard recovery; actual iPhone acceptance remains open.

### Measured correction, step 3: editor safety verified locally

Brain's category editor was still fixed to the native viewport inside its page scroller. It now uses the shared `AppOverlay` to mount directly in `.phone-app`, outside scrolling and page-transition containing blocks. Its absolute inset-zero layer follows the corrected shell. When its name field is being edited, only that overlay follows the visual viewport; the underlying Brain page and navigation keep their full height. Mobile padding protects each safe edge once, removes the home inset above the keyboard, and allows internal scrolling to Save/Close. Category action targets are at least 44 points and option rows wrap; no form save behavior or records changed.

The shared viewport observer keeps the previous keyboard decision threshold and zoom exemption. It clears temporary geometry synchronously on hidden/pagehide, cancels queued readings, recalculates on resume/pageshow/rotation, and removes every listener on cleanup. Six new automated cases exercise actual event handling, dismissal with retained focus, focus loss, small reported insets, zoom/invalid readings, suspended/resumed state, non-text controls and cleanup. No observer sets shell/document height or runs a polling loop.

All **55** automated tests and the production build passed. The new isolated editor fixture imports the actual overlay and observer, loads the actual styles, and substitutes viewport units/safe areas while delivering explicitly simulated VisualViewport events. Its forms are fixture-only; it loads no app records or worker. All **48** rendered checks passed, plus the previous **22** height/control checks. This is not evidence of native iOS keyboard delivery or bottom painting.

| Simulated editor case | Result |
| --- | --- |
| Installed portrait, native 797/full 844 | Category covers 844; shell and navigation remain full height while editing |
| Panned portrait keyboard | Category y=120–620; initial Close y=179–223, scrolled Save y=548–592 |
| Installed landscape, native 369/full 390 | Category keyboard frame y=0–228; initial Close y=52–96, scrolled Save y=156–200 |
| Keyboard safe bottom | Category padding 28, not 28 + home inset; dismissed portrait padding restores to 46, landscape to 33 |
| Dismissal, zoom, pagehide/pageshow | Override properties removed; current full-height geometry restored |
| Shared sheet / quick capture / inline input | Only the active editor layer changes; full shell/nav and zero document scroll retained |

The actual production browser preview loaded JS `assets/index-BUNkjalv.js`, CSS `assets/index-WYr3wUac.css`, shell `lumen-shell-6b6db5a35069e871`, still version 0.1.2 / Local preview. Category's parent was `.phone-app`, not a page scroller, with y=0–844 portrait and y=0–390 landscape. Landscape Save reached y=318–362 after 373 pixels of internal scrolling. Quick capture at 390 × 500 showed Close near y=126–170 and Save near y=338–382; the task sheet showed Close y=139–183 and Save y=433–477. Journal at 844 × 228 scrolled internally to Save y=161–205. Restored portrait reported app/document height 844, scroll 0, width 390 and no keyboard attribute or editor-height/top properties. Warning/error logs were empty.

These production browser checks use zero native safe-area insets and reduced desktop window heights, not a phone keyboard. Local counts (450 notes, 2 journal entries, 3 projects, 9 tasks, 0 images) and last successful save (2026-10-02 02:34:10 local) stayed unchanged after the normal local shell update. The category's temporary name was discarded and no form was submitted. No live app records or deployment were touched. The new correction remains **unpublished**. Step 4 must validate actual iPhone geometry, painting beyond the old 797-point boundary and keyboard/rotation/resume recovery before marking the strip fixed.

### Measured correction, step 4: release published; physical acceptance open

Version **0.1.3 / 82185d6** was published from commit `82185d6050ca526473dc5ef6e92158d9be26b57f`. [Pages workflow 36950661076](https://github.com/tomig777/lumen/actions/runs/36950661076) successfully built, ran the release test groups and deployed. Pre-release checks were repeated: build, all 55 automated tests and all 70 isolated rendered checks passed. No storage/schema or metadata change, data reset, reinstall or personal content write was part of the release.

Direct public HTTP verification returned 200 and expected MIME types for every deployed shell file and the worker. The live HTML and `release.json` identify 0.1.3 / `82185d6`; entry is `assets/index-X8c60EzM.js`, CSS `assets/index-WYr3wUac.css`, live worker `lumen-shell-4b265e275322b6de`. All ten shell files match the SHA-labelled local release output byte-for-byte. The worker text is identical after normalizing only its expected Windows/Linux cache-name hash difference. The file/entry lists and offline/update logic match. No test fixtures, screenshots, backups or browser data are shipped.

In a temporary live desktop browser tab, the normal update UI changed 0.1.2 / `0b99c54` to 0.1.3 / `82185d6` without resetting records. Counts stayed 450 notes, 2 journals, 3 projects, 9 tasks and 0 embedded images; the last-save indicator remained Not recorded yet. Offline shell showed Ready. Brain had y=0–844 shell bounds, nav y=776–832, document color `#24211e`, no horizontal overflow and zero document scroll. Category belonged directly to `.phone-app`, with absolute y=0–844 bounds outside the page scroller; closing it removed the dialog with no retained editor height/top/keyboard marker. Warning/error logs were empty. No forms were submitted or records changed. This does not test iOS standalone painting, keyboard events, native safe areas or offline phone reopening.

The user has been asked to update the installed app to **0.1.3 / 82185d6**, copy a fresh Screen layout report with the keyboard closed, and send Home and dark Brain screenshots including the bottom edge. Require full-height app geometry **and** actual painting beyond the old 797-point boundary, reachable controls, rotation/resume and keyboard dismissal. The issue remains **unconfirmed** until those device results arrive. If the strip remains with corrected geometry, investigate isolated native clipping in step 5, not arbitrary extra padding or deleting the installed app. These verification notes are local while device acceptance is pending so another documentation-only release does not change the build under test.

### 0.1.3 physical failure and document-layer investigation

The user supplied Home and dark Health screenshots, followed by this fresh report from the installed app with the keyboard closed:

```text
Lumen screen layout
App: 0.1.3 / 82185d6
iOS: 17.3
Mode: Home Screen / standalone
Screen: 390 × 844
Window: 390 × 797
Document: 390 × 797
App top–bottom: 0–844 (height 844)
Fixed inset=0: 0–797 (height 797)
CSS heights: vh=844, dvh=797, lvh=844
Visual viewport: 390 × 797; top 0; scale 1
Safe T/R/B/L: 47px / 0px / 34px / 0px
Document scroll: 0, 0; height 797
App CSS height: 843.984375px
Document color: rgb(250, 247, 242)
Body color: rgb(250, 247, 242)
Viewport meta: width=device-width, initial-scale=1.0, viewport-fit=cover
Status bar meta: black-translucent
```

The published height rule is active: the app extends to the full 844 points. The screenshots still show content, including the lower portions of navigation buttons, ending around the old 797-point boundary. The surrounding band now follows the light/dark page color. This is a **failed physical painting check**, not a stale-release assumption or acceptance of step 4. The remaining difference is 47 points (the reported top inset), not the 34-point home inset; do not compensate by adding a hard-coded bottom margin.

Measurement caveat: `Document` currently reports `document.documentElement.clientHeight`, which is the viewport height in standards mode, not the HTML box's CSS height. A 797 reading alone does not establish that the HTML/body boxes are 797 or that a CSS ancestor is the clip source. `App CSS height` fractional rounding is not evidence for a 47-point defect. The report lacks actual HTML/body/#root box heights; extend those observations in the controlled test instead of relabelling the existing viewport value as a box measurement.

A read-only inspection of the exact live entry `assets/index-X8c60EzM.js` in a temporary desktop browser tab found HTML y=0–720, but body and #root y=0–0 with computed height `0px` and `min-height: 100%`. The fixed app, phone screen and welcome page all covered 720. HTML/body/#root have no transform, filter or containment; body/#root have `overflow: hidden`. The fixed app contributes no normal-flow height and the percentage minimum does not establish a definite body/root height. This gives a testable **document-sizing/native content-bounds hypothesis**, not proof of the iPhone paint cause. The desktop engine still draws its fixed app correctly, so a collapsed normal-flow container does not by itself prove clipping.

Relevant primary reports: [WebKit 254868](https://bugs.webkit.org/show_bug.cgi?id=254868#c2) proposes full `vh` minimums on HTML/body for installed apps; [WebKit 210009](https://bugs.webkit.org/show_bug.cgi?id=210009) reports viewport readings dependent on natural content height, with a later comment linking standalone apps. These older reports describe related behavior, not a verified solution for this iOS 17.3 device. [CSSOM View's clientHeight definition](https://drafts.csswg.org/cssom-view/#dom-element-clientheight) explains the viewport/box distinction.

Next: the storage-free step-5 comparison should hold the app height and control spacing constant and compare the current fixed shell with (1) explicit full-height document/root minimums and (2) a full-height normal-flow shell. Inspect actual HTML/body/#root rectangles, CSS heights, scrolling, fixed probe, native viewport, and visible markers spanning the 797–844 region. Test root clipping separately if necessary. Do not position HTML/body fixed, alter status-bar metadata, resize from the visual viewport, or move navigation to conceal the symptom. Physical screenshots remain decisive even if the viewport APIs continue reporting 797. No production source, storage, service worker or deployment changed during this investigation.

## Technical references

### Independent comparison readiness (2026-10-02)

This paragraph records the local phases-1–2 checkpoint, before publication. The diagnostic is now published as described in the following release note; it does not alter the main layout or resolve the physical cutoff.

Successor phases 1–2 are implemented and verified **locally only**; see `IPHONE_BOTTOM_STRIP_FIX_PLAN.md`. The read-only report now separates Document viewport (client) from actual HTML/body/React-root/app boxes. `screen-layout-test.html` is generated from the independent fixture, labelled with the local release, and reached only by a save-guarded opt-in action. An exact worker pathname exception serves its known static HTML for query-selected A/B/C cases without replacing normal app routes or accessing records.

Build and 75 automated tests pass, including isolation, report privacy/copy fallback and scoped offline routing. The comparison fixture passed 240 simulated rendered checks across cases/themes/profiles; all preceding 70 rendered checks passed too. A local production preview update opened the comparison correctly and returned to Lumen with unchanged displayed counts and last-save time. These checks use desktop rendering and simulated geometry, **not native iPhone painting**. App layout, storage, install metadata and live 0.1.3 / 82185d6 remain unchanged. Next is an authorized diagnostic-only release and actual Home Screen A/B/C screenshots/reports before selecting a correction. The physical cutoff remains unresolved.

- [MDN: VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) explains why the visible viewport can change independently when the on-screen keyboard or zoom changes.
- [WebKit issue 236445](https://bugs.webkit.org/show_bug.cgi?id=236445#c9) includes a report of Home Screen positioning discrepancies with `black-translucent` and `viewport-fit=cover`. This is evidence of a relevant class of WebKit behavior, not proof that this particular report explains the user's current iOS version.
- [WebKit: full-screen layout and safe areas](https://webkit.org/blog/7929/designing-websites-for-iphone-x/) describes keeping background coverage and interactive safe-area spacing coordinated.

### Diagnostic publication and physical checkpoint (2026-10-02)

The successor diagnostic-only release is live at **0.1.4 / 789fb93**, commit `789fb933208e916715d95dfd3f1c8e8fa80b9ee7`. [Pages workflow 37015783690](https://github.com/tomig777/lumen/actions/runs/37015783690) passed build, all automated release groups and deployment. All eleven published assets match the exact SHA-labelled local build; worker logic matches beyond its platform-specific cache-name hash. The live entry is `assets/index-Dmij3OhW.js`, stylesheet `assets/index-imMINkYO.css`, shell `lumen-shell-54c8ec6ca13e3a8c`.

A separate live desktop tab updated normally from 0.1.3, opened A/B/C/themed independent documents and returned to Lumen. The user-requested expanded report preserves viewport versus box distinctions. Displayed counts and last-save status stayed unchanged. This is desktop browser mode with zero native safe insets, **not installed-iPhone acceptance**. Main layout, install metadata and persistence code are unchanged; the physical cutoff remains unresolved. Next: confirm the new release in the existing iPhone Home Screen app, open **Data & backup → Screen layout → Open layout comparison**, require **Home Screen / standalone**, and send keyboard-closed screenshots and copied reports for A/B/C with an A-repeat. No data clearing, reset or reinstallation is required. Detailed evidence/guardrails are in the successor plan. These verification notes are local, not another deployed build.

## Step 2: local implementation and verification

### Physical B selection and 0.1.5 correction preflight (2026-10-02)

The user supplied actual installed diagnostic screenshots/reports for A/B/C (0.1.4 / 789fb93, iOS 17.3, screen 390 × 844, safe 47/0/34/0). A reproduces clipped navigation and missing lower markers with zero-height body/root and a 797 window/fixed probe/visual viewport. B and C visibly reach the bottom with full navigation/markers; their HTML/body/root, window/fixed probe/visual viewport are 844, while document client viewport remains 797. Navigation positions remain y=754–810 and plus y=758–808. B leaves the app fixed; C's flow change is unnecessary for the observed benefit. B also remains good after rotation and in dark mode according to the user.

The user authorized integrating/publishing B. Version 0.1.5 adds only the tested vh/lvh minimums on the installed deployed HTML/body/root; no navigation offsets, metadata, storage or worker logic change. Build and 77 automated tests pass, along with 70 rendered layout/control/editor and 240 comparison checks. Normal-browser height rules remain unchanged; the independent A case is preserved and relabelled Previous. This is evidence for a document-sizing remedy, not proof of an exact internal WebKit mechanism. Final main-app screenshots, cold launch/resume, keyboard and offline physical acceptance remain pending, as do unreported A-repeat observations. See the successor plan for release verification and acceptance; do not mark the production cutoff resolved from desktop geometry.

On 2026-10-01, the outer app switched to CSS full-screen sizing rather than the visual viewport height/top. The new editor-only viewport adjustment ignores small chrome/safe-area differences and pinch zoom, and clears its properties when the keyboard-like occlusion or editing focus disappears. Navigation scroll clearance now derives from its height, bottom offset, and a 24-pixel content gap. Shared background colors, metadata, and icon assets were not changed.

The final local production entry was `assets/index-DKWQs5VL.js`; its offline shell was `lumen-shell-5366d1185cd4f800`. Build and all 31 tests passed. Browser checks used desktop safe areas of zero, not emulated iOS insets:

| Check | Result |
| --- | --- |
| Welcome at 390 × 844 | Wrapper and art y=0–844; Enter button y=761–815 |
| Home at 390 × 844 | Wrapper y=0–844; navigation y=776–832; + y=780–830 |
| Home scroll end in the final build | Last button bottom about 730; navigation top 776; document height remains 844 |
| Quick capture at 390 × 500 | Close y=126–170 and Save y=338–382 remain visible |
| Task editor at 390 × 500 and 844 × 390 | Close/Save remain reachable; no document overflow |
| Journal at 844 × 228 | Sheet scrolls independently; after scrolling, Save y=161–205 is visible |
| People | Bottom switch stays within portrait and landscape bounds |
| Focus | Playback controls clear the bottom in portrait and landscape |
| Image viewer | Fills portrait/landscape wrapper; close control remains visible |
| Height recovery | Restoring portrait after short/landscape layouts restores the CSS wrapper; no old shell-height property remains |

The four new viewport tests cover keyboard-like occlusion, panning/clamping, dismissal while a field remains focused, loss of editing focus, rotation, invalid readings, small viewport differences, and pinch zoom. They test the decision function, not Mobile Safari's keyboard or event delivery.

The screenshot's bottom-strip issue is not marked resolved: actual installed-iPhone launch/resume/keyboard measurements are still needed after publication, and surrounding background continuity is the next planned step.

## Step 3: local background continuity

On 2026-10-01, the surrounding document and outer app were coordinated with the actual visible page. Shared CSS palette tokens preserve the original page designs. The outer app repeats the visible page's gradient or solid background, while the document uses its bottom color. The image viewer overrides the underlying page until closed. Theme selection follows the page DOM during exit/entry animations, without a JavaScript route observer or new polling loop. The production loading screen now uses the same fixed wrapper with a matching paper background.

| Visible surface | Document bottom color | App/page background |
| --- | --- | --- |
| Welcome | `#f3ece2` | The same solid cream |
| Brain, Health, Focus | `#24211e` | The same solid dark brown |
| Home, Projects, Journal, Inspiration, Data & backup | `#faf7f2` | Existing shared gradient ending at this color |
| People | `#fbf8f3` | Existing People gradient ending at this color |
| Image viewer | `#211e1b` | The same solid image-viewer surface |
| Loading/error screen | `#f7f3ed` | The same solid paper |

All nine planned pages and the image viewer were checked in the local production browser. Welcome, light/dark navigation, restored image-viewer themes, portrait/landscape, reduced-height Brain, and a light quick-note card over dark Brain behaved as intended. Home and landscape People scroll inside their page; the document remains unscrolled and does not gain a second scrollbar. These checks have desktop safe areas of zero and do not reproduce iOS elastic overscroll or the physical Home indicator area.

The final entry was `assets/index-j8z4RT4h.js`, CSS was `assets/index-BSuzpDDj.css`, and offline shell was `lumen-shell-2f8198b1430dd52d`. Build and all 31 regression tests passed. No icon assets, data persistence, metadata, or live deployment changed. The screenshot issue remains pending actual iPhone acceptance after step 6; the next local implementation step is the custom icon.
