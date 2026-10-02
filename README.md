# Lumen

Lumen is a personal productivity app built with React, TypeScript, and Vite.

## Run locally

```sh
pnpm install
pnpm dev
```

Create a production build with `pnpm build`.

## Home Screen icon

The current icon is a sculptural amber/champagne glass loop on dark brown. The original raster master is `assets/brand/lumen-icon-v2-source.png`; its generation brief is recorded in `assets/brand/README.md`. Opaque square sRGB PNG exports are checked in at 32, 180, 192 and 512 pixels. The HTML uses the 180-pixel PNG for [Apple's Home Screen metadata](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html), the 32-pixel PNG for browser favicons, and the manifest uses the larger PNGs. `apple-touch-icon.png` is an exact 180-pixel fallback copy. Corners are not baked into the files; the visible glass stays within the central maskable safe circle. The large master is not deployed or precached.

Regenerate the exports with `pnpm icons:generate` using an installed Sharp module, or `node scripts/generate-icons.mjs "<absolute path to the sharp module>"`. Sharp is an optional authoring tool, not an app or CI dependency: normal builds copy the checked-in PNGs. The exporter only downsamples/encodes the original artwork; creative changes belong in a new source revision. Increment filenames, HTML, manifest, preview and icon tests together for a later revision. Run `pnpm build` and `pnpm test:icons` to validate dimensions, opacity, warm palette, safe padding, `/lumen/` URLs, identity and offline inclusion.

Install metadata is deliberately PNG-only: [WebKit 256429](https://bugs.webkit.org/show_bug.cgi?id=256429) reports that mixed PNG/SVG manifest icons can fall back to the system letter icon on iOS. This is a relevant compatibility hypothesis, not proof of the user's exact device cause. Old SVG/v1 files remain available for existing cached releases but are no longer advertised. No app ID, start URL, scope, display mode or storage schema changes.

Data & backup shows the artwork supplied by the running release. On the actual iPhone, open the normal site in Safari, refresh it, and inspect Share → Add to Home Screen; cancel the sheet without adding anything to test icon discovery safely. Existing installed icons may retain the older image. A new installation is not a storage-preserving icon refresh: [WebKit's iOS 17.2 notes](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/) explain that non-cookie local data is not copied to a new Home Screen app. Never clear website data or delete/reinstall Lumen to troubleshoot this. If a replacement install is necessary, first export and verify a backup from the existing installed app, copy it off the phone, and plan an explicit restore. Native icon discovery/update behavior remains an actual-device check, not a desktop test claim.

## Welcome screen

The amber-glass welcome reuses the exact approved 512px icon artwork, with CSS fading only its empty outer margins into the dark-brown background. `src/welcome.css` scopes the serif/system-font typography, glass entry button, finite entrance motion, reduced-motion fallback and portrait/landscape layouts to this screen. Enter Lumen remains the single real button leading straight to Home; no sign-in, storage, installation identity or accepted full-height iPhone rules change. The existing offline shell already includes the image. Run `pnpm test:welcome` after building to check the actual component, palette contrast, offline asset, motion and layout contracts. Responsive browser previews do not replace the installed-iPhone safe-area and bottom-painting check.

## GitHub Pages

### App version and update checks

**Data & backup → App & updates** shows the version of the code currently open on this device and a seven-character build ID from the GitHub source commit. Local production previews explicitly show **Local preview** instead of a published build ID. Version numbers come from `package.json`; increment that version for user-facing releases. GitHub supplies `GITHUB_SHA` automatically, so each published build remains identifiable even when its version number is unchanged. The same identity is included in the page metadata and `release.json`, both part of the complete offline shell. A network response never overwrites the running app's displayed identity.

**Check for updates** is always visible. It reports checking, downloading, no newer update found, a ready update, no connection, or a failed check; failed checks do not claim success. **Update Lumen now** appears only when a complete new shell is waiting, or when another tab activated a new shell and this page needs a user-initiated reload. It remains disabled until the current changes are saved. No update action clears, resets, or replaces user records. If an older app does not yet have this panel, let it check online and use its existing update button when offered; do not remove the installed app or clear website data to obtain the panel.

Local checks include `pnpm test:updates`, covering update observation, offline launch, failure/retry, overlapping requests, cross-tab activation, disposal, and release identity. The Pages workflow runs this check before publication.

Pushing to `main` runs the workflow in `.github/workflows/deploy-pages.yml`, which builds the app and publishes it to GitHub Pages.

On iPhone, open the published site in Safari and use **Share → Add to Home Screen** for an app-like full-screen launch.

The welcome page enters the app only through **Enter Lumen**. The installed build uses the full visible viewport, iPhone safe-area insets, and scrollable forms so the keyboard should not hide their controls. Desktop's phone frame is a preview, not a substitute for checking the installed app.

The app stores records and full-size uploaded photos in this device's IndexedDB, with a visible save status. Existing local-storage data is copied and verified on first launch; the old record is not deleted. There is no sign-in or cloud sync, so data does not automatically transfer between devices or browsers. A verified backup copied off the phone remains essential once you have personal data; browser storage can be lost or cleared.

## Back up and restore your data

In the installed iPhone app, enter Lumen and tap **Data & backup** at the top of Home. Choose **Save or share backup** and save the JSON file to Files, or use **Download backup file** if sharing is unavailable. Confirm the file appears in Files and keep another copy outside the phone (for example, on your Mac). The file contains your notes, projects, journal, and full uploaded image data. It is **not encrypted**, so store it privately.

To verify the file without changing anything, return to **Data & backup**, tap **Choose backup file**, and select it. Lumen checks the file's integrity and shows record counts. Selecting a file alone never restores it. A restore requires both **Replace this device's data** and confirmation that you have saved a separate copy of the current data; then tap **Replace with this backup**. Restoring replaces, rather than merges, the data currently on that device.

This is a recovery file, not automatic sync. The app cannot confirm that the iPhone actually saved or copied it; check the file yourself before relying on it. Do not clear Safari/Home Screen app data before you have a tested backup.

### Practice a restore without risking your phone data

1. In the installed app, create a recognizable test note, journal entry, project, and uploaded photo. Wait until **Data & backup → Last successful local save** updates.
2. Export a backup and confirm the JSON file exists in Files. Copy it to your Mac or another place outside the phone.
3. Back in **Data & backup**, choose that exact file under **Use an existing copy**. Check that Lumen says **Integrity check passed** and that the counts look right. This does not replace anything.
4. On a separate clean browser/profile or device, open Lumen, choose the same file, select **Replace this device's data**, confirm a separate copy of the clean profile's current data, then restore. Open the test note, journal, project, and full-size photo there. Do not clear or restore over your original phone app just to practice.

**Last successful local save** means IndexedDB accepted a write on this device; it is not a backup. **Last verified export file** appears only after you reselect a backup file and it passes validation. Lumen cannot verify that the file was copied off your phone. Downloading or opening the iOS share sheet alone never marks a backup verified.

## Offline use and releases

After one complete online visit to the published app, Lumen caches the app shell and bundled assets for offline launch. Notes, tasks, journals, workouts, and uploaded photos remain in local IndexedDB and can be edited offline while device storage is available. A storage failure is shown as **Changes not saved** with a Retry action; do not clear app data when you see it. Backup sharing and external links may need connectivity or another app.

New releases download as a complete shell. The current app stays on its existing version until a later launch or you choose **Update Lumen now** in **Data & backup** after all changes are saved. Updating the interface does not delete IndexedDB records. Do not clear website data to force an update. On the iPhone, verify Airplane Mode launch, a new note, task completion, photo attachment, and close/reopen before relying on offline use.

## Storage migration checks

The app copies the old local-storage record into IndexedDB, verifies record and image integrity, then activates the new store. It does not delete the old record. On the actual installed iPhone app, confirm that existing content and photos open, a newly created note and photo survive closing and reopening the app, and an exported backup passes its integrity check. Once you start adding personal data, keep a verified backup off the phone.

Local checks: `pnpm build`, then `pnpm test:storage`, `pnpm test:backup`, `pnpm test:daily`, `pnpm test:brain`, `pnpm test:viewport`, `pnpm test:icons`, and `pnpm test:offline`. The Pages workflow runs these checks before publishing. They do not replace the iPhone checks.

## iPhone layout acceptance (when ready to test)

The locally implemented shell-height correction uses `100lvh` with a `100vh` fallback only in Home Screen/standalone mode. Browser tabs retain `100dvh`, and keyboard adjustments remain editor-only. The installed iPhone's actual bottom-edge painting still needs verification; a full-height DOM rectangle alone does not establish that the strip is fixed. Progress and measurements are recorded in `IPHONE_POLISH_PLAN.md` and `IPHONE_LAYOUT_BASELINE.md`.

For the isolated CSS regression check, run `pnpm dev`, open `/tests/fixtures/mobile-shell.html` at the local URL it prints, and click **Run height regressions**. The fixture renders the actual mobile stylesheet with simulated viewport values and display mode, including the reported 797/844 mismatch. It accesses no Lumen data, registers no worker, and is not shipped in the production build. It is not a native iOS or keyboard test.

The companion `/tests/fixtures/mobile-controls.html` checks the actual People and navigation components in isolated frames with simulated viewport/safe-area values. Click **Run control regressions** to verify full-height anchoring, landscape scroll stability and content clearance. People's return button belongs to a full-height layer outside its internal scroller, rather than the native viewport. This fixture also accesses no app data or worker and is excluded from production builds.

For editor recovery, open `/tests/fixtures/mobile-editors.html` and click **Run editor regressions**. It checks the actual app-overlay component, mobile styles and viewport observer with fixture-only forms and simulated VisualViewport events. It verifies full-height category coverage, editor-only keyboard panning, action reachability, safe-area spacing, zoom, dismissal and suspend/resume without accessing app data. Like the other fixtures, it is excluded from production and does not replace native iPhone keyboard/painting checks. The observer lifecycle tests also run in `pnpm test:viewport`.

For the unresolved bottom-strip report, open **Data & backup → Screen layout → Check screen layout** in the installed iPhone app, then **Copy layout report** and paste it into the development chat. The snapshot compares the actual wrapper, fixed bounds, viewport units, visual viewport, safe areas, and document sizes. It includes the running release and the iOS version reported by Safari (which can be reduced or unavailable, so confirm it in Settings if necessary). It reads no app records, writes no saved data, runs only when requested, and sends nothing automatically. If copying is unavailable, select the text or send a screenshot of the report. Do not clear website data or delete the installed app to troubleshoot the strip.

Open Home, Brain, Projects (including a project), Health, Journal, Inspiration, People, and Focus in the installed Home Screen app. Check the four-tab navigation, + menu, welcome button, and each editing sheet. With the keyboard open, confirm the active field and Save/Close controls remain reachable; then rotate the phone and try larger text and Reduce Motion. Check Safari separately, since its browser chrome changes the visible height. Report any cropped screen or hard-to-tap control with a screenshot; `IMPLEMENTATION_PLAN.md` keeps these device checks open until then.

Brain's constellation draws one dot per stored note on a canvas. Tapping a dot opens that note; dragging it moves the dot without saving a note change. **All notes** is the text-based alternative. The legacy sample constellation notes remain in storage, searchable and available behind **Show sample graph notes**, while ordinary notes appear first. Large lists load 40 cards at a time. Local graph checks: `pnpm test:brain`. Real iPhone smoothness still needs a device check.

## Daily tasks and workouts

Home uses the phone's local calendar day. Tap **Add task** in the task header to choose a one-off due date (or leave it unscheduled), **Every day**, or **Weekdays**. Today's percentage counts scheduled tasks for that day only. Overdue one-off tasks and unscheduled tasks have separate lists; a task completed today can be undone there. Yesterday's completed tasks remain visible as history. Old tasks without a due date remain unscheduled; old boolean-only completions remain complete but are not assigned an invented completion date.

Health opens on the current day. Select a day and build its exercise plan, then **Start daily exercise**; set counts and the session's start/completion timestamps are stored with that date. Leaving the workout preserves progress, and the selected day's button becomes **Resume exercise**. Rest days cannot start a workout. Once a workout has started, its plan is locked so recorded sets cannot be detached from their exercises. The old August 2026 demo plans and journal records remain historical rather than being moved to the current day. Local date/session checks: `pnpm test:daily`, `pnpm test:storage`, and `pnpm build`.
