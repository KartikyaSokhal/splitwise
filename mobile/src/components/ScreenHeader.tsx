import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";

export type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  tag?: string;
};

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightElement,
  tag,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}

        <View style={styles.rightSlot}>{rightElement}</View>
      </View>

      {tag ? (
        <View style={styles.tagContainer}>
          <Text style={styles.tagText}>{tag.toUpperCase()}</Text>
        </View>
      ) : null}

      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    marginBottom: SPACING.md,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.subtle,
  },
  backButtonPressed: {
    backgroundColor: COLORS.surfaceMuted,
    borderColor: COLORS.borderStrong,
    transform: [{ scale: 0.95 }],
  },
  backIcon: {
    fontSize: 18,
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  placeholder: {
    width: 42,
  },
  rightSlot: {
    alignItems: "flex-end",
  },
  tagContainer: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    paddingHorizontal: SPACING.md,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.sm,
  },
  tagText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primaryDark,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  title: {
    ...TYPOGRAPHY.screenTitle,
    color: COLORS.textPrimary,
    fontWeight: "800",
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontSize: 15,
  },
});

