import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useTheme } from "../theme/theme";

/** Three small monochrome dots with a calm opacity pulse — a live "typing"
 *  indicator shown before the assistant's first token. Ease-in-out timing only
 *  (no spring); core RN Animated so it ships via OTA. */
export function TypingDots() {
  const { colors } = useTheme();
  const dots = useRef([new Animated.Value(0.3), new Animated.Value(0.3), new Animated.Value(0.3)]).current;

  useEffect(() => {
    const pulse = (v: Animated.Value) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 380, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: 380, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
    const loop = Animated.stagger(150, dots.map(pulse));
    loop.start();
    return () => loop.stop();
  }, [dots]);

  return (
    <View style={styles.row}>
      {dots.map((opacity, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity, backgroundColor: colors.textDim }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
