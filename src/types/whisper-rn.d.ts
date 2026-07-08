/**
 * Minimal ambient types for whisper.rn — its shipped types aren't resolved under
 * TypeScript's bundler moduleResolution (RN-only `exports` conditions). We only
 * use `initWhisper` + `context.transcribe/.release`, so declare just that.
 */
declare module "whisper.rn" {
  export interface WhisperContext {
    transcribe(
      filePathOrBase64: string,
      options?: { language?: string; [key: string]: unknown }
    ): { stop: () => Promise<void>; promise: Promise<{ result: string }> };
    release(): Promise<void>;
  }
  export function initWhisper(options: {
    filePath: string;
    isBundleAsset?: boolean;
    [key: string]: unknown;
  }): Promise<WhisperContext>;
}
