import React, { useCallback } from "react";
import { FlatList, Pressable } from "react-native";
import type { CloudRepository } from "../cloud/repository.ts";
import type { Cursor, HistoryEvent } from "../cloud/contracts.ts";
import { usePage } from "../cloud/hooks.ts";
import {
  PageShell,
  Heading,
  Body,
  Notice,
  Empty,
  Loading,
  currency,
  dateLabel,
  ui,
} from "../components/CloudUI.tsx";
import { SecondaryButton } from "../components/SecondaryButton.tsx";

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
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.title}, ${currency(item.amountMinor)}, ${item.kind}${item.corrected ? ", corrected" : ""}`}
          onPress={() => open(item)}
          style={({ pressed }) => [ui.card, pressed && ui.pressed]}
        >
          {!groupId && <Body muted>{item.group_name}</Body>}
          <Heading>{item.title}</Heading>
          <Body>
            {currency(item.amountMinor)} ·{" "}
            {item.kind === "repayment"
              ? "Repayment recorded"
              : item.kind === "void"
                ? "Expense voided"
                : item.kind === "reversal"
                  ? "Repayment reversed"
                  : "Expense"}
          </Body>
          <Body muted>
            {dateLabel(item.created_at)}
            {item.kind === "expense"
              ? ` · ${item.participant_count} people`
              : ""}
          </Body>
          {item.kind === "expense" && (
            <Body muted>Paid by {item.payer ?? "No payer"}</Body>
          )}
          {item.corrected &&
            (item.kind === "expense" || item.kind === "repayment") && (
              <Body muted>
                {item.kind === "expense"
                  ? "Voided · excluded from balances"
                  : "Reversed · excluded from balances"}
              </Body>
            )}
        </Pressable>
      )}
      ListFooterComponent={
        <>
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
        </>
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
