import { useEffect } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, cancelAnimation } from "react-native-reanimated";
import { useTheme } from "../theme/theme";
import { radius as R } from "../theme/tokens";

/** Placeholder block for AI/network waits (used from SP4). Pairs with status copy.
 *  Nothing motion: a calm opacity pulse — no shimmer sweep, no rebound. */
export function Skeleton({ width = "100%", height = 16, radius = R.sm }: { width?: number | string; height?: number; radius?: number }) {
  const { colors } = useTheme();
  const o = useSharedValue(0.3);
  useEffect(() => {
    o.value = withRepeat(withTiming(0.6, { duration: 1000 }), -1, true);
    return () => cancelAnimation(o);
  }, [o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: width as any, height, borderRadius: radius, backgroundColor: colors.separator }, anim]} />;
}
