import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Surface } from "../src/components/Surface";
import { useTheme } from "../src/theme/theme";
import { radius, spacing, type } from "../src/theme/tokens";
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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Link href="/" asChild><Pressable hitSlop={10}><Text style={[type.footnote, { color: colors.accent }]}>‹ Home</Text></Pressable></Link>
        <Text style={[type.largeTitle, { color: colors.text, marginTop: spacing.xs }]}>Rewards</Text>

        {/* Balance */}
        <View style={{ alignItems: "center", marginVertical: spacing.xl }}>
          <Text style={[type.caption, { color: colors.textDim }]}>YOUR BALANCE</Text>
          <Text style={[type.hero, { color: colors.gold, fontSize: 52, lineHeight: 56, marginTop: spacing.xs }]}>
            {coins}
          </Text>
          <Text style={[type.footnote, { color: colors.textDim }]}>coins · 🔥 {streakDays}-day streak · Level {lp.level}</Text>
        </View>

        <Text style={[type.footnote, { color: colors.textDim, textAlign: "center", marginBottom: spacing.lg }]}>
          Earn coins by studying. Spend them on the good stuff, no guilt.
        </Text>

        {/* Shop */}
        <Text style={[type.caption, { color: colors.textDim, marginBottom: spacing.sm }]}>SPEND ON</Text>
        <View style={{ gap: spacing.sm }}>
          {rewards.map((r) => {
            const afford = coins >= r.cost;
            return (
              <Surface key={r.id} style={styles.rewardRow}>
                <Text style={{ fontSize: 22 }}>{r.icon ?? "✦"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { color: colors.text }]}>{r.label}</Text>
                  <Text style={[type.footnote, { color: colors.gold }]}>🪙 {r.cost}</Text>
                </View>
                <Pressable onPress={() => redeem(r.id, r.label)} disabled={!afford} style={[styles.redeem, { backgroundColor: afford ? colors.gold : colors.separator }]}>
                  <Text style={[type.footnote, { color: afford ? "#fff" : colors.textFaint, fontFamily: type.headline.fontFamily }]}>{afford ? "Redeem" : "Locked"}</Text>
                </Pressable>
                <Pressable onPress={() => removeReward(r.id)} hitSlop={8}><Text style={[type.footnote, { color: colors.textFaint }]}>✕</Text></Pressable>
              </Surface>
            );
          })}
        </View>

        {/* Add reward */}
        <Surface style={[styles.addRow, { marginTop: spacing.md }]}>
          <TextInput value={label} onChangeText={setLabel} placeholder="New reward (e.g. boba run)" placeholderTextColor={colors.textFaint} style={[type.body, { color: colors.text, flex: 1 }]} />
          <TextInput value={cost} onChangeText={setCost} placeholder="cost" keyboardType="number-pad" placeholderTextColor={colors.textFaint} style={[type.body, { color: colors.text, width: 52 }]} />
          <Pressable onPress={add} hitSlop={8}><Text style={[type.headline, { color: colors.accent }]}>Add</Text></Pressable>
        </Surface>

        {/* Ledger */}
        {ledger.length > 0 && (
          <>
            <Text style={[type.caption, { color: colors.textDim, marginTop: spacing.xl, marginBottom: spacing.sm }]}>RECENT</Text>
            <View style={{ gap: 2 }}>
              {ledger.slice(0, 8).map((e) => (
                <View key={e.id} style={styles.ledgerRow}>
                  <Text style={[type.footnote, { color: colors.textDim, flex: 1 }]}>{e.reason}</Text>
                  <Text style={[type.footnote, { color: e.kind === "earn" ? colors.success : colors.gold, fontFamily: type.data.fontFamily }]}>
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
        <View style={[styles.flash, { backgroundColor: colors.gold }]}>
          <Text style={[type.headline, { color: "#fff", textAlign: "center" }]}>{flash}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg },
  rewardRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  redeem: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  addRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  ledgerRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs },
  flash: { position: "absolute", bottom: spacing.xxl, left: spacing.xl, right: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.lg },
});
