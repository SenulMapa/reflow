/**
 * Resolve native Liquid Glass availability WITHOUT ever letting the probe abort
 * launch.
 *
 * `isLiquidGlassAvailable()` (expo-glass-effect) calls
 * `requireNativeModule('ExpoGlassEffect')`, which **throws**
 * (`Cannot find native module 'ExpoGlassEffect'`) when the pod isn't linked —
 * a real failure mode on sideloaded / SideStore-signed IPAs, exactly where this
 * app's earlier launch crashes lived (see the v1.0.2 / v1.0.3 fixes).
 *
 * `Surface` evaluates availability once at module load and is imported by nearly
 * every screen, so an unguarded throw here is a white-screen crash at boot.
 * Guard it: any failure degrades to the flat (non-glass) surface instead of
 * killing launch. Kept as a pure, native-free helper so it is unit-testable.
 */
export function resolveGlassSupport(probe: () => boolean): boolean {
  try {
    return probe();
  } catch {
    // Native module missing / not yet linked (sideloaded build), or any other
    // probe failure — fall back to the flat surface. Never rethrow at boot.
    return false;
  }
}
