import React, { useState } from "react";
import { Alert, View, Text, StyleSheet } from "react-native";
import * as Crypto from "expo-crypto";
import { isValidLabel } from "../utils/money.ts";
import type { CloudRepository } from "../cloud/repository.ts";
import { isUuid, type GroupSnapshot, type Member } from "../cloud/contracts.ts";
import { useAction } from "../cloud/hooks.ts";
import { Avatar } from "../components/Avatar.tsx";
import { PageShell, Field, Notice } from "../components/CloudUI.tsx";
import { PrimaryButton } from "../components/PrimaryButton.tsx";
import { SecondaryButton } from "../components/SecondaryButton.tsx";
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../constants/theme.ts";

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
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.cardHeaderTag}>NEW GROUP MEMBER</Text>
            <Field
              label="Person's name"
              value={name}
              onChangeText={setName}
              editable={submitted === null}
              maxLength={100}
              autoFocus
              placeholder="e.g. Sam, Priya, Rahul…"
            />
            <Text style={styles.helperText}>
              They don't need an account to appear in expenses. Adding their name
              does not grant account access. Duplicate names are allowed—choose
              labels your group can tell apart.
            </Text>
          </View>

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
        </View>
      ) : (
        <View style={styles.container}>
          {/* Member Profile Card */}
          <View style={styles.profileCard}>
            <Avatar name={person.name} size={56} />
            <Text style={styles.profileName}>{person.name}</Text>
            <View
              style={[
                styles.roleBadge,
                !person.active && styles.roleBadgeRemoved,
                person.active && person.role === "admin" && styles.roleBadgeAdmin,
              ]}
            >
              <Text
                style={[
                  styles.roleBadgeText,
                  !person.active && styles.roleBadgeTextRemoved,
                  person.active && person.role === "admin" && styles.roleBadgeTextAdmin,
                ]}
              >
                {person.active
                  ? person.role === "admin"
                    ? "Active admin"
                    : "Active member"
                  : "Removed member"}
              </Text>
            </View>

            <Text style={styles.profileSubtext}>
              {person.user_id
                ? "Linked to a verified account. Account identity cannot be reassigned."
                : "This is a group member without account access."}
            </Text>
          </View>

          {/* Invitation code section for unlinked members */}
          {!person.user_id && person.active && (
            <View style={styles.card}>
              <Text style={styles.cardHeaderTag}>INVITE VIA MEMBER CODE</Text>
              <Field
                label="Their member code"
                value={target}
                onChangeText={setTarget}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={36}
                placeholder="Ask them to share it from Account"
              />
              <Text style={styles.helperText}>
                They must accept the invitation in their own account. This links
                them to this person's existing balance and history. Check that
                the code belongs to the right person.
              </Text>
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
            </View>
          )}

          {/* Member Management Actions */}
          <View style={styles.actionsCard}>
            <Text style={styles.cardHeaderTag}>ACCESS MANAGEMENT</Text>

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

            <Text style={styles.footnoteText}>
              A group must keep at least one active, account-linked admin.
              Removing someone does not erase a debt.
            </Text>
          </View>
        </View>
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
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardHeaderTag}>GROUP DETAILS</Text>
          <Field
            label="Group name"
            value={name}
            onChangeText={setName}
            maxLength={100}
          />
        </View>

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

        {/* Danger zone / Archive card */}
        <View style={styles.dangerCard}>
          <Text style={styles.dangerHeaderTag}>DANGER ZONE</Text>
          <Text style={styles.dangerTitle}>Archive group</Text>
          <Text style={styles.dangerNoticeText}>
            Archive keeps history readable but permanently stops ordinary changes,
            even if balances remain. It does not mean everyone has repaid.
          </Text>

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
        </View>
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.subtle,
  },
  cardHeaderTag: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 0.8,
  },
  helperText: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  footnoteText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    lineHeight: 16,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: "center",
    gap: SPACING.sm,
    ...SHADOWS.card,
  },
  profileName: {
    ...TYPOGRAPHY.screenTitle,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  roleBadge: {
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: SPACING.md,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  roleBadgeAdmin: {
    backgroundColor: COLORS.deepForest,
    borderWidth: 1,
    borderColor: COLORS.freshGreen,
  },
  roleBadgeRemoved: {
    backgroundColor: COLORS.errorLight,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  roleBadgeTextAdmin: {
    color: COLORS.electricMint,
  },
  roleBadgeTextRemoved: {
    color: COLORS.errorText,
  },
  profileSubtext: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textTertiary,
    textAlign: "center",
    marginTop: 2,
  },
  actionsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.subtle,
  },
  dangerCard: {
    backgroundColor: COLORS.errorLight,
    borderWidth: 1.5,
    borderColor: COLORS.errorBorder,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  dangerHeaderTag: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.errorText,
    letterSpacing: 0.8,
  },
  dangerTitle: {
    ...TYPOGRAPHY.section,
    fontWeight: "700",
    color: COLORS.errorText,
  },
  dangerNoticeText: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.errorText,
    lineHeight: 18,
    marginBottom: SPACING.xs,
  },
});

