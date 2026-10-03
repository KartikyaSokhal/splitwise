import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import { SecondaryButton } from "../components/SecondaryButton.tsx";
import { useBill } from "../state/BillContext.tsx";
import { useAuth } from "../auth/AuthContext.tsx";

export const HomeScreen: React.FC = () => {
  const { navigate } = useBill();
  const { user } = useAuth();
  return <ScrollView contentContainerStyle={styles.container}>
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.brand}>DueShare</Text>
      <SecondaryButton title="Account" onPress={() => navigate("ACCOUNT")} />
    </View>
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>LESS MATH. MORE TOGETHER.</Text>
      <Text style={styles.title}>A shared bill.{"\n"}A clear split.</Text>
      <Text style={styles.body}>Add the total and your people. We’ll take care of the paise.</Text>
    </View>
    <View style={styles.quick}>
      <Text style={styles.section}>Just this bill?</Text>
      <Text style={styles.body}>Quick Split stays on your phone until you share it. No account or internet needed.</Text>
      <PrimaryButton title="Quick Split" onPress={() => navigate("ENTER_TOTAL")} accessibilityLabel="Quick Split, no account needed" />
    </View>
    <View style={styles.saved}>
      <Text style={styles.section}>Keep sharing costs</Text>
      <Text style={styles.body}>{user ? "Your groups and saved activity, ready when you need them." : "Sign in to save groups, expenses, balances and history. Your Quick Splits stay separate."}</Text>
      <SecondaryButton title="Groups" onPress={() => navigate("GROUPS")} />
      <SecondaryButton title="Recent activity & history" onPress={() => navigate("HISTORY")} />
    </View>
    <Text style={styles.caption}>Clear amounts. No money transfers.</Text>
  </ScrollView>;
};
const styles = StyleSheet.create({
  container: { flexGrow: 1, width: "100%", maxWidth: 760, alignSelf: "center", padding: SPACING.xl, gap: SPACING.xxl, backgroundColor: COLORS.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: SPACING.sm },
  brand: { ...TYPOGRAPHY.screenTitle, fontWeight: "800", color: COLORS.primaryDark },
  hero: { gap: SPACING.md, paddingVertical: SPACING.lg },
  eyebrow: { ...TYPOGRAPHY.caption, color: COLORS.primaryDark, letterSpacing: 1.1 },
  title: { ...TYPOGRAPHY.hero, color: COLORS.textPrimary, fontWeight: "800" },
  body: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  section: { ...TYPOGRAPHY.section, color: COLORS.textPrimary },
  quick: { padding: SPACING.xl, borderRadius: RADIUS.xl, backgroundColor: COLORS.primaryLight, gap: SPACING.lg },
  saved: { gap: SPACING.md },
  caption: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, textAlign: "center" },
});
