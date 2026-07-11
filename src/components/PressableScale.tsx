import { Pressable, type PressableProps } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from "react-native-reanimated";
import { haptics } from "../lib/haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Mechanical press primitive (Nothing motion: no spring rebound). Press-in drops
 * opacity to .8 and nudges the surface up 2px via a crisp 120ms ease-in-out
 * timing; release reverses it. Fires a haptic on press-in by default. The
 * `scaleTo` prop is retained for API compatibility but intentionally unused —
 * Nothing uses opacity + a small translate, not a scale bounce.
 */
export function PressableScale({
  scaleTo, haptic = "selection", onPressIn, onPressOut, style, children, ...rest
}: PressableProps & { scaleTo?: number; haptic?: "selection" | "success" | "light" | false }) {
  const p = useSharedValue(0); // 0 = rest, 1 = pressed
  const cfg = { duration: 120, easing: Easing.inOut(Easing.ease) };
  const anim = useAnimatedStyle(() => ({
    opacity: 1 - p.value * 0.2,
    transform: [{ translateY: -p.value * 2 }],
  }));
  return (
    <AnimatedPressable
      onPressIn={(e) => { p.value = withTiming(1, cfg); if (haptic) haptics[haptic](); onPressIn?.(e); }}
      onPressOut={(e) => { p.value = withTiming(0, cfg); onPressOut?.(e); }}
      style={[anim, style as any]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
