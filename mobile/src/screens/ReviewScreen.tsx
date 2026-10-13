import React, { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";
import { ScreenHeader } from "../components/ScreenHeader.tsx";
import { Avatar } from "../components/Avatar.tsx";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import { SecondaryButton } from "../components/SecondaryButton.tsx";
import { useBill } from "../state/BillContext.tsx";
import { formatMinorAsInr } from "../utils/money.ts";
import { prepareBillShare, shareCurrentBill } from "../state/shareBoundary.ts";
import {
  SafeAnimated,
  SafeEasing,
  USE_NATIVE_DRIVER,
  useReducedMotion,
  hasNativeAnimated,
} from "../utils/motion.ts";

export const ReviewScreen: React.FC = () => {
  const {
    totalMinor,
    splitMethod,
    calculatedShares,
    navigate,
    goBack,
    totalInput,
    people,
    customShares,
  } = useBill();

  const reduceMotion = useReducedMotion();
  const settleAnim = useRef(
    new SafeAnimated.Value(reduceMotion || !hasNativeAnimated ? 1 : 0),
  ).current;

  useEffect(() => {
    if (!reduceMotion && hasNativeAnimated) {
      SafeAnimated.timing(settleAnim, {
        toValue: 1,
        duration: 220,
        easing: SafeEasing.out(SafeEasing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    }
  }, [settleAnim, reduceMotion]);

  const translateY = settleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });

  const opacity = settleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });

  const [sharing, setSharing] = useState(false);
  const sharingNow = useRef(false);
  const snapshot = { totalInput, people, splitMethod, customShares };
  const latestSnapshot = useRef(snapshot);
  latestSnapshot.current = snapshot;
  let canShare = false;
  try {
    prepareBillShare(snapshot);
    canShare = true;
  } catch {
    /* edit state is not shareable */
  }

  const formattedTotal =
    totalMinor !== null ? formatMinorAsInr(totalMinor) : "0.00";

  const handleShare = async () => {
    if (sharingNow.current) return;
    sharingNow.current = true;
    try {
      setSharing(true);
      const shared = await shareCurrentBill(
        () => latestSnapshot.current,
        (message) => Share.share({ message, title: "DueShare · Bill split" }),
      );

      // Only confirm success when the platform reports that the content was shared.
      if (shared) {
        navigate("SUCCESS");
      }
    } catch (error) {
      Alert.alert(
        "Could not share",
        "Check that all amounts are valid and add up to the total, then try again.",
      );
    } finally {
      sharingNow.current = false;
      setSharing(false);
    }
  };

  const handleEdit = () => {
    if (splitMethod === "custom") {
      navigate("CUSTOM_SPLIT");
    } else {
      navigate("SPLIT_METHOD");
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Your split"
        subtitle="Review before sharing."
        onBack={goBack}
        tag="Final Breakdown"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <SafeAnimated.View
          style={[
            styles.reviewCard,
            { opacity, transform: [{ translateY }] },
          ]}
        >
          {/* Receipt Top Perforation & Header */}
          <View style={styles.receiptHeader}>
            <View style={styles.receiptHeaderBadge}>
              <Text style={styles.receiptHeaderBadgeText}>OFFICIAL BREAKDOWN</Text>
            </View>
            <Text style={styles.receiptMeta}>
              {people.length} {people.length === 1 ? "person" : "people"} • {splitMethod.toUpperCase()} SPLIT
            </Text>
          </View>

          <View style={styles.receiptDashedLine} />

          {/* List of Shares */}
          {calculatedShares.map((share) => (
            <View key={share.personId} style={styles.personRow}>
              <View style={styles.personLeft}>
                <Avatar name={share.name} size={38} highlight={share.isYou} />
                <View style={styles.nameBlock}>
                  <Text style={styles.personName} numberOfLines={1}>
                    {share.name}
                  </Text>
                  {share.isYou ? (
                    <View style={styles.youPill}>
                      <Text style={styles.youLabel}>YOU</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <Text style={styles.shareAmount}>₹{share.formattedShare}</Text>
            </View>
          ))}

          {/* Divider */}
          <View style={styles.receiptDashedLine} />

          {/* Total Row */}
          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>Total Bill</Text>
              <Text style={styles.totalSub}>All shares accounted for</Text>
            </View>
            <Text style={styles.totalAmount}>₹{formattedTotal}</Text>
          </View>
        </SafeAnimated.View>

        <Text style={styles.shareNote}>
          Tap Share Split to open your native share sheet (WhatsApp, Messages, etc.)
        </Text>
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        {!canShare && (
          <View style={styles.alertBox}>
            <Text accessibilityRole="alert" style={styles.alertText}>
              This split is not valid. Edit the amounts before sharing.
            </Text>
          </View>
        )}
        <PrimaryButton
          title="Share Split"
          iconRight="↗"
          onPress={handleShare}
          loading={sharing}
          disabled={!canShare || sharing}
          accessibilityLabel="Share bill split"
        />

        <SecondaryButton
          title="Edit Split"
          onPress={handleEdit}
          style={styles.editBtn}
          accessibilityLabel="Edit split settings"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    backgroundColor: COLORS.background,
    justifyContent: "space-between",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xl,
  },
  reviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    ...SHADOWS.card,
  },
  receiptHeader: {
    alignItems: "center",
    marginBottom: SPACING.sm,
    gap: 6,
  },
  receiptHeaderBadge: {
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  receiptHeaderBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.electricMint,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  receiptMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  receiptDashedLine: {
    height: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    marginVertical: SPACING.md,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACING.sm,
  },
  personLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  nameBlock: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: SPACING.md,
    flex: 1,
    gap: SPACING.xs,
  },
  personName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  youPill: {
    backgroundColor: COLORS.deepForest,
    borderWidth: 1,
    borderColor: COLORS.freshGreen,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
  },
  youLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.electricMint,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  shareAmount: {
    ...TYPOGRAPHY.section,
    color: COLORS.textPrimary,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: SPACING.xs,
  },
  totalLabel: {
    ...TYPOGRAPHY.section,
    color: COLORS.textPrimary,
    fontWeight: "800",
    fontSize: 18,
  },
  totalSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  totalAmount: {
    ...TYPOGRAPHY.hero,
    fontSize: 28,
    lineHeight: 34,
    color: COLORS.electricMint,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  shareNote: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.md,
    fontSize: 12,
  },
  alertBox: {
    backgroundColor: COLORS.errorLight,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
  },
  alertText: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.errorText,
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: SPACING.xs,
  },
  editBtn: {
    borderWidth: 0,
    backgroundColor: "transparent",
    minHeight: 44,
  },
});

