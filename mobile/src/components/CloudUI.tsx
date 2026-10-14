import React from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  type TextInputProps,
} from "react-native";
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from "../constants/theme.ts";
import { ScreenHeader } from "./ScreenHeader.tsx";
import { SecondaryButton } from "./SecondaryButton.tsx";
import { formatMinorAsInr } from "../utils/money.ts";

export const currency = (minor: number) =>
  `₹${formatMinorAsInr(Math.abs(minor))}`;
export const dateLabel = (time: string) =>
  new Date(time).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
export function PageShell({
  title,
  subtitle,
  back,
  children,
  scroll = true,
  rightElement,
}: {
  title: string;
  subtitle?: string;
  back: () => void;
  children: React.ReactNode;
  scroll?: boolean;
  rightElement?: React.ReactNode;
}) {
  return (
    <KeyboardAvoidingView
      style={ui.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader
        title={title}
        subtitle={subtitle}
        onBack={back}
        rightElement={rightElement}
      />
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={ui.content}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={ui.bodyContainer}>
          {children}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
export function Body({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return <Text style={[ui.body, muted && ui.muted]}>{children}</Text>;
}
export function Heading({ children }: { children: React.ReactNode }) {
  return (
    <Text accessibilityRole="header" style={ui.heading}>
      {children}
    </Text>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={ui.field}>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        style={[ui.input, props.style]}
        placeholderTextColor={COLORS.textTertiary}
      />
    </View>
  );
}
export function Choice({
  title,
  selected,
  onPress,
  disabled = false,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ui.choice,
        selected && ui.selected,
        pressed && !disabled && ui.pressed,
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text
        style={[
          ui.choiceText,
          selected && { color: COLORS.primaryDark, fontWeight: "700" },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Notice({
  message,
  retry,
}: {
  message: string | null;
  retry?: () => void;
}) {
  if (!message) return null;
  return (
    <View style={ui.notice}>
      <Text accessibilityRole="alert" style={ui.error}>
        {message}
      </Text>
      {retry && <SecondaryButton title="Try again" onPress={retry} />}
    </View>
  );
}
export function Loading() {
  return (
    <View style={ui.empty}>
      <ActivityIndicator
        color={COLORS.primary}
        size="large"
        accessibilityLabel="Loading saved data"
      />
      <Body muted>Loading your records…</Body>
    </View>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={ui.emptyCard}>
      <View style={ui.emptyIconCircle}>
        <Text style={ui.emptyIcon}>✦</Text>
      </View>
      <Heading>{title}</Heading>
      <Body muted>{children}</Body>
    </View>
  );
}
export const ui = StyleSheet.create({
  page: {
    flex: 1,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    backgroundColor: COLORS.background,
  },
  bodyContainer: {
    flex: 1,
    width: "100%",
  },
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    gap: SPACING.md,
    paddingBottom: SPACING.huge,
  },
  body: { ...TYPOGRAPHY.body, color: COLORS.textPrimary, flexShrink: 1, fontSize: 15 },
  muted: { color: COLORS.textSecondary },
  heading: { ...TYPOGRAPHY.section, color: COLORS.textPrimary, fontWeight: "700" },
  label: { ...TYPOGRAPHY.captionBold, color: COLORS.textPrimary, letterSpacing: 0.3 },
  field: { gap: SPACING.xs },
  input: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    minHeight: 50,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  choice: {
    minHeight: 44,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.subtle,
  },
  choiceText: {
    ...TYPOGRAPHY.secondaryMedium,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  selected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.85,
  },
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: SPACING.sm,
    ...SHADOWS.subtle,
  },
  empty: {
    padding: SPACING.xxl,
    gap: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    padding: SPACING.xxl,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: SPACING.sm,
    alignItems: "center",
    textAlign: "center",
    ...SHADOWS.subtle,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
  },
  emptyIcon: {
    fontSize: 22,
    color: COLORS.electricMint,
  },
  notice: {
    padding: SPACING.md,
    backgroundColor: COLORS.errorLight,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  error: { ...TYPOGRAPHY.secondary, color: COLORS.errorText, fontWeight: "600" },
  amount: {
    ...TYPOGRAPHY.numericHero,
    fontSize: 36,
    lineHeight: 44,
    color: COLORS.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
});

