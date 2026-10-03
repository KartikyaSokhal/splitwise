import React, { useRef, useState } from "react";
import { FlatList, View, Text } from "react-native";
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
import { SecondaryButton } from "../components/SecondaryButton.tsx";

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
        <Heading>{review.description}</Heading>
        <Text style={ui.amount}>{currency(review.totalMinor)}</Text>
        <Heading>Paid by</Heading>
        {review.payments.map((p) => (
          <Body key={p.payerId}>
            {personName(p.payerId)} · {currency(p.amountMinor)}
          </Body>
        ))}
        <Heading>Each person's share</Heading>
        {review.shares.map((s) => (
          <Body key={s.personId}>
            {personName(s.personId)} · {currency(s.amountMinor)}
          </Body>
        ))}
        <Body muted>This saves a shared expense. It does not move money.</Body>
        <Notice message={validation ?? action.error} />
        <PrimaryButton
          title={attempted ? "Retry this save" : "Save expense"}
          loading={action.busy}
          onPress={() =>
            void action.run(async () => {
              const latest = prepareExpense(current.current, group, key);
              if (JSON.stringify(latest) !== JSON.stringify(review))
                throw new MoneyValidationError("Review changed");
              // Refresh active membership at the last client boundary. The RPC locks and
              // checks it independently, including changes after this read.
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
          <Body muted>
            Keep this request unchanged when retrying. If you leave, check
            History before creating another expense.
          </Body>
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
        contentContainerStyle={ui.content}
        initialNumToRender={8}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
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
            <Heading>Who paid?</Heading>
            <View style={ui.row}>
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
            <Heading>How is it shared?</Heading>
            <View style={ui.row}>
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
            <Body muted>
              {draft.method === "custom"
                ? "Editing then tapping Done pins an amount; the rest redistributes. Switch to Equal before changing people; that clears pins."
                : "Include everyone who shares the cost. The payer can have no share."}
            </Body>
            {draft.method === "custom" && (
              <>
                <SecondaryButton
                  title="Reset shares to equal"
                  onPress={resetEqual}
                />
                <Body>{remainder}</Body>
              </>
            )}
            <Notice message={validation} />
          </View>
        }
        renderItem={({ item }) => (
          <View style={ui.card}>
            <Choice
              title={`${draft.selected.includes(item.id) ? "Included" : "Not included"}: ${item.name}`}
              selected={draft.selected.includes(item.id)}
              disabled={draft.method === "custom"}
              onPress={() =>
                setDraft((d) => ({
                  ...d,
                  selected: d.selected.includes(item.id)
                    ? d.selected.filter((id) => id !== item.id)
                    : active
                        .filter(
                          (p) => d.selected.includes(p.id) || p.id === item.id,
                        )
                        .map((p) => p.id),
                }))
              }
            />
            {draft.multiplePayers ? (
              <Field
                label={`Paid by ${item.name} · INR`}
                value={draft.paid[item.id] ?? ""}
                onChangeText={(v) =>
                  setDraft((d) => ({ ...d, paid: { ...d.paid, [item.id]: v } }))
                }
                keyboardType="decimal-pad"
                maxLength={18}
                placeholder="0.00"
              />
            ) : (
              <Choice
                title={`Paid by ${item.name}`}
                selected={draft.payerId === item.id}
                onPress={() => setDraft((d) => ({ ...d, payerId: item.id }))}
              />
            )}
            {draft.method === "custom" && draft.selected.includes(item.id) && (
              <CustomAmountRow
                name={item.name}
                value={draft.owed[item.id] ?? ""}
                isPinned={!!draft.pinned[item.id]}
                onChangeValue={(v) =>
                  setDraft((d) => ({ ...d, owed: { ...d.owed, [item.id]: v } }))
                }
                onCommitValue={(v) => commit(item.id, v)}
                onTogglePin={() =>
                  commit(item.id, current.current.owed[item.id] ?? "0", false)
                }
                maxLength={18}
              />
            )}
          </View>
        )}
      />
      <View style={{ padding: 20, gap: 8 }}>
        <Body muted>
          {valid
            ? "Payments and shares match."
            : "Payments and shares must each match the total."}
        </Body>
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
