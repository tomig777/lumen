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

The app stores records and full-size uploaded photos in this device's IndexedDB, with a visible save status. Existing local-storage data is copied and verified on first launch; the old record is not deleted. There is no sign-in or cloud sync, so data does not automatically transfer between devices or browsers. A verified backup copied off the phone remains essential once you have personal data; browser storage can be lost or cleared.

## Back up and restore your data

In the installed iPhone app, enter Lumen and tap **Data & backup** at the top of Home. Choose **Save or share backup** and save the JSON file to Files, or use **Download backup file** if sharing is unavailable. Confirm the file appears in Files and keep another copy outside the phone (for example, on your Mac). The file contains your notes, projects, journal, and full uploaded image data. It is **not encrypted**, so store it privately.

To verify the file without changing anything, return to **Data & backup**, tap **Choose backup file**, and select it. Lumen checks the file's integrity and shows record counts. Selecting a file alone never restores it. A restore requires both **Replace this device's data** and confirmation that you have saved a separate copy of the current data; then tap **Replace with this backup**. Restoring replaces, rather than merges, the data currently on that device.

This is a recovery file, not automatic sync. The app cannot confirm that the iPhone actually saved or copied it; check the file yourself before relying on it. Do not clear Safari/Home Screen app data before you have a tested backup.

## Storage migration checks

The app copies the old local-storage record into IndexedDB, verifies record and image integrity, then activates the new store. It does not delete the old record. On the actual installed iPhone app, confirm that existing content and photos open, a newly created note and photo survive closing and reopening the app, and an exported backup passes its integrity check. Once you start adding personal data, keep a verified backup off the phone.

Local checks: `npm run test:storage`, `npm run test:backup`, and `npm run build`. These do not replace the iPhone checks.
