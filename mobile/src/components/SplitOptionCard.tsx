import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";

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
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={[styles.title, selected && styles.titleSelected]}>
            {title}
          </Text>
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

      <Text style={styles.subtitle}>{subtitle}</Text>

      {badgeText ? (
        <View style={styles.badgeContainer}>
          <View style={styles.badge}>
            {badgeIcon ? (
              <Text style={styles.badgeIcon}>{badgeIcon}</Text>
            ) : null}
            <Text style={styles.badgeText}>{badgeText}</Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "#FDFCFF",
  },
  cardPressed: {
    opacity: 0.9,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.section,
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  titleSelected: {
    color: COLORS.primary,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontSize: 14,
  },
  badgeContainer: {
    flexDirection: "row",
    marginTop: SPACING.md,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  badgeIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  badgeText: {
    ...TYPOGRAPHY.secondaryMedium,
    color: COLORS.primary,
    fontWeight: "600",
  },
});
