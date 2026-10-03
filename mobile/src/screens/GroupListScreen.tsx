import React, { useCallback, useState } from "react";
import { FlatList, View, Pressable } from "react-native";
import type { CloudRepository } from "../cloud/repository.ts";
import type { Cursor, Group } from "../cloud/contracts.ts";
import { purposeLabel } from "../cloud/groupSetup.ts";
import { useAction, usePage } from "../cloud/hooks.ts";
import {
  PageShell,
  Heading,
  Body,
  Notice,
  Empty,
  Loading,
  ui,
} from "../components/CloudUI.tsx";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import { SecondaryButton } from "../components/SecondaryButton.tsx";

export function GroupListScreen({
  repository,
  back,
  open,
  create,
  invites,
}: {
  repository: CloudRepository;
  back: () => void;
  open: (group: Group) => void;
  create: () => void;
  invites: () => void;
}) {
  const page = usePage(
    useCallback((c: Cursor | null) => repository.groups(c), [repository]),
  );
  return (
    <PageShell
      title="Your groups"
      subtitle="For a trip, a home, or your everyday people."
      back={back}
      scroll={false}
    >
      <FlatList
        data={page.loading ? [] : (page.data?.items ?? [])}
        keyExtractor={(g) => g.id}
        contentContainerStyle={ui.content}
        ListHeaderComponent={
          <>
            <PrimaryButton title="Create a group" onPress={create} />
            <SecondaryButton title="Invitations" onPress={invites} />
            <Notice message={page.error} retry={page.newest} />
          </>
        }
        ListEmptyComponent={
          page.loading ? (
            <Loading />
          ) : !page.error ? (
            <Empty
              title={page.older ? "No more groups" : "Start with your people"}
            >
              Create a group, add names, and keep shared expenses together. Your
              Quick Splits stay separate.
            </Empty>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.name}${item.archived ? ", archived" : ""}`}
            onPress={() => open(item)}
            style={({ pressed }) => [ui.card, pressed && ui.pressed]}
          >
            <Heading>{item.name}</Heading>
            <Body>
              {purposeLabel(item.purpose)}
              {item.destination ? ` · ${item.destination}` : ""}
            </Body>
            <Body muted>
              {item.archived
                ? "Archived · read only"
                : "Expenses, balances & people"}
            </Body>
          </Pressable>
        )}
        ListFooterComponent={
          <>
            <SecondaryButton
              title={page.older ? "Back to newest groups" : "Refresh groups"}
              disabled={page.loading}
              onPress={page.newest}
            />
            {page.data?.next && (
              <SecondaryButton
                title="Older groups"
                disabled={page.loading}
                onPress={page.next}
              />
            )}
          </>
        }
      />
    </PageShell>
  );
}
export function InvitationsScreen({
  repository,
  back,
}: {
  repository: CloudRepository;
  back: () => void;
}) {
  const page = usePage(
    useCallback((c: Cursor | null) => repository.invites(c), [repository]),
  );
  const action = useAction();
  return (
    <PageShell
      title="Invitations"
      subtitle="Accept only if this person in the group is you."
      back={back}
      scroll={false}
    >
      <FlatList
        data={page.loading ? [] : (page.data?.items ?? [])}
        keyExtractor={(i) => i.id}
        contentContainerStyle={ui.content}
        ListHeaderComponent={
          <>
            <Body muted>
              Accepting links your account to this group's financial person,
              including their existing history and balance. It does not prove
              any expense or payment.
            </Body>
            <Notice message={page.error ?? action.error} retry={page.newest} />
          </>
        }
        ListEmptyComponent={
          page.loading ? (
            <Loading />
          ) : !page.error ? (
            <Empty title="No pending invitations">
              Share your member code from Account with an admin you trust.
              Invitations expire after seven days.
            </Empty>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={ui.card}>
            <Heading>{item.group_name}</Heading>
            <Body>Join as {item.person_name}</Body>
            <PrimaryButton
              title={`Accept as ${item.person_name}`}
              disabled={action.busy}
              onPress={() =>
                void action.run(async () => {
                  await repository.accept(item.id);
                }, page.newest)
              }
            />
          </View>
        )}
        ListFooterComponent={
          <>
            <SecondaryButton
              title="Refresh invitations"
              onPress={page.newest}
              disabled={page.loading || action.busy}
            />
            {page.data?.next && (
              <SecondaryButton
                title="More invitations"
                onPress={page.next}
                disabled={page.loading || action.busy}
              />
            )}
          </>
        }
      />
    </PageShell>
  );
}
