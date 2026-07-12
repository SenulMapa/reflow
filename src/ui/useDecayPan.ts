import { Gesture } from "react-native-gesture-handler";
import {
  useSharedValue,
  withSpring,
  runOnJS,
  type SharedValue,
  type WithSpringConfig,
} from "react-native-reanimated";

/**
 * A one-axis pan with Apple-style physics, run entirely on the UI thread
 * (worklets) so it stays smooth while JS is busy. Purpose-built for BI-STABLE
 * surfaces — a swipe-to-dismiss drawer / sheet / card that rests at one of two
 * points (`bounds[1]` = open, `bounds[0]` = dismissed):
 *
 *   Phase 1  1:1 drag      -> finger-tracked within [min, max]
 *   Phase 2  rubber-band   -> exponential resistance when pulled past an edge
 *                             (Apple's b = (1 − 1/(d·f/c + 1))·c)
 *   Phase 3  release        -> velocity-projected snap to the nearer bound with
 *                             a critically-damped spring (carries flick velocity,
 *                             no overshoot); fires `onSettle` at the dismiss edge.
 *
 * Native <ScrollView>/<FlatList> already give you Apple's exact *scroll* physics
 * (they ARE UIScrollView on iOS) — reach for this hook ONLY for custom gesture
 * surfaces where there is no native scroller to lean on.
 */
export type DecayPanConfig = {
  /** Inclusive resting range, in points: [dismissed, open]. */
  bounds: [min: number, max: number];
  /** Starting offset. Default = min (surface begins dismissed / off-screen). */
  initial?: number;
  /** Which bound counts as "dismissed" — the one that fires onSettle. Default "min". */
  dismissTo?: "min" | "max";
  /** Fired (on the JS thread) once the surface settles at the dismiss bound. */
  onSettle?: () => void;
  /** px/s past which a flick forces a direction regardless of position. Default 600. */
  flingVelocity?: number;
};

// Apple rubber-band: resistance grows so the edge feels "attached" but bounded.
// c = the axis extent the overshoot is measured against; f = elasticity (0.55).
function rubberBand(overshoot: number, dimension: number, factor = 0.55) {
  "worklet";
  return (1 - 1 / ((overshoot * factor) / dimension + 1)) * dimension;
}

// Critically damped — reaches the snap point fast with no bounce-back.
const SNAP_SPRING: WithSpringConfig = { mass: 1, damping: 30, stiffness: 300 };

export function useDecayPan(config: DecayPanConfig): {
  offset: SharedValue<number>;
  gesture: ReturnType<typeof Gesture.Pan>;
} {
  const [min, max] = config.bounds;
  const offset = useSharedValue(config.initial ?? min);
  const start = useSharedValue(0);

  const span = Math.max(1, max - min); // rubber-band reference extent
  const dismissBound = config.dismissTo === "max" ? max : min;
  const fling = config.flingVelocity ?? 600;
  const onSettle = config.onSettle;

  const gesture = Gesture.Pan()
    // Horizontal intent only — let a vertical drag fall through to inner scrollers.
    .activeOffsetX([-18, 18])
    .failOffsetY([-16, 16])
    .onBegin(() => {
      "worklet";
      start.value = offset.value;
    })
    .onUpdate((e) => {
      "worklet";
      const raw = start.value + e.translationX;
      if (raw < min) offset.value = min - rubberBand(min - raw, span);
      else if (raw > max) offset.value = max + rubberBand(raw - max, span);
      else offset.value = raw;
    })
    .onEnd((e) => {
      "worklet";
      const v = e.velocityX;
      const mid = (min + max) / 2;
      // Fast flick wins; otherwise settle to whichever bound is nearer.
      let target: number;
      if (v < -fling) target = min;
      else if (v > fling) target = max;
      else target = offset.value < mid ? min : max;

      offset.value = withSpring(target, { ...SNAP_SPRING, velocity: v });
      if (target === dismissBound && onSettle) runOnJS(onSettle)();
    });

  return { offset, gesture };
}
