import React from "react";
import { ScrollView, Text, View } from "react-native";

interface Props { children: React.ReactNode }
interface State { error: Error | null }

/**
 * Top-level safety net. A React error boundary catches render/lifecycle throws in the
 * tree below it; without one, a single uncaught error white-screens and then — via
 * whisper.rn's ggml terminate handler — SIGABRTs the whole app with no visible message
 * (this masked the real cause across v1.0.1–v1.0.8). Here we render the error on screen
 * instead, so any future crash is legible on-device and in `idevicesyslog`.
 *
 * Note: error boundaries do NOT catch async/effect/event-handler throws — those must be
 * guarded at their source (e.g. the crash-safe native loader in `src/lib/notify`).
 * Kept dependency-light (no theme/token imports) so the fallback can't fail the same way
 * the thing it's catching did.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // Surfaces under process "Reflow" in idevicesyslog for on-device diagnosis.
    console.error("[ErrorBoundary] uncaught render error:", error?.message, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: "#000", padding: 24, justifyContent: "center" }}>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600", marginBottom: 12 }}>
          Something broke on load.
        </Text>
        <ScrollView style={{ maxHeight: 360 }}>
          <Text selectable style={{ color: "#ff4444", fontSize: 13, lineHeight: 18 }}>
            {error?.message ?? String(error)}
          </Text>
          {error?.stack ? (
            <Text selectable style={{ color: "#888", fontSize: 11, lineHeight: 15, marginTop: 12 }}>
              {error.stack}
            </Text>
          ) : null}
        </ScrollView>
      </View>
    );
  }
}
