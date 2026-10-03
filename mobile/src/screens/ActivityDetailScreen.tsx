import React, { useCallback, useState } from "react";
import { Alert } from "react-native";
import type { CloudRepository } from "../cloud/repository.ts";
import type { HistoryEvent } from "../cloud/contracts.ts";
import { useAction, useResource } from "../cloud/hooks.ts";
import {
  PageShell,
  Body,
  Heading,
  Field,
  Notice,
  Loading,
  currency,
  dateLabel,
} from "../components/CloudUI.tsx";
import { PrimaryButton } from "../components/PrimaryButton.tsx";

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
        <>
          <Heading>{event.title}</Heading>
          <Body>
            {event.group_name} · {dateLabel(event.created_at)}
          </Body>
          <Heading>{currency(event.amountMinor)}</Heading>
          {event.kind === "repayment" && (
            <Body muted>
              Sender-reported bookkeeping, not proof of a bank payment.
            </Body>
          )}
          {(event.reason || e?.reason || s?.reason) && (
            <Body>
              Correction reason: {event.reason ?? e?.reason ?? s?.reason}
            </Body>
          )}
          {corrected && (
            <Body muted>
              This original entry has been corrected and is excluded from
              balances.
            </Body>
          )}
          {e && (
            <>
              <Heading>Paid by</Heading>
              {e.payments.map((p) => (
                <Body key={p.id}>
                  {p.name} · {currency(p.amountMinor)}
                </Body>
              ))}
              <Heading>Each person's share</Heading>
              {e.shares.map((p) => (
                <Body key={p.id}>
                  {p.name} · {currency(p.amountMinor)}
                </Body>
              ))}
            </>
          )}
          {correctable && (
            <>
              <Heading>Need to correct this?</Heading>
              <Body muted>
                {event.kind === "expense"
                  ? "Void this expense, then add a corrected expense separately. Both records remain in history."
                  : "Reverse this record if it is wrong. The original record remains in history."}
              </Body>
              <Field
                label="Reason for correction"
                value={reason}
                onChangeText={setReason}
                maxLength={500}
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
            </>
          )}
        </>
      )}
    </PageShell>
  );
}
