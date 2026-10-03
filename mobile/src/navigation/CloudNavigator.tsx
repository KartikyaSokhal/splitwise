import React, { useCallback, useEffect, useState } from "react";
import { Alert, BackHandler } from "react-native";
import { useCloud } from "../cloud/CloudContext.tsx";
import { useAuth } from "../auth/AuthContext.tsx";
import { useBill } from "../state/BillContext.tsx";
import type { CloudRepository } from "../cloud/repository.ts";
import type {
  GroupSnapshot,
  HistoryEvent,
  Member,
} from "../cloud/contracts.ts";
import type { SuggestedTransfer } from "../types/settlement.ts";
import { PageShell, Body, Notice, Loading } from "../components/CloudUI.tsx";
import { useAction, useResource } from "../cloud/hooks.ts";
import { SaveRecoveryScreen } from "../screens/SaveRecoveryScreen.tsx";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import { SecondaryButton } from "../components/SecondaryButton.tsx";
import {
  GroupListScreen,
  InvitationsScreen,
} from "../screens/GroupListScreen.tsx";
import { CreateGroupScreen } from "../screens/CreateGroupScreen.tsx";
import { GroupScreen } from "../screens/GroupScreen.tsx";
import {
  GroupPeopleScreen,
  GroupSettingsScreen,
} from "../screens/GroupPeopleScreen.tsx";
import { GroupExpenseScreen } from "../screens/GroupExpenseScreen.tsx";
import { RepaymentScreen } from "../screens/RepaymentScreen.tsx";
import { HistoryScreen } from "../screens/HistoryScreen.tsx";
import { ActivityDetailScreen } from "../screens/ActivityDetailScreen.tsx";

type Route =
  | { type: "groups" | "history" | "create" | "invites" }
  | { type: "group"; id: string }
  | { type: "expense" | "settings"; group: GroupSnapshot }
  | { type: "people"; group: GroupSnapshot; person?: Member }
  | { type: "repay"; group: GroupSnapshot; transfer: SuggestedTransfer }
  | { type: "event"; event: HistoryEvent };

function SignedInNavigation({
  repository,
  initial,
  exit,
}: {
  repository: CloudRepository;
  initial: "groups" | "history";
  exit: () => void;
}) {
  const [stack, setStack] = useState<Route[]>([{ type: initial }]);
  const route = stack[stack.length - 1];
  const [inspectHistory, setInspectHistory] = useState(false);
  const recovery = useResource(
    useCallback(() => repository.getPending(), [repository, route]),
  );
  const recoveryAction = useAction();
  const back = () => {
    if (inspectHistory) setInspectHistory(false);
    if (stack.length > 1) setStack((s) => s.slice(0, -1));
    else exit();
  };
  const push = (r: Route) => setStack((s) => [...s, r]);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      back();
      return true;
    });
    return () => sub.remove();
  });
  const props = { repository, back };
  const openEvent = (event: HistoryEvent) => push({ type: "event", event });
  if (recovery.loading || (recovery.error && !inspectHistory))
    return (
      <PageShell title="Your saved data" back={exit}>
        <Notice
          message={recoveryAction.error ?? recovery.error}
          retry={() => void recovery.reload()}
        />
        {recovery.loading && <Loading />}
        {recovery.error && (
          <>
            <Body>
              The app cannot read its secure recovery record. A previous save
              may already exist. Check your groups and history before clearing
              it; do not enter the same expense again.
            </Body>
            <SecondaryButton
              title="Check saved records first"
              onPress={() => {
                setInspectHistory(true);
                setStack([{ type: "groups" }]);
              }}
            />
            <SecondaryButton
              title="Forget unreadable local request…"
              disabled={recoveryAction.busy}
              onPress={() =>
                Alert.alert(
                  "Have you checked your saved records?",
                  "This only removes the unreadable request from this device. It does not undo a server save. Re-entering an already saved expense could duplicate it.",
                  [
                    { text: "Keep request", style: "cancel" },
                    {
                      text: "I checked — forget request",
                      style: "destructive",
                      onPress: () =>
                        void recoveryAction.run(
                          () => repository.discardPending(),
                          () => {
                            void recovery.reload();
                          },
                        ),
                    },
                  ],
                )
              }
            />
          </>
        )}
      </PageShell>
    );
  if (recovery.data && !inspectHistory)
    return (
      <SaveRecoveryScreen
        repository={repository}
        pending={recovery.data}
        back={exit}
        history={() => {
          setInspectHistory(true);
          push(
            typeof recovery.data?.args.p_group_id === "string"
              ? { type: "group", id: recovery.data.args.p_group_id }
              : { type: "groups" },
          );
        }}
        done={() => {
          setInspectHistory(false);
          setStack([{ type: "groups" }]);
        }}
      />
    );
  switch (route.type) {
    case "groups":
      return (
        <GroupListScreen
          {...props}
          create={() => push({ type: "create" })}
          invites={() => push({ type: "invites" })}
          open={(g) => push({ type: "group", id: g.id })}
        />
      );
    case "history":
      return <HistoryScreen {...props} open={openEvent} />;
    case "create":
      return (
        <CreateGroupScreen
          {...props}
          done={(id) =>
            setStack((s) => [...s.slice(0, -1), { type: "group", id }])
          }
        />
      );
    case "invites":
      return <InvitationsScreen {...props} />;
    case "group":
      return (
        <GroupScreen
          {...props}
          groupId={route.id}
          openEvent={openEvent}
          expense={(group) => push({ type: "expense", group })}
          people={(group, person) => push({ type: "people", group, person })}
          repay={(group, transfer) => push({ type: "repay", group, transfer })}
          settings={(group) => push({ type: "settings", group })}
        />
      );
    case "expense":
      return <GroupExpenseScreen {...props} group={route.group} done={back} />;
    case "people":
      return (
        <GroupPeopleScreen
          {...props}
          group={route.group}
          person={route.person}
          done={back}
        />
      );
    case "settings":
      return <GroupSettingsScreen {...props} group={route.group} done={back} />;
    case "repay":
      return (
        <RepaymentScreen
          {...props}
          group={route.group}
          transfer={route.transfer}
          done={back}
        />
      );
    case "event":
      return (
        <ActivityDetailScreen {...props} event={route.event} done={back} />
      );
  }
}
export function CloudNavigator({ initial }: { initial: "groups" | "history" }) {
  const repository = useCloud(),
    { goBack, navigate } = useBill();
  const { generation } = useAuth();
  if (!repository)
    return (
      <PageShell
        title={
          initial === "groups"
            ? "Keep your groups together"
            : "Your saved history"
        }
        back={goBack}
      >
        <Body>
          Sign in to save groups, expenses, balances and history. Quick Split
          always works without an account.
        </Body>
        <PrimaryButton
          title="Sign in with Google"
          onPress={() => navigate("ACCOUNT")}
        />
        <SecondaryButton
          title="Back to Quick Split"
          onPress={() => navigate("HOME")}
        />
      </PageShell>
    );
  // Account changes remount the entire private navigation tree and its drafts.
  return (
    <SignedInNavigation
      key={`${repository.userId}:${generation}:${initial}`}
      repository={repository}
      initial={initial}
      exit={goBack}
    />
  );
}
