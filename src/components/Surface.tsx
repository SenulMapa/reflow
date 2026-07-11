import { View, type ViewProps, type ViewStyle } from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { radius, spacing } from "../theme/tokens";
import { useTheme } from "../theme/theme";
import { resolveGlassSupport } from "./glassSupport";

/**
 * The single elevated-surface primitive. Every card/panel renders through this,
 * so glass lives in exactly one place: iOS 26+ devices get native Liquid Glass,
 * everything below the floor (iPadOS/iOS 17, Android, web) gets the flat surface.
 *
 * `isLiquidGlassAvailable()` is a static native capability check — evaluate it
 * once at module load, not on every render. It is routed through
 * `resolveGlassSupport` because that call THROWS when the ExpoGlassEffect pod
 * isn't linked (sideloaded / SideStore IPAs); an unguarded throw here runs at
 * boot and crashes launch. On failure we degrade to the flat surface.
 */
const glassSupported = resolveGlassSupport(isLiquidGlassAvailable);

export function Surface({
  style,
  padded = true,
  ...props
}: ViewProps & { padded?: boolean }) {
  const { colors, scheme } = useTheme();

  // ── Glass path (iOS 26+) ────────────────────────────────────────────────
  // NOTE: no opaque `backgroundColor` here — GlassView must stay transparent or
  // there's nothing for the native effect to refract, and it reads as a flat card.
  if (glassSupported) {
    // TODO(you): tune the glass *feel* on a real iOS 26 device — this is the one
    // decision neither the fallback nor a Linux/web export can show you.
    //   • glassEffectStyle "regular" = frostier, safe over any background (default)
    //   • glassEffectStyle "clear"   = more see-through; only looks good when there's
    //                                  rich content BEHIND the card to refract
    //   • drop `borderWidth` entirely if the glass edge already reads on device
    const glassStyle: ViewStyle = {
      borderRadius: radius.lg,
      padding: padded ? spacing.lg : 0,
      borderWidth: scheme === "dark" ? 1 : 0,
      borderColor: colors.separator,
    };
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme="auto"
        style={[glassStyle, style]}
        {...props}
      />
    );
  }

  // ── Fallback path (iPadOS/iOS 17, Android, web) ─────────────────────────
  // Nothing bans shadows/elevation: structure comes from a 1px hairline + the
  // surface fill alone. Depth is z-index, never a drop shadow.
  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: padded ? spacing.lg : 0,
    borderWidth: 1,
    borderColor: colors.separator,
  };
  return <View style={[base, style]} {...props} />;
}
