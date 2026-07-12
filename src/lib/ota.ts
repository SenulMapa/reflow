/**
 * Manual, launch-safe OTA update check.
 *
 * expo-updates' AUTOMATIC launch loader + ErrorRecovery/anti-bricking pipeline is
 * exactly what SIGABRT'd the re-signed SideStore build across v1.0.1–v1.0.6 (see
 * memory reflow-launch-crash-expo-updates): a failed launch-time loader calls
 * ErrorRecovery.crash() → abort(). So app.json disables all of that
 * (checkAutomatically: NEVER, fallbackToCacheTimeout: 0, enabled but
 * disableAntiBrickingMeasures: true) and we drive updates BY HAND — well after
 * boot, off the launch path, wrapped so a network error, a stale manifest, or a
 * re-signed-bundle mismatch can NEVER abort the app. Worst case: stay on the
 * embedded bundle.
 */
export type UpdatesLike = {
  isEnabled: boolean;
  checkForUpdateAsync: () => Promise<{ isAvailable: boolean }>;
  fetchUpdateAsync: () => Promise<unknown>;
  reloadAsync: () => Promise<unknown>;
};

/**
 * Pure, injectable core (no native/platform coupling → unit-tested). Returns true
 * only when an update was fetched and a reload was triggered. Any throw anywhere
 * in the pipeline resolves to false — the "never crash the app" contract.
 */
export async function runOTACheck(load: () => Promise<UpdatesLike>): Promise<boolean> {
  try {
    const Updates = await load();
    if (!Updates.isEnabled) return false;
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return false;
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
    return true;
  } catch {
    return false;
  }
}

/**
 * Launch-safe wrapper: no-op on web/dev, dynamically loads expo-updates natively.
 * `react-native` is imported dynamically (not top-level) so the pure `runOTACheck`
 * core stays unit-testable under vitest, which can't parse RN's Flow-typed source.
 */
export async function checkForOTAUpdate(): Promise<boolean> {
  if (__DEV__) return false;
  try {
    const { Platform } = await import("react-native");
    if (Platform.OS === "web") return false;
  } catch {
    return false;
  }
  return runOTACheck(() => import("expo-updates") as unknown as Promise<UpdatesLike>);
}
