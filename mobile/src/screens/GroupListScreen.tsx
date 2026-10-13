import React, { useCallback } from "react";
import { FlatList, View, Text, Pressable, StyleSheet } from "react-native";
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
import {
  COLORS,
  PURPOSE_CONFIG,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../constants/theme.ts";

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
          <View style={styles.headerActions}>
            <PrimaryButton title="Create a group" onPress={create} />
            <SecondaryButton title="Invitations" onPress={invites} />
            <Notice message={page.error} retry={page.newest} />
          </View>
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
        renderItem={({ item }) => {
          const purposeMeta =
            PURPOSE_CONFIG[item.purpose as keyof typeof PURPOSE_CONFIG] ??
            PURPOSE_CONFIG.general;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.name}${item.archived ? ", archived" : ""}`}
              onPress={() => open(item)}
              style={({ pressed }) => [
                styles.groupCard,
                item.archived && styles.groupCardArchived,
                pressed && styles.groupCardPressed,
              ]}
            >
              <View style={styles.groupCardContent}>
                <View
                  style={[
                    styles.purposeIconBox,
                    { backgroundColor: purposeMeta.bg },
                  ]}
                >
                  <Text
                    style={[styles.purposeIconText, { color: purposeMeta.color }]}
                  >
                    {purposeMeta.icon}
                  </Text>
                </View>

                <View style={styles.groupCardInfo}>
                  <View style={styles.purposeTagRow}>
                    <View
                      style={[
                        styles.purposeTag,
                        { backgroundColor: purposeMeta.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.purposeTagText,
                          { color: purposeMeta.color },
                        ]}
                      >
                        {purposeLabel(item.purpose)}
                      </Text>
                    </View>
                    {item.archived && (
                      <View style={styles.archivedTag}>
                        <Text style={styles.archivedTagText}>Archived</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.groupNameText} numberOfLines={1}>
                    {item.name}
                  </Text>

                  {item.destination ? (
                    <Text style={styles.destinationText} numberOfLines={1}>
                      📍 {item.destination}
                    </Text>
                  ) : null}

                  <Text style={styles.subtext}>
                    {item.archived
                      ? "Read-only history"
                      : "Expenses, balances & people"}
                  </Text>
                </View>

                <View style={styles.groupArrow}>
                  <Text style={styles.groupArrowText}>›</Text>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListFooterComponent={
          <View style={styles.footerActions}>
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
          </View>
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
          <View style={styles.inviteHeader}>
            <View style={styles.inviteNoticeBox}>
              <Text style={styles.inviteNoticeText}>
                Accepting links your account to this group's financial person,
                including their existing history and balance. It does not prove
                any expense or payment.
              </Text>
            </View>
            <Notice message={page.error ?? action.error} retry={page.newest} />
          </View>
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
          <View style={styles.inviteCard}>
            <View style={styles.inviteCardHeader}>
              <View style={styles.inviteBadge}>
                <Text style={styles.inviteBadgeText}>Invitation</Text>
              </View>
              <Text style={styles.inviteGroupName}>{item.group_name}</Text>
              <Text style={styles.invitePersonText}>
                Invited to join as{" "}
                <Text style={styles.invitePersonBold}>{item.person_name}</Text>
              </Text>
            </View>
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
          <View style={styles.footerActions}>
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
          </View>
        }
      />
    </PageShell>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    gap: SPACING.md,
    marginBottom: SPACING.xs,
  },
  footerActions: {
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  groupCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    ...SHADOWS.subtle,
  },
  groupCardArchived: {
    opacity: 0.7,
    backgroundColor: COLORS.surfaceMuted,
  },
  groupCardPressed: {
    transform: [{ scale: 0.985 }],
    borderColor: COLORS.primaryLight,
  },
  groupCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  purposeIconBox: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  purposeIconText: {
    fontSize: 22,
  },
  groupCardInfo: {
    flex: 1,
    gap: 2,
  },
  purposeTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: 2,
  },
  purposeTag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  purposeTagText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  archivedTag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceMuted,
  },
  archivedTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  groupNameText: {
    ...TYPOGRAPHY.section,
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  destinationText: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.primaryDark,
    fontWeight: "600",
    marginTop: 1,
  },
  subtext: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textTertiary,
    fontSize: 13,
    marginTop: 2,
  },
  groupArrow: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  groupArrowText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: "600",
    lineHeight: 20,
  },
  inviteHeader: {
    gap: SPACING.md,
    marginBottom: SPACING.xs,
  },
  inviteNoticeBox: {
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  inviteNoticeText: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  inviteCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.card,
  },
  inviteCardHeader: {
    gap: SPACING.xs,
  },
  inviteBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  inviteBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primaryDark,
    letterSpacing: 0.3,
  },
  inviteGroupName: {
    ...TYPOGRAPHY.section,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  invitePersonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  invitePersonBold: {
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
});

