import React, { useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import * as Crypto from "expo-crypto";
import type { CloudRepository } from "../cloud/repository.ts";
import type { GroupSnapshot } from "../cloud/contracts.ts";
import type { SuggestedTransfer } from "../types/settlement.ts";
import { useAction } from "../cloud/hooks.ts";
import {
  formatMinorAsInr,
  parseInrToMinor,
  MoneyValidationError,
} from "../utils/money.ts";
import { Avatar } from "../components/Avatar.tsx";
import {
  PageShell,
  Field,
  Choice,
  Notice,
  currency,
} from "../components/CloudUI.tsx";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../constants/theme.ts";

export function RepaymentScreen({
  repository,
  group,
  transfer,
  back,
  done,
}: {
  repository: CloudRepository;
  group: GroupSnapshot;
  transfer: SuggestedTransfer;
  back: () => void;
  done: () => void;
}) {
  const [key] = useState(Crypto.randomUUID),
    action = useAction();
  const [amount, setAmount] = useState(formatMinorAsInr(transfer.amountMinor)),
    [confirmed, setConfirmed] = useState(false),
    [attempt, setAttempt] = useState<number | null>(null);
  const latest = useRef({ amount, confirmed });
  latest.current = { amount, confirmed };
  const to = group.people.find((p) => p.id === transfer.toPersonId)?.name ?? "Creditor";

  return (
    <PageShell title="Record a repayment" subtitle={group.name} back={back}>
      <View style={styles.container}>
        {/* Transfer Visual Card */}
        <View style={styles.transferCard}>
          <Text style={styles.transferCardHeader}>DIRECTED SETTLEMENT</Text>

          <View style={styles.transferVisualRow}>
            <View style={styles.participantColumn}>
              <Avatar name="You" size={48} />
              <Text style={styles.participantName}>You</Text>
              <Text style={styles.participantSubtext}>Debtor</Text>
            </View>

            <View style={styles.arrowColumn}>
              <Text style={styles.arrowText}>→</Text>
              <View style={styles.paysBadge}>
                <Text style={styles.paysBadgeText}>REPAID</Text>
              </View>
            </View>

            <View style={styles.participantColumn}>
              <Avatar name={to} size={48} />
              <Text style={styles.participantName} numberOfLines={1}>
                {to}
              </Text>
              <Text style={styles.participantSubtext}>Creditor</Text>
            </View>
          </View>

          <View style={styles.amountHeroBlock}>
            <Text style={styles.amountHeroCaption}>SUGGESTED SETTLEMENT AMOUNT</Text>
            <Text style={styles.amountHeroValue}>
              {currency(transfer.amountMinor)}
            </Text>
            <Text style={styles.amountHeroSubtext}>
              Suggested by debt-simplification. You may record a smaller repayment.
            </Text>
          </View>
        </View>

        {/* Amount Input Card */}
        <View style={styles.inputCard}>
          <Field
            label="Amount you repaid · INR"
            value={amount}
            onChangeText={setAmount}
            editable={attempt === null && !action.busy}
            keyboardType="decimal-pad"
            maxLength={18}
          />
        </View>

        {/* Trust Notice */}
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxIcon}>ℹ</Text>
          <Text style={styles.infoBoxText}>
            This records money you already paid outside DueShare. It does not send
            money, make a UPI transfer, or verify bank transactions.
          </Text>
        </View>

        {/* Confirmation Choice */}
        <View style={styles.confirmationBox}>
          <Choice
            title="I have already repaid this amount"
            selected={confirmed}
            disabled={attempt !== null || action.busy}
            onPress={() => setConfirmed((v) => !v)}
          />
        </View>

        <Notice message={action.error} />

        <PrimaryButton
          title={
            attempt === null ? "Record repayment" : "Retry this repayment record"
          }
          disabled={!confirmed}
          loading={action.busy}
          onPress={() =>
            void action.run(async () => {
              const now = latest.current;
              if (!now.confirmed)
                throw new MoneyValidationError("Confirm repayment first.");
              const minor = attempt ?? parseInrToMinor(now.amount);
              if (!minor || minor > transfer.amountMinor)
                throw new MoneyValidationError("Repayment exceeds suggestion.");
              const fresh = await repository.group(group.id);
              if (
                latest.current.amount !== now.amount ||
                !latest.current.confirmed
              )
                throw new MoneyValidationError(
                  "Repayment changed during refresh.",
                );
              const sender = fresh.people.find(
                (p) => p.id === transfer.fromPersonId,
              );
              if (
                fresh.archived ||
                !sender?.active ||
                sender.user_id !== repository.userId ||
                !fresh.people.some(
                  (p) => p.id === transfer.toPersonId && p.active,
                )
              )
                throw new MoneyValidationError("Membership changed.");
              if (attempt === null) {
                const debt = -(
                  fresh.balances.find((b) => b.personId === transfer.fromPersonId)
                    ?.balanceMinor ?? 0
                );
                const credit =
                  fresh.balances.find((b) => b.personId === transfer.toPersonId)
                    ?.balanceMinor ?? 0;
                if (minor > debt || minor > credit)
                  throw new MoneyValidationError(
                    "Balances changed. Refresh before recording.",
                  );
              }
              setAttempt(minor);
              await repository.repay(
                group.id,
                key,
                transfer.fromPersonId,
                transfer.toPersonId,
                minor,
              );
            }, done)
          }
        />
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.lg,
  },
  transferCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    gap: SPACING.lg,
    ...SHADOWS.card,
  },
  transferCardHeader: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.primary,
    textAlign: "center",
  },
  transferVisualRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  participantColumn: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  participantName: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  participantSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  arrowColumn: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.sm,
  },
  arrowText: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.primary,
  },
  paysBadge: {
    backgroundColor: COLORS.deepForest,
    borderWidth: 1,
    borderColor: COLORS.freshGreen,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  paysBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.electricMint,
    letterSpacing: 0.5,
  },
  amountHeroBlock: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: "center",
    gap: 4,
  },
  amountHeroCaption: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: COLORS.textSecondary,
  },
  amountHeroValue: {
    ...TYPOGRAPHY.numericHero,
    fontSize: 34,
    lineHeight: 42,
    color: COLORS.electricMint,
    fontVariant: ["tabular-nums"],
  },
  amountHeroSubtext: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textTertiary,
    fontSize: 12,
    textAlign: "center",
    marginTop: 2,
  },
  inputCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    ...SHADOWS.subtle,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    alignItems: "flex-start",
  },
  infoBoxIcon: {
    fontSize: 16,
    color: COLORS.electricMint,
    marginTop: 1,
  },
  infoBoxText: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  confirmationBox: {
    gap: SPACING.xs,
  },
});

