## Spec: Fix runtime error + complete theme/animation rollout

### Problem
Preview is throwing: `Invariant failed: Expected to find a match below the root match in SPA mode.` This is a TanStack Router error — typically caused by `__root.tsx` not rendering `<Outlet />`, or a route mismatch after recent edits.

The previous turn delivered new theme tokens (greyscale glass system, gradients, GSAP `useTilt` hook) but did NOT actually apply them across routes/components. Hover, link, button, and disabled-text contrast tokens still need adjustment, and the "scaffold all endpoints properly" request is unresolved.

### Plan

1. **Fix the SPA invariant crash**
   - Read `src/routes/__root.tsx` and confirm `<Outlet />` is present and reachable.
   - Read `src/routeTree.gen.ts` and `src/router.tsx` to confirm no duplicate `/` route or stale generated tree.
   - Repair whichever is broken (most likely a missing `<Outlet />` after the theme overhaul touched layout, or a route file referenced in the tree but missing on disk).

2. **Audit and finish contrast tokens in `src/styles.css`**
   - Link color (default + visited + hover): ensure ≥ 4.5:1 on `--background` and on `--card`/`--glass-bg`.
   - Button variants (`--primary`, `--secondary`, `--accent`, `--destructive`, `--ghost` hover): verify foreground vs background pairs.
   - Disabled text token (introduce `--foreground-disabled` if missing) at ≥ 3:1 (WCAG AA for disabled UI).
   - Hover/focus rings (`--ring`, `--hub-surface-hover`) tuned to the new graphite scale.
   - Keep the greyscale-lightgrey base — no pure `#000`.

3. **Apply the glass/gradient system to shell + cards**
   - `HubTopBar`, `HubSidebar`, `ChatPanel`: swap flat surfaces for `glass`/`glass-panel` + `shimmer-sweep` where appropriate.
   - Card-like blocks across `/`, `/agent`, `/skills`, `/playground`, `/observe`, `/tracker`, `/extension`, `/allowlist`, `/config`, `/database`, `/skill-editor`: apply `glass-panel hover-lift` and wire `useTilt` on primary feature cards.
   - Headings on landing-style pages get `gradient-text`.

4. **Lottie + GSAP polish (minimal, performant)**
   - Add a single shared `<AmbientMesh />` background component using `--gradient-mesh` + a slow GSAP timeline (respects `prefers-reduced-motion`).
   - Add one Lottie loader (lazy, only on `/agent` execution + `/playground` run states) via `lottie-react`. Install package.
   - No Lottie on every page — keep bundle lean.

5. **Scaffold complete routing**
   - Confirm every entry in `BUILTIN_PAGES` (`src/lib/hub-registry.ts`) has a matching `src/routes/*.tsx` file and is reachable from the sidebar.
   - Add `notFoundComponent` on `__root` and `errorComponent` on routes with loaders (currently missing per stack guidelines).
   - Verify `routeTree.gen.ts` regenerates cleanly (don't edit by hand).

6. **Verify**
   - Read console logs / runtime errors after the fixes.
   - Spot-check 3 routes visually in preview viewport (1067×672).
   - Confirm no `oklch(0 0 0)` or `#000` leaked back in.

### Out of scope
- No backend / RLS / edge function changes.
- No new business features.
- No auth changes (hub remains public dev tool).

### Open question
The previous turn already installed `gsap` and shipped `useTilt`, but no components consume it yet. Do you want me to **(a)** apply the glass+tilt+gradient system broadly across all 10 routes in one pass, or **(b)** start with just the shell (TopBar, Sidebar, ChatPanel) + landing (`/`) and iterate? Option (a) is bigger and riskier; (b) lets you steer the aesthetic before it's everywhere.
