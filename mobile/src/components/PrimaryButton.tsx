import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  StyleProp,
  ActivityIndicator,
} from "react-native";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";

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
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
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
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
  },
  pressed: {
    backgroundColor: COLORS.primaryDark,
    opacity: 0.95,
  },
  disabled: {
    backgroundColor: COLORS.border,
  },
  text: {
    flexShrink: 1,
    textAlign: "center",
    ...TYPOGRAPHY.bodyMedium,
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  textDisabled: {
    color: COLORS.textMuted,
  },
  icon: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: SPACING.sm,
  },
});
