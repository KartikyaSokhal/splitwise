import React, { useRef, useState } from "react";
import { Alert, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";
import { ScreenHeader } from "../components/ScreenHeader.tsx";
import { Avatar } from "../components/Avatar.tsx";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import { SecondaryButton } from "../components/SecondaryButton.tsx";
import { useBill } from "../state/BillContext.tsx";
import { formatMinorAsInr } from "../utils/money.ts";
import { prepareBillShare, shareCurrentBill } from "../state/shareBoundary.ts";

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
        <View style={styles.reviewCard}>
          {/* List of Shares */}
          {calculatedShares.map((share, index) => (
            <View key={share.personId} style={styles.personRow}>
              <View style={styles.personLeft}>
                <Avatar name={share.name} size={38} />
                <View style={styles.nameBlock}>
                  <Text style={styles.personName} numberOfLines={1}>
                    {share.name}
                  </Text>
                  {share.isYou ? (
                    <Text style={styles.youLabel}>(You)</Text>
                  ) : null}
                </View>
              </View>

              <Text style={styles.shareAmount}>₹{share.formattedShare}</Text>
            </View>
          ))}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Total Row */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>₹{formattedTotal}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        {!canShare && (
          <Text accessibilityRole="alert">
            This split is not valid. Edit the amounts before sharing.
          </Text>
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
    backgroundColor: COLORS.background,
    justifyContent: "space-between",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  reviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
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
  },
  personName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  youLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  shareAmount: {
    ...TYPOGRAPHY.section,
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: SPACING.xs,
  },
  totalLabel: {
    ...TYPOGRAPHY.section,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  totalAmount: {
    ...TYPOGRAPHY.screenTitle,
    fontSize: 24,
    color: COLORS.primary,
    fontWeight: "800",
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: SPACING.sm,
  },
  editBtn: {
    borderWidth: 0,
    backgroundColor: "transparent",
    height: 44,
  },
});
