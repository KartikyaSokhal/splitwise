import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";

export type SplitOptionCardProps = {
  selected: boolean;
  onSelect: () => void;
  title: string;
  subtitle: string;
  icon: string;
  badgeText?: string;
  badgeIcon?: string;
  accessibilityLabel?: string;
};

export const SplitOptionCard: React.FC<SplitOptionCardProps> = ({
  selected,
  onSelect,
  title,
  subtitle,
  icon,
  badgeText,
  badgeIcon,
  accessibilityLabel,
}) => {
  return (
    <Pressable
      onPress={onSelect}
      accessible={true}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel || `${title}: ${subtitle}`}
      unstable_pressDelay={0}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleGroup}>
          <View style={[styles.iconBox, selected && styles.iconBoxSelected]}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
          <View style={styles.textColumn}>
            <Text style={[styles.title, selected && styles.titleSelected]}>
              {title}
            </Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        <View
          style={[
            styles.radioCircle,
            selected && styles.radioCircleSelected,
          ]}
        >
          {selected ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
      </View>

      {badgeText ? (
        <View style={styles.badgeContainer}>
          <View style={[styles.badge, selected && styles.badgeSelected]}>
            {badgeIcon ? (
              <Text style={styles.badgeIcon}>{badgeIcon}</Text>
            ) : null}
            <Text style={[styles.badgeText, selected && styles.badgeTextSelected]}>
              {badgeText}
            </Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.subtle,
  },
  cardSelected: {
    borderColor: COLORS.electricMint,
    backgroundColor: COLORS.surfaceRaised,
    ...SHADOWS.card,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.96,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: SPACING.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  iconBoxSelected: {
    backgroundColor: COLORS.electricMint,
    borderColor: COLORS.freshGreen,
  },
  icon: {
    fontSize: 20,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.section,
    color: COLORS.textPrimary,
    fontWeight: "800",
  },
  titleSelected: {
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontSize: 14,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    marginTop: 4,
  },
  radioCircleSelected: {
    borderColor: COLORS.electricMint,
    backgroundColor: COLORS.electricMint,
  },
  checkmark: {
    color: COLORS.electricMintDark,
    fontSize: 13,
    fontWeight: "900",
  },
  badgeContainer: {
    flexDirection: "row",
    marginTop: SPACING.md,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  badgeSelected: {
    backgroundColor: COLORS.deepForest,
    borderColor: COLORS.freshGreen,
  },
  badgeIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  badgeText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  badgeTextSelected: {
    color: COLORS.electricMint,
  },
});

