import React, { useCallback, useState } from "react";
import { FlatList, View } from "react-native";
import type { CloudRepository } from "../cloud/repository.ts";
import type {
  GroupSnapshot,
  HistoryEvent,
  Member,
} from "../cloud/contracts.ts";
import type { SuggestedTransfer } from "../types/settlement.ts";
import { formatCalendarDate, purposeLabel } from "../cloud/groupSetup.ts";
import { suggestSettlements } from "../utils/settlement.ts";
import { useResource } from "../cloud/hooks.ts";
import {
  PageShell,
  Heading,
  Body,
  Choice,
  Notice,
  Loading,
  currency,
  ui,
} from "../components/CloudUI.tsx";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import { SecondaryButton } from "../components/SecondaryButton.tsx";
import { HistoryList } from "./HistoryScreen.tsx";

export function GroupScreen({
  repository,
  groupId,
  back,
  expense,
  people,
  repay,
  openEvent,
  settings,
}: {
  repository: CloudRepository;
  groupId: string;
  back: () => void;
  expense: (g: GroupSnapshot) => void;
  people: (g: GroupSnapshot, person?: Member) => void;
  repay: (g: GroupSnapshot, t: SuggestedTransfer) => void;
  openEvent: (e: HistoryEvent) => void;
  settings: (g: GroupSnapshot) => void;
}) {
  const resource = useResource(
    useCallback(() => repository.group(groupId), [repository, groupId]),
  );
  const [tab, setTab] = useState<"History" | "Balances" | "People">("History");
  const g = resource.data;
  if (resource.loading || !g)
    return (
      <PageShell title="Your group" back={back}>
        <Notice message={resource.error} retry={() => void resource.reload()} />
        {resource.loading && <Loading />}
      </PageShell>
    );
  const me = g.people.find((p) => p.user_id === repository.userId && p.active);
  const admin = me?.role === "admin";
  const myBalance =
    g.balances.find((b) => b.personId === me?.id)?.balanceMinor ?? 0;
  const transfers = suggestSettlements(g.balances);
  const person = (id: string) => g.people.find((p) => p.id === id)!;
  return (
    <PageShell
      title={g.name}
      back={back}
      subtitle={
        g.archived
          ? "Archived · shared history is read only"
          : myBalance < 0
            ? `You owe ${currency(myBalance)}`
            : myBalance > 0
              ? `You are owed ${currency(myBalance)}`
              : "You're balanced in this group"
      }
      scroll={false}
    >
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <View style={ui.card}>
          <Body>{purposeLabel(g.purpose)}</Body>
          {g.destination && <Heading>{g.destination}</Heading>}
          {(g.start_date || g.end_date) && (
            <Body muted>
              {g.start_date
                ? formatCalendarDate(g.start_date)
                : "Start not set"}{" "}
              – {g.end_date ? formatCalendarDate(g.end_date) : "End not set"}
            </Body>
          )}
        </View>
        {!g.archived && (
          <PrimaryButton title="Add expense" onPress={() => expense(g)} />
        )}
        <View style={ui.row}>
          {(["History", "Balances", "People"] as const).map((t) => (
            <Choice
              key={t}
              title={t}
              selected={tab === t}
              onPress={() => setTab(t)}
            />
          ))}
        </View>
      </View>
      {tab === "History" ? (
        <HistoryList repository={repository} groupId={g.id} open={openEvent} />
      ) : tab === "People" ? (
        <FlatList
          data={g.people}
          keyExtractor={(p) => p.id}
          contentContainerStyle={ui.content}
          ListHeaderComponent={
            <>
              {admin && !g.archived && (
                <PrimaryButton title="Add a person" onPress={() => people(g)} />
              )}
              <Body muted>
                Names are people in this group, not necessarily accounts.
                Removed people keep their history.
              </Body>
            </>
          }
          renderItem={({ item }) => (
            <View style={ui.card}>
              <Heading>
                {item.name}
                {item.id === me?.id ? " · You" : ""}
              </Heading>
              <Body muted>
                {item.active
                  ? item.role === "admin"
                    ? "Admin"
                    : "Member"
                  : "Removed"}{" "}
                · {item.user_id ? "Account linked" : "Not linked"}
              </Body>
              {admin && !g.archived && (
                <SecondaryButton
                  title={`Manage ${item.name}`}
                  onPress={() => people(g, item)}
                />
              )}
            </View>
          )}
          ListFooterComponent={
            admin && !g.archived ? (
              <SecondaryButton
                title="Group settings"
                onPress={() => settings(g)}
              />
            ) : null
          }
        />
      ) : (
        <FlatList
          data={g.balances}
          keyExtractor={(b) => b.personId}
          contentContainerStyle={ui.content}
          ListHeaderComponent={
            <>
              <Heading>Who owes what</Heading>
              <Body muted>
                Balances include expenses and recorded repayments. A positive
                balance means this person is owed money.
              </Body>
            </>
          }
          renderItem={({ item }) => (
            <View style={ui.card}>
              <Heading>
                {person(item.personId).name}
                {person(item.personId).active ? "" : " · Removed"}
              </Heading>
              <Body>
                {item.balanceMinor < 0
                  ? `Owes ${currency(item.balanceMinor)}`
                  : item.balanceMinor > 0
                    ? `Is owed ${currency(item.balanceMinor)}`
                    : "Balanced"}
              </Body>
            </View>
          )}
          ListFooterComponent={
            <View style={{ gap: 16 }}>
              <Heading>Suggested repayments</Heading>
              <Body muted>
                One way to clear the group balance. Suggestions can route debts
                indirectly and are not payments. Only the linked sender can
                record money they already repaid.
              </Body>
              {transfers.length === 0 && (
                <Body>All balanced. There are no repayments to suggest.</Body>
              )}
              {transfers.map((t) => (
                <View key={`${t.fromPersonId}:${t.toPersonId}`} style={ui.card}>
                  <Body>
                    {person(t.fromPersonId).name} → {person(t.toPersonId).name}
                  </Body>
                  <Heading>{currency(t.amountMinor)}</Heading>
                  {!g.archived &&
                    me?.id === t.fromPersonId &&
                    person(t.toPersonId).active && (
                      <SecondaryButton
                        title="Record my repayment"
                        onPress={() => repay(g, t)}
                      />
                    )}
                  {(!person(t.fromPersonId).active ||
                    !person(t.toPersonId).active) && (
                    <Body muted>
                      An admin must reactivate removed people before new records
                      can include them.
                    </Body>
                  )}
                  {!person(t.fromPersonId).user_id && (
                    <Body muted>
                      This sender needs a linked account to record their
                      repayment.
                    </Body>
                  )}
                </View>
              ))}
              <SecondaryButton
                title="Refresh balances"
                onPress={() => void resource.reload()}
              />
            </View>
          }
        />
      )}
    </PageShell>
  );
}
