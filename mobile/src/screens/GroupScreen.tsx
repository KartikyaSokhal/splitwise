import React, { useCallback, useState } from "react";
import { FlatList, View, Text, StyleSheet, Pressable } from "react-native";
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
import { Avatar } from "../components/Avatar.tsx";
import { HistoryList } from "./HistoryScreen.tsx";
import {
  COLORS,
  PURPOSE_CONFIG,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../constants/theme.ts";

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

  const purposeMeta =
    PURPOSE_CONFIG[g.purpose as keyof typeof PURPOSE_CONFIG] ??
    PURPOSE_CONFIG.general;

  const isDebtor = myBalance < 0;
  const isCreditor = myBalance > 0;

  return (
    <PageShell
      title={g.name}
      back={back}
      scroll={false}
      rightElement={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Group settings"
          onPress={() => settings(g)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => [
            styles.settingsButton,
            pressed && styles.settingsButtonPressed,
          ]}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </Pressable>
      }
    >
      <View style={styles.screenWrapper}>
        <View style={styles.topContainer}>
          {/* Purpose & Concise Net-Balance Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryMetaRow}>
              <View
                style={[
                  styles.purposePill,
                  { backgroundColor: purposeMeta.bg },
                ]}
              >
                <Text
                  style={[
                    styles.purposePillIcon,
                    { color: purposeMeta.color },
                  ]}
                >
                  {purposeMeta.icon}
                </Text>
                <Text
                  style={[
                    styles.purposePillText,
                    { color: purposeMeta.color },
                  ]}
                >
                  {purposeLabel(g.purpose)}
                </Text>
              </View>

              {g.destination ? (
                <View style={styles.destinationPill}>
                  <Text style={styles.destinationPillText} numberOfLines={1}>
                    📍 {g.destination}
                  </Text>
                </View>
              ) : null}

              {(g.start_date || g.end_date) ? (
                <View style={styles.datePill}>
                  <Text style={styles.datePillText} numberOfLines={1}>
                    🗓{" "}
                    {g.start_date
                      ? formatCalendarDate(g.start_date)
                      : "Start not set"}{" "}
                    –{" "}
                    {g.end_date
                      ? formatCalendarDate(g.end_date)
                      : "End not set"}
                  </Text>
                </View>
              ) : null}

              {g.archived ? (
                <View style={styles.archivedPill}>
                  <Text style={styles.archivedPillText}>ARCHIVED</Text>
                </View>
              ) : null}
            </View>

            {/* Net Balance Status */}
            <View style={styles.balanceSummaryRow}>
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceLabel}>Your balance</Text>
                <Text
                  style={[
                    styles.balanceValue,
                    isDebtor && styles.textDebtor,
                    isCreditor && styles.textCreditor,
                    !isDebtor && !isCreditor && styles.textSettled,
                  ]}
                >
                  {g.archived
                    ? "Read-only ledger"
                    : isDebtor
                      ? `You owe ${currency(myBalance)}`
                      : isCreditor
                        ? `You're owed ${currency(myBalance)}`
                        : "All settled (₹0.00)"}
                </Text>
              </View>

              {!g.archived && (
                <View
                  style={[
                    styles.balanceBadge,
                    isDebtor && styles.badgeDebtor,
                    isCreditor && styles.badgeCreditor,
                    !isDebtor && !isCreditor && styles.badgeSettled,
                  ]}
                >
                  <Text
                    style={[
                      styles.balanceBadgeText,
                      isDebtor && styles.badgeTextDebtor,
                      isCreditor && styles.badgeTextCreditor,
                      !isDebtor && !isCreditor && styles.badgeTextSettled,
                    ]}
                  >
                    {isDebtor ? "- Owe" : isCreditor ? "+ Owed" : "✓ Settled"}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Contextual primary action based on active tab */}
          {tab === "History" && !g.archived ? (
            <View style={styles.actionContainer}>
              <PrimaryButton
                title="+ Add expense"
                onPress={() => expense(g)}
                accessibilityLabel="Add expense"
              />
            </View>
          ) : tab === "People" && admin && !g.archived ? (
            <View style={styles.actionContainer}>
              <PrimaryButton
                title="+ Add a person"
                onPress={() => people(g)}
                accessibilityLabel="Add a person"
              />
            </View>
          ) : null}

          {/* Tab Selector */}
          <View style={styles.tabBar}>
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

        <View style={styles.tabContentWrapper}>
          {tab === "History" ? (
            <HistoryList
              style={styles.tabList}
              repository={repository}
              groupId={g.id}
              open={openEvent}
            />
          ) : tab === "People" ? (
            <FlatList
              data={g.people}
              keyExtractor={(p) => p.id}
              style={styles.tabList}
              contentContainerStyle={[ui.content, styles.listPadding]}
              ListHeaderComponent={
                <View style={styles.peopleHeader}>
                  <Text style={styles.helperNotice}>
                    Names are people in this group, not necessarily accounts.
                    Removed people keep their history.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.memberCard}>
                  <Avatar name={item.name} size={42} />
                  <View style={styles.memberCardInfo}>
                    <View style={styles.memberCardNameRow}>
                      <Text style={styles.memberCardName}>{item.name}</Text>
                      {item.id === me?.id && (
                        <View style={styles.youBadge}>
                          <Text style={styles.youBadgeText}>YOU</Text>
                        </View>
                      )}
                      {item.role === "admin" && (
                        <View style={styles.adminRoleBadge}>
                          <Text style={styles.adminRoleBadgeText}>ADMIN</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.memberCardSubtext}>
                      {item.active
                        ? item.user_id
                          ? "Account linked"
                          : "Unlinked guest"
                        : "Removed from active group"}
                    </Text>
                  </View>
                  {admin && !g.archived && (
                    <SecondaryButton
                      title={`Manage ${item.name}`}
                      onPress={() => people(g, item)}
                    />
                  )}
                </View>
              )}
            />
          ) : (
            <FlatList
              data={g.balances}
              keyExtractor={(b) => b.personId}
              style={styles.tabList}
              contentContainerStyle={[ui.content, styles.listPadding]}
              ListHeaderComponent={
                <View style={styles.balancesHeader}>
                  <Heading>Who owes what</Heading>
                  <Text style={styles.helperNotice}>
                    Balances include expenses and recorded repayments. A positive
                    balance means this person is owed money.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const p = person(item.personId);
                const isPos = item.balanceMinor > 0;
                const isNeg = item.balanceMinor < 0;

                return (
                  <View style={styles.balanceCard}>
                    <Avatar name={p.name} size={40} />
                    <View style={styles.balanceCardInfo}>
                      <Text style={styles.balancePersonName}>
                        {p.name}
                        {!p.active ? " · Removed" : ""}
                      </Text>
                      <Text style={styles.balancePersonStatus}>
                        {isNeg ? "Owes group" : isPos ? "Owed by group" : "All settled"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.balancePill,
                        isNeg && styles.balancePillNegative,
                        isPos && styles.balancePillPositive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.balancePillText,
                          isNeg && styles.balancePillTextNeg,
                          isPos && styles.balancePillTextPos,
                        ]}
                      >
                        {isNeg ? `- ${currency(item.balanceMinor)}` : isPos ? `+ ${currency(item.balanceMinor)}` : "₹0.00"}
                      </Text>
                    </View>
                  </View>
                );
              }}
              ListFooterComponent={
                <View style={styles.suggestionsContainer}>
                  <View style={styles.suggestionsHeader}>
                    <Heading>Suggested repayments</Heading>
                    <Text style={styles.helperNotice}>
                      One way to clear the group balance. Suggestions can route debts
                      indirectly and are not payments. Only the linked sender can
                      record money they already repaid.
                    </Text>
                  </View>

                  {transfers.length === 0 && (
                    <View style={styles.balancedEmptyCard}>
                      <Text style={{ fontSize: 24, color: COLORS.freshGreen }}>✓</Text>
                      <Text style={styles.balancedEmptyText}>
                        All balanced! There are no repayments to suggest.
                      </Text>
                    </View>
                  )}

                  {transfers.map((t) => {
                    const fromPerson = person(t.fromPersonId);
                    const toPerson = person(t.toPersonId);
                    const isMyRepayment = me?.id === t.fromPersonId;

                    return (
                      <View
                        key={`${t.fromPersonId}:${t.toPersonId}`}
                        style={styles.transferCard}
                      >
                        <View style={styles.transferRoute}>
                          <View style={styles.transferParty}>
                            <Avatar name={fromPerson.name} size={36} />
                            <Text style={styles.transferPartyName} numberOfLines={1}>
                              {fromPerson.name}
                            </Text>
                          </View>
                          <View style={styles.transferArrowBox}>
                            <Text style={styles.transferArrowText}>→</Text>
                            <Text style={styles.transferPaysTag}>pays</Text>
                          </View>
                          <View style={styles.transferParty}>
                            <Avatar name={toPerson.name} size={36} />
                            <Text style={styles.transferPartyName} numberOfLines={1}>
                              {toPerson.name}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.transferAmountRow}>
                          <Text style={styles.transferAmountText}>
                            {currency(t.amountMinor)}
                          </Text>
                        </View>

                        {!g.archived && isMyRepayment && toPerson.active && (
                          <SecondaryButton
                            title="Record my repayment"
                            onPress={() => repay(g, t)}
                          />
                        )}

                        {(!fromPerson.active || !toPerson.active) && (
                          <Text style={styles.transferNoticeText}>
                            An admin must reactivate removed people before new records
                            can include them.
                          </Text>
                        )}

                        {!fromPerson.user_id && (
                          <Text style={styles.transferNoticeText}>
                            This sender needs a linked account to record their
                            repayment.
                          </Text>
                        )}
                      </View>
                    );
                  })}

                  <View style={{ marginTop: SPACING.xs }}>
                    <SecondaryButton
                      title="Refresh balances"
                      onPress={() => void resource.reload()}
                    />
                  </View>
                </View>
              }
            />
          )}
        </View>
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.subtle,
  },
  settingsButtonPressed: {
    backgroundColor: COLORS.surfaceMuted,
    borderColor: COLORS.borderStrong,
    transform: [{ scale: 0.95 }],
  },
  settingsIcon: {
    fontSize: 18,
    color: COLORS.electricMint,
    fontWeight: "700",
  },
  screenWrapper: {
    flex: 1,
    width: "100%",
  },
  topContainer: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.subtle,
  },
  summaryMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  purposePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    gap: 5,
  },
  purposePillIcon: {
    fontSize: 12,
  },
  purposePillText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  destinationPill: {
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  destinationPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.freshGreen,
  },
  datePill: {
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  datePillText: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  archivedPill: {
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  archivedPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  balanceSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 2,
    gap: SPACING.sm,
  },
  balanceInfo: {
    flex: 1,
    gap: 2,
  },
  balanceLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "700",
  },
  balanceValue: {
    ...TYPOGRAPHY.section,
    fontWeight: "800",
    fontSize: 18,
    fontVariant: ["tabular-nums"],
  },
  textDebtor: {
    color: COLORS.errorText,
  },
  textCreditor: {
    color: COLORS.electricMint,
  },
  textSettled: {
    color: COLORS.textPrimary,
  },
  balanceBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  badgeDebtor: {
    backgroundColor: COLORS.errorLight,
    borderColor: COLORS.errorBorder,
  },
  badgeCreditor: {
    backgroundColor: COLORS.successLight,
    borderColor: COLORS.successBorder,
  },
  badgeSettled: {
    backgroundColor: COLORS.surfaceMuted,
    borderColor: COLORS.border,
  },
  balanceBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeTextDebtor: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.errorText,
  },
  badgeTextCreditor: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.electricMint,
  },
  badgeTextSettled: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  actionContainer: {
    marginTop: 2,
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  tabContentWrapper: {
    flex: 1,
    width: "100%",
  },
  tabList: {
    flex: 1,
  },
  listPadding: {
    paddingBottom: SPACING.massive + 40,
  },
  peopleHeader: {
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  helperNotice: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.md,
    ...SHADOWS.subtle,
  },
  memberCardInfo: {
    flex: 1,
    gap: 2,
  },
  memberCardNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    flexWrap: "wrap",
  },
  memberCardName: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  youBadge: {
    backgroundColor: COLORS.deepForest,
    borderWidth: 1,
    borderColor: COLORS.freshGreen,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
  },
  youBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.electricMint,
  },
  adminRoleBadge: {
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
  },
  adminRoleBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.textSecondary,
  },
  memberCardSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  balancesHeader: {
    gap: 4,
    marginBottom: SPACING.xs,
  },
  balanceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.md,
    ...SHADOWS.subtle,
  },
  balanceCardInfo: {
    flex: 1,
    gap: 2,
  },
  balancePersonName: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  balancePersonStatus: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  balancePill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  balancePillNegative: {
    backgroundColor: COLORS.errorLight,
    borderColor: COLORS.errorBorder,
  },
  balancePillPositive: {
    backgroundColor: COLORS.successLight,
    borderColor: COLORS.successBorder,
  },
  balancePillText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  balancePillTextNeg: {
    color: COLORS.errorText,
  },
  balancePillTextPos: {
    color: COLORS.successText,
  },
  suggestionsContainer: {
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  suggestionsHeader: {
    gap: 4,
  },
  balancedEmptyCard: {
    backgroundColor: COLORS.successLight,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: "center",
    gap: SPACING.xs,
  },
  balancedEmptyText: {
    ...TYPOGRAPHY.secondaryMedium,
    color: COLORS.successText,
    fontWeight: "600",
  },
  transferCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.card,
  },
  transferRoute: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  transferParty: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  transferPartyName: {
    ...TYPOGRAPHY.secondaryMedium,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  transferArrowBox: {
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
  },
  transferArrowText: {
    fontSize: 20,
    color: COLORS.primary,
    fontWeight: "700",
  },
  transferPaysTag: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textTertiary,
    textTransform: "uppercase",
  },
  transferAmountRow: {
    alignItems: "center",
    paddingVertical: SPACING.xs,
  },
  transferAmountText: {
    ...TYPOGRAPHY.numericHero,
    fontSize: 26,
    lineHeight: 32,
    color: COLORS.electricMint,
    fontVariant: ["tabular-nums"],
  },
  transferNoticeText: {
    ...TYPOGRAPHY.secondary,
    color: COLORS.textTertiary,
    fontSize: 13,
    textAlign: "center",
  },
});

