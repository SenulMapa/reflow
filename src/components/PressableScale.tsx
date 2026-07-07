import { Pressable, type PressableProps } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { haptics } from "../lib/haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Drop-in Pressable with a spring scale-down on press-in that reverses on
 *  release OR cancel (Pressable fires onPressOut on drag-off). Fires a haptic
 *  on press-in by default. */
export function PressableScale({
  scaleTo = 0.97, haptic = "selection", onPressIn, onPressOut, style, children, ...rest
}: PressableProps & { scaleTo?: number; haptic?: "selection" | "success" | "light" | false }) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      onPressIn={(e) => { s.value = withSpring(scaleTo, { damping: 18, stiffness: 320 }); if (haptic) haptics[haptic](); onPressIn?.(e); }}
      onPressOut={(e) => { s.value = withSpring(1, { damping: 18, stiffness: 320 }); onPressOut?.(e); }}
      style={[anim, style as any]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
