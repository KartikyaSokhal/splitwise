import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  StyleProp,
  ActivityIndicator,
} from "react-native";
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";

export type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  iconRight?: string;
  accessibilityLabel?: string;
};

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
  iconRight = "→",
  accessibilityLabel,
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      unstable_pressDelay={0}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.electricMintDark} size="small" />
      ) : (
        <>
          <Text style={[styles.text, disabled && styles.textDisabled]}>
            {title}
          </Text>
          {iconRight ? (
            <Text
              style={[styles.icon, disabled && styles.textDisabled]}
              accessible={false}
            >
              {iconRight}
            </Text>
          ) : null}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.electricMint,
    borderRadius: RADIUS.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.freshGreen,
    ...SHADOWS.card,
  },
  pressed: {
    backgroundColor: COLORS.freshGreen,
    transform: [{ scale: 0.985 }],
    opacity: 0.94,
  },
  disabled: {
    backgroundColor: COLORS.surfaceMuted,
    borderColor: COLORS.borderSubtle,
    shadowOpacity: 0,
    elevation: 0,
  },
  text: {
    flexShrink: 1,
    textAlign: "center",
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.electricMintDark,
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.2,
    fontFamily: TYPOGRAPHY.section.fontFamily,
  },
  textDisabled: {
    color: COLORS.textMuted,
  },
  icon: {
    color: COLORS.electricMintDark,
    fontSize: 18,
    fontWeight: "700",
    marginLeft: SPACING.sm,
  },
});

