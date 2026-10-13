import React, { useState } from "react";
import { Platform, Share, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext.tsx";
import { useCloud } from "../cloud/CloudContext.tsx";
import { useAction } from "../cloud/hooks.ts";
import { useBill } from "../state/BillContext.tsx";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import { SecondaryButton } from "../components/SecondaryButton.tsx";
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";
import {
  PageShell,
  Body,
  Heading,
  Field,
  Notice,
  ui,
} from "../components/CloudUI.tsx";

export function AccountScreen() {
  const auth = useAuth(),
    repository = useCloud(),
    { goBack, navigate } = useBill();
  const [name, setName] = useState(""),
    [saved, setSaved] = useState(false);
  const action = useAction();

  return (
    <PageShell
      title={auth.user ? "Your account" : "Keep it together"}
      subtitle="Quick Split always works without an account."
      back={goBack}
    >
      <Notice message={auth.message} />
      {auth.user ? (
        <>
          {/* VIP Member Pass Card */}
          <View style={styles.memberCard}>
            <View style={styles.memberCardTop}>
              <View style={styles.memberBadge}>
                <Text style={styles.memberBadgeText}>✦ DUESHARE IDENTITY</Text>
              </View>
              <Text style={styles.memberStatus}>ACTIVE</Text>
            </View>

            <View style={styles.memberCodeBlock}>
              <Text style={styles.memberCodeLabel}>YOUR MEMBER CODE</Text>
              <Text selectable style={styles.memberCodeText}>
                {auth.user.id}
              </Text>
            </View>

            <Text style={styles.memberCardDisclaimer}>
              Share this code only with a group admin you trust. They can invite you
              to an existing person; you choose whether to accept.
            </Text>

            <SecondaryButton
              title="Share member code"
              onPress={() =>
                void action.run(async () => {
                  await Share.share({
                    message:
                      "My DueShare member code: " +
                      auth.user!.id +
                      "\nUse it to invite me, then I’ll confirm in DueShare.",
                  });
                })
              }
              style={styles.shareCodeBtn}
            />
          </View>

          <PrimaryButton
            title="Open your groups"
            onPress={() => navigate("GROUPS")}
            iconRight="→"
          />

          {/* Profile Name Card */}
          <View style={ui.card}>
            <Heading>Display Profile</Heading>
            <Body muted>
              Your default name when creating new groups. Existing group names for you stay unchanged.
            </Body>
            <Field
              label="Your name for new groups"
              value={name}
              onChangeText={(v) => {
                setName(v);
                setSaved(false);
              }}
              maxLength={100}
              autoCapitalize="words"
            />
            <SecondaryButton
              title="Save name"
              disabled={action.busy || !name.trim()}
              onPress={() =>
                void action.run(async () => {
                  await repository!.profile(name);
                  setSaved(true);
                })
              }
            />
            {saved && (
              <View style={styles.successPill}>
                <Text style={styles.successPillText}>
                  ✓ Name saved for future groups
                </Text>
              </View>
            )}
          </View>

          <Notice message={action.error} />

          <SecondaryButton
            title="Sign out on this device"
            onPress={() => void auth.logout()}
            disabled={auth.busy}
          />
          <Body muted>
            Sign-out clears private screens. Browser sign-in and sessions on
            other devices are separate.
          </Body>
        </>
      ) : (
        <>
          {/* Cloud Invitation Hero Card */}
          <View style={styles.guestPromoCard}>
            <View style={styles.featurePillsRow}>
              <View style={styles.featurePill}>
                <Text style={styles.featurePillText}>✈ Trips</Text>
              </View>
              <View style={styles.featurePill}>
                <Text style={styles.featurePillText}>⌂ Roommates</Text>
              </View>
              <View style={styles.featurePill}>
                <Text style={styles.featurePillText}>👥 Multi-Payer</Text>
              </View>
              <View style={styles.featurePill}>
                <Text style={styles.featurePillText}>⚡ Balances</Text>
              </View>
            </View>

            <Heading>One place for shared costs</Heading>
            <Body muted>
              Keep a trip, household, or everyday group. Save expenses, see who
              owes what, and record repayments with audit history.
            </Body>
          </View>

          {!auth.configured && (
            <Body muted>
              Cloud sign-in is not configured for this build. You can still use
              Quick Split.
            </Body>
          )}

          <PrimaryButton
            title="Continue with Google"
            onPress={() => void auth.signIn("google")}
            disabled={!auth.configured || auth.busy}
            loading={auth.busy}
            iconRight=""
            accessibilityLabel="Continue with Google"
          />

          <SecondaryButton
            title="Continue without an account"
            onPress={() => navigate("HOME")}
            accessibilityLabel="Continue without an account"
          />

          {auth.configured && auth.message && (
            <SecondaryButton
              title="Clear device session"
              onPress={() => void auth.logout()}
              disabled={auth.busy}
            />
          )}
        </>
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  memberCard: {
    backgroundColor: COLORS.midnightCard,
    borderRadius: RADIUS.card,
    padding: SPACING.xl,
    gap: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    ...SHADOWS.raised,
  },
  memberCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  memberBadge: {
    backgroundColor: COLORS.deepForest,
    borderWidth: 1,
    borderColor: COLORS.freshGreen,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  memberBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.electricMint,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  memberStatus: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.freshGreen,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  memberCodeBlock: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  memberCodeLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  memberCodeText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontWeight: "700",
  },
  memberCardDisclaimer: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  shareCodeBtn: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.borderStrong,
  },
  guestPromoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    gap: SPACING.md,
    ...SHADOWS.card,
  },
  featurePillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  featurePill: {
    backgroundColor: COLORS.deepForest,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.freshGreen,
  },
  featurePillText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.electricMint,
    fontSize: 11,
  },
  successPill: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    alignSelf: "flex-start",
    marginTop: SPACING.xs,
  },
  successPillText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.successText,
    fontSize: 12,
  },
});

