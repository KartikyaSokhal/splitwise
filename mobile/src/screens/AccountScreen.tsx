import React, { useState } from "react";
import { Share, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext.tsx";
import { useCloud } from "../cloud/CloudContext.tsx";
import { useAction } from "../cloud/hooks.ts";
import { useBill } from "../state/BillContext.tsx";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import { SecondaryButton } from "../components/SecondaryButton.tsx";
import {
  PageShell,
  Body,
  Heading,
  Field,
  Notice,
  ui,
} from "../components/CloudUI.tsx";

export function AccountScreen() {
  const auth = useAuth(),
    repository = useCloud(),
    { goBack, navigate } = useBill();
  const [name, setName] = useState(""),
    [saved, setSaved] = useState(false);
  const action = useAction();
  return (
    <PageShell
      title={auth.user ? "Your account" : "Keep it together"}
      subtitle="Quick Split always works without an account."
      back={goBack}
    >
      <Notice message={auth.message} />
      {auth.user ? (
        <>
          <View style={ui.card}>
            <Heading>Signed in to DueShare</Heading>
            <Body muted>
              Your groups and history are private to their members. Quick Splits
              are never uploaded automatically.
            </Body>
          </View>
          <PrimaryButton
            title="Open your groups"
            onPress={() => navigate("GROUPS")}
          />
          <Field
            label="Your name for new groups"
            value={name}
            onChangeText={(v) => {
              setName(v);
              setSaved(false);
            }}
            maxLength={100}
            autoCapitalize="words"
          />
          <SecondaryButton
            title="Save name"
            disabled={action.busy || !name.trim()}
            onPress={() =>
              void action.run(async () => {
                await repository!.profile(name);
                setSaved(true);
              })
            }
          />
          {saved && (
            <Body>
              Name saved. Existing group names for you stay unchanged.
            </Body>
          )}
          <View style={ui.card}>
            <Heading>Your member code</Heading>
            <Body muted>
              Share this only with a group admin you trust. They can invite you
              to an existing person; you choose whether to accept.
            </Body>
            <Text selectable style={ui.body}>
              {auth.user.id}
            </Text>
            <SecondaryButton
              title="Share member code"
              onPress={() =>
                void action.run(async () => {
                  await Share.share({
                    message:
                      "My DueShare member code: " +
                      auth.user!.id +
                      "\nUse it to invite me, then I’ll confirm in DueShare.",
                  });
                })
              }
            />
          </View>
          <Notice message={action.error} />
          <SecondaryButton
            title="Sign out on this device"
            onPress={() => void auth.logout()}
            disabled={auth.busy}
          />
          <Body muted>
            Sign-out clears private screens. Browser sign-in and sessions on
            other devices are separate.
          </Body>
        </>
      ) : (
        <>
          <View style={ui.card}>
            <Heading>One place for shared costs</Heading>
            <Body muted>
              Keep a trip, household or everyday group. Save expenses, see who
              owes what, and record repayments.
            </Body>
          </View>
          {!auth.configured && (
            <Body muted>
              Cloud sign-in is not configured for this build. You can still use
              Quick Split.
            </Body>
          )}
          <PrimaryButton
            title="Continue with Google"
            onPress={() => void auth.signIn("google")}
            disabled={!auth.configured || auth.busy}
            loading={auth.busy}
            iconRight=""
          />
          <SecondaryButton
            title="Continue without an account"
            onPress={() => navigate("HOME")}
          />
          {auth.configured && auth.message && (
            <SecondaryButton
              title="Clear device session"
              onPress={() => void auth.logout()}
              disabled={auth.busy}
            />
          )}
        </>
      )}
    </PageShell>
  );
}
