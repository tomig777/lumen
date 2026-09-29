# Lumen

Lumen is a personal productivity app built with React, TypeScript, and Vite.

## Run locally

```sh
pnpm install
pnpm dev
```

Create a production build with `pnpm build`.

## GitHub Pages

Pushing to `main` runs the workflow in `.github/workflows/deploy-pages.yml`, which builds the app and publishes it to GitHub Pages.

On iPhone, open the published site in Safari and use **Share → Add to Home Screen** for an app-like full-screen launch.

The published app currently stores its content in this browser's local storage. The unpublished `codex/indexeddb-storage` branch moves records and full-size photos to IndexedDB with a visible save status. Neither version has sign-in or cloud sync, so data does not automatically transfer between devices or browsers. Even after the IndexedDB migration, a verified backup copied off the phone remains essential; browser storage can be lost or cleared.

## Back up and restore your data

In the installed iPhone app, enter Lumen and tap **Data & backup** at the top of Home. Choose **Save or share backup** and save the JSON file to Files, or use **Download backup file** if sharing is unavailable. Confirm the file appears in Files and keep another copy outside the phone (for example, on your Mac). The file contains your notes, projects, journal, and full uploaded image data. It is **not encrypted**, so store it privately.

To verify the file without changing anything, return to **Data & backup**, tap **Choose backup file**, and select it. Lumen checks the file's integrity and shows record counts. Selecting a file alone never restores it. A restore requires both **Replace this device's data** and confirmation that you have saved a separate copy of the current data; then tap **Replace with this backup**. Restoring replaces, rather than merges, the data currently on that device.

This is a recovery file, not automatic sync. The app cannot confirm that the iPhone actually saved or copied it; check the file yourself before relying on it. Do not clear Safari/Home Screen app data before you have a tested backup.

## Storage migration release check

Before publishing `codex/indexeddb-storage`, save a backup from the **currently published iPhone app**. Select the saved file again in **Data & backup** and confirm Lumen accepts it and shows the expected note, project, journal, and image counts. Copy that file to your Mac or another off-phone location. The new app copies the old local-storage record into IndexedDB, verifies record and image integrity, then activates the new store. It does not delete the old record. On the actual installed iPhone app, confirm that existing content and photos open, a newly created note and photo survive closing and reopening the app, the save indicator reports failures honestly, and another exported backup passes its integrity check. Keep both off-phone archives.

Local checks: `npm run test:storage`, `npm run test:backup`, and `npm run build`. These do not replace the iPhone checks.
