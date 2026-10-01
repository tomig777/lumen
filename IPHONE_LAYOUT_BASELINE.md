# iPhone layout baseline: bottom gap

Step 1 result: provisional diagnosis recorded from the supplied screenshots, source inspection, and production-browser measurements. Direct iPhone viewport measurements are still unavailable. The baseline below records the original release before runtime changes; step 2's subsequent local implementation is documented separately at the end.

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

## Technical references

- [MDN: VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) explains why the visible viewport can change independently when the on-screen keyboard or zoom changes.
- [WebKit issue 236445](https://bugs.webkit.org/show_bug.cgi?id=236445#c9) includes a report of Home Screen positioning discrepancies with `black-translucent` and `viewport-fit=cover`. This is evidence of a relevant class of WebKit behavior, not proof that this particular report explains the user's current iOS version.
- [WebKit: full-screen layout and safe areas](https://webkit.org/blog/7929/designing-websites-for-iphone-x/) describes keeping background coverage and interactive safe-area spacing coordinated.

## Step 2: local implementation and verification

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
