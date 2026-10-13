import React, { useCallback, useState } from "react";
import { Alert, View, Text, StyleSheet } from "react-native";
import type { CloudRepository } from "../cloud/repository.ts";
import type { HistoryEvent } from "../cloud/contracts.ts";
import { useAction, useResource } from "../cloud/hooks.ts";
import { Avatar } from "../components/Avatar.tsx";
import {
  PageShell,
  Field,
  Notice,
  Loading,
  currency,
  dateLabel,
} from "../components/CloudUI.tsx";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../constants/theme.ts";

export function ActivityDetailScreen({
  repository,
  event,
  back,
  done,
}: {
  repository: CloudRepository;
  event: HistoryEvent;
  back: () => void;
  done: () => void;
}) {
  const [reason, setReason] = useState(""),
    action = useAction();
  const resource = useResource(
    useCallback(
      async () => ({
        group: await repository.group(event.group_id),
        expense:
          event.kind === "expense" || event.kind === "void"
            ? await repository.expense(event.group_id, event.id)
            : null,
        settlement:
          event.kind === "repayment" || event.kind === "reversal"
            ? await repository.settlement(event.group_id, event.id)
            : null,
      }),
      [repository, event],
    ),
  );
  const g = resource.data?.group,
    e = resource.data?.expense,
    s = resource.data?.settlement;
  const admin = g?.people.some(
    (p) => p.user_id === repository.userId && p.active && p.role === "admin",
  );
  const corrected = event.corrected || !!e?.reason || !!s?.reason;
  const correctable =
    (event.kind === "expense" || event.kind === "repayment") &&
    !corrected &&
    !!g &&
    !g.archived &&
    (admin || event.actor_id === repository.userId);

  return (
    <PageShell
      title={
        event.kind === "expense"
          ? "Expense details"
          : event.kind === "repayment"
            ? "Repayment record"
            : "Correction details"
      }
      back={back}
    >
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <Notice message={resource.error} retry={() => void resource.reload()} />
      ) : (
        <View style={styles.container}>
          {/* Receipt card */}
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <View style={styles.kindBadge}>
                <Text style={styles.kindBadgeText}>
                  {event.kind === "expense"
                    ? "EXPENSE RECORD"
                    : event.kind === "repayment"
                      ? "REPAYMENT RECORD"
                      : "AUDIT CORRECTION"}
                </Text>
              </View>
              <Text style={styles.detailTitle}>{event.title}</Text>
              <Text style={styles.detailMeta}>
                {event.group_name} · {dateLabel(event.created_at)}
              </Text>
              <Text style={styles.detailAmount}>{currency(event.amountMinor)}</Text>
            </View>

            {event.kind === "repayment" && (
              <View style={styles.calloutBox}>
                <Text style={styles.calloutText}>
                  Sender-reported bookkeeping, not proof of a bank payment.
                </Text>
              </View>
            )}

            {(event.reason || e?.reason || s?.reason) && (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>CORRECTION REASON</Text>
                <Text style={styles.reasonText}>
                  {event.reason ?? e?.reason ?? s?.reason}
                </Text>
              </View>
            )}

            {corrected && (
              <View style={styles.correctedNoticeBox}>
                <Text style={styles.correctedNoticeText}>
                  This original entry has been corrected and is excluded from
                  balances.
                </Text>
              </View>
            )}

            {e && (
              <>
                <View style={styles.receiptDivider} />

                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeaderTitle}>Paid by</Text>
                  {e.payments.map((p) => (
                    <View key={p.id} style={styles.personShareRow}>
                      <View style={styles.personInfoRow}>
                        <Avatar name={p.name} size={28} />
                        <Text style={styles.personName}>{p.name}</Text>
                      </View>
                      <Text style={styles.personAmount}>
                        {currency(p.amountMinor)}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.receiptDivider} />

                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeaderTitle}>Each person's share</Text>
                  {e.shares.map((p) => (
                    <View key={p.id} style={styles.personShareRow}>
                      <View style={styles.personInfoRow}>
                        <Avatar name={p.name} size={28} />
                        <Text style={styles.personName}>{p.name}</Text>
                      </View>
                      <Text style={styles.personAmount}>
                        {currency(p.amountMinor)}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <View style={styles.receiptPerforation}>
              <View style={styles.perforationHoleLeft} />
              <View style={styles.perforationLine} />
              <View style={styles.perforationHoleRight} />
            </View>
          </View>

          {/* Correction Section */}
          {correctable && (
            <View style={styles.correctionCard}>
              <Text style={styles.correctionTitle}>Need to correct this?</Text>
              <Text style={styles.correctionSubtitle}>
                {event.kind === "expense"
                  ? "Void this expense, then add a corrected expense separately. Both records remain in history."
                  : "Reverse this record if it is wrong. The original record remains in history."}
              </Text>
              <Field
                label="Reason for correction"
                value={reason}
                onChangeText={setReason}
                maxLength={500}
                placeholder="Explain what is being corrected…"
              />
              <Notice message={action.error} />
              <PrimaryButton
                title={
                  event.kind === "expense"
                    ? "Void expense…"
                    : "Reverse repayment…"
                }
                disabled={!reason.trim()}
                loading={action.busy}
                onPress={() =>
                  Alert.alert(
                    "Confirm correction?",
                    "This will change balances and keep an auditable correction in shared history. It does not reverse any bank payment.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Confirm correction",
                        onPress: () =>
                          void action.run(
                            () =>
                              repository.correct(
                                event.group_id,
                                event.id,
                                event.kind as "expense" | "repayment",
                                reason,
                              ),
                            done,
                          ),
                      },
                    ],
                  )
                }
              />
            </View>
          )}
        </View>
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.lg,
  },
  detailCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    padding: SPACING.xl,
    gap: SPACING.md,
    ...SHADOWS.card,
  },
  detailHeader: {
    alignItems: "center",
    gap: 4,
  },
  kindBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    marginBottom: 2,
  },
  kindBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primaryDark,
    letterSpacing: 0.8,
  },
  detailTitle: {
    ...TYPOGRAPHY.screenTitle,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  detailMeta: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textTertiary,
  },
  detailAmount: {
    ...TYPOGRAPHY.numericHero,
    fontSize: 34,
    lineHeight: 42,
    color: COLORS.primaryDark,
    fontVariant: ["tabular-nums"],
    marginTop: SPACING.xs,
  },
  calloutBox: {
    backgroundColor: COLORS.surfaceMuted,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calloutText: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: "center",
  },
  reasonBox: {
    backgroundColor: COLORS.warningLight,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
    gap: 2,
  },
  reasonLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.warningText,
    letterSpacing: 0.5,
  },
  reasonText: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.warningText,
    fontWeight: "500",
  },
  correctedNoticeBox: {
    backgroundColor: COLORS.errorLight,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
  },
  correctedNoticeText: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.errorText,
    fontWeight: "600",
    textAlign: "center",
  },
  receiptDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
  sectionBlock: {
    gap: SPACING.xs,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  personShareRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  personInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  personName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
  },
  personAmount: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: "700",
    color: COLORS.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  receiptPerforation: {
    height: 20,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: -SPACING.xl,
    marginVertical: SPACING.xs,
  },
  perforationHoleLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    marginLeft: -10,
  },
  perforationLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
  },
  perforationHoleRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    marginRight: -10,
  },
  correctionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.subtle,
  },
  correctionTitle: {
    ...TYPOGRAPHY.section,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  correctionSubtitle: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

