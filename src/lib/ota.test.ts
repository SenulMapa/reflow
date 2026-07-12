import { describe, expect, it, vi } from "vitest";
import { runOTACheck, type UpdatesLike } from "./ota";

const base = (over: Partial<UpdatesLike> = {}): UpdatesLike => ({
  isEnabled: true,
  checkForUpdateAsync: async () => ({ isAvailable: false }),
  fetchUpdateAsync: async () => undefined,
  reloadAsync: async () => undefined,
  ...over,
});

describe("runOTACheck", () => {
  it("returns false and never throws when the module fails to load", async () => {
    await expect(runOTACheck(() => Promise.reject(new Error("no native module")))).resolves.toBe(false);
  });

  it("skips when updates are disabled", async () => {
    const fetchSpy = vi.fn();
    const ok = await runOTACheck(async () => base({ isEnabled: false, fetchUpdateAsync: fetchSpy }));
    expect(ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does nothing when no update is available", async () => {
    const reload = vi.fn();
    const ok = await runOTACheck(async () => base({ reloadAsync: reload }));
    expect(ok).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it("fetches and reloads when an update is available", async () => {
    const fetchUpdateAsync = vi.fn(async () => undefined);
    const reloadAsync = vi.fn(async () => undefined);
    const ok = await runOTACheck(async () =>
      base({ checkForUpdateAsync: async () => ({ isAvailable: true }), fetchUpdateAsync, reloadAsync }),
    );
    expect(ok).toBe(true);
    expect(fetchUpdateAsync).toHaveBeenCalledOnce();
    expect(reloadAsync).toHaveBeenCalledOnce();
  });

  it("swallows a mid-pipeline throw (fetch fails) without crashing", async () => {
    const ok = await runOTACheck(async () =>
      base({
        checkForUpdateAsync: async () => ({ isAvailable: true }),
        fetchUpdateAsync: async () => { throw new Error("network"); },
      }),
    );
    expect(ok).toBe(false);
  });
});
