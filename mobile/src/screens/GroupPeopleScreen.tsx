import React, { useState } from "react";
import { Alert } from "react-native";
import * as Crypto from "expo-crypto";
import { isValidLabel } from "../utils/money.ts";
import type { CloudRepository } from "../cloud/repository.ts";
import { isUuid, type GroupSnapshot, type Member } from "../cloud/contracts.ts";
import { useAction } from "../cloud/hooks.ts";
import {
  PageShell,
  Body,
  Heading,
  Field,
  Notice,
} from "../components/CloudUI.tsx";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import { SecondaryButton } from "../components/SecondaryButton.tsx";

export function GroupPeopleScreen({
  repository,
  group,
  person,
  back,
  done,
}: {
  repository: CloudRepository;
  group: GroupSnapshot;
  person?: Member;
  back: () => void;
  done: () => void;
}) {
  const [name, setName] = useState(""),
    [target, setTarget] = useState(""),
    [submitted, setSubmitted] = useState<string | null>(null);
  const [key] = useState(Crypto.randomUUID),
    action = useAction();
  function change(active: boolean, role: "admin" | "member") {
    Alert.alert(
      active ? "Change group access?" : "Remove this member?",
      active
        ? "Admin access allows managing members and correcting financial records. Only grant it to someone you trust."
        : "Their history stays. Their account loses access and no new expense can include them until reactivated.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () =>
            void action.run(
              () => repository.changeMember(group.id, person!.id, active, role),
              done,
            ),
        },
      ],
    );
  }
  return (
    <PageShell
      title={person ? person.name : "Add a person"}
      subtitle={group.name}
      back={back}
    >
      <Notice message={action.error} />
      {!person ? (
        <>
          <Field
            label="Person's name"
            value={name}
            onChangeText={setName}
            editable={submitted === null}
            maxLength={100}
            autoFocus
          />
          <Body muted>
            They don't need an account to appear in expenses. Adding their name
            does not grant account access. Duplicate names are allowed—choose
            labels your group can tell apart.
          </Body>
          <PrimaryButton
            title={
              submitted === null ? "Add person" : "Retry adding this person"
            }
            disabled={!isValidLabel(name)}
            loading={action.busy}
            onPress={() =>
              void action.run(async () => {
                const value = submitted ?? name;
                setSubmitted(value);
                await repository.addPerson(group.id, value, key);
              }, done)
            }
          />
        </>
      ) : (
        <>
          <Heading>
            {person.active
              ? person.role === "admin"
                ? "Active admin"
                : "Active member"
              : "Removed member"}
          </Heading>
          <Body muted>
            {person.user_id
              ? "This person is linked to an account. Account identity cannot be reassigned."
              : "This is a group person without account access."}
          </Body>
          {!person.user_id && person.active && (
            <>
              <Field
                label="Their member code"
                value={target}
                onChangeText={setTarget}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={36}
                placeholder="Ask them to share it from Account"
              />
              <Body muted>
                They must accept the invitation in their own account. This links
                them to this person's existing balance and history. Check that
                the code belongs to the right person.
              </Body>
              <PrimaryButton
                title="Send invitation"
                disabled={!isUuid(target)}
                loading={action.busy}
                onPress={() =>
                  void action.run(
                    () => repository.invite(group.id, person.id, target),
                    done,
                  )
                }
              />
            </>
          )}
          <SecondaryButton
            title={person.active ? "Remove from group" : "Reactivate member"}
            disabled={action.busy}
            onPress={() => change(!person.active, person.role)}
          />
          {person.user_id && person.active && (
            <SecondaryButton
              title={
                person.role === "admin" ? "Make a member" : "Make an admin"
              }
              disabled={action.busy}
              onPress={() =>
                change(true, person.role === "admin" ? "member" : "admin")
              }
            />
          )}
          <Body muted>
            A group must keep at least one active, account-linked admin.
            Removing someone does not erase a debt.
          </Body>
        </>
      )}
    </PageShell>
  );
}
export function GroupSettingsScreen({
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
  const [name, setName] = useState(group.name),
    action = useAction();
  return (
    <PageShell title="Group settings" back={back}>
      <Field
        label="Group name"
        value={name}
        onChangeText={setName}
        maxLength={100}
      />
      <Notice message={action.error} />
      <PrimaryButton
        title="Save name"
        loading={action.busy}
        onPress={() =>
          void action.run(
            () => repository.updateGroup(group.id, name, false),
            done,
          )
        }
      />
      <Body muted>
        Archive keeps history readable but permanently stops ordinary changes,
        even if balances remain. It does not mean everyone has repaid.
      </Body>
      <SecondaryButton
        title="Archive group…"
        disabled={action.busy}
        onPress={() =>
          Alert.alert(
            "Archive this group permanently?",
            "No new expenses, repayments, invitations or corrections can be recorded. This cannot be undone in the app. History remains visible to current members.",
            [
              { text: "Keep active", style: "cancel" },
              {
                text: "Archive",
                style: "destructive",
                onPress: () =>
                  void action.run(
                    () => repository.updateGroup(group.id, group.name, true),
                    done,
                  ),
              },
            ],
          )
        }
      />
    </PageShell>
  );
}
