# Welcome · amber glass

Scope: replace the welcome screen only with the approved icon identity. Keep
Home/Brain/Projects/Health, navigation, records, installation identity and the
physically accepted full-height iPhone fix unchanged. The user also confirmed
the 0.1.6 Home Screen icon works and approved its artwork before this work.

1. Composition and palette: dark `#24211e`, cream `#e8d9c7`, sand `#c6ab8d`;
   small welcome kicker, serif wordmark, centered glass loop, subtitle, one CTA.
2. Artwork: reuse the exact 512px opaque icon. CSS masks empty outer margins;
   no regeneration, recoloring, new Home Screen icon or large runtime renderer.
3. Type and glass: local serif/system sans fallback, smoked glass CTA with
   champagne edge reflections, readable text, press and focus states.
4. Motion: finite opacity/transform entrance, reduced-motion support, no delay
   or disabled state preventing immediate entry.
5. Verify: build and storage/update/layout/icon regressions; component/palette
   tests; portrait, narrow, short and landscape browser rendering; keyboard
   entry; loaded/offline-cached image and unchanged Home appearance. Browser
   dimensions do not prove native iPhone bottom painting.
6. Publish: existing GitHub Pages flow, versioned release, normal in-app update
   check with unchanged browser record counts. Physical iPhone check follows.

Implementation is in `WelcomeScreen`, `src/welcome.css` and welcome-only theme
rules. The accepted `100lvh` ancestor/app heights, safe-area navigation offsets,
manifest/Apple status-bar metadata and storage code must not change. The later
startup refinement below adds only temporary first-paint colour hints.

## Single glass surface · 0.1.10

- The user's iPhone confirms the native status icons now appear white, but a
  second lower button edge remains. Isolated browser comparisons of the actual
  0.1.9 build (both layers, WebGL-only, CSS-only) show that disabling its CSS
  backing removes the extra rim. The existing lens was also 1.5 CSS pixels
  smaller than the HTML capsule. This is evidence for duplicated painting, not
  proof of an iOS/WebKit defect or physical-phone acceptance of this fix.
- Keep the real HTML button transparent. Put the complete CSS fallback on one
  pseudo-element and stop painting it only once the current canvas is ready.
  Preserve the exact approved top-centre glint and label above either surface.
  No crossfade briefly combines both surfaces. Remove backdrop blur, reset
  native button appearance, and use only the HTML button's rounded clipping.
- Match the procedural capsule to its canvas without an inset. Keep capped
  DPR, demand-only rendering, two transmission samples, lazy loading and GPU
  disposal unchanged; no new dependency, renderer, animation loop or asset.
- A canvas session owns its readiness. Reduce Motion remounts wait for a new
  first frame; late callbacks from a disposed/failed canvas cannot hide the
  fallback. Entry stays enabled while loading or after a renderer failure.
- Do not change layout, artwork, palette, launch/status metadata, installed
  full-height rules, storage, installation identity or update mechanics.

Preflight: production build and all 102 tests passed. The real production UI
was checked at 390 × 844, 320 × 568 and 844 × 390: canvas/button boxes match,
the loaded glass has no painted CSS backing, blur or outer shadow, label centre
error is under 0.01px, and no horizontal overflow appears. A new-origin probe
that denies the actual renderer chunk verifies the visible CSS fallback and
keyboard entry. Leaving welcome disposes the canvas and restores light Home.
The local normal update from cached 0.1.6 to 0.1.10 preserves 450 notes, 2 journal
entries, 3 projects, 9 tasks, 0 embedded images and the last local save time.
No browser/device storage was cleared. The user's physical iPhone edge check
remains the final acceptance step after publication.

## Welcome shine and launch contrast · 0.1.9

- Keep the approved capsule, artwork, type, label alignment and subtle float.
  Remove the external resting/hover drop shadow, which can look like an extra
  lower edge. Do not attempt to hide iOS's system Home indicator.
- Add a static, top-centre champagne glint and a restrained amber bloom above
  either the WebGL renderer or CSS fallback, below the real label. Both remain
  clipped to the capsule: no full outline, new canvas, extra frame loop, or
  shadow/glow below the button. Preserve the keyboard-only focus ring.
- Paint the document dark immediately with a guarded inline colour-only style
  and `color-scheme` support hint. Keep data loading/error/retry colours dark.
  Release the guard in a layout effect once the real screen is committed, so
  the existing light Home / dark Brain and Health rules remain authoritative.
  Keep `black-translucent`, viewport metadata, installation identity, accepted
  full-height document rules, storage and service-worker update mechanics intact.
- Native iOS status icons are OS-owned. This removes a confirmed light startup
  surface; it does not prove white native icons or reliable per-page native
  inversion on iOS 17.3. Physical cold-launch/reopen, Light/Dark appearance and
  light Home / dark welcome acceptance are still required. No deletion of the
  existing Home Screen installation or browser data is part of this change.

0.1.9 preflight: production build and all 97 tests passed. Browser checks covered
390 × 844, 320 × 568 and 844 × 390, with no horizontal overflow, no outer button
shadow, a 0px border and under 0.01px label-centre error. Keyboard entry unmounts
the welcome canvas and restores the light Home surface; Brain/Health remain dark.
A separate no-app-script probe, using the actual built CSS on an uncached local
address, confirmed a dark document/body and dark colour scheme before React.
No storage was cleared. Desktop checks do not verify native iPhone status icons.

## Welcome refinements · 0.1.8

- Reuse the approved icon with a 3px / 6-second float on a separate layer from
  the finite entrance. Pause while hidden and respect Reduce Motion.
- Remove only the welcome CTA arrow. Centre the DOM label independently of its
  decoration. No resting/hover border or inset stroke; keyboard focus stays clear.
- Adapt the supplied React Bits FluidGlass scene/FBO/transmission technique into
  a button-sized procedural glass capsule. No remote GLB, demo photos, fonts,
  scrolling or navigation. Preserve the upstream notice in the offline shell.
- Pin Fiber 8 / Drei 9 to keep React 18 unchanged. Load the renderer in a separate
  chunk, cap DPR at 1.5 and buffer width at 384, use two refraction samples and
  demand-only rendering. Hidden pages stop rendering; leaving unmounts the scene.
- A real, immediately enabled HTML button and borderless CSS glass remain usable
  before loading, under Reduce Motion, and after chunk/context failures.
- Test loading, visibility, motion preferences, failures and disposal in the
  actual wrapper, plus the unchanged installed-height/storage/update regressions.
  Physical iPhone GPU smoothness and glass appearance still require acceptance;
  desktop browser rendering is not proof of iPhone performance.

0.1.8 preflight: build and all 92 tests passed. Production dependency audit
reported no known vulnerabilities. Local production UI checks covered 390 × 844,
320 × 568 and 844 × 390; button centre offset was under 0.01px, with a 0px border
and no arrow. Keyboard focus remains visible; Return opens Home, unmounts the
canvas and restores the light page surface. No warning/error logs were observed.
The local preview's 450 notes, 2 journal entries, 3 projects, 9 tasks and 0 images
remained unchanged through normal service-worker updates; no storage was cleared.

## Local preflight

The initial 85-test regression run passed, and the six welcome checks passed
again after the final bounded-hero sizing refinement. Production-preview
checks covered 390 × 844, 390 × 797, 320 × 568 and 844 × 390. The final landscape
artwork stays within its grid area; keyboard Tab exposes the cream focus ring
and Return opens Home, restoring the original light surface. No warning/error
logs were observed. No records were edited during these UI checks.

The pre-update live browser baseline was 0.1.6 / edec018 with 450 notes, 2 journal
entries, 3 projects, 9 tasks and 0 embedded images; last local save was not yet
recorded. Publication must be checked through the existing update UI, not by
clearing storage. The user's physical iPhone welcome acceptance remains open.
