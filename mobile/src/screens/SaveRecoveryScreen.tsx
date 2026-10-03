import React from "react";
import { Alert } from "react-native";
import type { CloudRepository } from "../cloud/repository.ts";
import type { PendingSave } from "../cloud/recovery.ts";
import { useAction } from "../cloud/hooks.ts";
import { PageShell, Body, Heading, Notice } from "../components/CloudUI.tsx";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import { SecondaryButton } from "../components/SecondaryButton.tsx";

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
  return (
    <PageShell title="Finish an unconfirmed save" back={back}>
      <Heading>{label[pending.operation]}</Heading>
      {!!(pending.args.p_description || pending.args.p_name) && (
        <Body>{String(pending.args.p_description ?? pending.args.p_name)}</Body>
      )}
      <Body>
        The app kept this exact request securely because its outcome wasn't
        confirmed. Retrying uses the same key and amounts, so it won't add a
        duplicate if it already saved.
      </Body>
      <Body muted>
        No recovery request is sent automatically. This is separate from your
        offline Quick Splits.
      </Body>
      <Notice message={action.error} />
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
    </PageShell>
  );
}
