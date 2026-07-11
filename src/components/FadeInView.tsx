import { type ReactNode } from "react";
import { type ViewStyle } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

/** Subtle mount entrance: a calm opacity fade, no translate/rebound. Nothing
 *  motion — one quiet moment, timing-eased, not a spring. */
export function FadeInView({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: ViewStyle }) {
  return (
    <Animated.View entering={FadeIn.duration(320).delay(delay)} style={style}>
      {children}
    </Animated.View>
  );
}
