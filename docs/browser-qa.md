# Hosted preview acceptance checklist

Status: pending. Do not describe VM or Canvas-only checks as browser verification.

- Open the published URL, verify `build.json` matches the expected commit.
- Check network requests, JavaScript console, font and image loading.
- Inspect 320 px, 390 px, 768 px and desktop-width layouts, plus the 853 × 1844 design frame.
- Verify navigation, shop/planting, farm plot selection, harvesting, camera drag and zoom.
- Verify expansion preview, cancel, confirm, and repeated confirmation without duplicate charges.
- Verify dialogs, close/back navigation, focus visibility and keyboard controls.
- Export a save, reload, import with preview/cancel/confirm, and verify persistence.
- Check delayed file reads and changed navigation do not overwrite a newer panel or save.
- Check reduced-motion and background/resume behavior.
- Capture screenshots matching the reference frame and compare major composition regions.

New hosting origins do not automatically inherit an offline file's localStorage. Use export/import for save migration.
