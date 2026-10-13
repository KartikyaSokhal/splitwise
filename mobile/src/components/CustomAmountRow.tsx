import React, { useRef } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "../constants/theme.ts";
import { Avatar } from "./Avatar.tsx";

export type CustomAmountRowProps = {
  name: string;
  isYou?: boolean;
  value: string;
  onChangeValue: (val: string) => void;
  onCommitValue?: (value: string) => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  percentOfTotal?: number;
  maxLength?: number;
};

export const CustomAmountRow: React.FC<CustomAmountRowProps> = ({
  name,
  isYou = false,
  value,
  onChangeValue,
  onCommitValue,
  isPinned = false,
  onTogglePin,
  percentOfTotal,
  maxLength = 12,
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const draft = useRef(value);
  const initial = useRef(value);
  const dirty = useRef(false);
  const commit = () => {
    if (!dirty.current) return;
    dirty.current = false; // Done followed by blur is one commit.
    initial.current = draft.current;
    onCommitValue?.(draft.current);
  };
  return (
    <View style={[styles.card, isPinned && styles.cardPinned]}>
      <Avatar name={name} size={44} highlight={isYou} />

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {isYou ? (
            <View style={styles.youBadge}>
              <Text style={styles.youText}>YOU</Text>
            </View>
          ) : null}
          {isPinned ? (
            <TouchableOpacity
              onPress={onTogglePin}
              style={styles.pinnedBadge}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Unpin ${name}'s amount`}
              accessibilityHint="Unpins this participant and redistributes their share"
            >
              <Text style={styles.pinnedBadgeText}>🔒 Edited</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.autoBadge}>
              <Text style={styles.autoBadgeText}>⚡ Auto</Text>
            </View>
          )}
        </View>
        <Text style={styles.percentText}>
          {percentOfTotal !== undefined && !Number.isNaN(percentOfTotal)
            ? `${Math.round(percentOfTotal)}% of bill`
            : "—"}
        </Text>
      </View>

      <View
        style={[
          styles.inputWrapper,
          isPinned ? styles.inputWrapperPinned : null,
          isFocused ? styles.inputWrapperFocused : null,
        ]}
      >
        <Text
          style={[
            styles.currencyPrefix,
            isPinned ? styles.currencyPrefixPinned : null,
          ]}
        >
          ₹
        </Text>
        <TextInput
          value={value}
          onFocus={() => {
            setIsFocused(true);
            initial.current = value;
            draft.current = value;
            dirty.current = false;
          }}
          onChangeText={(text) => {
            draft.current = text;
            dirty.current = text !== initial.current;
            onChangeValue(text);
          }}
          onBlur={() => {
            setIsFocused(false);
            commit();
          }}
          onSubmitEditing={() => {
            setIsFocused(false);
            commit();
          }}
          returnKeyType="done"
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={COLORS.textMuted}
          accessible={true}
          accessibilityLabel={`Amount for ${name}`}
          style={[styles.input, isPinned && styles.inputPinned]}
          maxLength={maxLength}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.subtle,
  },
  cardPinned: {
    borderColor: COLORS.warning,
    backgroundColor: COLORS.surfaceRaised,
  },
  info: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  nameRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: SPACING.xs,
  },
  name: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: "700",
    maxWidth: "70%",
    fontSize: 16,
  },
  youBadge: {
    backgroundColor: COLORS.deepForest,
    borderWidth: 1,
    borderColor: COLORS.freshGreen,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  youText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.electricMint,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  percentText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontSize: 13,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    minWidth: 115,
    minHeight: 48,
  },
  inputWrapperPinned: {
    backgroundColor: COLORS.warningLight,
    borderColor: COLORS.warningBorder,
  },
  inputWrapperFocused: {
    borderColor: COLORS.electricMint,
    backgroundColor: COLORS.surface,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.freshGreen,
    marginRight: 4,
  },
  currencyPrefixPinned: {
    color: COLORS.warningText,
  },
  input: {
    ...TYPOGRAPHY.bodyMedium,
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "right",
    padding: 0,
    fontVariant: ["tabular-nums"],
  },
  inputPinned: {
    color: COLORS.warningText,
  },
  pinnedBadge: {
    minHeight: 32,
    justifyContent: "center",
    backgroundColor: COLORS.warningLight,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  pinnedBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.warningText,
    fontSize: 11,
  },
  autoBadge: {
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  autoBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
});

