import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";

export type ErrorMessageProps = {
  message?: string | null;
  type?: "error" | "warning";
};

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  type = "error",
}) => {
  if (!message) return null;

  const isError = type === "error";

  return (
    <View
      style={[
        styles.container,
        isError ? styles.containerError : styles.containerWarning,
      ]}
      accessible={true}
      accessibilityRole="alert"
    >
      <Text style={styles.icon}>{isError ? "⚠️" : "ℹ️"}</Text>
      <Text
        style={[
          styles.text,
          isError ? styles.textError : styles.textWarning,
        ]}
      >
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginVertical: SPACING.xs,
  },
  containerError: {
    backgroundColor: COLORS.errorLight,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  containerWarning: {
    backgroundColor: COLORS.warningLight,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  icon: {
    fontSize: 14,
    marginRight: SPACING.sm,
  },
  text: {
    ...TYPOGRAPHY.secondary,
    flex: 1,
    fontWeight: "500",
  },
  textError: {
    color: COLORS.errorText,
  },
  textWarning: {
    color: COLORS.warningText,
  },
});
