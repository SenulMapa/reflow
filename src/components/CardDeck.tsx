import type { ReactElement } from "react";
import { View } from "react-native";
import type { DeckPlan, CardType } from "../ui/deck";
import { spacing } from "../theme/tokens";

/** Render a DeckPlan in order. A card with no matching slot is silently skipped,
 *  so an unknown/unsupported card type can never blank the screen. */
export function CardDeck({
  plan, slots,
}: {
  plan: DeckPlan;
  slots: Partial<Record<CardType, ReactElement>>;
}) {
  return (
    <View style={{ gap: spacing.lg }}>
      {plan.cards.map((card, i) => {
        const el = slots[card.type];
        return el ? <View key={`${card.type}-${i}`}>{el}</View> : null;
      })}
    </View>
  );
}
