# Lumen design foundation · amber glass

Status: Phase 1 design contract, 2026-10-02. Runtime implementation starts in
Phase 2. This document does not change the app, its records, or its deployment.
Baseline: 0.1.11 / de5bd2b; the user approved the welcome artwork and button finish.

## Scope and visual hierarchy

One global Dark / Light choice, with Dark as the first-use default. Apply it to
every Lumen-owned screen, including welcome, loading, editors, menus and errors.
Do not introduce an automatic System mode in this round. Home receives a layout
and material overhaul; other pages receive theme consistency, not new layouts.
Settings replaces the Health journal shortcut in the + menu. Health journal
records and their Health-page access remain intact.

The identity is warm brown, cream, sand and amber, not pure black/neon gold.
Use serif display typography, readable sans-serif utility text, restrained glass
controls, and quieter task/editor surfaces. Avoid making every card a reflective
object. Keep images, user-selected category accents and meaningful wellness
colors distinct from the neutral theme; never invert/filter the whole app.

## Semantic palette contract

The token names below are proposed runtime names, not existing CSS definitions.
Opaque surfaces establish dependable contrast beneath optional glass decoration.

| Token | Dark default | Light | Role |
| --- | --- | --- | --- |
| `--lumen-bg` | `#24211e` | `#f7f3ed` | Document, shell and page background |
| `--lumen-surface` | `#302b26` | `#eee6dc` | Quiet cards and readable glass base |
| `--lumen-surface-raised` | `#3b332b` | `#e3d6c5` | Sheets, menus and elevated panels |
| `--lumen-text` | `#e8d9c7` | `#24211e` | Headings, task titles and main copy |
| `--lumen-text-secondary` | `#c6ab8d` | `#65574b` | Supporting copy and inactive icons |
| `--lumen-text-muted` | `#b09a84` | `#6e5b49` | Metadata and placeholders; no extra opacity |
| `--lumen-accent` | `#d89c53` | `#85521f` | Readable amber links and emphasis |
| `--lumen-on-accent` | `#24211e` | `#f7f3ed` | Text on an opaque accent fill |
| `--lumen-control-edge` | `#9b836b` | `#8c7157` | Necessary input/control boundaries |
| `--lumen-line` | `rgba(232,217,199,.12)` | `rgba(75,56,40,.14)` | Decorative dividers, not required boundaries |
| `--lumen-focus` | `#e8d9c7` | `#85521f` | Keyboard-only focus ring |
| `--lumen-glint` | `#ffedd0` | `#ffffff` | Local decorative highlight, never body text |
| `--lumen-glow` | `rgba(216,156,83,.18)` | `rgba(216,156,83,.12)` | Restrained amber light spread |
| `--lumen-scrim` | `rgba(12,10,8,.64)` | `rgba(36,33,30,.36)` | Overlay behind modal surfaces |

Keep raw artwork/light amber `#d89c53` separate from the light-mode text accent.
The darker light-mode accent is deliberate: pale amber is not readable small
text on cream. Decorative lines need not meet control-boundary contrast; a
necessary boundary, focus indicator or state icon must use a stronger token.
Selected navigation must retain an explicit shape/state and `aria-current`,
not rely only on a color shift. Disabled controls retain readable labels.

### Contrast preflight

Computed sRGB relative-luminance ratios for the opaque candidate surfaces:

- Dark primary text: 11.58:1 on background; 8.96:1 on raised surface.
- Dark secondary text: at least 5.67:1 across all three neutral surfaces.
- Dark muted text: at least 4.60:1 across all three neutral surfaces.
- Light primary text: 14.49:1 on background; 11.20:1 on raised surface.
- Light secondary text: at least 4.87:1 across all three neutral surfaces.
- Light muted text: at least 4.51:1 across all three neutral surfaces.
- Accent text and text on accent fills: at least 4.5:1 for the specified pairings.

Implementation targets: ordinary text 4.5:1; necessary UI indicators/boundaries
3:1 against their adjacent surface. These calculations do NOT certify gradients,
transparent glass over changing content, hover/disabled states, or rendered
3D imagery. Test their actual composite backgrounds before accepting them.
Use a more opaque local surface if glass compromises label contrast.
Semantic error/success/warning colors need separate foreground/background pairs
and rendered checks in Phase 2; keep explicit wording/icons, not color alone.

## Typography, spacing and shape

- Display: `Georgia, 'Times New Roman', serif`, regular weight. Keep the approved
  welcome wordmark sizing; use a modest 28–36px display scale elsewhere, not a
  giant wordmark on every page. No new remote font/download dependency.
- Body/control: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.
  Start at 15–16px for task titles/body, 16px for editable fields, 13–14px for
  supporting copy, and 11–12px for short metadata/kickers. Avoid the current
  tiny 7–9px utility labels in redesigned components.
- Numerical progress: readable system type with tabular numerals. Keep its
  hierarchy and actual task-derived value; do not replace it with an expression.
- Body line height 1.45–1.6; display 1.05–1.15. Letter spacing about .12–.18em
  only for short uppercase kickers, not task titles or paragraphs.
- Spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48px. Use existing safe-area
  shell spacing rather than adding this scale to system insets a second time.
- Shape: pill actions; 20–24px cards; 24–28px panels/sheets; 12–16px fields.
- Minimum interactive hit area 44 × 44 CSS px. Support wrapping and larger text;
  never force a task title into a clipped fixed-height slot to match a mockup.

## Materials and interaction states

| Component | Material | Behavior and constraints |
| --- | --- | --- |
| Primary pill | Warm smoked glass | Centered DOM label; no arrow by default; no resting stroke or lower rim |
| Icon/back/edit action | Quiet glass or solid raised surface | Clear icon, 44px hit area, no heavy glow |
| Floating navigation | One shared glass surface | Four existing tabs, unmistakable selected state, separate + action |
| + action menu | Readable raised glass panel | Settings replaces first tile; preserve other actions and dismissal |
| Task/data card | Mostly opaque warm surface | Readability first; restrained divider/depth; not a glass lens |
| Field/editor | Opaque readable surface | Theme-aware placeholder, selected text, caret, validation and native controls |
| Error/restore action | Explicit semantic surface | Cannot look like an ordinary decorative amber action |

Glass uses a short top-center champagne glint and, on prominent primary actions,
a small static amber spread above the edge. Do not copy the glint onto every
list row. Never recreate the rejected wide reflection bar across the button face,
duplicate CSS/WebGL backings, or the apparent extra line below the capsule.
The current welcome control owns its existing tested renderer/fallback behavior.

Routine controls and navigation should use CSS materials, not individual WebGL
canvases. Start without backdrop blur; if needed, bound it to the navigation/menu
and verify scroll performance. Provide an opaque fallback. No full-page blur.
Decorative layers ignore pointer events; real HTML controls own activation.
Keyboard focus rings are allowed and required despite borderless resting glass.

Press feedback: small transform/tone change, roughly 120–180ms; theme changes
may transition colors briefly without animating full-page filters. Reduce Motion
removes nonessential movement. State changes stay understandable without motion.

## Home composition and character contract

Keep this order: save state → today's signal/progress → character → supporting
copy → real date and task controls → scheduled carousel → other task groups.
Remove only the Home backup shortcut, not local-save feedback or retry access.
Keep overdue, unscheduled, finished-today and yesterday meaning unchanged.

Capture the current circle's rendered diameter, center and stage bounds at each
test size before replacing it. Match those measurements, not the screenshot's
physical pixel dimensions. The existing `.liquid-bowl-stage` is 270 CSS px tall
with a 20px top margin; multiple legacy overrides affect the final circle.
Preserve responsive placement and navigation clearance; do not add a new fixed
page height or apply keyboard viewport sizing to the entire app.

Character: an original, actual 3D espresso/bronze sphere, soft amber rim light,
two cream rounded eyes attached to its curved face, and a restrained grounding
shadow. Keep the body mostly opaque/polished rather than expensive translucent
glass. No copied branding, mouth, limbs, chat, audio, touch response or task-driven
emotion in this round. Keep the numeric progress above it as the source of truth.
Use neutral supporting copy, e.g. “Your day, a little clearer.”, instead of the
old promise that completed tasks change the ball's color.

One bounded, lazy-loaded scene on visible Home; use the already installed
Three/Fiber libraries. Do not animate a second renderer in the aria-hidden
desktop mirror. Static appearance is approved before idle animation is added.
Provisional animation spec: short blinks roughly every 3–7 seconds, small glances
roughly every 5–12 seconds, smooth transitions and longer neutral pauses. Tune
on device; do not make the whole sphere bounce or run a permanent full-speed loop.
Pause off-screen, hidden/backgrounded and when obscured by a full overlay; honor
Reduce Motion, cancel timers/frames on exit, and provide a static failure fallback.
Start with capped DPR 1–1.5, low-cost geometry, no post-processing/large HDR assets,
and demand rendering while settled. These are budgets to test, not performance
claims. Loading/failure must never block tasks or navigation.

## Source audit and migration map

| Existing source/area | Current finding | Later implementation |
| --- | --- | --- |
| `src/main.tsx` | Loads styles → polish → mobile → welcome; global Reduce Motion config | Define token import order; keep shell geometry separate from color overrides |
| `src/polish.css` | Light root tokens, many hardcoded colors; Brain/Health nav inversions | Replace with theme roles; remove color-only per-page overrides without deleting layout rules |
| `src/styles.css` | Layered legacy page styles and aliases; original Home liquid circle | Audit actual rendered selectors; replace Home visuals in Phase 5, not blind global rewriting |
| `src/mobile.css` | Visible-page `:has()` chooses theme; editors/category layers force light | One global theme drives surface/color-scheme; preserve all accepted height/inset/keyboard rules |
| `src/welcome.css` | Approved palette, serif wordmark, opaque icon with faded margins, capsule glint/glow | Adopt tokens in Phase 2; test light artwork blending; preserve accepted dark finish |
| `index.html`, `useLaunchTheme` | Dark prepaint guard removed once device data is ready | Resolve saved choice before paint, retain dark fallback if preference cannot be read |
| `src/App.tsx` | Owns routes, Home, backup panels and quick actions; backup back goes Home | Add Settings/back context in Phase 3; remove Home shortcut only after replacement works |
| `VisualComponents.tsx` | Nav active bubble and icon colors; health-journal glyph union; graph canvas | Theme shared nav in Phase 4; add Settings glyph; preserve graph meaning/performance |
| `PeopleScreen.tsx`, `AppOverlay.tsx`, `StoredImage.tsx` | Separate portrait/viewer and overlay/media components | Include in theme coverage; do not recolor portraits or uploaded images |
| `WelcomeGlass.tsx`, `FluidGlassButton.tsx` | Lazy demand-rendered capsule with one active surface | Retain lifecycle/fallback; parameterize palette safely, no renderer multiplication |
| `useAppStorage`, `indexedDbRepository`, backup code | Device records/media and snapshot settings; no theme choice | Add a separately scoped appearance preference; do not rewrite record snapshots just to switch theme |
| `useOfflineShell`, release scripts | Versioned shell/update guards | Reuse; no cache clearing, new service-worker owner, or forced reload while unsaved |

Important alias hazard: `--lumen-ink` currently means BOTH dark background and
foreground; `--color-obsidian` is overridden to pale text within Brain. Split
these usages into background/text roles before changing alias values. Keep any
compatibility aliases temporary and role-specific.

Coverage inventory: welcome/login; Home; Brain search, categories, pinned/library
notes and graph; Projects and project detail; Health, wellness details, skincare
and workout; People and person detail; Inspiration, Collections and image viewer;
Journal and Focus; existing Spotify/Mail/Pinterest demo surfaces; backup/new
Settings; all capture/note/task/project/person/health/journal/collection/thought
editors, overlays, empty states, loading, retry/error banners and toasts.
Diagnostic color markers are intentional test data, not theme overrides.
Media itself may remain unchanged, but viewer chrome must follow the global mode.

## Persistence, native behavior and regression boundaries

- Theme is a small UI preference, not journal/task content. Plan a versioned,
  validated `dark`/`light` key; guarded access failure must still open Lumen.
  Decide its single source of truth in Phase 2. A synchronous early-read key is
  suitable for first paint; do not create competing async/sync authorities.
  Existing backups without appearance settings stay valid. A personal-data
  restore should not unexpectedly override this device's appearance preference.
- Keep the physically accepted standalone ancestor `min-height: 100vh/100lvh`
  and fixed app `height: 100vh/100lvh`; ordinary browser mode retains `100dvh`.
  Safe-area padding remains separate. Never clear storage or reinstall to test.
- Native iPhone status icons and Home indicator are OS-owned. Preserve current
  metadata; check actual dark/light cold launch/resume. Do not claim runtime
  icon inversion based on CSS or the desktop fake status bar. If native contrast
  fails, resolve that as a separate tested constraint, not a fake system overlay.
- Keep verified backup export/restore, save-error visibility, full image bytes,
  real date calculations, task ordering/completion, offline updates and the
  one-dot-per-note graph. This round does not add cloud sync or reset demo data.
- The current user-approved screenshot is the visual baseline; baseline iPhone
  GPU timings are not available. Record actual device behavior in Phases 6–8;
  desktop geometry and automated tests do not establish phone smoothness.

## Phase 1 completion

- [x] Reviewed current palette/cascade, welcome finish, navigation, Home, settings,
  first-paint behavior, record storage and relevant regression boundaries.
- [x] Defined semantic dark/light palette with opaque-surface contrast preflight.
- [x] Defined typography, spacing, materials and interaction states.
- [x] Recorded all-screen coverage and specific source migration risks.
- [x] Defined Home/3D boundaries and acceptance gates for the next phases.
- [x] Saved the sequenced checklist in `LUMEN_REDESIGN_IMPLEMENTATION_PLAN.md`.
- [ ] Runtime implementation and physical verification: later phases, not Phase 1.
