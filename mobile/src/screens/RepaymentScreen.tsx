import React, { useRef, useState } from "react";
import { Text } from "react-native";
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
import {
  PageShell,
  Body,
  Heading,
  Field,
  Choice,
  Notice,
  currency,
  ui,
} from "../components/CloudUI.tsx";
import { PrimaryButton } from "../components/PrimaryButton.tsx";

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
  const to = group.people.find((p) => p.id === transfer.toPersonId)?.name;
  return (
    <PageShell title="Record a repayment" subtitle={group.name} back={back}>
      <Heading>You → {to}</Heading>
      <Text style={ui.amount}>{currency(transfer.amountMinor)}</Text>
      <Body muted>Suggested amount. You may record a smaller repayment.</Body>
      <Field
        label="Amount you repaid · INR"
        value={amount}
        onChangeText={setAmount}
        editable={attempt === null && !action.busy}
        keyboardType="decimal-pad"
        maxLength={18}
      />
      <Body>
        This records money you already paid outside DueShare. It does not send
        money or verify a bank transfer.
      </Body>
      <Choice
        title="I have already repaid this amount"
        selected={confirmed}
        disabled={attempt !== null || action.busy}
        onPress={() => setConfirmed((v) => !v)}
      />
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
            // Replays are allowed even when the earlier committed request cleared debt;
            // the database checks request identity before current balance constraints.
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
    </PageShell>
  );
}
