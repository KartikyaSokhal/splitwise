import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS, TYPOGRAPHY } from "../constants/theme.ts";

export type AvatarProps = {
  name: string;
  size?: number;
  highlight?: boolean;
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 44,
  highlight = false,
}) => {
  const initial = (name.trim()[0] || "?").toUpperCase();

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: RADIUS.full,
          backgroundColor: highlight ? COLORS.primary : COLORS.primaryLight,
        },
      ]}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={`Avatar for ${name}`}
    >
      <Text
        style={[
          styles.text,
          {
            fontSize: Math.round(size * 0.4),
            color: highlight ? "#FFFFFF" : COLORS.primary,
          },
        ]}
      >
        {initial}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    ...TYPOGRAPHY.section,
    fontWeight: "700",
  },
});
