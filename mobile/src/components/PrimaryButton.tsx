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
    minHeight: 52,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
    borderWidth: 1,
    borderColor: "#4338CA",
    ...SHADOWS.card,
  },
  pressed: {
    backgroundColor: COLORS.primaryDark,
    transform: [{ scale: 0.98 }],
    opacity: 0.94,
  },
  disabled: {
    backgroundColor: COLORS.border,
    borderColor: COLORS.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  text: {
    flexShrink: 1,
    textAlign: "center",
    ...TYPOGRAPHY.bodyMedium,
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  textDisabled: {
    color: COLORS.textTertiary,
  },
  icon: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: SPACING.sm,
  },
});

