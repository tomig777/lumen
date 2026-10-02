# iPhone bottom-strip correction plan

Status: **phase 3 publication authorized and in progress**, 2026-10-02. Phases 1–2 are implemented and verified locally. The user requested continuing after the phase-2 handoff, authorizing the diagnostic-only release **0.1.4** through the existing Pages workflow. Lumen's main layout, install metadata and persistence code remain unchanged. Physical iPhone A/B/C comparison is required before selecting or applying a production layout correction.

## Goal and confirmed baseline

Make Lumen's own background and content reach the bottom of the installed iPhone screen without a cutoff through navigation. Keep the current layout, separate + button, interactive safe-area clearance and saved records intact. The native iPhone home indicator itself is not the defect and is not something this plan removes.

The physical baseline is iPhone 13 Pro, iOS 17.3, installed **0.1.3 / 82185d6**. App bounds are 0–844; window, document client viewport, fixed-inset probe and visual viewport are 797. CSS vh/lvh are 844, dvh is 797; safe top is 47 and bottom is 34. Home and dark Health screenshots still cut content near 797. The previous app-height correction is active but the physical painting check failed.

The normal-flow document sizing hypothesis is not proven. A read-only desktop inspection of the exact live bundle found body and #root have zero box height beneath the fixed app. Also, the existing report's `Document` row is `documentElement.clientHeight`, a viewport measurement, not the HTML box height. Relevant [WebKit 254868](https://bugs.webkit.org/show_bug.cgi?id=254868#c2) and [WebKit 237961](https://bugs.webkit.org/show_bug.cgi?id=237961) describe related installed-app sizing behavior, not a verified solution for this device. Full evidence is preserved in `IPHONE_LAYOUT_BASELINE.md`.

## Guardrails

- No storage migration, clearing website data, Reset Demo Data, deleting/reinstalling Lumen, or uploading personal records. Keep the installed icon and existing app identity.
- No hard-coded 47-point compensation, 844-point app height, universal screen.height sizing, JavaScript shell resizing from VisualViewport, or extra navigation padding.
- Keep the current viewport/status-bar metadata constant during the first comparison. Do not make HTML/body fixed-position or introduce transforms to force composition.
- Keep Home Screen sizing and normal-browser sizing separate. Preserve the keyboard's editor-only adjustment and apply safe-area clearance once to controls, not to the whole background.
- Each layout experiment changes one variable. Measurements support a conclusion; actual phone painting and usable controls decide it.
- Use the existing GitHub Pages hosting and normal explicit update flow. Publishing requires a request to proceed; do not create another repo/provider as a diagnostic shortcut.

## Step 1 — Build the isolated comparison locally

- [x] Prepare a small, self-contained HTML diagnostic reproducing only the outer document, app frame, internal scroller and bottom controls. Do not import Lumen's React app, records, database, full design assets or remote fonts. No IndexedDB, local/session storage, uploads, service-worker registration or automatic telemetry.
- [x] Match the current installed viewport/status-bar metadata. Include light/dark backgrounds, high-contrast bottom markers, control-shaped targets at the current safe-area offsets and a simple keyboard field that saves nothing. Important diagnostic actions stay above the known clipped region.
- [x] Show the selected case, diagnostic revision/build and actual standalone/browser mode. Include an explicit Return to Lumen link and user-requested Copy report action with a selectable-text fallback.
- [x] Measure HTML, body, root and app rectangles, computed height/min-height/position/overflow, native viewport, vh/dvh/lvh, safe areas and scroll position separately. Preserve viewport readings even if they remain 797. Extend the normal Screen layout report with these box measurements so production results can later be compared accurately.

Comparison cases, retaining identical inner content and navigation spacing:

| Case | Change from the preceding case | Purpose |
| --- | --- | --- |
| A — current | Current fixed full-height app with the existing surrounding document rules | Reproduce the defect before evaluating a candidate |
| B — full-height document | Explicit full-height minimums on HTML/body/root, using vh fallback and installed lvh; app remains fixed | Test the collapsed document/content-bounds hypothesis |
| C — normal-flow app | Keep B's document minimums; place the same full-height app in normal flow instead of fixed | Test whether contributing normal-flow content removes native clipping |

Use a fresh document load for each case, not only class toggles in an already-expanded page. Recheck A after B/C and include reopen/resume observations; changing content height may alter native state, so a later passing A must not be mistaken for a permanent fix. If root overflow needs comparison, add it as a separate labelled case rather than silently changing B or C.

Gate: the diagnostic's A case matches the current layout rules, other cases differ only as documented, and the report clearly distinguishes viewport measurements from actual element boxes. No production layout change yet.

### Phase 1 implementation and local checks

The self-contained page is `tests/fixtures/screen-layout-test.html`, diagnostic revision **1 / local-unpublished**. It is intentionally outside `public` and the production build until phase 2 establishes hosting. Its startup accepts only case a/b/c and light/dark, applies the selected case before first paint, and uses ordinary links for fresh documents. B changes only the outer minimum heights; C retains B and changes app flow participation. The current viewport/status-bar metadata is reproduced, with no alternate install/manifest or worker registration. The local return link resolves to the local app root; deployment-relative routing must be handled in phase 2.

`src/screenLayout.ts` now names the viewport row **Document viewport (client)** and separately reports actual HTML, body, React root and app boxes, including CSS height/min-height, display, position, overflow, transform, filter and containment. The existing user-triggered snapshot behavior is retained: no stored content, network calls or listeners, and all hidden probes are removed even when measurement fails. Five new tests in the existing screen-layout group cover collapsed/missing boxes, fractional heights/compositing clues, distinct viewport/box readings and probe cleanup.

The production build and all **60** automated tests pass. A standalone script syntax/API check passed: both inline scripts parse, with no app imports, persistence, request APIs or worker registration. The build still has ten shell assets and contains no diagnostic page; the main stylesheet remains `assets/index-WYr3wUac.css`, unchanged from 0.1.3. These checks do not publish or activate the local build.

At a **desktop browser** viewport of 390 × 844 (native safe areas zero), A reports body/root height 0; B reports both 844 while the app remains fixed; C reports both 844 with the app relative. All three preserve nav y=776–832 and app height 844. Fresh case navigation clears the report and temporary keyboard field. A repeat after B/C restores the collapsed containers in this desktop engine. Light/dark styling, high-contrast bottom markers, report generation, whole-report manual selection, probe cleanup and the local return URL were checked. A harmless typed keyboard sample stayed out of the report. Browser warning/error logs were empty. Native keyboard delivery, installed painting, clipboard-denial behavior and the 797/844 native mismatch remain later validation; these desktop checks are not a fix claim.

Only the isolated page and read-only measurement helper/tests were implemented. No storage code, main layout CSS, application navigation, metadata, worker generator, version or live deployment was changed. The temporary browser tab/viewport and local test server are cleaned up after verification. Next is **phase 2**, including the narrowly scoped hosting/worker route handling, not publishing or physical acceptance.

## Step 2 — Verify the diagnostic and its hosting locally

- [x] Check portrait, landscape, short/keyboard-height viewports, light/dark surfaces, report/copy fallback, internal scrolling and the return link. Browser simulation must be labelled as simulation, not iOS acceptance.
- [x] Add checks for baseline/candidate CSS differences and for the diagnostic not importing app/storage code or registering a worker. Keep the existing viewport, editor, offline and storage regression tests passing.
- [x] Make the independent page reachable from a small opt-in action under Data & backup → Screen layout. Do not automatically enter the diagnostic or change normal navigation.
- [x] Account for `scripts/generate-service-worker.mjs`: all current navigations return index.html. Add only an exact, tested exception for the diagnostic's known static HTML path; query-selected cases must resolve to that same static file. Preserve the existing index fallback for normal app routes and the existing cache/update policy. Do not permit arbitrary runtime caching or unregister the worker.
- [x] Verify the generated artifact, direct navigation, query-selected cases, return-to-app route, release identity and ordinary offline shell behavior. The diagnostic may share the existing static shell cache, but it must never access personal records.

Gate: local build/regression checks pass, the route exception is narrowly scoped and the diagnostic opens the intended document rather than a cached copy of the app entry. Publish nothing until authorized to continue.

### Phase 2 implementation and local checks

`scripts/layout-diagnostic.mjs` renders the phase-1 source into **`dist/screen-layout-test.html`**. Vite serves the same independent HTML at the exact dev path and emits it unchanged apart from release metadata, deployment-relative return link and the local/published instruction. Both inline scripts and all three style blocks remain byte-identical between the fixture and generated page. There are no React/storage imports, external resources, worker registration or record access. Diagnostic revision stays 1; the generated page shows **Lumen 0.1.3 / local**, matching the local bundle, index metadata and release.json. The raw fixture remains explicitly local-unpublished. No app version bump was made.

**Data & backup → Screen layout → Open layout comparison** is an ordinary same-window link, not an automatic redirect or a new navigation tab. It is disabled while the app's save state is not `saved`, preventing pending record writes from being interrupted. The return link `./` resolves to the app root for both `/` and `/lumen/` hosting. The only stylesheet change is removing the link underline; app frame, document sizing, safe-area offsets and navigation rules are untouched.

The existing static shell now includes the known diagnostic (eleven assets). Its worker changes only navigation to the **exact scoped `screen-layout-test.html` pathname**; A/B/C/theme query strings use that same cached HTML, while normal routes and lookalikes keep the index fallback. Method/origin/scope guards, no arbitrary runtime caching, previous-shell retention and explicit user update activation are preserved. The generator and worker's install check reject a diagnostic with mismatched version/build instead of activating a mixed release. An evicted diagnostic falls back to its original network URL, never to the app entry; that runtime response is not cached.

The production build and **75 automated tests** pass (60 preceding tests plus ten diagnostic and five offline-route checks). New coverage includes release identity and safe template rendering, app/data/API isolation, CSS single-variable changes, closed query values, manual-copy fallback for missing/denied clipboard, report privacy, failed-probe cleanup, opt-in/save guard, root and repository-scoped offline navigation, exact-path exclusions, eviction behavior and mixed-diagnostic rejection. These offline checks run with the worker in an isolated harness whose network is disabled; they are not a physical phone offline check.

`tests/fixtures/layout-diagnostic-regression.html` passed **240/240 rendered checks**: five declared profiles (installed/browser portrait, installed landscape, short browser and keyboard-height browser), both themes and all three cases. It verifies only simulated geometry, normal-flow box differences, unchanged navigation/safe clearance, four tabs/separate plus, final-row clearance, inner scrolling, no horizontal overflow, reachable report/return/dismiss targets, report privacy/probe cleanup and manual selection. It loads no app or records, removes each disposable frame, and explicitly says native iOS painting/keyboard/context are not tested. The existing six shell, sixteen control and forty-eight editor checks also pass (**70/70**).

A separate **local production preview** initially opened an older cached 0.1.2 shell. Its normal **Update Lumen now** flow activated this completed local build and showed 0.1.3 / Local preview with the offline shell Ready, without clearing storage. The opt-in link then opened the independent comparison document, rather than Lumen's cached index. Fresh A/B/C/theme links, return navigation and A-repeat reset worked. At desktop 390 × 844, A-repeat restores body/root height 0; B/C report 844, C is relative, and navigation stays at y=776–832. A typed temporary word was excluded from the report and cleared on case navigation. After returning, displayed counts stayed **450 notes, 2 journals, 3 projects, 9 tasks, 0 embedded images**, with the same last-save time. No backup/restore/reset/upload or form save was performed. Browser warning/error logs were empty. Temporary testing servers/tabs/viewport are cleaned up after verification.

Final local artifacts: entry **`assets/index-Bqvur_BM.js`**, stylesheet **`assets/index-imMINkYO.css`**, worker **`lumen-shell-2d1d6e0d2dba8298`**. The existing large-bundle build warning remains; no unrelated performance refactor is part of this phase. Screenshots in the local visualization workspace show the opt-in panel and dark C-case page, explicitly labelled browser mode. None of these local artifacts have been published, and the main phone layout has not been corrected yet. Next is phase 3's diagnostic-only release followed by physical A/B/C evidence, not selecting a production fix from desktop geometry.

## Step 3 — Publish a diagnostic-only release and test on the phone

- [ ] Once authorized, give the diagnostic release a distinct app version/build and publish through the existing Pages workflow. The main app's layout remains unchanged.
- [ ] Verify deployment, complete shell assets, normal update activation and unchanged record counts using a separate desktop tab without saving forms or resetting data.
- [ ] The user opens the existing iPhone Home Screen app, uses its normal update action, confirms the diagnostic release, and enters the comparison from Data & backup. The diagnostic must report standalone mode; a page that opens in Safari does not count as the installed-app comparison.
- [ ] Request one screenshot and copied report per case A/B/C with the keyboard closed. Compare visible markers and lower control edges beyond the former cutoff, in light and dark modes. Do not accept a taller rectangle alone.
- [ ] For a promising case, check portrait/landscape, reopen/background-resume, a scroll gesture and keyboard open/dismiss. Confirm no uncontrolled document scrolling, navigation drift, unreachable actions or stale keyboard offset. Repeat the current baseline to detect state-dependent recovery.

Gate: stop for these phone results before changing the production shell. The agent can perform desktop checks, but cannot substitute them for the user's physical iOS test.

### Phase 3 release preparation

Version **0.1.4** identifies this diagnostic-only release; its build ID will be the published source commit. The release includes the independent comparison, expanded read-only box report, save-guarded opt-in link, exact offline route and their tests. No layout correction, storage migration, install identity change, added personal records or image upload is included. The existing Pages workflow builds and runs the same eight automated test groups before publishing `dist`; fixtures, screenshots, backups and device data are not deployed.

Release preflight (2026-10-02): version 0.1.4 passes the production build and all **75** automated tests. Local preview entry is `assets/index-Cf66Qgi7.js`, stylesheet remains `assets/index-imMINkYO.css`, and shell is `lumen-shell-ca494af72551bb4b` with eleven static assets. These local-preview hashes are not the final GitHub commit/build identity. Remote main was verified at the physical-baseline commit `82185d6050ca526473dc5ef6e92158d9be26b57f` before publishing. The only change to ordinary app CSS remains the diagnostic link's underline; the main frame, navigation, install metadata and persistence code are unchanged.

Phone handoff after deployment verification: open the existing Home Screen Lumen online, use **Data & backup → Check for updates → Update Lumen now** if offered, and confirm **0.1.4** and the matching build. Under **Screen layout**, choose **Open layout comparison**. Its mode must say **Home Screen / standalone**, not Browser tab. With the keyboard closed, compare A first, then B and C, and A again. For each case, save a screenshot including the bottom navigation/colored bands and use **Check layout → Copy report** (or Select report text). Include which buttons/bands are clipped; a taller box alone is not acceptance. Light/dark, rotation, cold reopening/resume and keyboard tests follow for any promising candidate. Do not clear website data, reset demo data, remove/reinstall the icon, or change metadata to perform the comparison.

## Step 4 — Select the supported correction

- [ ] If B fixes physical painting and remains stable, apply only its document/root sizing change to the deployed standalone layout. Keep the existing fixed app, navigation and page spacing.
- [ ] If B fails but C passes, use the tested normal-flow shell and audit every app-owned absolute layer against it. Preserve inner phone/page height, navigation coordinates, scroll containment and editor overlays.
- [ ] If the minimal A case does not reproduce clipping, investigate the differences from Lumen before selecting a remedy: ancestor overflow, animation/compositing layers, startup/resume state and installed navigation context. A/B/C results without a reproducing baseline are not enough to choose a fix.
- [ ] If all minimal cases reproduce clipping, test overflow separately and then investigate native viewport/status-bar behavior. Any alternate status-bar metadata comparison must use a separately approved disposable test installation, never delete or overwrite the user's Lumen install. Record design tradeoffs and obtain agreement before adopting a metadata change.
- [ ] If a platform drawing limit remains after those tests, explain the measured limit and propose a safe visible-area layout with matching background continuity. Treat that as a disclosed fallback, not proof that the strip was removed. Do not promise CSS can eliminate OS-owned UI.

Gate: choose the smallest candidate supported by physical evidence; otherwise continue investigation without shipping another speculative production layout.

## Step 5 — Integrate, verify and publish the chosen fix

- [ ] Apply the selected correction only to the intended deployed/installed context. Keep normal Safari/browser behavior and the desktop handset preview intact.
- [ ] Audit welcome, Home, Brain, Projects, Health, People, Focus, journal/inspiration, Data & backup, + menu, quick capture, shared sheets, category overlays and image viewer. Check reachable bottom actions, final-row clearance, keyboard dismissal, rotation/resume, pinch zoom and zero horizontal overflow.
- [ ] Run the production build and existing automated groups (currently 55 tests), plus new document/diagnostic tests and the 70 existing rendered height/control/editor checks. Update assertions only to reflect the physically supported behavior; do not merely redefine passing geometry.
- [ ] Once authorized, publish a separately identified fix release. Verify HTML, CSS/JS, release metadata and worker agree, the normal update flow works, record counts are unchanged and offline opening still works. No data schema/save changes are part of this release.
- [ ] Keep a small reversible layout diff. If regression occurs, publish a scoped code revert through the same explicit update flow; never clear records or reset storage as rollback.

Gate: implementation/release checks pass, but the strip remains labelled pending until step 6's actual phone acceptance.

## Step 6 — Accept the fix on the actual iPhone

- [ ] Confirm the new version/build in the existing installed app and capture fresh Home, dark Brain/Health and welcome screenshots.
- [ ] Require full intended background/art coverage, no horizontal cutoff through content or navigation, and usable navigation/+ with the home indicator's safe clearance. The native indicator remains visible as expected.
- [ ] Confirm internal scrolling and + menu, cold launch/resume, portrait/landscape, keyboard open/dismiss and offline reopening. View existing records without deleting or resetting them.
- [ ] Record the final geometry and physical evidence in the baseline/plan. Do not require clientHeight/VisualViewport to become 844 if actual painting and interaction are correct; those readings can differ from CSS box sizes.
- [ ] Only then mark the bottom-strip issue resolved. Keep the diagnostic opt-in or remove it in a later cleanup release; do not change the accepted build during the user's final check.

Execution order: **local reproducer → local validation → diagnostic release → physical comparison checkpoint → supported app correction → regression/fix release → physical acceptance**. Phases 1–2 are complete locally; phase 3 publication and later phases/physical acceptance remain unchecked.
