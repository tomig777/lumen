# Lumen: iPhone bottom edge and Home Screen icon

Status: the original implementation/release history is recorded below. **The published 0.1.3 / 82185d6 sizing/background changes failed the physical bottom-strip check.** The app box now reaches 844, but the native window/fixed viewport still ends at 797 and clips navigation. See the physical evidence in [IPHONE_LAYOUT_BASELINE.md](IPHONE_LAYOUT_BASELINE.md) and the successor [bottom-strip correction plan](IPHONE_BOTTOM_STRIP_FIX_PLAN.md). Successor phases 1–2 (isolated comparison, local validation and narrow hosting/worker handling) are complete locally and not published. Actual iPhone comparison/painting, keyboard recovery, overscroll and acceptance remain open; desktop geometry is not proof of a fix.

Target: Lumen installed from GitHub Pages on the iPhone 13 Pro. The previously specified OS is iOS 17.3; record the actual installed version during device verification. Compare the installed Home Screen app with Safari because they expose different viewport behavior.

## Intended result

- Each page's background continues to the physical bottom of the display without the pale strip or abrupt boundary visible in the supplied screenshots.
- The navigation, separate + button, and Enter Lumen button sit comfortably above the system Home gesture area.
- Opening and dismissing the keyboard leaves forms usable and restores the original layout.
- The Home Screen icon displays a recognizable cream Lumen logo on a dark brown background.

The system Home indicator remains part of iOS. This work addresses the app's surrounding background and positioning.

## 1. Establish the layout baseline

- [x] Compare the supplied Home and welcome screenshots with the current production layout. Record the visible strip's approximate height and the navigation/button positions.
- [x] Inspect `src/mobile.css`, `src/hooks/useMobileViewport.ts`, the shared backgrounds in `src/polish.css`, screen-specific rules in `src/styles.css`, and the viewport/status-bar metadata in `index.html`.
- [ ] Collect `visualViewport.height`, `visualViewport.offsetTop`, `window.innerHeight`, the app wrapper's rectangle, computed safe-area insets, and standalone status on the phone where available. Use temporary diagnostics or Safari's remote inspector during implementation.
- [ ] Compare cold launch, resume, rotation, keyboard opening, and keyboard dismissal. Desktop simulation can check layout logic but cannot establish the iOS-specific cause.

Current evidence: both supplied screenshots expose approximately 47 CSS pixels below the page. Control offsets match the current safe-area formulas relative to the shortened page. Desktop portrait, landscape, reduced-height, and restored-height measurements confirm that the wrapper always follows `visualViewport.height`; the iPhone-specific band does not reproduce on desktop. A shortened outer container is the leading hypothesis, with a separate surrounding-background mismatch. Exact iPhone viewport values and lifecycle checks remain pending.

Deliverable: a short diagnosis with the relevant measurements, or an explicitly provisional diagnosis if phone measurements are unavailable.

Deliverable recorded: [IPHONE_LAYOUT_BASELINE.md](IPHONE_LAYOUT_BASELINE.md). Step 1's provisional diagnostic deliverable is complete; the unchecked phone checks remain part of device acceptance.

## 2. Correct the full-screen and keyboard layout

- [x] Give the installed app a stable full-screen base layout using CSS viewport/fixed-position rules verified against the baseline. Avoid compensating with an arbitrary extra height or a hard-coded iPhone inset.
- [x] Stop applying a keyboard-sensitive visual viewport height to the entire page when the keyboard is closed. Retain scoped viewport adjustments where needed to keep editing sheets and their Save/Close controls visible.
- [x] Reserve the bottom safe area once when positioning the navigation and separate + button. Derive scroll clearance from the controls' height, spacing, and safe area so the final content can scroll above them.
- [x] Recheck the welcome button, image viewer, People switch, Focus controls, and editing sheets because each has separate bottom positioning.
- [ ] Confirm rotation and keyboard dismissal restore the full layout without a stale viewport offset. Keep pinch zoom and text accessibility available.

Primary files: `src/mobile.css` and `src/hooks/useMobileViewport.ts`. Change `index.html` status-bar metadata only if the measured behavior shows it contributes to the problem.

Done when: the wrapper fills the available installed-app display, controls clear the gesture area, and the layout returns to its original position after editing.

Local implementation (2026-10-01): the shell now uses fixed CSS bounds with `100dvh` and a `100vh` fallback. JavaScript no longer sets its height or top. Visual viewport geometry is applied only to a dialog or an inline page editor while a text field is focused and substantial keyboard-like occlusion is present. Small safe-area/chrome differences and pinch zoom do not trigger that adjustment. Focus, resize, rotation, page-show, and visibility events recalculate or clear editor offsets. Editing sheets omit the bottom gesture inset while positioned above the keyboard; navigation retains its safe-area positioning independently.

Local verification: production build and all 31 tests passed, including four new viewport decision/recovery tests and the existing storage, backup, dates, workouts, Brain, and offline-shell tests. The new viewport tests are included in the Pages release gate. Rendered checks covered 390 × 844, 844 × 390, 390 × 500, and a 844 × 228 long-editor stress check. Welcome, navigation/+, quick capture, task and journal sheets, People, Focus, and the image viewer remained usable. The final Home content scrolled above the navigation without creating a document scrollbar. Reduced browser height is not a real iOS keyboard test: the unchecked device recovery check and screenshot comparison remain required in step 6. Status-bar metadata and zoom capability were left unchanged.

## 3. Extend the correct background to the bottom edge

- [x] Ensure the page, app wrapper, and surrounding document use coordinated colors for the current screen rather than exposing a generic paper-colored strip.
- [x] Extend the welcome background and decorative artwork through the bottom area. Keep the Enter Lumen button in the safe interactive area.
- [x] Check Home, Projects, Brain, Health, Focus, People, Journal, Inspiration, and Data & backup, including transitions between light and dark pages.
- [ ] Confirm scrolling and overscroll do not reveal a different-colored document background or introduce a second page scrollbar.
  - [x] Desktop checks: page scrolling stays contained and the surrounding document matches the page's bottom color.
  - [ ] Installed iPhone check: confirm elastic overscroll and the physical gesture area after publication.

Primary files: `src/mobile.css`, `src/polish.css`, and the page/theme wiring in `src/App.tsx` only where necessary.

Done when: there is no visible horizontal background boundary at the bottom during launch, scrolling, or page changes.

Local implementation (2026-10-01): shared palette tokens now define welcome cream, the existing light-page/People gradients, and the dark surface. CSS reads the visible page or image-viewer layer rather than the requested route, so exit animations do not leave a stale theme. The outer app and handset surface share that page's background; `html`, `body`, and the React root use its terminal color at the bottom. The image viewer takes precedence until closed. The loading/error screen uses the same production full-screen wrapper and its own matching paper color. Welcome artwork remains full-height and its safe-area button offset is preserved. Light editing cards retain light native controls even over a dark page.

Verification: all nine planned pages were checked in the production browser, along with the image viewer and a quick-note dialog on Brain. Computed colors/gradients matched across the visible page, wrapper, and document. Checks covered portrait 390 × 844, landscape 844 × 390, reduced-height Brain at 390 × 500, and dark-to-light navigation. Home and landscape People scrolled internally while document scroll stayed zero and document dimensions remained at the viewport size. The build and all 31 existing tests passed; no new test was added solely for CSS token substitution. Actual iPhone launch/resume, elastic overscroll, and the screenshot comparison remain pending in step 6. Status-bar metadata, icons, storage, and deployment were not changed.

## 4. Create and wire the custom icon

- [x] Create a simple vector logo: a warm-cream geometric Lumen mark on `#24211e` dark brown. Start with a clear L shape and a restrained light accent; check readability at small Home Screen sizes.
- [x] Keep an editable SVG source and export square, opaque PNGs at 180 × 180, 192 × 192, and 512 × 512. Leave enough internal space for platform masking; let iOS apply its rounded corners.
- [x] Point `index.html`'s `apple-touch-icon` at the 180-pixel PNG with the correct size declaration. Keep the Lumen title.
- [x] Add the PNG icons to `public/manifest.webmanifest` with accurate sizes and MIME types. Use relative URLs that work under `/lumen/` on GitHub Pages.
- [x] Use versioned PNG filenames to avoid reusing the old SVG/fallback icon URL.
- [ ] Verify the icon shown in Safari's Add to Home Screen preview and then on an installed shortcut; record existing-icon cache behavior separately after publication.

Primary files: `public/lumen-icon.svg`, new PNG files under `public/`, `public/manifest.webmanifest`, and `index.html`.

Done when: the Home Screen shows the designed logo instead of the grey letter fallback, and the mark stays legible at its displayed size.

Local implementation (2026-10-01): `public/lumen-icon.svg` now contains an editable cream L (`#e8d9c7`) and warm point of light (`#c6ab8d`) on a full, opaque dark-brown square. The three `lumen-icon-v1-*.png` exports total 5,670 bytes. Apple metadata points at the 180-pixel PNG; the manifest includes 192- and 512-pixel PNGs with `any maskable` purposes and keeps the SVG as a scalable fallback. All paths are relative. `scripts/generate-icons.mjs` provides repeatable export using an optional installed Sharp module; normal app builds and CI need no image-library dependency. README documents regeneration and safe icon troubleshooting.

Local verification: inspected the 180- and 512-pixel exports and a 60-pixel downsample for legibility. Three new icon tests verify actual dimensions, RGB opacity, dark square corners, palette, every foreground pixel's placement inside the maskable safe circle, exact asset copies in the built output, HTML/manifest metadata, `/lumen/` URL resolution, and offline-shell inclusion. The production build and all 34 tests passed. The content-hashed worker includes all nine output files, including each PNG, without changing its update strategy. The Pages workflow now runs the icon tests before publication. The installed iPhone logo, Safari preview, and existing-icon cache behavior remain unverified until step 6. No storage, in-app artwork, or live deployment was changed in this step.

## 5. Validate the production release

- [x] Run `pnpm build` and `pnpm test:offline`. Confirm the generated service worker includes the PNG assets and preserves the complete-release update strategy.
- [x] Inspect the production build at 390 × 844 portrait, 844 × 390 landscape, and a reduced height representing an open keyboard. Check scrolling, forms, navigation, and light/dark backgrounds.
- [x] Test viewport decision logic with focused recovery/resizing tests. Use rendered checks for CSS and icon appearance; do not substitute CSS-text assertions for layout verification.
- [x] Check the icon URLs and image dimensions in the built output and confirm the release checks are configured in the existing Pages workflow. Its actual GitHub execution remains required during step 6.

Done when: the production build and relevant checks pass, the icons are included in the offline shell, and the simulated layouts show no regressions.

Local validation (2026-10-01): all nine planned pages were inspected across the portrait/landscape checks, with Home, Brain, Projects, Health, and People internal scrolling; Focus playback controls; the expanded + menu; the image viewer; and quick-note, new-project, task, and journal forms. Twenty-five recorded outer-layout checkpoints matched the requested viewport, with zero document scroll. Page colors continued through the surrounding document during light/dark changes. Reduced-height checks are desktop layout simulations, not a real iOS keyboard test.

| Viewport | Main checks |
| --- | --- |
| 390 × 844 | Welcome, Home, Brain, Projects, Health, Focus, People, Journal, Inspiration; navigation/+, page backgrounds, and restored full-height layout |
| 844 × 390 | Welcome, Brain, Projects, Health, Focus, People, Data & backup; internal scrolling, menu bounds, and image-viewer spacing |
| 390 × 500 | Quick capture, new-project and task sheets, image viewer; readable fields and reachable Save/Close controls |
| 844 × 228 | Long journal draft; scroll down to Save and back to Close without moving the surrounding document |

Rendered checks caught and corrected mobile-only issues in `src/mobile.css`: sheet Close buttons had a 44-pixel height but retained a 34/36-pixel width; Health's 119-pixel date field truncated the year at 16-pixel text size; People's landscape Back control moved partly offscreen with the scrolling page; and the image viewer's fixed 390-pixel artwork overlapped its header/caption at reduced height. Close controls are now 44 × 44, the date field has 160 pixels with wrapping available, People's Back control stays fixed above the safe area, and artwork fits the available region between non-shrinking viewer controls. A more-specific sheet dropdown style also overrode the intended mobile font size; the final build confirms 16 pixels. No data schema or storage behavior was changed.

After correction, the image viewer had 20-pixel separation between its header, artwork, and footer at both 390 × 500 and 844 × 390. People's Back control remained fully visible at y=332–376 after scrolling 340 pixels in landscape. Task Save and Close were visible at 390 × 500, journal Save and Close were reachable by internal scrolling at 844 × 228, and returning to portrait restored an 844-pixel shell without stale editor geometry. Browser warning/error logs were empty at the final check.

Final release checks: `pnpm build` and all 34 tests passed, covering storage, backups, dates/workouts, Brain, viewport decisions, icons, and offline releases. The final shell is `lumen-shell-f28b1b0c5de09894`, containing all nine output files. Local HTTP checks returned 200 for HTML, manifest, SVG, all three PNGs, and the worker, with correct MIME types; PNG dimensions/opacity and relative `/lumen/` paths passed the icon tests. The installed local worker's **Update Lumen now** flow loaded the new content-hashed assets without clearing storage, and the quick-capture test note survived reload/update. All UI writes were confined to the separate localhost preview, not the user's live app. The existing Vite large-bundle warning remains a separate performance follow-up, not an icon/layout release failure.

Step 5 is complete locally. The live Pages workflow, physical bottom-edge screenshot comparison, Safari icon preview, installed Home Screen icon, iOS keyboard/overscroll behavior, and phone offline/data acceptance remain unchecked in step 6. No commit or publication was performed.

## 6. Publish and verify on the iPhone

- [x] Commit and publish the completed implementation through the existing `main` → GitHub Pages workflow. Publication was authorized on 2026-10-01.
- [x] Verify the live HTML, manifest, icon PNGs, and service worker belong to the new release.
- [ ] On the installed iPhone app, check cold launch, resume, portrait/landscape, navigation, the + menu, typing and dismissing the keyboard, and both light and dark screens.
- [ ] Compare new Home and welcome screenshots with the supplied baseline. Confirm the strip is gone and the Home indicator area blends with each page.
- [ ] Check the Home Screen logo and reopen the app offline after the updated shell is ready.
- [ ] Confirm a test note and uploaded image still open after the update. Do not use clearing website data or Reset Demo Data as an icon-refresh or layout fix.

If device checks cannot be performed during implementation, report the release as implemented with iPhone acceptance pending. Do not mark the screenshot issue resolved solely from desktop simulation.

Publication (2026-10-01): implementation commit `7ad6b31a73ed4982d87d10db33858d762badc8f7` was published to `main`. [GitHub Pages workflow 36914690822](https://github.com/tomig777/lumen/actions/runs/36914690822) completed successfully, including the production build and all release test groups. [Live Lumen](https://tomig777.github.io/lumen/) serves `assets/index-B-FSRsBg.js` and `assets/index-DyYp4sCu.css`. Direct HTTP checks returned 200 with correct MIME types for HTML, manifest, SVG, all three PNGs, the compiled assets, and the worker. HTML, manifest, and all seven shell assets match the validated local build byte-for-byte. The live worker is `lumen-shell-870c090c4fc89cef`, contains all nine expected files, and references the same entry assets as the HTML. Its hash differs from the Windows build because the existing generator hashes platform-specific relative path separators; the actual release assets are identical.

Live browser smoke check: the existing desktop browser initially served its preceding cached release. The normal **Data & backup → Update Lumen now** action loaded the new entry and PNG metadata without resetting storage. Visible record counts remained unchanged (450 notes, 2 journal entries, 3 projects, 9 tasks, 0 embedded images), and the offline app shell reported Ready. No live note, task, journal, project, or image was created, edited, or deleted. At 390 × 844, welcome, Home, and Brain had shell bounds y=0–844, document height 844, and no document scroll. Welcome's document color was `#f3ece2`, Home's was `#faf7f2`, and Brain's was `#24211e`; Home navigation spanned y=776–832 with zero desktop safe-area insets. Brain rendered one canvas and the expanded + menu opened normally. Browser warning/error logs were empty. The temporary verification tab was closed and the viewport override reset; the user's existing tab was not reloaded.

Remaining handoff: open the installed iPhone app online, use **Data & backup → Update Lumen now** if offered, and reopen it. Compare Home/welcome bottom edges, light/dark screens, keyboard dismissal, rotation/resume, and the Home Screen logo. Then confirm offline reopening and a test note/photo surviving close/reopen. If the existing icon remains grey, record that result and check Safari's Add to Home Screen preview; do not delete the installed app or clear website data as a refresh workaround. These checks are still pending, not failed or assumed complete.

## Measured viewport correction (2026-10-02)

This is the new five-step correction agreed after the actual iPhone report. The original steps 1–6 above are retained as historical implementation/release records, not acceptance of the unresolved strip.

1. [x] **Correct the installed-app height locally.** Use `100lvh` with `100vh` fallback only in Home Screen/standalone mode; keep normal browser tabs on `100dvh`. Anchor the explicit height at the top without an opposing bottom constraint. Do not hard-code 47 or 844, use `screen.height` as a general height source, or resize the shell from keyboard readings.
2. [x] **Audit bottom controls against the full-height shell locally.** Check navigation/+, welcome, Focus and People. In particular, People's return button must not keep anchoring to the shorter native viewport. Keep coverage through the physical bottom and avoid adding document scrolling. Actual iPhone painting remains part of step 4.
3. [x] **Preserve safe-area and keyboard behavior locally.** Apply interactive bottom clearance once, retain editor-only visual-viewport adjustment and pinch zoom, and check rotation/keyboard dismissal for stale offsets. Brain's category editor is now an app-owned absolute overlay outside the page scroller/animation. Simulated checks and production browser forms pass; native iPhone keyboard/painting acceptance remains in step 4.
4. [ ] **Validate a controlled release on the actual iPhone.** Version 0.1.3 / `82185d6` is published and release-verified; the user now confirms full-height app geometry but failed physical painting. Light/dark screenshots still clip around the old 797-point boundary. Keep this unchecked until full bottom painting, reachable controls, internal scrolling, cold launch/resume, rotation and keyboard recovery pass. Preserve all app records.
5. [ ] **Investigate native clipping after the confirmed 0.1.3 failure.** The document-layer hypothesis is now under investigation; use an isolated minimal test page with no Lumen storage access. Compare explicit full-height document/root sizing and a normal-flow full-height shell against the existing fixed shell. Keep control spacing and metadata constant and test actual painting, not only rectangles. Do not stack arbitrary padding hacks or delete/reinstall the user's existing app as a first-line workaround.

Step 1 verification: build and all 49 existing tests pass; six rendered CSS fixture cases pass, including the exact reported 797/844 mismatch, browser-height changes and installed-height restoration. A separate production browser preview passed portrait, landscape, reduced-height and restored-height checks with zero document scrolling. These are desktop/simulated checks, not a claim of physical iOS rendering. Keyboard code, safe-area spacing, metadata, storage and the live 0.1.2 release were not changed. Publication and phone acceptance are intentionally deferred to step 4.

Step 2 implementation: `PeopleScreen` now owns a full-height `.people-page` layer, with its return button outside the inner `.people-screen` scroller. The mobile return button is absolutely positioned against that layer instead of fixed to the native viewport. Its existing icon, action, colors and safe-area offset are preserved, as is the desktop preview's hidden-in-production Home indicator. Navigation/+ already anchor to the full-height `.phone-app`, welcome anchors to its full-height page, and Focus controls anchor to the full-height player; those controls needed no position changes.

Step 2 verification: build and all 49 existing tests pass. The new isolated `mobile-controls` fixture renders the actual People and BottomNav components using the actual app styles, in frames whose native viewport is shorter than the app. All 16 checks passed across installed portrait, browser portrait, installed landscape and portrait restoration. They verify People anchoring outside the scroller, landscape scroll stability, navigation/+ bounds and final-row scroll clearance. The previous six height checks still pass. Fixtures access no saved data or worker and are not shipped.

The production preview ran the new entry `assets/index-p9ry8rdf.js` after its normal local update flow. People's button stayed at x=748–824, y=332–376 after 340 pixels of landscape scrolling and successfully returned to Home. Portrait return bounds were y=786–830. Welcome's Enter button remained visible at y=761–815 in portrait and y=307–361 in landscape. Focus controls remained within the player at y=711–779 in portrait and y=315–367 in landscape; Pause and Back still worked. Navigation and the expanded menu remained usable. Document scrolling stayed zero. Local record counts (450 notes, 2 journal entries, 3 projects, 9 tasks, 0 embedded images) and the last successful save timestamp were unchanged by the preview update and interaction checks. No live app records or deployment were touched. Next is step 3's safe-area/keyboard recovery audit, not a claim that the physical strip has disappeared.

Step 3 implementation (2026-10-02): `AppOverlay` portals Brain's category editor into its owning `.phone-app`, outside both `.screen-scroll` and the animated `.screen-layer`. The editor is absolute rather than viewport-fixed, covers the full shell, and receives editor-only keyboard geometry. Its mobile safe-area padding applies the home inset once and drops that inset above the keyboard; Close, Save and option buttons have at least 44-point targets, with wrapping for narrow screens. Existing form fields, draft handling and save callbacks are preserved. Navigation, welcome and Focus keep their already audited safe-area offsets.

The production hook now delegates to the shared, testable viewport observer. It still never assigns app/document height, ignores pinch zoom and small viewport differences, and batches resize/scroll/focus events into one animation frame. Hidden/pagehide events cancel queued readings and clear temporary editor properties immediately; resume/pageshow recalculates current geometry. Cleanup removes all listeners and queued work. There is no polling loop, new metadata, storage migration or data reset.

Step 3 verification: build and all **55** automated tests pass, including six new observer lifecycle cases in the existing viewport test group. The isolated `mobile-editors` fixture uses the actual overlay component, observer and styles with fixture-only forms and simulated VisualViewport events. All **48** rendered checks pass across installed portrait (844/797), browser portrait and installed landscape (390/369): overlay parenting/coverage, editor-only panning, safe-area spacing, reachable actions, zoom, dismissal with retained focus, suspend/resume, shared sheets, quick capture and inline page editing. The previous 6 height and 16 control checks also pass (**70** rendered checks total). These fixtures access no records or worker and are not published.

The production preview loaded `assets/index-BUNkjalv.js`, CSS `assets/index-WYr3wUac.css`, and shell `lumen-shell-6b6db5a35069e871` through the normal local update action. Category covered y=0–844 in portrait and y=0–390 in landscape, with the app as parent. Landscape Close was y=52–96; after internal scrolling, Save was y=318–362, with zero document scrolling. Quick capture and task controls remained reachable at 390 × 500; a journal at 844 × 228 scrolled to Save y=161–205. Returning to portrait restored shell/document height 844, zero document scroll/horizontal overflow and no keyboard attribute/editor properties. Browser warnings/errors were empty. Counts and last successful local save remained unchanged; all drafts were closed without saving. These short desktop viewports are not native keyboard tests. Steps 1–3 remain **local/unpublished**; next is step 4's controlled release and actual iPhone acceptance.

### Measured correction, step 4: published; iPhone acceptance pending

Version **0.1.3** packages measured correction steps 1–3. The user authorized publication by proceeding with step 4 on 2026-10-02. Publish only the reviewed source, tests and documentation through the existing `main` Pages workflow; do not include screenshots, local backups, browser data or generated `dist` files. Storage/schema, metadata and update activation policy remain unchanged. The last known published version before this release is 0.1.2 / `0b99c54`.

- [x] Rebuild and pass all 55 automated tests for 0.1.3.
- [x] Rerun the 70 isolated rendered layout checks.
- [x] Publish the reviewed commit and verify successful Pages build/deployment for that exact SHA.
- [x] Verify live HTML, release metadata, compiled entry/style and complete offline shell agree on 0.1.3 and the release build.
- [x] Verify the live normal update flow and record-count preservation without creating/editing/deleting records.
- [ ] **Actual iPhone:** confirm 0.1.3 and its build in Data & backup, then copy a fresh Screen layout report from the Home Screen app with the keyboard closed. Portrait app bounds should follow the reported full CSS `lvh` (previously 844), not the shorter `dvh` (previously 797), while document scrolling remains zero.
- [ ] **Actual iPhone:** send Home and dark Brain screenshots showing the full bottom edge and reachable navigation/+; compare actual painting beyond the former 797-point boundary. A larger app rectangle alone is not acceptance.
- [ ] **Actual iPhone:** check welcome cold launch, background/resume, portrait/landscape, internal scrolling and + menu, and open/dismiss the keyboard in quick note/category/task/journal. Confirm the original full layout returns and Save/Close can be reached. Cancel drafts if no test content is wanted.
- [ ] **Actual iPhone:** reopen offline after the new shell is Ready and confirm existing content still opens. If there is personal data, preserve it and keep a verified off-phone backup; never clear website data, Reset Demo Data or reinstall as a release-refresh step.

Keep the top-level step 4 unchecked until device acceptance is reported. If release 0.1.3 still has the strip despite correct full-height geometry, record that result and proceed to isolated native-clipping investigation (step 5); do not add arbitrary compensating insets.

Preflight (2026-10-02): version 0.1.3 passed the production build and all 55 tests. The six height, 16 bottom-control and 48 editor fixture checks were rerun successfully. Local entry is `assets/index-DlF4o3gq.js`, stylesheet `assets/index-WYr3wUac.css`, shell `lumen-shell-058648396eeaa490`; this local preview has no release SHA, so its JS/shell hashes are not the final GitHub release identity. The remote `main` was verified at `0b99c54cb74576fe5de06a090065a13e3f5ffb0f` before publishing. No saved records or personal images were included or changed.

Publication (2026-10-02): commit [`82185d6050ca526473dc5ef6e92158d9be26b57f`](https://github.com/tomig777/lumen/commit/82185d6050ca526473dc5ef6e92158d9be26b57f) was pushed to `main`. [Pages workflow 36950661076](https://github.com/tomig777/lumen/actions/runs/36950661076) completed its build, all release test groups and deployment successfully. [Live Lumen](https://tomig777.github.io/lumen/) reports **0.1.3 / 82185d6**, entry `assets/index-X8c60EzM.js`, stylesheet `assets/index-WYr3wUac.css`, shell `lumen-shell-4b265e275322b6de`. Rebuilding locally with that same source SHA still passed all 55 tests. All ten published shell files returned 200 with correct MIME types and match that local output byte-for-byte. The worker also matches except its expected platform-specific cache-name hash; logic, file list and entry list are identical. Fixtures, screenshots, backups and browser data are not in the deployment.

Live browser smoke check: a separate temporary tab initially ran 0.1.2 / `0b99c54`. The normal **Check for updates → Update Lumen now** flow loaded the new entry and showed 0.1.3 / `82185d6`, with the offline shell Ready. Counts stayed 450 notes, 2 journals, 3 projects, 9 tasks and 0 embedded images; the last-save indicator stayed Not recorded yet. No backup, restore, reset, file upload or form save was performed. Brain at 390 × 844 used document color `#24211e`, shell y=0–844, nav y=776–832, zero horizontal overflow and zero document scroll. Category mounted directly under `.phone-app`, outside the page scroller, with absolute bounds y=0–844; Close worked and left no editor properties/keyboard marker. Browser warning/error logs were empty. These checks are desktop browser mode with zero safe-area insets, not physical standalone iOS.

Handoff: open the iPhone Home Screen app online, choose **Data & backup → Check for updates → Update Lumen now** if offered, and confirm **0.1.3 / 82185d6**. Copy a fresh **Screen layout** report with the keyboard closed and send Home/dark Brain screenshots including the bottom edge. Then check keyboard dismissal, rotation/resume and offline reopening as listed above. The strip is still **unconfirmed**, not marked resolved. Do not clear website data or remove/reinstall the app. These post-publication verification notes remain local while phone acceptance is pending, avoiding another deployment/build identity during the requested device check.

### Step 5: document-layer comparison plan after physical failure

Confirmed device result: iOS 17.3, installed 0.1.3 / `82185d6`, app y=0–844, but Window/Document viewport/VisualViewport/fixed-inset probe remain 797 and document scroll height remains 797. The user supplied Home and dark Health screenshots with the strip clipping lower navigation buttons. See `IPHONE_LAYOUT_BASELINE.md` for the exact report and measurement caveats. Step 4's physical painting check **failed**; this is not an old-cache inference.

Read-only inspection of the exact live bundle on desktop found body and React #root have zero CSS/box height because their sole app is fixed-position; HTML covers the native desktop viewport. This makes normal-flow document sizing a concrete test candidate, not a proven iPhone cause. In particular, the diagnostic's existing `Document` value is `documentElement.clientHeight` (viewport height), not the HTML CSS height.

Controlled implementation, before another production layout change:

1. Prepare a minimal HTML comparison with no React app imports, records, database, local/session storage access, uploads, worker registration or automatic telemetry. Match the installed viewport/status-bar metadata. Include visible bottom markers, user-requested geometry reporting and a safe return link.
2. Start with current fixed-shell behavior. Test only full-height HTML/body/#root minimums (`vh` fallback, `lvh` installed) while retaining the fixed app and existing spacing. Then separately test a normal-flow full-height shell. Observe root overflow as a separate variable if those cases still clip. Never fix HTML/body to the viewport.
3. Report actual HTML/body/#root boxes and computed heights/position/overflow separately from native viewport APIs. A root scroll height of 844 or a larger app rectangle is supporting geometry, not sufficient painting acceptance. Verify the visible markers and control-shaped targets beyond the old boundary on the actual phone, plus rotation/resume and keyboard recovery before choosing a production layout.
4. Make the test reachable through the existing hosting without deleting the installed app. Account for the existing worker's navigation fallback (it currently serves the app entry for navigations): an independent diagnostic page needs an exact, tested route exception or an explicitly separate scope. Do not assume a new HTML path under /lumen will automatically bypass the worker. No new repository/provider or service-worker change is authorized merely by supplying the report.
5. Once the device distinguishes the alternatives, apply only the supported layout change, rerun layout/editor/storage regression checks, and publish a separately identified controlled release when authorized. Keep saved records and the current icon/install intact. If the minimal full-height page is also physically clipped, retain that evidence for the native viewport/status-bar branch; don't label the issue unfixable without that test.

Current state: investigation and local documentation only. No production code or deployment change has been made in response to this report. Steps 4 and 5 remain unchecked.

The user requested a concrete countermeasure plan on 2026-10-02. The step-by-step successor is [iPhone bottom-strip correction plan](IPHONE_BOTTOM_STRIP_FIX_PLAN.md). It defines three isolated comparison cases, narrow diagnostic hosting/update handling, a physical-phone checkpoint before selecting an app change, a native-clipping fallback branch, regression/release checks and actual acceptance criteria.

The user subsequently authorized **phase 1** of that successor plan. The local, self-contained `tests/fixtures/screen-layout-test.html` now supplies cases A/B/C, light/dark backgrounds, paint markers, unchanged navigation geometry, a non-saving keyboard field and a user-requested report. The ordinary report also distinguishes document client viewport from actual HTML/body/React-root/app boxes. Build and all 60 automated tests pass, with five new measurement/cleanup tests. Desktop portrait checks confirm the intended case differences and fresh-document behavior, not iPhone painting. No main layout, navigation, storage, metadata, worker source, version or publication changed. The successor plan records phase 1 complete locally and phase 2's validation/hosting work next; the original measured-correction steps 4/5 remain unaccepted until actual phone evidence supports a fix.

## Execution order (original release)

Successor phase 2 is complete locally (2026-10-02): a save-guarded opt-in comparison link and an independent generated HTML document with matching release identity are ready. The worker has only an exact diagnostic pathname exception, with normal app/offline update behavior preserved. Build, 75 automated tests, 240 comparison-fixture checks and the preceding 70 rendered layout/editor checks pass. A local preview update/open/return check kept displayed record counts and last-save time unchanged. No main layout or persistence changes, version bump, commit or publication occurred. Phase 3 is the diagnostic-only publication and physical iPhone checkpoint; the strip remains unresolved. Full implementation details and limits are in the successor plan.

Layout diagnosis → full-screen/keyboard correction → background continuity → icon assets/configuration → production checks → publication → iPhone acceptance.

The user authorized steps 1–6. Steps 2–5 are implemented and validated locally; step 6 publication and live release checks are complete. Phone acceptance remains pending. Update the remaining checkboxes and findings only when actual device checks are reported or performed.

## References

- [WebKit: full-screen layout and safe areas](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- [Apple: configuring web apps and PNG Home Screen icons](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
