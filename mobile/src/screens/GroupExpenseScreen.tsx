import React, { useRef, useState } from "react";
import { FlatList, View, Text, StyleSheet } from "react-native";
import * as Crypto from "expo-crypto";
import type { CloudRepository } from "../cloud/repository.ts";
import type { GroupSnapshot } from "../cloud/contracts.ts";
import type { Expense } from "../types/expense.ts";
import { prepareExpense, type ExpenseDraft } from "../cloud/expenseDraft.ts";
import { useAction } from "../cloud/hooks.ts";
import {
  parseInrToMinor,
  formatMinorAsInr,
  MoneyValidationError,
} from "../utils/money.ts";
import { splitEqually } from "../utils/split.ts";
import {
  redistributeCustomShares,
  evaluateCustomSplit,
} from "../state/splitLogic.ts";
import { CustomAmountRow } from "../components/CustomAmountRow.tsx";
import { Avatar } from "../components/Avatar.tsx";
import {
  PageShell,
  Field,
  Choice,
  Notice,
  currency,
} from "../components/CloudUI.tsx";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import { SecondaryButton } from "../components/SecondaryButton.tsx";
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../constants/theme.ts";

export function GroupExpenseScreen({
  repository,
  group,
  back,
  done,
}: {
  repository: CloudRepository;
  group: GroupSnapshot;
  back: () => void;
  done: () => void;
}) {
  const active = group.people.filter((p) => p.active);
  const [key] = useState(Crypto.randomUUID);
  const [draft, setDraft] = useState<ExpenseDraft>({
    description: "",
    total: "",
    selected: active.map((p) => p.id),
    payerId: active.find((p) => p.user_id === repository.userId)?.id ?? "",
    multiplePayers: false,
    paid: {},
    method: "equal",
    owed: {},
    pinned: {},
  });
  const current = useRef(draft);
  current.current = draft;
  const [review, setReview] = useState<Expense | null>(null),
    [attempted, setAttempted] = useState(false);
  const [validation, setValidation] = useState<string | null>(null),
    action = useAction();
  const selectedPeople = (d: ExpenseDraft) =>
    active
      .filter((p) => d.selected.includes(p.id))
      .map((p) => ({ id: p.id, name: p.name }));

  function resetEqual() {
    try {
      const d = current.current,
        shares = splitEqually(
          parseInrToMinor(d.total),
          d.selected.map((id) => ({ id })),
        );
      setDraft({
        ...d,
        owed: Object.fromEntries(
          shares.map((s) => [s.personId, formatMinorAsInr(s.shareMinor)]),
        ),
        pinned: {},
      });
      setValidation(null);
    } catch {
      setValidation(
        "Enter a valid total and select at least one person first.",
      );
    }
  }

  function method(value: "equal" | "custom") {
    if (current.current.method === value) return;
    if (value === "equal") {
      setDraft((d) => ({ ...d, method: value, owed: {}, pinned: {} }));
      return;
    }
    try {
      const d = current.current,
        shares = splitEqually(
          parseInrToMinor(d.total),
          d.selected.map((id) => ({ id })),
        );
      setDraft({
        ...d,
        method: value,
        owed: Object.fromEntries(
          shares.map((s) => [s.personId, formatMinorAsInr(s.shareMinor)]),
        ),
        pinned: {},
      });
      setValidation(null);
    } catch {
      setValidation(
        "Enter a valid total and select people before choosing Custom.",
      );
    }
  }

  function commit(id: string, value: string, pinned = true) {
    setDraft((d) => {
      const owed = { ...d.owed, [id]: value },
        pins = { ...d.pinned, [id]: pinned };
      try {
        return {
          ...d,
          pinned: pins,
          owed: redistributeCustomShares(
            parseInrToMinor(d.total),
            selectedPeople(d),
            owed,
            pins,
          ).newInputs,
        };
      } catch {
        return { ...d, owed, pinned: pins };
      }
    });
  }

  let valid: Expense | null = null,
    remainder = "";
  try {
    valid = prepareExpense(draft, group, key);
  } catch {
    /* Validated again by the action, never trust disabled UI. */
  }

  if (draft.method === "custom") {
    try {
      const result = evaluateCustomSplit(
        parseInrToMinor(draft.total),
        selectedPeople(draft),
        draft.owed,
        draft.pinned,
      );
      const r = result.reconciliation;
      remainder =
        result.hasInvalidFormat || !r
          ? "Use valid amounts with up to two decimals."
          : r.isReconciled
            ? "Shares match the total."
            : `${currency(Math.abs(r.remainingMinor))} ${r.remainingMinor > 0 ? "left to assign" : "over the total"}`;
    } catch {
      remainder = "Check the total and share amounts.";
    }
  }

  const personName = (id: string) =>
    group.people.find((p) => p.id === id)?.name ?? "Unknown person";

  if (review)
    return (
      <PageShell title="Review expense" subtitle={group.name} back={back}>
        <View style={styles.reviewReceiptCard}>
          <View style={styles.receiptTopHeader}>
            <Text style={styles.receiptBrand}>✦ DUESHARE EXPENSE</Text>
            <Text style={styles.receiptDescription}>{review.description}</Text>
            <Text style={styles.receiptTotalAmount}>{currency(review.totalMinor)}</Text>
          </View>

          <View style={styles.receiptDivider} />

          <View style={styles.receiptSection}>
            <Text style={styles.receiptSectionTitle}>Paid by</Text>
            {review.payments.map((p) => (
              <View key={p.payerId} style={styles.receiptRow}>
                <View style={styles.receiptPersonRow}>
                  <Avatar name={personName(p.payerId)} size={28} />
                  <Text style={styles.receiptPersonName}>{personName(p.payerId)}</Text>
                </View>
                <Text style={styles.receiptAmount}>{currency(p.amountMinor)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.receiptDivider} />

          <View style={styles.receiptSection}>
            <Text style={styles.receiptSectionTitle}>Each person's share</Text>
            {review.shares.map((s) => (
              <View key={s.personId} style={styles.receiptRow}>
                <View style={styles.receiptPersonRow}>
                  <Avatar name={personName(s.personId)} size={28} />
                  <Text style={styles.receiptPersonName}>{personName(s.personId)}</Text>
                </View>
                <Text style={styles.receiptAmount}>{currency(s.amountMinor)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.receiptPerforation}>
            <View style={styles.perforationHoleLeft} />
            <View style={styles.perforationLine} />
            <View style={styles.perforationHoleRight} />
          </View>

          <Text style={styles.receiptNoticeText}>
            This saves a shared expense. It does not move money.
          </Text>
        </View>

        <Notice message={validation ?? action.error} />

        <PrimaryButton
          title={attempted ? "Retry this save" : "Save expense"}
          loading={action.busy}
          onPress={() =>
            void action.run(async () => {
              const latest = prepareExpense(current.current, group, key);
              if (JSON.stringify(latest) !== JSON.stringify(review))
                throw new MoneyValidationError("Review changed");
              const fresh = await repository.group(group.id);
              const expense = prepareExpense(current.current, fresh, key);
              if (JSON.stringify(expense) !== JSON.stringify(review))
                throw new MoneyValidationError("Review changed during refresh");
              setAttempted(true);
              await repository.saveExpense(
                expense,
                fresh.people.filter((p) => p.active).map((p) => p.id),
                key,
              );
            }, done)
          }
        />

        {!attempted && (
          <SecondaryButton
            title="Edit expense"
            disabled={action.busy}
            onPress={() => setReview(null)}
          />
        )}

        {attempted && (
          <Text style={styles.helperNotice}>
            Keep this request unchanged when retrying. If you leave, check
            History before creating another expense.
          </Text>
        )}
      </PageShell>
    );

  return (
    <PageShell
      title="Add expense"
      subtitle={group.name}
      back={back}
      scroll={false}
    >
      <FlatList
        data={active}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        initialNumToRender={8}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.billInputCard}>
              <Field
                label="What was it for?"
                value={draft.description}
                onChangeText={(description) =>
                  setDraft((d) => ({ ...d, description }))
                }
                maxLength={500}
                placeholder="Dinner, groceries, train tickets…"
              />
              <Field
                label="Total bill · INR"
                value={draft.total}
                onChangeText={(total) => setDraft((d) => ({ ...d, total }))}
                keyboardType="decimal-pad"
                maxLength={18}
                placeholder="0.00"
              />
            </View>

            <View style={styles.configCard}>
              <Text style={styles.configLabel}>WHO PAID?</Text>
              <View style={styles.toggleRow}>
                <Choice
                  title="One payer"
                  selected={!draft.multiplePayers}
                  onPress={() =>
                    setDraft((d) => ({ ...d, multiplePayers: false }))
                  }
                />
                <Choice
                  title="Multiple payers"
                  selected={draft.multiplePayers}
                  onPress={() =>
                    setDraft((d) => ({ ...d, multiplePayers: true }))
                  }
                />
              </View>

              <Text style={[styles.configLabel, { marginTop: SPACING.xs }]}>
                HOW IS IT SHARED?
              </Text>
              <View style={styles.toggleRow}>
                <Choice
                  title="Equal"
                  selected={draft.method === "equal"}
                  onPress={() => method("equal")}
                />
                <Choice
                  title="Custom"
                  selected={draft.method === "custom"}
                  onPress={() => method("custom")}
                />
              </View>

              <Text style={styles.helperNotice}>
                {draft.method === "custom"
                  ? "Editing then tapping Done pins an amount; the rest redistributes. Switch to Equal before changing people; that clears pins."
                  : "Include everyone who shares the cost. The payer can have no share."}
              </Text>

              {draft.method === "custom" && (
                <View style={styles.customReconciliationBox}>
                  <SecondaryButton
                    title="Reset shares to equal"
                    onPress={resetEqual}
                  />
                  <Text style={styles.remainderNoticeText}>{remainder}</Text>
                </View>
              )}
            </View>

            <Notice message={validation} />

            <Text style={styles.membersSectionTitle}>
              PARTICIPANTS ({active.length})
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = draft.selected.includes(item.id);

          return (
            <View
              style={[
                styles.memberCard,
                isSelected && styles.memberCardSelected,
              ]}
            >
              <View style={styles.memberTopRow}>
                <Avatar name={item.name} size={36} />
                <View style={{ flex: 1 }}>
                  <Choice
                    title={`${isSelected ? "Included" : "Not included"}: ${item.name}`}
                    selected={isSelected}
                    disabled={draft.method === "custom"}
                    onPress={() =>
                      setDraft((d) => ({
                        ...d,
                        selected: d.selected.includes(item.id)
                          ? d.selected.filter((id) => id !== item.id)
                          : active
                              .filter(
                                (p) =>
                                  d.selected.includes(p.id) || p.id === item.id,
                              )
                              .map((p) => p.id),
                      }))
                    }
                  />
                </View>
              </View>

              {draft.multiplePayers ? (
                <View style={styles.payerInputArea}>
                  <Field
                    label={`Paid by ${item.name} · INR`}
                    value={draft.paid[item.id] ?? ""}
                    onChangeText={(v) =>
                      setDraft((d) => ({
                        ...d,
                        paid: { ...d.paid, [item.id]: v },
                      }))
                    }
                    keyboardType="decimal-pad"
                    maxLength={18}
                    placeholder="0.00"
                  />
                </View>
              ) : (
                <View style={{ marginTop: 2 }}>
                  <Choice
                    title={`Paid by ${item.name}`}
                    selected={draft.payerId === item.id}
                    onPress={() => setDraft((d) => ({ ...d, payerId: item.id }))}
                  />
                </View>
              )}

              {draft.method === "custom" && isSelected && (
                <View style={styles.customRowWrapper}>
                  <CustomAmountRow
                    name={item.name}
                    value={draft.owed[item.id] ?? ""}
                    isPinned={!!draft.pinned[item.id]}
                    onChangeValue={(v) =>
                      setDraft((d) => ({
                        ...d,
                        owed: { ...d.owed, [item.id]: v },
                      }))
                    }
                    onCommitValue={(v) => commit(item.id, v)}
                    onTogglePin={() =>
                      commit(
                        item.id,
                        current.current.owed[item.id] ?? "0",
                        false,
                      )
                    }
                    maxLength={18}
                  />
                </View>
              )}
            </View>
          );
        }}
      />

      <View style={styles.bottomBar}>
        <Text style={styles.statusHelperText}>
          {valid
            ? "✓ Payments and shares match."
            : "Payments and shares must each match the total."}
        </Text>
        <PrimaryButton
          title="Review expense"
          disabled={!valid}
          onPress={() => {
            try {
              setReview(prepareExpense(current.current, group, key));
              setValidation(null);
            } catch {
              setValidation(
                "Check the total, people, payments and shares before reviewing.",
              );
            }
          }}
        />
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.huge,
    gap: SPACING.md,
  },
  headerBlock: {
    gap: SPACING.md,
  },
  billInputCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.subtle,
  },
  configCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.sm,
    ...SHADOWS.subtle,
  },
  configLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 0.8,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  helperNotice: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  customReconciliationBox: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  remainderNoticeText: {
    ...TYPOGRAPHY.secondaryMedium,
    color: COLORS.electricMint,
    fontWeight: "600",
  },
  membersSectionTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginTop: SPACING.xs,
  },
  memberCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.subtle,
  },
  memberCardSelected: {
    borderColor: COLORS.primaryLight,
  },
  memberTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  payerInputArea: {
    marginTop: 2,
  },
  customRowWrapper: {
    marginTop: SPACING.xs,
  },
  bottomBar: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
    ...SHADOWS.raised,
  },
  statusHelperText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  reviewReceiptCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    padding: SPACING.xl,
    gap: SPACING.md,
    ...SHADOWS.card,
  },
  receiptTopHeader: {
    alignItems: "center",
    gap: 4,
  },
  receiptBrand: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.primary,
  },
  receiptDescription: {
    ...TYPOGRAPHY.screenTitle,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  receiptTotalAmount: {
    ...TYPOGRAPHY.numericHero,
    fontSize: 36,
    lineHeight: 44,
    color: COLORS.electricMint,
    fontVariant: ["tabular-nums"],
  },
  receiptDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
  receiptSection: {
    gap: SPACING.xs,
  },
  receiptSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  receiptRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  receiptPersonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  receiptPersonName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
  },
  receiptAmount: {
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
  receiptNoticeText: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textTertiary,
    fontSize: 13,
    textAlign: "center",
  },
});

