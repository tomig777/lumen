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
manifest/status-bar metadata and storage code must not change.

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
