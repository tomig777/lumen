# Lumen

Lumen is a personal productivity app built with React, TypeScript, and Vite.

## Run locally

```sh
pnpm install
pnpm dev
```

Create a production build with `pnpm build`.

## Home Screen icon

The editable logo is `public/lumen-icon.svg`: a cream L with a warm point of light on the app's dark brown. Opaque, square PNG exports are checked in at 180, 192, and 512 pixels. The HTML uses the 180-pixel PNG for [Apple's Home Screen icon metadata](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html); the manifest uses the larger PNGs. The mark fits inside the central 80%-diameter maskable safe circle. Corners are not baked into the artwork.

After editing the SVG, regenerate the exports with `pnpm icons:generate` using an installed Sharp module, or `pnpm icons:generate "<absolute path to the sharp module>"`. Sharp is an optional authoring tool, not an app or CI dependency: normal builds copy the checked-in PNGs. For a later logo revision, increment the filename version in the exporter, HTML, manifest, and icon tests together. Run `pnpm build` then `pnpm test:icons` to validate the exported dimensions, opacity, palette, safe padding, relative `/lumen/` URLs, and offline inclusion.

Safari's Add to Home Screen preview and the installed icon still need an actual iPhone check after publication. Existing installed icons may keep an older image; do not clear website data or delete the installed app as an icon-refresh troubleshooting step.

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

Open Home, Brain, Projects (including a project), Health, Journal, Inspiration, People, and Focus in the installed Home Screen app. Check the four-tab navigation, + menu, welcome button, and each editing sheet. With the keyboard open, confirm the active field and Save/Close controls remain reachable; then rotate the phone and try larger text and Reduce Motion. Check Safari separately, since its browser chrome changes the visible height. Report any cropped screen or hard-to-tap control with a screenshot; `IMPLEMENTATION_PLAN.md` keeps these device checks open until then.

Brain's constellation draws one dot per stored note on a canvas. Tapping a dot opens that note; dragging it moves the dot without saving a note change. **All notes** is the text-based alternative. The legacy sample constellation notes remain in storage, searchable and available behind **Show sample graph notes**, while ordinary notes appear first. Large lists load 40 cards at a time. Local graph checks: `pnpm test:brain`. Real iPhone smoothness still needs a device check.

## Daily tasks and workouts

Home uses the phone's local calendar day. Tap **Add task** in the task header to choose a one-off due date (or leave it unscheduled), **Every day**, or **Weekdays**. Today's percentage counts scheduled tasks for that day only. Overdue one-off tasks and unscheduled tasks have separate lists; a task completed today can be undone there. Yesterday's completed tasks remain visible as history. Old tasks without a due date remain unscheduled; old boolean-only completions remain complete but are not assigned an invented completion date.

Health opens on the current day. Select a day and build its exercise plan, then **Start daily exercise**; set counts and the session's start/completion timestamps are stored with that date. Leaving the workout preserves progress, and the selected day's button becomes **Resume exercise**. Rest days cannot start a workout. Once a workout has started, its plan is locked so recorded sets cannot be detached from their exercises. The old August 2026 demo plans and journal records remain historical rather than being moved to the current day. Local date/session checks: `pnpm test:daily`, `pnpm test:storage`, and `pnpm build`.
