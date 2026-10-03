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
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../constants/theme.ts";
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
}: {
  title: string;
  subtitle?: string;
  back: () => void;
  children: React.ReactNode;
  scroll?: boolean;
}) {
  return (
    <KeyboardAvoidingView
      style={ui.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader title={title} subtitle={subtitle} onBack={back} />
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={ui.content}
        >
          {children}
        </ScrollView>
      ) : (
        children
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
        placeholderTextColor={COLORS.textMuted}
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
        pressed && ui.pressed,
        disabled && { opacity: 0.55 },
      ]}
    >
      <Text
        style={[
          ui.body,
          selected && { color: COLORS.primaryDark, fontWeight: "600" },
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
        accessibilityLabel="Loading saved data"
      />
      <Body muted>Loading…</Body>
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
    <View style={ui.empty}>
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
  content: {
    padding: SPACING.xl,
    gap: SPACING.lg,
    paddingBottom: SPACING.huge,
  },
  body: { ...TYPOGRAPHY.body, color: COLORS.textPrimary, flexShrink: 1 },
  muted: { color: COLORS.textSecondary },
  heading: { ...TYPOGRAPHY.section, color: COLORS.textPrimary },
  label: { ...TYPOGRAPHY.secondaryMedium, color: COLORS.textPrimary },
  field: { gap: SPACING.sm },
  input: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    minHeight: 52,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  choice: {
    minHeight: 48,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    flexShrink: 1,
  },
  selected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  pressed: { opacity: 0.75 },
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  empty: { padding: SPACING.xl, gap: SPACING.md },
  notice: {
    padding: SPACING.md,
    backgroundColor: COLORS.errorLight,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  error: { ...TYPOGRAPHY.secondary, color: COLORS.errorText },
  amount: {
    ...TYPOGRAPHY.screenTitle,
    color: COLORS.primaryDark,
    fontVariant: ["tabular-nums"],
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
});
