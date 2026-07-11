import { View, useWindowDimensions } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../theme/theme";

/**
 * Nothing's signature background: a very sparse round-dot field. On the web the
 * reference uses `mix-blend-mode:difference` so one field inverts against
 * whatever surface sits behind it — RN has no such blend, so this is a
 * theme-aware two-tone approximation: faint `dotbg` dots over the canvas, sitting
 * BEHIND cards (cards cover them; dots show only in the gaps).
 *
 * Drop as the first child of a screen's root, absolutely filling it, with
 * `pointerEvents="none"`. Fine + sparse: ~1.3px dots, ~72px spacing.
 */
export function DotField({ spacing = 72, radius = 1.3 }: { spacing?: number; radius?: number }) {
  const { width, height } = useWindowDimensions();
  const { colors } = useTheme();
  const cols = Math.ceil(width / spacing) + 1;
  const rows = Math.ceil(height / spacing) + 1;
  const dots = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      dots.push(<Circle key={`${r}-${c}`} cx={c * spacing} cy={r * spacing} r={radius} fill={colors.dotbg} />);
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <Svg width={width} height={height}>{dots}</Svg>
    </View>
  );
}
