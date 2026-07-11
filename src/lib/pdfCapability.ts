/**
 * Runtime capability probe for the textbook reader's NATIVE layer (PDF rendering +
 * Skia ink). Those modules (`react-native-pdf`, `@shopify/react-native-skia`) are
 * NOT bundled in the Expo-Go-safe build — adding them forces a custom dev build and
 * re-enters the native-module launch-crash class the v2.0.0 rebuild escaped (see
 * spec `2026-07-11-nothing-premium-polish.md` → "Architectural shift").
 *
 * So we probe at runtime and DEGRADE GRACEFULLY: text "note" annotations work
 * everywhere (pure JS); ink/highlight + inline PDF rendering light up only once the
 * native modules are present in a dev build. This keeps the shipping app stable and
 * crash-free while the reader's structure + UI are already in place.
 */

// NOTE: we deliberately do NOT `require()` the native modules here — Metro resolves
// requires statically at bundle time, so referencing an uninstalled module by literal
// string would break the (Expo-Go-safe) bundle. These flags are the single switch:
// when a dev build adds `@shopify/react-native-skia` / `react-native-pdf` to
// package.json, flip the corresponding constant to `true` and wire the native
// component in ReaderCanvas. Until then the reader runs in JS-only "notes" mode.
const HAS_SKIA_INK = false;
const HAS_NATIVE_PDF = false;

/** True only when the Skia ink canvas is available (dev build). */
export const canInk = (): boolean => HAS_SKIA_INK;

/** True only when a native PDF renderer is available (dev build). */
export const canRenderPdf = (): boolean => HAS_NATIVE_PDF;
