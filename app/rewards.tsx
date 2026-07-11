import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Surface } from "../src/components/Surface";
import { Pill } from "../src/components/Pill";
import { Hairline } from "../src/components/Hairline";
import { DotField } from "../src/components/DotField";
import { PressableScale } from "../src/components/PressableScale";
import { useTheme } from "../src/theme/theme";
import { radius, spacing, type, bounded } from "../src/theme/tokens";
import { useStore } from "../src/state/store";
import { levelProgress } from "../src/state/rewards";

const todayISO = () => {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export default function Rewards() {
  const { colors } = useTheme();
  const state = useStore((s) => s.state);
  const redeemReward = useStore((s) => s.redeemReward);
  const addReward = useStore((s) => s.addReward);
  const removeReward = useStore((s) => s.removeReward);

  const { coins, streakDays, rewards, ledger, xp } = state.progress;
  const lp = levelProgress(xp);
  const [label, setLabel] = useState("");
  const [cost, setCost] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  function redeem(id: string, itemLabel: string) {
    if (state.progress.coins < (rewards.find((r) => r.id === id)?.cost ?? Infinity)) return;
    redeemReward(id, todayISO());
    setFlash(`Enjoy your ${itemLabel} — guilt-free.`);
    setTimeout(() => setFlash(null), 2200);
  }

  function add() {
    const c = parseInt(cost, 10);
    if (!label.trim() || !c || c <= 0) return;
    addReward({ id: `${Date.now()}`, label: label.trim(), cost: c, icon: "✦" });
    setLabel(""); setCost("");
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <DotField />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Link href="/" asChild><Pressable hitSlop={10}><Text style={[type.caption, { color: colors.textDim }]}>‹ HOME</Text></Pressable></Link>
        <Text style={[type.largeTitle, { color: colors.text, marginTop: spacing.xs }]}>Rewards</Text>

        {/* Balance */}
        <View style={{ alignItems: "center", marginVertical: spacing.xl }}>
          <Text style={[type.caption, { color: colors.textDim }]}>YOUR BALANCE</Text>
          <Text style={[type.numeralLg, { color: colors.text, marginTop: spacing.xs }]}>{coins}</Text>
          <Text style={[type.caption, { color: colors.textDim }]}>COINS</Text>
        </View>

        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={[type.title, { color: colors.text }]}>{streakDays}</Text>
            <Text style={[type.caption, { color: colors.textDim }]}>DAY STREAK</Text>
          </View>
          <Hairline vertical />
          <View style={styles.stat}>
            <Text style={[type.title, { color: colors.text }]}>{lp.level}</Text>
            <Text style={[type.caption, { color: colors.textDim }]}>LEVEL</Text>
          </View>
        </View>

        <Text style={[type.footnote, { color: colors.textDim, textAlign: "center", marginVertical: spacing.lg }]}>
          Earn coins by studying. Spend them on the good stuff, no guilt.
        </Text>

        {/* Shop */}
        <Text style={[type.caption, { color: colors.textDim, marginBottom: spacing.sm }]}>SPEND ON</Text>
        <View style={{ gap: spacing.sm }}>
          {rewards.map((r) => {
            const afford = coins >= r.cost;
            return (
              <Surface key={r.id} style={styles.rewardRow}>
                <View style={[styles.dot, { backgroundColor: colors.text }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[type.mono, { color: colors.text, textTransform: "uppercase" }]}>{r.label}</Text>
                  <View style={styles.readout}>
                    <Text style={[type.data, { color: colors.textDim }]}>{r.cost}</Text>
                    <Text style={[type.caption, { color: colors.textFaint }]}>COINS</Text>
                  </View>
                </View>
                <PressableScale
                  onPress={() => redeem(r.id, r.label)}
                  disabled={!afford}
                  style={[styles.redeem, afford ? { backgroundColor: colors.display, borderColor: colors.display } : { borderColor: colors.line2 }]}
                >
                  <Text style={[type.caption, { color: afford ? colors.bg : colors.textFaint }]}>{afford ? "REDEEM" : "LOCKED"}</Text>
                </PressableScale>
                <Pressable onPress={() => removeReward(r.id)} hitSlop={8}><Text style={[type.mono, { color: colors.textFaint }]}>✕</Text></Pressable>
              </Surface>
            );
          })}
        </View>

        {/* Add reward */}
        <Surface style={[styles.addWrap, { marginTop: spacing.md }]}>
          <Text style={[type.caption, { color: colors.textDim }]}>NEW REWARD</Text>
          <View style={styles.addRow}>
            <TextInput value={label} onChangeText={setLabel} placeholder="e.g. boba run" placeholderTextColor={colors.textFaint} style={[type.body, styles.input, { color: colors.text, borderColor: colors.line2, flex: 1 }]} />
            <TextInput value={cost} onChangeText={setCost} placeholder="cost" keyboardType="number-pad" placeholderTextColor={colors.textFaint} style={[type.mono, styles.input, { color: colors.text, borderColor: colors.line2, width: 60 }]} />
          </View>
          <Pill label="Add reward" onPress={add} />
        </Surface>

        {/* Ledger */}
        {ledger.length > 0 && (
          <>
            <Text style={[type.caption, { color: colors.textDim, marginTop: spacing.xl, marginBottom: spacing.sm }]}>RECENT</Text>
            <View style={{ gap: 2 }}>
              {ledger.slice(0, 8).map((e) => (
                <View key={e.id} style={styles.ledgerRow}>
                  <Text style={[type.footnote, { color: colors.textDim, flex: 1 }]}>{e.reason}</Text>
                  <Text style={[type.data, { color: colors.text }]}>
                    {e.kind === "earn" ? "+" : "−"}{e.amount}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>

      {flash && (
        <View style={[styles.flash, { backgroundColor: colors.display }]}>
          <Text style={[type.headline, { color: colors.bg, textAlign: "center" }]}>{flash}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, ...bounded },
  statRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xl },
  stat: { alignItems: "center", gap: 2 },
  readout: { flexDirection: "row", alignItems: "baseline", gap: spacing.xs, marginTop: 2 },
  rewardRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
  redeem: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  addWrap: { gap: spacing.md },
  addRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  input: { paddingVertical: spacing.sm, borderBottomWidth: 1 },
  ledgerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.xs },
  flash: { position: "absolute", bottom: spacing.xxl, left: spacing.xl, right: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.md },
});
