import React from "react";
import { Alert, View, Text, StyleSheet } from "react-native";
import type { CloudRepository } from "../cloud/repository.ts";
import type { PendingSave } from "../cloud/recovery.ts";
import { useAction } from "../cloud/hooks.ts";
import { PageShell, Notice } from "../components/CloudUI.tsx";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import { SecondaryButton } from "../components/SecondaryButton.tsx";
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../constants/theme.ts";

export function SaveRecoveryScreen({
  repository,
  pending,
  back,
  history,
  done,
}: {
  repository: CloudRepository;
  pending: PendingSave;
  back: () => void;
  history: () => void;
  done: () => void;
}) {
  const action = useAction();
  const label: Record<string, string> = {
    split_create_group: "Group creation",
    split_create_group_v2: "Group creation",
    split_add_guest_once: "Adding a person",
    split_create_expense: "Expense save",
    split_record_settlement: "Repayment record",
  };

  const description = String(
    pending.args.p_description ?? pending.args.p_name ?? "",
  );

  return (
    <PageShell title="Finish an unconfirmed save" back={back}>
      <View style={styles.container}>
        {/* Recovery status card */}
        <View style={styles.recoveryCard}>
          <View style={styles.shieldBadge}>
            <Text style={styles.shieldIcon}>🔒</Text>
            <Text style={styles.shieldLabel}>ENCRYPTED JOURNAL</Text>
          </View>

          <Text style={styles.operationTitle}>
            {label[pending.operation] ?? "Pending save"}
          </Text>

          {description ? (
            <View style={styles.descriptionPill}>
              <Text style={styles.descriptionText} numberOfLines={2}>
                "{description}"
              </Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          <Text style={styles.explanationText}>
            The app kept this exact request securely because its outcome wasn't
            confirmed. Retrying uses the same key and amounts, so it won't add a
            duplicate if it already saved.
          </Text>

          <Text style={styles.footnoteText}>
            No recovery request is sent automatically. This is separate from your
            offline Quick Splits.
          </Text>
        </View>

        <Notice message={action.error} />

        <View style={styles.actionsContainer}>
          <PrimaryButton
            title="Retry the exact save"
            loading={action.busy}
            onPress={() => void action.run(() => repository.retryPending(), done)}
          />

          <SecondaryButton
            title="Check saved records first"
            onPress={history}
            disabled={action.busy}
          />

          <SecondaryButton
            title="Forget this local request…"
            disabled={action.busy}
            onPress={() =>
              Alert.alert(
                "Have you checked the saved records?",
                "Forgetting does not undo anything on the server. If this request already saved, entering it again with a new key can duplicate it. Only forget after checking History or group people.",
                [
                  { text: "Keep request", style: "cancel" },
                  {
                    text: "I checked — forget request",
                    style: "destructive",
                    onPress: () =>
                      void action.run(() => repository.discardPending(), done),
                  },
                ],
              )
            }
          />
        </View>
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.lg,
  },
  recoveryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    gap: SPACING.md,
    ...SHADOWS.card,
  },
  shieldBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  shieldIcon: {
    fontSize: 12,
  },
  shieldLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primaryDark,
    letterSpacing: 0.6,
  },
  operationTitle: {
    ...TYPOGRAPHY.screenTitle,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  descriptionPill: {
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  descriptionText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    fontStyle: "italic",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  explanationText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  footnoteText: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textTertiary,
    fontSize: 13,
  },
  actionsContainer: {
    gap: SPACING.md,
  },
});

