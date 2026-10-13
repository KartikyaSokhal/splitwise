import React, { useCallback } from "react";
import { FlatList, Pressable, View, Text, StyleSheet } from "react-native";
import type { CloudRepository } from "../cloud/repository.ts";
import type { Cursor, HistoryEvent } from "../cloud/contracts.ts";
import { usePage } from "../cloud/hooks.ts";
import {
  PageShell,
  Notice,
  Empty,
  Loading,
  currency,
  dateLabel,
  ui,
} from "../components/CloudUI.tsx";
import { SecondaryButton } from "../components/SecondaryButton.tsx";
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../constants/theme.ts";

export function HistoryList({
  repository,
  groupId,
  open,
}: {
  repository: CloudRepository;
  groupId: string | null;
  open: (event: HistoryEvent) => void;
  }) {
  const page = usePage(
    useCallback(
      (c: Cursor | null) => repository.history(groupId, c),
      [repository, groupId],
    ),
  );

  return (
    <FlatList
      data={page.loading ? [] : (page.data?.items ?? [])}
      keyExtractor={(e) => `${e.kind}:${e.id}`}
      contentContainerStyle={ui.content}
      ListHeaderComponent={<Notice message={page.error} retry={page.newest} />}
      ListEmptyComponent={
        page.loading ? (
          <Loading />
        ) : !page.error ? (
          <Empty
            title={
              page.older ? "You're at the beginning" : "No saved activity yet"
            }
          >
            {groupId
              ? "Add an expense to start this group's shared record."
              : "Expenses and repayments from your groups appear here. Guest Quick Splits are not saved."}
          </Empty>
        ) : null
      }
      renderItem={({ item }) => {
        const isExpense = item.kind === "expense";
        const isRepayment = item.kind === "repayment";
        const isVoid = item.kind === "void";
        const isReversal = item.kind === "reversal";
        const isCorrected = item.corrected;

        const kindBadgeText = isRepayment
          ? "Repayment recorded"
          : isVoid
            ? "Expense voided"
            : isReversal
              ? "Repayment reversed"
              : "Expense";

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.title}, ${currency(item.amountMinor)}, ${item.kind}${item.corrected ? ", corrected" : ""}`}
            onPress={() => open(item)}
            style={({ pressed }) => [
              styles.activityCard,
              isCorrected && styles.activityCardCorrected,
              pressed && styles.activityCardPressed,
            ]}
          >
            <View style={styles.topRow}>
              {!groupId && item.group_name ? (
                <Text style={styles.groupNameTag}>{item.group_name}</Text>
              ) : null}

              <View
                style={[
                  styles.kindBadge,
                  isRepayment && styles.kindBadgeRepayment,
                  (isVoid || isReversal) && styles.kindBadgeVoid,
                ]}
              >
                <Text
                  style={[
                    styles.kindBadgeText,
                    isRepayment && styles.kindBadgeTextRepayment,
                    (isVoid || isReversal) && styles.kindBadgeTextVoid,
                  ]}
                >
                  {kindBadgeText}
                </Text>
              </View>
            </View>

            <View style={styles.mainRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={[
                    styles.activityTitle,
                    isCorrected && styles.activityTitleCorrected,
                  ]}
                >
                  {item.title}
                </Text>
                <Text style={styles.dateText}>
                  {dateLabel(item.created_at)}
                  {isExpense ? ` · ${item.participant_count} people` : ""}
                </Text>
              </View>

              <Text
                style={[
                  styles.amountText,
                  isRepayment && styles.amountTextRepayment,
                  (isVoid || isReversal || isCorrected) && styles.amountTextCorrected,
                ]}
              >
                {currency(item.amountMinor)}
              </Text>
            </View>

            {isExpense && item.payer && (
              <View style={styles.payerBox}>
                <Text style={styles.payerText}>
                  Paid by <Text style={{ fontWeight: "700" }}>{item.payer}</Text>
                </Text>
              </View>
            )}

            {isCorrected && (isExpense || isRepayment) && (
              <View style={styles.correctedWarningBox}>
                <Text style={styles.correctedWarningText}>
                  {isExpense
                    ? "Voided · excluded from balances"
                    : "Reversed · excluded from balances"}
                </Text>
              </View>
            )}
          </Pressable>
        );
      }}
      ListFooterComponent={
        <View style={styles.footerButtons}>
          <SecondaryButton
            title={page.older ? "Back to newest activity" : "Refresh activity"}
            onPress={page.newest}
            disabled={page.loading}
          />
          {page.data?.next && (
            <SecondaryButton
              title="Older activity"
              onPress={page.next}
              disabled={page.loading}
            />
          )}
        </View>
      }
    />
  );
}

export function HistoryScreen({
  repository,
  back,
  open,
}: {
  repository: CloudRepository;
  back: () => void;
  open: (event: HistoryEvent) => void;
}) {
  return (
    <PageShell
      title="Recent activity"
      subtitle="Your groups' shared record. Newest first."
      back={back}
      scroll={false}
    >
      <HistoryList repository={repository} groupId={null} open={open} />
    </PageShell>
  );
}

const styles = StyleSheet.create({
  activityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.sm,
    ...SHADOWS.subtle,
  },
  activityCardCorrected: {
    backgroundColor: COLORS.surfaceMuted,
    opacity: 0.8,
  },
  activityCardPressed: {
    transform: [{ scale: 0.985 }],
    borderColor: COLORS.primaryLight,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  groupNameTag: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primaryDark,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  kindBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  kindBadgeRepayment: {
    backgroundColor: COLORS.successLight,
  },
  kindBadgeVoid: {
    backgroundColor: COLORS.errorLight,
  },
  kindBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primaryDark,
    letterSpacing: 0.4,
  },
  kindBadgeTextRepayment: {
    color: COLORS.successText,
  },
  kindBadgeTextVoid: {
    color: COLORS.errorText,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  activityTitle: {
    ...TYPOGRAPHY.section,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  activityTitleCorrected: {
    textDecorationLine: "line-through",
    color: COLORS.textSecondary,
  },
  dateText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  amountText: {
    ...TYPOGRAPHY.section,
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  amountTextRepayment: {
    color: COLORS.successText,
  },
  amountTextCorrected: {
    textDecorationLine: "line-through",
    color: COLORS.textSecondary,
  },
  payerBox: {
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    alignSelf: "flex-start",
  },
  payerText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  correctedWarningBox: {
    backgroundColor: COLORS.errorLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    alignSelf: "flex-start",
  },
  correctedWarningText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.errorText,
    fontWeight: "600",
  },
  footerButtons: {
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
});

