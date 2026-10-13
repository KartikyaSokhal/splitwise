import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AVATAR_PALETTES, COLORS, RADIUS, TYPOGRAPHY } from "../constants/theme.ts";

export type AvatarProps = {
  name: string;
  size?: number;
  highlight?: boolean;
};

// Simple deterministic string hash to select a consistent palette
function getPalette(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 44,
  highlight = false,
}) => {
  const initial = (name.trim()[0] || "?").toUpperCase();
  const palette = getPalette(name);

  const bg = highlight ? COLORS.primary : palette.bg;
  const textColor = highlight ? "#FFFFFF" : palette.text;
  const borderColor = highlight ? COLORS.primaryDark : palette.border;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: RADIUS.full,
          backgroundColor: bg,
          borderColor: borderColor,
          borderWidth: 1.5,
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
            fontSize: Math.round(size * 0.42),
            color: textColor,
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
    fontWeight: "800",
  },
});

